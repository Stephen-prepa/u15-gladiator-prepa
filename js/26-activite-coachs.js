// Prépa U15 HBCCS — js/26-activite-coachs.js — dernière modification : version z74 (23/11/2026)
// ===================== JOURNAL D'ACTIVITÉ DES COACHS (z74) =====================
// Enregistre, pour Sandrine / Arthur / Nicolas (pas Stephen), les pages ouvertes et les écritures faites dans l'appli.
// Table coach_activity : chaque coach peut y écrire pour lui-même ; seul Stephen peut la lire (RLS). Historique gardé 90 jours.
// Écrit pour les navigateurs anciens (pas de ?. ni ??).
var ACT_PAGES = { dashboard: 'Tableau de bord', presence: 'Présences', stats: 'Matchs & Stats', programme: 'Programme', seance: 'Séance', schemas: 'Schémas', composition: 'Compos', evaluations: 'Évals', reglages: 'Réglages', outils: 'Éq./Match' };
var ACT_TABLES = { players: 'fiches joueurs', presences: 'présences', evaluations: 'évaluations', seance_plans: 'séances', exercices_schemas: 'schémas', match_notes: 'notes d\'analyse', matches: 'matchs', match_lineup: 'compos de match', outils_composition: 'compos', outils_goals: 'objectifs d\'équipe', session_notes: 'notes de séance', physical_tests: 'tests physiques', objectif_progress: 'objectifs', programme_saison: 'programme', contenus_joueurs: 'contenus joueurs', questions_joueurs: 'questions joueurs', app_settings: 'réglages' };
var actSeen = {};
var actRawFetch = window.fetch.bind(window);

function actWho() { return coachSession && coachSession.login && coachSession.login !== 'stephen' ? coachSession : null; }
function actLog(kind, label) {
  try {
    var s = actWho(); if (!s || !s.access_token) return;
    var k = kind + '|' + label, now = Date.now();
    if (actSeen[k] && now - actSeen[k] < 60000) return;   // une même ligne au plus par minute
    actSeen[k] = now;
    actRawFetch(SB_URL + '/rest/v1/coach_activity', {
      method: 'POST', keepalive: true,
      headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ coach_name: s.name || s.login, kind: kind, label: String(label).slice(0, 200) })
    }).catch(function () {});
  } catch (e) { /* le journal ne doit jamais gêner l'appli */ }
}
// Ouverture de l'appli : une ligne « session » au plus toutes les 30 minutes
function actSessionPing() {
  try {
    if (!actWho()) return;
    var last = Number(localStorage.getItem('u15_actSess') || 0);
    if (Date.now() - last < 30 * 60000) return;
    localStorage.setItem('u15_actSess', String(Date.now()));
    actLog('session', 'Ouverture de l\'appli');
  } catch (e) {}
}
// Écritures : on regarde passer les appels réseau d'écriture vers Supabase
window.fetch = function (input, init) {
  try {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var m = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (actWho() && m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') {
      if (url.indexOf('/functions/v1/ffhb-sync') >= 0) actLog('action', 'Mise à jour des données FFHB');
      else {
        var t = /\/rest\/v1\/([a-z_]+)/.exec(url);
        if (t && t[1] !== 'coach_activity' && ACT_TABLES[t[1]]) actLog('action', (m === 'DELETE' ? 'Suppression' : 'Enregistrement') + ' : ' + ACT_TABLES[t[1]]);
      }
    }
  } catch (e) {}
  return actRawFetch(input, init);
};
// Pages : onglets coach et écran Analyse
(function () {
  if (typeof coachSubtabSwitch === 'function') {
    var cs = coachSubtabSwitch;
    coachSubtabSwitch = function (name) { actSessionPing(); actLog('page', ACT_PAGES[name] || String(name)); var r = cs.apply(this, arguments); if (name === 'reglages') { try { actUiInit(); } catch (e) {} } return r; };
  }
  if (typeof anEnter === 'function') {
    var ae = anEnter;
    anEnter = function () { actSessionPing(); actLog('page', 'Analyse'); return ae.apply(this, arguments); };
  }
})();

// ---- Écran de Stephen : Réglages › Activité des coachs ----
var actRows = [];
function actEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function actUiInit() {
  var box = document.getElementById('act-box'); if (!box) return;
  var me = coachSession && coachSession.login === 'stephen';
  box.style.display = me ? '' : 'none';
  if (!me) return;
  var ui = document.getElementById('act-ui');
  if (ui && !ui.getAttribute('data-ok')) {
    ui.setAttribute('data-ok', '1');
    ui.innerHTML = '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">'
      + '<select id="act-who" onchange="actRender()" style="flex:1;min-width:120px;padding:8px;border-radius:8px;"><option value="">Tous les coachs</option><option>Sandrine</option><option>Arthur</option><option>Nicolas</option></select>'
      + '<select id="act-per" onchange="actRender()" style="flex:1;min-width:120px;padding:8px;border-radius:8px;"><option value="1">Aujourd\'hui</option><option value="7" selected>7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 jours</option></select>'
      + '<button type="button" onclick="actLoad()" style="padding:8px 12px;border:none;border-radius:8px;background:var(--jaune);color:var(--c-onacc,#1a1a1a);font-weight:800;cursor:pointer;">Actualiser</button></div>'
      + '<div id="act-sum" style="margin-bottom:10px;"></div><div id="act-list" style="font-size:12px;color:var(--gris-clair);"></div>';
  }
  actLoad();
}
async function actLoad() {
  var l = document.getElementById('act-list'); if (!l) return;
  l.textContent = 'Chargement…';
  try {
    await ensureCoachSession();
    var since = new Date(Date.now() - 90 * 86400000).toISOString();
    var r = await actRawFetch(SB_URL + '/rest/v1/coach_activity?select=coach_name,at,kind,label&at=gte.' + encodeURIComponent(since) + '&order=at.desc&limit=1000', { headers: coachAuthHeaders() });
    if (!r.ok) throw new Error('x');
    actRows = await r.json(); actRender();
    actRawFetch(SB_URL + '/rest/v1/coach_activity?at=lt.' + encodeURIComponent(since), { method: 'DELETE', headers: coachAuthHeaders() }).catch(function () {});   // purge > 90 jours
  } catch (e) { l.textContent = 'Impossible de charger le journal — réessaie.'; }
}
function actFmt(iso) {
  var d = new Date(iso), j = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()], p = function (n) { return (n < 10 ? '0' : '') + n; };
  return j + ' ' + p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function actRender() {
  var l = document.getElementById('act-list'), s = document.getElementById('act-sum'); if (!l || !s) return;
  var who = document.getElementById('act-who').value, days = Number(document.getElementById('act-per').value);
  var from = days === 1 ? new Date(new Date().setHours(0, 0, 0, 0)).getTime() : Date.now() - days * 86400000;
  var last = {};
  actRows.forEach(function (x) { if (!last[x.coach_name]) last[x.coach_name] = x.at; });
  s.innerHTML = ['Sandrine', 'Arthur', 'Nicolas'].map(function (n) {
    return '<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);font-size:13px;"><b>' + n + '</b> — ' + (last[n] ? 'dernière activité ' + actFmt(last[n]) : 'aucune activité sur 90 jours') + '</div>';
  }).join('');
  var rows = actRows.filter(function (x) { return (!who || x.coach_name === who) && new Date(x.at).getTime() >= from; });
  if (!rows.length) { l.textContent = 'Rien sur cette période.'; return; }
  var ico = { session: '🔑', page: '📄', action: '✏️' };
  l.innerHTML = rows.slice(0, 300).map(function (x) {
    return '<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">' + actFmt(x.at) + ' · <b>' + actEsc(x.coach_name) + '</b> · ' + (ico[x.kind] || '') + ' ' + actEsc(x.label) + '</div>';
  }).join('') + (rows.length > 300 ? '<div style="padding:6px 0;">… ' + (rows.length - 300) + ' lignes plus anciennes non affichées.</div>' : '');
}
