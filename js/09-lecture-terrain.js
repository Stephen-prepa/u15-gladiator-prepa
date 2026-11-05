// Prépa U15 HBCCS — js/09-lecture-terrain.js — dernière modification : version z23 (05/11/2026)
// ===== Lecture / Terrain : jeu ludique et renforcement musculaire (v26-10-z22) =====
function crLectHasSchema(x) { return !!((x.schemaLib && x.schemaLib.drawings && x.schemaLib.drawings.length) || crSchemaHas(x)); }
// jeu : but, équipes, règles (numérotées, en gros), points
function crLectJeu(x) {
  const j = crNormJeu(x.jeu), P = (t, v, cls) => crTxt(v) ? `<section class="crl-sec ${cls || ''}"><h3>${t}</h3><p>${crEsc(v).replace(/\n/g, '<br>')}</p></section>` : '';
  return P('But du jeu', j.goal, 'key') + P('Équipes et organisation', j.teams) + crLectList('Règles du jeu', (x.items || {}).regles, { num: true, cls: 'key' }) + P('Points / façon de gagner', j.points, 'key');
}
// ----- sons, vibrations -----
function crLectMute() { try { return localStorage.getItem('crLectMute') === '1'; } catch (e) { return false; } }
function crLectMuteToggle() { try { localStorage.setItem('crLectMute', crLectMute() ? '0' : '1'); } catch (e) {} crLectFigRefresh(); }
let crAud = null;
function crLectAudioInit() { try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; if (!crAud) crAud = new AC(); if (crAud.state === 'suspended') crAud.resume(); } catch (e) {} }
function crLectBeep(freq, ms) {
  if (crLectMute() || !crAud) return;
  try {
    const o = crAud.createOscillator(), g = crAud.createGain(), t = crAud.currentTime;
    o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(crAud.destination);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000); o.start(t); o.stop(t + ms / 1000 + 0.03);
  } catch (e) {}
}
function crLectBuzz(p) { try { if (!crLectMute() && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
// ----- minuterie commune (circuit + récupération du tableau) -----
let crLectTimer = 0;
function crLectTimerEnsure() { if (!crLectTimer) crLectTimer = setInterval(crLectTick, 100); }
function crLectRfStop() { if (crLectTimer) { clearInterval(crLectTimer); crLectTimer = 0; } const S = crLect; if (S) { S.chr = null; S.rec = null; S.ticks = null; } }
// phases du circuit : préparation (5 s), puis pour chaque tour : travail / repos entre stations, et récupération entre les tours
function crRfPhases(r) {
  const c = r.circuit, n = r.moves.length, ph = [{ t: 'prep', dur: 5, next: 0, r: 0 }];
  for (let k = 0; k < c.rounds; k++) {
    for (let s = 0; s < n; s++) {
      ph.push({ t: 'work', s, r: k, dur: c.work });
      if (s < n - 1 && c.rest > 0) ph.push({ t: 'rest', next: s + 1, r: k, dur: c.rest });
    }
    if (k < c.rounds - 1 && c.between > 0) ph.push({ t: 'between', next: 0, r: k + 1, dur: c.between });
  }
  return ph;
}
function crLectChr() {
  const S = crLect; if (!S) return null;
  const x = S.items[S.k].x, r = crNormRenfo(x.renfo); if (!r.moves.length) return null;
  if (!S.chr) { const ph = crRfPhases(r); S.chr = { ph, i: 0, left: ph[0].dur, running: false, end: 0, done: false, bp: -1 }; }
  return S.chr;
}
function crLectFmtT(sec) { sec = Math.max(0, Math.ceil(sec - 1e-6)); return sec >= 60 ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') : String(sec); }
function crLectChrToggle() {
  const c = crLectChr(); if (!c) return;
  if (c.done) { crLectChrReset(); }
  if (c.running) { c.left = Math.max(0, (c.end - performance.now()) / 1000); c.running = false; }
  else { crLectAudioInit(); c.running = true; c.end = performance.now() + c.left * 1000; crLectBeep(440, 90); crLectTimerEnsure(); }
  crLectFigRefresh();
}
function crLectChrReset() { const c = crLectChr(); if (!c) return; c.i = 0; c.left = c.ph[0].dur; c.running = false; c.done = false; c.bp = -1; crLectFigRefresh(); }
function crLectChrSkip(d) {
  const c = crLectChr(); if (!c) return;
  const j = Math.max(0, Math.min(c.ph.length - 1, c.i + d)); c.done = false;
  // « précédent » depuis le milieu d'une phase = recommencer cette phase
  if (d < 0 && j === c.i - 1 && c.running && c.ph[c.i].dur - (c.end - performance.now()) / 1000 > 2) { c.left = c.ph[c.i].dur; c.end = performance.now() + c.left * 1000; c.bp = -1; crLectFigRefresh(); return; }
  c.i = j; c.left = c.ph[j].dur; c.bp = -1; if (c.running) c.end = performance.now() + c.left * 1000;
  crLectFigRefresh();
}
function crLectTick() {
  const S = crLect; if (!S) { crLectRfStop(); return; }
  const now = performance.now(); let any = false;
  const c = S.chr;
  if (c && c.running) {
    any = true; let left = (c.end - now) / 1000, changed = false;
    while (left <= 0 && c.running) {
      if (c.i >= c.ph.length - 1) { c.running = false; c.done = true; c.left = 0; crLectBeep(660, 900); crLectBuzz([250, 120, 250, 120, 500]); changed = true; break; }
      c.i++; c.bp = -1; c.end += c.ph[c.i].dur * 1000; left = (c.end - now) / 1000; changed = true;
      const t = c.ph[c.i].t; crLectBeep(t === 'work' ? 880 : 520, t === 'work' ? 550 : 350); crLectBuzz(t === 'work' ? [300] : [120, 80, 120]);
    }
    if (changed) crLectFigRefresh();
    else {
      const sec = Math.ceil(left - 1e-6);
      if (sec >= 1 && sec <= 3 && c.bp !== sec) { c.bp = sec; crLectBeep(700, 110); }
      const t = document.getElementById('crl-chr-t'); if (t) t.textContent = crLectFmtT(left);
      const b = document.getElementById('crl-chr-bar'); if (b) b.style.width = Math.max(0, Math.min(100, (1 - left / c.ph[c.i].dur) * 100)) + '%';
    }
  }
  if (S.rec) {
    any = true; const left = (S.rec.end - now) / 1000;
    if (left <= 0) { S.rec = null; crLectBeep(880, 600); crLectBuzz([300]); crLectFigRefresh(); }
    else { const t = document.getElementById('crl-rec-t'); if (t) t.textContent = crLectFmtT(left); const sec = Math.ceil(left); if (sec >= 1 && sec <= 3 && S.rec.bp !== sec) { S.rec.bp = sec; crLectBeep(700, 110); } }
  }
  if (!any && crLectTimer) { clearInterval(crLectTimer); crLectTimer = 0; }
}
function crLectChrHtml(r) {
  const c = crLectChr(), ph = c.ph[c.i], mv = r.moves, cfg = r.circuit, n = mv.length;
  const nm = i => crTxt(mv[i].name) || 'Station ' + (i + 1);
  const nx = c.ph[c.i + 1];
  let cls = ph.t, lab = '', cap = '', name = '', cueM = null, nextTxt = '';
  const stNext = ph.t === 'work' ? ph.s : ph.next;
  if (c.done) { cls = 'done'; lab = 'Terminé'; name = 'Bravo, circuit terminé !'; }
  else if (ph.t === 'prep') { lab = c.running ? 'Préparez-vous' : 'Prêt ?'; cap = 'Première station'; name = nm(0); cueM = mv[0]; }
  else if (ph.t === 'work') { lab = 'Travail'; cap = 'Station ' + (ph.s + 1) + ' / ' + n + ' · tour ' + (ph.r + 1) + ' / ' + cfg.rounds; name = nm(ph.s); cueM = mv[ph.s]; }
  else if (ph.t === 'rest') { lab = 'Repos'; cap = 'Prochaine station ' + (ph.next + 1) + ' / ' + n; name = nm(ph.next); cueM = mv[ph.next]; }
  else { lab = 'Récupération entre les tours'; cap = 'Tour ' + (ph.r + 1) + ' / ' + cfg.rounds + ' · première station'; name = nm(0); cueM = mv[0]; }
  if (!c.done) {
    if (ph.t === 'work') nextTxt = !nx ? 'Dernière station !' : nx.t === 'rest' ? 'Ensuite : repos ' + nx.dur + ' s, puis ' + nm(nx.next) : nx.t === 'between' ? 'Ensuite : récupération ' + nx.dur + ' s avant le tour ' + (nx.r + 1) : 'Ensuite : ' + nm(nx.s);
    else if (nx && nx.t === 'work') nextTxt = 'Départ dans ' + ph.dur + ' s';
  }
  const cue = cueM ? [crTxt(cueM.cue), crTxt(cueM.zone) ? 'Zone : ' + cueM.zone : '', crTxt(cueM.errors) ? '✗ ' + cueM.errors : ''].filter(Boolean).map(t => crEsc(t)).join('<br>') : '';
  const left = c.running ? Math.max(0, (c.end - performance.now()) / 1000) : c.left;
  const started = c.i > 0 || c.left < c.ph[0].dur - 0.05;
  const go = c.running ? '⏸ Pause' : (c.done ? '↻ Recommencer' : (started ? '▶ Reprendre' : '▶ Démarrer'));
  const pct = c.done ? 100 : Math.max(0, Math.min(100, (1 - left / ph.dur) * 100));
  return `<div class="crl-chr ${cls}"><div class="crl-chr-top"><span>${lab}</span><button type="button" class="crl-chr-mute" onclick="crLectMuteToggle()" aria-label="${crLectMute() ? 'Activer le son' : 'Couper le son'}">${crLectMute() ? '🔕' : '🔔'}</button></div>
    ${cap ? `<div class="crl-chr-k">${crEsc(cap)}</div>` : ''}<div class="crl-chr-name">${crEsc(name)}</div>
    ${c.done ? '' : `<div class="crl-chr-t" id="crl-chr-t" role="timer">${crLectFmtT(left)}</div><div class="crl-chr-bar"><i id="crl-chr-bar" style="width:${pct}%"></i></div>`}
    ${cue ? `<div class="crl-chr-cue">${cue}</div>` : ''}${nextTxt ? `<div class="crl-chr-next">${crEsc(nextTxt)}</div>` : ''}
    <div class="crl-chr-ctl"><button type="button" onclick="crLectChrSkip(-1)" aria-label="Phase précédente" ${c.i === 0 && !c.done ? 'disabled' : ''}>⏮</button><button type="button" class="go" onclick="crLectChrToggle()">${go}</button><button type="button" onclick="crLectChrSkip(1)" aria-label="Phase suivante" ${c.done || c.i >= c.ph.length - 1 ? 'disabled' : ''}>⏭</button>${started || c.done ? `<button type="button" onclick="crLectChrReset()" aria-label="Tout recommencer">↺</button>` : ''}</div></div>`;
}
// tableau de séries : lignes en gros, séries à cocher, minuterie de récupération
function crLectSerie(i, k) {
  const S = crLect; if (!S) return; const r = crNormRenfo(S.items[S.k].x.renfo), m = r.moves[i]; if (!m) return;
  if (!S.ticks) S.ticks = {}; const n = Math.max(1, parseInt(m.sets, 10) || 1), cur = S.ticks[m.id] || 0;
  if (k < cur) { S.ticks[m.id] = k; S.rec = null; }
  else {
    S.ticks[m.id] = k + 1;
    const rest = parseInt(m.rest, 10) || 0;
    if (k + 1 < n && rest > 0) { crLectAudioInit(); S.rec = { end: performance.now() + rest * 1000, total: rest, label: crTxt(m.name) || 'Mouvement ' + (i + 1), bp: -1 }; crLectTimerEnsure(); }
    else S.rec = null;
  }
  crLectFigRefresh();
}
function crLectRecStop() { const S = crLect; if (S) S.rec = null; crLectFigRefresh(); }
function crLectTableHtml(r) {
  const S = crLect; if (!S.ticks) S.ticks = {};
  let tot = 0, done = 0;
  const rows = r.moves.map((m, i) => {
    const n = Math.max(1, parseInt(m.sets, 10) || 1), d = Math.min(n, S.ticks[m.id] || 0); tot += n; done += d;
    const ln = crRfLine(m);
    return `<div class="crl-rm${d >= n ? ' ok' : ''}"><div class="crl-rm-h"><span class="crl-n">${i + 1}</span><b>${crEsc(m.name || 'Mouvement ' + (i + 1))}</b>${crTxt(m.zone) ? `<span class="crl-tag">${crEsc(m.zone)}</span>` : ''}</div>
      ${ln ? `<div class="crl-rm-l">${crEsc(ln)}</div>` : ''}${crTxt(m.cue) ? `<div class="crl-rm-c">${crEsc(m.cue).replace(/\n/g, '<br>')}</div>` : ''}${crTxt(m.errors) ? `<div class="crl-rm-e">✗ ${crEsc(m.errors).replace(/\n/g, '<br>')}</div>` : ''}
      <div class="crl-tks">${Array.from({ length: n }, (_, k) => `<button type="button" class="crl-tk${k < d ? ' on' : ''}" onclick="crLectSerie(${i},${k})" aria-label="Série ${k + 1}" aria-pressed="${k < d}">${k < d ? '✓' : k + 1}</button>`).join('')}</div></div>`;
  }).join('');
  const rec = S.rec ? `<div class="crl-rec"><span>Récup</span><b id="crl-rec-t">${crLectFmtT((S.rec.end - performance.now()) / 1000)}</b><span class="crl-rec-n">${crEsc(S.rec.label)}</span><button type="button" onclick="crLectRecStop()" aria-label="Arrêter la récupération">✕</button></div>` : '';
  return `<div class="crl-rf">${rec}<div class="crl-rf-p">${done} / ${tot} séries faites</div>${rows}</div>`;
}
function crLectRenfo(x) {
  const r = crNormRenfo(x.renfo);
  if (!r.moves.length) return `<div class="crl-nofig">Aucun mouvement renseigné pour cet exercice.</div>`;
  return r.format === 'circuit' ? crLectChrHtml(r) : crLectTableHtml(r);
}
// zone de gauche : schéma (par défaut), chronomètre / tableau (renfo), règles du jeu (jeu sans schéma)
function crLectFig() {
  const S = crLect, x = S.items[S.k].x, kd = crKind(x);
  if (S.sec !== 'gb') {
    if (kd === 'renfo') return crLectRenfo(x);
    if (kd === 'jeu' && !crLectHasSchema(x)) return `<div class="crl-jeu">${crLectJeu(x) || '<div class="crl-nofig">Règles du jeu non renseignées.</div>'}</div>`;
  }
  return crLectFigSchema();
}
// Nombre de colonnes des listes (Besoins, Fonctionnement, Comportements…) dans la fiche et le PDF : 1, 2 ou 3 (mémorisé sur cet appareil)
function crFicheCols(n) {
  if (n == null) { try { n = parseInt(localStorage.getItem('crFicheCols'), 10); } catch (e) {} }
  n = [1, 2, 3].includes(n) ? n : 2;
  document.documentElement.style.setProperty('--fxc', String(n));
  document.querySelectorAll('.cr-fiche-cols button').forEach(b => b.classList.toggle('on', +b.dataset.c === n));
  if (arguments.length && arguments[0] != null) { try { localStorage.setItem('crFicheCols', String(n)); } catch (e) {} }
}
function crFicheGo(exId) { const t = document.getElementById('crfx-' + exId); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function crFicheEdit(bi, ei) { crCloseFiche(); crOpenEx(bi, ei); }
function crFicheAnim(key) { const a = crFicheAnimMap[key]; if (a) schPlayerOpenData(a.name, a.drawings); }
function crFicheRestoreTitle() { if (crFicheTitleBak != null) { document.title = crFicheTitleBak; crFicheTitleBak = null; } }
window.addEventListener('afterprint', crFicheRestoreTitle);
// Impression : feuille de style @media print (A4, un exercice par page, schémas en vectoriel). Le titre de la page devient le nom du fichier proposé pour le PDF.
function crFichePrint(pdf) {
  const msg = document.getElementById('cr-fiche-msg'), say = t => { if (msg) msg.textContent = t || ''; };
  const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
  try {
    if (crFicheTitleBak == null) crFicheTitleBak = document.title;
    document.title = crFicheSlug(crFiche && crFiche.title);
    say(pdf ? 'Génération du PDF…' : '');
    setTimeout(() => {
      try {
        window.print();
        say(pdf ? (touch ? 'Dans la fenêtre : Partager (↑) → Enregistrer dans Fichiers' : 'Choisis « Enregistrer au format PDF » comme imprimante') : '');
      } catch (e) { say('Impression impossible : ' + (e.message || e)); crFicheRestoreTitle(); }
    }, 80);
  } catch (e) { say('Impression impossible : ' + (e.message || e)); }
}

// ----- Exercice : page de détail -----
const CR_EX_TABS = [
  { k: 'besoins', label: 'Besoins', desc: 'Ce dont les joueurs ont besoin pour réussir cet exercice : le « pourquoi ».', subOk: true, learn: true, lists: [{ k: 'besoins', title: 'Besoins' }] },
  { k: 'fonctionnement', label: 'Fonctionnement', desc: 'Comment l’exercice tourne concrètement : le « comment ».', subOk: true, learn: true, lists: [{ k: 'fonctionnement', title: 'Fonctionnement' }] },
  { k: 'comportements', label: 'Comportements attendus', subOk: true, learn: true, lists: [{ k: 'comportements', title: 'Comportements attendus' }] },
  { k: 'reussite', label: 'Critères de réussite', subOk: true, learn: true, lists: [{ k: 'reussite', title: 'Critères de réussite' }] },
  { k: 'evolutions', label: 'Évolutions', desc: 'Évolution N°1, N°2… : comment faire évoluer l’exercice.', evo: true },
  { k: 'consignes', label: 'Consignes', lists: [{ k: 'consignes', title: 'Consignes', tags: ['Principale', 'Secondaire', 'Fonctionnement', 'Sécurité'], auto: true }] },
  { k: 'realisation', label: 'Réalisation', subOk: true, lists: [{ k: 'realisation', title: 'Critères de réalisation', sug: ['Orientation du corps', 'Prise d’information', 'Timing', 'Distance', 'Vitesse', 'Coordination', 'Placement', 'Déplacement', 'Communication', 'Intention tactique'] }] },
  { k: 'organisation', label: 'Organisation', org: true },
  { k: 'materiel', label: 'Matériel', equip: true },
  { k: 'variables', label: 'Variables', lists: [
    { k: 'simplify', title: 'Simplifier ↓', cls: 'simplify', sug: ['Augmenter l’espace', 'Supprimer un défenseur', 'Supprimer une contrainte', 'Défense passive'] },
    { k: 'complexify', title: 'Complexifier ↑', cls: 'complexify', sug: ['Réduire l’espace', 'Ajouter un défenseur', 'Limiter le nombre de passes', 'Imposer un temps'] }] },
  { k: 'vigilance', label: 'Vigilance', lists: [{ k: 'vigilance', title: 'Points de vigilance', tags: ['Sécurité', 'Organisation', 'Comportement', 'Technique', 'Tactique', 'Gestion du groupe'] }] },
  { k: 'corrections', label: 'Corrections', lists: [{ k: 'corrections', title: 'Corrections / régulations', extra: true }] },
  { k: 'progression', label: 'Progression', lists: [{ k: 'progression', title: 'Progression' }, { k: 'regression', title: 'Régression' }] },
];
// ----- Modèle de séance personnalisable (Réglages › Modèle de séance) : sections actives, sous-items, listes en un clic -----
const CR_DEF_SUBS = {
  besoins: [
    { id: 'b-tech', name: 'Technique', desc: 'Gestes à maîtriser pour réussir (passe, réception, tir, dribble…)' },
    { id: 'b-tact', name: 'Tactique', desc: 'Lecture du jeu, choix et placement individuel ou collectif' },
    { id: 'b-phys', name: 'Physique', desc: 'Qualités motrices et énergétiques sollicitées (vitesse, appuis, endurance…)' },
    { id: 'b-ment', name: 'Mental / relationnel', desc: 'Attitude, communication, engagement, gestion de l’erreur' }],
  fonctionnement: [
    { id: 'f-disp', name: 'Dispositif & espace', desc: 'Où sont les joueurs, quelle zone de jeu, quel matériel en place' },
    { id: 'f-regl', name: 'Règles & contraintes', desc: 'Ce qui est autorisé ou interdit, contraintes de jeu, comptage des points' },
    { id: 'f-deroul', name: 'Déroulement', desc: 'Enchaînement des actions : départ, arrêt, durée, nombre de séries' },
    { id: 'f-roles', name: 'Rôles & rotations', desc: 'Qui fait quoi et comment on tourne' }],
};
const CR_DEF_SUG = {
  besoins: [['Précision de la passe', 'b-tech'], ['Qualité de réception', 'b-tech'], ['Efficacité du tir', 'b-tech'], ['Maîtrise du dribble', 'b-tech'],
    ['Lire le placement du défenseur', 'b-tact'], ['Créer le surnombre', 'b-tact'], ['Utiliser l’espace libre', 'b-tact'], ['Choisir entre passer et tirer', 'b-tact'],
    ['Vitesse de déplacement', 'b-phys'], ['Changements de direction', 'b-phys'], ['Intensité et répétition', 'b-phys'], ['Coordination', 'b-phys'],
    ['Communication', 'b-ment'], ['Concentration', 'b-ment'], ['Engagement', 'b-ment'], ['Gestion de l’erreur', 'b-ment']],
  fonctionnement: [['Deux colonnes face au but', 'f-disp'], ['Départ en ligne médiane', 'f-disp'], ['Interdiction de dribbler', 'f-regl'], ['Passe obligatoire avant le tir', 'f-regl'], ['Point en plus si but après X passes', 'f-regl'],
    ['Départ au signal du coach', 'f-deroul'], ['Enchaînement sans temps mort', 'f-deroul'], ['Séries de X passages', 'f-deroul'],
    ['Rotation après chaque passage', 'f-roles'], ['Changement de rôle toutes les X minutes', 'f-roles'], ['Le défenseur devient attaquant', 'f-roles']],
  comportements: ['Communiquer (appeler la balle)', 'S’engager à pleine intensité', 'Respecter les consignes', 'Accepter l’erreur et enchaîner', 'Encourager et aider ses partenaires', 'Rester concentré jusqu’au bout', 'Se replacer vite', 'Être attentif au signal', 'Jouer collectif'].map(t => [t, '']),
  reussite: ['X tirs réussis sur X', 'Conservation de balle', 'Réalisation dans le temps imparti', 'Respect de la contrainte', 'Nombre de passes réussies', 'Marquer X buts en Y minutes', 'Moins de X balles perdues', 'Franchir la ligne X fois'].map(t => [t, '']),
};
let crCfg = null, crCfgTimer = 0, crCfgPending = false;
function crCfgNorm(c) {
  c = (c && typeof c === 'object') ? c : {};
  const o = k => (c[k] && typeof c[k] === 'object' && !Array.isArray(c[k])) ? c[k] : {};
  return { u: +c.u || 0, off: o('off'), order: Array.isArray(c.order) ? c.order.filter(k => typeof k === 'string') : [], names: o('names'), descs: o('descs'), subs: o('subs'), sug: o('sug'),
    custom: (Array.isArray(c.custom) ? c.custom : []).filter(x => x && /^c_[a-z0-9]+$/.test(x.k)).map(x => ({ k: x.k, name: String(x.name || 'Section'), desc: String(x.desc || '') })) };
}
function crCfgGet() {
  if (!crCfg) { let r = null; try { r = JSON.parse(localStorage.getItem('crCfg') || 'null'); } catch (e) {} crCfg = crCfgNorm(r); }
  return crCfg;
}
function crCoachId() {
  if (!coachSession) return '';
  if (coachSession.id) return coachSession.id;
  try { return JSON.parse(atob(String(coachSession.access_token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || ''; } catch (e) { return ''; }
}
function crCfgSave() {
  const c = crCfgGet(); c.u = Date.now();
  try { localStorage.setItem('crCfg', JSON.stringify(c)); } catch (e) {}
  crCfgPending = true; crCfgMsg('Enregistrement…');
  clearTimeout(crCfgTimer); crCfgTimer = setTimeout(crCfgPush, 600);
}
function crCfgMsg(t, err) { const el = document.getElementById('crc-msg'); if (el) { el.textContent = t; el.style.color = err ? '#ff6b6b' : '#2ecc71'; } }
async function crCfgPush() {
  const id = crCoachId(); if (!id || !crCfgPending) { crCfgMsg('✓ Enregistré sur cet appareil'); return; }
  try {
    await ensureCoachSession();
    const c = crCfgGet(), res = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', { method: 'POST', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify([{ key: 'coach_cfg_' + id, value: JSON.stringify(c), updated_at: new Date().toISOString() }]) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    crCfgPending = false; crCfgMsg('✓ Enregistré · disponible sur tous tes appareils');
  } catch (e) { crCfgMsg('⚠ Enregistré ici, envoi aux autres appareils à réessayer', true); }
}
async function crCfgPull() {
  const id = crCoachId(); if (!id || !navigator.onLine) return;
  if (crCfgPending) { crCfgPush(); return; }
  try {
    const res = await fetch(SB_URL + '/rest/v1/app_settings?select=value&key=eq.coach_cfg_' + id, { headers: coachAuthHeaders() });
    if (!res.ok) return;
    const rows = await res.json(); if (!rows.length) { if (!crCfgGet().u) return; crCfgPending = true; crCfgPush(); return; }
    const r = crCfgNorm(JSON.parse(rows[0].value)), c = crCfgGet();
    if (r.u > c.u) {
      crCfg = r; try { localStorage.setItem('crCfg', JSON.stringify(r)); } catch (e) {}
      if (document.getElementById('crc-ui') && !document.activeElement.closest('#crc-ui')) crCfgRenderUi();
      const a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName), ev = document.getElementById('cr-ex-view');
      if (ev && ev.style.display !== 'none' && !typing && crCur) { try { crRenderExView(); } catch (e) {} }
    } else if (r.u < c.u) { crCfgPending = true; crCfgPush(); }
  } catch (e) {}
}
// sections (ordre, activation, noms)
function crSecDefs() {
  const c = crCfgGet(), all = CR_EX_TABS.concat(c.custom.map(x => ({ k: x.k, label: x.name, desc: x.desc, custom: true, subOk: true, learn: true, lists: [{ k: x.k, title: x.name }] })));
  const pos = k => { const i = c.order.indexOf(k); return i < 0 ? 1e6 + all.findIndex(t => t.k === k) : i; };
  return all.slice().sort((a, b) => pos(a.k) - pos(b.k)).map(t => {
    const label = crTxt(c.names[t.k]) || t.label, desc = c.descs[t.k] != null ? c.descs[t.k] : (t.desc || '');
    return { ...t, label, desc, on: !c.off[t.k], lists: t.lists ? t.lists.map((l, i) => (i === 0 && t.custom ? { ...l, title: label } : (i === 0 && (t.k === 'besoins' || t.k === 'fonctionnement' || t.k === 'comportements' || t.k === 'reussite') ? { ...l, title: label } : l))) : t.lists };
  });
}
function crTabs() { const a = crSecDefs().filter(t => t.on); return a.length ? a : [crSecDefs()[0]]; }
function crSecOn(k) { return !crCfgGet().off[k]; }
function crSubs(key) { const c = crCfgGet(); return Array.isArray(c.subs[key]) ? c.subs[key] : (CR_DEF_SUBS[key] || []); }
function crSubOf(key, it) { const subs = crSubs(key); const s = subs.find(z => z.id === it.sub) || (it.tag ? subs.find(z => z.name === it.tag) : null); return s ? s.id : ''; }
function crSubName(key, it) { const s = crSubs(key).find(z => z.id === crSubOf(key, it)); return s ? s.name : (it.tag || ''); }
// Listes en un clic : modèle de base + ajouts − retraits + éléments qui reviennent dans au moins 2 exercices (toutes séances)
function crLearned(key) {
  const cnt = new Map();
  (crPlans || []).forEach(p => (p.blocks || []).forEach(b => (b.exercises || []).forEach(x => {
    const arr = x && x.items && x.items[key]; if (!Array.isArray(arr)) return;
    const seen = new Set();
    arr.forEach(it => {
      const t = crTxt(it && it.text); if (!t || t.length > 90) return;
      const f = crFold(t).replace(/\s+/g, ' ').trim(); if (seen.has(f)) return; seen.add(f);
      let e = cnt.get(f); if (!e) { e = { t, n: 0, subs: {} }; cnt.set(f, e); }
      e.n++; const sid = crSubOf(key, it); e.subs[sid] = (e.subs[sid] || 0) + 1;
    });
  })));
  return [...cnt.values()].filter(e => e.n >= 2).sort((a, b) => b.n - a.n).map(e => ({ t: e.t, n: e.n, s: Object.keys(e.subs).sort((a, b) => e.subs[b] - e.subs[a])[0] || '' }));
}
function crSugs(key) {
  const c = crCfgGet(), sg = c.sug[key] || {}, del = (sg.del || []).map(t => crFold(t).trim()), out = [], seen = new Set();
  const push = (t, s, auto, n) => { const f = crFold(t).trim(); if (!f || seen.has(f) || del.includes(f)) return; seen.add(f); out.push({ t, s: s || '', auto: !!auto, n }); };
  (CR_DEF_SUG[key] || []).forEach(a => push(a[0], a[1], false)); (sg.add || []).forEach(a => push(a.t, a.s, false));
  if (key === 'besoins' || key === 'fonctionnement' || key === 'comportements' || key === 'reussite' || /^c_/.test(key)) crLearned(key).forEach(e => push(e.t, e.s, true, e.n));
  const subs = crSubs(key).map(z => z.id); out.forEach(o => { if (o.s && !subs.includes(o.s)) o.s = ''; });
  return out;
}
// ----- Réglages › Modèle de séance -----
function crcRender() { crCfgRenderUi(); }
function crCfgRenderUi() {
  const el = document.getElementById('crc-ui'); if (!el) return;
  const c = crCfgGet(), secs = crSecDefs();
  const open = new Set([...el.querySelectorAll('details[open]')].map(d => d.dataset.k));
  el.innerHTML = secs.map((t, i) => {
    const subs = t.subOk ? crSubs(t.lists[0].k) : [];
    const subsHtml = t.subOk ? `<div class="crc-h">Sous-items (regroupent les éléments de la section)</div>${subs.map((z, j) => `<div class="crc-row"><div style="flex:1;min-width:0;"><input class="cr-in" placeholder="Nom du sous-item" value="${crEsc(z.name)}" oninput="crcSubSet('${t.k}',${j},'name',this.value)"><input class="cr-in" style="margin-top:4px;" placeholder="Description (ce que l’on entend par là)" value="${crEsc(z.desc || '')}" oninput="crcSubSet('${t.k}',${j},'desc',this.value)"></div>
        <button type="button" class="crc-mini" onclick="crcSubMove('${t.k}',${j},-1)">↑</button><button type="button" class="crc-mini" onclick="crcSubMove('${t.k}',${j},1)">↓</button><button type="button" class="crc-mini" style="color:#ff6b6b;" onclick="crcSubDel('${t.k}',${j})">✕</button></div>`).join('')}
      <button type="button" class="cr-btn sm" onclick="crcSubAdd('${t.k}')">＋ Sous-item</button>` : '';
    const sugs = t.learn ? crSugs(t.lists[0].k) : [];
    const sugHtml = t.learn ? `<div class="crc-h">Liste en un clic (${sugs.length})</div><div class="cr-sug" style="margin-bottom:8px;">${sugs.map(z => `<span class="cr-chip${z.auto ? ' auto' : ''}" ${z.auto ? `title="Ajouté automatiquement : revient dans ${z.n} exercices"` : ''}>${crEsc(z.t)}${subs.length && z.s ? ' <span class="n">· ' + crEsc((subs.find(q => q.id === z.s) || {}).name || '') + '</span>' : ''} <b data-t="${crEsc(z.t)}" data-k="${t.lists[0].k}" style="color:#ff6b6b;margin-left:4px;" onclick="crcSugDel(this.dataset.k,this.dataset.t)">✕</b></span>`).join('') || '<span style="font-size:12px;color:var(--gris-texte);">Vide</span>'}</div>
      <div class="crc-row"><input class="cr-in" id="crc-sa-${t.k}" placeholder="Nouvel élément…" style="flex:1;">${subs.length ? `<select class="cr-in" id="crc-ss-${t.k}" style="width:auto;max-width:42%;"><option value="">Sans sous-item</option>${subs.map(z => `<option value="${z.id}">${crEsc(z.name)}</option>`).join('')}</select>` : ''}<button type="button" class="cr-btn sm" onclick="crcSugAdd('${t.k}')">Ajouter</button></div>
      <div style="font-size:10px;color:var(--gris-texte);">Les éléments en pointillés sont ajoutés automatiquement dès qu’ils reviennent dans au moins 2 exercices.</div>` : '';
    return `<details class="crc-sec ${t.on ? '' : 'off'}" data-k="${t.k}" ${open.has(t.k) ? 'open' : ''}><summary>
      <input type="checkbox" ${t.on ? 'checked' : ''} onclick="event.stopPropagation()" onchange="crcToggle('${t.k}',this.checked)" style="width:20px;height:20px;flex-shrink:0;">
      <b style="flex:1;min-width:0;">${crEsc(t.label)}</b><button type="button" class="crc-mini" ${i === 0 ? 'disabled' : ''} onclick="event.preventDefault();event.stopPropagation();crcMove('${t.k}',-1)">↑</button><button type="button" class="crc-mini" ${i === secs.length - 1 ? 'disabled' : ''} onclick="event.preventDefault();event.stopPropagation();crcMove('${t.k}',1)">↓</button><span style="color:var(--gris-texte);">▾</span></summary>
      <div class="crc-in"><div class="crc-h">Nom de la section</div><input class="cr-in" value="${crEsc(t.label)}" oninput="crcName('${t.k}',this.value)" onchange="crCfgRenderUi()">
      <div class="crc-h">Description d’aide (affichée sous le titre)</div><textarea class="cr-in" rows="2" oninput="crcDesc('${t.k}',this.value)">${crEsc(t.desc || '')}</textarea>
      ${subsHtml}${sugHtml}
      ${t.custom ? `<div style="margin-top:12px;"><button type="button" class="cr-btn sm danger" onclick="crcCustomDel('${t.k}')">Supprimer cette section</button></div>` : ''}</div></details>`;
  }).join('') + `<div class="crc-row" style="margin-top:10px;"><input class="cr-in" id="crc-new" placeholder="Nouvelle section (ex. Sécurité)" style="flex:1;"><button type="button" class="cr-btn" onclick="crcCustomAdd()">＋ Section</button></div>
    <button type="button" class="cr-btn sm" style="margin-top:6px;" onclick="crcReset()">Rétablir le modèle par défaut</button>`;
}
function crcSet(fn) { fn(crCfgGet()); crCfgSave(); }
function crcToggle(k, on) {
  const c = crCfgGet();
  if (!on && crSecDefs().filter(t => t.on).length <= 1) { alert('Garde au moins une section active.'); crCfgRenderUi(); return; }
  if (on) delete c.off[k]; else c.off[k] = true;
  crCfgSave(); crCfgRenderUi();
}
function crcMove(k, d) {
  const c = crCfgGet(), keys = crSecDefs().map(t => t.k), i = keys.indexOf(k), j = i + d; if (j < 0 || j >= keys.length) return;
  [keys[i], keys[j]] = [keys[j], keys[i]]; c.order = keys; crCfgSave(); crCfgRenderUi();
}
function crcName(k, v) { crcSet(c => { c.names[k] = v; }); }
function crcDesc(k, v) { crcSet(c => { c.descs[k] = v; }); }
function crcSubsOf(k) { const c = crCfgGet(); if (!Array.isArray(c.subs[k])) c.subs[k] = crSubs(k).map(z => ({ ...z })); return c.subs[k]; }
function crcSubSet(k, j, f, v) { const a = crcSubsOf(k); if (a[j]) { a[j][f] = v; crCfgSave(); } }
function crcSubAdd(k) { crcSubsOf(k).push({ id: 's' + crUid(), name: 'Nouveau sous-item', desc: '' }); crCfgSave(); crCfgRenderUi(); }
function crcSubDel(k, j) { const a = crcSubsOf(k); if (!confirm('Supprimer ce sous-item ? Les éléments déjà écrits sont conservés (rangés dans « Autres » ou gardant leur nom).')) return; a.splice(j, 1); crCfgSave(); crCfgRenderUi(); }
function crcSubMove(k, j, d) { const a = crcSubsOf(k), n = j + d; if (n < 0 || n >= a.length) return; [a[j], a[n]] = [a[n], a[j]]; crCfgSave(); crCfgRenderUi(); }
function crcSugAdd(k) {
  const inp = document.getElementById('crc-sa-' + k), sel = document.getElementById('crc-ss-' + k), t = crTxt(inp && inp.value); if (!t) return;
  const c = crCfgGet(), sg = c.sug[k] = c.sug[k] || {}; sg.add = sg.add || []; sg.del = (sg.del || []).filter(x => crFold(x).trim() !== crFold(t).trim());
  if (!crSugs(k).some(z => crFold(z.t).trim() === crFold(t).trim())) sg.add.push({ t, s: sel ? sel.value : '' });
  crCfgSave(); crCfgRenderUi();
}
function crcSugDel(k, t) {
  const c = crCfgGet(), sg = c.sug[k] = c.sug[k] || {}, f = crFold(t).trim(); sg.add = (sg.add || []).filter(a => crFold(a.t).trim() !== f); sg.del = sg.del || [];
  if (!sg.del.includes(f)) sg.del.push(f); crCfgSave(); crCfgRenderUi();
}
function crcCustomAdd() {
  const inp = document.getElementById('crc-new'), n = crTxt(inp && inp.value); if (!n) return;
  const c = crCfgGet(), k = 'c_' + Math.random().toString(36).slice(2, 8); c.custom.push({ k, name: n.slice(0, 40), desc: '' }); crCfgSave(); crCfgRenderUi();
  const d = document.querySelector('#crc-ui details[data-k="' + k + '"]'); if (d) d.open = true;
}
function crcCustomDel(k) {
  if (!confirm('Supprimer cette section ? Ce qui a été écrit dedans dans les exercices n’apparaîtra plus.')) return;
  const c = crCfgGet(); c.custom = c.custom.filter(x => x.k !== k); c.order = c.order.filter(x => x !== k); [c.off, c.names, c.descs, c.subs, c.sug].forEach(o => delete o[k]); crCfgSave(); crCfgRenderUi();
}
function crcReset() { if (!confirm('Rétablir le modèle par défaut ? (sections, sous-items et listes reviennent à l’état d’origine ; tes exercices ne changent pas)')) return; crCfg = crCfgNorm({}); crCfgSave(); crCfgRenderUi(); }
// ----- Évolutions -----
function crEvoRef() { const x = crCurEx(); if (!Array.isArray(x.evolutions)) x.evolutions = []; return x.evolutions; }
function crEvoHtml(x) {
  const a = crEvoRef();
  const rows = a.map((e, i) => `<div class="cr-evo"><div class="cr-evo-h"><span style="flex:1;">Évolution N°${i + 1}</span>
      <button type="button" class="crc-mini" ${i === 0 ? 'disabled' : ''} onclick="crEvoMove(${i},-1)">↑</button><button type="button" class="crc-mini" ${i === a.length - 1 ? 'disabled' : ''} onclick="crEvoMove(${i},1)">↓</button><button type="button" class="crc-mini" style="color:#ff6b6b;" onclick="crEvoDel(${i})">✕</button></div>
      <input class="cr-in" placeholder="Titre court (ex. Ajout d’un défenseur)" value="${crEsc(e.title)}" oninput="crEvoSet(${i},'title',this.value)">
      <textarea class="cr-in cr-grow" rows="2" id="cr-evo-${i}" style="margin-top:6px;" placeholder="Ce qui change : espace, contrainte, effectif, règle…" oninput="crEvoSet(${i},'text',this.value);crGrow(this)">${crEsc(e.text)}</textarea></div>`).join('');
  return `<div class="cr-list"><div class="cr-list-t">Évolutions</div>${rows}<button type="button" class="cr-btn" onclick="crEvoAdd()">＋ Évolution N°${a.length + 1}</button></div>`;
}
function crEvoAdd() { const a = crEvoRef(); a.push({ id: crUid(), title: '', text: '' }); crTouch(); crRenderExView(); const el = document.getElementById('cr-evo-' + (a.length - 1)); if (el) el.focus(); }
function crEvoSet(i, f, v) { const e = crEvoRef()[i]; if (!e) return; e[f] = v; crTouch(); }
function crEvoDel(i) { crEvoRef().splice(i, 1); crTouch(); crRenderExView(); }
function crEvoMove(i, d) { const a = crEvoRef(), j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; crTouch(); crRenderExView(); }
// ----- Listes à sous-items (Besoins, Fonctionnement…) -----
function crGrpRow(path, i, it) {
  return `<div class="cr-li"><span class="cr-li-n">•</span><div class="cr-li-b"><textarea class="cr-in cr-grow" rows="1" id="cr-li-${path.replace(':', '-')}-${i}" placeholder="Écrire ici…" oninput="crLiSet('${path}',${i},'text',this.value);crGrow(this)">${crEsc(it.text)}</textarea></div>
    <div class="cr-li-a"><button type="button" onclick="crLiMoveG('${path}',${i},-1)">↑</button><button type="button" onclick="crLiMoveG('${path}',${i},1)">↓</button><button type="button" style="color:#ff6b6b;" onclick="crLiDel('${path}',${i})">✕</button></div></div>`;
}
function crGroupHtml(tab) {
  const key = tab.lists[0].k, path = 'i:' + key, arr = crListRef(path), subs = crSubs(key);
  const groups = subs.map(s => ({ s, idx: [] })), other = { s: { id: '', name: subs.length ? 'Autres' : tab.label, desc: '' }, idx: [] };
  arr.forEach((it, i) => { const sid = crSubOf(key, it); (groups.find(g => g.s.id === sid) || other).idx.push(i); });
  const sugs = crSugs(key).filter(z => !arr.some(it => crFold(it.text).trim() === crFold(z.t).trim()));
  const all = groups.concat(other.idx.length || !subs.length ? [other] : []);
  return (tab.desc ? `<div class="cr-subd">${crEsc(tab.desc)}</div>` : '') + all.map(g => {
    const sg = sugs.filter(z => z.s === g.s.id).slice(0, 30);
    return `<div class="cr-list"><div class="cr-sub-h">${crEsc(g.s.name)}</div>${g.s.desc ? `<div class="cr-sub-d">${crEsc(g.s.desc)}</div>` : ''}${g.idx.map(i => crGrpRow(path, i, arr[i])).join('')}
      <button type="button" class="cr-btn" onclick="crLiAddG('${path}','${g.s.id}')">＋ Ajouter</button>
      ${sg.length ? `<div class="cr-sug">${sg.map(z => `<button type="button" class="cr-chip${z.auto ? ' auto' : ''}" ${z.auto ? `title="Revient dans ${z.n} exercices"` : ''} data-s="${crEsc(z.t)}" onclick="crLiSugG('${path}',this.dataset.s,'${g.s.id}')">＋ ${crEsc(z.t)}</button>`).join('')}</div>` : ''}</div>`;
  }).join('');
}
function crSubStamp(path, it, sid) { if (!sid) return; const s = crSubs(path.slice(2)).find(z => z.id === sid); if (s) { it.sub = s.id; it.tag = s.name; } }
function crLiAddG(path, sid) { const a = crListRef(path), it = { id: crUid(), text: '' }; crSubStamp(path, it, sid); a.push(it); crTouch(); crRenderExView(); const el = document.getElementById('cr-li-' + path.replace(':', '-') + '-' + (a.length - 1)); if (el) el.focus(); }
function crLiSugG(path, text, sid) { const a = crListRef(path), it = { id: crUid(), text }; crSubStamp(path, it, sid); a.push(it); crTouch(); crRenderExView(); }
function crLiMoveG(path, i, d) {
  const a = crListRef(path), key = path.slice(2), g = crSubOf(key, a[i]); let j = i + d;
  while (j >= 0 && j < a.length && crSubOf(key, a[j]) !== g) j += d;
  if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; crTouch(); crRenderExView();
}
const CR_ORG_FIELDS = [['setup', 'Disposition initiale', 'Où sont les joueurs au départ ?'], ['groups', 'Groupes', 'Composition des groupes'], ['rotations', 'Rotations / ordre de passage', 'Qui passe quand, changements de rôle'], ['roles', 'Rôle des joueurs', 'Attaquants, défenseurs, passeurs…']];
const CR_LIST_KEYS = ['besoins', 'fonctionnement', 'consignes', 'realisation', 'reussite', 'comportements', 'simplify', 'complexify', 'vigilance', 'corrections', 'progression', 'regression'];
const CR_GB_SUG = { instructions: ['Se placer sur la bissectrice du tir', 'Appuis actifs au moment de l’armé', 'Fermer le premier poteau', 'Se replacer avant le tir suivant', 'Relancer vite après l’arrêt', 'Annoncer à la défense (« j’ai le tireur »)'],
  success: ['X arrêts sur X tirs', 'Relance réussie en moins de 3 s', 'Replacé avant chaque tir', 'Annonce faite à chaque tir'] };
let crEx = { bi: 0, ei: 0, tab: 'consignes' };
function crFold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function crNormItem(t) {
  if (t && typeof t === 'object') { if (!t.id) t.id = crUid(); if (typeof t.text !== 'string') t.text = t.text == null ? '' : String(t.text); return t; }
  return { id: crUid(), text: t == null ? '' : String(t) };
}
function crNormList(a) { return (Array.isArray(a) ? a : []).map(crNormItem); }
function crNormEquip(a) { return (Array.isArray(a) ? a : []).map(e => (typeof e === 'string' ? { id: crUid(), name: e } : e)).filter(e => e && String(e.name || '').trim()).map(e => { if (!e.id) e.id = crUid(); e.name = String(e.name); if (e.qty != null && e.qty !== '') e.qty = Math.max(0, parseInt(e.qty, 10) || 0); else delete e.qty; return e; }); }
function crNormEx(x) {
  x = x || {};
  if (!x.id) x.id = crUid();
  if (x.name == null) x.name = '';
  x.minutes = parseInt(x.minutes, 10) || 0;
  ['objective', 'theme', 'subTheme', 'space'].forEach(k => { if (typeof x[k] !== 'string') x[k] = x[k] == null ? '' : String(x[k]); });
  if (!x.headcount || typeof x.headcount !== 'object') x.headcount = {};
  ['players', 'goalkeepers', 'groups', 'perGroup'].forEach(k => { if (x.headcount[k] == null) x.headcount[k] = ''; });
  if (x.balls == null) x.balls = '';
  if (!x.org || typeof x.org !== 'object') x.org = {};
  CR_ORG_FIELDS.forEach(([k]) => { if (typeof x.org[k] !== 'string') x.org[k] = ''; });
  if (!x.items || typeof x.items !== 'object') x.items = {};
  // anciennes données (x.sections : listes de textes) → nouveau format ; l'ancienne clé « variables » devient « Simplifier » (pas d'information pour trancher)
  const old = (x.sections && typeof x.sections === 'object') ? x.sections : {};
  const legacy = { consignes: old.consignes, realisation: old.realisation, reussite: old.reussite, comportements: old.comportements, vigilance: old.vigilance, corrections: old.corrections, simplify: old.variables };
  CR_LIST_KEYS.forEach(k => { x.items[k] = crNormList(x.items[k]); if (!x.items[k].length && legacy[k]) x.items[k] = crNormList(legacy[k]); });
  Object.keys(x.items).forEach(k => { if (!CR_LIST_KEYS.includes(k)) x.items[k] = crNormList(x.items[k]); }); // sections ajoutées dans Réglages
  x.evolutions = (Array.isArray(x.evolutions) ? x.evolutions : []).filter(e => e && typeof e === 'object').map(e => { if (!e.id) e.id = crUid(); e.title = e.title == null ? '' : String(e.title); e.text = e.text == null ? '' : String(e.text); return e; });
  if (Array.isArray(old.organisation) && old.organisation.length && !CR_ORG_FIELDS.some(([k]) => x.org[k].trim())) x.org.setup = old.organisation.filter(t => String(t || '').trim()).join('\n');
  x.equipment = crNormEquip(x.equipment);
  if (!x.equipment.length && Array.isArray(old.materiel)) x.equipment = crNormEquip(old.materiel.filter(t => String(t || '').trim()));
  delete x.sections;
  if (x.desc && !x.items.consignes.length) x.items.consignes = [crNormItem(x.desc)];
  delete x.desc;
  if (!Array.isArray(x.videos)) x.videos = [];
  x.schema = crNormSchema(x.schema);
  crSchemaMigrate(x);
  if (x.schemaLib) { x.schemaLib.drawings = schNormDrawings(x.schemaLib.drawings); if (!x.schemaLib.drawings.length) delete x.schemaLib; }
  if (x.gb && typeof x.gb === 'object') {
    const g = x.gb;
    if (typeof g.objective !== 'string') g.objective = g.objective == null ? '' : String(g.objective);
    g.instructions = crNormList(g.instructions); g.success = crNormList(g.success); g.equipment = crNormEquip(g.equipment);
    if (g.schemaLib) { g.schemaLib.drawings = schNormDrawings(g.schemaLib.drawings); if (!g.schemaLib.drawings.length) delete g.schemaLib; }
  } else delete x.gb;
  if (x.kind && !CR_KINDS[x.kind]) delete x.kind;
  if (x.jeu) x.jeu = crNormJeu(x.jeu);
  if (x.renfo) x.renfo = crNormRenfo(x.renfo);
  return x;
}
