import { parseComponents, competitionBase, parseTiers, deltas, pickOurId, num, fdmUrl, norm } from "./lib.ts";
let ok = 0, ko = 0; const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log((c ? "OK  " : "KO  ") + n); };
const comp = { rencontres: [
  { ext_rencontreId: 1, equipe1Id: 11, equipe2Id: 22, equipe1Libelle: "COSTIERE HB", equipe2Libelle: "CLERMONT SALAGOU HBC 1", equipe1Score: "24", equipe2Score: "0", equipe1ScoreMT: "0", fdmCode: "AB12CD34" },
  { ext_rencontreId: 2, equipe1Id: 33, equipe2Id: 44, equipe1Libelle: "CLERMONT SALAGOU HBC 2", equipe2Libelle: "VAUNAGE SC", equipe1Score: "", equipe2Score: "" } ] };
const esc = (o: any) => JSON.stringify(o).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const html = `<html><smartfire-component name="competitions---rencontre-list" attributes="${esc(comp)}"></smartfire-component><smartfire-component name='competitions---poule-selector' attributes="${esc({ selected_poule: { ext_pouleId: 9 } })}"></smartfire-component></html>`;
const c = parseComponents(html);
t("lecture des composants", c["competitions---rencontre-list"].rencontres.length === 2);
t("page 404 refusée", (() => { try { parseComponents("<p>x</p>"); return false; } catch (e) { return /introuvable/.test(String(e)); } })());
t("base de compétition", competitionBase("https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/15-ans-m-1ere-division-32497/poule-200772/") === "https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/15-ans-m-1ere-division-32497/");
t("lien non FFHB refusé", (() => { try { competitionBase("https://evil.example/x"); return false; } catch { return true; } })());
t("num(0)=0 (pas null)", num("0") === 0 && num("") === null && num(null) === null && num("abc") === null);
t("équipe 1 reconnue", pickOurId(comp.rencontres, 1)?.id === "22");
t("équipe 2 reconnue", pickOurId(comp.rencontres, 2)?.id === "33");
t("aucune équipe du club", pickOurId([{ equipe1Id: 1, equipe2Id: 2, equipe1Libelle: "A", equipe2Libelle: "B" }], 1) === null);
t("url feuille de match", fdmUrl("AB12CD34") === "https://fdm.fdme.ffhandball.fr/A/B/1/2/AB12CD34.pdf");
const items = [{ x: 50, y: 500, s: "REC" }, { x: 80, y: 500, s: "VIS" }, ...[6, 12, 15, 17, 24, 25].map((v, i) => ({ x: 100 + i * 20, y: 480, s: String(v) }))];
const tr = parseTiers(items);
t("tiers-temps cumulés lus", !!tr && tr.rec.join() === "6,15,24" && tr.vis.join() === "12,17,25");
t("tiers-temps par période", deltas(tr!.rec).join() === "6,9,9" && deltas(tr!.vis).join() === "12,5,8");
t("cumuls décroissants refusés", parseTiers([...items.slice(0, 2), ...[20, 3, 5, 1, 2, 2].map((v, i) => ({ x: 100 + i * 20, y: 480, s: String(v) }))]) === null);
t("pas de bloc REC -> null", parseTiers([{ x: 1, y: 1, s: "7" }]) === null);
t("norm accents", norm("Côstière  H-B") === "COSTIERE H B");
console.log(`\n${ok} ok, ${ko} ko`); if (ko) process.exit(1);
