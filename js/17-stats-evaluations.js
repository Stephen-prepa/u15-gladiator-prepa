// Prépa U15 HBCCS — js/17-stats-evaluations.js — dernière modification : version z90 (26/11/2026)
// ---------- Statistiques (SVG natif, pas de dependance externe) ----------
// ---------- Présences : bascule Saisie | Statistiques (z41) ----------
function presViewSet(v) {
  v = v === 'stats' ? 'stats' : 'saisie';
  try { localStorage.setItem('pres_view_v1', v); } catch (e) {}
  var a = document.getElementById('pr-saisie'), b = document.getElementById('pr-stats');
  if (a) a.style.display = v === 'saisie' ? 'block' : 'none';
  if (b) b.style.display = v === 'stats' ? 'block' : 'none';
  ['saisie', 'stats'].forEach(function (k) {
    var x = document.getElementById('pr-sw-' + k);
    if (x) x.className = 'ms-sw' + (k === v ? ' on' : '');
  });
  if (v === 'stats') statsLoad();
}
function presViewInit() {
  var v = 'saisie';
  try { v = localStorage.getItem('pres_view_v1') === 'stats' ? 'stats' : 'saisie'; } catch (e) {}
  presViewSet(v);
  // grand écran : la saisie et les statistiques sont côte à côte (CSS) → on charge aussi les stats
  if (window.innerWidth >= 1100 && v !== 'stats') statsLoad();
}
let statsPlayerRows = [];
let statsGlobalCounts = { present: 0, absent: 0, excuse: 0, retard: 0 };
let statsSelectedCode = null;

async function statsLoad() {
  const wrap = document.getElementById('stats-wrap');
  wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  try {
    await ensureCoachSession();
    const [presRes, playersRes] = await Promise.all([
      fetch(SB_URL + '/rest/v1/presences?select=player_code,status,session_date&order=session_date', { headers: coachAuthHeaders() }),
      fetch(SB_URL + '/rest/v1/players?select=code,name&claimed_at=not.is.null', { headers: coachAuthHeaders() }),
    ]);
    if (!presRes.ok) throw new Error('load failed');
    const pres = await presRes.json();
    const players = await playersRes.json();
    const nameByCode = {};
    players.forEach(p => { nameByCode[p.code] = p.name; });

    if (!pres.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);font-size:12px;">Aucune présence enregistrée pour le moment.</div>';
      return;
    }

    const byPlayer = {};
    const globalCounts = { present: 0, absent: 0, excuse: 0, retard: 0 };
    pres.forEach(r => {
      if (!byPlayer[r.player_code]) byPlayer[r.player_code] = { present: 0, absent: 0, excuse: 0, retard: 0 };
      if (byPlayer[r.player_code][r.status] !== undefined) byPlayer[r.player_code][r.status]++;
      if (globalCounts[r.status] !== undefined) globalCounts[r.status]++;
    });
    statsPlayerRows = Object.keys(byPlayer)
      .map(code => ({ code, name: nameByCode[code] || code, ...byPlayer[code], total: Object.values(byPlayer[code]).reduce((a,b)=>a+b,0) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    statsGlobalCounts = globalCounts;
    if (!statsSelectedCode || !statsPlayerRows.find(p => p.code === statsSelectedCode)) {
      statsSelectedCode = statsPlayerRows[0].code;
    }

    wrap.innerHTML = `
      <div style="display:flex;gap:12px;">
        <div style="width:110px;flex-shrink:0;max-height:340px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;display:flex;flex-direction:column;gap:4px;" id="stats-namelist"></div>
        <div style="flex:1;min-width:0;">
          <div id="stats-playername" style="font-size:13px;font-weight:800;color:var(--blanc);margin-bottom:8px;"></div>
          <div id="stats-indiv-chart"></div>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:16px 0 12px;"></div>
      <div style="font-size:11px;font-weight:700;color:var(--gris-texte);text-transform:uppercase;margin-bottom:8px;text-align:center;">Vue globale — tous joueurs</div>
      <div id="stats-pie"></div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:16px 0 12px;"></div>
      <div style="font-size:11px;font-weight:700;color:var(--gris-texte);text-transform:uppercase;margin-bottom:8px;">🎽 Tendance compositions week-end</div>
      <div style="font-size:10px;color:var(--gris-texte);margin-bottom:10px;">D'après l'historique de l'onglet Compos — indique quels joueurs reviennent le plus souvent en Équipe 1 ou Équipe 2.</div>
      <div id="stats-lineup-trend"></div>
    `;
    statsRenderNameList();
    statsRenderIndivChart();
    statsRenderPie();
    statsRenderLineupTrend();
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;font-size:12px;">Erreur de chargement des statistiques.</div>';
  }
}

async function statsRenderLineupTrend() {
  const wrap = document.getElementById('stats-lineup-trend');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:10px;color:var(--gris-texte);font-size:11px;">Chargement...</div>';
  try {
    const levels = await getPlayerLineupLevels();
    const withHistory = levels.filter(p => p.total > 0);
    if (!withHistory.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:10px;color:var(--gris-texte);font-size:11px;">Pas encore assez de compositions enregistrées.</div>';
      return;
    }
    withHistory.sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name, 'fr'));
    wrap.innerHTML = withHistory.map(p => {
      const pct1 = Math.round(p.ratio * 100);
      return `<div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gris-clair);margin-bottom:2px;">
          <span>${escapeSvgText(p.name)}</span>
          <span style="color:var(--gris-texte);">${p.team1}× Éq.1 · ${p.team2}× Éq.2</span>
        </div>
        <div style="height:6px;border-radius:3px;overflow:hidden;display:flex;">
          <div style="width:${pct1}%;background:#F5C400;"></div>
          <div style="width:${100 - pct1}%;background:#3498db;"></div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:10px;color:#e74c3c;font-size:11px;">Erreur de chargement.</div>';
  }
}

function statsRenderNameList() {
  const wrap = document.getElementById('stats-namelist');
  wrap.innerHTML = statsPlayerRows.map(p => {
    const active = p.code === statsSelectedCode;
    return `<button type="button" onclick="statsSelectPlayer('${p.code}')"
      style="text-align:left;padding:8px 10px;border-radius:8px;border:1px solid ${active ? 'var(--jaune)' : 'rgba(255,255,255,0.1)'};background:${active ? 'rgba(255,215,0,0.12)' : 'var(--noir)'};color:${active ? 'var(--jaune)' : 'var(--gris-clair)'};font-size:12px;line-height:1.3;font-weight:${active?'800':'400'};cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:34px;flex-shrink:0;">${p.name}</button>`;
  }).join('');
}
function statsSelectPlayer(code) {
  statsSelectedCode = code;
  statsRenderNameList();
  statsRenderIndivChart();
}
function statsRenderIndivChart() {
  const p = statsPlayerRows.find(r => r.code === statsSelectedCode);
  document.getElementById('stats-playername').textContent = p ? p.name : '';
  const data = [
    { label: 'Présent', value: p ? p.present : 0, color: '#2ecc71' },
    { label: 'Absent', value: p ? p.absent : 0, color: '#e74c3c' },
    { label: 'Excusé', value: p ? p.excuse : 0, color: '#f39c12' },
    { label: 'Retard', value: p ? p.retard : 0, color: '#3498db' },
  ];
  document.getElementById('stats-indiv-chart').innerHTML = svgBarChartVertical(data);
}
function statsRenderPie() {
  const data = [
    { label: 'Présent', value: statsGlobalCounts.present, color: '#2ecc71' },
    { label: 'Absent', value: statsGlobalCounts.absent, color: '#e74c3c' },
    { label: 'Excusé', value: statsGlobalCounts.excuse, color: '#f39c12' },
    { label: 'Retard', value: statsGlobalCounts.retard, color: '#3498db' },
  ];
  document.getElementById('stats-pie').innerHTML = svgPieChart(data);
}

function svgBarChartVertical(data) {
  const max = Math.max(1, ...data.map(d => d.value));
  const w = 220, h = 160, barW = 34, gap = 20, baseY = h - 22;
  const bars = data.map((d, i) => {
    const x = 14 + i * (barW + gap);
    const barH = Math.round(d.value / max * (h - 50));
    const y = baseY - barH;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${d.color}"></rect>
      <text x="${x + barW/2}" y="${y - 6}" font-size="12" font-weight="700" fill="#e8ecf3" text-anchor="middle">${d.value}</text>
      <text x="${x + barW/2}" y="${h - 6}" font-size="9" fill="#8a97ad" text-anchor="middle">${d.label}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:260px;display:block;">
    <line x1="10" y1="${baseY}" x2="${w-10}" y2="${baseY}" stroke="rgba(255,255,255,0.15)"></line>
    ${bars}
  </svg>`;
}
function svgPieChart(data) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 180, r = 76, cx = size/2, cy = size/2;
  if (!total) return '<div style="text-align:center;color:var(--gris-texte);font-size:12px;">Pas de données.</div>';
  let angleStart = -Math.PI / 2;
  const slices = data.filter(d => d.value > 0).map(d => {
    const frac = d.value / total;
    const angleEnd = angleStart + frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(angleStart), y1 = cy + r * Math.sin(angleStart);
    const x2 = cx + r * Math.cos(angleEnd), y2 = cy + r * Math.sin(angleEnd);
    const largeArc = (angleEnd - angleStart) > Math.PI ? 1 : 0;
    const path = `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
    angleStart = angleEnd;
    return `<path d="${path}" fill="${d.color}" stroke="var(--noir)" stroke-width="2"></path>`;
  }).join('');
  const legend = data.map(d => `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--gris-clair);">
    <span style="width:10px;height:10px;border-radius:3px;background:${d.color};display:inline-block;"></span>${d.label} — ${d.value} (${total ? Math.round(d.value/total*100) : 0}%)
  </div>`).join('');
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
    <svg viewBox="0 0 ${size} ${size}" width="180" height="180">${slices}</svg>
    <div style="display:flex;flex-direction:column;gap:5px;">${legend}</div>
  </div>`;
}
function escapeSvgText(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function coachAuthLogin() {
  const pwInput = document.getElementById('coachs2-password');
  const errEl = document.getElementById('coachs2-login-error');
  const btn = document.getElementById('coachs2-login-btn');
  const login = coachAuthSelectedLogin || COACH_LOGINS[0].login;
  const pw = pwInput.value;
  errEl.style.color = '#e74c3c';
  if (!pw) { errEl.textContent = 'Entre ton mot de passe.'; return; }
  btn.disabled = true; btn.textContent = 'Connexion...';
  try {
    const res = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: login + '@hbccs.local', password: pw }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      errEl.textContent = 'Mot de passe incorrect.';
      btn.disabled = false; btn.textContent = 'Se connecter';
      return;
    }
    const coachName = (COACH_LOGINS.find(c => c.login === login) || {}).name || login;
    coachSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      login, name: coachName,
      id: data.user && data.user.id,
    };

    // Verrou un seul appareil actif (même principe que côté joueurs) : si ce compte est déjà
    // utilisé sur un autre appareil, on demande confirmation avant de prendre le relais ici.
    const myDeviceToken = getOrCreateCoachDeviceToken();
    if (!COACH_SANS_VERROU.includes(login)) try {
      const cRes = await fetch(SB_URL + '/rest/v1/coaches?id=eq.' + encodeURIComponent(coachSession.id) + '&select=device_token', {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + coachSession.access_token },
      });
      const cRows = cRes.ok ? await cRes.json() : [];
      const existingToken = cRows.length ? cRows[0].device_token : null;
      if (existingToken && existingToken !== myDeviceToken) {
        const ok = window.confirm("Ce compte est déjà utilisé sur un autre appareil. Continuer ici déconnectera l'autre appareil dès son prochain chargement.\n\nContinuer ?");
        if (!ok) {
          coachSession = null;
          btn.disabled = false; btn.textContent = 'Se connecter';
          return;
        }
      }
      await fetch(SB_URL + '/rest/v1/coaches?id=eq.' + encodeURIComponent(coachSession.id), {
        method: 'PATCH',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + coachSession.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_token: myDeviceToken }),
      });
    } catch (e) {}

    saveCoachSession();
    pwInput.value = '';
    btn.disabled = false; btn.textContent = 'Se connecter';
    renderCoachs2View();
  } catch (e) {
    errEl.textContent = 'Connexion impossible — vérifie ta connexion internet.';
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
}

async function coachAuthLogout() {
  if (coachSession && coachSession.access_token) {
    fetch(SB_URL + '/auth/v1/logout', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + coachSession.access_token },
    }).catch(() => {});
  }
  coachSession = null;
  saveCoachSession();
  presenceInited = false;
  seanceInited = false;
  compositionInited = false;
  renderCoachs2View();
}

// Rafraichit le token si besoin ; a appeler avant toute requete vers les tables coach only
async function ensureCoachSession() {
  if (!coachSession || !coachSession.refresh_token) return null;
  if (coachSession.expires_at - Date.now() > 60000) return coachSession;
  try {
    const res = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: coachSession.refresh_token }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) { coachSession = null; saveCoachSession(); return null; }
    coachSession.access_token = data.access_token;
    coachSession.refresh_token = data.refresh_token;
    coachSession.expires_at = Date.now() + (data.expires_in || 3600) * 1000;
    if (data.user && data.user.id) coachSession.id = data.user.id;
    saveCoachSession();
    return coachSession;
  } catch (e) { return coachSession; }
}
// Vérifie une fois par ouverture d'appli que cet appareil est toujours celui enregistré pour ce coach
// (verrou un seul appareil actif). Si un autre appareil a pris le relais depuis, déconnexion propre.
async function checkCoachDeviceStillActive() {
  if (!coachSession || !coachSession.id) return;
  if (COACH_SANS_VERROU.includes(coachSession.login)) return;
  try {
    const myDeviceToken = getOrCreateCoachDeviceToken();
    const res = await fetch(SB_URL + '/rest/v1/coaches?id=eq.' + encodeURIComponent(coachSession.id) + '&select=device_token', {
      headers: coachAuthHeaders(),
    });
    if (!res.ok) return;
    const rows = await res.json();
    const serverToken = rows.length ? rows[0].device_token : null;
    if (serverToken && serverToken !== myDeviceToken) {
      coachSession = null;
      saveCoachSession();
      renderCoachs2View();
      alert('Ce compte a été utilisé sur un autre appareil — tu as été déconnecté ici. Reconnecte-toi si besoin.');
    }
  } catch (e) {}
}
// En-tetes a utiliser pour toute requete REST vers les tables coach only (evaluations, objectifs, presences)
function coachAuthHeaders() {
  return { apikey: SB_KEY, Authorization: 'Bearer ' + (coachSession ? coachSession.access_token : SB_KEY) };
}

// ---------- Évaluations (référentiel filière — prérequis, accélérateurs, fil rouge Homme à Homme, qualités intrinsèques) ----------
// Base HBCCS : Référentiel_Competences_Filiere_HBCCS (Word/PPTX) + Grille_Evaluation_Filiere_HBCCS (Excel).
// Cette appli n'accueille que la catégorie U15 (portée de "Prépa Estivale U15") ; comp_code/domain/category
// sont stockés en base pour rester compatibles si le référentiel est un jour étendu aux autres catégories.
// Chaque item a une échelle `scale` de 6 descriptions (index 0 à 5) pour ancrer la notation.
const EVAL_CATEGORY = 'U15';
const EVAL_ITEMS = [
  { code: 'HAH', domain: 'Fil rouge', kind: 'hah',
    comp: "Défense Homme à Homme — L'Homme à Homme s'intensifie : le 0:6 « à intention »",
    indicateur: 'Le joueur tient un marquage individuel strict sur une séquence de jeu complète, sans rupture.',
    scale: [
      'Non noté',
      "Perd son adversaire dès qu'il y a un écran ou un changement de rythme.",
      'Tient son adversaire par intermittence, décroche sur la durée.',
      'Tient un marquage individuel strict sur une séquence de jeu complète, sans rupture.',
      'Tient ce marquage sur l\'ensemble d\'une mi-temps, gère les écrans sans aide.',
      "Tient ce marquage sur un match complet et aide ponctuellement un partenaire en difficulté.",
    ] },
  { code: 'T1', domain: 'Technique', kind: 'prereq',
    comp: 'Tir en suspension maîtrisé',
    indicateur: 'Tir en suspension maîtrisé dans les deux couloirs, dribble utile et intentionnel (pas systématique).',
    scale: [
      'Non noté',
      'Tir en suspension non maîtrisé, dribble systématique et non réfléchi.',
      'Tir correct dans un seul couloir, dribble encore trop systématique.',
      'Tir en suspension maîtrisé dans les deux couloirs, dribble utile et intentionnel.',
      'Idem avec une bonne variation de rythme et d\'angle de tir.',
      'Maîtrise complète, capable d\'adapter son geste sous opposition rapprochée.',
    ] },
  { code: 'TA1', domain: 'Tactique', kind: 'prereq',
    comp: 'Situations à 2-3 et identification du système',
    indicateur: 'Lit et enchaîne des situations à 2-3 joueurs, tient un dispositif défensif (3-3, 1-5 ou 0-6 par ordre de priorité) et sait identifier quel système utiliser.',
    scale: [
      'Non noté',
      'Ne lit pas les situations à 2-3, perdu dans le dispositif défensif.',
      'Lit certaines situations à 2-3 mais n\'enchaîne pas, dispositif défensif approximatif.',
      'Lit et enchaîne des situations à 2-3, tient un dispositif défensif, identifie le système.',
      'Idem avec anticipation, propose des solutions avant la consigne du coach.',
      'Maîtrise et transmet la lecture à ses partenaires en cours de jeu.',
    ] },
  { code: 'TA2', domain: 'Tactique', kind: 'prereq',
    comp: 'Jeu avec pivot (prémices) et enclenchements simples',
    indicateur: 'Débute le jeu avec pivot, exécute des enclenchements simples (rotation, croisé, yugo), engagement/désengagement et replacement.',
    scale: [
      'Non noté',
      'Ignore le pivot, n\'exécute pas d\'enclenchement.',
      'Utilise le pivot occasionnellement, enclenchements hésitants.',
      'Débute le jeu avec pivot, exécute des enclenchements simples, engagement/désengagement et replacement.',
      'Enclenchements fluides et régulièrement réussis.',
      'Initie et varie les enclenchements selon la lecture défensive adverse.',
    ] },
  { code: 'P1', domain: 'Physique / Motricité', kind: 'prereq',
    comp: "Gestion de l'effort et explosivité",
    indicateur: "Gère l'effort sur la durée d'un match, débute un renforcement musculaire adapté, explosif sur les premières foulées.",
    scale: [
      'Non noté',
      'Décline physiquement dès la première période, pas d\'explosivité.',
      'Tient un quart-temps correctement puis décline.',
      'Gère l\'effort sur la durée d\'un match, débute un renforcement musculaire adapté, explosif sur les premières foulées.',
      'Maintient son niveau physique sur l\'ensemble du match.',
      'Monte en intensité en fin de match, référence physique de l\'équipe.',
    ] },
  { code: 'M1', domain: 'Mental / Comportemental', kind: 'prereq',
    comp: "Tenue d'un niveau d'exigence répété",
    indicateur: "Reste engagé et concentré sur la durée d'une saison exigeante, gère l'adversité (le club évolue volontairement au-dessus du niveau immédiat).",
    scale: [
      'Non noté',
      'Décroche dès les premières difficultés de la saison.',
      'Tient quelques séances ou matchs puis relâche son engagement.',
      'Reste engagé et concentré sur la durée d\'une saison exigeante, gère l\'adversité.',
      'Idem et entraîne le groupe par son exemplarité.',
      'Référence du groupe sur la durée, aucune baisse de régime constatée sur la saison.',
    ] },
  { code: 'A1', domain: 'Accélérateur', kind: 'accel',
    comp: 'Autonomie décisionnelle avancée',
    indicateur: "Autonomie dans les systèmes offensifs et défensifs, lecture du jeu en temps réel, capacité à s'adapter aux consignes en cours de match — attendus normalement U17.",
    scale: [
      'Non noté',
      'Dépendant des consignes en continu, aucune lecture autonome.',
      'Autonomie sur des séquences courtes et simples uniquement.',
      'Autonomie dans les systèmes offensifs et défensifs, lecture du jeu en temps réel, s\'adapte aux consignes en cours de match.',
      'Idem avec anticipation des ajustements avant même la consigne.',
      'Autonomie de niveau U17 confirmée sur l\'ensemble d\'un match.',
    ] },
  { code: 'A2', domain: 'Accélérateur', kind: 'accel',
    comp: 'Critères transversaux de passerelle (grille filière HBCCS)',
    indicateur: "Vitesse d'appuis, résistance au contact, endurance déjà au niveau supérieur ; assiduité, engagement, maturité et respect des consignes jugés exemplaires par le coach.",
    scale: [
      'Non noté',
      'En retrait sur ces critères par rapport au groupe.',
      'Dans la moyenne du groupe sur ces critères.',
      'Vitesse d\'appuis, résistance au contact, endurance déjà au niveau supérieur ; assiduité, engagement, maturité et respect des consignes exemplaires.',
      'Idem, repéré spontanément par plusieurs coachs comme prêt à passer un cap.',
      'Considéré prêt pour une passerelle immédiate vers la catégorie supérieure.',
    ] },
  // Qualités intrinsèques du joueur — complémentaires aux items ci-dessus (maîtrise de systèmes précis du projet de jeu actuel).
  // Ici : profil transférable du joueur, indépendamment du système en place. Brouillon à valider avec Stephen.
  { code: 'INT-PD', domain: 'Qualités intrinsèques', kind: 'intrinsic',
    comp: 'Perceptivo-décisionnel',
    scale: [
      'Non noté',
      "Joue sans tenir compte de l'environnement.",
      'Prend des informations une fois sur deux.',
      'Réussit les situations claires et identifiables.',
      'Réussit les situations avec des difficultés spatio-temporelles.',
      'Réussit à réadapter son premier choix en fonction de l\'environnement.',
    ] },
  { code: 'INT-QP', domain: 'Qualités intrinsèques', kind: 'intrinsic',
    comp: 'Qualité physique',
    scale: [
      'Non noté',
      'Subit physiquement les duels et en retard sur la course.',
      'Correct sur le physique ou la course.',
      'Moyen sur le physique et la course.',
      'Très bon sur le physique OU la course.',
      'Très bon sur le physique ET la course.',
    ] },
  { code: 'INT-HM', domain: 'Qualités intrinsèques', kind: 'intrinsic',
    comp: 'Habileté motrice',
    scale: [
      'Non noté',
      'Très en difficulté en coordination et dissociation.',
      'Correct en coordination ou dissociation.',
      'Moyen en coordination ou dissociation.',
      'Très coordonné OU très dissocié.',
      'Très coordonné ET très dissocié.',
    ] },
  { code: 'INT-MC', domain: 'Qualités intrinsèques', kind: 'intrinsic',
    comp: 'Mental / Combativité',
    scale: [
      'Non noté',
      "S'efface dans la difficulté.",
      'Mobilisé et persévérant lorsque le score est favorable.',
      "Reste mobilisé mais ne recommence pas après une situation d'échec.",
      'Persévère et reste mobilisé après un échec.',
      'Persévère et reste mobilisé après plusieurs échecs.',
    ] },
  { code: 'INT-ENT', domain: 'Qualités intrinsèques', kind: 'intrinsic',
    comp: 'Entraînabilité',
    scale: [
      'Non noté',
      'Réfractaire / distrait.',
      'Passif / inconstant.',
      'Volontaire / appliqué.',
      'Acteur de sa progression.',
      'Moteur / exemplaire.',
    ] },
];
// ---------- z90 — Grille « compétences observables » (critères lus dans la table eval_criteres, modifiables par Stephen) ----------
// Notes 0 à 5 (courbe d'évolution) regroupées en 4 niveaux de lecture ; case 💡 « sait quoi faire » (colonne evaluations.intention).
const EVAL_OBS_LEVELS = ['Non observé', 'Pas encore', 'Début', 'En cours de stabilisation', 'Acquis', 'Maîtrisé'];
const EVAL_OBS_SCALE = ['Non observé / compétence absente', 'Très insuffisant, notion non acquise', 'Insuffisant, acquis de façon très irrégulière', 'Acquis, à consolider (seuil de validation)', 'Bien maîtrisé, régulier', 'Excellent, transférable en match sous pression'];
const EVAL_OBS_HINT = ['', 'notion non acquise', 'acquis de façon très irrégulière', 'à consolider (seuil de validation)', 'régulier', 'transférable en match sous pression'];
const EVAL_OBS_SHORT = ['Non obs.', 'Pas enc.', 'Début', 'En cours', 'Acquis', 'Maîtrisé'];
const EVAL_OBS_PALETTE = ['var(--rouge-light)', 'var(--bleu-light)', 'var(--vert)', '#9b59b6', '#16a085', '#e67e22'];
let evalGrid = 'obs';        // 'obs' (nouvelle grille) | 'old' (ancienne grille 0-5)
try { if (localStorage.getItem('evalGrid') === 'old') evalGrid = 'old'; } catch (e) {}
let evalObsAll = [];         // tous les critères (actifs ou non) — pour l'éditeur
let evalObsItems = [];       // critères actifs, au format des items de l'ancienne grille
function evalObsMap(r) { return { code: r.code, domain: r.domain, kind: 'obs', comp: r.label, indicateur: r.indicateur || '', cle: !!r.cle, scale: EVAL_OBS_SCALE }; }
async function evalObsLoad() {
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/eval_criteres?category=eq.' + EVAL_CATEGORY + '&select=code,domain,label,indicateur,cle,ordre,actif&order=ordre.asc,code.asc', { headers: coachAuthHeaders() });
    if (res.ok) { evalObsAll = await res.json(); evalObsItems = evalObsAll.filter(r => r.actif).map(evalObsMap); }
  } catch (e) {}
}
function evalItems() { return evalGrid === 'obs' ? evalObsItems : EVAL_ITEMS; }
function evalFindItem(code) { return EVAL_ITEMS.filter(i => i.code === code)[0] || evalObsItems.filter(i => i.code === code)[0] || evalObsAll.map(evalObsMap).filter(i => i.code === code)[0] || null; }
function evalSeuil() { const n = parseInt(appSettings && appSettings.eval_seuil_note, 10); return n >= 1 && n <= 5 ? n : 3; }
function evalSeuilPct() { const n = parseInt(appSettings && appSettings.eval_seuil_passage, 10); return n >= 1 && n <= 100 ? n : 80; }
function evalDomains() { const out = []; evalObsItems.forEach(i => { if (out.indexOf(i.domain) < 0) out.push(i.domain); }); return out; }
function evalSeries() {
  if (evalGrid !== 'obs') return EVAL_EVO_SERIES;
  return evalDomains().map((d, k) => ({ k: d, lab: d.slice(0, 5) + (d.length > 5 ? '.' : ''), col: EVAL_OBS_PALETTE[k % EVAL_OBS_PALETTE.length] })).concat([{ k: 'GEN', lab: 'Général', col: 'var(--jaune)' }]);
}
function evalGridSet(g) {
  evalGrid = g === 'old' ? 'old' : 'obs'; try { localStorage.setItem('evalGrid', evalGrid); } catch (e) {}
  evalOpenSection = evalGrid === 'obs' ? null : 'filiere'; evalEvo.crit = '';
  evaluationsRenderGridBar(); evaluationsRenderItems(); evaluationsRenderAverages();
}
function evaluationsRenderGridBar() {
  const bar = document.getElementById('eval-grid-switch'); if (!bar) return;
  const chip = (on, label, fn) => '<button type="button" onclick="' + fn + '" style="padding:7px 12px;border-radius:18px;border:1px solid ' + (on ? 'var(--jaune)' : 'rgba(255,255,255,.18)') + ';background:' + (on ? 'rgba(245,196,0,.14)' : 'transparent') + ';color:' + (on ? 'var(--jaune)' : 'var(--gris-clair)') + ';font-size:12px;font-weight:' + (on ? '800' : '600') + ';cursor:pointer;">' + label + '</button>';
  bar.innerHTML = chip(evalGrid === 'obs', '🎯 Compétences observables', "evalGridSet('obs')") + chip(evalGrid === 'old', '📘 Ancienne grille', "evalGridSet('old')") +
    (typeof evcCanEdit === 'function' && evcCanEdit() ? chip(typeof evcOpen !== 'undefined' && evcOpen, '⚙️ Critères', 'evcToggle()') : '');
  const t = document.getElementById('eval-title'), st = document.getElementById('eval-sub');
  if (t) t.textContent = evalGrid === 'obs' ? '🎯 Évaluations — compétences observables U15' : '🎯 Évaluations — référentiel filière U15';
  if (st) st.textContent = evalGrid === 'obs' ? 'Note de 0 à 5 : le mot affiché te dit où se situe le joueur. 💡 = il sait quoi faire mais n\'y arrive pas encore. Puis « Valider ».' : 'Prérequis, accélérateurs et fil rouge défense Homme à Homme — note en un tap, puis « Valider ».';
}

const EVAL_DOMAIN_ORDER = ['Technique', 'Tactique', 'Physique / Motricité', 'Mental / Comportemental'];
const EVAL_DOMAIN_SHORT = { 'Technique': 'Tech.', 'Tactique': 'Tact.', 'Physique / Motricité': 'Phys.', 'Mental / Comportemental': 'Ment.' };
const EVAL_SCORE_COLOR = ['#C0392B', '#E67E22', '#F5C400', '#A8C93B', '#6FBF73', '#2ECC71'];

let evalRoster = [];       // [{code, name}]
let evalCurrentPlayer = null;
let evalScores = {};       // comp_code -> { mine: number|null, others: [{name, score}] }
let evalRosterLoaded = false;

async function evaluationsInit() {
  await evalObsLoad();
  if (typeof evcLoadEditors === 'function') evcLoadEditors();
  evaluationsRenderGridBar();
  if (!evalRosterLoaded) { await evaluationsLoadRoster(); evalRosterLoaded = true; }
  if (!evalCurrentPlayer && evalRoster.length) evalCurrentPlayer = evalRoster[0].code;
  evaluationsRenderPicker();
  if (evalCurrentPlayer) await evaluationsSelectPlayer(evalCurrentPlayer);
  else {
    document.getElementById('eval-items-list').innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);font-size:12px;">Aucun joueur avec un code réclamé.</div>';
    document.getElementById('eval-averages').innerHTML = '';
  }
}

async function evaluationsLoadRoster() {
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/players?select=code,name,numero&claimed_at=not.is.null&order=name', { headers: coachAuthHeaders() });
    evalRoster = res.ok ? await res.json() : [];
  } catch (e) { evalRoster = []; }
}

function evaluationsRenderPicker() {
  const wrap = document.getElementById('eval-player-picker');
  if (!wrap) return;
  if (!evalRoster.length) { wrap.innerHTML = '<div style="font-size:12px;color:var(--gris-texte);">Aucun joueur avec un code réclamé.</div>'; return; }
  wrap.innerHTML = evalRoster.map(p => {
    const active = p.code === evalCurrentPlayer, pend = evalDraftCount(p.code);
    return `<button type="button" onclick="evaluationsSelectPlayer('${p.code}')"
      style="flex:0 0 auto;padding:8px 14px;border-radius:20px;border:1px solid ${active ? 'var(--jaune)' : 'rgba(255,255,255,0.15)'};background:${active ? 'rgba(255,215,0,0.12)' : 'transparent'};color:${active ? 'var(--jaune)' : 'var(--gris-clair)'};font-weight:${active ? '800' : '400'};font-size:12.5px;white-space:nowrap;cursor:pointer;">${pend ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--jaune);margin-right:6px;"></span>' : ''}${escapeSvgText(p.name)}${p.numero ? ' <span style="font-size:0.9em;">#' + p.numero + '</span>' : ''}</button>`;
  }).join('');
}

async function evaluationsSelectPlayer(code) {
  evalCurrentPlayer = code;
  evaluationsRenderPicker();
  const listEl = document.getElementById('eval-items-list');
  if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  await evaluationsLoadScores(code);
  evaluationsRenderItems();
  evaluationsRenderAverages();
  evaluationsRenderDraft();
}

async function evaluationsLoadScores(code) {
  evalScores = {};
  try {
    await ensureCoachSession();
    const myId = coachSession ? coachSession.id : null;
    const res = await fetch(SB_URL + '/rest/v1/evaluations?player_code=eq.' + encodeURIComponent(code) + '&category=eq.' + EVAL_CATEGORY + '&select=comp_code,score,intention,coach_id,coaches(display_name)', {
      headers: coachAuthHeaders(),
    });
    const rows = res.ok ? await res.json() : [];
    rows.forEach(r => {
      if (!evalScores[r.comp_code]) evalScores[r.comp_code] = { mine: null, others: [] };
      if (r.coach_id === myId) { evalScores[r.comp_code].mine = r.score; evalScores[r.comp_code].int = !!r.intention; }
      else evalScores[r.comp_code].others.push({ name: (r.coaches && r.coaches.display_name) || '?', score: r.score });
    });
  } catch (e) {}
}

function evalEffInt(comp) { const d = evalDraftOf(evalCurrentPlayer)[comp]; if (d) return !!d.i; const r = evalScores[comp]; return !!(r && r.int); }
function evaluationsObsCard(it, num) {
  const rec = evalScores[it.code], dr = evalDraftOf(evalCurrentPlayer)[it.code], pending = !!dr;
  const cur = evalEff(it.code), intent = evalEffInt(it.code), others = rec ? rec.others : [];
  const colors = EVAL_SCORE_COLOR;
  const btns = colors.map((color, v) => { const active = cur === v;
    return '<button type="button" onclick="evaluationsSetScore(\'' + it.code + '\',' + v + ')" style="flex:1;min-width:0;padding:7px 0 5px;border-radius:9px;border:1px solid ' + (active ? '#fff' : 'rgba(255,255,255,0.12)') + ';background:' + color + ';opacity:' + (active || cur === null || cur === undefined ? '1' : '.45') + ';color:#0A1628;font-weight:900;font-size:15px;cursor:pointer;line-height:1.1;' + (active ? 'outline:2px solid #fff;' : '') + '">' + v + '<span style="display:block;font-size:7.5px;font-weight:700;margin-top:1px;">' + EVAL_OBS_SHORT[v] + '</span></button>';
  }).join('');
  const hasScore = cur !== null && cur !== undefined, ok = hasScore && cur >= evalSeuil();
  const band = hasScore ? EVAL_OBS_LEVELS[cur] + (EVAL_OBS_HINT[cur] ? ' · ' + EVAL_OBS_HINT[cur] : '') : 'Pas encore noté';
  return '<div style="background:var(--noir);border:1px ' + (pending ? 'dashed' : 'solid') + ' ' + (pending ? 'var(--jaune)' : 'rgba(255,255,255,0.08)') + ';border-left:4px solid ' + (!hasScore ? 'rgba(255,255,255,.2)' : colors[cur]) + ';border-radius:12px;padding:10px 12px;">' +
    '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;"><div style="font-size:13px;font-weight:800;color:var(--blanc);">' + (it.cle ? '<span style="color:var(--jaune);">★</span> ' : '') + (num ? num + '. ' : '') + escapeSvgText(it.comp) + '</div>' +
    (pending ? '<div style="font-size:9.5px;font-weight:800;color:var(--jaune);flex:0 0 auto;">EN ATTENTE</div>' : '') + '</div>' +
    '<div style="font-size:11px;color:var(--gris-texte);margin:3px 0 8px;line-height:1.4;">Comment le voir : ' + escapeSvgText(it.indicateur || '—') + '</div>' +
    '<div style="display:flex;gap:4px;">' + btns + '</div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;"><span style="font-size:11.5px;color:' + (ok ? '#2ecc71' : 'var(--gris-clair)') + ';">' + escapeSvgText(band) + '</span>' +
    '<button type="button" onclick="evaluationsSetIntention(\'' + it.code + '\')" ' + (hasScore ? '' : 'disabled ') + 'style="border-radius:99px;padding:4px 10px;font-size:11px;cursor:pointer;' + (intent ? 'background:var(--jaune);color:#1a1a1a;border:1px solid var(--jaune);font-weight:800;' : 'background:transparent;color:var(--gris-clair);border:1.5px dashed rgba(255,255,255,.4);') + (hasScore ? '' : 'opacity:.35;') + '">💡 Sait quoi faire</button></div>' +
    (others.length ? '<div style="font-size:9.5px;color:var(--gris-texte);margin-top:6px;">Autres coachs : ' + others.map(o => escapeSvgText(o.name) + ' ' + o.score).join(' · ') + '</div>' : '') + '</div>';
}
function evaluationsItemCard(it) {
  if (it.kind === 'obs') return evaluationsObsCard(it);
  const rec = evalScores[it.code];
  const dr = evalDraftOf(evalCurrentPlayer)[it.code], pending = !!dr;
  const current = pending ? dr.s : (rec ? rec.mine : null);
  const others = rec ? rec.others : [];
  const isHah = it.kind === 'hah';
  const btns = EVAL_SCORE_COLOR.map((color, v) => {
    const active = current === v;
    return `<button type="button" onclick="evaluationsSetScore('${it.code}',${v})"
      style="flex:1;min-width:0;padding:8px 0;border-radius:6px;border:1px solid ${active ? color : 'rgba(255,255,255,0.15)'};background:${active ? color : 'transparent'};color:${active ? '#0A1628' : 'var(--gris-clair)'};font-weight:${active ? '800' : '400'};font-size:13px;cursor:pointer;">${v}</button>`;
  }).join('');
  const scaleText = it.scale && current !== null && current !== undefined ? it.scale[current] : (it.indicateur || (it.scale ? it.scale[3] : ''));
  return `<div style="background:${isHah ? 'rgba(245,196,0,0.08)' : 'var(--noir)'};border:1px ${pending ? 'dashed' : 'solid'} ${pending || isHah ? 'var(--jaune)' : 'rgba(255,255,255,0.08)'};border-radius:10px;padding:10px 12px;">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:4px;">
      <div style="font-size:12.5px;font-weight:700;color:var(--blanc);">${escapeSvgText(it.comp)}</div>
      <div style="font-size:9.5px;font-weight:800;color:${pending ? 'var(--jaune)' : 'var(--gris-texte)'};flex:0 0 auto;">${pending ? 'EN ATTENTE · ' : ''}${it.code}</div>
    </div>
    <div style="font-size:10.5px;color:var(--gris-texte);margin-bottom:8px;line-height:1.35;">${escapeSvgText(scaleText)}</div>
    <div style="display:flex;gap:5px;">${btns}</div>
    ${others.length ? `<div style="font-size:9.5px;color:var(--gris-texte);margin-top:6px;">Autres coachs : ${others.map(o => escapeSvgText(o.name) + ' ' + o.score).join(' · ')}</div>` : ''}
  </div>`;
}

let evalOpenSection = 'filiere'; // 'filiere' | 'intrinseque' | null
function evaluationsToggleSection(section) {
  evalOpenSection = evalOpenSection === section ? null : section;
  evaluationsRenderItems();
  if (evalOpenSection === 'evolution') evaluationsEvoLoad();
}
function evaluationsRenderItems() {
  const wrap = document.getElementById('eval-items-list');
  if (!wrap) return;
  if (!evalCurrentPlayer) { wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);font-size:12px;">Choisis un joueur ci-dessus.</div>'; return; }

  if (evalGrid === 'obs') {
    if (!evalObsItems.length) { wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);font-size:12px;">Aucun critère actif (ou lecture impossible). Stephen peut en ajouter avec ⚙️ Critères.</div>'; return; }
    let n = 0, h = '';
    evalDomains().forEach((d, k) => {
      h += '<div style="font-size:10.5px;font-weight:800;color:' + EVAL_OBS_PALETTE[k % EVAL_OBS_PALETTE.length] + ';text-transform:uppercase;letter-spacing:0.5px;margin:' + (k ? '10px' : '0') + ' 0 4px;">' + escapeSvgText(d) + '</div><div style="display:flex;flex-direction:column;gap:8px;">' +
        evalObsItems.filter(i => i.domain === d).map(i => evaluationsObsCard(i, ++n)).join('') + '</div>';
    });
    h += '<button type="button" onclick="evaluationsToggleSection(\'evolution\')" style="margin-top:12px;width:100%;display:flex;align-items:center;justify-content:space-between;background:' + (evalOpenSection === 'evolution' ? 'rgba(93,173,226,.12)' : 'var(--noir)') + ';border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 12px;cursor:pointer;"><span style="font-size:13px;font-weight:800;color:var(--blanc);">📈 Évolution</span><span style="font-size:10.5px;color:var(--gris-texte);">graphique ' + (evalOpenSection === 'evolution' ? '▲' : '▼') + '</span></button>';
    if (evalOpenSection === 'evolution') h += '<div id="eval-evo" style="padding-top:8px;">' + evaluationsEvoHtml() + '</div>';
    wrap.innerHTML = h; return;
  }
  const filiereGroups = [
    { label: '🛡️ Fil rouge filière', items: EVAL_ITEMS.filter(i => i.kind === 'hah'), accent: 'var(--jaune)' },
    { label: 'Prérequis — Technique', items: EVAL_ITEMS.filter(i => i.domain === 'Technique'), accent: 'var(--bleu-light)' },
    { label: 'Prérequis — Tactique', items: EVAL_ITEMS.filter(i => i.domain === 'Tactique'), accent: 'var(--bleu-light)' },
    { label: 'Prérequis — Physique / Motricité', items: EVAL_ITEMS.filter(i => i.domain === 'Physique / Motricité'), accent: 'var(--vert)' },
    { label: 'Prérequis — Mental / Comportemental', items: EVAL_ITEMS.filter(i => i.domain === 'Mental / Comportemental'), accent: '#9b59b6' },
    { label: '★ Compétences accélératrices', items: EVAL_ITEMS.filter(i => i.kind === 'accel'), accent: 'var(--jaune)' },
  ];
  const intrinsicItems = EVAL_ITEMS.filter(i => i.kind === 'intrinsic');

  const sectionHeader = (key, label, accent, count) => {
    const open = evalOpenSection === key;
    return `<button type="button" onclick="evaluationsToggleSection('${key}')" style="width:100%;display:flex;align-items:center;justify-content:space-between;background:${open ? accent + '18' : 'var(--noir)'};border:1px solid ${open ? accent : 'rgba(255,255,255,0.1)'};border-radius:10px;padding:12px 14px;cursor:pointer;margin-top:10px;">
      <span style="font-size:13px;font-weight:800;color:${open ? accent : 'var(--blanc)'};">${label}</span>
      <span style="font-size:10.5px;color:var(--gris-texte);">${typeof count === 'number' ? count + ' item' + (count > 1 ? 's' : '') : count} ${open ? '▲' : '▼'}</span>
    </button>`;
  };

  let html = sectionHeader('filiere', '📘 Profil filière', 'var(--jaune)', filiereGroups.reduce((n, g) => n + g.items.length, 0));
  if (evalOpenSection === 'filiere') {
    html += `<div style="padding-top:8px;">` + filiereGroups.filter(g => g.items.length).map((g, gi) => `
      <div style="font-size:10.5px;font-weight:800;color:${g.accent};text-transform:uppercase;letter-spacing:0.5px;margin:${gi === 0 ? '0' : '8px'} 0 2px;">${g.label}</div>
      ${g.items.map(it => evaluationsItemCard(it)).join('')}
    `).join('') + `</div>`;
  }
  html += sectionHeader('intrinseque', '🧬 Intrinsèque', '#16a085', intrinsicItems.length);
  if (evalOpenSection === 'intrinseque') {
    html += `<div style="padding-top:8px;">${intrinsicItems.map(it => evaluationsItemCard(it)).join('')}</div>`;
  }
  html += sectionHeader('evolution', '📈 Évolution', 'var(--bleu-light)', 'graphique');
  if (evalOpenSection === 'evolution') html += '<div id="eval-evo" style="padding-top:8px;">' + evaluationsEvoHtml() + '</div>';
  wrap.innerHTML = html;
}

// ---------- z62 — Évolution d'un joueur : graphique + tableau, à partir du journal `evaluation_history` ----------
// Chaque changement de note (quel que soit le critère) est enregistré côté base par un déclencheur. Ici on rejoue ce journal.
let evalHist = {};                       // code joueur -> lignes du journal (ordre chronologique)
let evalEvo = { who: 'moi', crit: '', hide: {} };   // moi | tous ; critère unique ('' = domaines) ; séries masquées
const EVAL_EVO_SERIES = [
  { k: 'Technique', lab: 'Tech.', col: 'var(--bleu-light)' }, { k: 'Tactique', lab: 'Tact.', col: 'var(--rouge-light)' },
  { k: 'Physique / Motricité', lab: 'Phys.', col: 'var(--vert)' }, { k: 'Mental / Comportemental', lab: 'Ment.', col: '#9b59b6' },
  { k: 'Qualités intrinsèques', lab: 'Intr.', col: '#16a085' }, { k: 'GEN', lab: 'Général', col: 'var(--jaune)' },
];
async function evaluationsEvoLoad() {
  const code = evalCurrentPlayer; if (!code) return;
  const box = document.getElementById('eval-evo');
  if (!evalHist[code]) {
    if (box) box.innerHTML = '<div style="text-align:center;padding:16px;color:var(--gris-texte);font-size:12px;">Chargement de l\'historique…</div>';
    try {
      await ensureCoachSession();
      const res = await fetch(SB_URL + '/rest/v1/evaluation_history?player_code=eq.' + encodeURIComponent(code) + '&select=comp_code,score,coach_id,changed_at&order=changed_at.asc&limit=1000', { headers: coachAuthHeaders() });
      evalHist[code] = res.ok ? await res.json() : null;
    } catch (e) { evalHist[code] = null; }
  }
  const b2 = document.getElementById('eval-evo'); if (b2) b2.innerHTML = evaluationsEvoHtml();
}
function evaluationsEvoSet(k, v) { if (k === 'hide') evalEvo.hide[v] = !evalEvo.hide[v]; else evalEvo[k] = v; const b = document.getElementById('eval-evo'); if (b) b.innerHTML = evaluationsEvoHtml(); }
// Rejoue le journal : une « photo » par jour (dernière note de chaque critère à la fin de la journée), puis les moyennes.
function evaluationsEvoModel(rows) {
  const myId = coachSession ? coachSession.id : null, who = evalEvo.who;
  const evs = rows.filter(r => who === 'tous' || r.coach_id === myId);
  const byDay = {};
  evs.forEach(r => { const d = dateStr(new Date(r.changed_at)); (byDay[d] = byDay[d] || []).push(r); });
  const days = Object.keys(byDay).sort();
  const state = {};   // comp_code -> { coach_id -> score|null }
  const val = (c) => { const m = state[c]; if (!m) return null; const v = Object.keys(m).map(k => m[k]).filter(x => x !== null && x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const avg = (codes) => { const v = codes.map(val).filter(x => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const out = [];
  days.forEach(d => {
    const changes = [];
    byDay[d].forEach(r => {
      const prev = val(r.comp_code);
      (state[r.comp_code] = state[r.comp_code] || {})[r.coach_id] = r.score;
      const nv = val(r.comp_code);
      const same = changes.filter(x => x.c === r.comp_code)[0];   // plusieurs retouches du même critère le même jour : on garde « avant → après »
      if (same) same.to = nv; else changes.push({ c: r.comp_code, from: prev, to: nv });
    });
    const pt = { d, t: new Date(d + 'T12:00:00').getTime(), changes: changes.filter(x => x.from !== x.to), v: {} };
    evalSeries().forEach(se => { pt.v[se.k] = se.k === 'GEN' ? avg(evalItems().filter(i => evalGrid === 'obs' || i.kind === 'prereq').map(i => i.code)) : avg(evalItems().filter(i => i.domain === se.k).map(i => i.code)); });
    evalItems().forEach(i => { pt.v['c:' + i.code] = val(i.code); });
    out.push(pt);
  });
  return out;
}
function evaluationsEvoHtml() {
  const code = evalCurrentPlayer, rows = evalHist[code];
  if (rows === null) return '<div style="font-size:12px;color:#e74c3c;padding:10px;">Impossible de lire l\'historique (connexion ?).</div>';
  if (!rows) return '';
  const pts = evaluationsEvoModel(rows), crit = evalEvo.crit;
  const chip = (on, label, fn, col) => '<button type="button" onclick="' + fn + '" style="padding:5px 10px;border-radius:14px;border:1px solid ' + (on ? (col || 'var(--jaune)') : 'rgba(255,255,255,.15)') + ';background:' + (on ? 'rgba(255,255,255,.08)' : 'transparent') + ';color:' + (on ? 'var(--blanc)' : 'var(--gris-texte)') + ';font-size:11px;font-weight:700;cursor:pointer;">' + label + '</button>';
  let h = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;">' +
    chip(evalEvo.who === 'moi', 'Mes notes', "evaluationsEvoSet('who','moi')") + chip(evalEvo.who === 'tous', 'Tous les coachs', "evaluationsEvoSet('who','tous')") +
    '<select onchange="evaluationsEvoSet(\'crit\',this.value)" style="background:var(--noir);color:var(--blanc);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:5px 6px;font-size:11px;max-width:55%;"><option value="">Par domaine</option>' +
    evalItems().map(i => '<option value="' + i.code + '"' + (crit === i.code ? ' selected' : '') + '>' + escapeSvgText(i.code + ' — ' + i.comp).slice(0, 60) + '</option>').join('') + '</select></div>';
  if (!pts.length) return h + '<div style="font-size:12px;color:var(--gris-texte);padding:12px 4px;line-height:1.5;">Aucune note enregistrée pour ce joueur' + (evalEvo.who === 'moi' ? ' par toi (essaie « Tous les coachs »)' : '') + '. Chaque nouvelle note ou modification sera ajoutée au graphique.</div>';
  const series = crit ? [{ k: 'c:' + crit, lab: crit, col: 'var(--jaune)' }] : evalSeries();
  if (!crit) h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">' + series.map(se => chip(!evalEvo.hide[se.k], '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + se.col + ';margin-right:4px;"></span>' + se.lab, "evaluationsEvoSet('hide','" + se.k + "')", se.col)).join('') + '</div>';
  const W = 620, H = 250, L = 26, R = 12, T = 12, B = 26, t0 = pts[0].t, t1 = pts[pts.length - 1].t, span = Math.max(t1 - t0, 86400000 * 7);
  const X = t => L + (pts.length === 1 ? (W - L - R) / 2 : (t - t0) / span * (W - L - R)), Y = v => T + (5 - v) / 5 * (H - T - B);
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;display:block;background:var(--noir);border-radius:10px;">';
  for (let g = 0; g <= 5; g++) svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" style="stroke:rgba(255,255,255,.08)"/><text x="' + (L - 6) + '" y="' + (Y(g) + 3) + '" text-anchor="end" font-size="10" style="fill:var(--gris-texte)">' + g + '</text>';
  const nl = Math.min(5, pts.length), fmt = t => { const d = new Date(t); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); };
  for (let i = 0; i < nl; i++) { const t = nl === 1 ? t0 : t0 + span * i / (nl - 1); svg += '<text x="' + (pts.length === 1 ? X(t0) : (i === 0 ? L : (i === nl - 1 ? W - R : X(t)))) + '" y="' + (H - 8) + '" text-anchor="' + (nl > 1 && i === nl - 1 ? 'end' : (nl > 1 && i === 0 ? 'start' : 'middle')) + '" font-size="10" style="fill:var(--gris-texte)">' + fmt(t) + '</text>'; }
  series.filter(se => !evalEvo.hide[se.k]).forEach(se => {
    const wide = se.k === 'GEN' || crit; let seg = [];
    const flush = () => { if (seg.length > 1) svg += '<polyline points="' + seg.join(' ') + '" fill="none" style="stroke:' + se.col + '" stroke-width="' + (wide ? 3 : 2) + '" stroke-linejoin="round"/>'; seg = []; };
    pts.forEach(pt => { const v = pt.v[se.k]; if (v === null || v === undefined) { flush(); return; } seg.push(X(pt.t).toFixed(1) + ',' + Y(v).toFixed(1)); });
    flush();
    pts.forEach(pt => { const v = pt.v[se.k]; if (v === null || v === undefined) return; svg += '<circle cx="' + X(pt.t).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="' + (wide ? 4 : 3) + '" style="fill:' + se.col + '"><title>' + se.lab + ' · ' + fmt(pt.t) + ' : ' + v.toFixed(1) + '</title></circle>'; });
  });
  h += svg + '</svg>';
  // tableau : une ligne par jour de saisie (le plus récent en haut)
  const cols = crit ? [{ k: 'c:' + crit, lab: crit }] : evalSeries();
  const cell = v => v === null || v === undefined ? '<span style="color:var(--gris-texte)">—</span>' : v.toFixed(1);
  h += '<div style="overflow-x:auto;margin-top:10px;"><table style="width:100%;border-collapse:collapse;font-size:11px;"><tr style="color:var(--gris-texte);text-align:center;"><th style="text-align:left;padding:4px;">Date</th>' + cols.map(c => '<th style="padding:4px;">' + c.lab + '</th>').join('') + '<th style="text-align:left;padding:4px;">Changements</th></tr>' +
    pts.slice().reverse().map(pt => '<tr style="border-top:1px solid rgba(255,255,255,.08);text-align:center;"><td style="text-align:left;padding:5px 4px;white-space:nowrap;">' + fmt(pt.t) + '</td>' + cols.map(c => '<td style="padding:5px 4px;">' + cell(pt.v[c.k]) + '</td>').join('') +
      '<td style="text-align:left;padding:5px 4px;color:var(--gris-clair);">' + pt.changes.filter(c => !crit || c.c === crit).map(c => c.c + ' ' + (c.from === null ? '·' : c.from.toFixed(c.from % 1 ? 1 : 0)) + '→' + (c.to === null ? 'effacée' : c.to.toFixed(c.to % 1 ? 1 : 0))).join(' · ') + '</td></tr>').join('') + '</table></div>' +
    '<div style="font-size:10px;color:var(--gris-texte);margin-top:6px;line-height:1.4;">Chaque point = la dernière note de chaque critère à la fin de la journée, moyennée par domaine. « Général » = moyenne des 5 prérequis. Les notes d\'avant le 18/11 n\'ont qu\'une date (la dernière modification) : l\'historique détaillé se construit à partir de maintenant.</div>';
  return h;
}

function evaluationsObsSummary(wrap) {
  const items = evalObsItems, seuil = evalSeuil(), pctMin = evalSeuilPct();
  wrap.style.display = 'block';
  const eff = i => evalEff(i.code), has = i => { const v = eff(i); return v !== null && v !== undefined; };
  const avgOf = list => { const v = list.filter(has).map(eff); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const doms = evalDomains();
  const cells = doms.map((d, k) => { const a = avgOf(items.filter(i => i.domain === d)); return '<div style="background:var(--noir);border-radius:8px;padding:8px 2px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:900;color:' + (a === null ? 'var(--gris-texte)' : EVAL_OBS_PALETTE[k % EVAL_OBS_PALETTE.length]) + ';">' + (a === null ? '—' : a.toFixed(1)) + '</div><div style="font-size:8.5px;color:var(--gris-texte);text-transform:uppercase;">' + escapeSvgText(d.slice(0, 7)) + '</div></div>'; });
  const g = avgOf(items); cells.push('<div style="background:var(--jaune);border-radius:8px;padding:8px 2px;text-align:center;"><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:900;color:#1a1a1a;">' + (g === null ? '—' : g.toFixed(1)) + '</div><div style="font-size:8.5px;color:#1a1a1a;text-transform:uppercase;font-weight:800;">Général</div></div>');
  const num = {}; items.forEach((i, k) => { num[i.code] = k + 1; });
  const cles = items.filter(i => i.cle), clesLow = cles.filter(i => !has(i) || eff(i) < seuil), clesZero = cles.filter(i => has(i) && eff(i) === 0);
  const att = items.filter(i => i.domain === 'Attitude'), attOk = att.every(i => has(i) && eff(i) >= seuil);
  const noted = items.filter(has).length, met = items.filter(i => has(i) && eff(i) >= seuil).length;
  const pct = items.length ? Math.round(met / items.length * 100) : 0;
  const passerelleOk = noted > 0 && !clesLow.length && attOk, passageOk = noted > 0 && pct >= pctMin && !clesZero.length;
  const box = (ok, title, line) => '<div style="flex:1;border-radius:10px;padding:8px;text-align:center;background:' + (noted === 0 ? 'rgba(255,255,255,.06)' : ok ? 'rgba(46,204,113,.2)' : 'rgba(230,126,34,.2)') + ';border:1px solid ' + (noted === 0 ? 'rgba(255,255,255,.1)' : ok ? '#2ecc71' : '#e67e22') + ';"><div style="font-size:12px;font-weight:800;color:var(--blanc);">' + title + '</div><div style="font-size:10.5px;color:var(--gris-clair);margin-top:2px;line-height:1.35;">' + line + '</div></div>';
  const lowTxt = clesLow.length ? clesLow.length + ' ★ sous ' + seuil + ' (n° ' + clesLow.slice(0, 6).map(i => num[i.code]).join(', ') + (clesLow.length > 6 ? '…' : '') + ')' : 'tous les ★ à ' + seuil + '+';
  const intents = items.filter(i => has(i) && eff(i) < seuil && evalEffInt(i.code)).length;
  wrap.innerHTML = '<div style="display:grid;grid-template-columns:repeat(' + cells.length + ',1fr);gap:6px;margin-bottom:8px;">' + cells.join('') + '</div>' +
    '<div style="display:flex;gap:8px;">' + box(passerelleOk, 'Passerelle : ' + (noted === 0 ? '—' : passerelleOk ? 'ouverte' : 'pas encore'), noted === 0 ? 'rien de noté' : lowTxt + (att.length ? (attOk ? ' · attitude ✓' : ' · attitude à valider') : '')) +
    box(passageOk, 'Passage : ' + (noted === 0 ? '—' : pct + ' %'), noted === 0 ? 'objectif ' + pctMin + ' %' : 'objectif ' + pctMin + ' %' + (clesZero.length ? ' · ★ à zéro : ' + clesZero.length : '')) + '</div>' +
    (intents ? '<div style="font-size:11px;color:var(--jaune);margin-top:6px;">💡 ' + intents + ' critère' + (intents > 1 ? 's' : '') + ' sous le seuil avec la bonne intention : le joueur sait quoi faire, il manque les moyens.</div>' : '') +
    '<div style="font-size:10px;color:var(--gris-texte);margin-top:6px;">Seuil ' + seuil + '/5 · passerelle = tous les ★ + attitude · passage = ' + pctMin + ' % des critères, aucun ★ à zéro. Notes non validées incluses.</div>';
}
function evaluationsRenderAverages() {
  const wrap = document.getElementById('eval-averages');
  if (!wrap) return;
  if (!evalCurrentPlayer) { wrap.innerHTML = ''; return; }
  if (evalGrid === 'obs') { evaluationsObsSummary(wrap); return; }
  wrap.style.display = 'grid';
  const avgFor = (codes) => {
    const vals = codes.map(c => evalEff(c)).filter(v => v !== null && v !== undefined);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const cells = EVAL_DOMAIN_ORDER.map(d => {
    const codes = EVAL_ITEMS.filter(i => i.domain === d).map(i => i.code);
    const a = avgFor(codes);
    return `<div style="background:var(--noir);border-radius:8px;padding:8px 4px;text-align:center;">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900;color:${a === null ? 'var(--gris-texte)' : 'var(--jaune)'};">${a === null ? '—' : a.toFixed(1)}</div>
      <div style="font-size:8.5px;color:var(--gris-texte);text-transform:uppercase;">${EVAL_DOMAIN_SHORT[d]}</div>
    </div>`;
  });
  const overall = avgFor(EVAL_ITEMS.filter(i => i.kind === 'prereq').map(i => i.code));
  cells.push(`<div style="background:var(--jaune);border-radius:8px;padding:8px 4px;text-align:center;">
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900;color:#1a1a1a;">${overall === null ? '—' : overall.toFixed(1)}</div>
    <div style="font-size:8.5px;color:#1a1a1a;text-transform:uppercase;font-weight:800;">Général</div>
  </div>`);
  const intrinsicAvg = avgFor(EVAL_ITEMS.filter(i => i.kind === 'intrinsic').map(i => i.code));
  cells.push(`<div style="background:var(--noir);border:1px solid #16a085;border-radius:8px;padding:8px 4px;text-align:center;">
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900;color:${intrinsicAvg === null ? 'var(--gris-texte)' : '#16a085'};">${intrinsicAvg === null ? '—' : intrinsicAvg.toFixed(1)}</div>
    <div style="font-size:8.5px;color:#16a085;text-transform:uppercase;">Intr.</div>
  </div>`);
  wrap.innerHTML = cells.join('');
}

// ---------- z63 — Notes en attente : rien n'est enregistré au tap, tout passe par « Valider » ----------
// Les modifications non validées sont gardées sur CET appareil (localStorage, une clé par coach) et survivent au changement d'onglet / de joueur / à la fermeture.
let evalDrafts = null;   // { codeJoueur: { codeCritère: { s: note|null, at: horodatage } } }
function evalDraftKey() { return coachSession && coachSession.id ? 'evalDrafts_' + coachSession.id : null; }
function evalDraftLoad() {
  if (evalDrafts) return evalDrafts;
  evalDrafts = {};
  try { const k = evalDraftKey(); const raw = k ? localStorage.getItem(k) : null; if (raw) evalDrafts = JSON.parse(raw) || {}; } catch (e) { evalDrafts = {}; }
  return evalDrafts;
}
function evalDraftSave() { try { const k = evalDraftKey(); if (k) localStorage.setItem(k, JSON.stringify(evalDrafts || {})); } catch (e) {} }
function evalDraftOf(code) { return (code && evalDraftLoad()[code]) || {}; }
function evalDraftCount(code) { return Object.keys(evalDraftOf(code)).length; }
function evalDraftPlayers() { const d = evalDraftLoad(); return Object.keys(d).filter(c => Object.keys(d[c] || {}).length); }
function evalEff(comp) { const d = evalDraftOf(evalCurrentPlayer)[comp]; if (d) return d.s; const r = evalScores[comp]; return r ? r.mine : null; }
function evalPlayerName(code) { const p = evalRoster.filter(x => x.code === code)[0]; return p ? p.name : code; }
function evaluationsDraftBadge() {
  const n = evalDraftPlayers().reduce((t, c) => t + evalDraftCount(c), 0), dot = document.getElementById('eval-tab-dot');
  if (dot) { dot.style.display = n ? 'block' : 'none'; dot.textContent = n ? String(n) : ''; }
}
function evaluationsRenderDraft() {
  evaluationsDraftBadge();
  const top = document.getElementById('eval-draftbanner'), bar = document.getElementById('eval-draftbar');
  const pl = evalDraftPlayers();
  if (top) top.innerHTML = pl.length ? '<div style="background:rgba(245,196,0,.12);border:1px solid var(--jaune);border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:12px;color:var(--blanc);">' +
    '<div style="font-weight:800;color:var(--jaune);margin-bottom:4px;">⚠️ Modifications pas encore validées</div>' +
    pl.map(c => '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;"><span style="flex:1;">' + escapeSvgText(evalPlayerName(c)) + ' — ' + evalDraftCount(c) + ' note' + (evalDraftCount(c) > 1 ? 's' : '') + '</span>' +
      '<button type="button" onclick="evaluationsSelectPlayer(\'' + c + '\')" style="padding:4px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:transparent;color:var(--gris-clair);font-size:11px;cursor:pointer;">Voir</button>' +
      '<button type="button" onclick="evaluationsDraftValidate(\'' + c + '\')" style="padding:4px 9px;border-radius:8px;border:none;background:var(--jaune);color:var(--c-onacc,#1a1a1a);font-weight:800;font-size:11px;cursor:pointer;">✓ Valider</button></div>').join('') + '</div>' : '';
  const n = evalDraftCount(evalCurrentPlayer);
  if (bar) bar.innerHTML = n ? '<div style="display:flex;align-items:center;gap:8px;background:var(--gris-fonce);border:1px solid var(--jaune);border-radius:12px;padding:8px 10px;box-shadow:0 4px 14px rgba(0,0,0,.5);">' +
    '<span style="flex:1;font-size:12px;color:var(--blanc);"><b>' + n + '</b> modification' + (n > 1 ? 's' : '') + ' non validée' + (n > 1 ? 's' : '') + ' pour <b>' + escapeSvgText(evalPlayerName(evalCurrentPlayer)) + '</b></span>' +
    '<button type="button" onclick="evaluationsDraftCancel(\'' + evalCurrentPlayer + '\')" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:transparent;color:var(--gris-clair);font-size:12px;cursor:pointer;">Annuler</button>' +
    '<button type="button" onclick="evaluationsDraftValidate(\'' + evalCurrentPlayer + '\')" style="padding:8px 12px;border-radius:8px;border:none;background:var(--jaune);color:var(--c-onacc,#1a1a1a);font-weight:800;font-size:13px;cursor:pointer;">✓ Valider</button></div>' : '';
  evaluationsRenderPicker();
}
function evaluationsSetScore(compCode, score) {
  if (!evalCurrentPlayer) return;
  const item = evalFindItem(compCode);
  if (!item) return;
  const rec = evalScores[compCode], saved = rec && rec.mine !== undefined ? rec.mine : null;
  const cur = evalEff(compCode);
  const next = cur === score ? null : score;     // retaper la même note l'efface (comme avant)
  const dr = evalDraftLoad();
  const savedInt = !!(rec && rec.int), nextInt = next === null ? false : evalEffInt(compCode);   // z90 : la case 💡 suit la note
  if (next === saved && nextInt === savedInt) { if (dr[evalCurrentPlayer]) { delete dr[evalCurrentPlayer][compCode]; if (!Object.keys(dr[evalCurrentPlayer]).length) delete dr[evalCurrentPlayer]; } }   // retour à la valeur enregistrée : plus rien en attente
  else { (dr[evalCurrentPlayer] = dr[evalCurrentPlayer] || {})[compCode] = { s: next, i: nextInt, at: Date.now() }; }
  evalDraftSave();
  evaluationsRenderItems();
  evaluationsRenderAverages();
  evaluationsRenderDraft();
  const msgEl = document.getElementById('eval-save-msg');
  if (msgEl) { msgEl.style.color = 'var(--jaune)'; msgEl.textContent = 'Modification en attente — pense à valider.'; }
}
function evaluationsSetIntention(compCode) {   // z90 : case 💡 « sait quoi faire » (n'a de sens que sur un critère noté)
  if (!evalCurrentPlayer) return;
  const cur = evalEff(compCode); if (cur === null || cur === undefined) return;
  const rec = evalScores[compCode], saved = rec && rec.mine !== undefined ? rec.mine : null, savedInt = !!(rec && rec.int);
  const nextInt = !evalEffInt(compCode), dr = evalDraftLoad();
  if (cur === saved && nextInt === savedInt) { if (dr[evalCurrentPlayer]) { delete dr[evalCurrentPlayer][compCode]; if (!Object.keys(dr[evalCurrentPlayer]).length) delete dr[evalCurrentPlayer]; } }
  else { (dr[evalCurrentPlayer] = dr[evalCurrentPlayer] || {})[compCode] = { s: cur, i: nextInt, at: Date.now() }; }
  evalDraftSave(); evaluationsRenderItems(); evaluationsRenderAverages(); evaluationsRenderDraft();
  const msgEl = document.getElementById('eval-save-msg');
  if (msgEl) { msgEl.style.color = 'var(--jaune)'; msgEl.textContent = 'Modification en attente — pense à valider.'; }
}
function evaluationsDraftCancel(code) {
  const n = evalDraftCount(code); if (!n) return;
  if (!confirm('Annuler les ' + n + ' modification' + (n > 1 ? 's' : '') + ' non validée' + (n > 1 ? 's' : '') + ' de ' + evalPlayerName(code) + ' ?')) return;
  delete evalDraftLoad()[code]; evalDraftSave();
  if (code === evalCurrentPlayer) { evaluationsRenderItems(); evaluationsRenderAverages(); }
  evaluationsRenderDraft();
}
async function evaluationsDraftValidate(code) {
  const mine = evalDraftOf(code), comps = Object.keys(mine); if (!comps.length) return;
  const msgEl = document.getElementById('eval-save-msg');
  if (msgEl) { msgEl.style.color = 'var(--gris-texte)'; msgEl.textContent = 'Validation…'; }
  try {
    await ensureCoachSession();
    const myId = coachSession ? coachSession.id : null, now = new Date().toISOString();
    const up = comps.filter(c => mine[c].s !== null).map(c => { const it = evalFindItem(c); return { player_code: code, category: EVAL_CATEGORY, domain: it ? it.domain : null, comp_code: c, axe: it ? it.comp : c, score: mine[c].s, intention: !!mine[c].i, coach_id: myId, updated_at: now }; });
    const del = comps.filter(c => mine[c].s === null);
    if (up.length) {
      const res = await fetch(SB_URL + '/rest/v1/evaluations?on_conflict=player_code,comp_code,coach_id', { method: 'POST', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(up) });
      if (!res.ok) throw new Error('save failed');
    }
    if (del.length) {
      const res2 = await fetch(SB_URL + '/rest/v1/evaluations?player_code=eq.' + encodeURIComponent(code) + '&coach_id=eq.' + encodeURIComponent(myId || '') + '&comp_code=in.(' + del.map(encodeURIComponent).join(',') + ')', { method: 'DELETE', headers: coachAuthHeaders() });
      if (!res2.ok) throw new Error('delete failed');
    }
    comps.forEach(c => { if (code === evalCurrentPlayer) { const r = evalScores[c] || (evalScores[c] = { mine: null, others: [] }); r.mine = mine[c].s; r.int = !!mine[c].i; } });
    delete evalDraftLoad()[code]; evalDraftSave(); delete evalHist[code];
    if (code === evalCurrentPlayer) { evaluationsRenderItems(); evaluationsRenderAverages(); if (evalOpenSection === 'evolution') evaluationsEvoLoad(); }
    evaluationsRenderDraft();
    if (msgEl) { msgEl.style.color = '#2ecc71'; msgEl.textContent = comps.length + ' note' + (comps.length > 1 ? 's' : '') + ' validée' + (comps.length > 1 ? 's' : '') + ' ✓'; setTimeout(() => { if (/validée/.test(msgEl.textContent)) msgEl.textContent = ''; }, 2500); }
  } catch (e) {
    if (msgEl) { msgEl.style.color = '#e74c3c'; msgEl.textContent = "Validation impossible — tes modifications sont gardées, vérifie ta connexion et réessaie."; }
  }
}
// au démarrage : pastille sur l'onglet Évals s'il reste des notes en attente (la session coach peut arriver un peu plus tard)
setTimeout(evaluationsDraftBadge, 1200);

const COACH_TOTAL_SESSIONS = 12;
let coachPlayers = [];
let coachDiffCounts = { facile: 0, correct: 0, dur: 0 };

function updateCoachTabVisibility() {
  const tab = document.getElementById('tab-coach');
  if (!tab) return;
  if (appState.playerCode === 'COACHTEST') {
    tab.style.display = 'inline-block';
  } else {
    tab.style.display = 'none';
    // If somehow on the coach panel while not COACHTEST, bounce back to planning
    const panel = document.getElementById('panel-coach');
    if (panel && panel.classList.contains('active')) switchTab('planning');
  }
}

async function loadCoachData() {
  const wrap = document.getElementById('coach-table-wrap');
  wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gris-texte);">Chargement...</div>';
  try {
    await ensureCoachSession();
    const [pRes, cRes] = await Promise.all([
      fetch(SB_URL + '/rest/v1/players?select=code,name,claimed_at,device_token,role&order=name', { headers: coachAuthHeaders() }),
      fetch(SB_URL + '/rest/v1/completions?select=player_code,session_id,completed_at,difficulty', { headers: coachAuthHeaders() }),
    ]);
    const players = await pRes.json();
    const completions = await cRes.json();

    const doneByCode = {};
    const lastByCode = {};
    const sessionsByCode = {};
    const diffCounts = { facile: 0, correct: 0, dur: 0 };
    completions.forEach(c => {
      doneByCode[c.player_code] = (doneByCode[c.player_code] || 0) + 1;
      if (!lastByCode[c.player_code] || c.completed_at > lastByCode[c.player_code]) lastByCode[c.player_code] = c.completed_at;
      (sessionsByCode[c.player_code] = sessionsByCode[c.player_code] || []).push({ id: c.session_id, difficulty: c.difficulty });
      if (c.difficulty && diffCounts.hasOwnProperty(c.difficulty)) diffCounts[c.difficulty]++;
    });

    coachPlayers = players.filter(p => p.code !== 'COACHTEST').map(p => ({
      code: p.code,
      name: p.name,
      claimed: !!p.claimed_at,
      role: p.role || 'joueur',
      done: doneByCode[p.code] || 0,
      lastActivity: lastByCode[p.code] || null,
      sessions: sessionsByCode[p.code] || [],
    }));
    coachDiffCounts = diffCounts;

    renderCoachCards();
    renderCoachTable();
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gris-texte);">Erreur de chargement — vérifie ta connexion.</div>';
  }
}

function renderCoachCards() {
  const claimed = coachPlayers.filter(p => p.claimed);
  const totalDone = coachPlayers.reduce((s, p) => s + p.done, 0);
  const avgPct = claimed.length ? Math.round(claimed.reduce((s, p) => s + p.done / COACH_TOTAL_SESSIONS, 0) / claimed.length * 100) : 0;
  const notStarted = claimed.filter(p => p.done === 0).length;
  const gbCount = claimed.filter(p => p.role === 'gb').length;

  document.getElementById('coach-cards').innerHTML = `
    <div style="background:var(--gris-fonce);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:26px;font-weight:800;color:var(--jaune);">${claimed.length}/${coachPlayers.length}</div><div style="font-size:11px;color:var(--gris-texte);margin-top:4px;text-transform:uppercase;">Codes réclamés</div></div>
    <div style="background:var(--gris-fonce);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:26px;font-weight:800;color:var(--jaune);">${totalDone}</div><div style="font-size:11px;color:var(--gris-texte);margin-top:4px;text-transform:uppercase;">Séances complétées</div></div>
    <div style="background:var(--gris-fonce);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:26px;font-weight:800;color:var(--jaune);">${avgPct}%</div><div style="font-size:11px;color:var(--gris-texte);margin-top:4px;text-transform:uppercase;">Progression moyenne</div></div>
    <div style="background:var(--gris-fonce);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:26px;font-weight:800;color:var(--jaune);">${notStarted}</div><div style="font-size:11px;color:var(--gris-texte);margin-top:4px;text-transform:uppercase;">Inscrits sans séance</div></div>
    <div style="background:var(--gris-fonce);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:26px;font-weight:800;color:#5dade2;">${gbCount}</div><div style="font-size:11px;color:var(--gris-texte);margin-top:4px;text-transform:uppercase;">Gardiens</div></div>
    <div style="background:var(--gris-fonce);border-radius:10px;padding:14px;text-align:center;grid-column:1/-1;">
      <div style="font-size:11px;color:var(--gris-texte);margin-bottom:8px;text-transform:uppercase;">Ressenti des séances notées</div>
      <div style="display:flex;justify-content:center;gap:22px;font-size:14px;font-weight:700;color:var(--gris-clair);">
        <span>😊 ${coachDiffCounts.facile}</span>
        <span>😐 ${coachDiffCounts.correct}</span>
        <span>🥵 ${coachDiffCounts.dur}</span>
      </div>
    </div>
  `;
}

function renderCoachTable() {
  const q = (document.getElementById('coach-search').value || '').toLowerCase();
  const filtered = coachPlayers.filter(p =>
    (p.name || '').toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
  ).sort((a, b) => (b.claimed - a.claimed) || (b.done - a.done));

  const ALL_SESSIONS = ['S1-A','S1-B','S1-C','S2-A','S2-B','S2-C','S3-A','S3-B','S3-C','S4-A','S4-B','S4-C'];

  const rows = filtered.map((p, i) => {
    const pct = Math.round(p.done / COACH_TOTAL_SESSIONS * 100);
    const lastAct = p.lastActivity ? new Date(p.lastActivity).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';
    const rowId = 'coach-detail-' + i;
    const DIFF_EMOJI = { facile: '😊', correct: '😐', dur: '🥵' };
    const badges = ALL_SESSIONS.map(sid => {
      const rec = p.sessions.find(s => s.id === sid);
      const done = !!rec;
      const emoji = done && rec.difficulty ? ' ' + DIFF_EMOJI[rec.difficulty] : '';
      return `<span style="display:inline-block;padding:4px 9px;margin:2px;border-radius:6px;font-size:11px;font-weight:700;font-family:monospace;${done ? 'background:rgba(46,204,113,0.15);color:#2ecc71;' : 'background:rgba(255,255,255,0.05);color:var(--gris-texte);'}">${done ? '✓ ' : ''}${sid}${emoji}</span>`;
    }).join('');
    return `<tr onclick="toggleCoachDetail('${rowId}')" style="cursor:pointer;">
      <td style="padding:10px 6px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:700;color:var(--blanc);">${p.name || '<em style="color:#8a97ad;font-weight:400;">Non réclamé</em>'}${p.role === 'gb' ? ' <span style="display:inline-block;padding:1px 6px;margin-left:4px;border-radius:10px;font-size:9px;font-weight:800;background:rgba(52,152,219,0.18);color:#5dade2;vertical-align:middle;">GB</span>' : ''}</td>
      <td style="padding:10px 6px;border-bottom:1px solid rgba(255,255,255,0.05);font-family:monospace;color:var(--gris-texte);font-size:11px;">${p.code}</td>
      <td style="padding:10px 6px;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;${p.claimed ? 'background:rgba(46,204,113,0.15);color:#2ecc71;' : 'background:rgba(255,255,255,0.08);color:var(--gris-texte);'}">${p.claimed ? 'Verrouillé' : 'Libre'}</span></td>
      <td style="padding:10px 6px;border-bottom:1px solid rgba(255,255,255,0.05);min-width:110px;">
        <div style="background:rgba(255,255,255,0.08);border-radius:20px;height:6px;width:100%;overflow:hidden;"><div style="background:linear-gradient(90deg,var(--bleu),var(--jaune));height:100%;width:${pct}%;"></div></div>
        <div style="font-size:11px;color:var(--gris-texte);margin-top:3px;">${p.done}/${COACH_TOTAL_SESSIONS} · ${pct}%</div>
      </td>
      <td style="padding:10px 6px;border-bottom:1px solid rgba(255,255,255,0.05);">${lastAct}</td>
    </tr>
    <tr id="${rowId}" style="display:none;">
      <td colspan="5" style="padding:4px 6px 14px;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.02);">${badges}</td>
    </tr>`;
  }).join('');

  document.getElementById('coach-table-wrap').innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr>
        <th style="text-align:left;padding:8px 6px;color:var(--gris-texte);font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.1);">Joueur</th>
        <th style="text-align:left;padding:8px 6px;color:var(--gris-texte);font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.1);">Code</th>
        <th style="text-align:left;padding:8px 6px;color:var(--gris-texte);font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.1);">Statut</th>
        <th style="text-align:left;padding:8px 6px;color:var(--gris-texte);font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.1);">Progression</th>
        <th style="text-align:left;padding:8px 6px;color:var(--gris-texte);font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.1);">Dernière séance</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--gris-texte);padding:20px;">Aucun résultat</td></tr>'}</tbody>
    </table>
    <div style="font-size:11px;color:var(--gris-texte);margin-top:10px;text-align:center;">Clique sur un joueur pour voir le détail des séances</div>
  `;
}
function toggleCoachDetail(rowId) {
  const el = document.getElementById(rowId);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
}

