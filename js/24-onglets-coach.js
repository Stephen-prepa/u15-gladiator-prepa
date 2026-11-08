// Prépa U15 HBCCS — js/24-onglets-coach.js — dernière modification : version z42 (08/11/2026)
// ===================== ORGANISATION DES ONGLETS DU COACH =====================
// Chaque onglet peut être placé : rangée du haut, barre du bas, ou menu « Plus ▾ ». L'ordre se règle dans Réglages.
// Les boutons existent déjà dans index.html (ids cs-subtab-<id>) : on ne fait que les DÉPLACER (rien n'est supprimé).
// La configuration est enregistrée dans app_settings (clé coach_cfg_tabs, partagée entre tes appareils) + copie locale.
// Pour ajouter un onglet un jour : le déclarer dans TB_TABS (+ son bouton dans index.html) ; il apparaîtra en bas par défaut.
const TB_KEY = 'coach_cfg_tabs';
const TB_TABS = [
  { id: 'dashboard', ic: '🏠', name: 'Accueil', fixed: true },
  { id: 'presence', ic: '📋', name: 'Présences' },
  { id: 'seance', ic: '📝', name: 'Séance' },
  { id: 'schemas', ic: '✏️', name: 'Schémas' },
  { id: 'outils', ic: '🧩', name: 'Éq./Match' },
  { id: 'composition', ic: '🎽', name: 'Compos' },
  { id: 'stats', ic: '📊', name: 'Matchs & Stats' },
  { id: 'programme', ic: '🗓️', name: 'Programme' },
  { id: 'evaluations', ic: '🎯', name: 'Évals' },
  { id: 'reglages', ic: '⚙️', name: 'Réglages', fixed: true },
];
const TB_DEFAULT = { top: ['dashboard', 'presence', 'seance', 'schemas', 'outils', 'composition'], bottom: ['stats', 'programme', 'evaluations', 'reglages'], more: [] };
let tbCfgState = null, tbPulled = false, tbSaveTimer = null;

function tbClone(o) { return JSON.parse(JSON.stringify(o)); }
function tbById(id) { for (var i = 0; i < TB_TABS.length; i++) if (TB_TABS[i].id === id) return TB_TABS[i]; return null; }
// Rend une configuration cohérente : ids connus, sans doublon, onglets manquants ajoutés en bas, Accueil/Réglages jamais dans « Plus »
function tbNormalize(c) {
  var out = { top: [], bottom: [], more: [] }, seen = {};
  ['top', 'bottom', 'more'].forEach(function (z) {
    (c && Array.isArray(c[z]) ? c[z] : []).forEach(function (id) {
      var t = tbById(id);
      if (!t || seen[id]) return;
      seen[id] = true;
      out[(z === 'more' && t.fixed) ? (id === 'dashboard' ? 'top' : 'bottom') : z].push(id);
    });
  });
  TB_TABS.forEach(function (t) { if (!seen[t.id]) out.bottom.push(t.id); });
  return out;
}
function tbCfg() {
  if (!tbCfgState) {
    var c = null;
    try { c = JSON.parse(localStorage.getItem('tb_cfg_v1') || 'null'); } catch (e) {}
    tbCfgState = tbNormalize(c || TB_DEFAULT);
  }
  return tbCfgState;
}

// ---------- Application sur la barre d'onglets ----------
function tbMenuEl() {
  var m = document.getElementById('cs-more-menu');
  if (m) return m;
  var app = document.getElementById('coachs2-app'), bottom = document.querySelector('.coachs2-subtabs-bottom');
  if (!app || !bottom) return null;
  m = document.createElement('div');
  m.id = 'cs-more-menu';
  m.style.display = 'none';
  app.appendChild(m);
  m.addEventListener('click', function () { m.style.display = 'none'; });
  document.addEventListener('click', function (e) {
    if (m.style.display === 'none') return;
    if (e.target.closest && (e.target.closest('#cs-more-menu') || e.target.closest('#cs-subtab-plus'))) return;
    m.style.display = 'none';
  });
  return m;
}
function tbApply() {
  var top = document.querySelector('.coachs2-subtabs-top'), bot = document.querySelector('.coachs2-subtabs-bottom'), menu = tbMenuEl();
  if (!top || !bot || !menu) return;
  var cfg = tbCfg();
  var merge = typeof dispBarMerge === 'function' && dispBarMerge();
  var put = function (zone, ids) { ids.forEach(function (id) { var b = document.getElementById('cs-subtab-' + id); if (b) zone.appendChild(b); }); };
  // Grand écran (PC/Mac) : une seule rangée en haut avec tous les onglets (z42) ; pas de barre du bas ni de « Plus »
  if (merge) put(top, cfg.top.concat(cfg.bottom, cfg.more)); else { put(top, cfg.top); put(bot, cfg.bottom); put(menu, cfg.more); }
  var plus = document.getElementById('cs-subtab-plus');
  if (merge) { if (plus) plus.remove(); menu.style.display = 'none'; return; }
  if (cfg.more.length) {
    if (!plus) {
      plus = document.createElement('button');
      plus.type = 'button'; plus.className = 'cs-tab'; plus.id = 'cs-subtab-plus';
      plus.innerHTML = '<span class="cs-tab-icon">➕</span><span class="cs-tab-label">Plus ▾</span>';
      plus.onclick = function () { menu.style.display = menu.style.display === 'none' ? 'flex' : 'none'; };
    }
    bot.appendChild(plus);
  } else if (plus) { plus.remove(); menu.style.display = 'none'; }
}
// L'onglet « Plus » s'allume quand l'onglet affiché est rangé dedans
function tbMarkActive(name) {
  var plus = document.getElementById('cs-subtab-plus');
  if (!plus) return;
  var inMore = tbCfg().more.indexOf(name) !== -1;
  plus.style.border = inMore ? '1px solid var(--jaune)' : '1px solid rgba(255,255,255,0.15)';
  plus.style.background = inMore ? 'rgba(255,215,0,0.12)' : 'transparent';
  plus.style.color = inMore ? 'var(--jaune)' : 'var(--gris-clair)';
}

// ---------- Synchronisation avec la base (partagée entre appareils) ----------
async function tbPull() {
  if (tbPulled) return;
  try {
    await ensureCoachSession();
    if (!coachSession) return;
    var res = await fetch(SB_URL + '/rest/v1/app_settings?select=value&key=eq.' + TB_KEY, { headers: coachAuthHeaders() });
    if (!res.ok) return;
    tbPulled = true;
    var rows = await res.json();
    if (rows.length && rows[0].value) {
      var c = JSON.parse(rows[0].value);
      tbCfgState = tbNormalize(c);
      try { localStorage.setItem('tb_cfg_v1', JSON.stringify(tbCfgState)); } catch (e) {}
      tbApply(); tbRenderUi();
    }
  } catch (e) { /* on garde la copie locale */ }
}
function tbSaveSoon() {
  try { localStorage.setItem('tb_cfg_v1', JSON.stringify(tbCfgState)); } catch (e) {}
  var msg = document.getElementById('tb-msg');
  if (msg) { msg.style.color = 'var(--gris-texte)'; msg.textContent = 'Enregistrement…'; }
  clearTimeout(tbSaveTimer);
  tbSaveTimer = setTimeout(tbSaveNow, 700);
}
async function tbSaveNow() {
  var msg = document.getElementById('tb-msg');
  try {
    await ensureCoachSession();
    var res = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', {
      method: 'POST',
      headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify([{ key: TB_KEY, value: JSON.stringify(tbCfg()), updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) throw new Error('x');
    tbPulled = true;
    if (msg) { msg.style.color = 'var(--vert)'; msg.textContent = '✓ Enregistré — appliqué sur tous tes appareils.'; }
  } catch (e) {
    if (msg) { msg.style.color = '#e74c3c'; msg.textContent = 'Appliqué ici, mais non enregistré pour tes autres appareils — réessaie.'; }
  }
}

// ---------- Écran Réglages › Organisation des onglets ----------
function tbZoneOf(id) { var c = tbCfg(); return c.top.indexOf(id) !== -1 ? 'top' : (c.more.indexOf(id) !== -1 ? 'more' : 'bottom'); }
function tbRenderUi() {
  var box = document.getElementById('tb-ui');
  if (!box) return;
  var c = tbCfg(), zones = [['top', 'Rangée du haut'], ['bottom', 'Barre du bas (toujours visible)'], ['more', 'Menu « Plus ▾ »']];
  var html = '';
  zones.forEach(function (z) {
    html += '<div class="tb-zone">' + z[1] + '</div>';
    var ids = c[z[0]];
    if (!ids.length) html += '<div class="tb-empty">(vide)</div>';
    ids.forEach(function (id, i) {
      var t = tbById(id);
      html += '<div class="ej-row"><span class="nm">' + t.ic + ' ' + t.name + '</span>' +
        '<button class="tb-mv" ' + (i === 0 ? 'disabled' : '') + ' onclick="tbMove(\'' + id + '\',-1)" aria-label="Monter">▲</button>' +
        '<button class="tb-mv" ' + (i === ids.length - 1 ? 'disabled' : '') + ' onclick="tbMove(\'' + id + '\',1)" aria-label="Descendre">▼</button>' +
        '<select class="tb-sel" onchange="tbSetZone(\'' + id + '\',this.value)">' +
        '<option value="top"' + (z[0] === 'top' ? ' selected' : '') + '>Haut</option><option value="bottom"' + (z[0] === 'bottom' ? ' selected' : '') + '>Bas</option>' +
        (t.fixed ? '' : '<option value="more"' + (z[0] === 'more' ? ' selected' : '') + '>Plus ▾</option>') + '</select></div>';
    });
  });
  box.innerHTML = html;
}
function tbMove(id, dir) {
  var c = tbCfg(), z = tbZoneOf(id), a = c[z], i = a.indexOf(id), j = i + dir;
  if (j < 0 || j >= a.length) return;
  a.splice(i, 1); a.splice(j, 0, id);
  tbApply(); tbRenderUi(); tbSaveSoon();
}
function tbSetZone(id, zone) {
  var c = tbCfg(), z = tbZoneOf(id);
  if (z === zone) return;
  if (zone === 'more' && tbById(id).fixed) return;
  c[z].splice(c[z].indexOf(id), 1); c[zone].push(id);
  tbApply(); tbRenderUi(); tbSaveSoon();
}
function tbReset() {
  if (!window.confirm('Remettre les onglets comme à l\'origine ?')) return;
  tbCfgState = tbNormalize(tbClone(TB_DEFAULT));
  tbApply(); tbRenderUi(); tbSaveSoon();
}

tbApply();
