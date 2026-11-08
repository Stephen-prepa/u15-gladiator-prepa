// Prépa U15 HBCCS — js/23-matchs-stats.js — dernière modification : version z42 (08/11/2026)
// ===================== MATCHS & STATS (U15 : équipe 1 et équipe 2) =====================
// Onglet « Matchs & Stats » de l'espace coach : mes matchs (score, mi-temps, tiers-temps, points, feuille de match PDF),
// classement de poule journée par journée, et gestion des liens FFHandball.
// Les données viennent de la fonction serveur `ffhb-sync` (bouton « Mettre à jour »). Écrit pour les navigateurs anciens (pas de ?. ni ??).
const MS_BAREME_KEY = 'coach_cfg_bareme';
const MS_CLUB = 'CLERMONT SALAGOU';
const msState = { view: 'matchs', eq: '1', src: null, j: null, data: null, busy: false, jd: null, jeq: 'all', jopen: null, jlay: 'A', jper: 'all', jsort: 'b', jdir: -1 };
try { var _jl = localStorage.getItem('ms_jlay_v1'); if (_jl === 'A' || _jl === 'B' || _jl === 'C') msState.jlay = _jl; } catch (e) {}
try { var _v = localStorage.getItem('ms_view_v1'); if (_v === 'joueurs' || _v === 'matchs') msState.view = _v; } catch (e) {}

function msEsc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function msNorm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }
function msIsUs(name) { return msNorm(name).indexOf(MS_CLUB) !== -1; }
function msDateShort(iso) { var d = new Date(iso); if (isNaN(d.getTime())) return ''; var j = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']; return j[d.getDay()] + ' ' + ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
function msPdf(code) { return code ? 'https://fdm.fdme.ffhandball.fr/' + code[0] + '/' + code[1] + '/' + code[2] + '/' + code[3] + '/' + code + '.pdf' : ''; }
function msPdfLink(code, fallbackUrl) {
  if (code) return '<a class="ms-pdf" href="' + msEsc(msPdf(code)) + '" target="_blank" rel="noopener">📄 PDF</a>';
  if (fallbackUrl && /^https:\/\/(www\.)?ffhandball\.fr\//i.test(fallbackUrl)) return '<a class="ms-pdf" href="' + msEsc(fallbackUrl) + '" target="_blank" rel="noopener">🔗 Match</a>';
  return '<span class="ms-na">—</span>';
}

// ---------- Règle de points (UNE seule fonction, utilisée partout) ----------
// Règlement FFHandball « -15 ans Régional » : match gagné 3 pts, nul 2 pts, perdu 1 pt, + 1 pt par tiers-temps gagné (un tiers-temps ne peut pas être nul : but en or).
// Forfait / pénalité (0 pt) : non détectable automatiquement, compté comme une défaite normale.
function msBareme() {
  var b = { tier: 1, win: 3, draw: 2, lose: 1 };
  try {
    var raw = msState.data && msState.data.bareme;
    var o = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    if (o) { ['tier', 'win', 'draw', 'lose'].forEach(function (k) { var n = parseInt(o[k], 10); if (!isNaN(n) && n >= 0 && n <= 20) b[k] = n; }); }
  } catch (e) {}
  return b;
}
// tiers = [[a,b],[a,b],[a,b]] ou null (alors seulement les points de match, signalé discrètement)
function msPts(sa, sb, tiers) {
  var bar = msBareme(), pa = 0, pb = 0, hasT = false;
  if (tiers && tiers.length) {
    hasT = true;
    tiers.forEach(function (t) { if (t[0] > t[1]) pa += bar.tier; else if (t[1] > t[0]) pb += bar.tier; });
  }
  if (sa > sb) { pa += bar.win; pb += bar.lose; } else if (sb > sa) { pb += bar.win; pa += bar.lose; } else { pa += bar.draw; pb += bar.draw; }
  return { a: pa, b: pb, hasT: hasT };
}

// ---------- Bascule Matchs | Joueurs (la partie « Joueurs » = stats de match ; les stats de présence sont dans Présences › Statistiques depuis z41) ----------
function msViewSet(v) {
  msState.view = v === 'joueurs' ? 'joueurs' : 'matchs';
  try { localStorage.setItem('ms_view_v1', msState.view); } catch (e) {}
  var m = document.getElementById('ms-matchs'), j = document.getElementById('ms-joueurs');
  if (m) m.style.display = msState.view === 'matchs' ? 'block' : 'none';
  if (j) j.style.display = msState.view === 'joueurs' ? 'block' : 'none';
  ['matchs', 'joueurs'].forEach(function (k) {
    var b = document.getElementById('ms-sw-' + k);
    if (b) b.className = 'ms-sw' + (k === msState.view ? ' on' : '');
  });
  if (msState.view === 'matchs') msLoad(); else msJLoad();
}
function msInit() { msViewSet(msState.view); }

// ---------- Chargement ----------
async function msLoad() {
  var box = document.getElementById('ms-matchs');
  if (!box) return;
  if (!msState.data) box.innerHTML = '<div class="ms-info">Chargement…</div>';
  try {
    await ensureCoachSession();
    if (!coachSession) { box.innerHTML = '<div class="ms-info">Connecte-toi en tant que coach pour voir les matchs.</div>'; return; }
    var H = coachAuthHeaders();
    var r = await Promise.all([
      fetch(SB_URL + '/rest/v1/matches?select=*&order=debut.asc', { headers: H }),
      fetch(SB_URL + '/rest/v1/ffhb_sources?select=*&order=created_at.asc', { headers: H }),
      fetch(SB_URL + '/rest/v1/poule_matches?select=*&order=journee_num.asc', { headers: H }),
      fetch(SB_URL + '/rest/v1/app_settings?select=value&key=eq.' + MS_BAREME_KEY, { headers: H }),
    ]);
    if (!r[0].ok || !r[1].ok || !r[2].ok) throw new Error('lecture impossible');
    var bar = r[3].ok ? await r[3].json() : [];
    msState.data = { matches: await r[0].json(), sources: await r[1].json(), poule: await r[2].json(), bareme: bar.length ? bar[0].value : null };
    msRender();
  } catch (e) {
    box.innerHTML = '<div class="ms-info" style="color:#e74c3c;">Erreur de chargement. Vérifie ta connexion puis réessaie. <button class="ms-btn" onclick="msLoad()">↻ Réessayer</button></div>';
  }
}

// ---------- Affichage ----------
function msTiersOf(m) {
  var p = m.score_periodes;
  if (!Array.isArray(p) || !p.length) return null;
  return p.map(function (x) { return [x.nous, x.eux]; });
}
function msRender() {
  var box = document.getElementById('ms-matchs'), d = msState.data;
  if (!box || !d) return;
  var html = '<div class="ms-bar"><button class="ms-btn ms-main" id="ms-sync-btn" onclick="msSync()">🔄 Mettre à jour depuis la FFHandball</button></div>' +
    '<div id="ms-report"></div>' + '<div class="ms-cols"><div class="ms-c1">' + msMineHtml(d) + '</div><div class="ms-c2">' + msPouleHtml(d) + msSourcesHtml(d) + '</div></div>';
  // on garde ouverts les volets <details> déjà ouverts
  var open = {};
  Array.prototype.forEach.call(box.querySelectorAll('details[data-ms]'), function (el) { open[el.getAttribute('data-ms')] = el.open; });
  var rep = document.getElementById('ms-report'), repHtml = rep ? rep.innerHTML : '';
  box.innerHTML = html;
  Array.prototype.forEach.call(box.querySelectorAll('details[data-ms]'), function (el) { if (open[el.getAttribute('data-ms')]) el.open = true; });
  var rep2 = document.getElementById('ms-report'); if (rep2) rep2.innerHTML = repHtml;
}

function msMineHtml(d) {
  var list = d.matches.filter(function (m) { return msState.eq === 'all' || String(m.equipe) === msState.eq; });
  var chips = [['1', 'Équipe 1'], ['2', 'Équipe 2'], ['all', 'Toutes']].map(function (c) {
    return '<button class="ms-chip' + (msState.eq === c[0] ? ' on' : '') + '" onclick="msSetEq(\'' + c[0] + '\')">' + c[1] + '</button>';
  }).join('');
  var rows = list.map(function (m) {
    var info = homeParseOpponent(m.titre), played = m.score_nous !== null && m.score_nous !== undefined;
    var t = msTiersOf(m), mt = m.mi_temps;
    var cell = function (a) { return a ? a[0] + '–' + a[1] : '<span class="ms-na">–</span>'; };
    var res = '', pts = '<span class="ms-na">–</span>';
    if (played) {
      var cls = m.score_nous > m.score_eux ? 'w' : (m.score_nous < m.score_eux ? 'l' : 'n');
      res = '<b class="ms-res ' + cls + '">' + m.score_nous + '–' + m.score_eux + '</b>';
      var p = msPts(m.score_nous, m.score_eux, t);
      pts = p.a + ' – ' + p.b + (p.hasT ? '' : ' <span class="ms-warn" title="Tiers-temps inconnus : seulement les points de match">*</span>');
    } else res = '<span class="ms-na">à venir</span>';
    return '<tr' + (played ? '' : ' class="ms-future"') + '><td>' + (m.journee ? 'J' + m.journee : '') + '</td><td>' + msEsc(homeFmtDateShort(m.debut)) + '</td>' +
      '<td class="ms-l">' + (list.length && msState.eq === 'all' ? '<span class="ms-eq">É' + m.equipe + '</span> ' : '') + (info.home ? 'vs ' : 'à ') + msEsc(info.opp) + '</td>' +
      '<td>' + res + '</td><td>' + (mt ? mt.nous + '–' + mt.eux : '<span class="ms-na">–</span>') + '</td>' +
      '<td>' + cell(t && t[0]) + '</td><td>' + cell(t && t[1]) + '</td><td>' + cell(t && t[2]) + '</td><td>' + pts + '</td><td>' + msPdfLink(m.fdm_code, m.url_ffhb) + '</td></tr>';
  }).join('');
  return '<div class="ms-h">Mes matchs <span class="ms-chips">' + chips + '</span></div>' +
    (rows ? '<div class="ms-scroll"><table class="ms-tbl"><thead><tr><th>J</th><th>Date</th><th class="ms-l">Match</th><th>Score</th><th>MT</th><th>T1</th><th>T2</th><th>T3</th><th>Pts</th><th>Feuille</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="ms-legend">Scores « nous–eux ». MT = mi-temps. T1/T2/T3 = tiers-temps. Pts = points gagnés par nous – par l\'adversaire (règlement : victoire 3, nul 2, défaite 1, + 1 par tiers-temps gagné). * = tiers-temps inconnus.</div>'
      : '<div class="ms-info">Aucun match pour cette équipe.</div>');
}
function msSetEq(v) { msState.eq = v; msRender(); }

// ----- Poule : classement après une journée, matchs de la journée, points glanés -----
function msPouleSources(d) {
  var ids = {};
  d.poule.forEach(function (p) { ids[p.source_id] = true; });
  return d.sources.filter(function (s) { return ids[s.id]; });
}
function msPouleHtml(d) {
  var srcs = msPouleSources(d);
  if (!srcs.length) return '<div class="ms-h">Poule</div><div class="ms-info">Pas encore de données de poule : appuie sur « Mettre à jour ».</div>';
  if (!msState.src || !srcs.some(function (s) { return s.id === msState.src; })) { msState.src = srcs[srcs.length - 1].id; msState.j = null; }
  var pm = d.poule.filter(function (p) { return p.source_id === msState.src; });
  var js = []; pm.forEach(function (p) { if (p.journee_num !== null && js.indexOf(p.journee_num) === -1) js.push(p.journee_num); });
  js.sort(function (a, b) { return a - b; });
  if (!js.length) return '<div class="ms-h">Poule</div><div class="ms-info">Aucune journée trouvée.</div>';
  var played = function (p) { return p.score1 !== null && p.score1 !== undefined && p.score2 !== null && p.score2 !== undefined; };
  if (msState.j === null || js.indexOf(msState.j) === -1) {
    var lastPlayed = null; js.forEach(function (n) { if (pm.some(function (p) { return p.journee_num === n && played(p); })) lastPlayed = n; });
    msState.j = lastPlayed !== null ? lastPlayed : js[0];
  }
  var tiersOf = function (p) { return p.t1_1 === null || p.t1_1 === undefined ? null : [[p.t1_1, p.t1_2], [p.t2_1, p.t2_2], [p.t3_1, p.t3_2]]; };
  var T = {}, byJ = {}, anyNoTiers = false;
  var team = function (n) { return T[n] || (T[n] = { name: n, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0 }); };
  pm.forEach(function (p) {
    team(p.team1); team(p.team2);
    if (!played(p) || p.journee_num > msState.j) return;
    var a = team(p.team1), b = team(p.team2), s = msPts(p.score1, p.score2, tiersOf(p));
    if (!s.hasT) anyNoTiers = true;
    a.j++; b.j++; a.bp += p.score1; a.bc += p.score2; b.bp += p.score2; b.bc += p.score1; a.pts += s.a; b.pts += s.b;
    if (p.score1 > p.score2) { a.v++; b.d++; } else if (p.score1 < p.score2) { b.v++; a.d++; } else { a.n++; b.n++; }
    (byJ[p.team1] = byJ[p.team1] || {})[p.journee_num] = ((byJ[p.team1] || {})[p.journee_num] || 0) + s.a;
    (byJ[p.team2] = byJ[p.team2] || {})[p.journee_num] = ((byJ[p.team2] || {})[p.journee_num] || 0) + s.b;
  });
  var rank = Object.keys(T).map(function (k) { return T[k]; }).sort(function (x, y) { return y.pts - x.pts || (y.bp - y.bc) - (x.bp - x.bc) || y.bp - x.bp; });
  var srcSel = srcs.length > 1 ? '<select class="ms-sel" onchange="msSetSrc(this.value)">' + srcs.map(function (s) {
    return '<option value="' + msEsc(s.id) + '"' + (s.id === msState.src ? ' selected' : '') + '>É' + s.equipe + ' — ' + msEsc(s.label || 'poule') + '</option>'; }).join('') + '</select>' : '';
  var pills = js.map(function (n) { return '<button class="ms-pill' + (n === msState.j ? ' on' : '') + '" onclick="msSetJ(' + n + ')">J' + n + '</button>'; }).join('');
  var rankRows = rank.map(function (t, i) {
    return '<tr' + (msIsUs(t.name) ? ' class="ms-us"' : '') + '><td>' + (i + 1) + '</td><td class="ms-l">' + msEsc(t.name) + '</td><td>' + t.j + '</td><td>' + t.v + '</td><td>' + t.n + '</td><td>' + t.d + '</td><td>' + t.bp + '</td><td>' + t.bc + '</td><td>' + (t.bp - t.bc) + '</td><td><b>' + t.pts + '</b></td></tr>';
  }).join('');
  var dayRows = pm.filter(function (p) { return p.journee_num === msState.j; }).map(function (p) {
    var pl = played(p), t = tiersOf(p), s = pl ? msPts(p.score1, p.score2, t) : null;
    var tc = function (i, k) { return t ? t[i][k] : '–'; };
    return '<tr><td class="ms-l' + (msIsUs(p.team1) ? ' ms-usn' : '') + '">' + msEsc(p.team1) + '</td><td>' + (pl ? '<b>' + p.score1 + '–' + p.score2 + '</b>' : '<span class="ms-na">à jouer</span>') + '</td><td class="ms-l' + (msIsUs(p.team2) ? ' ms-usn' : '') + '">' + msEsc(p.team2) + '</td>' +
      '<td>' + (t ? tc(0, 0) + '–' + tc(0, 1) + ' · ' + tc(1, 0) + '–' + tc(1, 1) + ' · ' + tc(2, 0) + '–' + tc(2, 1) : '<span class="ms-na">–</span>') + '</td><td>' + (s ? s.a + ' – ' + s.b : '<span class="ms-na">–</span>') + '</td><td>' + msPdfLink(p.fdm_code, null) + '</td></tr>';
  }).join('');
  var gl = rank.map(function (t) {
    var tot = 0, cells = js.filter(function (n) { return n <= msState.j; }).map(function (n) { var v = (byJ[t.name] || {})[n]; if (v) tot += v; return '<td>' + (v === undefined ? '<span class="ms-na">–</span>' : v) + '</td>'; }).join('');
    return '<tr' + (msIsUs(t.name) ? ' class="ms-us"' : '') + '><td class="ms-l">' + msEsc(t.name) + '</td>' + cells + '<td><b>' + tot + '</b></td></tr>';
  }).join('');
  var bar = msBareme();
  return '<div class="ms-h">Poule ' + srcSel + '</div><div class="ms-pills">' + pills + '</div>' +
    '<div class="ms-sub">Classement après la journée J' + msState.j + '</div>' +
    '<div class="ms-scroll"><table class="ms-tbl"><thead><tr><th>#</th><th class="ms-l">Équipe</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff</th><th>Pts</th></tr></thead><tbody>' + rankRows + '</tbody></table></div>' +
    '<div class="ms-sub">Matchs de la journée J' + msState.j + '</div>' +
    '<div class="ms-scroll"><table class="ms-tbl"><thead><tr><th class="ms-l">Équipe 1</th><th>Score</th><th class="ms-l">Équipe 2</th><th>Tiers-temps</th><th>Pts</th><th>Feuille</th></tr></thead><tbody>' + dayRows + '</tbody></table></div>' +
    '<details class="ms-det" data-ms="glanes"><summary>Points glanés par chaque équipe, journée par journée</summary><div class="ms-scroll"><table class="ms-tbl"><thead><tr><th class="ms-l">Équipe</th>' +
    js.filter(function (n) { return n <= msState.j; }).map(function (n) { return '<th>J' + n + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>' + gl + '</tbody></table></div></details>' +
    '<div class="ms-legend">' + bar.tier + ' point par tiers-temps gagné + ' + bar.win + ' par match gagné, ' + bar.draw + ' par nul, ' + bar.lose + ' par défaite (règlement -15 ans Régional ; forfait non géré). Départage : points, différence de buts, buts marqués.' +
    (anyNoTiers ? ' Certains tiers-temps sont inconnus : seuls les points de match sont comptés pour ces rencontres.' : '') + '</div>';
}
function msSetSrc(id) { msState.src = id; msState.j = null; msRender(); }
function msSetJ(n) { msState.j = n; msRender(); }

// ----- Liens FFHandball + barème -----
function msSourcesHtml(d) {
  var bar = msBareme();
  var rows = d.sources.map(function (s) {
    return '<div class="ms-src"><div class="ms-src-t"><b>Équipe ' + s.equipe + '</b> — ' + msEsc(s.label || '') + '<br><span class="ms-na">' + msEsc(s.url.replace('https://www.ffhandball.fr/competitions/', '…/')) + '</span>' +
      (s.last_sync_at ? '<br><span class="ms-na">Dernière mise à jour : ' + msEsc(homeFmtDateShort(s.last_sync_at)) + ' — ' + msEsc(s.last_sync_status || '') + '</span>' : '') + '</div>' +
      '<button class="ms-btn" onclick="msSrcDel(\'' + msEsc(s.id) + '\')">Supprimer</button></div>';
  }).join('');
  return '<details class="ms-det" data-ms="liens"><summary>⚙️ Liens FFHandball et barème</summary>' +
    '<div class="ms-sub">Liens utilisés pour les mises à jour</div>' + (rows || '<div class="ms-info">Aucun lien.</div>') +
    '<div class="ms-sub">Ajouter un lien</div>' +
    '<div class="ms-add"><select id="ms-add-eq" class="ms-sel"><option value="1">Équipe 1</option><option value="2">Équipe 2</option></select>' +
    '<input id="ms-add-url" class="ms-in" type="url" inputmode="url" placeholder="https://www.ffhandball.fr/competitions/…/poule-…/"><input id="ms-add-label" class="ms-in" placeholder="Nom (ex. Barrages)">' +
    '<button class="ms-btn ms-main" onclick="msSrcAdd()">Vérifier et ajouter</button><div id="ms-add-msg" class="ms-info"></div></div>' +
    '<div class="ms-sub">Barème de points</div><div class="ms-add"><label>Par tiers-temps gagné <input id="ms-b-tier" class="ms-in ms-num" type="number" min="0" max="20" value="' + bar.tier + '"></label>' +
    '<label>Par victoire <input id="ms-b-win" class="ms-in ms-num" type="number" min="0" max="20" value="' + bar.win + '"></label>' +
    '<label>Par nul <input id="ms-b-draw" class="ms-in ms-num" type="number" min="0" max="20" value="' + bar.draw + '"></label>' +
    '<label>Par défaite <input id="ms-b-lose" class="ms-in ms-num" type="number" min="0" max="20" value="' + bar.lose + '"></label>' +
    '<button class="ms-btn" onclick="msBaremeSave()">Enregistrer le barème</button><div id="ms-b-msg" class="ms-info"></div></div></details>';
}

async function msCall(body) {
  var s = await ensureCoachSession();
  if (!s || !coachSession) throw new Error('Connecte-toi en tant que coach.');
  var res = await fetch(SB_URL + '/functions/v1/ffhb-sync', {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + coachSession.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  var j = {};
  try { j = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(j.error || ('Erreur ' + res.status));
  return j;
}
async function msSrcAdd() {
  var msg = document.getElementById('ms-add-msg'), url = (document.getElementById('ms-add-url').value || '').trim();
  var eq = parseInt(document.getElementById('ms-add-eq').value, 10), label = (document.getElementById('ms-add-label').value || '').trim();
  msg.style.color = ''; if (!url) { msg.textContent = 'Colle d\'abord un lien.'; return; }
  msg.textContent = 'Vérification du lien…';
  try {
    var p = await msCall({ mode: 'preview', url: url });
    if (!p.equipes_du_club || !p.equipes_du_club.length) throw new Error('Aucune équipe de ' + MS_CLUB + ' dans cette page : vérifie que c\'est bien la bonne poule.');
    var res = await fetch(SB_URL + '/rest/v1/ffhb_sources', {
      method: 'POST', headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ equipe: eq, url: url, label: label || ((p.phase ? p.phase + ' — ' : '') + p.poule) }),
    });
    if (!res.ok) throw new Error(res.status === 409 ? 'Ce lien existe déjà pour cette équipe.' : 'Enregistrement impossible.');
    msg.style.color = 'var(--vert)'; msg.textContent = '✓ Lien ajouté (' + (p.equipes_du_club.join(', ')) + '). Appuie sur « Mettre à jour ».';
    document.getElementById('ms-add-url').value = '';
    await msLoad();
  } catch (e) { msg.style.color = '#e74c3c'; msg.textContent = e.message || 'Erreur.'; }
}
async function msSrcDel(id) {
  if (!window.confirm('Supprimer ce lien ? Les matchs de poule qui en viennent seront aussi retirés (pas tes scores).')) return;
  try {
    await ensureCoachSession();
    var res = await fetch(SB_URL + '/rest/v1/ffhb_sources?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: coachAuthHeaders() });
    if (!res.ok) throw new Error('x');
    msState.src = null; await msLoad();
  } catch (e) { window.alert('Suppression impossible.'); }
}
async function msBaremeSave() {
  var msg = document.getElementById('ms-b-msg');
  var v = { tier: parseInt(document.getElementById('ms-b-tier').value, 10), win: parseInt(document.getElementById('ms-b-win').value, 10), draw: parseInt(document.getElementById('ms-b-draw').value, 10), lose: parseInt(document.getElementById('ms-b-lose').value, 10) };
  if (['tier', 'win', 'draw', 'lose'].some(function (k) { return isNaN(v[k]) || v[k] < 0 || v[k] > 20; })) { msg.style.color = '#e74c3c'; msg.textContent = 'Valeurs entre 0 et 20.'; return; }
  try {
    await ensureCoachSession();
    var res = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', {
      method: 'POST', headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify([{ key: MS_BAREME_KEY, value: JSON.stringify(v), updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) throw new Error('x');
    msState.data.bareme = JSON.stringify(v); msRender();
    var m2 = document.getElementById('ms-b-msg'); if (m2) { m2.style.color = 'var(--vert)'; m2.textContent = '✓ Barème enregistré.'; }
  } catch (e) { msg.style.color = '#e74c3c'; msg.textContent = 'Erreur — réessaie.'; }
}

// ----- Mise à jour depuis la FFHandball (fonction serveur ffhb-sync) -----
async function msSync(pref) {
  if (msState.busy) return;
  msState.busy = true;
  pref = pref || '';
  var btn = document.getElementById(pref ? 'ms-jsync-btn' : 'ms-sync-btn'), rep = document.getElementById(pref ? 'ms-jreport' : 'ms-report');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mise à jour en cours (jusqu\'à 1–2 min)…'; }
  if (rep) rep.innerHTML = '';
  var html = '';
  try {
    var r = await msCall({ mode: 'sync' });
    var line = r.sources + ' lien(s) lu(s) · ' + r.rencontres + ' rencontre(s) · ' + r.joues + ' de nos matchs joués · ' + r.mis_a_jour + ' mis à jour · ' + r.tiers_lus + ' feuille(s) lue(s) pour les tiers-temps · ' + (r.joueurs_lus || 0) + ' feuille(s) lue(s) pour les stats joueurs';
    html = '<div class="ms-ok">✓ ' + msEsc(line) + '</div>';
    if (r.feuilles_restantes) html += '<div class="ms-note">Il reste ' + r.feuilles_restantes + ' feuille(s) de match à lire : relance « Mettre à jour » pour continuer.</div>';
    if (r.conflits && r.conflits.length) html += '<div class="ms-note"><b>Scores différents de la FFHandball (je n\'ai rien modifié) :</b><br>' + r.conflits.map(msEsc).join('<br>') + '</div>';
    if (r.non_rapproches && r.non_rapproches.length) html += '<div class="ms-note"><b>Matchs FFHandball absents du calendrier de l\'appli :</b><br>' + r.non_rapproches.map(msEsc).join('<br>') + '</div>';
    if (r.erreurs && r.erreurs.length) html += '<div class="ms-err"><b>À vérifier :</b><br>' + r.erreurs.map(msEsc).join('<br>') + '</div>';
  } catch (e) {
    html = '<div class="ms-err">Mise à jour impossible : ' + msEsc(e.message || 'erreur') + '</div>';
  }
  msState.busy = false;
  if (btn) { btn.disabled = false; btn.textContent = pref ? '🔄 Mettre à jour les stats des joueurs' : '🔄 Mettre à jour depuis la FFHandball'; }
  await msLoad();
  await msJLoad();
  var rep2 = document.getElementById(pref ? 'ms-jreport' : 'ms-report'); if (rep2) rep2.innerHTML = html;
  if (typeof homeLoadMatches === 'function') homeLoadMatches();
}

// ===================== STATS DES JOUEURS depuis les feuilles de match (z40) =====================
// Données : ffhb_joueurs (licence -> nom, numéro, fiche de l'appli), player_match_stats (une ligne par joueur et par match).
// Seuls NOS joueurs sont enregistrés. « Tirs » = total des tirs, buts compris : tirs manqués = tirs - buts ; réussite = buts / tirs.
function msPctJ(b, t) { return t > 0 ? Math.round(100 * b / t) + ' %' : '–'; }
function msPrenomFeuille(nom) { // « GREGOIRE Noah » -> « Noah » (les mots en MAJUSCULES sont le nom de famille)
  var w = String(nom || '').split(/\s+/).filter(function (x) { return x && x !== x.toUpperCase(); });
  return w.join(' ');
}
function msSuggest(j, players) { // meilleure fiche de l'appli pour un joueur de la feuille (prénom + numéro de maillot), ou '' si doute
  var pre = msNorm(msPrenomFeuille(j.nom)).replace(/[^A-Z]/g, ''), best = '', bs = 0, tie = false;
  if (!pre) return '';
  players.forEach(function (p) {
    if (!p.name) return;
    var n = msNorm(p.name).replace(/[^A-Z]/g, ''), sc = 0;
    if (n.indexOf(pre) === 0) sc += 2;
    if (j.numero !== null && j.numero !== undefined && p.numero === j.numero) sc += 3;
    if (sc < 2) return;
    if (sc > bs) { bs = sc; best = p.code; tie = false; } else if (sc === bs) tie = true;
  });
  return tie ? '' : best;
}
async function msJLoad() {
  var box = document.getElementById('ms-jstats');
  if (!box) return;
  if (!msState.jd) box.innerHTML = '<div class="ms-info">Chargement des stats des matchs…</div>';
  try {
    await ensureCoachSession();
    if (!coachSession) { box.innerHTML = ''; return; }
    var H = coachAuthHeaders();
    var r = await Promise.all([
      fetch(SB_URL + '/rest/v1/ffhb_joueurs?select=*&order=nom.asc', { headers: H }),
      fetch(SB_URL + '/rest/v1/player_match_stats?select=*&order=match_date.asc', { headers: H }),
      fetch(SB_URL + '/rest/v1/players?select=code,name,numero&name=not.is.null&order=name.asc', { headers: H }),
      fetch(SB_URL + '/rest/v1/poule_matches?select=fdm_code,team1,team2,journee_num,match_date,score1,score2', { headers: H }),
    ]);
    if (!r[0].ok || !r[1].ok) throw new Error('lecture impossible');
    msState.jd = { joueurs: await r[0].json(), stats: await r[1].json(), players: r[2].ok ? await r[2].json() : [], poule: r[3].ok ? await r[3].json() : [] };
    msJRender();
  } catch (e) {
    box.innerHTML = '<div class="ms-info" style="color:#e74c3c;">Stats des matchs indisponibles (la base n\'est peut-être pas encore prête). <button class="ms-btn" onclick="msJLoad()">↻ Réessayer</button></div>';
  }
}
function msJRender() {
  var box = document.getElementById('ms-jstats'), d = msState.jd;
  if (!box || !d) return;
  var rep = document.getElementById('ms-jreport'), repHtml = rep ? rep.innerHTML : '';
  var pname = {}; d.players.forEach(function (p) { pname[p.code] = p.name; });
  var jinfo = {}; d.joueurs.forEach(function (j) { jinfo[j.licence] = j; });
  var pmatch = {}; d.poule.forEach(function (p) { if (p.fdm_code) pmatch[p.fdm_code] = p; });
  var eqChips = [['all', 'Toutes'], ['1', 'Équipe 1'], ['2', 'Équipe 2']].map(function (c) {
    return '<button class="ms-chip' + (msState.jeq === c[0] ? ' on' : '') + '" onclick="msJSetEq(\'' + c[0] + '\')">' + c[1] + '</button>';
  }).join('');
  var head = '<div class="ms-h">🏐 Stats des matchs (feuilles FFHandball) <span class="ms-chips">' + eqChips + '</span></div>' +
    '<div class="ms-bar"><button class="ms-btn ms-main" id="ms-jsync-btn" onclick="msSync(\'j\')">🔄 Mettre à jour les stats des joueurs</button></div><div id="ms-jreport"></div>';

  // joueurs de la feuille pas encore reliés à une fiche de l'appli
  var todo = d.joueurs.filter(function (j) { return !j.player_code; });
  var assoc = '';
  if (todo.length) {
    var opts = function (sel) {
      return '<option value="">— choisir la fiche —</option>' + d.players.map(function (p) {
        return '<option value="' + msEsc(p.code) + '"' + (p.code === sel ? ' selected' : '') + '>' + msEsc(p.name) + (p.numero ? ' (n°' + p.numero + ')' : '') + '</option>';
      }).join('');
    };
    assoc = '<details class="ms-det" data-ms="assoc" open><summary>🔗 ' + todo.length + ' joueur(s) à relier à ta liste de joueurs (une seule fois)</summary>' +
      '<div class="ms-sub">Vérifie chaque ligne : le choix proposé vient du prénom et du numéro de maillot. Laisse vide si le joueur n\'est pas dans l\'appli.</div>' +
      todo.map(function (j) {
        return '<div class="ms-assoc"><span class="ms-assoc-n">' + (j.numero !== null && j.numero !== undefined ? 'n°' + j.numero + ' ' : '') + msEsc(j.nom) + '</span>' +
          '<select class="ms-sel" data-lic="' + msEsc(j.licence) + '">' + opts(msSuggest(j, d.players)) + '</select></div>';
      }).join('') + '<button class="ms-btn ms-main" onclick="msJAssocSave()">Enregistrer les liens</button><div id="ms-jassoc-msg" class="ms-info"></div></details>';
  }

  // ---- z41 : matchs retenus (équipe + période) ----
  var mdate = {}, mcodes = [];
  d.stats.forEach(function (s) {
    if (msState.jeq !== 'all' && String(s.equipe) !== msState.jeq) return;
    if (!mdate[s.fdm_code]) { mdate[s.fdm_code] = s.match_date || ''; mcodes.push(s.fdm_code); }
  });
  mcodes.sort(function (x, y) { return mdate[x] < mdate[y] ? 1 : mdate[x] > mdate[y] ? -1 : 0; });
  var nKeep = msState.jper === 'last' ? 1 : msState.jper === 'last3' ? 3 : mcodes.length, keep = {};
  mcodes.slice(0, nKeep).forEach(function (c) { keep[c] = 1; });
  var nbMatch = Math.min(nKeep, mcodes.length);

  // gardien = jamais de tir sur l'ensemble des feuilles, avec des arrêts (ou n° 1 sans tir)
  var gl = {};
  d.stats.forEach(function (s) { var g = gl[s.licence] || (gl[s.licence] = { ar: 0, t: 0, b: 0 }); g.ar += s.arrets; g.t += s.tirs; g.b += s.buts; });
  var isGk = function (lic) { var g = gl[lic] || { ar: 0, t: 0, b: 0 }, j = jinfo[lic] || {}; return g.t === 0 && g.b === 0 && (g.ar > 0 || j.numero === 1); };

  // cumul par joueur sur la sélection
  var agg = {}, any = false, perMatchGk = {};
  d.stats.forEach(function (s) {
    if (!keep[s.fdm_code]) return;
    any = true;
    var a = agg[s.licence] || (agg[s.licence] = { lic: s.licence, f: 0, b: 0, b7: 0, t: 0, ar: 0, av: 0, d2: 0, dis: 0, sa: 0, so: 0, sm: 0, rows: [] });
    a.f++; a.b += s.buts; a.b7 += s.buts_7m; a.t += s.tirs; a.ar += s.arrets; a.av += s.avertissements; a.d2 += s.deux_min; a.dis += s.disqualifications; a.rows.push(s);
    if (isGk(s.licence)) (perMatchGk[s.fdm_code] || (perMatchGk[s.fdm_code] = [])).push(s);
  });
  // buts encaissés = score adverse (déjà en base) ; % d'arrêts = arrêts / (arrêts + buts encaissés)
  var tg = { ar: 0, enc: 0, m: 0 };
  Object.keys(keep).forEach(function (code) {
    var pm = pmatch[code], gs = perMatchGk[code] || [];
    if (!pm || pm.score1 === null || pm.score1 === undefined || pm.score2 === null || pm.score2 === undefined) return;
    var enc = msIsUs(pm.team1) ? pm.score2 : pm.score1, sum = 0, actifs = [];
    gs.forEach(function (s) { sum += s.arrets; if (s.arrets > 0) actifs.push(s); });
    tg.ar += sum; tg.enc += enc; tg.m++;
    if (actifs.length === 1 && agg[actifs[0].licence]) { var a = agg[actifs[0].licence]; a.sa += actifs[0].arrets; a.so += enc; a.sm++; }
  });
  var nameOf = function (lic) { var j = jinfo[lic] || {}; return j.player_code && pname[j.player_code] ? pname[j.player_code] : (j.nom || lic); };
  var all = Object.keys(agg).map(function (k) { return agg[k]; });
  var field = all.filter(function (a) { return !isGk(a.lic); }), gks = all.filter(function (a) { return isGk(a.lic); });
  var tot = { b: 0, b7: 0, t: 0, av: 0, d2: 0, dis: 0 };
  field.forEach(function (a) { ['b', 'b7', 't', 'av', 'd2', 'dis'].forEach(function (k) { tot[k] += a[k]; }); });
  var key = msState.jsort, dir = msState.jdir;
  var val = function (a) { return key === 'pct' ? (a.t ? a.b / a.t : -1) : key === 't' ? a.t : key === 'n' ? ((jinfo[a.lic] || {}).numero || 0) : key === 'nom' ? nameOf(a.lic).toLowerCase() : a.b; };
  field.sort(function (x, y) { var u = val(x), v = val(y); var c = u < v ? -1 : u > v ? 1 : 0; return c ? c * dir : (y.b - x.b || y.t - x.t); });
  gks.sort(function (x, y) { return y.ar - x.ar; });

  // bandeau des leaders
  var minT = msState.jper === 'all' ? 8 : msState.jper === 'last3' ? 5 : 3;
  var topB = null, topP = null, topG = null;
  field.forEach(function (a) { if (!topB || a.b > topB.b) topB = a; if (a.t >= minT && (!topP || a.b / a.t > topP.b / topP.t)) topP = a; });
  gks.forEach(function (a) { if (!topG || a.ar > topG.ar) topG = a; });
  var savePct = tg.ar + tg.enc > 0 ? Math.round(100 * tg.ar / (tg.ar + tg.enc)) : null;
  var leaders = '<div class="mj-lead">' +
    '<div class="mj-lc mj-hero"><small>Meilleur buteur</small><b>' + (topB && topB.b ? topB.b + ' but' + (topB.b > 1 ? 's' : '') : '–') + '</b><span>' + (topB && topB.b ? msEsc(nameOf(topB.lic)) : '') + '</span></div>' +
    '<div class="mj-lc"><small>Meilleur % (' + minT + ' tirs min.)</small><b>' + (topP ? msPctJ(topP.b, topP.t) : '–') + '</b><span>' + (topP ? msEsc(nameOf(topP.lic)) : '') + '</span></div>' +
    '<div class="mj-lc"><small>Meilleur gardien</small><b>' + (topG && topG.ar ? topG.ar + ' arrêt' + (topG.ar > 1 ? 's' : '') : '–') + '</b><span>' + (topG && topG.ar ? msEsc(nameOf(topG.lic)) : '') + '</span></div>' +
    '<div class="mj-lc"><small>Équipe</small><b>' + tot.b + ' but' + (tot.b > 1 ? 's' : '') + '</b><span>' + msPctJ(tot.b, tot.t) + ' · ' + tot.t + ' tirs · ' + nbMatch + ' match' + (nbMatch > 1 ? 's' : '') + '</span></div></div>';

  // commandes : période, présentation, tri
  var chip = function (on, fn, lbl) { return '<button class="ms-chip' + (on ? ' on' : '') + '" onclick="' + fn + '">' + lbl + '</button>'; };
  var perRow = [['all', 'Saison'], ['last', 'Dernier match'], ['last3', '3 derniers']].map(function (c) { return chip(msState.jper === c[0], 'msJPer(\'' + c[0] + '\')', c[1]); }).join('');
  var layRow = [['A', 'Liste'], ['B', 'Tableau'], ['C', 'Cartes']].map(function (c) { return chip(msState.jlay === c[0], 'msJLay(\'' + c[0] + '\')', c[1]); }).join('');
  var sortRow = [['b', 'Buts'], ['pct', '%'], ['t', 'Tirs'], ['n', 'N°'], ['nom', 'Nom']].map(function (c) {
    return chip(key === c[0], 'msJSort(\'' + c[0] + '\')', c[1] + (key === c[0] ? (dir < 0 ? ' ▾' : ' ▴') : ''));
  }).join('');
  var ctrl = '<div class="mj-ctl"><span class="mj-ctl-l">Période</span><span class="ms-chips">' + perRow + '</span></div>' +
    '<div class="mj-ctl"><span class="mj-ctl-l">Vue</span><span class="ms-chips">' + layRow + '</span></div>' +
    (msState.jlay === 'B' ? '' : '<div class="mj-ctl"><span class="mj-ctl-l">Trier</span><span class="ms-chips">' + sortRow + '</span></div>');

  // blocs réutilisés
  var pills = function (a) {
    var s = '';
    if (a.av) s += '<span class="mj-pl mj-av">AV' + (a.av > 1 ? ' ×' + a.av : '') + '</span>';
    if (a.d2) s += '<span class="mj-pl mj-d2">2′' + (a.d2 > 1 ? ' ×' + a.d2 : '') + '</span>';
    if (a.dis) s += '<span class="mj-pl mj-dq">DQ' + (a.dis > 1 ? ' ×' + a.dis : '') + '</span>';
    return s;
  };
  var col = function (p) { return p >= 60 ? 'mj-g' : p >= 40 ? 'mj-o' : 'mj-r'; };
  var pcn = function (a) { return a.t ? Math.round(100 * a.b / a.t) : 0; };
  var numOf = function (a) { var j = jinfo[a.lic] || {}; return j.numero !== null && j.numero !== undefined ? j.numero : '·'; };
  var gkPct = function (a) { return a.sm ? '≈ ' + Math.round(100 * a.sa / (a.sa + a.so)) + ' % d\'arrêts (' + a.sm + ' match' + (a.sm > 1 ? 's' : '') + ' en solo)' : '% d\'arrêts n.d.'; };
  var detail = function (a) {
    return a.rows.filter(function (s) { return keep[s.fdm_code]; }).map(function (s) {
      var pm = pmatch[s.fdm_code], lbl = pm ? (pm.journee_num ? 'J' + pm.journee_num + ' · ' : '') + msEsc((msIsUs(pm.team1) ? 'vs ' + pm.team2 : 'à ' + pm.team1)) : msEsc(msDateShort(s.match_date));
      var bits = [];
      if (s.tirs || s.buts) bits.push(s.buts + ' but' + (s.buts > 1 ? 's' : '') + (s.tirs ? ' / ' + s.tirs + ' tir' + (s.tirs > 1 ? 's' : '') + ' (' + msPctJ(s.buts, s.tirs) + ')' : ''));
      if (s.buts_7m) bits.push(s.buts_7m + ' sur 7 m');
      if (s.arrets) bits.push(s.arrets + ' arrêt' + (s.arrets > 1 ? 's' : ''));
      if (s.avertissements) bits.push('avert.');
      if (s.deux_min) bits.push(s.deux_min + '× 2 min');
      if (s.disqualifications) bits.push('disqual.');
      if (s.commotions) bits.push('commotion');
      return '<div><b>' + lbl + '</b> — ' + (bits.length ? bits.join(' · ') : 'sur la feuille, sans action') + '</div>';
    }).join('');
  };
  var click = function (a) { return 'onclick="msJToggle(\'' + msEsc(a.lic) + '\')"'; };
  var isOpen = function (a) { return msState.jopen === a.lic; };
  var feu = function (a) { return a.f + ' feuille' + (a.f > 1 ? 's' : ''); };
  var fh = '', gh = '';

  if (msState.jlay === 'B') {
    var th = function (k, lbl, w) { return '<th class="' + (k === 'nom' ? 'ms-l ' : '') + (key === k ? 'mj-on' : '') + '" style="width:' + w + '%" onclick="msJSort(\'' + k + '\')">' + lbl + (key === k ? (dir < 0 ? ' ▾' : ' ▴') : '') + '</th>'; };
    fh = '<table class="mj-tbl"><thead><tr>' + th('nom', 'Joueur', 35) + th('b', 'Buts', 14) + th('t', 'Tirs', 12) + th('pct', '%', 21) + '<th style="width:18%">Sanct.</th></tr></thead><tbody>' +
      field.map(function (a) {
        var p = pcn(a);
        return '<tr class="mj-r" ' + click(a) + '><td class="ms-l"><b class="mj-nm">' + (isOpen(a) ? '▾ ' : '') + msEsc(nameOf(a.lic)) + '</b><span class="mj-s">n°' + numOf(a) + ' · ' + feu(a) + '</span></td><td class="mj-bn">' + a.b + '</td><td>' + a.t + '</td><td>' +
          (a.t ? '<b class="mj-t ' + col(p) + '">' + p + ' %</b><div class="mj-mini"><u class="' + col(p) + '" style="width:' + p + '%"></u></div>' : '–') + '</td><td>' + (pills(a) || '–') + '</td></tr>' +
          (isOpen(a) ? '<tr class="mj-dr"><td colspan="5">' + detail(a) + '</td></tr>' : '');
      }).join('') +
      '<tr class="mj-tot"><td class="ms-l"><b>Total équipe</b></td><td class="mj-bn">' + tot.b + '</td><td>' + tot.t + '</td><td><b>' + msPctJ(tot.b, tot.t) + '</b></td><td>' + ((tot.av || tot.d2 || tot.dis) ? 'AV ' + tot.av + ' · 2′ ' + tot.d2 + (tot.dis ? ' · DQ ' + tot.dis : '') : '–') + '</td></tr></tbody></table>';
    gh = '<table class="mj-tbl"><thead><tr><th class="ms-l" style="width:46%">Gardien</th><th style="width:16%">Feuilles</th><th class="mj-on" style="width:16%">Arrêts</th><th style="width:22%">% arrêts</th></tr></thead><tbody>' +
      gks.map(function (a) {
        return '<tr class="mj-r" ' + click(a) + '><td class="ms-l"><b class="mj-nm">' + (isOpen(a) ? '▾ ' : '') + msEsc(nameOf(a.lic)) + '</b><span class="mj-s">n°' + numOf(a) + '</span></td><td>' + a.f + '</td><td class="mj-bn">' + a.ar + '</td><td>' + (a.sm ? '≈ ' + Math.round(100 * a.sa / (a.sa + a.so)) + ' %' : 'n.d.') + '</td></tr>' +
          (isOpen(a) ? '<tr class="mj-dr"><td colspan="4">' + detail(a) + '<div>' + gkPct(a) + '</div></td></tr>' : '');
      }).join('') + '</tbody></table>';
  } else if (msState.jlay === 'C') {
    var card = function (a, gk) {
      var p = pcn(a);
      var main = gk ? '<div class="mj-gl">' + a.ar + ' <small>arrêt' + (a.ar > 1 ? 's' : '') + '</small></div><div class="mj-st"><span>' + (a.sm ? '≈ ' + Math.round(100 * a.sa / (a.sa + a.so)) + ' % d\'arrêts' : '% n.d.') + '</span></div>'
        : '<div class="mj-gl">' + a.b + ' <small>but' + (a.b > 1 ? 's' : '') + '</small></div><div class="mj-bar"><u class="' + col(p) + '" style="width:' + p + '%"></u></div><div class="mj-st"><span>' + a.b + '/' + a.t + ' · <b class="mj-t ' + col(p) + '">' + (a.t ? p + ' %' : '–') + '</b></span><span>' + pills(a) + '</span></div>';
      return '<div class="mj-card' + (isOpen(a) ? ' mj-wide' : '') + '" ' + click(a) + '><span class="mj-bd">' + numOf(a) + '</span><div class="mj-cn">' + msEsc(nameOf(a.lic)) + '</div>' + main +
        (isOpen(a) ? '<div class="mj-cdet">' + detail(a) + (gk ? '<div>' + gkPct(a) + '</div>' : '') + '</div>' : '') + '</div>';
    };
    fh = '<div class="mj-grid">' + field.map(function (a) { return card(a, false); }).join('') + '</div>';
    gh = '<div class="mj-grid">' + gks.map(function (a) { return card(a, true); }).join('') + '</div>';
  } else {
    fh = field.map(function (a) {
      var p = pcn(a);
      return '<div class="mj-row" ' + click(a) + '><span class="mj-bd">' + numOf(a) + '</span><div class="mj-mid"><div class="mj-nm">' + msEsc(nameOf(a.lic)) + pills(a) + '</div><div class="mj-s">' + a.b + '/' + a.t + ' tirs · ' + (a.t ? p + ' %' : '–') + (a.b7 ? ' · ' + a.b7 + ' sur 7 m' : '') + ' · ' + feu(a) + '</div><div class="mj-bar"><u class="' + col(p) + '" style="width:' + p + '%"></u></div></div><div class="mj-big"><b>' + a.b + '</b><small>BUTS</small></div></div>' +
        (isOpen(a) ? '<div class="mj-det">' + detail(a) + '</div>' : '');
    }).join('');
    gh = gks.map(function (a) {
      return '<div class="mj-row" ' + click(a) + '><span class="mj-bd">' + numOf(a) + '</span><div class="mj-mid"><div class="mj-nm">' + msEsc(nameOf(a.lic)) + '</div><div class="mj-s">' + feu(a) + ' · ' + (a.sm ? '≈ ' + Math.round(100 * a.sa / (a.sa + a.so)) + ' % d\'arrêts' : '% n.d.') + '</div></div><div class="mj-big"><b>' + a.ar + '</b><small>ARRÊTS</small></div></div>' +
        (isOpen(a) ? '<div class="mj-det">' + detail(a) + '<div>' + gkPct(a) + '</div></div>' : '');
    }).join('');
  }
  var gkTitle = '<h4 class="mj-h">Gardiens' + (savePct !== null ? ' <span>· arrêts équipe ' + savePct + ' % (' + tg.ar + ' arrêts, ' + tg.enc + ' buts encaissés' + (tg.m < nbMatch ? ', ' + tg.m + '/' + nbMatch + ' matchs' : '') + ')</span>' : '') + '</h4>';
  var tLeft = any ? leaders + ctrl + '<h4 class="mj-h">Joueurs de champ</h4>' + (field.length ? fh : '<div class="ms-info">Aucun joueur de champ.</div>') : '';
  var table = any ? (gks.length ? gkTitle + gh : '') +
      '<div class="ms-legend">Touche un joueur pour le détail match par match. Tirs = total des tirs, buts compris (manqués = tirs − buts). AV = avertissement, 2′ = exclusion de 2 min, DQ = disqualification. % d\'arrêts équipe = arrêts ÷ (arrêts + buts encaissés). Pour un gardien, « ≈ » = calculé sur les matchs où il est le seul à avoir des arrêts (la feuille ne dit pas qui était dans le but à chaque but). « feuilles » = feuilles où le joueur est inscrit, pas forcément entré en jeu.</div>'
    : '<div class="ms-info">Aucune stat de joueur pour l\'instant : appuie sur « Mettre à jour les stats des joueurs ».</div>';

  // actions non classées (à vérifier)
  var odd = [];
  d.stats.forEach(function (s) { if (s.autres) Object.keys(s.autres).forEach(function (k) { odd.push(msEsc(nameOf(s.licence)) + ' : ' + msEsc(k) + ' ×' + s.autres[k]); }); });
  var oddHtml = odd.length ? '<div class="ms-note"><b>Actions de la feuille non classées (à vérifier) :</b><br>' + odd.join('<br>') + '</div>' : '';

  var open = {}; Array.prototype.forEach.call(box.querySelectorAll('details[data-ms]'), function (el) { open[el.getAttribute('data-ms')] = el.open; });
  box.innerHTML = head + (any ? '<div class="ms-cols"><div class="ms-c1">' + tLeft + '</div><div class="ms-c2">' + assoc + table + oddHtml + '</div></div>' : assoc + table + oddHtml);
  Array.prototype.forEach.call(box.querySelectorAll('details[data-ms]'), function (el) { if (open[el.getAttribute('data-ms')] === false) el.open = false; });
  var rep2 = document.getElementById('ms-jreport'); if (rep2) rep2.innerHTML = repHtml;
}
function msJSetEq(v) { msState.jeq = v; msState.jopen = null; msJRender(); }
function msJLay(v) { msState.jlay = v; try { localStorage.setItem('ms_jlay_v1', v); } catch (e) {} msJRender(); }
function msJPer(v) { msState.jper = v; msState.jopen = null; msJRender(); }
function msJSort(k) { if (msState.jsort === k) msState.jdir = -msState.jdir; else { msState.jsort = k; msState.jdir = (k === 'nom' || k === 'n') ? 1 : -1; } msJRender(); }
function msJToggle(lic) { msState.jopen = msState.jopen === lic ? null : lic; msJRender(); }
async function msJAssocSave() {
  var msg = document.getElementById('ms-jassoc-msg'), sels = document.querySelectorAll('#ms-jstats select[data-lic]'), n = 0, bad = 0;
  var used = {};
  Array.prototype.forEach.call(sels, function (el) { if (el.value) { if (used[el.value]) bad++; used[el.value] = 1; } });
  if (bad) { msg.style.color = '#e74c3c'; msg.textContent = 'Une même fiche est choisie pour deux joueurs : corrige avant d\'enregistrer.'; return; }
  try {
    await ensureCoachSession();
    for (var i = 0; i < sels.length; i++) {
      var el = sels[i]; if (!el.value) continue;
      var res = await fetch(SB_URL + '/rest/v1/ffhb_joueurs?licence=eq.' + encodeURIComponent(el.getAttribute('data-lic')), {
        method: 'PATCH', headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ player_code: el.value }),
      });
      if (!res.ok) throw new Error('x');
      n++;
    }
    await msJLoad();
    var m2 = document.getElementById('ms-jassoc-msg'); if (m2) { m2.style.color = 'var(--vert)'; m2.textContent = '✓ ' + n + ' lien(s) enregistré(s).'; }
  } catch (e) { msg.style.color = '#e74c3c'; msg.textContent = 'Erreur — réessaie.'; }
}
