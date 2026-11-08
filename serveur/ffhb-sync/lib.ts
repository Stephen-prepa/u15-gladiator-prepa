// Fonctions pures (sans accès réseau ni base) : lecture des pages FFHB, tiers-temps, rapprochement d'équipe.
export const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
export const KEYWORD = "CLERMONT SALAGOU";

export const norm = (s: string) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function unesc(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

// Lit les balises <smartfire-component name="…" attributes="…JSON échappé…"> d'une page FFHB.
export function parseComponents(html: string): Record<string, any> {
  const out: Record<string, any> = {};
  const re = /<smartfire-component\b([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const a = m[1];
    const name = (a.match(/name=['"]([^'"]+)['"]/) || [])[1];
    const attr = (a.match(/attributes="([^"]*)"/) || [])[1];
    if (!name || !attr || out[name]) continue;
    try { out[name] = JSON.parse(unesc(attr)); } catch { /* composant illisible : ignoré */ }
  }
  if (out["page-404"] !== undefined || !Object.keys(out).some((k) => k.startsWith("competitions---")))
    throw new Error("Page FFHB introuvable (vérifie le lien)");
  return out;
}

export function competitionBase(url: string) {
  const m = url.match(/^(https:\/\/www\.ffhandball\.fr\/competitions\/saison-[^/]+\/[^/]+\/[^/]+\/)/);
  if (!m) throw new Error("Lien FFHB non reconnu : colle l'adresse d'une page « Calendrier & résultats » d'une poule sur ffhandball.fr.");
  return m[1];
}

// Nombre ou null (0 reste 0 ; vide/absent = null)
export function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

export function fdmUrl(code: string) {
  return `https://fdm.fdme.ffhandball.fr/${code[0]}/${code[1]}/${code[2]}/${code[3]}/${code}.pdf`;
}

export type Item = { x: number; y: number; s: string; w?: number };

// « Détail score » : scores CUMULÉS fin période 1, fin période 2, puis final (REC = recevant, VIS = visiteur).
export function parseTiers(items: Item[]): { rec: number[]; vis: number[] } | null {
  const recs = items.filter((i) => i.s === "REC").sort((a, b) => b.y - a.y);
  if (!recs.length) return null;
  const y = recs[0].y;
  const nums = items.filter((i) => /^\d+$/.test(i.s) && i.y < y - 3 && i.y > y - 30).sort((a, b) => a.x - b.x).map((i) => parseInt(i.s, 10));
  if (nums.length < 6) return null;
  const rec = [nums[0], nums[2], nums[4]], vis = [nums[1], nums[3], nums[5]];
  const ok = (a: number[]) => a[0] <= a[1] && a[1] <= a[2];
  if (!ok(rec) || !ok(vis)) return null;
  return { rec, vis };
}
// cumulés -> par tiers-temps
export const deltas = (x: number[]) => [x[0], x[1] - x[0], x[2] - x[1]];

// Identifiant FFHB de notre équipe dans une liste de rencontres (par le nom du club + numéro d'équipe).
export function pickOurId(rencontres: any[], equipe: number, keyword = KEYWORD): { id: string; label: string } | null {
  const kw = norm(keyword);
  const cands = new Map<string, string>();
  for (const r of rencontres) {
    for (const [id, lib] of [[r.equipe1Id, r.equipe1Libelle], [r.equipe2Id, r.equipe2Libelle]]) {
      if (id !== undefined && id !== null && norm(lib).includes(kw)) cands.set(String(id), String(lib));
    }
  }
  if (!cands.size) return null;
  const all = [...cands.entries()];
  const suffix = all.filter(([, lib]) => new RegExp(`(^|\\s)${equipe}$`).test(norm(lib)));
  const pick = suffix[0] || (all.length === 1 ? all[0] : null);
  return pick ? { id: pick[0], label: pick[1] } : null;
}

// ====================== Joueurs : stats individuelles depuis la feuille de match (PDF FDME) ======================
// Deux sources croisées : le tableau de la page 1 (par joueur : buts, 7 m, tirs = total buts compris, arrêts, avertissement, 2', disqualification)
// et le « Déroulé du match » (pages suivantes : une ligne par action avec le nom du joueur). Un écart entre les deux est signalé, jamais caché.
export type Joueur = {
  numero: number | null; nom: string; licence: string;
  buts: number; buts7m: number; tirs: number; arrets: number; avert: number; deuxMin: number; dis: number; commotions: number;
  autres: Record<string, number>; ecarts: string[];
};
export type Feuille = { rec: Joueur[]; vis: Joueur[] };

const nrm = (s: string) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const cx = (i: Item) => i.x + (i.w || 0) / 2;
// Recolle les morceaux de texte : une espace seulement s'il y a un vrai trou entre deux morceaux (« 2 » + « MN » = « 2MN »)
function joinItems(row: Item[]): string {
  let out = "", prevEnd = -1e9;
  row.forEach((i) => { out += (out && i.x - prevEnd > 1.2 ? " " : "") + i.s; prevEnd = i.x + (i.w || 0); });
  return out.trim();
}
const sameRow = (a: Item, b: Item, tol = 2.5) => Math.abs(a.y - b.y) <= tol;

type Col = { key: string; c: number };
function headerCols(items: Item[], h: Item): Col[] {
  const row = items.filter((i) => sameRow(i, h)).sort((a, b) => a.x - b.x);
  const cols: Col[] = [];
  for (let k = 0; k < row.length; k++) {
    const t = nrm(row[k].s);
    if (t === "n°") cols.push({ key: "num", c: cx(row[k]) });
    else if (t === "buts") cols.push({ key: "buts", c: cx(row[k]) });
    else if (t === "tirs") cols.push({ key: "tirs", c: cx(row[k]) });
    else if (/^arrets?$/.test(t)) cols.push({ key: "arrets", c: cx(row[k]) });
    else if (t === "av.") cols.push({ key: "avert", c: cx(row[k]) });
    else if (t === "2'") cols.push({ key: "deuxMin", c: cx(row[k]) });
    else if (t === "dis") cols.push({ key: "dis", c: cx(row[k]) });
    else if (t === "type" || t === "jfl") cols.push({ key: "ignore", c: cx(row[k]) });
    else if (t === "7m") cols.push({ key: "b7", c: cx(row[k]) });
    else if (t === "7" && row[k + 1] && nrm(row[k + 1].s) === "m") { cols.push({ key: "b7", c: (cx(row[k]) + cx(row[k + 1])) / 2 }); k++; }
  }
  return cols;
}
const toInt = (s: string) => (/^\d+$/.test(s) ? parseInt(s, 10) : /^x$/i.test(s) ? 1 : null);
const newJoueur = (numero: number | null, nom: string, licence: string): Joueur =>
  ({ numero, nom, licence, buts: 0, buts7m: 0, tirs: 0, arrets: 0, avert: 0, deuxMin: 0, dis: 0, commotions: 0, autres: {}, ecarts: [] });

// pages = éléments de texte de chaque page (x, y, largeur, texte). Renvoie null si la feuille n'a pas la structure attendue.
export function parseFeuilleJoueurs(pages: Item[][]): Feuille | null {
  type Tab = { team: "rec" | "vis"; rows: { j: Joueur; t: Record<string, number> }[] };
  const tabs: Tab[] = [];
  let lastTeam: "rec" | "vis" = "rec";
  pages.forEach((items) => {
    const heads = items.filter((i) => i.s === "Licence").sort((a, b) => b.y - a.y);
    heads.forEach((h, k) => {
      const cols = headerCols(items, h);
      if (!cols.some((c) => c.key === "buts")) return;
      let team: "rec" | "vis";
      if (heads.length >= 2) team = k === 0 ? "rec" : "vis";
      else if (items.some((i) => nrm(i.s) === "visiteur" && i.x < 40)) team = "vis";
      else if (items.some((i) => nrm(i.s) === "recevant" && i.x < 40)) team = "rec";
      else team = lastTeam;
      lastTeam = team;
      const lower = k + 1 < heads.length ? heads[k + 1].y : -1e9;
      let tab = tabs.find((t) => t.team === team);
      if (!tab) { tab = { team, rows: [] }; tabs.push(tab); }
      const numCol = cols.find((c) => c.key === "num");
      items.filter((i) => /^\d{9,}$/.test(i.s) && i.y < h.y - 3 && i.y > lower + 3).forEach((lic) => {
        const row = items.filter((i) => sameRow(i, lic));
        if (row.some((i) => /^officiel/.test(nrm(i.s)))) return;
        const numIt = row.filter((i) => /^\d{1,3}$/.test(i.s) && i.x < lic.x && (!numCol || Math.abs(cx(i) - numCol.c) < 12))[0];
        if (!numIt) return;
        const nom = row.filter((i) => i.x > cx(numIt) + 6 && i.x < lic.x - 2).sort((a, b) => a.x - b.x).map((i) => i.s).join(" ").trim();
        if (!nom) return;
        const t: Record<string, number> = {};
        row.filter((i) => i.x > lic.x + (lic.w || 0) - 1).forEach((i) => {
          const v = toInt(i.s);
          if (v === null) return;
          let best: Col | null = null, bd = 1e9;
          cols.forEach((c) => { if (c.key === "num") return; const d = Math.abs(cx(i) - c.c); if (d < bd) { bd = d; best = c; } });
          if (best && bd < 14 && (best as Col).key !== "ignore") t[(best as Col).key] = v;
        });
        tab!.rows.push({ j: newJoueur(parseInt(numIt.s, 10), nom, lic.s), t });
      });
    });
  });
  const rec = tabs.find((t) => t.team === "rec"), vis = tabs.find((t) => t.team === "vis");
  if (!rec || !vis || !rec.rows.length || !vis.rows.length) return null;

  // Déroulé du match : une ligne par action (pages suivantes)
  const all = [...rec.rows, ...vis.rows];
  const byLen = [...all].sort((a, b) => nrm(b.j.nom).length - nrm(a.j.nom).length);
  const ev = new Map<string, { buts: number; b7: number; miss: number; arrets: number; avert: number; deux: number; comm: number; dis: number; autres: Record<string, number> }>();
  const E = (lic: string) => { let e = ev.get(lic); if (!e) { e = { buts: 0, b7: 0, miss: 0, arrets: 0, avert: 0, deux: 0, comm: 0, dis: 0, autres: {} }; ev.set(lic, e); } return e; };
  pages.slice(1).forEach((items) => {
    const times = items.filter((i) => /^\d\d:\d\d$/.test(i.s));
    times.forEach((t) => {
      // la ligne s'arrête au début de la colonne suivante (autre heure, ou en-tête « Temps » de la 2e colonne)
      const nextX = Math.min(1e9, ...items.filter((o) => o !== t && sameRow(o, t, 2) && o.x > t.x && (o.s === "Temps" || /^\d\d:\d\d$/.test(o.s))).map((o) => o.x));
      const txt = joinItems(items.filter((i) => sameRow(i, t, 2) && i.x > t.x && i.x < nextX).sort((a, b) => a.x - b.x));
      const m = txt.match(/^(\d+)\s*-\s*(\d+)\s+(.+)$/);
      if (!m) return;
      const action = nrm(m[3]);
      const pl = byLen.find((p) => action.endsWith(nrm(p.j.nom)));
      if (!pl) return;
      const label = action.slice(0, action.length - nrm(pl.j.nom).length).trim();
      const e = E(pl.j.licence);
      if (label === "but 7m" || label === "but 7 m") { e.buts++; e.b7++; }
      else if (label === "but") e.buts++;
      else if (label === "tir") e.miss++; // un 7 m manqué s'écrit « Tir » comme un tir manqué (confirmé par Stephen)
      else if (label === "arret") e.arrets++;
      else if (label === "avertissement") e.avert++;
      else if (label === "2mn") e.deux++;
      else if (label === "commotion") e.comm++;
      else if (/disqualif|rouge|bleu/.test(label)) { e.dis++; e.autres[label] = (e.autres[label] || 0) + 1; }
      else e.autres[label || "?"] = (e.autres[label || "?"] || 0) + 1;
    });
  });

  const fin = (tab: Tab) => tab.rows.map(({ j, t }) => {
    const e = ev.get(j.licence) || { buts: 0, b7: 0, miss: 0, arrets: 0, avert: 0, deux: 0, comm: 0, dis: 0, autres: {} };
    const evTirs = e.buts + e.miss;
    const cmp = (lab: string, tv: number, ev2: number) => { if (tv !== ev2) j.ecarts.push(`${lab} : tableau ${tv}, déroulé ${ev2}`); };
    cmp("buts", t.buts || 0, e.buts); cmp("tirs", t.tirs || 0, evTirs); cmp("arrêts", t.arrets || 0, e.arrets); cmp("2 min", t.deuxMin || 0, e.deux); cmp("avertissements", t.avert || 0, e.avert);
    j.buts = t.buts !== undefined ? t.buts : e.buts;
    j.buts7m = t.b7 !== undefined ? t.b7 : e.b7;
    j.tirs = Math.max(t.tirs !== undefined ? t.tirs : evTirs, j.buts);
    j.arrets = t.arrets !== undefined ? t.arrets : e.arrets;
    j.avert = t.avert !== undefined ? t.avert : e.avert;
    j.deuxMin = t.deuxMin !== undefined ? t.deuxMin : e.deux;
    j.dis = Math.max(t.dis || 0, e.dis);
    j.commotions = e.comm;
    j.autres = e.autres;
    return j;
  });
  return { rec: fin(rec), vis: fin(vis) };
}
