// Prépa U15 HBCCS — js/25-analyse.js — dernière modification : version z86 (24/11/2026)
// ===================== ANALYSE (carte « 🔬 Analyse » de l'accueil, visible seulement pour le coach qui l'a activée) =====================
// Écran réservé aux coachs : poules de SUIVI (équipes qu'on rencontrera en phase 2 mais qu'on ne connaît que par leur phase 1),
// leurs classements, et — dans les versions suivantes — probabilités de victoire et fiches des joueurs adverses.
// Données : tables ffhb_sources (role = 'analyse'), poule_matches, adv_player_match_stats. Écrit pour les navigateurs anciens (pas de ?. ni ??).
const anState = { data: null, src: null, j: null, busy: false, M: null, view: 'team', eq: 1, menu: false, ti: 0, tab: 'vue', ctx: [], ctxs: [], notes: [], nf: null };

function anSetKey() { return coachSession && coachSession.login ? 'analyse_card_' + coachSession.login : null; }
// ---- Carte sur l'accueil : visible si un coach est connecté ET qu'il l'a activée dans Réglages (réglage propre à chaque coach) ----
function anIsStephen() { return !!(coachSession && coachSession.login === 'stephen'); }
// z74 : Stephen décide qui voit Analyse (clé analyse_allow_<login>) ; lui garde son propre réglage
function anCanSee() {
  if (!coachSession || !coachSession.login) return false;
  if (anIsStephen()) return appSettings[anSetKey()] === 'true';
  return appSettings['analyse_allow_' + coachSession.login] === 'true';
}
function anUpdateCard() {
  var b = document.getElementById('cs-subtab-analyse');   // z86 : onglet de l'Espace coachs (plus de carte sur l'accueil de l'appli)
  if (b) b.style.display = anCanSee() ? '' : 'none';
  var k = anSetKey(), cb = document.getElementById('an-settings-visible');
  if (cb) cb.checked = !!(k && appSettings[k] === 'true');
  var st = anIsStephen(), own = document.getElementById('an-own-box'), note = document.getElementById('an-note'), al = document.getElementById('an-allow-box');
  if (own) own.style.display = !coachSession || st ? '' : 'none';
  if (note) note.style.display = coachSession && !st ? '' : 'none';
  if (al) {
    al.style.display = st ? '' : 'none';
    if (st) al.innerHTML = '<div style="font-size:13px;font-weight:700;color:var(--gris-clair);margin-bottom:6px;">Qui voit « Analyse » ?</div>'
      + ['sandrine', 'arthur', 'nicolas'].map(function (lg) {
        return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--gris-clair);margin-bottom:6px;cursor:pointer;"><input type="checkbox" style="width:18px;height:18px;" ' + (appSettings['analyse_allow_' + lg] === 'true' ? 'checked ' : '') + 'onchange="anAllowSave(\'' + lg + '\',this)">' + lg.charAt(0).toUpperCase() + lg.slice(1) + '</label>';
      }).join('')
      + '<div id="an-allow-msg" style="font-size:12px;min-height:16px;margin-top:4px;"></div><div style="font-size:11px;color:var(--gris-texte);margin-top:6px;">Mon propre accès :</div>';
  }
}
async function anAllowSave(login, cb) {
  var msg = document.getElementById('an-allow-msg'), v = cb.checked ? 'true' : 'false';
  if (msg) { msg.style.color = 'var(--gris-texte)'; msg.textContent = 'Enregistrement…'; }
  try {
    await ensureCoachSession();
    var res = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', {
      method: 'POST', headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify([{ key: 'analyse_allow_' + login, value: v, updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) throw new Error('x');
    appSettings['analyse_allow_' + login] = v;
    if (msg) { msg.style.color = 'var(--vert)'; msg.textContent = '✓ ' + login.charAt(0).toUpperCase() + login.slice(1) + (v === 'true' ? ' voit Analyse' : ' ne voit plus Analyse'); }
  } catch (e) { cb.checked = !cb.checked; if (msg) { msg.style.color = '#e74c3c'; msg.textContent = 'Erreur — réessaie.'; } }
}
async function anSettingsSave() {
  var msg = document.getElementById('an-settings-msg'), k = anSetKey(), cb = document.getElementById('an-settings-visible');
  if (!msg || !cb) return;
  if (!k) { msg.style.color = '#e74c3c'; msg.textContent = 'Connecte-toi en tant que coach.'; return; }
  msg.style.color = 'var(--gris-texte)'; msg.textContent = 'Enregistrement…';
  try {
    await ensureCoachSession();
    var v = cb.checked ? 'true' : 'false';
    var res = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', {
      method: 'POST', headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify([{ key: k, value: v, updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) throw new Error('x');
    appSettings[k] = v; anUpdateCard();
    msg.style.color = 'var(--vert)'; msg.textContent = '✓ Enregistré — ce réglage ne concerne que ton compte.';
  } catch (e) { msg.style.color = '#e74c3c'; msg.textContent = 'Erreur — réessaie.'; }
}

// ---- Écran ----
function anEnter() {
  if (!anCanSee()) return;   // z74 : accès réglé par Stephen
  anState.view = 'team'; anState.menu = false; anState.first = true;
  anLoad();
}
function anBack() {
  if (anState.view === 'our' || anState.menu) { anState.view = 'team'; anState.menu = false; anRender(); return; }
  coachSubtabSwitch('dashboard');
}
async function anLoad() {
  var box = document.getElementById('an-body');
  if (!box) return;
  if (!anState.data) box.innerHTML = '<div class="ms-info">Chargement…</div>';
  try {
    await ensureCoachSession();
    if (!coachSession) { box.innerHTML = '<div class="ms-info">Connecte-toi en tant que coach.</div>'; return; }
    var H = coachAuthHeaders();
    var r = await Promise.all([
      fetch(SB_URL + '/rest/v1/ffhb_sources?select=*&order=created_at.asc', { headers: H }),
      fetch(SB_URL + '/rest/v1/poule_matches?select=*&order=journee_num.asc', { headers: H }),
    ]);
    if (!r[0].ok || !r[1].ok) throw new Error('lecture impossible');
    var adv = [], off = 0, cols = 'fdm_code,team,licence,nom,numero,buts,buts_7m,tirs,arrets,avertissements,deux_min,disqualifications';
    while (off < 20000) {
      var ra = await fetch(SB_URL + '/rest/v1/adv_player_match_stats?select=' + cols + '&order=id.asc&limit=1000&offset=' + off, { headers: H });
      if (!ra.ok) break;
      var part = await ra.json(); adv = adv.concat(part);
      if (part.length < 1000) break; off += 1000;
    }
    try { var rn = await fetch(SB_URL + '/rest/v1/match_notes?select=*&order=created_at.asc&limit=1000', { headers: H }); anState.notes = rn.ok ? await rn.json() : []; } catch (e0) { anState.notes = []; }
    anState.data = { sources: await r[0].json(), poule: await r[1].json(), adv: adv };
    anState.M = anBuild(anState.data);
    if (anState.first || !anState.M.keys[anState.ti]) { anState.first = false; anPickDefault(); }
    anRender();
  } catch (e) {
    if (window.console) console.error("anLoad", e && e.stack ? e.stack : e);
    box.innerHTML = '<div class="ms-info" style="color:#e74c3c;">Erreur de chargement. <button class="ms-btn" onclick="anLoad()">↻ Réessayer</button></div>';
  }
}
function anStamp(d) {
  var best = null;
  d.sources.forEach(function (s) { if (s.active && s.last_sync_at && (!best || s.last_sync_at > best)) best = s.last_sync_at; });
  return best ? 'Données lues le ' + homeFmtDateShort(best).replace(/^[^ ]+ /, '').replace(' · ', ' à ') : 'Données jamais lues : appuie sur ↻ (page d\'accueil)';
}
function anSuivi() { return anState.data.sources.filter(function (s) { return s.role === 'analyse'; }); }

function anRender() {
  var box = document.getElementById('an-body'), d = anState.data;
  if (!box || !d) return;
  var open = {};
  Array.prototype.forEach.call(box.querySelectorAll('details[data-an]'), function (el) { open[el.getAttribute('data-an')] = el.open; });
  var rep = document.getElementById('an-report'), repHtml = rep ? rep.innerHTML : '';
  var html;
  if (anState.view === 'our' && anState.M) html = anOurHtml();
  else html = anTopHtml(d) + (anState.menu ? anMenuHtml(d) : '') + (anState.M ? anTeamView(d) : '');
  box.innerHTML = html;
  Array.prototype.forEach.call(box.querySelectorAll('details[data-an]'), function (el) { if (open[el.getAttribute('data-an')]) el.open = true; });
  var rep2 = document.getElementById('an-report'); if (rep2) rep2.innerHTML = repHtml;
}

// ---------------------------------------------------------------------------------------------
// z53 — MODÈLE : de poule_matches + adv_player_match_stats vers une fiche par équipe
// ---------------------------------------------------------------------------------------------
// Clé d'équipe : nom normalisé (majuscules, sans accents, sans parenthèses « (-15M) », espaces réduits) — les identifiants FFHB changent d'une phase à l'autre.
function anTK(name) { return msNorm(name).replace(/\([^)]*\)/g, ' ').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
var AN_US = 'CLERMONT SALAGOU';
function anIsUs(name) { return anTK(name).indexOf(AN_US) !== -1; }
function anF1(x) { return (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); }
function anSgn(x) { var s = anF1(x); return (x > 0 ? '+' : '') + s; }
function anPlayedRow(p) { return p.score1 !== null && p.score1 !== undefined && p.score2 !== null && p.score2 !== undefined; }
function anAvg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }

function anBuild(d) {
  var srcById = {}; d.sources.forEach(function (s) { srcById[s.id] = s; });
  var seen = {}, teams = {}, order = [];
  var T = function (name) {
    var k = anTK(name);
    if (!teams[k]) { teams[k] = { key: k, names: {}, name: name, ms: [], rows: [] }; order.push(k); }
    teams[k].names[name] = (teams[k].names[name] || 0) + 1;
    return teams[k];
  };
  d.poule.forEach(function (p) {
    var s = srcById[p.source_id]; if (!s || !s.active) return;
    var id = String(p.ext_rencontre_id); if (seen[id]) return; seen[id] = true;
    var fo = p.forfait === 1 || p.forfait === 2, pl = anPlayedRow(p) && !fo;
    var tiers = p.t1_1 === null || p.t1_1 === undefined ? null : [[p.t1_1, p.t1_2], [p.t2_1, p.t2_2], [p.t3_1, p.t3_2]];
    var base = { rid: id, src: s, j: p.journee_num, date: p.match_date, fdm: p.fdm_code, video: p.video_url || '', played: pl, forfait: fo, scored: anPlayedRow(p) };
    var a = T(p.team1), b = T(p.team2);
    a.ms.push(Object.assign({}, base, { opp: p.team2, oppK: anTK(p.team2), home: true, gf: p.score1, ga: p.score2, tiers: tiers ? tiers.map(function (t) { return [t[0], t[1]]; }) : null, ht: p.ht1 !== null && p.ht1 !== undefined ? [p.ht1, p.ht2] : null }));
    b.ms.push(Object.assign({}, base, { opp: p.team1, oppK: anTK(p.team1), home: false, gf: p.score2, ga: p.score1, tiers: tiers ? tiers.map(function (t) { return [t[1], t[0]]; }) : null, ht: p.ht1 !== null && p.ht1 !== undefined ? [p.ht2, p.ht1] : null }));
  });
  (d.adv || []).forEach(function (r) { var k = anTK(r.team); if (teams[k]) teams[k].rows.push(r); });
  // nom d'affichage = le plus fréquent
  order.forEach(function (k) { var t = teams[k], best = 0; Object.keys(t.names).forEach(function (n) { if (t.names[n] > best) { best = t.names[n]; t.name = n; } }); });
  var M = { teams: teams, keys: order.filter(function (k) { return k.indexOf(AN_US) === -1; }), srcById: srcById };
  order.forEach(function (k) { teams[k].st = anStats(teams[k]); });
  // distributions (équipes ayant au moins 2 matchs lus) pour colorer les valeurs par rang
  M.dist = {};
  var metrics = ['gf', 'ga', 'diff', 'form', 'reg', 't1', 't2', 't3', 'deux', 'avert', 'arrets', 'tirs', 'reussite', 'b7', 'top2'];
  metrics.forEach(function (m) {
    var arr = []; M.keys.forEach(function (k) { var st = teams[k].st; if (st.n >= 2 && st[m] !== null && st[m] !== undefined) arr.push(st[m]); });
    arr.sort(function (x, y) { return x - y; }); M.dist[m] = arr;
  });
  return M;
}
function anPct(M, m, v) { // part des équipes strictement moins « fortes » que v (0..1), sur les valeurs brutes (le sens est géré par anCls)
  var arr = M.dist[m] || []; if (arr.length < 3 || v === null || v === undefined) return null;
  var below = 0, eq = 0; arr.forEach(function (x) { if (x < v) below++; else if (x === v) eq++; });
  return (below + eq / 2) / arr.length;
}
function anCls(M, m, v, invert) { // classe de couleur : gr (haut du panier), b, y, rd — invert = plus c'est bas, mieux c'est
  var p = anPct(M, m, v); if (p === null) return 'b';
  if (invert) p = 1 - p;
  return p >= 0.75 ? 'gr' : (p >= 0.5 ? 'b' : (p >= 0.25 ? 'y' : 'rd'));
}
function anRankOf(M, m, v, invert) { // rang (1 = meilleur) et nombre d'équipes comparées
  var arr = M.dist[m] || []; if (v === null || v === undefined || !arr.length) return null;
  var better = 0; arr.forEach(function (x) { if (invert ? x < v : x > v) better++; });
  return { r: better + 1, n: arr.length };
}

function anStats(t) {
  var pl = t.ms.filter(function (m) { return m.played; });
  pl.sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : 9e15) - (b.date ? new Date(b.date).getTime() : 9e15) || (a.j || 0) - (b.j || 0); });
  var st = { n: pl.length, v: 0, nu: 0, d: 0, gf: null, ga: null, diff: null, last5: [], form: null, reg: null, close: 0, homeD: null, awayD: null,
    t1: null, t2: null, t3: null, nT: 0, games: 0, deux: null, avert: null, dis: 0, arrets: null, tirs: null, reussite: null, b7: null, top2: null, top2n: [], players: [], gk: null, pArr: null };
  if (!pl.length) { st.players = anPlayers(t, st); return st; }
  var gf = 0, ga = 0, diffs = [], hd = [], ad = [], tt = [[], [], []];
  pl.forEach(function (m) {
    gf += m.gf; ga += m.ga; diffs.push(m.gf - m.ga);
    if (m.gf > m.ga) st.v++; else if (m.gf < m.ga) st.d++; else st.nu++;
    if (Math.abs(m.gf - m.ga) <= 3) st.close++;
    (m.home ? hd : ad).push(m.gf - m.ga);
    if (m.tiers) { st.nT++; for (var i = 0; i < 3; i++) tt[i].push(m.tiers[i][0] - m.tiers[i][1]); }
  });
  st.gf = gf / pl.length; st.ga = ga / pl.length; st.diff = st.gf - st.ga;
  st.homeD = anAvg(hd); st.awayD = anAvg(ad);
  var mean = anAvg(diffs), varr = anAvg(diffs.map(function (x) { return (x - mean) * (x - mean); }));
  st.reg = diffs.length >= 3 ? -Math.sqrt(varr) : null; // plus l'écart-type est faible, plus l'équipe est régulière
  st.last5 = pl.slice(-5).map(function (m) { return { gf: m.gf, ga: m.ga, r: m.gf > m.ga ? 'w' : (m.gf < m.ga ? 'l' : 'n') }; });
  st.form = anAvg(st.last5.map(function (x) { return x.r === 'w' ? 1 : (x.r === 'n' ? 0.5 : 0); }));
  if (st.nT >= 2) { st.t1 = anAvg(tt[0]); st.t2 = anAvg(tt[1]); st.t3 = anAvg(tt[2]); }
  st.players = anPlayers(t, st);
  return st;
}
function anPlayers(t, st) {
  var byF = {}, P = {}, goals = 0;
  t.rows.forEach(function (r) { byF[r.fdm_code] = true; });
  st.games = Object.keys(byF).length;
  t.rows.forEach(function (r) {
    var p = P[r.licence] || (P[r.licence] = { licence: r.licence, nom: r.nom, num: r.numero, g: 0, buts: 0, tirs: 0, b7: 0, arrets: 0, deux: 0, avert: 0, dis: 0 });
    p.g++; p.buts += r.buts; p.tirs += r.tirs; p.b7 += r.buts_7m; p.arrets += r.arrets; p.deux += r.deux_min; p.avert += r.avertissements; p.dis += r.disqualifications;
    if (r.numero !== null && r.numero !== undefined) p.num = r.numero;
    goals += r.buts;
  });
  var list = Object.keys(P).map(function (k) { return P[k]; });
  list.sort(function (a, b) { return b.buts - a.buts || b.arrets - a.arrets; });
  list.forEach(function (p) { p.share = goals ? p.buts / goals : 0; });
  if (st.games) {
    var sum = function (f) { return list.reduce(function (s, p) { return s + p[f]; }, 0); };
    st.deux = sum('deux') / st.games; st.avert = sum('avert') / st.games; st.dis = sum('dis');
    st.arrets = sum('arrets') / st.games; st.tirs = sum('tirs') / st.games; st.b7 = sum('b7') / st.games;
    st.reussite = sum('tirs') ? sum('buts') / sum('tirs') : null;
    if (goals && list.length >= 2) { st.top2 = (list[0].buts + list[1].buts) / goals; st.top2n = [list[0], list[1]]; }
    var gaF = 0; t.ms.forEach(function (m) { if (m.played && m.fdm && byF[m.fdm]) gaF += m.ga; });
    var arr = sum('arrets'); st.pArr = (arr + gaF) ? arr / (arr + gaF) : null;
    var gks = list.filter(function (p) { return p.arrets > 0; }).sort(function (a, b) { return b.arrets - a.arrets; });
    st.gk = gks.length ? gks[0] : null;
  }
  return list;
}

// ---------------------------------------------------------------------------------------------
// z53 — VUES : liste des équipes, puis fiche équipe (onglets Vue d'ensemble / Joueurs / Calendrier / Face à nous)
// ---------------------------------------------------------------------------------------------
function anVal(cls, txt) { return '<span class="an-v ' + cls + '">' + txt + '</span>'; }
function anBars(p) { // p = 0..1 ; 5 barres, couleur selon le niveau
  if (p === null || p === undefined) return '<span class="an-bars"><s class="o"></s><s class="o"></s><s class="o"></s><s class="o"></s><s class="o"></s></span>';
  var n = Math.max(1, Math.min(5, Math.ceil(p * 5))), c = p >= 0.6 ? '' : (p >= 0.35 ? ' y' : ' r'), h = '';
  for (var i = 0; i < 5; i++) h += '<s class="' + (i < n ? '' : 'o') + '"></s>';
  return '<span class="an-bars' + c + '">' + h + '</span>';
}
function anLabel(p) { return p === null ? 'pas assez de données' : (p >= 0.8 ? 'Excellente' : (p >= 0.6 ? 'Bonne' : (p >= 0.4 ? 'Moyenne' : (p >= 0.2 ? 'Faible' : 'Très faible')))); }
function anLabelCls(p) { return p === null ? ' an-na' : (p >= 0.6 ? '' : (p >= 0.35 ? ' y' : ' r')); }
function anInit(name) { var w = name.replace(/\([^)]*\)/g, '').split(/[\s-]+/).filter(function (x) { return x && !/^(HB|HBC|HBO|AC|CC|GH|SC|FC|PHB|CHB|GHB|RC|ASC|AS|DE|DU|LA|LE|LES|D|L)$/i.test(x); }); return ((w[0] || name)[0] + ((w[1] || w[0] || ' ')[1] || '')).toUpperCase(); }
function anRec(st) { return st.n ? st.v + ' V · ' + st.nu + ' N · ' + st.d + ' D' : 'aucun match lu'; }

// ---------------------------------------------------------------------------------------------
// z58 — PROBABILITÉS DE VICTOIRE (tendance, pas prédiction)
// Méthode : chaque équipe reçoit une « cote » (en buts d'écart) calculée sur TOUS les matchs joués, toutes poules confondues :
// écart du match ≈ cote(A) − cote(B) + avantage du domicile. Les cotes sont ajustées ensemble (itérations) : une équipe qui a joué
// dans deux poules relie ces poules, ce qui corrige automatiquement le niveau D1/D2/D3. Les cotes sont tirées vers 0 quand l'équipe a peu de matchs.
// La probabilité vient d'une loi normale sur l'écart (écart-type mesuré sur les matchs lus). Confiance : peu fiable < 4 matchs
// ou poules non reliées ; moyenne 4–7 matchs ; correcte dès 8 matchs pour les deux équipes.
// ---------------------------------------------------------------------------------------------
var AN_LAMBDA = 3;
function anNormCdf(z) { // approximation d'Abramowitz-Stegun
  var t = 1 / (1 + 0.2316419 * Math.abs(z)), dd = 0.3989423 * Math.exp(-z * z / 2);
  var p = dd * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function anRatings(M) {
  if (M.rate) return M.rate;
  var rows = [], teams = M.teams, keys = Object.keys(teams);
  keys.forEach(function (k) { teams[k].ms.forEach(function (m) { if (m.played && m.home) rows.push({ a: k, b: m.oppK, d: m.gf - m.ga }); }); });
  var R = { r: {}, n: {}, comp: {}, h: 0, sd: 7, rows: rows.length };
  keys.forEach(function (k) { R.r[k] = 0; R.n[k] = 0; });
  if (!rows.length) { M.rate = R; return R; }
  var sum = 0; rows.forEach(function (x) { sum += x.d; }); R.h = Math.max(0, Math.min(4, sum / rows.length));
  rows.forEach(function (x) { R.n[x.a] = (R.n[x.a] || 0) + 1; R.n[x.b] = (R.n[x.b] || 0) + 1; if (R.r[x.b] === undefined) R.r[x.b] = 0; });
  for (var it = 0; it < 80; it++) {
    var acc = {}, cnt = {};
    rows.forEach(function (x) {
      acc[x.a] = (acc[x.a] || 0) + (x.d - R.h + R.r[x.b]); cnt[x.a] = (cnt[x.a] || 0) + 1;
      acc[x.b] = (acc[x.b] || 0) + (-(x.d - R.h) + R.r[x.a]); cnt[x.b] = (cnt[x.b] || 0) + 1;
    });
    Object.keys(cnt).forEach(function (k) { R.r[k] = acc[k] / (cnt[k] + AN_LAMBDA); });
  }
  var se = 0; rows.forEach(function (x) { var e = x.d - (R.r[x.a] - R.r[x.b] + R.h); se += e * e; });
  R.sd = Math.max(5, Math.sqrt(se / rows.length) * 1.05);
  // composantes reliées (union-find)
  var par = {}, find = function (k) { while (par[k] !== k) { par[k] = par[par[k]]; k = par[k]; } return k; };
  Object.keys(R.n).forEach(function (k) { par[k] = k; });
  rows.forEach(function (x) { var u = find(x.a), v = find(x.b); if (u !== v) par[u] = v; });
  Object.keys(R.n).forEach(function (k) { R.comp[k] = find(k); });
  M.rate = R; return R;
}
// Probabilité que kA batte kB (aDom = A joue à domicile). null = équipe inconnue (aucun match lu).
function anProb(kA, kB, aDom) {
  var M = anState.M; if (!M || !kA || !kB) return null;
  var R = anRatings(M), nA = R.n[kA] || 0, nB = R.n[kB] || 0;
  if (!nA || !nB) return null;
  var mu = R.r[kA] - R.r[kB] + (aDom ? R.h : -R.h);
  var p = 1 - anNormCdf((0.5 - mu) / R.sd); // P(écart ≥ 1 but) ; les nuls sont rares en jeunes
  var nmin = Math.min(nA, nB), lie = R.comp[kA] === R.comp[kB];
  var lvl = !lie ? 0 : (nmin >= 8 ? 2 : (nmin >= 4 ? 1 : 0)), w = [0.5, 0.75, 1][lvl];
  p = 0.5 + (p - 0.5) * w;
  var pct = Math.max(5, Math.min(95, Math.round(p * 20) * 5));
  return { p: pct, mu: mu, lvl: lvl, conf: ['peu fiable', 'moyenne', 'correcte'][lvl], note: !lie ? 'poules non reliées : niveau incertain' : (nmin < 4 ? 'moins de 4 matchs lus' : '') };
}
function anProbCell(pr, who) {
  if (!pr) return '<span class="an-na">inconnu</span>';
  var c = pr.p >= 60 ? 'gr' : (pr.p >= 40 ? 'y' : 'rd');
  return (who ? '<span class="an-na">' + who + ' </span>' : '') + anVal(c, pr.p + ' %') + '<br><span class="an-na" style="font-size:9.5px;">' + pr.conf + '</span>';
}
function anProbLine(pr, who) {
  if (!pr) return who + ' : chances inconnues (pas de données sur cette équipe)';
  return who + ' : <b>' + pr.p + ' %</b> de gagner <span class="an-na">· confiance ' + pr.conf + '</span>';
}

// ----- Poule « courante » d'une équipe : la source de nos équipes (role nous) où elle a des matchs à venir ; sinon sa dernière poule
function anCurrentSrc(t) {
  var best = null;
  t.ms.forEach(function (m) { if (m.src.role !== 'analyse' && !m.scored) { if (!best || new Date(m.src.created_at) > new Date(best.created_at)) best = m.src; } });
  return best;
}
function anNextOf(eq) { // prochain match de notre équipe eq (1 ou 2) : daté d'abord, puis par journée
  var M = anState.M, cands = [];
  Object.keys(M.teams).forEach(function (k) {
    if (k.indexOf(AN_US) === -1) return;
    var us = M.teams[k], d = k.match(/(\d)\s*$/); if (d && parseInt(d[1], 10) !== eq) return;
    us.ms.forEach(function (m) { if (!m.scored && m.src.role !== 'analyse' && m.src.equipe === eq) cands.push(Object.assign({}, m, { usK: k })); });
  });
  cands.sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : 9e15) - (b.date ? new Date(b.date).getTime() : 9e15) || (a.j || 0) - (b.j || 0); });
  return cands[0] || null;
}
function anPouleTeams(src) { // équipes (hors nous) d'une source
  var M = anState.M, out = [];
  M.keys.forEach(function (k) { if (M.teams[k].ms.some(function (m) { return m.src.id === src.id; })) out.push(k); });
  return out;
}

function anOpen(i, ctxName) {
  anState.view = 'team'; anState.menu = false; anState.ti = i; anState.tab = anState.tab || 'vue';
  if (ctxName !== undefined) anState.ctx = ctxName;
  window.scrollTo(0, 0); anRender();
}
function anClose() { anState.view = 'team'; anRender(); }
function anTab(t) { anState.tab = t; anRender(); }
function anPick(i) { anState.ti = i; window.scrollTo(0, 0); anRender(); }
function anMenu() { anState.menu = !anState.menu; anRender(); }
function anSelectEq(eq) {
  var n = anNextOf(eq); if (!n || !anState.M) return;
  var i = anIdx(n.oppK); if (i < 0) return;
  anState.eq = eq; anState.ti = i; anState.ctx = anPouleTeams(n.src).map(anIdx); anState.view = 'team'; anState.menu = false;
  window.scrollTo(0, 0); anRender();
}
function anPickDefault() {
  var eqs = [1, 2], i;
  for (i = 0; i < eqs.length; i++) { if (anNextOf(eqs[i]) && anIdx(anNextOf(eqs[i]).oppK) >= 0) { anSelectEq(eqs[i]); return; } }
  anState.ti = 0; anState.ctx = anState.M.keys.map(function (k, j) { return j; });
}
function anIdx(k) { return anState.M.keys.indexOf(k); }

// ----- Liste d'entrée -----
function anChips(keys, ctx) {
  var M = anState.M;
  var ctxIdx = keys.map(anIdx);
  return '<div class="an-chips">' + keys.map(function (k) {
    var t = M.teams[k], st = t.st;
    return '<button class="an-chip" onclick="anOpen(' + anIdx(k) + ',anState.ctxs[' + ctx + '])"><b>' + msEsc(t.name) + '</b><span>' + (st.n ? anRec(st) : 'pas de données') + '</span></button>';
  }).join('') + '</div>';
}
// ----- Panneau ⚙️ : autres équipes suivies, classements, liens -----
function anMenuHtml(d) {
  var M = anState.M, ctxs = [], h = '<div class="an-menu">';
  anState.ctxs = ctxs;
  var suivi = anSuivi(), nbP = 0, nbT = {}, inner = '';
  if (M) suivi.forEach(function (s) {
    var pt = anPouleTeams(s); if (!pt.length) return; ctxs.push(pt.map(anIdx)); nbP++; pt.forEach(function (k) { nbT[k] = true; });
    inner += '<details class="ms-det" data-an="s' + msEsc(s.id) + '"><summary>' + msEsc(s.label || 'Poule') + ' · ' + pt.length + ' équipes</summary>' + anChips(pt, ctxs.length - 1) + '</details>';
  });
  if (nbP) h += '<details class="ms-det" data-an="autres"><summary>Autres équipes suivies (' + nbP + ' poule' + (nbP > 1 ? 's' : '') + ' · ' + Object.keys(nbT).length + ' équipes)</summary>' + inner + '</details>';
  h += '<details class="ms-det" data-an="class"><summary>📊 Classements des poules de suivi</summary>' + anPouleHtml(d) + '</details>';
  h += '<details class="ms-det" data-an="src"><summary>🔗 Données et poules de suivi · ' + suivi.length + ' lien(s)</summary>' + anSourcesHtml(suivi) + '</details>';
  return h + '</div>';
}

// ----- z60 : barre d'outils, cartes équipe 1 / 2, bande d'écussons, duel nous / eux -----
function anColorCls(name) { var h = 0, i; for (i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 8; return 'an-c' + h; }
function anTopHtml(d) {
  return '<div class="an-tools"><span class="an-stamp">' + msEsc(anStamp(d)) + '</span>' +
    '<button class="an-ic" title="Notre équipe : points forts et faibles" onclick="anOpenOur()">📝</button>' +
    '<button class="an-ic' + (anState.menu ? ' on' : '') + '" title="Autres poules, classements, liens" onclick="anMenu()">⚙️</button></div><div id="an-report"></div>';
}
function anEqCards() {
  var M = anState.M;
  return '<div class="an-eqs">' + [1, 2].map(function (eq) {
    var n = anNextOf(eq), on = anState.eq === eq;
    if (!n) return '<div class="an-eq"><div class="an-crest an-sm">É' + eq + '</div><div><small>ÉQUIPE ' + eq + '</small><b>Aucun match à venir connu</b></div></div>';
    var t = M.teams[n.oppK];
    return '<button class="an-eq' + (on ? ' on' : '') + '" onclick="anSelectEq(' + eq + ')"><div class="an-crest an-sm">É' + eq + '</div><div><small>ÉQUIPE ' + eq + (n.j ? ' · J' + n.j : '') + '</small><b>' + msEsc(t ? t.name : n.opp) + '</b><i>' +
      (n.date ? msEsc(homeFmtDateShort(n.date)) : 'Date à confirmer') + ' · ' + (n.home ? 'domicile' : 'extérieur') + '</i></div></button>';
  }).join('') + '</div>';
}
function anStrip() {
  var M = anState.M, ctx = anState.ctx && anState.ctx.length ? anState.ctx : M.keys.map(function (k, j) { return j; });
  return '<div class="an-strip">' + ctx.map(function (i) {
    var t = M.teams[M.keys[i]]; if (!t) return '';
    return '<button class="an-sc' + (i === anState.ti ? ' on' : '') + '" onclick="anPick(' + i + ')"><span class="an-crest an-rd ' + anColorCls(t.key) + '">' + msEsc(anInit(t.name)) + '</span>' + msEsc(t.name.replace(/\([^)]*\)/g, '').replace(/^(HBC|HB|AC|CC|GHB|GH)\s+/i, '').slice(0, 16)) + '</button>';
  }).join('') + '</div>';
}
function anDuel(t) {
  var M = anState.M, st = t.st, nx = null;
  t.ms.forEach(function (m) { if (!m.scored && anIsUs(m.opp) && (!nx || (m.date ? new Date(m.date).getTime() : 9e15) < (nx.date ? new Date(nx.date).getTime() : 9e15))) nx = m; });
  var themBox = '<div class="an-side them"><div class="an-crest an-lg ' + anColorCls(t.key) + '">' + msEsc(anInit(t.name)) + '</div><b>' + msEsc(t.name) + '</b><span>' + (st.n ? anRec(st) : 'aucun match lu') + '</span></div>';
  if (!nx) return '<div class="an-vs"><div class="an-when">AUCUN MATCH CONTRE NOUS PRÉVU DANS LES DONNÉES LUES</div><div class="an-duel one">' + themBox + '</div></div>';
  var us = M.teams[nx.oppK], pr = anProb(nx.oppK, t.key, !nx.home);
  var when = (nx.j ? 'J' + nx.j + ' · ' : '') + (nx.date ? homeFmtDateShort(nx.date) : 'Date à confirmer') + ' · ' + (nx.home ? 'chez eux' : 'chez nous');
  var g = pr ? '<div class="an-gauge"><u class="n" style="width:' + pr.p + '%">' + pr.p + ' %</u><u class="e" style="width:' + (100 - pr.p) + '%">' + (100 - pr.p) + ' %</u></div><div class="an-gl"><span>Nous</span><span>Eux</span></div>' +
    '<div class="an-conf">Confiance : ' + pr.conf + (pr.note ? ' (' + msEsc(pr.note) + ')' : '') + ' · tendance, pas prédiction</div>' : '<div class="an-conf">Chances inconnues : pas assez de données sur une des deux équipes.</div>';
  return '<div class="an-vs"><div class="an-when">PROCHAIN MATCH · ' + msEsc(when.toUpperCase()) + '</div><div class="an-duel"><div class="an-side"><div class="an-crest an-lg">CS</div><b>' + msEsc(us ? us.name : 'Nous') + '</b><span>' + (us && us.st.n ? anRec(us.st) : 'aucun match lu') + '</span></div><div class="an-mid">VS</div>' + themBox + '</div>' + g + '</div>';
}
function anTiles(t) {
  var M = anState.M, st = t.st, rg = anRankOf(M, 'diff', st.diff);
  var f5 = st.last5.map(function (x) { return '<span class="' + x.r + '">' + x.gf + '-' + x.ga + '</span>'; }).join('');
  return '<div class="an-tiles"><div class="an-tile t1"><small>Buts / match</small><b>' + (st.n ? anF1(st.gf) : '–') + '</b></div><div class="an-tile t2"><small>Encaissés</small><b>' + (st.n ? anF1(st.ga) : '–') + '</b></div>' +
    '<div class="an-tile t3"><small>Écart / match</small><b>' + (st.n ? anSgn(st.diff) : '–') + '</b>' + (f5 ? '<div class="an-fm">' + f5 + '</div>' : '') + '</div>' +
    '<div class="an-tile t4"><small>Classement</small><b>' + (rg ? rg.r + 'e / ' + rg.n : '–') + '</b></div></div>';
}

// ----- Fiche équipe -----
function anTeamView(d) {
  var M = anState.M, k = M.keys[anState.ti];
  if (!k) return '<div class="ms-info">Aucune équipe lue pour l\'instant : appuie sur ↻ (page d\'accueil) pour lire les poules.</div>';
  var t = M.teams[k], tab = anState.tab || 'vue';
  var tabs = [['vue', 'Vue d\'ensemble'], ['joueurs', 'Joueurs'], ['cal', 'Calendrier'], ['nous', 'Face à nous'], ['notes', 'Notes']];
  var tb = '<div class="an-tabs">' + tabs.map(function (x) { return '<button class="' + (tab === x[0] ? 'on' : '') + '" onclick="anTab(\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>';
  var body = tab === 'notes' ? anTabNotes(t) : tab === 'joueurs' ? anTabPlayers(t) : (tab === 'cal' ? anTabCal(t) : (tab === 'nous' ? anTabUs(t) : anTabVue(t)));
  return anEqCards() + anStrip() + '<div class="an-fiche">' + anDuel(t) + anTiles(t) + tb + body + '</div>';
}
function anGauges(t) {
  var M = anState.M, st = t.st; if (!st.n) return '';
  var G = function (lab, m, v, inv, txt) { var p = anPct(M, m, v); if (p !== null && inv) p = 1 - p; var rk = anRankOf(M, m, v, inv);
    return '<div class="an-g"><small>' + lab + '</small>' + anBars(p) + '<b class="' + anLabelCls(p) + '">' + (txt || (rk && p !== null ? rk.r + 'e / ' + rk.n : anLabel(p))) + '</b></div>'; };
  var f5 = st.last5.map(function (x) { return '<span class="' + x.r + '">' + x.gf + '–' + x.ga + '</span>'; }).join('');
  var fp = st.form === null ? null : st.form;
  return '<div class="an-gauges">' +
    '<div class="an-g"><small>Forme (5 derniers)</small>' + anBars(fp) + '<b class="' + anLabelCls(fp) + '">' + anLabel(fp) + '</b></div>' +
    G('Attaque', 'gf', st.gf, false) + G('Défense', 'ga', st.ga, true) + G('Régularité', 'reg', st.reg, false) +
    '<div class="an-g wide"><small>Derniers matchs</small><div class="an-form">' + f5 + '</div></div></div>' +
    (st.n < 4 ? '<div class="an-warn">Seulement ' + st.n + ' match(s) lu(s) : les jauges sont à prendre avec prudence.</div>' : '');
}
function anRow(lab, cls, txt) { return '<div class="an-r"><span>' + lab + '</span>' + anVal(cls, txt) + '</div>'; }
function anTabVue(t) {
  var M = anState.M, st = t.st;
  if (!st.n) return anNoData(t);
  var C = function (m, v, inv) { return anCls(M, m, v, inv); };
  var has = st.games > 0, dash = '<span class="an-na">–</span>';
  var attaque = '<div class="an-col"><h4>Attaque</h4>' +
    anRow('Buts par match', C('gf', st.gf), anF1(st.gf)) +
    (has ? anRow('Tirs par match', C('tirs', st.tirs), anF1(st.tirs)) + anRow('Réussite aux tirs', C('reussite', st.reussite), st.reussite === null ? '–' : Math.round(st.reussite * 100) + ' %') + anRow('7 m marqués / match', C('b7', st.b7), anF1(st.b7)) : '<div class="an-na">Feuilles de match pas encore lues pour cette équipe.</div>') +
    '<h4 class="an-h2">Discipline</h4>' + (has ? anRow('2 min par match', C('deux', st.deux, true), anF1(st.deux)) + anRow('Avertissements / match', C('avert', st.avert, true), anF1(st.avert)) + anRow('Disqualifications (total)', st.dis ? 'rd' : 'gr', String(st.dis)) : '<div class="an-na">–</div>') + '</div>';
  var defense = '<div class="an-col"><h4>Défense</h4>' +
    anRow('Buts encaissés / match', C('ga', st.ga, true), anF1(st.ga)) +
    (has ? anRow('Arrêts du gardien / match', C('arrets', st.arrets), anF1(st.arrets)) + anRow('% d\'arrêts (estimé)', 'b', st.pArr === null ? '–' : Math.round(st.pArr * 100) + ' %') : '') +
    '<h4 class="an-h2">Tiers-temps (écart moyen)</h4>' +
    (st.t1 === null ? '<div class="an-na">Tiers-temps pas encore lus.</div>' :
      anRow('1er tiers-temps', C('t1', st.t1), anSgn(st.t1)) + anRow('2e tiers-temps', C('t2', st.t2), anSgn(st.t2)) + anRow('3e tiers-temps', C('t3', st.t3), anSgn(st.t3))) + '</div>';
  var profil = '<div class="an-col"><h4>Profil de jeu</h4>' +
    (st.t1 !== null ? anRow('Démarre fort (T1)', C('t1', st.t1), anSgn(st.t1)) + anRow('Termine bien (T3)', C('t3', st.t3), anSgn(st.t3)) : '') +
    (st.top2 !== null ? anRow('Buts des 2 meilleurs buteurs', st.top2 >= 0.5 ? 'rd' : (st.top2 >= 0.4 ? 'y' : 'gr'), Math.round(st.top2 * 100) + ' %') : '') +
    (st.homeD !== null && st.awayD !== null ? anRow('Écart domicile / extérieur', 'b', anSgn(st.homeD) + ' / ' + anSgn(st.awayD)) : '') +
    anRow('Matchs serrés (≤ 3 buts)', 'b', st.close + ' / ' + st.n) + '</div>';
  var right = '<div class="an-right"><h4>Bilan des matchs lus</h4><div class="an-big"><div><small>Matchs</small><b>' + st.n + '</b><em>' + anRec(st) + '</em></div><div><small>Marqués</small><b>' + Math.round(st.gf * st.n) + '</b><em>' + anF1(st.gf) + ' / match</em></div><div><small>Encaissés</small><b>' + Math.round(st.ga * st.n) + '</b><em>' + anF1(st.ga) + ' / match</em></div></div>' +
    '<h4 class="an-h2">Calendrier restant</h4>' + anRemaining(t) + '<h4 class="an-h2">Comparé aux équipes suivies</h4>' + anBarsCmp(t) + '</div>';
  return anGauges(t) + anVideos(t) + '<div class="an-body">' + attaque + defense + profil + right + '</div>' + anWatch(t);
}
function anNoData(t) {
  return '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col"><div class="an-na" style="padding:14px 0;">Aucun match joué n\'a encore été lu pour cette équipe : elle vient sans doute d\'une poule que tu ne suis pas, ou sa phase 2 n\'a pas commencé. ' +
    'Si tu connais sa poule de 1re phase, ajoute-la dans « Poules de suivi ».</div><h4 class="an-h2">Calendrier restant</h4>' + anRemaining(t) + '</div></div>';
}
function anRemaining(t) {
  var rest = t.ms.filter(function (m) { return !m.scored; });
  rest.sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : 9e15) - (b.date ? new Date(b.date).getTime() : 9e15) || (a.j || 0) - (b.j || 0); });
  if (!rest.length) return '<div class="an-na">Aucun match à venir connu.</div>';
  return '<table class="an-mini"><tr><th>J</th><th class="l">Match</th><th>Date</th><th>Chance de gagner</th></tr>' + rest.map(function (m) {
    var us = anIsUs(m.opp), pr = us ? anProb(m.oppK, t.key, !m.home) : anProb(t.key, m.oppK, m.home);
    return '<tr><td>' + (m.j ? 'J' + m.j : '') + '</td><td class="l' + (us ? ' us' : '') + '">' + (m.home ? 'vs ' : 'à ') + msEsc(m.opp) + '</td><td>' + (m.date ? msEsc(homeFmtDateShort(m.date)) : '<span class="an-na">à confirmer</span>') + '</td><td>' + anProbCell(pr, us ? 'nous' : '') + '</td></tr>';
  }).join('') + '</table><div class="an-na" style="font-size:10px;margin-top:4px;">Tendance, pas prédiction. Pour ' + msEsc(t.name) + (rest.some(function (m) { return anIsUs(m.opp); }) ? ' (« nous » = notre équipe)' : '') + '.</div>';
}
function anBarsCmp(t) {
  var M = anState.M, st = t.st, B = function (lab, m, v, inv) { var p = anPct(M, m, v); if (p === null) return ''; if (inv) p = 1 - p; var c = p >= 0.6 ? 'gr' : (p >= 0.35 ? 'y' : 'rd'); var n = Math.round(p * 100);
    return '<div class="an-pc"><span>' + lab + '</span><i><u class="' + c + '" style="width:' + n + '%"></u></i>' + anVal(c, String(n)) + '</div>'; };
  return B('Buts marqués', 'gf', st.gf, false) + B('Défense', 'ga', st.ga, true) + (st.games ? B('Discipline', 'deux', st.deux, true) + B('Gardien', 'arrets', st.arrets, false) : '') +
    '<div class="an-na" style="font-size:10px;">Rang sur 100 parmi les ' + (M.dist.gf || []).length + ' équipes suivies (100 = meilleur).</div>';
}
function anStars(n) { var s = ''; for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return '<span class="an-st">' + s + '</span>'; }
function anWatch(t) {
  var st = t.st; if (!st.games || !st.players.length) return '<div class="an-bt"><div><h4>Joueurs à surveiller</h4><div class="an-na">Feuilles de match pas encore lues pour cette équipe.</div></div><div></div></div>';
  var top = st.players.filter(function (p) { return p.buts > 0; }).slice(0, 4);
  var rows = top.map(function (p) {
    var w = p.share >= 0.25 ? 5 : (p.share >= 0.18 ? 4 : (p.share >= 0.12 ? 3 : (p.share >= 0.07 ? 2 : 1)));
    return '<tr><td class="l">' + (p.num !== null && p.num !== undefined ? 'N° ' + p.num + ' — ' : '') + msEsc(p.nom) + '</td><td>' + p.buts + '</td><td>' + anF1(p.buts / p.g) + '</td><td>' + p.b7 + '</td><td>' + p.deux + '</td><td>' + anStars(w) + '</td></tr>';
  }).join('');
  var gk = st.gk ? '<tr><td class="l">' + (st.gk.num !== null && st.gk.num !== undefined ? 'N° ' + st.gk.num + ' — ' : '') + msEsc(st.gk.nom) + ' <span class="an-na">(gardien)</span></td><td colspan="2">' + anF1(st.gk.arrets / st.gk.g) + ' arrêts / match</td><td>–</td><td>' + st.gk.deux + '</td><td>' + anStars(st.gk.arrets / st.gk.g >= 9 ? 5 : (st.gk.arrets / st.gk.g >= 7 ? 4 : (st.gk.arrets / st.gk.g >= 5 ? 3 : (st.gk.arrets / st.gk.g >= 3 ? 2 : 1)))) + '</td></tr>' : '';
  return '<div class="an-bt"><div><h4>Joueurs à surveiller</h4><table class="an-mini"><tr><th class="l">Joueur</th><th>Buts</th><th>Par match</th><th>7 m</th><th>2 min</th><th>Poids</th></tr>' + rows + gk + '</table>' +
    '<div class="an-na" style="font-size:10px;margin-top:4px;">Sur ' + st.games + ' feuille(s) de match lue(s). « Poids » = part des buts de l\'équipe.</div></div>' +
    '<div><h4>Clés du match contre eux</h4>' + anKeys(t) + '</div></div>';
}
function anKeys(t) {
  var M = anState.M, st = t.st, k = [];
  if (!st.n) return '<div class="an-na">–</div>';
  if (st.t1 !== null && anPct(M, 't1', st.t1) !== null && anPct(M, 't1', st.t1) >= 0.7 && st.t1 > 0.5) k.push('Ils partent vite : bien tenir le 1er tiers-temps');
  if (st.t3 !== null && anPct(M, 't3', st.t3) !== null && anPct(M, 't3', st.t3) <= 0.3 && st.t3 < 0) k.push('Ils fléchissent au 3e tiers-temps : insister jusqu\'au bout');
  if (st.t3 !== null && anPct(M, 't3', st.t3) !== null && anPct(M, 't3', st.t3) >= 0.7 && st.t3 > 0.5) k.push('Ils finissent fort : ne pas relâcher au 3e tiers-temps');
  if (st.deux !== null && anPct(M, 'deux', st.deux) !== null && anPct(M, 'deux', st.deux) >= 0.7) k.push('Beaucoup d\'exclusions de 2 min : chercher le contact et les supériorités');
  if (st.top2 !== null && st.top2 >= 0.5 && st.top2n.length) k.push(msEsc(st.top2n[0].nom) + ' et ' + msEsc(st.top2n[1].nom) + ' marquent ' + Math.round(st.top2 * 100) + ' % de leurs buts : à bien défendre');
  if (st.arrets !== null && anPct(M, 'arrets', st.arrets) !== null && anPct(M, 'arrets', st.arrets) >= 0.75) k.push('Gardien solide : varier les tirs');
  if (st.homeD !== null && st.awayD !== null && Math.abs(st.homeD - st.awayD) >= 4) k.push(st.homeD > st.awayD ? 'Beaucoup plus forts à domicile' : 'Plus à l\'aise à l\'extérieur');
  if (st.n >= 4 && st.close / st.n >= 0.5) k.push('Matchs souvent serrés : rester concentré jusqu\'à la fin');
  anNotesOf(t.key, 'eux').slice(-4).forEach(function (n) { k.push((n.type === 'fort' ? '💪 ' : '⚠️ ') + (n.tag ? n.tag + (n.texte ? ' — ' : '') : '') + (n.texte ? msEsc(n.texte) : '') + (n.manche ? ' (' + n.manche + ')' : '')); });
  if (!k.length) return '<div class="an-na">Pas de tendance marquée dans les données lues.</div>';
  return k.slice(0, 9).map(function (x) { return '<span class="an-pill">' + x + '</span>'; }).join('');
}
function anTabPlayers(t) {
  var st = t.st; if (!st.players.length) return '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col an-na">Feuilles de match pas encore lues pour cette équipe.</div></div>';
  var rows = st.players.map(function (p) {
    return '<tr><td>' + (p.num !== null && p.num !== undefined ? p.num : '') + '</td><td class="l">' + msEsc(p.nom) + '</td><td>' + p.g + '</td><td>' + p.buts + '</td><td>' + anF1(p.buts / p.g) + '</td><td>' + p.tirs + '</td><td>' + p.b7 + '</td><td>' + p.arrets + '</td><td>' + p.deux + '</td><td>' + p.avert + '</td><td>' + p.dis + '</td></tr>';
  }).join('');
  return '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col"><div class="ms-scroll"><table class="an-mini"><tr><th>N°</th><th class="l">Joueur</th><th>Matchs</th><th>Buts</th><th>/ match</th><th>Tirs</th><th>7 m</th><th>Arrêts</th><th>2 min</th><th>Avert.</th><th>Disq.</th></tr>' + rows + '</table></div>' +
    '<div class="an-na" style="font-size:10px;margin-top:6px;">Cumul des ' + st.games + ' feuille(s) de match lue(s), toutes poules suivies confondues.</div></div></div>';
}
// z66 : lien vidéo Rematch d'un match (adresse lue sur la FFHB) — seulement http(s)
function anVidBtn(m) {
  if (!m || !m.video || !/^https?:\/\//i.test(m.video)) return '';
  return ' <a class="an-vid" href="' + msEsc(m.video) + '" target="_blank" rel="noopener">▶ Vidéo</a>';
}
function anVideos(t) {
  var vs = t.ms.filter(function (m) { return m.video && /^https?:\/\//i.test(m.video); }).sort(function (a, b) { return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0); });
  if (!vs.length) return '';
  return '<div class="an-vids"><b>🎥 Vidéos de ' + msEsc(t.name) + '</b>' + vs.slice(0, 6).map(function (m) {
    return '<a class="an-vid" href="' + msEsc(m.video) + '" target="_blank" rel="noopener">▶ ' + (m.date ? msEsc(homeFmtDateShort(m.date)) + ' · ' : '') + (m.home ? 'vs ' : 'à ') + msEsc(m.opp) + (m.scored ? ' (' + m.gf + '–' + m.ga + ')' : '') + '</a>';
  }).join('') + '</div>';
}
function anTabCal(t) {
  var ms = t.ms.slice().sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : 9e15) - (b.date ? new Date(b.date).getTime() : 9e15) || (a.j || 0) - (b.j || 0); });
  var rows = ms.map(function (m) {
    var res = m.scored ? '<b class="an-res ' + (m.gf > m.ga ? 'w' : (m.gf < m.ga ? 'l' : 'n')) + '">' + m.gf + '–' + m.ga + '</b>' + (m.forfait ? ' <span class="ms-fo">PE</span>' : '') : '<span class="an-na">à venir</span>';
    return '<tr><td>' + (m.j ? 'J' + m.j : '') + '</td><td>' + (m.date ? msEsc(homeFmtDateShort(m.date)) : '<span class="an-na">à confirmer</span>') + '</td><td class="l' + (anIsUs(m.opp) ? ' us' : '') + '">' + (m.home ? 'vs ' : 'à ') + msEsc(m.opp) + '</td><td>' + res + anVidBtn(m) + '</td><td class="an-na">' + msEsc((m.src.label || '').replace(/^Suivi — /, '')) + '</td></tr>';
  }).join('');
  return '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col"><div class="ms-scroll"><table class="an-mini"><tr><th>J</th><th>Date</th><th class="l">Match</th><th>Score</th><th class="l">Poule</th></tr>' + rows + '</table></div></div></div>';
}
function anTabUs(t) {
  var vs = t.ms.filter(function (m) { return anIsUs(m.opp); });
  var h = '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col"><h4>Face à nous</h4>';
  if (vs.length) {
    h += '<table class="an-mini"><tr><th>J</th><th>Date</th><th class="l">Match</th><th>Score</th><th>Nos chances</th></tr>' + vs.map(function (m) {
      var pr = m.scored ? null : anProb(m.oppK, t.key, !m.home);
      return '<tr><td>' + (m.j ? 'J' + m.j : '') + '</td><td>' + (m.date ? msEsc(homeFmtDateShort(m.date)) : '<span class="an-na">à confirmer</span>') + '</td><td class="l us">' + (m.home ? 'vs ' : 'à ') + msEsc(m.opp) + '</td><td>' + (m.scored ? '<b>' + m.gf + '–' + m.ga + '</b>' : '<span class="an-na">à venir</span>') + '</td><td>' + (m.scored ? '<span class="an-na">–</span>' : anProbCell(pr, '')) + '</td></tr>'; }).join('') + '</table>';
    var nx = vs.filter(function (m) { return !m.scored; })[0];
    if (nx) h += anCompare(t, nx);
  } else h += '<div class="an-na">Aucun match contre nous dans les données lues.</div>';
  h += '<div class="an-note">🔮 Les pourcentages sont une tendance : ils viennent des buts marqués et encaissés (corrigés du niveau des poules quand elles sont reliées par des matchs). Ils deviennent plus fiables au fil de la phase 2.</div></div></div>';
  return h;
}
function anCompare(t, m) {
  var M = anState.M, u = M.teams[m.oppK]; if (!u) return '';
  var pr = anProb(m.oppK, t.key, !m.home), su = u.st, st = t.st;
  var row = function (lab, a, b, f) { return '<tr><td>' + (a === null || a === undefined ? '–' : f(a)) + '</td><th>' + lab + '</th><td>' + (b === null || b === undefined ? '–' : f(b)) + '</td></tr>'; };
  var h = '<h4 class="an-h2">Nous contre eux</h4><div class="an-cmp-p">' + anProbLine(pr, 'Nous') + (pr ? '<br><span class="an-na">Écart attendu : ' + (pr.mu >= 0 ? 'nous +' : 'eux +') + anF1(Math.abs(pr.mu)) + ' but(s)' + (pr.note ? ' · ' + msEsc(pr.note) : '') + '</span>' : '') + '</div>';
  h += '<table class="an-mini an-cmp"><tr><th>' + msEsc(u.name) + ' (nous)</th><th></th><th>' + msEsc(t.name) + ' (eux)</th></tr>' +
    row('Matchs lus', su.n, st.n, String) + row('Buts marqués / match', su.n ? su.gf : null, st.n ? st.gf : null, anF1) + row('Buts encaissés / match', su.n ? su.ga : null, st.n ? st.ga : null, anF1) +
    row('Écart / match', su.n ? su.diff : null, st.n ? st.diff : null, anSgn) + row('Forme (5 derniers)', su.form, st.form, function (x) { return Math.round(x * 100) + ' %'; }) + '</table>';
  return h;
}

// ---------------------------------------------------------------------------------------------
// z54 — NOTES : points forts / points faibles saisis par les coachs (eux et nous), table match_notes
// ---------------------------------------------------------------------------------------------
var AN_TAGS = ['Défense 6-0', 'Défense 5-1', 'Défense 3-2-1', 'Défense agressive', 'Jeu rapide', 'Contre-attaque', 'Montée de balle', 'Jeu placé', 'Pivot', 'Ailiers', 'Tirs de loin', '7 m', 'Gardien', 'Supériorité numérique', 'Mental', 'Fin de match', 'Début de match', 'Discipline', 'Rotation / banc', 'Replis'];
function anNotesOf(key, cote) { return (anState.notes || []).filter(function (n) { return n.team_key === key && (!cote || n.cote === cote); }); }
function anNF() { // état du formulaire
  if (!anState.nf) anState.nf = { cote: 'eux', type: 'fort', manche: 'aller', rencontre: '', tags: [], texte: '' };
  return anState.nf;
}
function anNfSet(k, v) { anNF()[k] = v; anRender(); }
function anNfText(v) { anNF().texte = v; }
function anNfTag(i) { var f = anNF(), t = AN_TAGS[i], p = f.tags.indexOf(t); if (p < 0) f.tags.push(t); else f.tags.splice(p, 1); anRender(); }
function anNoteLine(n) {
  var who = n.auteur ? msEsc(n.auteur) : '';
  var dt = n.created_at ? new Date(n.created_at) : null;
  var d = dt ? (('0' + dt.getDate()).slice(-2) + '/' + ('0' + (dt.getMonth() + 1)).slice(-2)) : '';
  return '<div class="an-note-l ' + n.type + '">' + (n.tag ? '<span class="an-tag">' + msEsc(n.tag) + '</span> ' : '') + (n.texte ? msEsc(n.texte) : '') +
    '<small>' + (n.manche ? n.manche + ' · ' : '') + who + (d ? ' · ' + d : '') + ' <a href="#" onclick="anNoteDel(\'' + msEsc(n.id) + '\');return false;">supprimer</a></small></div>';
}
function anNotesCol(key, cote, title) {
  var ns = anNotesOf(key, cote), f = ns.filter(function (n) { return n.type === 'fort'; }), w = ns.filter(function (n) { return n.type === 'faible'; });
  var col = function (arr, lab, cls) { return '<div class="an-nc ' + cls + '"><h5>' + lab + '</h5>' + (arr.length ? arr.map(anNoteLine).join('') : '<div class="an-na">Rien de noté.</div>') + '</div>'; };
  return '<div class="an-col"><h4>' + title + '</h4><div class="an-ncols">' + col(f, '💪 Points forts', 'fort') + col(w, '⚠️ Points faibles', 'faible') + '</div></div>';
}
function anNoteForm(t) {
  var f = anNF(), vs = t.ms.filter(function (m) { return m.scored && anIsUs(m.opp); });
  var opts = '<option value="">— match (facultatif) —</option>' + vs.map(function (m) { return '<option value="' + msEsc(m.rid) + '"' + (f.rencontre === String(m.rid) ? ' selected' : '') + '>' + (m.j ? 'J' + m.j + ' · ' : '') + msEsc(m.opp) + ' ' + m.gf + '–' + m.ga + '</option>'; }).join('');
  var B = function (k, v, lab) { return '<button class="' + (f[k] === v ? 'on' : '') + '" onclick="anNfSet(\'' + k + '\',\'' + v + '\')">' + lab + '</button>'; };
  return '<div class="an-col an-form-n"><h4>Ajouter une note</h4>' +
    '<div class="an-seg">' + B('cote', 'eux', 'Eux') + B('cote', 'nous', 'Nous') + '</div>' +
    '<div class="an-seg">' + B('type', 'fort', '💪 Point fort') + B('type', 'faible', '⚠️ Point faible') + '</div>' +
    '<div class="an-seg">' + B('manche', 'aller', 'Aller') + B('manche', 'retour', 'Retour') + '</div>' +
    '<select class="an-sel" onchange="anNfSet(\'rencontre\',this.value)">' + opts + '</select>' +
    '<div class="an-tagpick">' + AN_TAGS.map(function (x, i) { return '<button class="' + (f.tags.indexOf(x) >= 0 ? 'on' : '') + '" onclick="anNfTag(' + i + ')">' + msEsc(x) + '</button>'; }).join('') + '</div>' +
    '<textarea class="an-ta" rows="3" placeholder="Texte libre (facultatif)" oninput="anNfText(this.value)">' + msEsc(f.texte) + '</textarea>' +
    '<button class="ms-btn ms-main" onclick="anNoteSave()">Enregistrer</button> <span id="an-nmsg" class="an-na"></span></div>';
}
function anTabNotes(t) {
  return '<div class="an-body" style="grid-template-columns:1fr 1fr 1fr">' + anNotesCol(t.key, 'eux', 'Eux — ' + msEsc(t.name)) + anNotesCol(t.key, 'nous', 'Nous — contre cette équipe') + anNoteForm(t) + '</div>';
}
async function anNoteSave() {
  var f = anNF(), M = anState.M, key = M.keys[anState.ti], msg = document.getElementById('an-nmsg');
  var txt = (f.texte || '').replace(/^\s+|\s+$/g, '');
  if (!f.tags.length && !txt) { if (msg) { msg.style.color = '#e74c3c'; msg.textContent = 'Choisis une étiquette ou écris un texte.'; } return; }
  if (msg) { msg.style.color = ''; msg.textContent = 'Enregistrement…'; }
  try {
    await ensureCoachSession();
    var login = coachSession && coachSession.login ? coachSession.login : null, rows = [];
    var base = { team_key: key, cote: f.cote, rencontre: f.rencontre || null, manche: f.manche, type: f.type, auteur: login };
    f.tags.forEach(function (tg, i) { rows.push(Object.assign({}, base, { tag: tg, texte: i === 0 && txt ? txt : null })); });
    if (!f.tags.length) rows.push(Object.assign({}, base, { tag: null, texte: txt }));
    var res = await fetch(SB_URL + '/rest/v1/match_notes', { method: 'POST', headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'return=representation' }), body: JSON.stringify(rows) });
    if (!res.ok) throw new Error('x');
    var added = await res.json(); anState.notes = (anState.notes || []).concat(added);
    f.tags = []; f.texte = ''; anRender();
    var m2 = document.getElementById('an-nmsg'); if (m2) { m2.style.color = 'var(--vert)'; m2.textContent = '✓ Enregistré'; }
  } catch (e) { var m3 = document.getElementById('an-nmsg'); if (m3) { m3.style.color = '#e74c3c'; m3.textContent = 'Erreur — réessaie.'; } }
}
async function anNoteDel(id) {
  if (!window.confirm('Supprimer cette note ?')) return;
  try {
    await ensureCoachSession();
    var res = await fetch(SB_URL + '/rest/v1/match_notes?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: coachAuthHeaders() });
    if (!res.ok) throw new Error('x');
    anState.notes = (anState.notes || []).filter(function (n) { return n.id !== id; }); anRender();
  } catch (e) { window.alert('Suppression impossible — réessaie.'); }
}
// ---- Page « Notre équipe » : toutes les notes « nous », avec les étiquettes qui reviennent le plus ----
function anOurHtml() {
  var M = anState.M, ns = (anState.notes || []).filter(function (n) { return n.cote === 'nous'; });
  var h = '<div class="an-fiche"><div class="an-hd"><div class="an-id"><div class="an-tags">Notre équipe</div><div class="an-nm">Points forts / points faibles</div><div class="an-sub">' + ns.length + ' note(s) saisie(s) par les coachs, tous adversaires confondus</div></div><div class="an-nav"><button onclick="anClose()">✕</button></div></div>';
  if (!ns.length) return h + '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col an-na">Aucune note pour l\'instant : ouvre la fiche d\'un adversaire, onglet « Notes ».</div></div></div>';
  var cnt = function (type) { var c = {}; ns.filter(function (n) { return n.type === type && n.tag; }).forEach(function (n) { c[n.tag] = (c[n.tag] || 0) + 1; }); return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).map(function (k) { return '<span class="an-tag">' + msEsc(k) + ' × ' + c[k] + '</span>'; }).join(' ') || '<span class="an-na">–</span>'; };
  var list = function (type) { return ns.filter(function (n) { return n.type === type; }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); }).map(function (n) { var t = M.teams[n.team_key]; return '<div class="an-note-l ' + type + '"><b>' + msEsc(t ? t.name : n.team_key) + '</b> — ' + (n.tag ? '<span class="an-tag">' + msEsc(n.tag) + '</span> ' : '') + msEsc(n.texte || '') + '<small>' + (n.manche || '') + (n.auteur ? ' · ' + msEsc(n.auteur) : '') + '</small></div>'; }).join(''); };
  return h + '<div class="an-body" style="grid-template-columns:1fr 1fr"><div class="an-col"><h4>💪 Points forts qui reviennent</h4><div class="an-tagrow">' + cnt('fort') + '</div>' + list('fort') + '</div><div class="an-col"><h4>⚠️ Points faibles qui reviennent</h4><div class="an-tagrow">' + cnt('faible') + '</div>' + list('faible') + '</div></div></div>';
}
function anOpenOur() { anState.view = 'our'; window.scrollTo(0, 0); anRender(); }

// ---- Classement d'une poule (poules de suivi, puis nos poules pour comparer) ----
function anPouleHtml(d) {
  var ids = {};
  d.poule.forEach(function (p) { ids[p.source_id] = true; });
  var srcs = d.sources.filter(function (s) { return ids[s.id] && s.active && s.role === 'analyse'; });
  if (!srcs.length) return '<div class="ms-h">Poules</div><div class="ms-info">Pas encore de données : appuie sur ↻ (page d\'accueil).</div>';
  if (!anState.src || !srcs.some(function (s) { return s.id === anState.src; })) { anState.src = srcs[0].id; anState.j = null; }
  var pm = d.poule.filter(function (p) { return p.source_id === anState.src; });
  var js = []; pm.forEach(function (p) { if (p.journee_num !== null && js.indexOf(p.journee_num) === -1) js.push(p.journee_num); });
  js.sort(function (a, b) { return a - b; });
  if (!js.length) return '<div class="ms-h">Poules</div><div class="ms-info">Aucune journée trouvée pour cette poule.</div>';
  var played = function (p) { return p.score1 !== null && p.score1 !== undefined && p.score2 !== null && p.score2 !== undefined; };
  if (anState.j === null || js.indexOf(anState.j) === -1) {
    var last = null; js.forEach(function (n) { if (pm.some(function (p) { return p.journee_num === n && played(p); })) last = n; });
    anState.j = last !== null ? last : js[0];
  }
  var tiersOf = function (p) { return p.t1_1 === null || p.t1_1 === undefined ? null : [[p.t1_1, p.t1_2], [p.t2_1, p.t2_2], [p.t3_1, p.t3_2]]; };
  var T = {}, anyNoTiers = false;
  var team = function (n) { return T[n] || (T[n] = { name: n, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0 }); };
  pm.forEach(function (p) {
    team(p.team1); team(p.team2);
    var fo = p.forfait === 1 || p.forfait === 2;
    if ((!played(p) && !fo) || p.journee_num > anState.j) return;
    var a = team(p.team1), b = team(p.team2), s = fo ? msForfaitPts(p) : msPts(p.score1, p.score2, tiersOf(p));
    var g1 = played(p) ? p.score1 : 0, g2 = played(p) ? p.score2 : 0;
    if (!s.hasT) anyNoTiers = true;
    a.j++; b.j++; a.bp += g1; a.bc += g2; b.bp += g2; b.bc += g1; a.pts += s.a; b.pts += s.b;
    if (fo) { if (p.forfait === 1) { b.v++; a.d++; } else { a.v++; b.d++; } }
    else if (p.score1 > p.score2) { a.v++; b.d++; } else if (p.score1 < p.score2) { b.v++; a.d++; } else { a.n++; b.n++; }
  });
  var rank = Object.keys(T).map(function (k) { return T[k]; }).sort(function (x, y) { return y.pts - x.pts || (y.bp - y.bc) - (x.bp - x.bc) || y.bp - x.bp; });
  var sel = '<select class="ms-sel" onchange="anSetSrc(this.value)">' + srcs.map(function (s) {
    return '<option value="' + msEsc(s.id) + '"' + (s.id === anState.src ? ' selected' : '') + '>' + (s.role === 'analyse' ? '' : 'É' + s.equipe + ' — ') + msEsc(s.label || 'poule') + '</option>'; }).join('') + '</select>';
  var pills = js.map(function (n) { return '<button class="ms-pill' + (n === anState.j ? ' on' : '') + '" onclick="anSetJ(' + n + ')">J' + n + '</button>'; }).join('');
  var rows = rank.map(function (t, i) {
    return '<tr' + (msIsUs(t.name) ? ' class="ms-us"' : '') + '><td>' + (i + 1) + '</td><td class="ms-l">' + msEsc(t.name) + '</td><td>' + t.j + '</td><td>' + t.v + '</td><td>' + t.n + '</td><td>' + t.d + '</td><td>' + t.bp + '</td><td>' + t.bc + '</td><td>' + (t.bp - t.bc > 0 ? '+' : '') + (t.bp - t.bc) + '</td><td><b>' + t.pts + '</b></td></tr>';
  }).join('');
  var day = pm.filter(function (p) { return p.journee_num === anState.j; }).map(function (p) {
    var pl = played(p);
    return '<tr><td class="ms-l">' + msEsc(p.team1) + '</td><td>' + (pl ? '<b>' + p.score1 + '–' + p.score2 + '</b>' : '<span class="ms-na">' + (p.match_date ? msEsc(homeFmtDateShort(p.match_date)) : 'à venir') + '</span>') + '</td><td class="ms-l">' + msEsc(p.team2) + '</td></tr>';
  }).join('');
  return '<div class="ms-h">Classement des poules ' + sel + '</div><div class="ms-pills">' + pills + '</div>' +
    '<div class="ms-sub">Après la journée J' + anState.j + '</div>' +
    '<div class="ms-scroll"><table class="ms-tbl"><thead><tr><th>#</th><th class="ms-l">Équipe</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff</th><th>Pts</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="ms-sub">Matchs de la journée J' + anState.j + '</div>' +
    '<div class="ms-scroll"><table class="ms-tbl"><thead><tr><th class="ms-l">Équipe 1</th><th>Score</th><th class="ms-l">Équipe 2</th></tr></thead><tbody>' + day + '</tbody></table></div>' +
    (anyNoTiers ? '<div class="ms-legend">Certains tiers-temps sont inconnus : seuls les points de match sont comptés pour ces rencontres.</div>' : '');
}
function anSetSrc(id) { anState.src = id; anState.j = null; anRender(); }
function anSetJ(n) { anState.j = n; anRender(); }

// ---- Liens de suivi ----
function anSourcesHtml(suivi) {
  var rows = suivi.map(function (s) {
    return '<div class="ms-src"><div class="ms-src-t"><b>' + msEsc(s.label || 'Poule') + '</b><br><span class="ms-na">' + msEsc(s.url.replace('https://www.ffhandball.fr/competitions/', '…/')) + '</span>' +
      (s.last_sync_at ? '<br><span class="ms-na">Dernière mise à jour : ' + msEsc(homeFmtDateShort(s.last_sync_at)) + ' — ' + msEsc(s.last_sync_status || '') + '</span>' : '') + '</div>' +
      '<button class="ms-btn" onclick="anSrcDel(\'' + msEsc(s.id) + '\')">Supprimer</button></div>';
  }).join('');
  return '<div>' +
    '<div class="ms-sub">Poules lues pour connaître les équipes adverses (leurs matchs et les stats de leurs joueurs)</div>' + (rows || '<div class="ms-info">Aucune poule de suivi.</div>') +
    '<div class="ms-sub">Ajouter une poule</div><div class="ms-add">' +
    '<input id="an-add-url" class="ms-in" type="url" inputmode="url" placeholder="https://www.ffhandball.fr/competitions/…/poule-…/"><input id="an-add-label" class="ms-in" placeholder="Nom (ex. D2 phase 1 — poule E)">' +
    '<button class="ms-btn ms-main" onclick="anSrcAdd()">Vérifier et ajouter</button><div id="an-add-msg" class="ms-info"></div></div></div>';
}
async function anSrcAdd() {
  var msg = document.getElementById('an-add-msg'), url = (document.getElementById('an-add-url').value || '').trim();
  var label = (document.getElementById('an-add-label').value || '').trim();
  msg.style.color = ''; if (!url) { msg.textContent = 'Colle d\'abord un lien.'; return; }
  if (!/\/poule-\d+/.test(url)) { msg.style.color = '#e74c3c'; msg.textContent = 'Il me faut l\'adresse d\'une page de POULE (elle contient « /poule-… »), pas celle d\'une équipe.'; return; }
  msg.textContent = 'Vérification du lien…';
  try {
    var p = await msCall({ mode: 'preview', url: url });
    if (!p.nb_matchs_page) throw new Error('Aucun match trouvé sur cette page : vérifie le lien.');
    var res = await fetch(SB_URL + '/rest/v1/ffhb_sources', {
      method: 'POST', headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ equipe: null, role: 'analyse', url: url, label: label || ('Suivi — ' + (p.phase ? p.phase + ' — ' : '') + p.poule) }),
    });
    if (!res.ok) throw new Error(res.status === 409 ? 'Ce lien existe déjà.' : 'Enregistrement impossible.');
    msg.style.color = 'var(--vert)'; msg.textContent = '✓ Poule ajoutée (' + p.nb_matchs_page + ' matchs sur la page). Appuie sur ↻ (page d\'accueil).';
    document.getElementById('an-add-url').value = '';
    await anLoad();
  } catch (e) { msg.style.color = '#e74c3c'; msg.textContent = e.message || 'Erreur.'; }
}
async function anSrcDel(id) {
  if (!window.confirm('Supprimer cette poule de suivi ? Ses matchs seront retirés de l\'appli (les stats des joueurs déjà lues restent).')) return;
  try {
    await ensureCoachSession();
    var res = await fetch(SB_URL + '/rest/v1/ffhb_sources?id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: coachAuthHeaders() });
    if (!res.ok) throw new Error('x');
    anState.src = null; await anLoad();
  } catch (e) { window.alert('Suppression impossible.'); }
}

// ---- Mise à jour : une poule par appel, puis les feuilles de match par petits lots ----
function anSync() { return syncAll(); } // z58 : un seul bouton « Mettre à jour » (nos poules + poules de suivi + feuilles), défini dans 23-matchs-stats.js
