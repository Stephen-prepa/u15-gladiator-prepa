// Prépa U15 HBCCS — js/15-editeur-schemas-base.js — dernière modification : version z23 (05/11/2026)
// ===================== ÉDITEUR =====================
// Superposition plein écran (ajoutée à <html>, comme le lecteur). Les exercices créés ici sont gardés sur l'appareil (localStorage) en attendant la sauvegarde Supabase (étape 4).
const SCH_GROUPS = [
  { id: 'tools', name: 'Outils', tools: [['select', 'Sélection'], ['multi', 'Sélection multiple'], ['pan', 'Déplacer la vue']] },
  { id: 'players', name: 'Joueurs', tools: [['PLAYER', 'Attaquant'], ['DEFENDER', 'Défenseur'], ['GOALKEEPER', 'Gardien']] },
  { id: 'actions', name: 'Actions', tools: [['MOVE', 'Déplacement'], ['PASS', 'Passe'], ['RUN', 'Dribble'], ['SHOT', 'Tir'], ['SCREEN', 'Écran']] },
  { id: 'objects', name: 'Objets', tools: [['BALL', 'Ballon'], ['CONE', 'Plot'], ['DISC', 'Disque'], ['POLE', 'Jalon'], ['HOOP', 'Cerceau'], ['HURDLE', 'Haie'], ['LADDER', 'Échelle de rythme'], ['POPUP_GOAL', 'Mini-but'], ['BALLOON', 'Baudruche'], ['BALL_BOX', 'Bac ballons'], ['DUMMY', 'Mannequin'], ['MAT', 'Tapis'], ['BENCH', 'Banc'], ['BOX', 'Caisson'], ['RECT', 'Rectangle']] },
  { id: 'zones', name: 'Zones, texte, crayon', tools: [['ZONE_RECT', 'Zone'], ['ZONE_CIRCLE', 'Zone ronde'], ['TEXT', 'Texte'], ['PEN', 'Crayon'], ['ERASER', 'Gomme']] },
];
const SCH_NAMES = { PEN: 'Trait libre', PLAYER: 'Attaquant', DEFENDER: 'Défenseur', GOALKEEPER: 'Gardien', PARENT: 'Parent', COACH: 'Coach', BALL: 'Ballon', CONE: 'Plot', DISC: 'Disque', POLE: 'Jalon', HOOP: 'Cerceau', HURDLE: 'Haie', LADDER: 'Échelle de rythme', POPUP_GOAL: 'Mini-but', BALLOON: 'Baudruche', BALL_BOX: 'Bac ballons', DUMMY: 'Mannequin', MAT: 'Tapis', BENCH: 'Banc', BOX: 'Caisson', RECT: 'Rectangle', MOVE: 'Déplacement', RUN: 'Dribble', PASS: 'Passe', SHOT: 'Tir', SCREEN: 'Écran', ZONE_RECT: 'Zone', ZONE_CIRCLE: 'Zone ronde', TEXT: 'Texte' };
const SCH_PRESETS = {
  d06: { type: 'DEFENDER', name: 'Défense 0-6', pts: [[1.6, 2.4], [4.4, 5.6], [8.2, 6.9], [11.8, 6.9], [15.6, 5.6], [18.4, 2.4]] },
  d15: { type: 'DEFENDER', name: 'Défense 1-5', pts: [[1.6, 2.4], [5, 6.2], [10, 6.9], [15, 6.2], [18.4, 2.4], [10, 9.8]] },
  att: { type: 'PLAYER', name: 'Attaque placée', pts: [[1.2, 3.2], [4.2, 10.8], [10, 12], [15.8, 10.8], [18.8, 3.2], [10, 7.6]] },
  gk: { type: 'GOALKEEPER', name: 'Gardien', pts: [[10, 0.9]] },
};
const SCH_LS = 'sch_ex_v2', SCH_LS_OLD = 'sch_user_ex_v1';
// Classement des schémas : type + thème par poste (servent aux filtres de la bibliothèque). Stockés avec le schéma (aucun changement de la base : ils voyagent dans le champ « drawings », sur la 1re étape, clé « meta »).
const SCH_KINDS = { attaque: 'Attaque', defense: 'Défense', grand: 'Jeu sur grand espace' }, SCH_KINDS_S = { attaque: 'Att.', defense: 'Déf.', grand: 'Grand esp.' };
const SCH_THEMES = { c12: 'Charnière 1-2', c23: 'Charnière 2-3', c33: 'Charnière 3-3 (autour du pivot)', autre: 'Autre / tous postes' }, SCH_THEMES_S = { c12: 'Ch. 1-2', c23: 'Ch. 2-3', c33: 'Ch. 3-3', autre: 'Autre' };
// Thèmes créés par les coachs : clé « x:nom-du-theme ». Le libellé est gardé sur l'appareil ET voyage avec chaque schéma classé dans ce thème (clé « themeLabel » à côté de « theme »), donc les autres coachs le retrouvent sans changement de base.
const SCH_CUSTOM = {}, SCH_THEMES_LS = 'sch_themes_v1';
function schThemeShort(l) { l = String(l); return l.length > 11 ? l.slice(0, 10).trim() + '…' : l; }
function schThemeKey(label) { return 'x:' + String(label).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
function schThemesSave() { try { localStorage.setItem(SCH_THEMES_LS, JSON.stringify(SCH_CUSTOM)); } catch (e) {} }
function schThemeReg(key, label, save) {
  label = String(label || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!label || typeof key !== 'string' || key.indexOf('x:') !== 0 || key.length < 3 || SCH_THEMES[key]) return false;
  SCH_THEMES[key] = label; SCH_THEMES_S[key] = schThemeShort(label); SCH_CUSTOM[key] = label; if (save) schThemesSave(); return true;
}
try { const o = JSON.parse(localStorage.getItem(SCH_THEMES_LS) || '{}'); Object.keys(o || {}).forEach(k => schThemeReg(k, o[k], false)); } catch (e) {}
function schMetaOf(arr) { const d = (Array.isArray(arr) ? arr : []).find(z => z && z.meta && typeof z.meta === 'object'); return d ? d.meta : {}; }
function schDrawingsOut(x) { const out = JSON.parse(JSON.stringify(x.drawings)); if (out[0] && (x.kind || x.theme)) { out[0].meta = { kind: x.kind || '', theme: x.theme || '' }; if (SCH_CUSTOM[x.theme]) out[0].meta.themeLabel = SCH_CUSTOM[x.theme]; } return out; }
function schMetaFrom(rec, arr) { const m = schMetaOf(arr); schThemeReg(m.theme, m.themeLabel, true); rec.kind = SCH_KINDS[m.kind] ? m.kind : ''; rec.theme = SCH_THEMES[m.theme] ? m.theme : ''; }
function schUuid() { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
// Exercices de la bibliothèque : { id (uuid), name, user:true, drawings, updatedAt, serverUpdatedAt, dirty (à envoyer), deleted (suppression à envoyer), rev }
function schRec(x) { const m = schMetaOf(x.drawings), k = x.kind || m.kind, t = x.theme || m.theme; schThemeReg(t, x.themeLabel || m.themeLabel, true); return { kind: SCH_KINDS[k] ? k : '', theme: SCH_THEMES[t] ? t : '', id: x.id, name: String(x.name || 'Sans nom').slice(0, 120), user: true, drawings: schNormDrawings(x.drawings), updatedAt: x.updatedAt || null, serverUpdatedAt: x.serverUpdatedAt || null, dirty: !!x.dirty, deleted: !!x.deleted, rev: x.rev || 0 }; }
function schUserLoad() {
  try {
    const raw = localStorage.getItem(SCH_LS);
    if (raw) { const a = JSON.parse(raw); return (Array.isArray(a) ? a : []).filter(x => x && x.id).map(schRec); }
    const old = JSON.parse(localStorage.getItem(SCH_LS_OLD) || '[]'); // anciens exercices de l'étape 3 : à envoyer au serveur
    return (Array.isArray(old) ? old : []).map(x => schRec({ id: schUuid(), name: x.name, drawings: x.drawings, updatedAt: x.updatedAt, dirty: true }));
  } catch (e) { return []; }
}
let schSaveTimer = 0, schSyncTimer = 0, schBuiltin = null, schUserEx = [];
function schUserSave() {
  try { localStorage.setItem(SCH_LS, JSON.stringify(schUserEx.map(x => ({ id: x.id, name: x.name, kind: x.kind, theme: x.theme, themeLabel: SCH_CUSTOM[x.theme] || '', drawings: x.drawings, updatedAt: x.updatedAt, serverUpdatedAt: x.serverUpdatedAt, dirty: x.dirty, deleted: x.deleted, rev: x.rev })))); return true; } catch (e) { return false; }
}
function schRebuild() { schDemo = (schBuiltin || []).concat(schUserEx.filter(x => !x.deleted)); }
function schEnsure() { if (!schBuiltin) { schBuiltin = schDemoData(); schUserEx = schUserLoad(); schRebuild(); schUserSave(); } }
function schMarkDirty(ex) { ex.dirty = true; ex.rev = (ex.rev || 0) + 1; }

// ----- Synchronisation avec Supabase (table exercices_schemas) : local d'abord, envoi dès que possible -----
// Règles : on envoie ce qui a changé ; si un autre coach a modifié le même exercice entre-temps, on ne perd rien : ta version est gardée comme copie « (ma version) ».
const schSync = { state: 'idle', busy: false, at: 0 };
function schPending() { return schUserEx.filter(x => x.dirty || x.deleted).length; }
function schSyncLabel(short) {
  const n = schPending(), st = schSync.state;
  if (short) return st === 'syncing' ? 'Synchro…' : n ? 'Enregistré · ' + (st === 'offline' ? '📴 en attente' : st === 'error' ? '⚠ à renvoyer' : st === 'noauth' ? 'non connecté' : 'envoi…') : 'Enregistré · ☁ synchronisé';
  if (st === 'syncing') return '⟳ Synchronisation…';
  if (st === 'offline') return n ? `📴 Hors ligne — ${n} exercice${n > 1 ? 's' : ''} en attente d'envoi (rien n'est perdu)` : '📴 Hors ligne — tout est déjà synchronisé';
  if (st === 'noauth') return 'Non connecté au serveur : exercices gardés sur cet appareil';
  if (st === 'error') return `⚠ Synchronisation impossible pour l'instant — ${n} en attente (nouvel essai automatique)`;
  return n ? `${n} en attente d'envoi` : '☁ Synchronisé avec les autres coachs';
}
function schSyncUi() {
  const a = document.getElementById('sch-sync'); if (a) a.textContent = schSyncLabel(false);
  const b = document.getElementById('sche-saved'); if (b) b.textContent = schSyncLabel(true);
}
function schSyncSoon(ms) { clearTimeout(schSyncTimer); schSyncTimer = setTimeout(schSyncAll, ms == null ? 2500 : ms); }
async function schSyncAll(quiet) {
  schEnsure();
  const sigOf = () => schUserEx.map(x => x.id + '~' + x.serverUpdatedAt + '~' + (x.dirty ? 1 : 0) + '~' + x.name).join('|'), sig0 = sigOf();
  if (schSync.busy) { schSyncSoon(3000); return; }
  if (!navigator.onLine) { schSync.state = 'offline'; schSyncUi(); return; }
  if (!coachSession) { schSync.state = 'noauth'; schSyncUi(); return; }
  schSync.busy = true; schSync.state = 'syncing'; schSyncUi();
  try {
    const sess = (await ensureCoachSession()) || coachSession; if (!sess || !sess.access_token) { schSync.state = 'noauth'; return; }
    const H = coachAuthHeaders(), base = SB_URL + '/rest/v1/exercices_schemas';
    const r = await fetch(base + '?select=id,updated_at,deleted_at&limit=2000', { headers: H });
    if (!r.ok) throw new Error('liste ' + r.status);
    const remote = {}; (await r.json()).forEach(x => { remote[x.id] = x; });
    const up = [], adopt = {}, newFromRemote = [];
    schUserEx.slice().forEach(rec => {
      const rm = remote[rec.id], open = !!(schEd && schEd.ex === rec);
      if (!rm) { if (rec.deleted && !rec.serverUpdatedAt) { schUserEx.splice(schUserEx.indexOf(rec), 1); return; } up.push(rec); return; }
      const changed = rm.updated_at !== rec.serverUpdatedAt;
      if (rec.dirty || rec.deleted) {
        if (!changed || rec.deleted) up.push(rec);
        else { // double modification : on garde les deux
          const c = schRec({ id: schUuid(), name: (rec.name + ' (ma version)').slice(0, 120), drawings: JSON.parse(JSON.stringify(rec.drawings)), kind: rec.kind, theme: rec.theme, updatedAt: rec.updatedAt, dirty: true });
          schUserEx.push(c); up.push(c); rec.dirty = false; if (!rm.deleted_at) adopt[rec.id] = true; else schUserEx.splice(schUserEx.indexOf(rec), 1);
        }
      } else if (changed) { if (rm.deleted_at) schUserEx.splice(schUserEx.indexOf(rec), 1); else if (!open) adopt[rec.id] = true; }
    });
    Object.keys(remote).forEach(id => { if (!remote[id].deleted_at && !schUserEx.some(x => x.id === id)) newFromRemote.push(id); });
    // envoi
    if (up.length) {
      const sent = up.map(x => ({ id: x.id, rev: x.rev, row: { id: x.id, name: x.name, drawings: schDrawingsOut(x), deleted_at: x.deleted ? new Date().toISOString() : null } }));
      const res = await fetch(base + '?on_conflict=id', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(sent.map(s => s.row)) });
      if (!res.ok) throw new Error('envoi ' + res.status);
      const rows = await res.json();
      rows.forEach(row => {
        const s = sent.find(x => x.id === row.id), rec = schUserEx.find(x => x.id === row.id); if (!rec || !s) return;
        rec.serverUpdatedAt = row.updated_at;
        if (rec.deleted) schUserEx.splice(schUserEx.indexOf(rec), 1); else if (rec.rev === s.rev) rec.dirty = false;
      });
    }
    // récupération de ce qui a changé ailleurs
    const ids = Object.keys(adopt).concat(newFromRemote);
    for (let k = 0; k < ids.length; k += 20) {
      const part = ids.slice(k, k + 20), rr = await fetch(base + '?select=id,name,drawings,updated_at&id=in.(' + part.join(',') + ')', { headers: H });
      if (!rr.ok) throw new Error('lecture ' + rr.status);
      (await rr.json()).forEach(row => {
        let rec = schUserEx.find(x => x.id === row.id);
        if (rec && (rec.dirty || (schEd && schEd.ex === rec))) return; // modifié entre-temps ici : on ne l'écrase pas
        if (!rec) { rec = schRec({ id: row.id }); schUserEx.push(rec); }
        rec.name = String(row.name || 'Sans nom').slice(0, 120); schMetaFrom(rec, row.drawings); rec.drawings = schNormDrawings(row.drawings); rec.serverUpdatedAt = row.updated_at; rec.updatedAt = row.updated_at; rec.dirty = false;
      });
    }
    schSync.state = 'ok'; schSync.at = Date.now();
  } catch (e) { schSync.state = navigator.onLine ? 'error' : 'offline'; }
  finally {
    schSync.busy = false;
    if (quiet === true && schSync.state === 'ok' && sig0 === sigOf()) { schSyncUi(); return; } // rien n'a changé : on ne redessine pas l'écran
    schUserSave();
    const cur = schDemo && schDemo[schUi.ex] ? schDemo[schUi.ex].id : null; schRebuild();
    const ix = cur ? schDemo.findIndex(x => x.id === cur) : -1; schUi.ex = ix >= 0 ? ix : 0; if (schUi.step >= schDemo[schUi.ex].drawings.length) schUi.step = 0;
    if (!schEd && !schPl) { try { schRenderDemo(); } catch (e) {} }
    schSyncUi(); try { crSchPickRefresh(); } catch (e) {} if (schSync.state === 'error' && schPending()) schSyncSoon(30000);
  }
}
window.addEventListener('online', () => { try { if (coachSession) schSyncAll(); } catch (e) {} });
window.addEventListener('offline', () => { schSync.state = 'offline'; schSyncUi(); });
function schPlayerName(e) { return e ? (SCH_NAMES[e.type] || '') + (e.label ? ' ' + e.label : '') : ''; }
function schNextLabel(els, type) {
  if (type !== 'PLAYER' && type !== 'DEFENDER') return '';
  const used = new Set(els.filter(e => e.type === type).map(e => e.label)); let n = 1; while (used.has(String(n))) n++; return String(n);
}
// Numéro d'étape proposé pour une nouvelle action : une action de ballon prend le numéro suivant de la chaîne, un déplacement reprend celui de la dernière action créée
function schAutoStep(els, type, p0, plan) {
  const acts = els.filter(schIsAction), isBall = t => t === 'PASS' || t === 'SHOT' || t === 'RUN', moveLike = t => t === 'MOVE' || t === 'RUN' || t === 'SCREEN';
  // chaînes de ballon : la nouvelle action prolonge celle du ballon que tient le joueur au départ du tracé (plusieurs ballons) ; sinon dernier numéro de ballon + 1
  const ballStep = () => {
    if (plan && p0 && plan.balls && plan.balls.length > 1) {
      const b = plan.balls.find(z => { if (!z.fin.poss) return false; const pe = plan.byId[z.fin.poss]; return pe && schPlayerRefs(pe, plan).some(r => Math.hypot(r.x - p0.x, r.y - p0.y) < 1.8); });
      if (b) return Math.max(0, ...acts.filter(a => plan.ballOf[a.id] === b.id).map(a => a.step)) + 1;
    }
    return Math.max(0, ...acts.filter(a => isBall(a.type)).map(a => a.step)) + 1;
  };
  // joueur concerné (le plus proche du départ du tracé, départ ou fin de ses déplacements) et numéro de son dernier déplacement
  let own = null, refIdx = -1;
  if (plan && p0) { let bd = 1.8; plan.els.forEach(e => { if (!schIsPlayer(e)) return; schPlayerRefs(e, plan).forEach((r, k) => { const dd = Math.hypot(r.x - p0.x, r.y - p0.y); if (dd < bd) { bd = dd; own = e; refIdx = k; } }); }); }
  const lastMove = own ? Math.max(0, ...acts.filter(a => moveLike(a.type) && plan.own[a.id] && plan.own[a.id].id === own.id).map(a => a.step)) : 0;
  if (!isBall(type)) { const base = acts.length ? acts[acts.length - 1].step : 1; return lastMove ? Math.max(base, lastMove + 1) : base; } // un joueur qui enchaîne ses déplacements : l'un après l'autre, dans l'ordre de création
  const base = ballStep();
  if (type === 'RUN') return lastMove ? Math.max(base, lastMove + 1) : base;
  return lastMove && refIdx > 0 ? Math.max(base, lastMove + 1) : base; // passe / tir tracés depuis la position atteinte après un déplacement : ils partent après ce déplacement
}
// Positions de référence d'un joueur : départ + fin de chacun de ses déplacements (là où il sera quand il reçoit / passe)
function schPlayerRefs(e, plan) { const r = [{ x: e.x, y: e.y }]; ((plan && plan.pre[e.id]) || []).forEach(s => { const q = s.pts[s.pts.length - 1]; r.push({ x: q.x, y: q.y }); }); return r; }
function schReceiverOf(a, plan) {
  const endPt = a.points[a.points.length - 1];
  if (a.toElementId && plan.byId[a.toElementId] && schIsPlayer(plan.byId[a.toElementId])) return plan.byId[a.toElementId];
  const o = plan.own[a.id]; let best = null, bd = 2.0;
  plan.els.forEach(e => { if (!schIsPlayer(e) || (o && e.id === o.id)) return; schPlayerRefs(e, plan).forEach(p => { const dd = Math.hypot(p.x - endPt.x, p.y - endPt.y); if (dd < bd) { bd = dd; best = e; } }); });
  return best;
}
// Remet les numéros d'étape dans l'ordre logique de la chaîne de possession. Renvoie true si quelque chose a changé.
function schReorder(d) {
  const els = d.elements, balls = els.filter(e => e.type === 'BALL').slice(0, SCH_MAX_BALLS); if (!balls.length) return false;
  const plan = schPlan(d), isBall = a => a.type === 'PASS' || a.type === 'SHOT' || a.type === 'RUN', acts = els.filter(schIsAction);
  const ownerOf = a => { if (a.fromElementId && plan.byId[a.fromElementId]) return plan.byId[a.fromElementId]; let best = null, bd = 1.8; plan.els.forEach(e => { if (!schIsPlayer(e)) return; schPlayerRefs(e, plan).forEach(p => { const dd = Math.hypot(p.x - a.points[0].x, p.y - a.points[0].y); if (dd < bd) { bd = dd; best = e; } }); }); return best; };
  // chaque ballon a sa propre chaîne de possession (deux ballons échangés en même temps partent chacun du numéro 1)
  const poss = {}, cnt = {}; balls.forEach(b => { const h = schBallHolder(b, els); poss[b.id] = h ? h.id : null; cnt[b.id] = 0; });
  const pending = acts.filter(isBall).sort((p, q) => p.step - q.step || els.indexOf(p) - els.indexOf(q)), newStep = {};
  const mine = (a, b) => (!a.ballId || a.ballId === b.id) && poss[b.id] && ownerOf(a) && ownerOf(a).id === poss[b.id];
  for (let progress = true; pending.length && progress;) {
    progress = false;
    for (const b of balls) {
      let i = pending.findIndex(a => a.type === 'RUN' && mine(a, b)); // un dribble précède la passe / le tir du même joueur
      if (i < 0) i = pending.findIndex(a => mine(a, b));
      if (i < 0) continue;
      const a = pending.splice(i, 1)[0]; newStep[a.id] = ++cnt[b.id]; progress = true;
      if (a.type === 'SHOT') poss[b.id] = null; else if (a.type === 'PASS') { const r = schReceiverOf(a, plan); poss[b.id] = r ? r.id : null; }
      break; // un ballon à la fois, dans l'ordre : le plus ancien sans retard d'abord
    }
  }
  let n = Math.max(0, ...balls.map(b => cnt[b.id]));
  pending.forEach(a => { newStep[a.id] = ++n; });
  const before = acts.map(a => a.step).join();
  // déplacements / écrans : restent simultanés avec l'action de ballon qui avait le même numéro
  const oldSteps = [...new Set(acts.filter(isBall).map(a => a.step))].sort((a, b) => a - b), mapOld = {};
  oldSteps.forEach(s => { mapOld[s] = Math.min(...acts.filter(a => isBall(a) && a.step === s).map(a => newStep[a.id])); });
  acts.forEach(a => {
    if (isBall(a)) { a.step = newStep[a.id]; return; }
    const earlier = oldSteps.filter(s => s <= a.step); a.step = earlier.length ? mapOld[earlier[earlier.length - 1]] : 1;
  });
  // renumérotation continue (1, 2, 3…)
  const used = [...new Set(acts.map(a => a.step))].sort((a, b) => a - b); acts.forEach(a => { a.step = used.indexOf(a.step) + 1; });
  return acts.map(a => a.step).join() !== before;
}
// Étape suivante : joueurs à la fin de leur déplacement, ballon à sa position finale (les actions ne sont pas reprises)
function schNextFrom(d0) {
  const d = schNormDrawing(d0), plan = schPlan(d), st = schPlanState(plan, plan.D), out = [];
  d.elements.forEach(e => {
    if (schIsAction(e)) return;
    const c = JSON.parse(JSON.stringify(e));
    if (schIsPlayer(e)) { c.x = schR(st.pos[e.id].x, 2); c.y = schR(st.pos[e.id].y, 2); }
    out.push(c);
  });
  out.filter(e => e.type === 'BALL').forEach((b, i) => {
    const pb = plan.balls.find(z => z.id === b.id); if (!pb) return;
    const f = pb.fin, o = schBallOff(i);
    if (f.poss && plan.byId[f.poss]) { const p = st.pos[f.poss]; b.holderId = f.poss; b.x = schR(p.x + o.x, 2); b.y = schR(p.y + o.y, 2); }
    else if (f.ground) { b.holderId = '-'; b.x = schR(f.ground.x, 2); b.y = schR(f.ground.y, 2); }
  });
  return { id: schUid(), title: 'Étape', view: d.view, elements: out, updatedAt: null, validatedAt: null, ballPlay: d.ballPlay };
}

// ----- Icônes d'outils -----
function schToolIcon(type) {
  const k = { BALL: 2.3, CONE: 2.1, DISC: 2.3, POLE: 2.6, BALLOON: 2.1, HOOP: 1.5, POPUP_GOAL: 1.3, HURDLE: 1.3, BALL_BOX: 1.3, LADDER: 1.1 }[type] || 1;
  let inner;
  if (SCH_ACTIONS.includes(type)) inner = schActionSvg({ type, points: [{ x: -0.95, y: 0.65 }, { x: 0.95, y: -0.65 }], step: 1, scale: 1.3 }, false);
  else if (type === 'ZONE_RECT' || type === 'ZONE_CIRCLE') inner = schElementSvg({ type, x: 0, y: 0, w: 2.2, h: 1.6, scale: 1 });
  else if (type === 'TEXT') inner = schElementSvg({ type, x: 0, y: 0, label: 'Abc', scale: 1.2 });
  else if (type === 'LADDER') inner = schElementSvg({ type, x: 0, y: 0, n: 4, rotation: -35, scale: 1.15 });
  else if (type === 'PEN') inner = schPenSvg([{ x: -0.95, y: 0.5 }, { x: -0.5, y: -0.55 }, { x: 0, y: 0.45 }, { x: 0.5, y: -0.5 }, { x: 0.95, y: 0.35 }], '#14213D', 0.2);
  else if (type === 'ERASER') inner = `<g transform="rotate(-35)"><rect x="-0.8" y="-0.42" width="1.6" height="0.84" rx="0.16" fill="#F7B4B4" stroke="#14213D" stroke-width="0.1"/><rect x="-0.8" y="-0.42" width="0.7" height="0.84" rx="0.16" fill="#fff" stroke="#14213D" stroke-width="0.1"/></g>`;
  else if (SCH_RECTS[type]) { const ic = { DUMMY: [1.8, 1], MAT: [2.2, 1.2], BENCH: [2.4, 0.5], BOX: [1.9, 1.3], RECT: [2.2, 1.2] }[type]; inner = schElementSvg({ type, x: 0, y: 0, w: ic[0], h: ic[1], scale: 1 }); }
  else inner = schElementSvg({ type, x: 0, y: 0, label: type === 'PLAYER' || type === 'DEFENDER' ? '1' : '', scale: k });
  return `<svg viewBox="-1.3 -1.3 2.6 2.6" width="34" height="34" style="display:block;margin:0 auto;">${inner}</svg>`;
}

// ----- État de l'éditeur -----
let schEd = null;
function schEdD() { return schEd.ex.drawings[schEd.k]; }
function schEdSel() { const d = schEdD(); return schEd.sel ? d.elements.find(e => e.id === schEd.sel) || null : null; }
function schEdSnapStr() { return JSON.stringify(schEd.ex.drawings); }
function schEdPush(s) { schEd.undo.push(s || schEdSnapStr()); if (schEd.undo.length > 60) schEd.undo.shift(); schEd.redo = []; }
function schEdBaseVb() { const d = schEdD(), v = SCH_VIEWS[d.view] || SCH_VIEWS.half, M = schViewMargins(d.view, 0.5, 2); return { x: -M.l, y: -M.t, w: v.w + M.l + M.r, h: v.h + M.t + M.b }; }
function schEdToast(msg) {
  const t = schEd && schEd.el.querySelector('#sche-toast'); if (!t) return;
  t.textContent = msg; t.style.opacity = '1'; clearTimeout(schEd.toastT); schEd.toastT = setTimeout(() => { if (t) t.style.opacity = '0'; }, 2200);
}
// ----- Report automatique : une modification faite dans une étape se répercute sur les étapes suivantes qui en héritaient (correction d'un oubli ou d'un mauvais placement) -----
// Une étape suivante « hérite » d'un élément tant qu'elle l'a laissé tel qu'il était à la fin de l'étape précédente : si tu l'as déplacé exprès (animation), il n'est pas touché.
const SCH_INH = ['type', 'x', 'y', 'rotation', 'scale', 'label', 'team', 'color', 'w', 'h', 'z', 'n', 'holderId', 'pts'];
function schInhSame(a, b) { return (typeof a === 'number' && typeof b === 'number') ? Math.abs(a - b) < 0.011 : JSON.stringify(a) === JSON.stringify(b); }
function schStartMap(d) { const m = {}; ((d && d.elements) || []).forEach(e => { if (!schIsAction(e)) m[e.id] = e; }); return m; }
function schEndMap(d) { try { return schStartMap(schNextFrom(d)); } catch (e) { return schStartMap(d); } }
function schPropApply(D, j, oldM, newM) {
  const dj = D[j]; let ch = 0;
  Object.keys(oldM).concat(Object.keys(newM).filter(id => !oldM[id])).forEach(id => {
    const o = oldM[id], n = newM[id], el = dj.elements.find(e => e.id === id);
    if (o && n) { if (!el) return; SCH_INH.forEach(p => { if (!schInhSame(o[p], n[p]) && schInhSame(el[p], o[p])) { if (n[p] === undefined) delete el[p]; else el[p] = JSON.parse(JSON.stringify(n[p])); ch++; } }); }
    else if (!o && n) { if (!el) { dj.elements.push(JSON.parse(JSON.stringify(n))); ch++; } } // élément ajouté
    else if (o && !n) { // élément supprimé (sauf si une action de l'étape suivante s'y rattache)
      if (el && SCH_INH.every(p => schInhSame(el[p], o[p])) && !dj.elements.some(a => schIsAction(a) && (a.fromElementId === id || a.toElementId === id || a.holderId === id))) { dj.elements.splice(dj.elements.indexOf(el), 1); ch++; }
    }
  });
  return ch;
}
function schPropagate(i, oldD, newD, D) {
  let n = 0;
  if (!newD.variant) { // variantes : elles repartent du même point de départ que l'étape de base
    for (let j = i + 1; D[j] && D[j].variant; j++) { const b = JSON.parse(JSON.stringify(D[j])); if (schPropApply(D, j, schStartMap(oldD), schStartMap(newD))) n += 1 + schPropagate(j, b, JSON.parse(JSON.stringify(D[j])), D); }
  }
  const j = i + 1; // étape suivante : elle repart de la position finale de celle-ci
  if (D[j] && !D[j].variant) { const b = JSON.parse(JSON.stringify(D[j])); if (schPropApply(D, j, schEndMap(oldD), schEndMap(newD))) n += 1 + schPropagate(j, b, JSON.parse(JSON.stringify(D[j])), D); }
  return n;
}
function schEdSyncSteps() {
  const S = schEd; if (!S) return;
  const D = S.ex.drawings, snap = JSON.stringify(D); if (S.base === snap) return;
  const base = S.base; S.base = snap; if (!base) return;
  let B; try { B = JSON.parse(base); } catch (e) { return; }
  const old = {}; B.forEach(d => { old[d.id] = d; });
  let n = 0;
  try {
    D.forEach((d, i) => {
      const o = old[d.id]; if (!o || JSON.stringify(o.elements) === JSON.stringify(d.elements)) return;
      n += schPropagate(i, schNormDrawing(o), JSON.parse(JSON.stringify(d)), D);
    });
  } catch (e) { n = 0; }
  if (n) { S.base = JSON.stringify(D); schEdToast('Modification reportée sur les étapes suivantes'); }
}
function schEdTouch() {
  schEdSyncSteps();
  const S = schEd, d = schEdD(); d.updatedAt = new Date().toISOString(); S.ex.updatedAt = d.updatedAt;
  schMarkDirty(S.ex);
  const sv = S.el.querySelector('#sche-saved'); if (sv) sv.textContent = 'Enregistrement…';
  clearTimeout(schSaveTimer); schSaveTimer = setTimeout(() => { const ok = schUserSave(); if (!ok) { const s2 = document.getElementById('sche-saved'); if (s2) s2.textContent = '⚠ Enregistrement impossible'; } else schSyncUi(); schSyncSoon(); }, 350);
}
function schEdChanged(panel) { schEdDraw(); schEdWarn(); schEdTouch(); schEdBar(); if (panel) schEdPanel(); }

// ----- Ouverture / fermeture -----
function schEditorOpen(exIdx, onClose) {
  schPlayerClose(); schEditorClose();
  schEnsure();
  const ex = schDemo[exIdx]; if (!ex || !ex.user) return;
  const el = document.createElement('div'); el.id = 'sch-editor'; el.className = 'sche';
  el.style.cssText = 'position:fixed;inset:0;z-index:99990;font-family:Arial,sans-serif;-webkit-user-select:none;user-select:none;overscroll-behavior:none;';
  el.innerHTML = `<div class="sche-top"><button type="button" class="sche-btn" id="sche-close" aria-label="Fermer">✕</button><input id="sche-name" class="sche-name" maxlength="120" placeholder="Nom de l'exercice" style="-webkit-user-select:text;user-select:text;"><button type="button" class="sche-tag" id="sche-tag" aria-label="Type et thème du schéma"></button><span class="sche-saved" id="sche-saved"></span></div>`
    + `<div class="sche-bar" id="sche-bar"></div><div class="sche-main"><div class="sche-board"><div class="sche-stage" id="sche-stage"></div><div class="sche-warn" id="sche-warn"></div><div class="sche-toast" id="sche-toast"></div></div><div class="sche-grip" id="sche-grip" role="separator" aria-label="Régler la taille des options" title="Glisse pour agrandir / réduire (double-touche : taille d'origine)"></div><div class="sche-panel" id="sche-panel"></div></div><div class="sche-tools" id="sche-tools"></div>`;
  document.documentElement.appendChild(el);
  schEd = { ex, onClose: onClose || null, k: 0, tool: 'select', group: 'tools', sel: null, vb: null, undo: [], redo: [], ptrs: new Map(), drag: null, down: null, pinch: null, el, stage: el.querySelector('#sche-stage'), prevOverflow: document.documentElement.style.overflow, touch: false, penAt: 0 };
  schEd.vb = schEdBaseVb(); schEd.base = schEdSnapStr(); document.documentElement.style.overflow = 'hidden';
  const nm = el.querySelector('#sche-name'); nm.value = ex.name; nm.oninput = () => { ex.name = nm.value.slice(0, 120); schEdTouch(); };
  el.querySelector('#sche-close').onclick = schEditorClose;
  el.querySelector('#sche-tag').onclick = () => schClassUi('edit', schEd.ex); schEdTagUi();
  const st = schEd.stage;
  st.style.touchAction = 'none'; st.addEventListener('contextmenu', ev => ev.preventDefault());
  st.addEventListener('pointerdown', schEdDown); st.addEventListener('pointermove', schEdMove); st.addEventListener('pointerup', schEdUp); st.addEventListener('pointercancel', schEdUp);
  st.addEventListener('wheel', schEdWheel, { passive: false });
  document.addEventListener('keydown', schEdKey, true);
  window.addEventListener('resize', schEdResize);
  // iPhone / iPad : pas de zoom natif de la page dans l'éditeur (il bloquait l'écran) ; doigts « fantômes » nettoyés
  schEd.guard = ev => { ev.preventDefault(); };
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => el.addEventListener(n, schEd.guard, { passive: false }));
  el.addEventListener('dblclick', schEd.guard);
  schEd.touchCount = ev => { if (schEd && ev.touches) schEd.nTouch = ev.touches.length; };
  el.addEventListener('touchstart', schEd.touchCount, { passive: true }); el.addEventListener('touchmove', schEd.touchCount, { passive: true });
  schEd.touchEnd = ev => { if (schEd && ev.touches) schEd.nTouch = ev.touches.length; if (schEd && ev.touches && ev.touches.length === 0 && schEd.ptrs.size) { schEd.ptrs.clear(); schEd.pinch = null; schEdCancelDrag(); } };
  el.addEventListener('touchend', schEd.touchEnd, { passive: true }); el.addEventListener('touchcancel', schEd.touchEnd, { passive: true });
  schEd.winUp = ev => { if (schEd && schEd.ptrs.has(ev.pointerId)) schEdUp(ev); };
  window.addEventListener('pointerup', schEd.winUp, true); window.addEventListener('pointercancel', schEd.winUp, true);
  schEdGripInit(); schEdBarDragInit(); schEdBar(); schEdTools(); schEdDraw(); schEdWarn(); schEdPanel(); schEdTouch();
}
function schEditorClose() {
  if (!schEd) return;
  document.removeEventListener('keydown', schEdKey, true); window.removeEventListener('resize', schEdResize); window.removeEventListener('pointerup', schEd.winUp, true); window.removeEventListener('pointercancel', schEd.winUp, true);
  clearTimeout(schSaveTimer); schUserSave();
  const cb = schEd.onClose, ex0 = schEd.ex;
  document.documentElement.style.overflow = schEd.prevOverflow || ''; schEd.el.remove(); schEd = null;
  try { schRenderDemo(); } catch (e) {}
  schSyncSoon(300);
  if (cb) { try { cb(ex0); } catch (e) {} }
}
function schEdResize() { if (schEd) { schEdPanelApply(); schEdDraw(); schEdTools(); } }
// ----- Taille de la zone d'options : poignée à glisser (hauteur sous la planche, largeur si les options sont à droite) -----
const SCH_PANEL_LS = 'sche_panel_v1';
function schEdPanelLoad() { try { const o = JSON.parse(localStorage.getItem(SCH_PANEL_LS) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
function schEdPanelSave(o) { try { localStorage.setItem(SCH_PANEL_LS, JSON.stringify(o)); } catch (e) {} }
function schEdPanelSide() { return !!schEd && getComputedStyle(schEd.el.querySelector('.sche-main')).flexDirection === 'row'; }
// bornes : la zone garde un minimum lisible, la planche garde au moins ~150 px (ou 35 % de la largeur)
function schEdPanelClamp(v, side) {
  const main = schEd.el.querySelector('.sche-main'), g = schEd.el.querySelector('#sche-grip');
  if (side) return Math.round(Math.max(200, Math.min(v, Math.max(200, main.clientWidth - g.offsetWidth - Math.max(160, main.clientWidth * 0.35)))));
  return Math.round(Math.max(70, Math.min(v, Math.max(70, main.clientHeight - g.offsetHeight - 150))));
}
function schEdPanelApply() {
  if (!schEd) return; const st = schEd.el.style, o = schEdPanelLoad(), side = schEdPanelSide();
  if (!side && o.h > 0) st.setProperty('--sche-ph', schEdPanelClamp(o.h, false) + 'px'); else st.removeProperty('--sche-ph');
  if (side && o.w > 0) st.setProperty('--sche-pw', schEdPanelClamp(o.w, true) + 'px'); else st.removeProperty('--sche-pw');
}
function schEdGripInit() {
  const S = schEd, g = S.el.querySelector('#sche-grip'), panel = S.el.querySelector('#sche-panel'); if (!g) return;
  let dr = null, raf = 0, lastTap = 0;
  const set = (v, side) => { S.el.style.setProperty(side ? '--sche-pw' : '--sche-ph', schEdPanelClamp(v, side) + 'px'); if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (schEd === S) schEdDraw(); }); };
  g.addEventListener('pointerdown', ev => {
    if (dr || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    ev.preventDefault(); ev.stopPropagation();
    const side = schEdPanelSide(), r = panel.getBoundingClientRect();
    dr = { id: ev.pointerId, side, x0: ev.clientX, y0: ev.clientY, s0: side ? r.width : r.height, moved: false };
    try { g.setPointerCapture(ev.pointerId); } catch (e) {} g.classList.add('drag');
  });
  g.addEventListener('pointermove', ev => {
    if (!dr || ev.pointerId !== dr.id) return; ev.preventDefault();
    const d = dr.side ? dr.x0 - ev.clientX : dr.y0 - ev.clientY;
    if (!dr.moved && Math.abs(d) < 3) return; dr.moved = true; set(dr.s0 + d, dr.side);
  });
  const end = ev => {
    if (!dr || ev.pointerId !== dr.id) return; const d0 = dr; dr = null; g.classList.remove('drag');
    try { g.releasePointerCapture(ev.pointerId); } catch (e) {}
    if (d0.moved) { const o = schEdPanelLoad(), r = panel.getBoundingClientRect(); if (d0.side) o.w = Math.round(r.width); else o.h = Math.round(r.height); schEdPanelSave(o); schEdDraw(); return; }
    const t = Date.now(); // double-touche : retour à la taille d'origine
    if (t - lastTap < 350) { const o = schEdPanelLoad(); if (d0.side) delete o.w; else delete o.h; schEdPanelSave(o); schEdPanelApply(); schEdDraw(); lastTap = 0; } else lastTap = t;
  };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  schEdPanelApply();
}
// ----- Raccourcis clavier (ordinateur) : réglables dans Réglages ; ceux de base (Ctrl+Z, Ctrl+Y, Suppr, Échap) restent fixes -----
const SCH_KEY_DEFAULTS = { 'tool:select': 'A', 'tool:multi': 'Z', play: 'Space' }; // touches par défaut (modifiables)
const SCH_KEY_RESERVED = ['Escape', 'Delete', 'Backspace', 'Tab', 'Enter'];
function schKeyCombo(e) {
  let k = e.key; if (!k || k === 'Dead' || k === 'Unidentified' || ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph'].includes(k)) return '';
  if (e.ctrlKey || e.metaKey) return '';
  if (k === ' ') k = 'Space';
  else if (k.length === 1) { if (e.altKey && /^Key[A-Z]$/.test(e.code || '')) k = e.code.slice(3); else if (!/^[0-9]$/.test(k) && /^Digit[0-9]$/.test(e.code || '') && !e.shiftKey) k = e.code.slice(5); else k = k.toUpperCase(); }
  return [e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : '', k].filter(Boolean).join('+');
}
function schKeyLabel(c) { return c ? c.replace('Space', 'Espace').replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('ArrowUp', '↑').replace('ArrowDown', '↓').replace('Delete', 'Suppr').replace('Backspace', 'Retour arrière').replace('Escape', 'Échap').replace('Enter', 'Entrée') : ''; }
function schKeyOf(id) { const k = (typeof dispCfg !== 'undefined' && dispCfg && dispCfg.keys) || {}; return Object.prototype.hasOwnProperty.call(k, id) ? k[id] : (SCH_KEY_DEFAULTS[id] || ''); }
function schKeyTool(id) {
  const S = schEd; if (!S) return;
  if (id === 'select') { if (S.tool === 'select' && S.sel) schEdSelect(null); else schEdTool('select'); }                     // A : outil Sélection ; encore une fois : désélectionne
  else if (id === 'multi') { if (S.tool === 'multi' && schEdMultiIds().length) schEdMultiClear(); else schEdTool('multi'); }     // Z : outil Sélection multiple ; encore une fois : désélectionne
  else if (id[0] === '@') schEdPreset(id.slice(1));
  else schEdTool(id);
}
function schKeyActions() {
  const A = [], add = (id, label, group, run, repeat) => A.push({ id, label, group, run, repeat: !!repeat });
  const sel = () => schEdSel(), onSel = fn => () => { const e = sel(); if (e) fn(e); };
  add('play', '▶ Animer', 'Actions', () => { const i = schDemo.indexOf(schEd.ex); if (i >= 0) schPlayerOpen(i, schEd.k); });
  add('undo', 'Annuler', 'Actions', () => schEdUndo(), true);
  add('redo', 'Rétablir', 'Actions', () => schEdRedo(), true);
  add('next', '➜ Étape suivante (demande : continuer, copier ou vierge)', 'Actions', () => schEdNextAsk());
  add('addstep', '＋ Ajouter une étape vide (planche vierge)', 'Actions', () => schEdAddStep());
  add('repeat', '🔁 Reproduire l\'enchaînement (2ᵉ groupe)', 'Actions', () => schEdRepeatUi());
  add('variant', '🔀 Créer une variante d\'une étape (choix)', 'Actions', () => schEdVariantUi());
  add('variantcur', '🔀 Variante de l\'étape en cours (directe)', 'Actions', () => schEdVariant(schEd.k));
  add('prev', 'Aller à l\'étape précédente', 'Actions', () => schEdGo(schEd.k - 1));
  add('nextnav', 'Aller à l\'étape suivante', 'Actions', () => schEdGo(schEd.k + 1));
  add('validate', '✓ Valider / dévalider l\'étape', 'Actions', () => schEdValidate());
  add('dupstep', '⧉ Dupliquer l\'étape', 'Actions', () => schEdDupStep());
  add('delstep', '🗑 Supprimer l\'étape', 'Actions', () => schEdDelStep());
  add('view', 'Changer de terrain (½ terrain, entier…)', 'Actions', () => { const ks = SCH_VIEW_KEYS; schEdView(ks[(ks.indexOf(schViewParse(schEdD().view).base) + 1) % ks.length]); });
  add('viewrotR', '↻ Pivoter le terrain de 90° vers la droite', 'Actions', () => schEdRotate(1));
  add('viewrotL', '↺ Pivoter le terrain de 90° vers la gauche', 'Actions', () => schEdRotate(-1));
  add('recenter', '⤢ Recentrer la vue', 'Actions', () => schEdRecenter());
  add('dup', 'Dupliquer la sélection', 'Actions', () => { if (!sel() && schEdMultiIds().length) schEdMultiDup(); else if (sel()) schEdDup(); });
  add('del', 'Supprimer la sélection', 'Actions', () => { if (!sel() && schEdMultiIds().length) schEdMultiDel(); else if (sel()) schEdDel(); });
  add('selall', 'Tout sélectionner', 'Actions', () => { if (schEd.tool !== 'multi') schEdTool('multi'); schEdMultiAll(); });
  add('desel', 'Tout désélectionner', 'Actions', () => { schEd.sel = null; schEdMultiSet([]); schEd.drag = null; schEdDraw(); schEdPanel(); schEdTools(); });
  add('rotL', 'Pivoter de 15° à gauche', 'Actions', onSel(e => { if (!schIsAction(e)) schEdAdd('rotation', -15, 0, 360); }), true);
  add('rotR', 'Pivoter de 15° à droite', 'Actions', onSel(e => { if (!schIsAction(e)) schEdAdd('rotation', 15, 0, 360); }), true);
  add('sizeM', 'Réduire la taille', 'Actions', onSel(e => { if (schIsAction(e)) return; if (SCH_RECTS[e.type]) { schEdDim('w', -0.25); schEdDim('h', -0.25); } else if (e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE') schEdZone(-0.5); else schEdAdd('scale', -0.2, 0.4, 3); }), true);
  add('sizeP', 'Agrandir', 'Actions', onSel(e => { if (schIsAction(e)) return; if (SCH_RECTS[e.type]) { schEdDim('w', 0.25); schEdDim('h', 0.25); } else if (e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE') schEdZone(0.5); else schEdAdd('scale', 0.2, 0.4, 3); }), true);
  add('stepM', 'N° d\'étape de l\'action −1', 'Actions', onSel(e => { if (schIsAction(e)) schEdAdd('step', -1, 1, 30); }), true);
  add('stepP', 'N° d\'étape de l\'action +1', 'Actions', onSel(e => { if (schIsAction(e)) schEdAdd('step', 1, 1, 30); }), true);
  SCH_TOOL_ORDER.forEach(id => add('tool:' + id, 'Outil : ' + schToolLabel(id).replace(/^[⊞☝⬚✥] /, ''), 'Outils', () => schKeyTool(id)));
  return A;
}
function schKeyHandle(e) {
  const c = schKeyCombo(e); if (!c) return false;
  const a = schKeyActions().find(x => schKeyOf(x.id) === c); if (!a) return false;
  if (e.repeat && !a.repeat) return true;
  a.run(); return true;
}
function schEdKey(e) {
  if (!schEd || schPl) return;
  if (document.getElementById('sch-cls')) { if (e.key === 'Escape') { e.preventDefault(); schClassClose(); } return; }
  if (schEd.el.querySelector('#sche-ask')) { if (e.key === 'Escape') { e.preventDefault(); schEdAsk(0); } return; }
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '');
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? schEdRedo() : schEdUndo(); }
  else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); schEdRedo(); }
  else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && !schEd.sel && schEdMultiIds().length) { e.preventDefault(); schEdMultiDel(); }
  else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && schEd.sel) { e.preventDefault(); schEdDel(); }
  else if (e.key === 'Escape') { if (typing) document.activeElement.blur(); else { schEd.sel = null; schEdMultiSet([]); schEd.drag = null; schEdDraw(); schEdPanel(); schEdTools(); } }
  else if (!typing && !e.ctrlKey && !e.metaKey) { let h = false; try { h = schKeyHandle(e); } catch (x) { console.error(x); } if (h) { e.preventDefault(); e.stopPropagation(); if (document.activeElement && document.activeElement.blur && document.activeElement !== document.body) document.activeElement.blur(); } }
}

// ----- Barre d'étapes et d'actions générales -----
function schEdBar() {
  const S = schEd, bar = S.el.querySelector('#sche-bar'), d = schEdD(), ex = S.ex, sl = bar.scrollLeft;
  const roomy = innerWidth >= 1000; // assez large pour un bouton ✎ en plus ; sinon on touche l'étape active pour la renommer
  const narrow = innerWidth < 600, stl = x => narrow ? (/^Étape( \d+)?( – variante [A-Z])?$/.test(x.title) ? schEsc(x.title).replace(/^Étape\s*/, '').replace(/\s*–\s*variante\s+([A-Z])$/, '$1') || '1' : schEsc(x.title.length > 9 ? x.title.slice(0, 8) + '…' : x.title)) : schEsc(x.title);
  const b = (fn, label, extra, title) => `<button type="button" class="sche-b ${extra || ''}" onclick="${fn}" ${title ? `aria-label="${title}" title="${title}"` : ''}>${label}</button>`;
  bar.innerHTML = b('schEdUndo()', '↶', S.undo.length ? '' : 'dis', 'Annuler') + b('schEdRedo()', '↷', S.redo.length ? '' : 'dis', 'Rétablir')
    + ex.drawings.map((x, i) => b(!roomy && i === S.k ? `schEdRenameStep(${i})` : `schEdGo(${i})`, (schEdIsValid(x) ? '✓ ' : '') + stl(x), (i === S.k ? 'on' : '') + '" data-step="' + i, narrow ? 'Étape ' + stl(x) : (!roomy && i === S.k ? 'Touche encore pour renommer' : ''))).join('')
    + b('schEdNextAsk()', '➜ Suivante', 'acc', 'Étape suivante : continuer l\'action, copier cette étape ou partir d\'une planche vierge') + b(`schPlayerOpen(${schDemo.indexOf(ex)},schEd.k)`, '▶ Animer', 'acc')
    + b('schEdValidate()', narrow ? '✓' : (schEdIsValid(d) ? '✓ Validée' : '✓ Valider'), schEdIsValid(d) ? 'on' : '', 'Valider l\'étape') + (!roomy ? '' : b('schEdRenameStep()', '✎', '', 'Renommer l\'étape (ou une variante)')) + b('schEdDupStep()', '⧉', '', 'Dupliquer l\'étape') + b('schEdDelStep()', '🗑', '', 'Supprimer l\'étape')
    + `<select class="sche-sel" onchange="schEdView(this.value)" aria-label="Terrain">${SCH_VIEW_KEYS.map(k => `<option value="${k}" ${schViewParse(d.view).base === k ? 'selected' : ''}>${SCH_VIEWS[k].name}${!narrow && schViewParse(d.view).base === k && schViewParse(d.view).rot ? ' ↻' + schViewParse(d.view).rot + '°' : ''}</option>`).join('')}${narrow ? '<option value="@rotR">↻ 90° droite</option><option value="@rotL">↺ 90° gauche</option>' : ''}</select>`
    + (narrow ? '' : b('schEdRotate(-1)', '↺', '', 'Pivoter le terrain de 90° vers la gauche (toutes les étapes)') + b('schEdRotate(1)', '↻', '', 'Pivoter le terrain de 90° vers la droite (toutes les étapes)'))
    + b('schEdRecenter()', '⤢', '', 'Recentrer la vue');
  bar.scrollLeft = sl;
}
function schEdRenameStep(i) {
  const S = schEd; if (!S) return; i = (i == null ? S.k : +i); const d = S.ex.drawings[i]; if (!d) return;
  const v = prompt('Nom de l\'étape' + (d.variant ? ' (variante)' : '') + ' — laisse vide pour le nom automatique', d.title || ''); if (v === null) return;
  const t = String(v).trim().slice(0, 40); schEdPush(); d.title = t || 'Étape'; schEdRetitle(); schEdChanged(true); schEdToast(t ? 'Étape renommée : « ' + d.title + ' »' : 'Nom automatique rétabli');
}
function schEdIsValid(d) { return !!(d.validatedAt && (!d.updatedAt || d.validatedAt >= d.updatedAt)); }
function schEdValidate() { const d = schEdD(); if (schEdIsValid(d)) { d.validatedAt = null; } else { d.validatedAt = new Date().toISOString(); } schEdPush(); schMarkDirty(schEd.ex); schUserSave(); schEdBar(); schEdTouchKeep(); schEdToast(d.validatedAt ? 'Étape validée' : 'Validation retirée'); }
function schEdTouchKeep() { clearTimeout(schSaveTimer); schSaveTimer = setTimeout(() => { schUserSave(); schSyncUi(); schSyncSoon(); }, 350); }
// ----- Étapes : réorganisation par glisser-déposer (appui prolongé sur l'étape, puis glisser entre deux autres) -----
function schEdChain(a, b) { // l'étape b repart-elle de la position finale de a ? (joueurs, porteur et position des ballons)
  const pa = schPlan(a), sa = schPlanState(pa, pa.D), pb = schPlan(b);
  for (const e of b.elements) { if (!schIsPlayer(e)) continue; const q = sa.pos[e.id]; if (q && Math.hypot(q.x - e.x, q.y - e.y) > 0.6) return false; }
  for (const x of pa.balls) { const y = pb.balls.find(z => z.id === x.id); if (!y) continue; if ((x.fin.poss || '') !== (y.init.poss || '')) return false; if (!x.fin.poss && x.fin.ground && y.init.ground && Math.hypot(x.fin.ground.x - y.init.ground.x, x.fin.ground.y - y.init.ground.y) > 0.6) return false; }
  return true;
}
function schEdMoveStep(i, j, after) {
  const S = schEd, D = S.ex.drawings; i = +i; j = +j; let to = j + (after ? 1 : 0); if (to > i) to--; if (to === i || !D[i] || !D[j]) return;
  const adj = L => { const o = {}; for (let k = 0; k < L.length - 1; k++) if (!L[k + 1].variant) o[L[k].id + '>' + L[k + 1].id] = 1; return o; };
  const chained = L => { const o = []; for (let k = 0; k < L.length - 1; k++) if (!L[k + 1].variant && schEdChain(L[k], L[k + 1])) o.push(L[k].id + '>' + L[k + 1].id); return o; };
  let old = []; try { old = chained(D); } catch (e) {}
  schEdPush(); const [m] = D.splice(i, 1); D.splice(to, 0, m); if (D[0] && D[0].variant) delete D[0].variant;
  schEdRetitle(); S.k = to; S.sel = null; schEdMultiSet([]); S.vb = schEdBaseVb(); schEdBar(); schEdChanged(true);
  let broken = 0; try { const now = adj(D); broken = old.filter(k => !now[k]).length; } catch (e) {}
  schEdToast(broken ? 'Étape déplacée. Attention : l\'enchaînement est rompu — une étape ne repart plus de la position finale de la précédente (↶ pour annuler).' : 'Étape déplacée en position ' + (to + 1));
}
function schEdBarDragInit() {
  const S = schEd, bar = S.el.querySelector('#sche-bar'); let st = null;
  const clear = () => { if (st) clearTimeout(st.tm); st = null; bar.querySelectorAll('.dragging,.drop-b,.drop-a').forEach(b => b.classList.remove('dragging', 'drop-b', 'drop-a')); };
  const start = () => { if (!st || st.on) return; st.on = true; try { bar.setPointerCapture(st.id); } catch (e) {} st.b.classList.add('dragging'); try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} };
  const target = ev => {
    let best = null, bd = 1e9; bar.querySelectorAll('[data-step]').forEach(b => { if (+b.dataset.step === st.i) return; const r = b.getBoundingClientRect(), d = Math.hypot(ev.clientX - (r.left + r.width / 2), (ev.clientY - (r.top + r.height / 2)) * 1.6); if (d < bd) { bd = d; best = { b, r }; } });
    return best ? { j: +best.b.dataset.step, after: ev.clientX > best.r.left + best.r.width / 2, b: best.b } : null;
  };
  bar.addEventListener('pointerdown', ev => {
    const b = ev.target.closest && ev.target.closest('[data-step]'); if (!b || (ev.pointerType === 'mouse' && ev.button !== 0) || S.ex.drawings.length < 2) return;
    clear(); st = { id: ev.pointerId, i: +b.dataset.step, x0: ev.clientX, y0: ev.clientY, on: false, b, ty: ev.pointerType };
    if (st.ty !== 'mouse') st.tm = setTimeout(start, 320);
  });
  bar.addEventListener('pointermove', ev => {
    if (!st || ev.pointerId !== st.id) return; const dd = Math.hypot(ev.clientX - st.x0, ev.clientY - st.y0);
    if (!st.on) { if (st.ty === 'mouse') { if (dd > 8) start(); } else if (dd > 10) { clearTimeout(st.tm); st = null; } return; }
    ev.preventDefault(); bar.querySelectorAll('.drop-b,.drop-a').forEach(b => b.classList.remove('drop-b', 'drop-a'));
    const t = target(ev); st.t = t; if (t) t.b.classList.add(t.after ? 'drop-a' : 'drop-b');
  });
  const end = ev => {
    if (!st || ev.pointerId !== st.id) return; const s0 = st, was = s0.on && ev.type === 'pointerup'; clear(); try { bar.releasePointerCapture(ev.pointerId); } catch (e) {}
    if (was && s0.t) schEdMoveStep(s0.i, s0.t.j, s0.t.after);
  };
  bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
  bar.addEventListener('dblclick', ev => { const b = ev.target.closest && ev.target.closest('[data-step]'); if (b) { ev.preventDefault(); schEdRenameStep(+b.dataset.step); } });
  bar.addEventListener('contextmenu', ev => { if (ev.target.closest && ev.target.closest('[data-step]')) ev.preventDefault(); });
}
function schEdGo(i) { const S = schEd; if (i < 0 || i >= S.ex.drawings.length) return; S.k = i; S.sel = null; S.vb = schEdBaseVb(); schEdBar(); schEdDraw(); schEdWarn(); schEdPanel(); }
// Numérotation : les étapes « de base » se numérotent 1, 2, 3… ; une variante (d.variant) se rattache à l'étape de base qui la précède (Étape 3 – variante B, C…)
function schEdRetitle() {
  let n = 0, vi = 0;
  schEd.ex.drawings.forEach((d, i) => {
    const auto = /^Étape( \d+)?( – variante [A-Z])?$/.test(d.title);
    if (d.variant && i > 0) { vi++; d.variant = String.fromCharCode(65 + Math.min(vi, 25)); if (auto) d.title = 'Étape ' + n + ' – variante ' + d.variant; else if (/ – variante [A-Z]$/.test(d.title)) d.title = d.title.replace(/ – variante [A-Z]$/, ' – variante ' + d.variant); }
    else { delete d.variant; n++; vi = 0; if (auto) d.title = 'Étape ' + n; else d.title = d.title.replace(/ – variante [A-Z]$/, ''); }
  });
}
// dernière étape de la série « étape de base + ses variantes » qui contient l'étape i : les nouvelles étapes s'insèrent après, sans couper la série
function schEdRunEnd(i) { const D = schEd.ex.drawings; let j = i; while (D[j + 1] && D[j + 1].variant) j++; return j; }
// Variante : copie de n'importe quelle étape i, jouée juste après elle (et ses autres variantes), en repartant du même point de départ
function schEdVariant(i) {
  const S = schEd, D = S.ex.drawings; i = +i; if (!D[i]) return;
  schEdPush();
  const c = schNormDrawing(JSON.parse(JSON.stringify(D[i]))); c.id = schUid(); c.validatedAt = null; c.updatedAt = null; c.variant = 'B'; c.title = String(c.title || 'Étape').replace(/ – variante [A-Z]$/, '') + ' – variante B';
  const at = schEdRunEnd(i); D.splice(at + 1, 0, c); schEdRetitle(); S.k = at + 1; S.sel = null; schEdMultiSet([]); S.vb = schEdBaseVb(); schEdBar(); schEdChanged(true);
  schEdToast('« ' + D[S.k].title + ' » créée : modifie-la pour montrer une autre suite (lance « Animer » pour les voir l\'une après l\'autre)');
}
function schEdVariantMake(i) { const o = schEd && schEd.el.querySelector('#sche-ask'); if (o) o.remove(); schEdVariant(i); }
function schEdVariantUi() {
  const S = schEd; if (!S) return;
  let o = S.el.querySelector('#sche-ask');
  if (!o) { o = document.createElement('div'); o.id = 'sche-ask'; o.className = 'sche-ask'; o.addEventListener('pointerdown', ev => { if (ev.target === o) schEdAsk(0); }); o.innerHTML = '<div class="sche-ask-card" role="dialog" aria-label="Variante d\'une étape"></div>'; S.el.appendChild(o); }
  const D = S.ex.drawings;
  o.querySelector('.sche-ask-card').innerHTML = `<div class="sche-ask-t">Variante d'une étape</div><div class="sche-ask-s">Quelle étape veux-tu copier ? La variante se place juste après elle et repart du même point : change la suite pour montrer une autre possibilité.</div>`
    + `<div class="sche-ask-list">${D.map((x, i) => `<button type="button" class="sche-ask-b${i === S.k ? ' cur' : ''}" onclick="schEdVariantMake(${i})"><span class="sche-ask-i">${i + 1}</span><span><b>${schEsc(x.title)}</b><small>${x.elements.length} élément${x.elements.length > 1 ? 's' : ''}${i === S.k ? ' · étape en cours' : ''}</small></span></button>`).join('')}</div>`
    + `<button type="button" class="sche-ask-c" onclick="schEdAsk(0)">Annuler</button>`;
  const cur = o.querySelector('.sche-ask-b.cur'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
}
function schEdAddStep() {
  const S = schEd; schEdPush(); S.ex.drawings.push(schNormDrawing({ title: 'Étape', view: schEdD().view })); schEdRetitle(); S.k = S.ex.drawings.length - 1; S.sel = null; S.vb = schEdBaseVb(); schEdBar(); schEdChanged(true);
}
// « Suivante » : continuer l'action (position finale), copier l'étape (variante) ou planche vierge
function schEdNextAsk() {
  const S = schEd; if (!S || S.el.querySelector('#sche-ask')) return;
  const t = schEsc(schEdD().title || 'cette étape'), btn = (k, ic, h, sub) => `<button type="button" class="sche-ask-b" onclick="schEdAsk(${k})"><span class="sche-ask-i">${ic}</span><span><b>${h}</b><small>${sub}</small></span></button>`;
  const o = document.createElement('div'); o.id = 'sche-ask'; o.className = 'sche-ask';
  o.innerHTML = `<div class="sche-ask-card" role="dialog" aria-label="Étape suivante"><div class="sche-ask-t">Étape suivante</div><div class="sche-ask-s">À partir de « ${t} » :</div>`
    + btn(1, '➜', 'Continuer l\'action', 'Joueurs et ballon repartent de leur position finale')
    + btn(2, '⧉', 'Copier « ' + t + ' »', 'Même schéma, à modifier ensuite (nouvelle étape à la suite)')
    + btn(3, '▢', 'Planche vierge', 'Repartir de zéro sur le même terrain')
    + btn(4, '🔁', 'Reproduire l\'enchaînement', 'Même schéma avec un 2ᵉ groupe (en miroir…), sur de nouvelles étapes')
    + btn(5, '🔀', 'Variante d\'une étape…', 'Copier n\'importe quelle étape pour montrer une autre suite (variantes B, C…)')
    + schEdBalls().map((b, i) => b.id === schEdD().ballPlay || (!schEdD().ballPlay && i === 0) ? '' : `<button type="button" class="sche-ask-b" onclick="schEdNextBall('${b.id}')"><span class="sche-ask-i">${i + 1}</span><span><b>Continuer avec le ballon ${i + 1}</b><small>Le ballon ${i + 1} est joué à partir de l'étape suivante ; les autres restent où ils sont</small></span></button>`).join('')
    + `<button type="button" class="sche-ask-c" onclick="schEdAsk(0)">Annuler</button></div>`;
  o.addEventListener('pointerdown', ev => { if (ev.target === o) schEdAsk(0); });
  S.el.appendChild(o);
}
function schEdBallPlay(v) { const d = schEdD(); if ((d.ballPlay || '') === (v || '')) return; schEdPush(); if (v) d.ballPlay = v; else delete d.ballPlay; schEdChanged(true); schEdToast(v ? 'On joue le ballon ' + (d.elements.filter(e => e.type === 'BALL').findIndex(e => e.id === v) + 1) + ' dans cette étape' : 'Ballon automatique'); }
function schEdBalls() { return schEd.ex.drawings[schEd.k].elements.filter(e => e.type === 'BALL'); }
function schEdNextBall(id) { const o = schEd && schEd.el.querySelector('#sche-ask'); if (o) o.remove(); schEdNext(id); }
function schEdAsk(k) { if (k === 4) { schEdRepeatUi(); return; } if (k === 5) { schEdVariantUi(); return; } const o = schEd && schEd.el.querySelector('#sche-ask'); if (o) o.remove(); if (k === 1) schEdNext(); else if (k === 2) schEdDupStep(); else if (k === 3) schEdAddStep(); }
// ----- Reproduire l'enchaînement : l'étape en cours est recopiée sur de nouvelles étapes avec un 2ᵉ groupe (nouveaux joueurs / ballons), en miroir ou à la même place -----
function schEdRepeatCard() {
  const S = schEd, R = S.rep, k0 = S.k, chip = (on, lab, fn) => `<button type="button" class="sche-ask-chip${on ? ' on' : ''}" onclick="${fn}">${lab}</button>`;
  const side = i => R.mode === 'same' ? 'même place' : (i % 2 === 0 ? 'en miroir ' + (R.mode === 'y' ? '(haut ⇄ bas)' : '(gauche ⇄ droite)') : 'comme l\'original');
  let seq = ''; for (let i = 0; i < R.n; i++) seq += `<div>Étape ${k0 + 2 + i} : ${side(i)}, avec un nouveau groupe</div>`;
  return `<div class="sche-ask-t">Reproduire l'enchaînement</div><div class="sche-ask-s">« ${schEsc(schEdD().title)} » est recopiée sur de nouvelles étapes, jouées l'une après l'autre.</div>`
    + `<div class="sche-ask-l">Combien de fois</div><div class="sche-ask-r">${[1, 2, 3].map(n => chip(R.n === n, String(n), `schEdRepSet('n',${n})`)).join('')}</div>`
    + `<div class="sche-ask-l">Où</div><div class="sche-ask-r">${chip(R.mode === 'x', 'Miroir gauche ⇄ droite', `schEdRepSet('mode','x')`)}${chip(R.mode === 'y', 'Miroir haut ⇄ bas', `schEdRepSet('mode','y')`)}${chip(R.mode === 'same', 'Même place', `schEdRepSet('mode','same')`)}</div>`
    + `<div class="sche-ask-p">${seq}<div style="margin-top:4px;">Joueurs, ballons, passes, courses, tirs et numéros d'ordre sont copiés tels quels ; le groupe de l'étape précédente s'efface, le nouveau groupe apparaît.</div></div>`
    + `<button type="button" class="sche-ask-b go" onclick="schEdRepeat(${R.n}, '${R.mode}')"><span class="sche-ask-i">🔁</span><span><b>Créer ${R.n} étape${R.n > 1 ? 's' : ''}</b></span></button><button type="button" class="sche-ask-c" onclick="schEdAsk(0)">Annuler</button>`;
}
function schEdRepeatUi() {
  const S = schEd; if (!S) return; if (!S.rep) S.rep = { n: 1, mode: 'x' };
  let o = S.el.querySelector('#sche-ask');
  if (!o) { o = document.createElement('div'); o.id = 'sche-ask'; o.className = 'sche-ask'; o.addEventListener('pointerdown', ev => { if (ev.target === o) schEdAsk(0); }); o.innerHTML = '<div class="sche-ask-card" role="dialog" aria-label="Reproduire l\'enchaînement"></div>'; S.el.appendChild(o); }
  o.querySelector('.sche-ask-card').innerHTML = schEdRepeatCard();
}
function schEdRepSet(k, v) { schEd.rep[k] = v; schEdRepeatUi(); }
// symétrie d'un élément copié (axe : 'x' = gauche ⇄ droite, 'y' = haut ⇄ bas)
function schEdMirrorEl(c, axis, W, H) {
  const fx = v => schR(W - v, 2), fy = v => schR(H - v, 2), mx = axis === 'x';
  if (schIsAction(c)) { c.points = c.points.map(p => ({ x: mx ? fx(p.x) : p.x, y: mx ? p.y : fy(p.y) })); return; }
  if (mx) c.x = fx(c.x); else c.y = fy(c.y);
  if (c.type === 'PEN') c.pts = c.pts.map(q => ({ x: mx ? -q.x : q.x, y: mx ? q.y : -q.y }));
  if (c.rotation) c.rotation = (((c.type === 'DEFENDER' && !mx ? 180 - c.rotation : -c.rotation) % 360) + 360) % 360;
  else if (c.type === 'DEFENDER' && !mx) c.rotation = 180;
}
function schEdRepeat(n, mode) {
  const S = schEd, d = schEdD(), V = SCH_VIEWS[d.view] || SCH_VIEWS.half; n = Math.max(1, Math.min(3, Math.round(n) || 1));
  const o = S.el.querySelector('#sche-ask'); if (o) o.remove();
  if (!d.elements.length) { schEdToast('L\'étape est vide : rien à reproduire'); return; }
  schEdPush(); const made = [];
  for (let i = 0; i < n; i++) {
    const c = schNormDrawing(JSON.parse(JSON.stringify(d))); c.id = schUid(); c.validatedAt = null; c.updatedAt = null; delete c.variant; c.title = String(c.title).replace(/ – variante [A-Z]$/, ''); const map = {};
    c.elements.forEach(e => { const id = schUid(); map[e.id] = id; e.id = id; });
    c.elements.forEach(e => { ['fromElementId', 'toElementId', 'ballId', 'holderId'].forEach(k => { if (e[k] && e[k] !== '-') { if (map[e[k]]) e[k] = map[e[k]]; else delete e[k]; } }); });
    if (c.ballPlay) { if (map[c.ballPlay]) c.ballPlay = map[c.ballPlay]; else delete c.ballPlay; }
    if (mode !== 'same' && i % 2 === 0) c.elements.forEach(e => schEdMirrorEl(e, mode === 'y' ? 'y' : 'x', V.w, V.h));
    made.push(schNormDrawing(c));
  }
  { const at = schEdRunEnd(S.k); S.ex.drawings.splice(at + 1, 0, ...made); schEdRetitle(); S.k = at + 1; } S.sel = null; schEdMultiSet([]); S.vb = schEdBaseVb(); schEdBar(); schEdChanged(true);
  schEdToast(n + ' étape' + (n > 1 ? 's créées' : ' créée') + ' avec un 2ᵉ groupe : lance « Animer » pour voir l\'enchaînement');
}
function schEdNext(ballId) {
  const S = schEd, d = schEdD(); schEdPush();
  if (!schEdIsValid(d)) d.validatedAt = new Date().toISOString();
  const nd = schNormDrawing(schNextFrom(d)), at = schEdRunEnd(S.k); if (ballId) nd.ballPlay = ballId; S.ex.drawings.splice(at + 1, 0, nd); schEdRetitle(); S.k = at + 1; S.sel = null; S.vb = schEdBaseVb(); schEdBar(); schEdChanged(true); schEdToast(ballId ? 'Étape suivante créée : on joue maintenant le ballon ' + (schEdD().elements.filter(e => e.type === 'BALL').findIndex(e => e.id === ballId) + 1) : 'Étape suivante créée : joueurs et ballon à leur position finale');
}
function schEdDupStep() {
  const S = schEd, d = schEdD(); schEdPush(); const c = schNormDrawing(JSON.parse(JSON.stringify(d))); c.id = schUid(); c.validatedAt = null; delete c.variant; c.title = String(c.title).replace(/ – variante [A-Z]$/, ''); { const at = schEdRunEnd(S.k); S.ex.drawings.splice(at + 1, 0, c); schEdRetitle(); S.k = at + 1; } S.sel = null; schEdBar(); schEdChanged(true);
}
function schEdDelStep() {
  const S = schEd; if (S.ex.drawings.length < 2) { schEdToast('Il faut garder au moins une étape'); return; }
  if (!confirm('Supprimer « ' + schEdD().title + ' » ?')) return;
  schEdPush(); { const g = S.ex.drawings; if (!g[S.k].variant && g[S.k + 1] && g[S.k + 1].variant) delete g[S.k + 1].variant; } S.ex.drawings.splice(S.k, 1); schEdRetitle(); S.k = Math.min(S.k, S.ex.drawings.length - 1); S.sel = null; S.vb = schEdBaseVb(); schEdBar(); schEdChanged(true);
}
// Pivote le terrain ET son contenu de 90° (dir = 1 : vers la droite, -1 : vers la gauche), sur toutes les étapes : l'exercice reste cohérent
function schRotateDrawing(d, dir) {
  const p = schViewParse(d.view), V = SCH_VIEWS[d.view] || SCH_VIEWS.half, W = V.w, H = V.h;
  const f = dir > 0 ? (x, y) => ({ x: schR(H - y, 2), y: schR(x, 2) }) : (x, y) => ({ x: schR(y, 2), y: schR(W - x, 2) });
  d.elements.forEach(e => {
    const q = f(e.x, e.y); e.x = q.x; e.y = q.y;
    if (e.points) e.points = e.points.map(pt => f(pt.x, pt.y));
    if (e.pts) e.pts = e.pts.map(q => dir > 0 ? { x: schR(-q.y, 2), y: schR(q.x, 2) } : { x: schR(q.y, 2), y: schR(-q.x, 2) });
    if (e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE') { const w = e.w; e.w = e.h; e.h = w; }
    else if (!schIsAction(e) && (e.type === 'DEFENDER' || ['HURDLE', 'LADDER', 'POPUP_GOAL', 'BALL_BOX'].includes(e.type) || SCH_RECTS[e.type])) e.rotation = ((((e.rotation || 0) + 90 * dir) % 360) + 360) % 360;
  });
  const nr = (p.rot + (dir > 0 ? 90 : 270)) % 360; d.view = p.base + (nr ? '@' + nr : '');
}
function schEdRotate(dir) {
  const S = schEd; if (!S) return; schEdPush();
  S.ex.drawings.forEach(d => schRotateDrawing(d, dir > 0 ? 1 : -1));
  S.base = schEdSnapStr(); // pivoter le terrain touche déjà toutes les étapes : rien à reporter
  S.vb = schEdBaseVb(); schEdBar(); schEdChanged(true); schEdToast('Terrain pivoté de 90° (' + S.ex.drawings.length + ' étape' + (S.ex.drawings.length > 1 ? 's' : '') + ')');
}
function schEdView(v) { if (v === '@rotR' || v === '@rotL') { schEdRotate(v === '@rotR' ? 1 : -1); return; } if (!SCH_VIEW_KEYS.includes(v)) return; { const pr = schViewParse(schEdD().view); if (pr.rot) v = v + '@' + pr.rot; } schEdPush(); schEdD().view = v; schEd.vb = schEdBaseVb(); schEdChanged(false); schEdBar(); }
function schEdRecenter() { schEd.vb = schEdBaseVb(); schEdDraw(); }
function schEdUndo() {
  const S = schEd; if (!S.undo.length) return; S.redo.push(schEdSnapStr()); S.ex.drawings = schNormDrawings(JSON.parse(S.undo.pop())); schEdAfterHistory();
}
function schEdRedo() {
  const S = schEd; if (!S.redo.length) return; S.undo.push(schEdSnapStr()); S.ex.drawings = schNormDrawings(JSON.parse(S.redo.pop())); schEdAfterHistory();
}
function schEdAfterHistory() { const S = schEd; S.base = schEdSnapStr(); S.k = Math.min(S.k, S.ex.drawings.length - 1); if (!schEdSel()) S.sel = null; S.vb = schEdBaseVb(); schEdBar(); schEdChanged(true); }

