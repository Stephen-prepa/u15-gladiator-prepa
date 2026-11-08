// Fonctions pures (sans accès réseau ni base) : lecture des pages FFHB, tiers-temps, rapprochement d'équipe.
export const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
export const KEYWORD = "CLERMONT SALAGOU";

export const norm = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

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

export type Item = { x: number; y: number; s: string };

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
