// ffhb-sync (U15 uniquement : équipe 1 et équipe 2) — résultats, mi-temps, tiers-temps, classement de poule et stats individuelles de NOS joueurs depuis ffhandball.fr
// Modes (POST) : { mode: "preview", url }  |  { mode: "sync", equipe?: 1|2, refaire_joueurs?: true }
// Réservé aux coachs connectés. Ne remplace JAMAIS un score déjà saisi.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { getDocumentProxy } from "npm:unpdf@0.12.1";
import { UA, KEYWORD, norm, parseComponents, competitionBase, num, fdmUrl, parseTiers, deltas, pickOurId, parseFeuilleJoueurs, type Item, type Feuille } from "./lib.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "content-type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const DEADLINE_MS = 110_000;   // on s'arrête proprement avant la limite de la plateforme
const PDF_BUDGET = 16;         // feuilles de match lues par passage (les autres au passage suivant)

async function fetchComponents(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`FFHB ${r.status} sur ${url}`);
  return parseComponents(await r.text());
}

// Lit une feuille de match : tiers-temps (page 1) et, si demandé, les stats des joueurs (toutes les pages).
async function readFeuille(code: string, wantJoueurs: boolean): Promise<{ tiers: ReturnType<typeof parseTiers>; feuille: Feuille | null }> {
  const r = await fetch(fdmUrl(code), { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`Feuille de match indisponible (${r.status})`);
  const pdf = await getDocumentProxy(new Uint8Array(await r.arrayBuffer()));
  const pages: Item[][] = [];
  const last = wantJoueurs ? pdf.numPages : 1;
  for (let p = 1; p <= last; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent();
    pages.push((tc.items as any[]).map((it) => ({ x: it.transform[4], y: it.transform[5], w: it.width, s: String(it.str).trim() })).filter((i) => i.s));
  }
  return { tiers: parseTiers(pages[0]), feuille: wantJoueurs ? parseFeuilleJoueurs(pages) : null };
}

async function preview(url: string) {
  competitionBase(url);
  const c = await fetchComponents(url);
  const sel = c["competitions---poule-selector"] || {};
  const poule = sel.selected_poule || {};
  const phase = (sel.phases || []).find((p: any) => p.id === poule.phaseId);
  const rencontres: any[] = c["competitions---rencontre-list"]?.rencontres || [];
  const labels = new Set<string>();
  for (const r of rencontres) { labels.add(r.equipe1Libelle); labels.add(r.equipe2Libelle); }
  const ours = [...labels].filter((l) => norm(l).includes(norm(KEYWORD)));
  return { competition: c["page-header"]?.title || "", phase: phase?.libelle || "", poule: poule.libelle || "", equipes_du_club: ours, nb_matchs_page: rencontres.length };
}

async function syncAll(only: number | null, refaireJoueurs = false) {
  const t0 = Date.now();
  const rep = { sources: 0, rencontres: 0, joues: 0, mis_a_jour: 0, tiers_lus: 0, joueurs_lus: 0, feuilles_restantes: 0, conflits: [] as string[], non_rapproches: [] as string[], erreurs: [] as string[] };
  let q = admin.from("ffhb_sources").select("*").eq("active", true);
  if (only) q = q.eq("equipe", only);
  const { data: sources } = await q;
  const { data: ours } = await admin.from("matches")
    .select("id,equipe,titre,debut,score_nous,score_eux,score_periodes,url_ffhb,ext_rencontre_id,mi_temps,tiers_done");
  const rows: any[] = ours || [];

  for (const src of sources || []) {
    if (Date.now() - t0 > DEADLINE_MS) { rep.erreurs.push("Temps dépassé : relance « Mettre à jour »."); break; }
    rep.sources++;
    try {
      const base = competitionBase(src.url);
      const c = await fetchComponents(src.url);
      const sel = c["competitions---poule-selector"] || {};
      const poule = sel.selected_poule || {};
      const phase = (sel.phases || []).find((p: any) => p.id === poule.phaseId)?.libelle || "";
      let all: any[] = c["competitions---rencontre-list"]?.rencontres || [];
      const pId = poule.ext_pouleId;
      if (pId) {
        let js: any[] = [];
        try { js = JSON.parse(poule.journees || "[]"); } catch { /* ignoré */ }
        const got = new Map<string, any>();
        for (const n of js.map((j: any) => j.journee_numero).filter(Boolean).slice(0, 30)) {
          if (Date.now() - t0 > DEADLINE_MS) break;
          try {
            const cc = await fetchComponents(`${base}poule-${pId}/journee-${n}/`);
            for (const r of cc["competitions---rencontre-list"]?.rencontres || []) got.set(String(r.ext_rencontreId), r);
          } catch (e) { rep.erreurs.push(`poule J${n} : ${(e as Error).message}`); }
        }
        if (got.size) all = [...got.values()];
      }
      rep.rencontres += all.length;

      // Matchs de toute la poule (classement). Les tiers-temps déjà lus sont conservés (colonnes non envoyées).
      const pm = all.map((r: any) => {
        const played = num(r.equipe1Score) !== null && num(r.equipe2Score) !== null;
        return {
          source_id: src.id, ext_rencontre_id: String(r.ext_rencontreId), match_date: r.date || null,
          journee_num: num(r.journeeNumero), phase, poule: poule.libelle || "",
          team1: r.equipe1Libelle, team2: r.equipe2Libelle, ext_team1: String(r.equipe1Id), ext_team2: String(r.equipe2Id),
          score1: played ? num(r.equipe1Score) : null, score2: played ? num(r.equipe2Score) : null,
          ht1: played ? num(r.equipe1ScoreMT) : null, ht2: played ? num(r.equipe2ScoreMT) : null,
          fdm_code: r.fdmCode || null, updated_at: new Date().toISOString(),
        };
      });
      if (pm.length) {
        const { error } = await admin.from("poule_matches").upsert(pm, { onConflict: "source_id,ext_rencontre_id" });
        if (error) rep.erreurs.push("poule : " + error.message);
      }

      // Nos matchs : rapprochement avec le calendrier de l'appli, puis remplissage des CASES VIDES seulement
      const me = pickOurId(all, src.equipe);
      if (!me) { rep.erreurs.push(`${src.label || src.url} : équipe ${src.equipe} du club introuvable dans cette poule`); }
      else {
        for (const r of all) {
          const home = String(r.equipe1Id) === me.id, away = String(r.equipe2Id) === me.id;
          if (!home && !away) continue;
          const rid = String(r.ext_rencontreId);
          const opp = norm(home ? r.equipe2Libelle : r.equipe1Libelle);
          let row = rows.find((x) => x.ext_rencontre_id === rid)
            || rows.find((x) => x.equipe === src.equipe && x.url_ffhb && x.url_ffhb.includes(`/rencontre-${rid}/`));
          if (!row) {
            const t = Date.parse(r.date || "");
            if (!isNaN(t)) {
              const cands = rows.filter((x) => x.equipe === src.equipe && !x.ext_rencontre_id && Math.abs(Date.parse(x.debut) - t) < 36 * 3600 * 1000
                && (norm(x.titre).includes(opp) || opp.includes(norm(x.titre.split(/\s+vs\s+/i).find((p: string) => !norm(p).includes(norm(KEYWORD))) || "#"))));
              cands.sort((a, b) => Math.abs(Date.parse(a.debut) - t) - Math.abs(Date.parse(b.debut) - t));
              row = cands[0];
            }
          }
          if (!row) { rep.non_rapproches.push(`J${r.journeeNumero ?? "?"} ${r.equipe1Libelle} – ${r.equipe2Libelle}`); continue; }
          const sf = num(home ? r.equipe1Score : r.equipe2Score), sa = num(home ? r.equipe2Score : r.equipe1Score);
          const played = sf !== null && sa !== null;
          if (played) rep.joues++;
          const upd: Record<string, unknown> = {};
          if (row.ext_rencontre_id !== rid) upd.ext_rencontre_id = rid;
          if (r.fdmCode) upd.fdm_code = r.fdmCode;
          if (num(r.journeeNumero) !== null) upd.journee = num(r.journeeNumero);
          if (phase) upd.phase = phase;
          if (!row.url_ffhb && pId) upd.url_ffhb = `${base}poule-${pId}/rencontre-${rid}/`;
          if (played) {
            if (row.score_nous === null || row.score_nous === undefined) { upd.score_nous = sf; upd.score_eux = sa; }
            else if (row.score_nous !== sf || row.score_eux !== sa) rep.conflits.push(`J${r.journeeNumero ?? "?"} ${home ? "vs" : "à"} ${home ? r.equipe2Libelle : r.equipe1Libelle} : saisi ${row.score_nous}–${row.score_eux}, FFHB ${sf}–${sa}`);
            const mtf = num(home ? r.equipe1ScoreMT : r.equipe2ScoreMT), mta = num(home ? r.equipe2ScoreMT : r.equipe1ScoreMT);
            if (!row.mi_temps && mtf !== null && mta !== null) upd.mi_temps = { nous: mtf, eux: mta };
          }
          if (Object.keys(upd).length) {
            const { error } = await admin.from("matches").update(upd).eq("id", row.id);
            if (error) rep.erreurs.push(`match ${rid} : ${error.message}`);
            else { Object.assign(row, upd); rep.mis_a_jour++; }
          }
          row.__home = home; row.__rid = rid;
        }
      }
      await admin.from("ffhb_sources").update({ last_sync_at: new Date().toISOString(), last_sync_status: "ok" }).eq("id", src.id);
    } catch (e) {
      rep.erreurs.push(`${src.label || src.url} : ${(e as Error).message}`);
      await admin.from("ffhb_sources").update({ last_sync_at: new Date().toISOString(), last_sync_status: (e as Error).message.slice(0, 200) }).eq("id", src.id);
    }
  }

  // Feuilles de match (nos matchs d'abord), au plus PDF_BUDGET par passage : tiers-temps de toute la poule + stats des joueurs de NOS matchs
  try {
    const srcIds = (sources || []).map((s: any) => s.id);
    const eqOf = new Map<string, number>((sources || []).map((s: any) => [s.id, s.equipe]));
    if (refaireJoueurs && srcIds.length) await admin.from("poule_matches").update({ joueurs_done: false }).in("source_id", srcIds);
    const { data: todo } = await admin.from("poule_matches").select("id,source_id,ext_rencontre_id,fdm_code,match_date,team1,team2,tiers_done,joueurs_done")
      .in("source_id", srcIds.length ? srcIds : ["00000000-0000-0000-0000-000000000000"])
      .or("tiers_done.eq.false,joueurs_done.eq.false").not("fdm_code", "is", null).not("score1", "is", null);
    const kw = norm(KEYWORD);
    const usSide = (p: any): "rec" | "vis" | null => norm(p.team1).includes(kw) ? "rec" : (norm(p.team2).includes(kw) ? "vis" : null);
    const need = (todo || []).map((p: any) => ({ p, wantT: !p.tiers_done, wantJ: !p.joueurs_done && usSide(p) !== null })).filter((x: any) => x.wantT || x.wantJ);
    const mine = new Set(rows.map((x) => x.ext_rencontre_id).filter(Boolean));
    need.sort((a: any, b: any) => (mine.has(b.p.ext_rencontre_id) ? 1 : 0) - (mine.has(a.p.ext_rencontre_id) ? 1 : 0));
    const seen = new Set<string>();
    let used = 0;
    for (const { p: t, wantT, wantJ } of need) {
      if (seen.has(t.fdm_code)) continue;
      if (used >= PDF_BUDGET || Date.now() - t0 > DEADLINE_MS) { rep.feuilles_restantes++; continue; }
      seen.add(t.fdm_code); used++;
      let fe: Awaited<ReturnType<typeof readFeuille>>;
      try { fe = await readFeuille(t.fdm_code, wantJ); }
      catch (e) { rep.erreurs.push(`feuille ${t.fdm_code} : ${(e as Error).message}`); continue; }
      if (wantT) {
        const upd: Record<string, unknown> = { tiers_done: true };
        if (fe.tiers) {
          const f = deltas(fe.tiers.rec), g = deltas(fe.tiers.vis);
          Object.assign(upd, { t1_1: f[0], t1_2: g[0], t2_1: f[1], t2_2: g[1], t3_1: f[2], t3_2: g[2] });
          rep.tiers_lus++;
        }
        await admin.from("poule_matches").update(upd).eq("fdm_code", t.fdm_code);
      }
      if (wantJ) {
        try {
          if (!fe.feuille) throw new Error("tableau des joueurs non reconnu");
          const side = usSide(t)!;
          const list = side === "rec" ? fe.feuille.rec : fe.feuille.vis;
          const eq = eqOf.get(t.source_id) || null;
          const r1 = await admin.from("ffhb_joueurs").upsert(list.map((j) => ({ licence: j.licence, nom: j.nom, numero: j.numero })), { onConflict: "licence" });
          if (r1.error) throw new Error(r1.error.message);
          const r2 = await admin.from("player_match_stats").upsert(list.map((j) => ({
            fdm_code: t.fdm_code, ext_rencontre_id: t.ext_rencontre_id, match_date: t.match_date, equipe: eq, licence: j.licence, numero: j.numero,
            buts: j.buts, buts_7m: j.buts7m, tirs: j.tirs, arrets: j.arrets, avertissements: j.avert, deux_min: j.deuxMin,
            disqualifications: j.dis, commotions: j.commotions, autres: Object.keys(j.autres).length ? j.autres : null, updated_at: new Date().toISOString(),
          })), { onConflict: "fdm_code,licence" });
          if (r2.error) throw new Error(r2.error.message);
          await admin.from("poule_matches").update({ joueurs_done: true }).eq("fdm_code", t.fdm_code);
          rep.joueurs_lus++;
          list.forEach((j) => j.ecarts.forEach((e) => rep.erreurs.push(`feuille ${t.fdm_code} — ${j.nom} : ${e} (valeur du tableau gardée)`)));
          list.forEach((j) => { for (const k of Object.keys(j.autres)) rep.erreurs.push(`feuille ${t.fdm_code} — ${j.nom} : action « ${k} » ×${j.autres[k]} (non classée, à vérifier)`); });
        } catch (e) { rep.erreurs.push(`joueurs feuille ${t.fdm_code} : ${(e as Error).message}`); }
      }
    }
  } catch (e) { rep.erreurs.push("feuilles : " + (e as Error).message); }

  // Copie des tiers-temps vers NOS matchs (cases vides seulement)
  try {
    const ids = rows.filter((x) => x.__rid && !x.score_periodes).map((x) => x.__rid);
    if (ids.length) {
      const { data: pms } = await admin.from("poule_matches").select("*").in("ext_rencontre_id", ids).eq("tiers_done", true).not("t1_1", "is", null);
      for (const p of pms || []) {
        const row = rows.find((x) => x.__rid === p.ext_rencontre_id);
        if (!row || row.score_periodes) continue;
        const h = row.__home;
        const per = [[p.t1_1, p.t1_2], [p.t2_1, p.t2_2], [p.t3_1, p.t3_2]].map(([a, b]) => h ? { nous: a, eux: b } : { nous: b, eux: a });
        const { error } = await admin.from("matches").update({ score_periodes: per, tiers_done: true }).eq("id", row.id);
        if (!error) row.score_periodes = per;
      }
    }
  } catch (e) { rep.erreurs.push("copie tiers : " + (e as Error).message); }

  rep.non_rapproches = [...new Set(rep.non_rapproches)];
  await admin.from("sync_log").insert({ ok: rep.erreurs.length === 0, message: JSON.stringify(rep).slice(0, 3000) });
  return rep;
}

async function coachId(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return null;
  const { data: c } = await admin.from("coaches").select("id").eq("id", u.user.id).maybeSingle();
  return c ? u.user.id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!(await coachId(req))) return json({ error: "Réservé aux coachs connectés" }, 401);
    const body = await req.json().catch(() => ({}));
    if (body.mode === "preview") return json(await preview(String(body.url || "")));
    if (body.mode === "sync") return json(await syncAll(body.equipe === 1 || body.equipe === 2 ? body.equipe : null, body.refaire_joueurs === true));
    return json({ error: "mode inconnu" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
