// Prépa U15 HBCCS — js/25-analyse.js — dernière modification : version z52 (14/11/2026)
// ===================== ANALYSE (carte « 🔬 Analyse » de l'accueil, visible seulement pour le coach qui l'a activée) =====================
// Écran réservé aux coachs : poules de SUIVI (équipes qu'on rencontrera en phase 2 mais qu'on ne connaît que par leur phase 1),
// leurs classements, et — dans les versions suivantes — probabilités de victoire et fiches des joueurs adverses.
// Données : tables ffhb_sources (role = 'analyse'), poule_matches, adv_player_match_stats. Écrit pour les navigateurs anciens (pas de ?. ni ??).
const anState = { data: null, src: null, j: null, busy: false };

function anKey() { return coachSession && coachSession.login ? 'analyse_card_' + coachSession.login : null; }
// ---- Carte sur l'accueil : visible si un coach est connecté ET qu'il l'a activée dans Réglages (réglage propre à chaque coach) ----
function anUpdateCard() {
  var b = document.getElementById('home-btn-analyse');
  if (!b) return;
  var k = anKey();
  b.style.display = (k && appSettings[k] === 'true') ? 'flex' : 'none';
  var cb = document.getElementById('an-settings-visible');
  if (cb) cb.checked = !!(k && appSettings[k] === 'true');
}
async function anSettingsSave() {
  var msg = document.getElementById('an-settings-msg'), k = anKey(), cb = document.getElementById('an-settings-visible');
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
    anState.data = { sources: await r[0].json(), poule: await r[1].json() };
    anRender();
  } catch (e) {
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
  var nb = suivi.length;
  var html = '<div class="ms-bar"><button class="ms-btn ms-main" id="an-sync-btn" onclick="anSync()">🔄 Mettre à jour les poules de suivi</button></div><div id="an-report"></div>' +
    anPouleHtml(d) + anSourcesHtml(suivi) +
    '<div class="ms-legend">' + nb + ' poule' + (nb > 1 ? 's' : '') + ' de suivi. Bientôt ici : probabilités de victoire des matchs à venir et fiches des joueurs adverses.</div>';
  box.innerHTML = html;
  Array.prototype.forEach.call(box.querySelectorAll('details[data-an]'), function (el) { if (open[el.getAttribute('data-an')]) el.open = true; });
  var rep2 = document.getElementById('an-report'); if (rep2) rep2.innerHTML = repHtml;
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
