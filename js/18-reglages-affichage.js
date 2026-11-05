// Prépa U15 HBCCS — js/18-reglages-affichage.js — dernière modification : version z23 (05/11/2026)
// ===================== ROLE (JOUEUR / GARDIEN) =====================
function setRole(role) {
  appState.role = role;
  saveState();
  applyRole();
  sbSyncRole(role);
}
async function sbSyncRole(role) {
  if (!appState.playerCode) return;
  try {
    await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(appState.playerCode), {
      method: 'PATCH',
      headers: { ...SB_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
  } catch (e) { /* pas grave, se resynchronisera au prochain changement de role */ }
}
function applyRole() {
  const role = appState.role || 'joueur';
  document.body.classList.toggle('gb-mode', role === 'gb');
  const bj = document.getElementById('role-btn-joueur');
  const bg = document.getElementById('role-btn-gb');
  if (bj && bg) {
    bj.classList.toggle('active', role !== 'gb');
    bg.classList.toggle('active', role === 'gb');
  }
}

// ===================== ACCORDION =====================
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  if (el) { el.classList.add('active'); }
  else {
    const idx = ['planning','seances','conseils','coach'].indexOf(name);
    const tabs = document.querySelectorAll('.tab');
    if (tabs[idx]) tabs[idx].classList.add('active');
  }
  if (name === 'coach') loadCoachData();
}
function toggleSG(h) {
  const b = h.nextElementSibling;
  const c = h.querySelector('.sg-chev');
  b.classList.toggle('open'); c.classList.toggle('open');
}
function toggleSeance(h) {
  const b = h.nextElementSibling;
  const c = h.querySelector('.schev');
  b.classList.toggle('open'); c.classList.toggle('open');
}

// ===================== SÉANCE MAISON EXCEPTIONNELLE — visibilité du jour (ou d'une plage de jours) =====================
function todayDateStr() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}
function homeSeanceActiveOn(el, dateStr) {
  const start = el.dataset.onlyDate;
  if (!start) return false;
  const end = el.dataset.untilDate || start;
  return dateStr >= start && dateStr <= end; // comparaison lexicographique valide sur 'YYYY-MM-DD'
}
function showHomeSessionIfToday() {
  const todayStr = todayDateStr();
  document.querySelectorAll('#screen-home .seance[data-only-date]').forEach(el => {
    el.style.display = homeSeanceActiveOn(el, todayStr) ? '' : 'none';
  });
}

// ===================== GLOBAL PROGRESS =====================
function updateGlobalProgress() {
  const prefix = pk('done_');
  const done = Object.keys(appState).filter(k => k.startsWith(prefix)).length;
  const pct = Math.round(done/12*100);
  document.getElementById('gp-fill').style.width = pct + '%';
  document.getElementById('gp-pct').textContent = pct + '%';
  document.getElementById('gp-sub').textContent = done + ' séance(s) terminée(s) sur 12';
}

// ===================== PWA SERVICE WORKER =====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed:', err));
  });
  let swRefreshed = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swRefreshed) return;
    swRefreshed = true;
    window.location.reload();
  });
}
window.addEventListener('online', () => { flushPendingSync(); });


// ===================== AFFICHAGE (cet appareil) + MOT DE PASSE COACH =====================
const DISP_KEY = 'prepa_display_v1';
const DISP_TABS = {
  dashboard: '🏠 Accueil', presence: '📋 Présences', seance: '📝 Séance', schemas: '✏️ Schémas', outils: '🧩 Éq./Match',
  composition: '🎽 Compos', stats: '📊 Stats', programme: '🗓️ Programme', evaluations: '🎯 Évals', reglages: '⚙️ Réglages',
};
const DISP_DEFAULT_TABS = [
  ['dashboard', 'top'], ['presence', 'top'], ['seance', 'top'], ['schemas', 'top'], ['outils', 'top'], ['composition', 'top'],
  ['stats', 'bottom'], ['programme', 'bottom'], ['evaluations', 'bottom'], ['reglages', 'bottom'],
];
const DISP_SCALES = [['0.9', 'Petit'], ['1', 'Normal'], ['1.15', 'Grand'], ['1.3', 'Très grand']];
let dispCfg = null;

function dispDefaults() {
  return { theme: 'dark', scale: 1, density: 'normal', barSize: 'compact', barMode: 'auto', coach: 'light', toolOrder: [], toolHidden: [], toolSize: 'm', toolMode: 'both', toolRows: 2, keys: {}, tabs: DISP_DEFAULT_TABS.map(t => ({ id: t[0], bar: t[1], vis: true })) };
}
function dispNormalize(c) {
  const d = dispDefaults();
  c = (c && typeof c === 'object') ? c : {};
  const out = {
    theme: ['auto', 'light', 'dark'].includes(c.theme) ? c.theme : d.theme,
    scale: [0.9, 1, 1.15, 1.3].includes(Number(c.scale)) ? Number(c.scale) : 1,
    density: ['compact', 'normal', 'comfortable'].includes(c.density) ? c.density : 'normal',
    barSize: ['compact', 'normal'].includes(c.barSize) ? c.barSize : 'compact',
    coach: ['light', 'soft', 'dark'].includes(c.coach) ? c.coach : 'light',
    barMode: ['auto', 'bottom', 'merge'].includes(c.barMode) ? c.barMode : 'auto',
    toolOrder: Array.isArray(c.toolOrder) ? c.toolOrder.filter(x => typeof x === 'string') : [],
    toolHidden: Array.isArray(c.toolHidden) ? c.toolHidden.filter(x => typeof x === 'string') : [],
    toolSize: ['s', 'm', 'l'].includes(c.toolSize) ? c.toolSize : 'm',
    toolMode: ['both', 'icon', 'text'].includes(c.toolMode) ? c.toolMode : 'both',
    toolRows: [1, 2, 3].includes(Number(c.toolRows)) ? Number(c.toolRows) : 2,
    keys: (c.keys && typeof c.keys === 'object' && !Array.isArray(c.keys)) ? Object.keys(c.keys).reduce((o, k) => { if (typeof c.keys[k] === 'string') o[k] = c.keys[k]; return o; }, {}) : {},
    tabs: [],
  };
  const seen = {};
  (Array.isArray(c.tabs) ? c.tabs : []).forEach(t => {
    if (!t || !DISP_TABS[t.id] || seen[t.id]) return;
    seen[t.id] = 1;
    out.tabs.push({ id: t.id, bar: t.bar === 'bottom' ? 'bottom' : 'top', vis: t.vis !== false });
  });
  d.tabs.forEach(t => { if (!seen[t.id]) out.tabs.push(t); });
  out.tabs.forEach(t => { if (t.id === 'reglages') t.vis = true; });
  return out;
}
function dispLoad() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(DISP_KEY) || 'null'); } catch (e) {}
  dispCfg = dispNormalize(raw);
}
function dispSave() {
  try { localStorage.setItem(DISP_KEY, JSON.stringify(dispCfg)); } catch (e) {}
}
function dispBaseZoom() {
  const w = window.innerWidth;
  return w >= 1400 ? 1.3 : w >= 1100 ? 1.18 : w >= 700 ? 1.08 : 1;
}
function dispApplyTheme() {
  let t = dispCfg.theme;
  if (t === 'auto') t = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'light' ? '#EEF2F8' : '#003F8A');
}
function dispApplyScale() {
  if (!document.body) return;
  document.body.style.zoom = dispCfg.scale === 1 ? '' : String(Math.round(dispBaseZoom() * dispCfg.scale * 1000) / 1000);
}
function dispApplyDensity() {
  document.documentElement.setAttribute('data-density', dispCfg.density);
  document.documentElement.setAttribute('data-bar', dispCfg.barSize || 'compact');
  document.documentElement.setAttribute('data-coach', dispCfg.coach || 'light');
}
// Barre du bas fusionnée avec la barre du haut : sur grand écran (PC, iMac, iPad en paysage) en mode Auto
function dispBarMerge() { const m = dispCfg && dispCfg.barMode; return m === 'merge' || ((!m || m === 'auto') && window.innerWidth >= 1000); }
let dispLastMerge = null;
function dispTabVisible(b) {
  return b && !b.classList.contains('disp-hide') && b.style.display !== 'none';
}
function dispApplyTabs() {
  const top = document.querySelector('.coachs2-subtabs-top');
  const bot = document.querySelector('.coachs2-subtabs-bottom');
  if (!top || !bot) return;
  const merge = dispBarMerge(); dispLastMerge = merge;
  dispCfg.tabs.forEach(t => {
    const b = document.getElementById('cs-subtab-' + t.id);
    if (!b) return;
    (t.bar === 'bottom' && !merge ? bot : top).appendChild(b);
    b.classList.toggle('disp-hide', !t.vis);
  });
  const any = bar => Array.from(bar.children).some(dispTabVisible);
  top.style.display = any(top) ? '' : 'none';
  bot.style.display = any(bot) ? '' : 'none';
  const wrap = document.querySelector('.coachs2-wrap');
  if (wrap) wrap.classList.toggle('no-bottom-bar', !any(bot));
}
function dispFirstTab() {
  const t = dispCfg && dispCfg.tabs.find(x => x.vis && dispTabVisible(document.getElementById('cs-subtab-' + x.id)));
  return t ? t.id : 'reglages';
}
function dispApply() {
  dispApplyTheme(); dispApplyScale(); dispApplyDensity(); dispApplyTabs();
}
function dispInit() {
  dispLoad();
  dispApply();
  window.addEventListener('resize', dispApplyScale);
  window.addEventListener('resize', () => { if (dispBarMerge() !== dispLastMerge) dispApplyTabs(); });
  window.addEventListener('orientationchange', () => setTimeout(dispApplyScale, 200));
  try {
    const mq = matchMedia('(prefers-color-scheme: light)');
    const h = () => { if (dispCfg.theme === 'auto') dispApplyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', h); else if (mq.addListener) mq.addListener(h);
  } catch (e) {}
}
function dispSet(key, val) {
  dispCfg[key] = val;
  dispSave(); dispApply(); dispRenderUi();
}
function dispTabSet(id, key, val) {
  const t = dispCfg.tabs.find(x => x.id === id);
  if (!t) return;
  if (id === 'reglages' && key === 'vis') return;
  t[key] = val;
  dispSave(); dispApplyTabs();
  const act = Object.keys(DISP_TABS).find(k => { const bx = document.getElementById('cs-box-' + k); return bx && !bx.classList.contains('cs-hide'); });
  if (act !== 'reglages' && act && !dispTabVisible(document.getElementById('cs-subtab-' + act))) coachSubtabSwitch(dispFirstTab());
  dispRenderUi();
}
function dispTabMove(id, dir) {
  const arr = dispCfg.tabs;
  const i = arr.findIndex(x => x.id === id);
  if (i < 0) return;
  let j = i + dir;
  while (j >= 0 && j < arr.length && arr[j].bar !== arr[i].bar) j += dir;
  if (j < 0 || j >= arr.length) return;
  const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  dispSave(); dispApplyTabs(); dispRenderUi();
}
function dispToolRefresh() { try { if (typeof schEd !== 'undefined' && schEd && schEd.el) schEdTools(); } catch (e) {} }
function dispToolMove(id, dir) {
  const o = schToolOrder(), i = o.indexOf(id); if (i < 0) return;
  const j = dir === 'top' ? 0 : i + dir; if (j < 0 || j >= o.length || j === i) return;
  o.splice(i, 1); o.splice(j, 0, id);
  dispCfg.toolOrder = o; dispSave(); dispRenderUi(); dispToolRefresh();
}
let dispKeyCap = null, dispKeysOpen = false, dispKeyMsg = '';
function dispKeyStart(id) { dispKeyStop(); dispKeyCap = id; dispKeyMsg = ''; document.addEventListener('keydown', dispKeyOnKey, true); dispRenderUi(); }
function dispKeyStop() { dispKeyCap = null; document.removeEventListener('keydown', dispKeyOnKey, true); }
function dispKeyCancel() { dispKeyStop(); dispKeyMsg = ''; dispRenderUi(); }
function dispKeyOnKey(e) {
  if (!dispKeyCap) return; e.preventDefault(); e.stopPropagation();
  if (e.key === 'Escape') { dispKeyCancel(); return; }
  const c = schKeyCombo(e); if (!c) return; // touche de modification seule : on attend la suivante
  const base = c.split('+').pop();
  if (SCH_KEY_RESERVED.includes(base)) { dispKeyMsg = '« ' + schKeyLabel(base) + ' » est réservée (Échap, Suppr, Retour arrière, Tab, Entrée). Choisis une autre touche.'; dispRenderUi(); return; }
  dispKeySet(dispKeyCap, c);
}
function dispKeySet(id, c) {
  dispCfg.keys = Object.assign({}, dispCfg.keys); let moved = '';
  schKeyActions().forEach(a => { if (a.id !== id && c && schKeyOf(a.id) === c) { dispCfg.keys[a.id] = ''; moved = a.label; } });
  dispCfg.keys[id] = c; dispSave(); dispKeyStop();
  dispKeyMsg = '✓ ' + schKeyLabel(c) + ' attribuée' + (moved ? ' (retirée de « ' + moved + ' »)' : ''); dispRenderUi(); dispToolRefresh();
}
function dispKeyClear(id) { dispCfg.keys = Object.assign({}, dispCfg.keys, { [id]: '' }); dispSave(); dispKeyMsg = ''; dispRenderUi(); dispToolRefresh(); }
function dispKeyReset() { dispKeyStop(); dispCfg.keys = {}; dispSave(); dispKeyMsg = 'Raccourcis remis par défaut'; dispRenderUi(); dispToolRefresh(); }
function dispToolReset() { Object.assign(dispCfg, { toolOrder: [], toolHidden: [], toolSize: 'm', toolMode: 'both', toolRows: 2 }); dispSave(); dispRenderUi(); dispToolRefresh(); }
function dispToolSet(key, val) { dispCfg[key] = val; dispSave(); dispRenderUi(); dispToolRefresh(); }
function dispToolHide(id, hide) { const h = (dispCfg.toolHidden || []).filter(x => x !== id); if (hide) h.push(id); dispCfg.toolHidden = h; dispSave(); dispRenderUi(); dispToolRefresh(); }
function dispReset() {
  if (!window.confirm("Rétablir l'affichage par défaut sur cet appareil ?")) return;
  dispCfg = dispDefaults();
  dispSave(); dispApply(); dispRenderUi();
}
function dispRenderUi() {
  const el = document.getElementById('disp-ui');
  if (!el || !dispCfg) return;
  const chip = (on, label, fn) => `<button type="button" class="disp-chip${on ? ' on' : ''}" onclick="${fn}">${label}</button>`;
  const lab = t => `<div style="font-size:12px;font-weight:700;color:var(--gris-clair);margin:12px 0 6px;">${t}</div>`;
  let h = '';
  h += lab('Thème');
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    chip(dispCfg.theme === 'auto', '🌗 Auto', "dispSet('theme','auto')") +
    chip(dispCfg.theme === 'light', '☀️ Clair', "dispSet('theme','light')") +
    chip(dispCfg.theme === 'dark', '🌙 Sombre', "dispSet('theme','dark')") + `</div>`;
  h += `<div style="font-size:10px;color:var(--gris-texte);margin-top:5px;">Auto suit le réglage de l'appareil. Le thème clair est en test : quelques écrans peuvent rester à peaufiner.</div>`;
  h += lab('Apparence de l’espace coach');
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    chip(dispCfg.coach === 'light', '☀️ Clair', "dispSet('coach','light')") + chip(dispCfg.coach === 'soft', '🌫️ Doux', "dispSet('coach','soft')") + chip(dispCfg.coach === 'dark', '🌙 Sombre', "dispSet('coach','dark')") + `</div>`;
  h += `<div style="font-size:10px;color:var(--gris-texte);margin-top:5px;">Doux : fond gris-beige et cartes crème, moins éblouissant que le blanc. Sombre : l’ancienne apparence bleu nuit.</div>`;
  h += lab('Taille du texte et des éléments');
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    DISP_SCALES.map(s => chip(dispCfg.scale === Number(s[0]), s[1], `dispSet('scale',${s[0]})`)).join('') + `</div>`;
  h += lab('Densité');
  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    chip(dispCfg.density === 'compact', 'Compact', "dispSet('density','compact')") +
    chip(dispCfg.density === 'normal', 'Normal', "dispSet('density','normal')") +
    chip(dispCfg.density === 'comfortable', 'Confortable', "dispSet('density','comfortable')") + `</div>`;
  h += lab('Barre du bas (Stats, Programme, Évals, Réglages)');
  h += `<div style="font-size:11px;color:var(--gris-clair);margin:2px 0 4px;">Taille</div><div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    chip(dispCfg.barSize === 'compact', 'Compacte', "dispSet('barSize','compact')") + chip(dispCfg.barSize === 'normal', 'Normale', "dispSet('barSize','normal')") + `</div>`;
  h += `<div style="font-size:11px;color:var(--gris-clair);margin:8px 0 4px;">Position</div><div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    chip(dispCfg.barMode === 'auto', 'Auto', "dispSet('barMode','auto')") + chip(dispCfg.barMode === 'bottom', 'Toujours en bas', "dispSet('barMode','bottom')") + chip(dispCfg.barMode === 'merge', 'Sur la ligne du haut', "dispSet('barMode','merge')") + `</div>`;
  h += `<div style="font-size:10px;color:var(--gris-texte);margin-top:5px;">Auto : en bas sur téléphone et iPad vertical, sur la même ligne que les autres onglets sur ordinateur et iPad horizontal.</div>`;
  h += lab('Onglets de l’espace coach');
  h += `<div style="font-size:10px;color:var(--gris-texte);margin-bottom:6px;">Coche pour afficher · choisis la barre (haut ou bas) · flèches pour l'ordre. Réglages reste toujours visible.</div>`;
  dispCfg.tabs.forEach(t => {
    const sameBar = dispCfg.tabs.filter(x => x.bar === t.bar);
    const k = sameBar.findIndex(x => x.id === t.id);
    h += `<div class="disp-row" data-tab="${t.id}">
      <input type="checkbox" ${t.vis ? 'checked' : ''} ${t.id === 'reglages' ? 'disabled' : ''} onchange="dispTabSet('${t.id}','vis',this.checked)" style="width:18px;height:18px;">
      <span class="nm">${DISP_TABS[t.id]}</span>
      <button type="button" class="disp-mini" onclick="dispTabSet('${t.id}','bar','${t.bar === 'top' ? 'bottom' : 'top'}')">${t.bar === 'top' ? 'Haut' : 'Bas'}</button>
      <button type="button" class="disp-mini" ${k <= 0 ? 'disabled' : ''} onclick="dispTabMove('${t.id}',-1)">↑</button>
      <button type="button" class="disp-mini" ${k >= sameBar.length - 1 ? 'disabled' : ''} onclick="dispTabMove('${t.id}',1)">↓</button>
    </div>`;
  });
  h += lab('Outils de la planche tactique');
  const tp = schToolPrefs();
  h += `<div style="font-size:11px;color:var(--gris-clair);margin:2px 0 4px;">Affichage</div><div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    chip(tp.mode === 'both', 'Icône + texte', "dispToolSet('toolMode','both')") + chip(tp.mode === 'icon', 'Icône seule', "dispToolSet('toolMode','icon')") + chip(tp.mode === 'text', 'Texte seul', "dispToolSet('toolMode','text')") + `</div>`;
  h += `<div style="font-size:11px;color:var(--gris-clair);margin:8px 0 4px;">Taille des boutons</div><div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    chip(tp.size === 's', 'Compacts', "dispToolSet('toolSize','s')") + chip(tp.size === 'm', 'Normaux', "dispToolSet('toolSize','m')") + chip(tp.size === 'l', 'Grands', "dispToolSet('toolSize','l')") + `</div>`;
  h += `<div style="font-size:11px;color:var(--gris-clair);margin:8px 0 4px;">Lignes d'outils sous la planche</div><div style="display:flex;gap:6px;flex-wrap:wrap;">` +
    [1, 2, 3].map(n => chip(tp.rows === n, String(n), `dispToolSet('toolRows',${n})`)).join('') + `</div>`;
  h += `<div style="font-size:11px;color:var(--gris-clair);margin:10px 0 4px;">Ordre et choix des outils</div>`;
  h += `<div style="font-size:10px;color:var(--gris-texte);margin-bottom:6px;">Coche pour afficher dans la barre · ⤒ ↑ ↓ pour l'ordre (le premier est en haut à gauche). Décoché ou ne tenant pas dans les lignes : rangé sous « Plus ».</div>`;
  try {
    const to = schToolOrder();
    to.forEach((id, k) => {
      const ico = id[0] === '@' ? '⊞' : id === 'select' ? '☝' : id === 'multi' ? '⬚' : id === 'pan' ? '✥' : schToolIcon(id);
      h += `<div class="disp-row" data-tool="${id}">
        <input type="checkbox" ${tp.hidden.includes(id) ? '' : 'checked'} onchange="dispToolHide('${id}',!this.checked)" style="width:18px;height:18px;" aria-label="Afficher dans la barre">
        <span class="disp-ico">${ico}</span><span class="nm">${schToolLabel(id).replace(/^[⊞☝⬚✥] /, '')}</span>
        <button type="button" class="disp-mini" ${k === 0 ? 'disabled' : ''} onclick="dispToolMove('${id}','top')" aria-label="Tout en haut">⤒</button>
        <button type="button" class="disp-mini" ${k === 0 ? 'disabled' : ''} onclick="dispToolMove('${id}',-1)" aria-label="Monter">↑</button>
        <button type="button" class="disp-mini" ${k >= to.length - 1 ? 'disabled' : ''} onclick="dispToolMove('${id}',1)" aria-label="Descendre">↓</button>
      </div>`;
    });
    h += `<button type="button" class="disp-mini" style="margin-top:6px;width:100%;padding:9px;" onclick="dispToolReset()">Outils : tout remettre par défaut</button>`;
  } catch (e) {}
  try {
    h += `<details class="disp-keys" ${dispKeysOpen ? 'open' : ''} ontoggle="dispKeysOpen=this.open" style="margin-top:14px;"><summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--gris-clair);">⌨️ Raccourcis clavier (ordinateur)</summary>`;
    h += `<div style="font-size:10px;color:var(--gris-texte);margin:6px 0;">Touche « Définir » puis appuie sur la touche voulue (avec Maj ou Alt si tu veux). Sans Ctrl / ⌘. Une touche déjà prise est reprise à l'autre action. Fixes : Ctrl+Z / Ctrl+Y (annuler / rétablir), Suppr (supprimer), Échap (désélectionner).</div>`;
    if (dispKeyMsg) h += `<div style="font-size:12px;color:var(--jaune);margin-bottom:6px;">${dispKeyMsg}</div>`;
    let grp = '';
    schKeyActions().forEach(a => {
      if (a.group !== grp) { grp = a.group; h += `<div style="font-size:11px;color:var(--gris-clair);margin:10px 0 4px;">${grp}</div>`; }
      const k = schKeyOf(a.id), cap = dispKeyCap === a.id;
      h += `<div class="disp-row" data-key="${a.id}"><span class="nm">${a.label}</span>`
        + (cap ? `<span class="disp-kbd cap">Appuie sur une touche…</span><button type="button" class="disp-mini" onclick="dispKeyCancel()">Annuler</button>`
          : `<span class="disp-kbd ${k ? '' : 'none'}">${k ? schKeyLabel(k) : '—'}</span><button type="button" class="disp-mini" onclick="dispKeyStart('${a.id}')">Définir</button><button type="button" class="disp-mini" ${k ? '' : 'disabled'} onclick="dispKeyClear('${a.id}')" aria-label="Effacer">✕</button>`)
        + `</div>`;
    });
    h += `<button type="button" class="disp-mini" style="margin-top:8px;width:100%;padding:9px;" onclick="dispKeyReset()">Raccourcis : tout remettre par défaut</button></details>`;
  } catch (e) {}
  h += `<button type="button" class="disp-mini" style="margin-top:10px;width:100%;padding:9px;" onclick="dispReset()">Rétablir l'affichage par défaut</button>`;
  el.innerHTML = h;
}

// ---------- Mot de passe des coachs ----------
function pwVal(id) { const e = document.getElementById(id); return e ? e.value : ''; }
function pwMsg(id, text, ok) {
  const e = document.getElementById(id);
  if (!e) return;
  e.textContent = text || '';
  e.style.color = ok ? '#2ecc71' : '#e74c3c';
}
async function pwRpc(fn, args, withCoach) {
  const headers = { apikey: SB_KEY, 'Content-Type': 'application/json' };
  if (withCoach) {
    const sess = await ensureCoachSession();
    if (!sess) { const er = new Error('session'); er.status = 401; throw er; }
    headers.Authorization = 'Bearer ' + sess.access_token;
  } else {
    headers.Authorization = 'Bearer ' + SB_KEY;
  }
  const res = await fetch(SB_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers, body: JSON.stringify(args) });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const er = new Error((data && (data.message || data.hint)) || ('HTTP ' + res.status));
    er.status = res.status; er.code = data && data.code;
    throw er;
  }
  return data;
}
function pwErrText(e) {
  if (e && (e.code === 'PGRST202' || e.status === 404)) return "Fonction pas encore installée côté Supabase (le SQL de récupération n'a pas été exécuté).";
  if (e && e.status === 401) return 'Session expirée : reconnecte-toi.';
  if (e && /trop court/.test(e.message || '')) return 'Mot de passe trop court (8 caractères minimum).';
  if (e && /introuvable/.test(e.message || '')) return 'Coach introuvable.';
  if (e && /non autoris/.test(e.message || '')) return 'Action non autorisée pour ce compte.';
  if (e instanceof TypeError) return 'Connexion impossible — vérifie ta connexion internet.';
  return 'Échec : ' + ((e && e.message) || 'erreur inconnue');
}
function pwGenValue() {
  const al = 'abcdefghjkmnpqrstuvwxyz23456789';
  const a = new Uint32Array(10);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a).map(x => al[x % al.length]).join('');
}
function pwGen() { const e = document.getElementById('pw-help-pw'); if (e) e.value = pwGenValue(); }
function pwUiInit() {
  const sel = document.getElementById('pw-help-who');
  if (sel) {
    const me = coachSession && coachSession.login;
    sel.innerHTML = COACH_LOGINS.filter(c => c.login !== me).map(c => `<option value="${c.login}">${c.name}</option>`).join('');
  }
}
async function pwChange() {
  const o = pwVal('pw-old'), n = pwVal('pw-new'), c = pwVal('pw-new2');
  const btn = document.getElementById('pw-change-btn');
  if (!coachSession) { pwMsg('pw-change-msg', 'Reconnecte-toi.', false); return; }
  if (!o) { pwMsg('pw-change-msg', 'Entre ton mot de passe actuel.', false); return; }
  if (n.length < 8) { pwMsg('pw-change-msg', 'Nouveau mot de passe : 8 caractères minimum.', false); return; }
  if (n !== c) { pwMsg('pw-change-msg', 'La confirmation ne correspond pas.', false); return; }
  if (n === o) { pwMsg('pw-change-msg', "Le nouveau mot de passe doit être différent de l'actuel.", false); return; }
  btn.disabled = true; pwMsg('pw-change-msg', 'Vérification...', true);
  try {
    const r1 = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: coachSession.login + '@hbccs.local', password: o }),
    });
    const d1 = await r1.json();
    if (!r1.ok || !d1.access_token) { pwMsg('pw-change-msg', 'Mot de passe actuel incorrect.', false); return; }
    const r2 = await fetch(SB_URL + '/auth/v1/user', {
      method: 'PUT', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + d1.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: n }),
    });
    if (!r2.ok) {
      let d2 = {}; try { d2 = await r2.json(); } catch (e) {}
      pwMsg('pw-change-msg', 'Refusé : ' + (d2.msg || d2.message || ('HTTP ' + r2.status)), false);
      return;
    }
    coachSession.access_token = d1.access_token;
    coachSession.refresh_token = d1.refresh_token;
    coachSession.expires_at = Date.now() + (d1.expires_in || 3600) * 1000;
    saveCoachSession();
    ['pw-old', 'pw-new', 'pw-new2'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    pwMsg('pw-change-msg', 'Mot de passe changé ✓', true);
  } catch (e) {
    pwMsg('pw-change-msg', pwErrText(e), false);
  } finally { btn.disabled = false; }
}
async function pwMakeCode() {
  if (!window.confirm("Générer un nouveau code de secours ? L'ancien (s'il existe) ne fonctionnera plus.")) return;
  const btn = document.getElementById('pw-code-btn');
  btn.disabled = true; pwMsg('pw-code-msg', '', true);
  try {
    const code = await pwRpc('coach_make_recovery_code', {}, true);
    document.getElementById('pw-code-val').textContent = String(code);
    document.getElementById('pw-code-box').style.display = 'block';
    pwMsg('pw-code-msg', 'Code généré ✓', true);
  } catch (e) {
    pwMsg('pw-code-msg', pwErrText(e), false);
  } finally { btn.disabled = false; }
}
function pwCopyCode() {
  const t = (document.getElementById('pw-code-val') || {}).textContent || '';
  try { navigator.clipboard.writeText(t).then(() => pwMsg('pw-code-msg', 'Copié ✓', true), () => pwMsg('pw-code-msg', 'Copie impossible : note-le à la main.', false)); }
  catch (e) { pwMsg('pw-code-msg', 'Copie impossible : note-le à la main.', false); }
}
async function pwHelp() {
  const who = pwVal('pw-help-who'), pw = pwVal('pw-help-pw');
  const btn = document.getElementById('pw-help-btn');
  if (!who) { pwMsg('pw-help-msg', 'Choisis un coach.', false); return; }
  if (pw.length < 8) { pwMsg('pw-help-msg', 'Mot de passe provisoire : 8 caractères minimum.', false); return; }
  const name = (COACH_LOGINS.find(c => c.login === who) || {}).name || who;
  if (!window.confirm('Définir ce mot de passe provisoire pour ' + name + ' ? Il sera déconnecté de ses appareils.')) return;
  btn.disabled = true;
  try {
    await pwRpc('coach_set_password', { target_login: who, new_password: pw }, true);
    pwMsg('pw-help-msg', 'Fait ✓ Donne ce mot de passe à ' + name + ' : ' + pw + ' — il pourra le changer dans Réglages.', true);
  } catch (e) {
    pwMsg('pw-help-msg', pwErrText(e), false);
  } finally { btn.disabled = false; }
}
function pwForgotWho() {
  const w = document.getElementById('coachs2-forgot-who');
  if (w) w.textContent = (COACH_LOGINS.find(c => c.login === coachAuthSelectedLogin) || {}).name || '';
}
function pwForgotToggle() {
  const b = document.getElementById('coachs2-forgot');
  if (!b) return;
  b.style.display = b.style.display === 'none' ? 'block' : 'none';
  pwForgotWho();
}
async function pwForgotSubmit() {
  const code = pwVal('pw-f-code').trim(), n = pwVal('pw-f-new'), c = pwVal('pw-f-new2');
  const btn = document.getElementById('pw-f-btn');
  const login = coachAuthSelectedLogin || COACH_LOGINS[0].login;
  if (!code) { pwMsg('pw-f-msg', 'Entre ton code de secours.', false); return; }
  if (n.length < 8) { pwMsg('pw-f-msg', 'Nouveau mot de passe : 8 caractères minimum.', false); return; }
  if (n !== c) { pwMsg('pw-f-msg', 'La confirmation ne correspond pas.', false); return; }
  btn.disabled = true; pwMsg('pw-f-msg', 'Vérification...', true);
  try {
    const ok = await pwRpc('coach_reset_with_code', { target_login: login, code, new_password: n }, false);
    if (ok === true) {
      ['pw-f-code', 'pw-f-new', 'pw-f-new2'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
      document.getElementById('coachs2-forgot').style.display = 'none';
      pwMsg('pw-f-msg', '', true);
      const er = document.getElementById('coachs2-login-error');
      er.style.color = '#2ecc71';
      er.textContent = 'Mot de passe changé ✓ Connecte-toi avec le nouveau. Pense à générer un nouveau code de secours (Réglages).';
    } else {
      pwMsg('pw-f-msg', 'Code invalide, déjà utilisé, ou compte bloqué 15 min après 5 essais ratés. Sinon, demande à un autre coach de te dépanner.', false);
    }
  } catch (e) {
    pwMsg('pw-f-msg', pwErrText(e), false);
  } finally { btn.disabled = false; }
}

