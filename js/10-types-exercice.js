// Prépa U15 HBCCS — js/10-types-exercice.js — dernière modification : version z23 (05/11/2026)
// ===== Types d'exercice : situation avec schéma (par défaut), jeu ludique, renforcement musculaire =====
// x.kind absent = « schéma » (tous les exercices existants). Les données propres à un type (x.jeu, x.renfo) sont conservées quand on change de type : seules les rubriques affichées changent.
const CR_KINDS = {
  schema: { icon: '📐', label: 'Situation avec schéma', short: 'Schéma', sub: 'Dessin, étapes, animation' },
  jeu: { icon: '🎲', label: 'Jeu ludique', short: 'Jeu', sub: 'But, règles, points, équipes' },
  renfo: { icon: '💪', label: 'Renforcement musculaire', short: 'Renfo', sub: 'Mouvements, séries, circuit chronométré' },
};
const CR_KIND_NAMES = { schema: 'Nouvel exercice', jeu: 'Nouveau jeu', renfo: 'Renforcement musculaire' };
const CR_RF_ZONES = ['Gainage', 'Abdominaux', 'Jambes', 'Fessiers', 'Bras / épaules', 'Dos', 'Cardio', 'Mobilité', 'Corps entier'];
const CR_RF_SUG = [
  { name: 'Gainage planche', zone: 'Gainage', dur: 30, rest: 30 }, { name: 'Gainage latéral', zone: 'Gainage', dur: 20, rest: 30 }, { name: 'Squats', zone: 'Jambes', sets: 3, reps: '12', rest: 45 },
  { name: 'Fentes alternées', zone: 'Jambes', sets: 3, reps: '10', rest: 45 }, { name: 'Pompes', zone: 'Bras / épaules', sets: 3, reps: '8', rest: 45 }, { name: 'Chaise (isométrique)', zone: 'Jambes', dur: 30, rest: 30 },
  { name: 'Pont fessier', zone: 'Fessiers', sets: 3, reps: '12', rest: 30 }, { name: 'Superman', zone: 'Dos', sets: 3, reps: '10', rest: 30 }, { name: 'Mountain climbers', zone: 'Cardio', dur: 30, rest: 30 },
  { name: 'Montées de genoux', zone: 'Cardio', dur: 30, rest: 30 }, { name: 'Burpees', zone: 'Corps entier', sets: 3, reps: '6', rest: 60 }, { name: 'Sauts groupés', zone: 'Jambes', sets: 3, reps: '8', rest: 45 },
];
const CR_JEU_SUG = ['Interdit de dribbler', 'Trois passes avant de tirer', 'Tout le monde touche le ballon', 'Tir interdit dans la zone', 'Changement de rôle à chaque but', 'Le gardien relance en 3 secondes', 'Un but = 1 point'];
function crKind(x) { return x && CR_KINDS[x.kind] ? x.kind : 'schema'; }
function crNum(v, d, min, max) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d; }
function crNormMove(m) {
  m = (m && typeof m === 'object') ? m : {};
  if (!m.id) m.id = crUid();
  ['name', 'zone', 'cue', 'errors', 'reps'].forEach(k => { m[k] = m[k] == null ? '' : String(m[k]); });
  m.sets = m.sets === '' || m.sets == null ? '' : String(crNum(m.sets, '', 0, 20));
  m.dur = m.dur === '' || m.dur == null ? '' : String(crNum(m.dur, '', 0, 3600));
  m.rest = m.rest === '' || m.rest == null ? '' : String(crNum(m.rest, '', 0, 600));
  if (m.sets === 'NaN') m.sets = ''; if (m.dur === 'NaN') m.dur = ''; if (m.rest === 'NaN') m.rest = '';
  return m;
}
function crNormRenfo(r) {
  r = (r && typeof r === 'object') ? r : {};
  r.format = r.format === 'circuit' ? 'circuit' : 'table';
  r.moves = (Array.isArray(r.moves) ? r.moves : []).map(crNormMove);
  const c = (r.circuit && typeof r.circuit === 'object') ? r.circuit : {};
  r.circuit = { work: crNum(c.work, 40, 5, 600), rest: crNum(c.rest, 20, 0, 600), rounds: crNum(c.rounds, 3, 1, 20), between: crNum(c.between, 60, 0, 600) };
  return r;
}
function crNormJeu(j) {
  j = (j && typeof j === 'object') ? j : {};
  ['goal', 'teams', 'points'].forEach(k => { j[k] = j[k] == null ? '' : String(j[k]); });
  j.withSchema = !!j.withSchema;
  return j;
}
// durée d'un circuit (secondes) : travail + repos entre stations (pas après la dernière), tours, récupération entre les tours
function crRfCircuitSec(r) { const c = r.circuit, n = r.moves.length; if (!n) return 0; return c.rounds * (n * c.work + (n - 1) * c.rest) + (c.rounds - 1) * c.between; }
function crRfDurText(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m ? m + ' min' + (s ? ' ' + String(s).padStart(2, '0') + ' s' : '') : s + ' s'; }
function crRfLine(m) {
  const eff = crTxt(m.dur) ? m.dur + ' s' : (crTxt(m.reps) ? m.reps + (/^\d+$/.test(m.reps) ? ' rép.' : '') : '');
  const core = crTxt(m.sets) && eff ? m.sets + ' × ' + eff : (eff || (crTxt(m.sets) ? m.sets + ' séries' : ''));
  return [core, crTxt(m.rest) ? 'récup ' + m.rest + ' s' : ''].filter(Boolean).join(' · ');
}
// ----- Choix du type à la création -----
function crKindPick(bi) {
  crKindPickClose();
  const el = document.createElement('div'); el.id = 'cr-kindpick'; el.className = 'cr-kp';
  el.innerHTML = `<div class="cr-kp-in" role="dialog" aria-label="Type d'exercice"><div class="cr-kp-t">Quel type d'exercice ?</div>`
    + Object.keys(CR_KINDS).map(k => `<button type="button" class="cr-kp-b" onclick="crAddExKind(${bi},'${k}')"><span class="cr-kp-i">${CR_KINDS[k].icon}</span><span><b>${CR_KINDS[k].label}</b><small>${CR_KINDS[k].sub}</small></span></button>`).join('')
    + `<button type="button" class="cr-kp-c" onclick="crKindPickClose()">Annuler</button></div>`;
  el.addEventListener('click', ev => { if (ev.target === el) crKindPickClose(); });
  document.documentElement.appendChild(el);
}
function crKindPickClose() { const e = document.getElementById('cr-kindpick'); if (e) e.remove(); }
function crAddExKind(bi, kind) {
  crKindPickClose(); if (!CR_KINDS[kind]) kind = 'schema';
  const x = crNormEx({ name: CR_KIND_NAMES[kind], minutes: 10 });
  if (kind !== 'schema') crKindApply(x, kind);
  crCur.blocks[bi].exercises.push(x);
  crTouch();
  crOpenEx(bi, crCur.blocks[bi].exercises.length - 1, true);
}
function crKindApply(x, kind) {
  if (kind === 'schema') delete x.kind; else x.kind = kind;
  if (kind === 'jeu') x.jeu = crNormJeu(x.jeu);
  if (kind === 'renfo') x.renfo = crNormRenfo(x.renfo);
  if (kind === 'jeu' && !Array.isArray(x.items.regles)) x.items.regles = [];
}
function crExKind(kind) {
  const x = crCurEx(); if (!CR_KINDS[kind] || crKind(x) === kind) return;
  crKindApply(x, kind); crTouch(); crRenderExView();
}
// ----- Éditeur : jeu ludique -----
function crJeuSet(k, v) { const j = crCurEx().jeu; if (!j) return; j[k] = v; crTouch(); }
function crJeuSchema() { const x = crCurEx(); x.jeu = crNormJeu(x.jeu); x.jeu.withSchema = true; crTouch(); crRenderExView(); }
function crJeuHtml(x) {
  const j = x.jeu = crNormJeu(x.jeu); if (!Array.isArray(x.items.regles)) x.items.regles = [];
  const hasSch = !!(x.schemaLib || crSchemaHas(x));
  const sch = (j.withSchema || hasSch)
    ? `<div class="cr-list-t" style="margin-top:14px;">Schéma (facultatif)${x.schemaLib && x.schemaLib.drawings.length > 1 ? ' · ' + x.schemaLib.drawings.length + ' étapes' : ''}</div>${crSchemaCard(x, 'main')}`
    : `<button type="button" class="cr-btn" style="margin-top:12px;width:100%;" onclick="crJeuSchema()">＋ Ajouter un schéma (facultatif)</button>`;
  return `<div class="cr-card"><div class="cr-card-t">🎲 Le jeu</div>
    <label class="cr-lbl">But du jeu</label>
    <textarea class="cr-in cr-grow" rows="2" placeholder="Ex. Marquer plus de buts que l’équipe adverse" oninput="crJeuSet('goal',this.value);crGrow(this)">${crEsc(j.goal)}</textarea>
    <label class="cr-lbl">Équipes et organisation</label>
    <textarea class="cr-in cr-grow" rows="2" placeholder="Ex. 2 équipes de 6, chasubles, un gardien par équipe" oninput="crJeuSet('teams',this.value);crGrow(this)">${crEsc(j.teams)}</textarea>
    ${crListHtml('i:regles', { title: 'Règles du jeu', sug: CR_JEU_SUG })}
    <label class="cr-lbl">Points et façon de gagner</label>
    <textarea class="cr-in cr-grow" rows="2" placeholder="Ex. 1 but = 1 point, but après 5 passes = 3 points" oninput="crJeuSet('points',this.value);crGrow(this)">${crEsc(j.points)}</textarea>
    ${sch}</div>`;
}
// ----- Éditeur : renforcement musculaire -----
function crRfRef() { const x = crCurEx(); x.renfo = crNormRenfo(x.renfo); return x.renfo; }
function crRfFmt(f) { const r = crRfRef(); r.format = f === 'circuit' ? 'circuit' : 'table'; crTouch(); crRenderExView(); }
function crRfCfg(k, v) { const r = crRfRef(), lim = { work: [5, 600], rest: [0, 600], rounds: [1, 20], between: [0, 600] }[k]; if (!lim) return; r.circuit[k] = crNum(v, r.circuit[k], lim[0], lim[1]); crRfTotalRefresh(); crTouch(); }
function crRfSet(i, k, v) { const m = crRfRef().moves[i]; if (!m) return; m[k] = v; if (k === 'name') { const e = document.getElementById('cr-rf-h' + i); if (e) e.textContent = v || 'Mouvement ' + (i + 1); } if (k === 'dur' || k === 'rest') crRfTotalRefresh(); crTouch(); }
function crRfAdd(si) { const r = crRfRef(), s = si == null ? {} : CR_RF_SUG[si] || {}; r.moves.push(crNormMove({ ...s })); crTouch(); crRenderExView(); if (si == null) { const e = document.getElementById('cr-rf-n' + (r.moves.length - 1)); if (e) e.focus(); } }
function crRfDel(i) { const r = crRfRef(); r.moves.splice(i, 1); crTouch(); crRenderExView(); }
function crRfMove(i, d) { const a = crRfRef().moves, j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; crTouch(); crRenderExView(); }
function crRfSetMinutes() { const x = crCurEx(), r = crRfRef(), m = Math.max(1, Math.round(crRfCircuitSec(r) / 60)); x.minutes = m; crTouch(); crRenderExView(); }
function crRfTotalRefresh() { const e = document.getElementById('cr-rf-total'); if (e) e.innerHTML = crRfTotalHtml(crRfRef()); }
function crRfTotalHtml(r) { const s = crRfCircuitSec(r); return r.moves.length ? `Circuit : <b>${r.moves.length} station${r.moves.length > 1 ? 's' : ''}</b> · durée totale <b>≈ ${crRfDurText(s)}</b>` : 'Ajoute des stations pour calculer la durée.'; }
function crRfHtml(x) {
  const r = x.renfo = crNormRenfo(x.renfo), circ = r.format === 'circuit', c = r.circuit;
  const num = (id, label, val, fn, unit) => `<div><label class="cr-lbl">${label}</label><input type="number" inputmode="numeric" class="cr-in" min="0" value="${val}" oninput="${fn}"${unit ? ` placeholder="${unit}"` : ''}></div>`;
  const cfg = circ ? `<div class="cr-rf-cfg">${num('w', 'Travail (s)', c.work, "crRfCfg('work',this.value)")}${num('r', 'Repos (s)', c.rest, "crRfCfg('rest',this.value)")}${num('t', 'Tours', c.rounds, "crRfCfg('rounds',this.value)")}${num('b', 'Entre tours (s)', c.between, "crRfCfg('between',this.value)")}</div>
    <div class="cr-rf-total"><span id="cr-rf-total">${crRfTotalHtml(r)}</span>${r.moves.length ? ` <button type="button" class="cr-btn sm" onclick="crRfSetMinutes()">Durée de l’exercice = ${Math.max(1, Math.round(crRfCircuitSec(r) / 60))} min</button>` : ''}</div>` : '';
  const zoneSel = (m, i) => `<select class="cr-in" aria-label="Zone travaillée" onchange="crRfSet(${i},'zone',this.value)"><option value="">Zone travaillée</option>${CR_RF_ZONES.concat(m.zone && !CR_RF_ZONES.includes(m.zone) ? [m.zone] : []).map(z => `<option ${m.zone === z ? 'selected' : ''}>${crEsc(z)}</option>`).join('')}</select>`;
  const rows = r.moves.map((m, i) => `<div class="cr-rf-m">
      <div class="cr-rf-mh"><span class="cr-li-n">${i + 1}</span><input class="cr-in" id="cr-rf-n${i}" placeholder="${circ ? 'Station ' + (i + 1) : 'Mouvement'} (ex. Gainage planche)" value="${crEsc(m.name)}" oninput="crRfSet(${i},'name',this.value)">
        <div class="cr-li-a"><button type="button" ${i === 0 ? 'disabled' : ''} onclick="crRfMove(${i},-1)">↑</button><button type="button" ${i === r.moves.length - 1 ? 'disabled' : ''} onclick="crRfMove(${i},1)">↓</button><button type="button" style="color:#ff6b6b;" onclick="crRfDel(${i})" aria-label="Supprimer">✕</button></div></div>
      ${circ ? '' : `<div class="cr-rf-nums"><div><label class="cr-lbl">Séries</label><input type="number" inputmode="numeric" class="cr-in" min="0" value="${crEsc(m.sets)}" oninput="crRfSet(${i},'sets',this.value)"></div><div><label class="cr-lbl">Répétitions</label><input class="cr-in" inputmode="numeric" placeholder="12 ou 8-10" value="${crEsc(m.reps)}" oninput="crRfSet(${i},'reps',this.value)"></div><div><label class="cr-lbl">ou durée (s)</label><input type="number" inputmode="numeric" class="cr-in" min="0" value="${crEsc(m.dur)}" oninput="crRfSet(${i},'dur',this.value)"></div><div><label class="cr-lbl">Récup (s)</label><input type="number" inputmode="numeric" class="cr-in" min="0" value="${crEsc(m.rest)}" oninput="crRfSet(${i},'rest',this.value)"></div></div>`}
      ${zoneSel(m, i)}
      <textarea class="cr-in cr-grow" rows="1" placeholder="Consigne d’exécution" oninput="crRfSet(${i},'cue',this.value);crGrow(this)">${crEsc(m.cue)}</textarea>
      <textarea class="cr-in cr-grow" rows="1" placeholder="Erreurs à éviter" oninput="crRfSet(${i},'errors',this.value);crGrow(this)">${crEsc(m.errors)}</textarea></div>`).join('');
  const used = r.moves.map(m => crFold(m.name).trim());
  const sug = CR_RF_SUG.map((s, si) => [s, si]).filter(([s]) => !used.includes(crFold(s.name).trim()));
  return `<div class="cr-card"><div class="cr-card-t">💪 Séquence de renforcement</div>
    <div class="cr-rf-fmt"><button type="button" class="cr-chip ${circ ? '' : 'on'}" onclick="crRfFmt('table')">Tableau de séries</button><button type="button" class="cr-chip ${circ ? 'on' : ''}" onclick="crRfFmt('circuit')">Circuit chronométré</button></div>
    ${cfg}${rows || '<div class="cr-subd" style="margin:8px 0;">Aucun mouvement pour l’instant.</div>'}
    <button type="button" class="cr-btn" style="width:100%;" onclick="crRfAdd()">＋ Ajouter ${circ ? 'une station' : 'un mouvement'}</button>
    ${sug.length ? `<div class="cr-sug">${sug.map(([s, si]) => `<button type="button" class="cr-chip" onclick="crRfAdd(${si})">＋ ${crEsc(s.name)}</button>`).join('')}</div>` : ''}</div>`;
}
// ----- Fiche (aperçu + PDF) -----
function crFicheRenfo(x) {
  const r = crNormRenfo(x.renfo), mv = r.moves.filter(m => crTxt(m.name) || crTxt(m.cue) || crTxt(m.errors)); if (!mv.length) return '';
  if (r.format === 'circuit') {
    const c = r.circuit, sec = crRfCircuitSec(r);
    return `<div class="cr-fx-rf"><h4>💪 Circuit chronométré</h4><div class="cr-fx-rfp">Travail <b>${c.work} s</b> · repos <b>${c.rest} s</b> · <b>${c.rounds} tour${c.rounds > 1 ? 's' : ''}</b>${c.rounds > 1 && c.between ? ` (${c.between} s entre les tours)` : ''} · durée ≈ <b>${crRfDurText(sec)}</b></div>
      <table class="cr-fx-rft"><thead><tr><th>#</th><th>Station</th><th>Zone</th><th>Consigne / erreurs à éviter</th></tr></thead><tbody>${mv.map((m, i) => `<tr><td>${i + 1}</td><td><b>${crEsc(m.name || 'Station ' + (i + 1))}</b></td><td>${crEsc(m.zone)}</td><td>${crEsc(m.cue)}${crTxt(m.errors) ? `<span class="cr-fx-extra">✗ ${crEsc(m.errors)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  }
  return `<div class="cr-fx-rf"><h4>💪 Séquence de renforcement</h4>
    <table class="cr-fx-rft"><thead><tr><th>#</th><th>Mouvement</th><th>Séries × rép. / durée</th><th>Zone</th><th>Consigne / erreurs à éviter</th></tr></thead><tbody>${mv.map((m, i) => `<tr><td>${i + 1}</td><td><b>${crEsc(m.name || 'Mouvement ' + (i + 1))}</b></td><td>${crEsc(crRfLine(m))}</td><td>${crEsc(m.zone)}</td><td>${crEsc(m.cue)}${crTxt(m.errors) ? `<span class="cr-fx-extra">✗ ${crEsc(m.errors)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
function crKindMeta(x) {
  const kd = crKind(x); if (kd === 'schema') return '';
  if (kd === 'jeu') return '🎲 Jeu ludique';
  const r = crNormRenfo(x.renfo), n = r.moves.length;
  return '💪 ' + (r.format === 'circuit' ? 'Circuit chronométré · ' + n + ' station' + (n > 1 ? 's' : '') + (n ? ' · ≈ ' + crRfDurText(crRfCircuitSec(r)) : '') : 'Tableau de séries · ' + n + ' mouvement' + (n > 1 ? 's' : ''));
}
function crTxt(v) { return String(v == null ? '' : v).trim(); }
function crTabCount(x, tab) {
  const nb = a => (a || []).filter(it => crTxt(it.text) || crTxt(it.extra)).length;
  if (tab.org) return CR_ORG_FIELDS.filter(([k]) => crTxt(x.org[k])).length;
  if (tab.evo) return (x.evolutions || []).filter(e => crTxt(e.title) || crTxt(e.text)).length;
  if (tab.equip) return x.equipment.length;
  return tab.lists.reduce((n, l) => n + nb(x.items[l.k]), 0);
}
function crHasGb(x) {
  const g = x.gb; if (!g) return false;
  return !!(crTxt(g.objective) || g.instructions.some(i => crTxt(i.text)) || g.success.some(i => crTxt(i.text)) || g.equipment.length || (g.schemaLib && g.schemaLib.drawings.length));
}
function crHeadcountText(x) {
  const h = x.headcount || {}, out = [];
  const pl = crTxt(h.players);
  if (pl) out.push(/^\d+$/.test(pl) ? pl + ' joueur' + (pl === '1' ? '' : 's') : pl);
  const gk = parseInt(h.goalkeepers, 10); if (gk > 0) out.push(gk + ' GB');
  const gr = parseInt(h.groups, 10), pg = parseInt(h.perGroup, 10);
  if (gr > 0) out.push(gr + ' groupe' + (gr > 1 ? 's' : '') + (pg > 0 ? ' de ' + pg : ''));
  else if (pg > 0) out.push(pg + ' par groupe');
  return out.join(' · ');
}
function crCurEx() { return crCur.blocks[crEx.bi].exercises[crEx.ei]; }
function crExFlat() { const out = []; crCur.blocks.forEach((b, bi) => (b.exercises || []).forEach((x, ei) => out.push([bi, ei]))); return out; }
function crExNum(bi, ei) { return crExFlat().findIndex(a => a[0] === bi && a[1] === ei) + 1; }
function crOpenEx(bi, ei, fresh) {
  crPlayStop();
  crEx = { bi, ei, tab: crTabs()[0].k }; crExInfoOpen = false;
  document.getElementById('cr-edit-view').style.display = 'none';
  document.getElementById('cr-ex-view').style.display = '';
  crRenderExView();
  window.scrollTo(0, 0);
}
function crCloseEx() {
  crPlayStop();
  document.getElementById('cr-ex-view').style.display = 'none';
  crRenderEditor(crCur);
}
function crExNav(d) {
  const f = crExFlat(), i = f.findIndex(a => a[0] === crEx.bi && a[1] === crEx.ei), j = i + d;
  if (j < 0 || j >= f.length) return;
  crPlayStop();
  crEx = { bi: f[j][0], ei: f[j][1], tab: crEx.tab }; crExInfoOpen = false;
  crRenderExView(); window.scrollTo(0, 0);
}
function crGrow(el) { if (!el) return; el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, el.closest('.cr-li') ? 36 : 42) + 'px'; }
function crGrowAll() { document.querySelectorAll('#cr-ex-view textarea.cr-grow').forEach(crGrow); }
function crListRef(path) {
  const x = crCurEx(), k = path.slice(2);
  return path[0] === 'i' ? x.items[k] : x.gb[k];
}
function crListHtml(path, def) {
  const arr = crListRef(path);
  const rows = arr.map((it, i) => {
    let tag = '';
    if (def.tags) {
      const autoLbl = def.auto ? (i === 0 ? 'Principale' : 'Secondaire') : '';
      tag = `<select class="cr-in cr-li-tag" onchange="crLiSet('${path}',${i},'tag',this.value)"><option value="">${def.auto ? 'Auto (' + autoLbl + ')' : '— étiquette —'}</option>${def.tags.map(t => `<option ${it.tag === t ? 'selected' : ''}>${crEsc(t)}</option>`).join('')}</select>`;
    }
    const ph = def.extra ? 'Erreur observée' : 'Écrire ici…';
    return `<div class="cr-li"><span class="cr-li-n">${i + 1}</span><div class="cr-li-b">${tag}
      <textarea class="cr-in cr-grow" rows="1" id="cr-li-${path.replace(':', '-')}-${i}" placeholder="${ph}" oninput="crLiSet('${path}',${i},'text',this.value);crGrow(this)">${crEsc(it.text)}</textarea>
      ${def.extra ? `<textarea class="cr-in cr-grow cr-li-extra" rows="1" placeholder="Correction / consigne corrective" oninput="crLiSet('${path}',${i},'extra',this.value);crGrow(this)">${crEsc(it.extra || '')}</textarea>` : ''}</div>
      <div class="cr-li-a"><button type="button" ${i === 0 ? 'disabled' : ''} onclick="crLiMove('${path}',${i},-1)">↑</button><button type="button" ${i === arr.length - 1 ? 'disabled' : ''} onclick="crLiMove('${path}',${i},1)">↓</button><button type="button" style="color:#ff6b6b;" onclick="crLiDel('${path}',${i})">✕</button></div></div>`;
  }).join('');
  const sug = (def.sug || []).filter(s => !arr.some(it => crFold(it.text).trim() === crFold(s).trim()));
  return `<div class="cr-list ${def.cls || ''}"><div class="cr-list-t">${def.title}</div>${rows}
    <button type="button" class="cr-btn" onclick="crLiAdd('${path}')">＋ Ajouter</button>
    ${sug.length ? `<div class="cr-sug">${sug.map((s, si) => `<button type="button" class="cr-chip${(def.sugA || []).includes(s) ? ' auto' : ''}" data-s="${crEsc(s)}" onclick="crLiSug('${path}',this.dataset.s)">＋ ${crEsc(s)}</button>`).join('')}</div>` : ''}</div>`;
}
function crLiAdd(path) { const a = crListRef(path); a.push({ id: crUid(), text: '' }); crTouch(); crRenderExView(); const el = document.getElementById('cr-li-' + path.replace(':', '-') + '-' + (a.length - 1)); if (el) el.focus(); }
function crLiSug(path, text) { const a = crListRef(path); a.push({ id: crUid(), text }); crTouch(); crRenderExView(); }
function crLiSet(path, i, f, v) { const it = crListRef(path)[i]; if (!it) return; if (f === 'tag') { if (v) it.tag = v; else delete it.tag; } else it[f] = v; crTouch(); }
function crLiDel(path, i) { crListRef(path).splice(i, 1); crTouch(); crRenderExView(); }
function crLiMove(path, i, d) { const a = crListRef(path), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; crTouch(); crRenderExView(); }
// matériel (exercice ou GB) : owner = 'x' | 'g'
function crEqRef(o) { const x = crCurEx(); return o === 'g' ? x.gb.equipment : x.equipment; }
function crEquipHtml(o) {
  const arr = crEqRef(o), has = n => arr.some(e => crFold(e.name) === crFold(n));
  const chips = CR_MATERIEL.map(m => `<button type="button" class="cr-chip ${has(m) ? 'on' : ''}" onclick="crEqToggle('${o}','${m}')">${has(m) ? '✓' : '＋'} ${m}</button>`).join(' ');
  const rows = arr.map(e => `<div class="cr-eq-row"><span>${crEsc(e.name)}</span><input type="number" inputmode="numeric" min="0" placeholder="Qté" value="${e.qty != null ? e.qty : ''}" oninput="crEqQty('${o}','${e.id}',this.value)"><button type="button" class="cr-btn sm danger" onclick="crEqDel('${o}','${e.id}')">✕</button></div>`).join('');
  return `<div class="cr-eq"><div class="cr-chips">${chips}</div>${rows ? `<div class="cr-eq-list">${rows}</div>` : ''}
    <div style="display:flex;gap:6px;margin-top:8px;"><input class="cr-in" id="cr-eq-free-${o}" placeholder="Autre matériel…"><button type="button" class="cr-btn" onclick="crEqAdd('${o}')">Ajouter</button></div></div>`;
}
function crEqToggle(o, n) { const a = crEqRef(o), i = a.findIndex(e => crFold(e.name) === crFold(n)); if (i >= 0) a.splice(i, 1); else a.push({ id: crUid(), name: n }); crTouch(); crRenderExView(); }
function crEqQty(o, id, v) { const e = crEqRef(o).find(z => z.id === id); if (!e) return; if (v === '') delete e.qty; else e.qty = Math.max(0, parseInt(v, 10) || 0); crTouch(); }
function crEqDel(o, id) { const a = crEqRef(o), i = a.findIndex(e => e.id === id); if (i >= 0) a.splice(i, 1); crTouch(); crRenderExView(); }
function crEqAdd(o) { const inp = document.getElementById('cr-eq-free-' + o), v = crTxt(inp.value); if (!v) return; const a = crEqRef(o); if (!a.some(e => crFold(e.name) === crFold(v))) a.push({ id: crUid(), name: v }); crTouch(); crRenderExView(); }
// GB
function crGbAdd() { crCurEx().gb = { objective: '', instructions: [], success: [], equipment: [] }; crTouch(); crRenderExView(); }
function crGbRemove() {
  const x = crCurEx();
  if (crHasGb(x) && !confirm('Retirer le travail GB ? (objectif, consignes, critères, matériel et schéma GB seront effacés)')) return;
  delete x.gb; crTouch(); crRenderExView();
}
function crGbSet(k, v) { crCurEx().gb[k] = v; crTouch(); }
function crExHeadSet(k, v) {
  const x = crCurEx();
  if (k.startsWith('hc.')) x.headcount[k.slice(3)] = v; else if (k.startsWith('org.')) x.org[k.slice(4)] = v; else x[k] = (k === 'minutes') ? Math.max(0, parseInt(v, 10) || 0) : v;
  if (k === 'name') { const h = document.getElementById('cr-ex-head'); if (h) h.textContent = v || 'Exercice'; }
  crTouch();
}
function crExSet(k, v) { crExHeadSet(k, v); }
function crExMin(d) {
  const x = crCurEx(); x.minutes = Math.max(0, x.minutes + d);
  document.getElementById('cr-ex-min').value = x.minutes; crTouch();
}
function crExTab(k) { crEx.tab = k; crRenderExView(); }
// Volet « Descriptif de l'exercice » : même mécanisme que « Informations générales » de la séance ; replié à chaque ouverture d'un exercice (la place tactique est tout de suite visible)
let crExInfoOpen = false;
function crRenderExView() {
  const x = crCurEx(), p = crCur, b = p.blocks[crEx.bi];
  const flat = crExFlat(), idx = flat.findIndex(a => a[0] === crEx.bi && a[1] === crEx.ei), tot = flat.length;
  const ev = document.getElementById('cr-ex-view');
  const TABS = crTabs(), tabDef = TABS.find(t => t.k === crEx.tab) || TABS[0];
  tabDef.lists && tabDef.lists.forEach(l => { if (!Array.isArray(x.items[l.k])) x.items[l.k] = []; });
  const tabs = TABS.map(t => { const n = crTabCount(x, t); return `<button type="button" class="cr-chip ${tabDef.k === t.k ? 'on' : ''}" style="flex-shrink:0;" onclick="crExTab('${t.k}')">${t.label}${n ? `<span class="n">${n}</span>` : ''}</button>`; }).join('');
  let body = '';
  if (tabDef.org) body = CR_ORG_FIELDS.map(([k, l, ph]) => `<label class="cr-lbl">${l}</label><textarea class="cr-in cr-grow" rows="2" placeholder="${crEsc(ph)}" oninput="crExHeadSet('org.${k}',this.value);crGrow(this)">${crEsc(x.org[k])}</textarea>`).join('');
  else if (tabDef.equip) body = `<div class="cr-list-t">Matériel de l’exercice</div>${crEquipHtml('x')}`;
  else if (tabDef.evo) body = (tabDef.desc ? `<div class="cr-subd">${crEsc(tabDef.desc)}</div>` : '') + crEvoHtml(x);
  else if (tabDef.subOk && crSubs(tabDef.lists[0].k).length) body = crGroupHtml(tabDef);
  else if (tabDef.learn) { const sg = crSugs(tabDef.lists[0].k).filter(z => !x.items[tabDef.lists[0].k].some(it => crFold(it.text).trim() === crFold(z.t).trim())).slice(0, 30); body = (tabDef.desc ? `<div class="cr-subd">${crEsc(tabDef.desc)}</div>` : '') + crListHtml('i:' + tabDef.lists[0].k, { ...tabDef.lists[0], sug: sg.map(z => z.t), sugA: sg.filter(z => z.auto).map(z => z.t) }); }
  else body = `<div class="${tabDef.lists.length > 1 ? 'cr-two' : ''}">${tabDef.lists.map(l => crListHtml('i:' + l.k, l)).join('')}</div>`;
  const gbHtml = !x.gb
    ? `<button type="button" class="cr-gb-add" onclick="crGbAdd()"><span style="font-size:26px;">🧤</span><span><b>Ajouter un travail GB</b><small>Objectif, consignes et schéma spécifiques au gardien de but</small></span></button>`
    : `<div class="cr-card cr-gb"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="font-size:15px;font-weight:800;color:var(--blanc);">🧤 Travail GB</div><button type="button" class="cr-btn sm danger" onclick="crGbRemove()">Retirer</button></div>
      <label class="cr-lbl" style="margin-top:4px;">Objectif pour le gardien</label>
      <textarea class="cr-in cr-grow" rows="2" placeholder="Ex. Se replacer vite après une parade, lire l’épaule du tireur" oninput="crGbSet('objective',this.value);crGrow(this)">${crEsc(x.gb.objective)}</textarea>
      ${crListHtml('g:instructions', { title: 'Consignes GB', sug: CR_GB_SUG.instructions })}
      ${crListHtml('g:success', { title: 'Critères de réussite GB', sug: CR_GB_SUG.success })}
      <div class="cr-list-t">Matériel spécifique</div>${crEquipHtml('g')}
      <div class="cr-list-t" style="margin-top:14px;">Schéma GB${x.gb.schemaLib && x.gb.schemaLib.drawings.length > 1 ? ' · ' + x.gb.schemaLib.drawings.length + ' étapes' : ''}</div>${crSchemaCard(x.gb, 'gb')}</div>`;
  const nSteps = x.schemaLib && x.schemaLib.drawings ? x.schemaLib.drawings.length : 0;
  const kd = crKind(x), kindBar = `<div class="cr-kindbar"><span>Type</span>${Object.keys(CR_KINDS).map(k => `<button type="button" class="cr-chip ${kd === k ? 'on' : ''}" onclick="crExKind('${k}')">${CR_KINDS[k].icon} ${CR_KINDS[k].short}</button>`).join('')}</div>`;
  const typeCard = kd === 'jeu' ? crJeuHtml(x) : kd === 'renfo' ? crRfHtml(x) : '';
  ev.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      <button type="button" class="cr-btn" onclick="crCloseEx()">← Séance</button>
      <div style="flex:1;min-width:140px;"><div style="font-size:11px;color:var(--gris-texte);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${crEsc(p.title || 'Sans titre')} › ${crEsc(b.name || 'Bloc')}</div>
        <div id="cr-ex-head" style="font-size:17px;font-weight:800;color:var(--blanc);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${crEsc(x.name || 'Exercice')}</div></div>
      <div class="cr-nav"><button type="button" ${idx <= 0 ? 'disabled' : ''} onclick="crExNav(-1)" aria-label="Exercice précédent">‹</button><span>Exercice ${idx + 1} / ${tot}</span><button type="button" ${idx >= tot - 1 ? 'disabled' : ''} onclick="crExNav(1)" aria-label="Exercice suivant">›</button></div>
      <span class="cr-save-status" style="font-size:12px;color:#2ecc71;white-space:nowrap;">✓ Enregistré</span>
    </div>
    ${kindBar}
    <div class="cr-ex-grid"><div>
    ${typeCard}
    <div class="cr-card">
      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="crExInfoOpen=!crExInfoOpen;document.getElementById('cr-ex-info').style.display=crExInfoOpen?'':'none';this.querySelector('span').textContent=crExInfoOpen?'▲':'▼';">
        <div style="font-size:16px;font-weight:800;color:var(--blanc);">Descriptif de l’exercice</div><span style="color:var(--gris-texte);">${crExInfoOpen ? '▲' : '▼'}</span></div>
      <div id="cr-ex-info" style="${crExInfoOpen ? '' : 'display:none;'}">
      <label class="cr-lbl" style="margin-top:10px;">Nom de l’exercice</label>
      <input class="cr-in" id="cr-ex-name" value="${crEsc(x.name)}" oninput="crExHeadSet('name',this.value)">
      <label class="cr-lbl">Objectif</label>
      <textarea class="cr-in cr-grow" rows="2" placeholder="Ce que les joueurs doivent savoir faire à la fin de l’exercice" oninput="crExHeadSet('objective',this.value);crGrow(this)">${crEsc(x.objective)}</textarea>
      <div class="cr-2c"><div><label class="cr-lbl">Thème</label><input class="cr-in" placeholder="Attaque, défense, GB…" value="${crEsc(x.theme)}" oninput="crExHeadSet('theme',this.value)"></div>
        <div><label class="cr-lbl">Sous-thème</label><input class="cr-in" value="${crEsc(x.subTheme)}" oninput="crExHeadSet('subTheme',this.value)"></div></div>
      <label class="cr-lbl">Durée (minutes)</label>
      <div class="cr-step" style="justify-content:flex-start;"><button type="button" onclick="crExMin(-5)">−</button><input type="number" inputmode="numeric" id="cr-ex-min" value="${x.minutes}" oninput="crExHeadSet('minutes',this.value)"><button type="button" onclick="crExMin(5)">+</button><span style="font-size:12px;color:var(--gris-texte);margin-left:4px;">min</span></div>
      <label class="cr-lbl">Joueurs</label>
      <input class="cr-in" placeholder="14 · 12 à 16 · à partir de 10" value="${crEsc(x.headcount.players)}" oninput="crExHeadSet('hc.players',this.value)">
      <div class="cr-4c">
        <div><label class="cr-lbl">Gardiens</label><input type="number" inputmode="numeric" min="0" class="cr-in" value="${crEsc(x.headcount.goalkeepers)}" oninput="crExHeadSet('hc.goalkeepers',this.value)"></div>
        <div><label class="cr-lbl">Groupes</label><input type="number" inputmode="numeric" min="0" class="cr-in" value="${crEsc(x.headcount.groups)}" oninput="crExHeadSet('hc.groups',this.value)"></div>
        <div><label class="cr-lbl">Par groupe</label><input type="number" inputmode="numeric" min="0" class="cr-in" value="${crEsc(x.headcount.perGroup)}" oninput="crExHeadSet('hc.perGroup',this.value)"></div>
        <div><label class="cr-lbl">Ballons</label><input type="number" inputmode="numeric" min="0" class="cr-in" value="${crEsc(x.balls)}" oninput="crExHeadSet('balls',this.value)"></div></div>
      <label class="cr-lbl">Espace</label>
      <input class="cr-in" placeholder="½ terrain, 20 x 20 m…" value="${crEsc(x.space)}" oninput="crExHeadSet('space',this.value)">
      </div>
    </div>
    ${kd === 'schema' ? `<div class="cr-card">
      <div style="font-size:15px;font-weight:800;color:var(--blanc);margin-bottom:8px;">Place tactique${nSteps > 1 ? ' · ' + nSteps + ' étapes' : ''}</div>
      ${crSchemaCard(x, 'main')}
    </div>` : ''}
    ${kd === 'renfo' ? '' : gbHtml}
    </div><div>
    <div class="cr-card">
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;-webkit-overflow-scrolling:touch;">${tabs}</div>
      ${body}
    </div>
    <div class="cr-card">
      <div style="font-size:15px;font-weight:800;color:var(--blanc);margin-bottom:4px;">Vidéos de l’exercice</div>
      <div style="font-size:12px;color:var(--gris-texte);margin-bottom:8px;">Ajoute un lien vers une démonstration filmée.</div>
      ${x.videos.map((v, i) => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;"><a href="${crEsc(v.url)}" target="_blank" rel="noopener" style="flex:1;min-width:0;color:var(--jaune);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">▶ ${crEsc(v.title || v.url)}</a><button type="button" class="cr-btn sm danger" onclick="crExDelVideo(${i})">✕</button></div>`).join('')}
      <input class="cr-in" id="cr-exvid-title" placeholder="Titre de la vidéo" style="margin-bottom:6px;">
      <div style="display:flex;gap:6px;"><input class="cr-in" id="cr-exvid-url" placeholder="https://…" inputmode="url"><button type="button" class="cr-btn" onclick="crExAddVideo()">Associer</button></div>
    </div>
    </div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0 8px;"><button type="button" class="cr-btn" onclick="crCloseEx()">← Retour à la séance</button><span style="color:var(--gris-texte);">${x.minutes ? x.minutes + ' min' : ''}</span></div>
    <button type="button" class="cr-btn primary" style="padding:13px 16px;" onclick="crOpenFiche(crCur.id,crCurEx().id)">Voir dans la fiche →</button>`;
  crGrowAll();
}
function crExAddVideo() {
  const t = document.getElementById('cr-exvid-title'), u = document.getElementById('cr-exvid-url');
  let url = (u.value || '').trim(); if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  crCurEx().videos.push({ title: (t.value || '').trim(), url }); crTouch(); crRenderExView();
}
function crExDelVideo(i) { crCurEx().videos.splice(i, 1); crTouch(); crRenderExView(); }
function crFicheList(title, arr, o) {
  o = o || {};
  const it = (arr || []).filter(i => crTxt(i.text) || crTxt(i.extra));
  if (!it.length) return '';
  const li = it.map((i, k) => {
    let tag = i.tag || (o.auto ? (k === 0 ? 'Principale' : 'Secondaire') : '');
    const txt = crEsc(i.text).replace(/\n/g, '<br>');
    const ex = crTxt(i.extra) ? `<span class="cr-fx-extra">→ ${crEsc(i.extra).replace(/\n/g, '<br>')}</span>` : '';
    return `<li>${tag ? `<span class="cr-fx-tag">${crEsc(tag)}</span>` : ''}${txt}${ex}</li>`;
  }).join('');
  return `<div class="cr-fx-list ${o.cls || ''}"><h4>${title}</h4><${o.num ? 'ol' : 'ul'}>${li}</${o.num ? 'ol' : 'ul'}></div>`;
}
function crFicheEx(x, num, bname, bi, ei, live) {
  const fact = (l, v, cls) => crTxt(v) ? `<div class="${cls || ''}"><dt>${l}</dt><dd>${crEsc(v).replace(/\n/g, '<br>')}</dd></div>` : '';
  const eq = crEquipText(crNormEquip(x.equipment).concat(parseInt(x.balls, 10) > 0 ? [{ name: 'Ballons', qty: parseInt(x.balls, 10) }] : []));
  const theme = [crTxt(x.theme), crTxt(x.subTheme)].filter(Boolean).join(' · ');
  const kd = crKind(x), jeu = kd === 'jeu' ? crNormJeu(x.jeu) : null;
  const jf = jeu ? fact('But du jeu', jeu.goal, 'main') + fact('Équipes', jeu.teams) + fact('Points', jeu.points) : '';
  const facts = fact('Objectif', x.objective, 'main') + jf + fact('Thème', theme) + fact('Effectif', crHeadcountText(x)) + fact('Espace', x.space) + fact('Matériel', eq)
    + fact('Disposition', x.org.setup) + fact('Groupes', x.org.groups) + fact('Rotations', x.org.rotations) + fact('Rôles', x.org.roles);
  const I = x.items;
  const row = (a, b) => (a || b) ? `<div class="cr-fx-row${a && b ? ' two' : ''}">${a}${b}</div>` : '';
  const on = crSecOn, nm = (k, d) => (crSecDefs().find(t => t.k === k) || {}).label || d;
  const grp = k => crFicheList(nm(k, k), (I[k] || []).map((it, i) => ({ it, i, g: crSubs(k).findIndex(z => z.id === crSubOf(k, it)) })).sort((a, b) => (a.g < 0 ? 99 : a.g) - (b.g < 0 ? 99 : b.g) || a.i - b.i).map(o => ({ ...o.it, tag: crSubName(k, o.it) })));
  const evo = (on('evolutions') && (x.evolutions || []).some(e => crTxt(e.title) || crTxt(e.text))) ? `<div class="cr-fx-list"><h4>Évolutions</h4><ul>${x.evolutions.filter(e => crTxt(e.title) || crTxt(e.text)).map((e, i) => `<li><span class="cr-fx-tag">Évolution N°${i + 1}</span>${crTxt(e.title) ? '<b>' + crEsc(e.title) + '</b>' : ''}${crTxt(e.title) && crTxt(e.text) ? ' — ' : ''}${crEsc(e.text).replace(/\n/g, '<br>')}</li>`).join('')}</ul></div>` : '';
  const customs = crCfgGet().custom.filter(c => on(c.k)).map(c => row(grp(c.k), '')).join('');
  const lists = (jeu ? row(crFicheList('Règles du jeu', I.regles, { num: true }), '') : '') + (on('besoins') ? row(grp('besoins'), '') : '') + (on('fonctionnement') ? row(grp('fonctionnement'), '') : '')
    + (on('comportements') ? row(grp('comportements'), '') : '') + (on('reussite') ? row(grp('reussite'), '') : '') + row(evo, '') + customs
    + (on('consignes') ? row(crFicheList('Consignes', I.consignes, { auto: true }), '') : '')
    + (on('realisation') ? row(crFicheList('Critères de réalisation', I.realisation), '') : '')
    + (on('variables') ? row(crFicheList('Simplifier ↓', I.simplify, { cls: 'simplify' }), crFicheList('Complexifier ↑', I.complexify, { cls: 'complexify' })) : '')
    + (on('vigilance') ? row(crFicheList('Points de vigilance', I.vigilance), '') : '')
    + (on('corrections') ? row(crFicheList('Corrections / régulations', I.corrections, { num: true }), '') : '')
    + (on('progression') ? row(crFicheList('Progression', I.progression), crFicheList('Régression', I.regression)) : '');
  const animBtn = (key, name, L) => { if (!crSchAnimOk(L)) return ''; crFicheAnimMap[key] = { name, drawings: L.drawings }; return `<button type="button" class="cr-fx-anim no-print" onclick="crFicheAnim('${key}')">▶ Animer l'enchaînement</button>`; };
  let gb = '';
  if (kd !== 'renfo' && crHasGb(x)) {
    const g = x.gb, geq = crEquipText(g.equipment);
    gb = `<div class="cr-fx-gb"><h4>🧤 Travail GB</h4>${crTxt(g.objective) ? `<div class="cr-fx-gbo">${crEsc(g.objective).replace(/\n/g, '<br>')}</div>` : ''}`
      + `<div class="cr-fiche-body">${g.schemaLib ? `<div>${animBtn(x.id + '-gb', (x.name || 'Exercice') + ' · GB', g.schemaLib)}${crFicheSchemaLib(g.schemaLib)}</div>` : ''}<div>${row(crFicheList('Consignes GB', g.instructions), '')}${row(crFicheList('Critères de réussite GB', g.success), '')}${geq ? `<div class="cr-fx-gbe">Matériel GB : ${crEsc(geq)}</div>` : ''}</div></div></div>`;
  }
  const vids = x.videos.map(v => `<div style="margin-top:4px;word-break:break-all;">▶ ${crEsc(v.title || '')} <a href="${crEsc(v.url)}">${crEsc(v.url)}</a></div>`).join('');
  const L = kd === 'renfo' ? null : x.schemaLib, multi = !!(L && L.drawings.length > 1);
  const figs = kd === 'renfo' ? '' : (L ? animBtn(x.id, x.name || 'Exercice', L) + crFicheSchemaLib(L) : crFicheSchema(x.schema));
  const factsBox = facts ? `<dl class="cr-fx-facts${multi ? ' wide' : ''}">${facts}</dl>` : '';
  const top = multi ? `<div>${figs}</div>${factsBox ? `<div style="margin-top:10px;">${factsBox}</div>` : ''}`
    : (figs ? `<div class="cr-fiche-body"><div>${figs}</div><div>${factsBox}</div></div>` : factsBox);
  return `<article class="cr-fx" id="crfx-${x.id}"><div class="cr-fx-head"><span class="cr-fx-n">${num}</span><div><small>${crEsc(bname || '')}</small><b>${crEsc(x.name || 'Exercice')}</b></div><span class="cr-fx-d">${x.minutes ? crFmtDur(x.minutes) : ''}</span>${live ? `<button type="button" class="cr-fx-edit no-print" onclick="crFicheEdit(${bi},${ei})" aria-label="Modifier l'exercice">✎</button>` : ''}</div>
    ${top}${kd === 'renfo' ? crFicheRenfo(x) : ''}<div class="cr-fx-lists">${lists}</div>${gb}${vids}</article>`;
}
