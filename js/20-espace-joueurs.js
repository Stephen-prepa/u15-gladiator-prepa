// Prépa U15 HBCCS — js/20-espace-joueurs.js — dernière modification : version z25 (05/11/2026)
// ===================== ESPACE JOUEURS : REGISTRE DES RUBRIQUES =====================
// Chaque rubrique de l'Espace Joueurs se déclare avec ejRegister(). La page Réglages › Espace Joueurs
// › « Rubriques » est GÉNÉRÉE à partir de ce registre : une nouvelle rubrique (ou une nouvelle option)
// y apparaît toute seule, avec son interrupteur, sans toucher à la page Réglages.
// Les choix du coach sont stockés dans app_settings (clé 'ej_modules'), lisible par les joueurs.
//
// Exemple de déclaration d'une nouvelle rubrique :
//   ejRegister({ id: 'seance', title: '🏋️ Séance du jour', desc: 'Lecture pas à pas',
//                box: 'ej-mod-seance', titleEl: 'ej-mod-seance-title',
//                options: [{ id: 'anim', label: 'Montrer les animations', def: true }] });
// (box = identifiant du cadre dans index.html, titleEl = identifiant de son titre ; ejOpt('seance','anim') lit l'option.)

const EJ_REGISTRY = [];
const EJ_KEY = 'ej_modules';

function ejRegister(mod) {
  if (!mod || !mod.id) return;
  const m = Object.assign({ title: mod.id, desc: '', box: null, titleEl: null, options: [] }, mod);
  const i = EJ_REGISTRY.findIndex(x => x.id === m.id);
  if (i >= 0) EJ_REGISTRY[i] = m; else EJ_REGISTRY.push(m);
}

// ----- Configuration choisie par le coach (stockée en JSON dans app_settings) -----
function ejCfg() {
  let c = {};
  try { c = JSON.parse(appSettings[EJ_KEY] || '{}') || {}; } catch (e) { c = {}; }
  return {
    order: Array.isArray(c.order) ? c.order.filter(x => typeof x === 'string') : [],
    hidden: Array.isArray(c.hidden) ? c.hidden.filter(x => typeof x === 'string') : [],
    titles: (c.titles && typeof c.titles === 'object') ? c.titles : {},
    opts: (c.opts && typeof c.opts === 'object') ? c.opts : {},
  };
}
// Rubriques dans l'ordre voulu ; une rubrique sans position enregistrée va à la fin (ordre de déclaration).
function ejOrdered() {
  const c = ejCfg();
  const pos = id => { const k = c.order.indexOf(id); return k < 0 ? 1e6 + EJ_REGISTRY.findIndex(m => m.id === id) : k; };
  return EJ_REGISTRY.slice().sort((a, b) => pos(a.id) - pos(b.id));
}
function ejModVisible(id) { return !ejCfg().hidden.includes(id); }
function ejModTitle(id) {
  const m = EJ_REGISTRY.find(x => x.id === id);
  const t = String(ejCfg().titles[id] || '').trim();
  return t || (m ? m.title : id);
}
// Valeur d'une option (par défaut : celle déclarée, sinon activée).
function ejOpt(modId, optId) {
  const m = EJ_REGISTRY.find(x => x.id === modId);
  const o = m && m.options.find(x => x.id === optId);
  const v = ejCfg().opts[modId + '.' + optId];
  return typeof v === 'boolean' ? v : (o ? o.def !== false : true);
}

// ----- Application à l'écran des joueurs -----
function ejApplyLayout() {
  let shown = 0;
  ejOrdered().forEach((m, i) => {
    const box = m.box && document.getElementById(m.box);
    if (!box) return;
    const vis = ejModVisible(m.id);
    box.style.order = String(i);
    box.style.display = vis ? '' : 'none';
    if (vis) shown++;
    const t = m.titleEl && document.getElementById(m.titleEl);
    if (t) t.textContent = ejModTitle(m.id);
  });
  const empty = document.getElementById('ej-empty');
  if (empty) empty.style.display = shown ? 'none' : 'block';
}

// ----- Page Réglages › Espace Joueurs › Rubriques (générée depuis le registre) -----
function ejEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function ejModulesRenderUi() {
  const el = document.getElementById('ej-modules-ui');
  if (!el) return;
  const c = ejCfg(), list = ejOrdered();
  el.innerHTML = list.map((m, k) => {
    const opts = m.options.map(o =>
      `<label class="ej-opt"><input type="checkbox" ${ejOpt(m.id, o.id) ? 'checked' : ''} onchange="ejModOpt('${m.id}','${o.id}',this.checked)"> ${ejEsc(o.label)}</label>`).join('');
    return `<div class="ej-row" data-ej="${m.id}">
      <input type="checkbox" ${c.hidden.includes(m.id) ? '' : 'checked'} aria-label="Afficher cette rubrique aux joueurs" onchange="ejModVis('${m.id}',this.checked)" style="width:18px;height:18px;">
      <span class="nm"><b>${ejEsc(m.title)}</b>${m.desc ? `<small>${ejEsc(m.desc)}</small>` : ''}</span>
      <button type="button" class="disp-mini" ${k === 0 ? 'disabled' : ''} onclick="ejModMove('${m.id}',-1)" aria-label="Monter">↑</button>
      <button type="button" class="disp-mini" ${k >= list.length - 1 ? 'disabled' : ''} onclick="ejModMove('${m.id}',1)" aria-label="Descendre">↓</button>
      <input type="text" class="ej-title-input" maxlength="60" placeholder="Titre affiché aux joueurs (vide = titre par défaut)" value="${ejEsc(c.titles[m.id] || '')}" onchange="ejModTitleSet('${m.id}',this.value)">
      ${opts ? `<div class="ej-opts">${opts}</div>` : ''}
    </div>`;
  }).join('') + `<button type="button" class="disp-mini" style="margin-top:6px;width:100%;padding:9px;" onclick="ejModReset()">Rétablir les rubriques par défaut</button>`;
}

// ----- Modifications (chaque changement est appliqué puis enregistré pour tous) -----
function ejCfgWrite(c) {
  appSettings[EJ_KEY] = JSON.stringify(c);
  ejModulesRenderUi();
  ejApplyLayout();
  ejSaveSoon();
}
function ejModVis(id, on) { const c = ejCfg(); c.hidden = c.hidden.filter(x => x !== id); if (!on) c.hidden.push(id); ejCfgWrite(c); }
function ejModTitleSet(id, v) {
  const c = ejCfg(); v = String(v || '').trim().slice(0, 60);
  if (v) c.titles[id] = v; else delete c.titles[id];
  ejCfgWrite(c);
}
function ejModOpt(id, o, on) { const c = ejCfg(); c.opts[id + '.' + o] = !!on; ejCfgWrite(c); }
function ejModMove(id, d) {
  const c = ejCfg(), ids = ejOrdered().map(m => m.id);
  const k = ids.indexOf(id), j = k + d;
  if (k < 0 || j < 0 || j >= ids.length) return;
  [ids[k], ids[j]] = [ids[j], ids[k]];
  const inconnues = c.order.filter(x => !EJ_REGISTRY.some(m => m.id === x));   // rubriques d'une autre version de l'appli : on les garde
  c.order = ids.concat(inconnues);
  ejCfgWrite(c);
}
function ejModReset() {
  if (!window.confirm('Rétablir les rubriques par défaut (ordre, titres, affichage) ?')) return;
  appSettings[EJ_KEY] = '{}';
  ejModulesRenderUi();
  ejApplyLayout();
  ejSaveSoon();
}

let ejSaveTimer = null;
function ejSaveSoon() {
  const msg = document.getElementById('ej-modules-msg');
  if (msg) { msg.style.color = 'var(--gris-texte)'; msg.textContent = 'Enregistrement…'; }
  clearTimeout(ejSaveTimer);
  ejSaveTimer = setTimeout(ejSaveNow, 700);
}
async function ejSaveNow() {
  const msg = document.getElementById('ej-modules-msg');
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ key: EJ_KEY, value: appSettings[EJ_KEY] || '{}', updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) throw new Error('save failed');
    if (msg) { msg.style.color = 'var(--vert)'; msg.textContent = '✓ Enregistré — appliqué immédiatement pour tous.'; }
  } catch (e) {
    if (msg) { msg.style.color = '#e74c3c'; msg.textContent = 'Erreur — réessaie.'; }
  }
}

// ----- Rubriques actuelles de l'Espace Joueurs (les prochaines se déclarent ici, avec ejRegister) -----
ejRegister({ id: 'presence', title: "Présence de l'équipe", desc: 'Camembert des présences de toute l’équipe', box: 'ej-mod-presence', titleEl: 'ej-mod-presence-title' });
ejRegister({ id: 'programme', title: '🗓️ Programme — objectifs collectifs', desc: 'Objectifs collectifs du mois', box: 'ej-mod-programme', titleEl: 'ej-mod-programme-title' });

ejModulesRenderUi();
ejApplyLayout();
