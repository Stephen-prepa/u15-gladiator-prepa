// Prépa U15 HBCCS — js/25-analyse.js — dernière modification : version z53 (14/11/2026)
// ===================== ANALYSE (carte « 🔬 Analyse » de l'accueil, visible seulement pour le coach qui l'a activée) =====================
// Écran réservé aux coachs : poules de SUIVI (équipes qu'on rencontrera en phase 2 mais qu'on ne connaît que par leur phase 1),
// leurs classements, et — dans les versions suivantes — probabilités de victoire et fiches des joueurs adverses.
// Données : tables ffhb_sources (role = 'analyse'), poule_matches, adv_player_match_stats. Écrit pour les navigateurs anciens (pas de ?. ni ??).
const anState = { data: null, src: null, j: null, busy: false, M: null, view: 'list', ti: 0, tab: 'vue', ctx: [], ctxs: [] };

function anSetKey() { return coachSession && coachSession.login ? 'analyse_card_' + coachSession.login : null; }
// ---- Carte sur l'accueil : visible si un coach est connecté ET qu'il l'a activée dans Réglages (réglage propre à chaque coach) ----
function anUpdateCard() {
  var b = document.getElementById('home-btn-analyse');
  if (!b) return;
  var k = anSetKey();
  b.style.display = (k && appSettings[k] === 'true') ? 'flex' : 'none';
  var cb = document.getElementById('an-settings-visible');
  if (cb) cb.checked = !!(k && appSettings[k] === 'true');
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
  document.getElementById('screen-home').style.display = 'none';
  document.getElementById('screen-analyse').style.display = 'block';
  window.scrollTo(0, 0);
  anLoad();
}
function anBack() {
  if (anState.view === 'team') { anClose(); return; }
  document.getElementById('screen-analyse').style.display = 'none';
  document.getElementById('screen-home').style.display = 'flex';
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
    anState.data = { sources: await r[0].json(), poule: await r[1].json(), adv: adv };
    anState.M = anBuild(anState.data);
    anRender();
  } catch (e) {
    if (window.console) console.error("anLoad", e && e.stack ? e.stack : e);
    box.innerHTML = '<div class="ms-info" style="color:#e74c3c;">Erreur de chargement. <button class="ms-btn" onclick="anLoad()">↻ Réessayer</button></div>';
  }
}
function anSuivi() { return anState.data.sources.filter(function (s) { return s.role === 'analyse'; }); }

function anRender() {
  var box = document.getElementById('an-body'), d = anState.data;
  if (!box || !d) return;
  var open = {};
  Array.prototype.forEach.call(box.querySelectorAll('details[data-an]'), function (el) { open[el.getAttribute('data-an')] = el.open; });
  var rep = document.getElementById('an-report'), repHtml = rep ? rep.innerHTML : '';
  var suivi = anSuivi();
  var nb = suivi.length, html;
  if (anState.view === 'team' && anState.M) html = anTeamHtml(d);
  else html = '<div class="ms-bar"><button class="ms-btn ms-main" id="an-sync-btn" onclick="anSync()">🔄 Mettre à jour les poules de suivi</button></div><div id="an-report"></div>' +
    anListHtml(d) +
    '<details class="ms-det" data-an="src"><summary>⚙️ Poules de suivi (' + nb + ')</summary>' + anSourcesHtml(suivi) + '</details>';
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
    var base = { rid: id, src: s, j: p.journee_num, date: p.match_date, fdm: p.fdm_code, played: pl, forfait: fo, scored: anPlayedRow(p) };
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
    us.ms.forEach(function (m) { if (!m.scored && m.src.role !== 'analyse' && m.src.equipe === eq) cands.push(m); });
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
  anState.view = 'team'; anState.ti = i; anState.tab = anState.tab || 'vue';
  if (ctxName !== undefined) anState.ctx = ctxName;
  window.scrollTo(0, 0); anRender();
}
function anClose() { anState.view = 'list'; anRender(); }
function anTab(t) { anState.tab = t; anRender(); }
function anStep(dir) {
  var c = anState.ctx || [], p = c.indexOf(anState.ti); if (p < 0 || !c.length) return;
  anState.ti = c[(p + dir + c.length) % c.length]; anRender();
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
function anListHtml(d) {
  var M = anState.M, h = '', ctxs = [];
  anState.ctxs = ctxs;
  var next = [1, 2].map(function (eq) { return anNextOf(eq); });
  h += '<div class="ms-h">Mes prochains adversaires</div><div class="an-next">';
  [1, 2].forEach(function (eq, i) {
    var m = next[i];
    if (!m) { h += '<div class="an-ncard"><small>ÉQUIPE ' + eq + '</small><div class="an-nm2">Aucun match à venir connu</div></div>'; return; }
    var k = m.oppK, t = M.teams[k], src = m.src, pt = anPouleTeams(src); ctxs.push(pt.map(anIdx));
    var when = m.date ? homeFmtDateShort(m.date) : 'Date à confirmer';
    h += '<button class="an-ncard" onclick="anOpen(' + anIdx(k) + ',anState.ctxs[' + (ctxs.length - 1) + '])"><small>ÉQUIPE ' + eq + ' · ' + (m.j ? 'J' + m.j + ' · ' : '') + (m.home ? 'à domicile' : 'à l\'extérieur') + '</small>' +
      '<div class="an-nm2">' + msEsc(t ? t.name : m.opp) + '</div><div class="an-nsub">' + msEsc(when) + '</div>' +
      '<div class="an-nsub">' + (t && t.st.n ? msEsc(anRec(t.st)) + ' · ' + anF1(t.st.gf) + ' buts / match' : 'pas encore de matchs lus pour cette équipe') + '</div></button>';
  });
  h += '</div>';
  // poules de nos équipes (phase en cours)
  [1, 2].forEach(function (eq, i) {
    var m = next[i]; if (!m) return;
    var pt = anPouleTeams(m.src); ctxs.push(pt.map(anIdx));
    h += '<div class="ms-h">Poule de l\'équipe ' + eq + ' <span class="ms-na">' + msEsc(m.src.label || '') + '</span></div>' + anChips(pt, ctxs.length - 1);
  });
  // poules de suivi
  var suivi = anSuivi();
  if (suivi.length) {
    h += '<div class="ms-h">Autres équipes suivies</div>';
    suivi.forEach(function (s) {
      var pt = anPouleTeams(s); if (!pt.length) return; ctxs.push(pt.map(anIdx));
      h += '<details class="ms-det" data-an="s' + msEsc(s.id) + '"><summary>' + msEsc(s.label || 'Poule') + ' · ' + pt.length + ' équipes</summary>' + anChips(pt, ctxs.length - 1) + '</details>';
    });
  }
  h += '<details class="ms-det" data-an="class"><summary>📊 Classements des poules</summary>' + anPouleHtml(d) + '</details>';
  return h;
}

// ----- Fiche équipe -----
function anTeamHtml(d) {
  var M = anState.M, k = M.keys[anState.ti]; if (!k) { anState.view = 'list'; return anListHtml(d); }
  var t = M.teams[k], st = t.st, tab = anState.tab;
  var cs = anCurrentSrc(t), tags = [];
  if (cs) tags.push(cs.label || 'Poule');
  [1, 2].forEach(function (eq) { var n = anNextOf(eq); if (n && n.oppK === k) tags.push('Prochain adversaire · équipe ' + eq + (n.j ? ' · J' + n.j : '')); });
  var rg = anRankOf(M, 'diff', st.diff);
  var ctx = anState.ctx || [], pos = ctx.indexOf(anState.ti);
  var polesPlayed = []; t.ms.forEach(function (m) { if (m.scored && polesPlayed.indexOf(m.src.label) < 0) polesPlayed.push(m.src.label); });
  var head = '<div class="an-hd"><div class="an-crest">' + msEsc(anInit(t.name)) + (rg ? '<i>' + rg.r + 'e</i>' : '') + '</div>' +
    '<div class="an-id"><div class="an-tags">' + msEsc(tags.join(' · ') || 'Équipe suivie') + '</div><div class="an-nm">' + msEsc(t.name) + '</div>' +
    '<div class="an-sub">' + (st.n ? anRec(st) + (rg ? ' · ' + rg.r + 'e sur ' + rg.n + ' équipes suivies (écart de buts)' : '') : 'Pas encore de match lu pour cette équipe') + '</div>' +
    (polesPlayed.length ? '<div class="an-sub">Matchs lus dans : ' + msEsc(polesPlayed.join(' · ')) + '</div>' : '') + '</div>' +
    '<div class="an-kf"><div><small>Buts / match</small><b>' + (st.n ? anF1(st.gf) : '–') + '</b></div><div><small>Encaissés</small><b>' + (st.n ? anF1(st.ga) : '–') + '</b></div><div><small>Écart / match</small><b>' + (st.n ? anSgn(st.diff) : '–') + '</b></div></div>' +
    '<div class="an-nav"><button onclick="anStep(-1)">◀</button><span>' + (pos >= 0 ? (pos + 1) + '/' + ctx.length : '') + '</span><button onclick="anStep(1)">▶</button><button onclick="anClose()">✕</button></div></div>';
  var tabs = [['vue', 'Vue d\'ensemble'], ['joueurs', 'Joueurs'], ['cal', 'Calendrier'], ['nous', 'Face à nous']];
  var tb = '<div class="an-tabs">' + tabs.map(function (x) { return '<button class="' + (tab === x[0] ? 'on' : '') + '" onclick="anTab(\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>';
  var body = tab === 'joueurs' ? anTabPlayers(t) : (tab === 'cal' ? anTabCal(t) : (tab === 'nous' ? anTabUs(t) : anTabVue(t)));
  return '<div class="an-fiche">' + head + tb + body + '</div>';
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
  return anGauges(t) + '<div class="an-body">' + attaque + defense + profil + right + '</div>' + anWatch(t);
}
function anNoData(t) {
  return '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col"><div class="an-na" style="padding:14px 0;">Aucun match joué n\'a encore été lu pour cette équipe : elle vient sans doute d\'une poule que tu ne suis pas, ou sa phase 2 n\'a pas commencé. ' +
    'Si tu connais sa poule de 1re phase, ajoute-la dans « Poules de suivi ».</div><h4 class="an-h2">Calendrier restant</h4>' + anRemaining(t) + '</div></div>';
}
function anRemaining(t) {
  var rest = t.ms.filter(function (m) { return !m.scored; });
  rest.sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : 9e15) - (b.date ? new Date(b.date).getTime() : 9e15) || (a.j || 0) - (b.j || 0); });
  if (!rest.length) return '<div class="an-na">Aucun match à venir connu.</div>';
  return '<table class="an-mini"><tr><th>J</th><th class="l">Match</th><th>Date</th></tr>' + rest.map(function (m) {
    return '<tr><td>' + (m.j ? 'J' + m.j : '') + '</td><td class="l' + (anIsUs(m.opp) ? ' us' : '') + '">' + (m.home ? 'vs ' : 'à ') + msEsc(m.opp) + '</td><td>' + (m.date ? msEsc(homeFmtDateShort(m.date)) : '<span class="an-na">à confirmer</span>') + '</td></tr>';
  }).join('') + '</table>';
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
  if (!k.length) return '<div class="an-na">Pas de tendance marquée dans les données lues.</div>';
  return k.slice(0, 5).map(function (x) { return '<span class="an-pill">' + x + '</span>'; }).join('');
}
function anTabPlayers(t) {
  var st = t.st; if (!st.players.length) return '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col an-na">Feuilles de match pas encore lues pour cette équipe.</div></div>';
  var rows = st.players.map(function (p) {
    return '<tr><td>' + (p.num !== null && p.num !== undefined ? p.num : '') + '</td><td class="l">' + msEsc(p.nom) + '</td><td>' + p.g + '</td><td>' + p.buts + '</td><td>' + anF1(p.buts / p.g) + '</td><td>' + p.tirs + '</td><td>' + p.b7 + '</td><td>' + p.arrets + '</td><td>' + p.deux + '</td><td>' + p.avert + '</td><td>' + p.dis + '</td></tr>';
  }).join('');
  return '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col"><div class="ms-scroll"><table class="an-mini"><tr><th>N°</th><th class="l">Joueur</th><th>Matchs</th><th>Buts</th><th>/ match</th><th>Tirs</th><th>7 m</th><th>Arrêts</th><th>2 min</th><th>Avert.</th><th>Disq.</th></tr>' + rows + '</table></div>' +
    '<div class="an-na" style="font-size:10px;margin-top:6px;">Cumul des ' + st.games + ' feuille(s) de match lue(s), toutes poules suivies confondues.</div></div></div>';
}
function anTabCal(t) {
  var ms = t.ms.slice().sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : 9e15) - (b.date ? new Date(b.date).getTime() : 9e15) || (a.j || 0) - (b.j || 0); });
  var rows = ms.map(function (m) {
    var res = m.scored ? '<b class="an-res ' + (m.gf > m.ga ? 'w' : (m.gf < m.ga ? 'l' : 'n')) + '">' + m.gf + '–' + m.ga + '</b>' + (m.forfait ? ' <span class="ms-fo">PE</span>' : '') : '<span class="an-na">à venir</span>';
    return '<tr><td>' + (m.j ? 'J' + m.j : '') + '</td><td>' + (m.date ? msEsc(homeFmtDateShort(m.date)) : '<span class="an-na">à confirmer</span>') + '</td><td class="l' + (anIsUs(m.opp) ? ' us' : '') + '">' + (m.home ? 'vs ' : 'à ') + msEsc(m.opp) + '</td><td>' + res + '</td><td class="an-na">' + msEsc((m.src.label || '').replace(/^Suivi — /, '')) + '</td></tr>';
  }).join('');
  return '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col"><div class="ms-scroll"><table class="an-mini"><tr><th>J</th><th>Date</th><th class="l">Match</th><th>Score</th><th class="l">Poule</th></tr>' + rows + '</table></div></div></div>';
}
function anTabUs(t) {
  var vs = t.ms.filter(function (m) { return anIsUs(m.opp); });
  var h = '<div class="an-body" style="grid-template-columns:1fr"><div class="an-col"><h4>Face à nous</h4>';
  if (vs.length) {
    h += '<table class="an-mini"><tr><th>J</th><th>Date</th><th class="l">Match</th><th>Score</th></tr>' + vs.map(function (m) {
      return '<tr><td>' + (m.j ? 'J' + m.j : '') + '</td><td>' + (m.date ? msEsc(homeFmtDateShort(m.date)) : '<span class="an-na">à confirmer</span>') + '</td><td class="l us">' + (m.home ? 'vs ' : 'à ') + msEsc(m.opp) + '</td><td>' + (m.scored ? '<b>' + m.gf + '–' + m.ga + '</b>' : '<span class="an-na">à venir</span>') + '</td></tr>'; }).join('') + '</table>';
  } else h += '<div class="an-na">Aucun match contre nous dans les données lues.</div>';
  h += '<div class="an-note">🔮 Prochaine étape (z54) : probabilité de victoire de chaque match à venir, avec un indice de confiance, et comparaison directe nous / eux.</div></div></div>';
  return h;
}

// ---- Classement d'une poule (poules de suivi, puis nos poules pour comparer) ----
function anPouleHtml(d) {
  var ids = {};
  d.poule.forEach(function (p) { ids[p.source_id] = true; });
  var srcs = d.sources.filter(function (s) { return ids[s.id] && s.active; });
  srcs.sort(function (a, b) { return (a.role === 'analyse' ? 0 : 1) - (b.role === 'analyse' ? 0 : 1); });
  if (!srcs.length) return '<div class="ms-h">Poules</div><div class="ms-info">Pas encore de données : appuie sur « Mettre à jour les poules de suivi ».</div>';
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
  return '<details class="ms-det" data-an="liens"><summary>⚙️ Poules de suivi (liens FFHandball)</summary>' +
    '<div class="ms-sub">Poules lues pour connaître les équipes adverses (leurs matchs et les stats de leurs joueurs)</div>' + (rows || '<div class="ms-info">Aucune poule de suivi.</div>') +
    '<div class="ms-sub">Ajouter une poule</div><div class="ms-add">' +
    '<input id="an-add-url" class="ms-in" type="url" inputmode="url" placeholder="https://www.ffhandball.fr/competitions/…/poule-…/"><input id="an-add-label" class="ms-in" placeholder="Nom (ex. D2 phase 1 — poule E)">' +
    '<button class="ms-btn ms-main" onclick="anSrcAdd()">Vérifier et ajouter</button><div id="an-add-msg" class="ms-info"></div></div></details>';
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
    msg.style.color = 'var(--vert)'; msg.textContent = '✓ Poule ajoutée (' + p.nb_matchs_page + ' matchs sur la page). Appuie sur « Mettre à jour les poules de suivi ».';
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
async function anSync() {
  if (anState.busy) return;
  anState.busy = true;
  var btn = document.getElementById('an-sync-btn'), rep = document.getElementById('an-report');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mise à jour en cours…'; }
  if (rep) rep.innerHTML = '';
  var html = '';
  try {
    var srcs = anSuivi().filter(function (x) { return x.active; });
    var r = { sources: 0, rencontres: 0, tiers_lus: 0, joueurs_lus: 0, feuilles_restantes: 0, erreurs: [] };
    var addRep = function (x) {
      ['sources', 'rencontres', 'tiers_lus', 'joueurs_lus'].forEach(function (k) { r[k] += x[k] || 0; });
      (x.erreurs || []).forEach(function (v) { if (r.erreurs.indexOf(v) < 0) r.erreurs.push(v); });
    };
    for (var i = 0; i < srcs.length; i++) {
      if (btn) btn.textContent = '⏳ Lecture des poules… ' + (i + 1) + '/' + srcs.length + ' (ne ferme pas la page)';
      addRep(await msCall({ mode: 'sync', source_id: srcs[i].id, feuilles: false }));
    }
    var pass = 0, still = 0, x;
    do {
      x = await msCall({ mode: 'sync', feuilles_only: true });
      addRep(x); pass++;
      still = (x.joueurs_lus || 0) + (x.tiers_lus || 0) > 0 ? 0 : still + 1;
      r.feuilles_restantes = x.feuilles_restantes || 0;
      if (btn && r.feuilles_restantes > 0) btn.textContent = '⏳ Lecture des feuilles… encore ' + r.feuilles_restantes + ' (ne ferme pas la page)';
    } while (r.feuilles_restantes > 0 && pass < 150 && still < 2);
    html = '<div class="ms-ok">✓ ' + msEsc(r.sources + ' poule(s) lue(s) · ' + r.rencontres + ' rencontre(s) · ' + r.joueurs_lus + ' feuille(s) lue(s) pour les joueurs') + '</div>';
    if (r.feuilles_restantes) html += '<div class="ms-note">Il reste ' + r.feuilles_restantes + ' feuille(s) à lire : relance « Mettre à jour ».</div>';
    if (r.erreurs.length) html += '<div class="ms-err"><b>À vérifier :</b><br>' + r.erreurs.map(msEsc).join('<br>') + '</div>';
  } catch (e) {
    html = '<div class="ms-err">Mise à jour impossible : ' + msEsc(e.message || 'erreur') + '</div>';
  }
  anState.busy = false;
  await anLoad();
  var rep2 = document.getElementById('an-report'); if (rep2) rep2.innerHTML = html;
}
