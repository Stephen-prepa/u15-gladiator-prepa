// Prépa U15 HBCCS — js/05-espace-coachs.js — dernière modification : version z35 (08/11/2026)
// ===================== ESPACE COACHS (Supabase Auth) =====================
const COACH_SPACE_ACTIVATION = new Date('2026-08-17T00:00:00');
const COACH_LOGINS = [
  { login: 'stephen', name: 'Stephen' },
  { login: 'sandrine', name: 'Sandrine' },
  { login: 'arthur', name: 'Arthur' },
  { login: 'nicolas', name: 'Nicolas' },
];
// Coachs exemptés du verrou « un seul appareil actif » (plusieurs appareils en même temps, sans reconnexion)
const COACH_SANS_VERROU = ['stephen'];
const CSK = 'hbccs_coach_session'; // localStorage key, distinct from player appState
const CDK = 'hbccs_coach_device_token';
function getOrCreateCoachDeviceToken() {
  let t = localStorage.getItem(CDK);
  if (!t) {
    t = 'cdev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(CDK, t);
  }
  return t;
}
let coachSession = null;
let coachAuthSelectedLogin = null;

function loadCoachSession() {
  try { coachSession = JSON.parse(localStorage.getItem(CSK) || 'null'); } catch(e) { coachSession = null; }
}
function saveCoachSession() {
  try { localStorage.setItem(CSK, JSON.stringify(coachSession)); } catch(e) {}
}

function isCoachSpacePreview() {
  return new URLSearchParams(window.location.search).get('coach') === 'preview';
}
function isCoachSpaceUnlocked() {
  return new Date() >= COACH_SPACE_ACTIVATION || isCoachSpacePreview();
}

// ---------- Accueil : matchs FFHB (sync + affichage) ----------
const FUNCTIONS_URL = 'https://cponudkorfxtwptwtulq.supabase.co/functions/v1/sync-matches';

// Contenu fictif affiché tant que le calendrier FFHB n'est pas encore publié / vide.
// Remplacé automatiquement dès que de vraies lignes existent dans la table `matches`.
function homeFictionalMatches() {
  const now = new Date();
  const add = (days, h, m) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, m || 0, 0, 0); return d.toISOString(); };
  return [
    { id: 'demo-1', equipe: 1, titre: 'HBC CLERMONT SALAGOU - BEZIERS AHB', debut: add(7, 15, 0), score_nous: null, score_eux: null },
    { id: 'demo-2', equipe: 2, titre: 'HBC CLERMONT SALAGOU - LODEVE HB', debut: add(13, 17, 0), score_nous: null, score_eux: null },
    { id: 'demo-3', equipe: 2, titre: 'MONTPELLIER HB - HBC CLERMONT SALAGOU', debut: add(14, 14, 0), score_nous: null, score_eux: null },
    { id: 'demo-4', equipe: 1, titre: 'HBC CLERMONT SALAGOU - LODEVE HB', debut: add(-7, 15, 0), score_nous: 27, score_eux: 21 },
    { id: 'demo-5', equipe: 1, titre: 'PEZENAS HB - HBC CLERMONT SALAGOU', debut: add(-14, 15, 0), score_nous: 18, score_eux: 22 },
    { id: 'demo-6', equipe: 1, titre: 'HBC CLERMONT SALAGOU - SETE HB', debut: add(-21, 15, 0), score_nous: 24, score_eux: 19 },
  ];
}

function nameWithNumero(p, html) {
  if (!p.numero) return html ? escapeSvgText(p.name) : p.name;
  const label = p.name + ' #' + p.numero;
  return html ? `${escapeSvgText(p.name)} <span style="color:var(--jaune);font-weight:800;font-size:0.9em;">#${p.numero}</span>` : label;
}
function homeCrest(name) {
  return (name || '?').trim().slice(0, 2).toUpperCase();
}
function homeFmtDateShort(iso) {
  const d = new Date(iso);
  const jours = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  return jours[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' · ' + String(d.getHours()).padStart(2, '0') + 'h' + (d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : '');
}
function homeCountdown(iso) {
  const diffDays = Math.ceil((new Date(iso) - new Date()) / 86400000);
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  return 'J-' + diffDays;
}
function homeParseOpponent(titre) {
  // titre FFHB : soit "HBC CLERMONT SALAGOU - ADVERSAIRE" (manuel), soit "A vs B" / "A VS B" (officiel FFHB)
  if (!titre) return { opp: 'Adversaire', home: true };
  let parts = titre.split(/\s+vs\s+/i);
  if (parts.length < 2) parts = titre.split(/\s*-\s*/);
  if (parts.length < 2) return { opp: titre, home: true };
  const isUsFirst = /CLERMONT/i.test(parts[0]);
  const opp = (isUsFirst ? parts[1] : parts[0]).trim();
  return { opp: opp || 'Adversaire', home: isUsFirst };
}

async function homeSyncAndLoad() {
  try {
    fetch(FUNCTIONS_URL, { headers: { Authorization: 'Bearer ' + SB_KEY, apikey: SB_KEY } }).catch(() => {});
  } catch (e) {}
  homeLoadMatches();
}

async function homeRefreshTap() {
  const btn = document.getElementById('home-refresh-btn');
  if (btn) btn.classList.add('spinning');
  try {
    await fetch(FUNCTIONS_URL, { headers: { Authorization: 'Bearer ' + SB_KEY, apikey: SB_KEY } });
  } catch (e) {}
  await homeLoadMatches();
  if (btn) setTimeout(() => btn.classList.remove('spinning'), 400);
}

let homeMatchesCache = [];
async function homeLoadMatches() {
  try {
    const res = await fetch(SB_URL + '/rest/v1/matches?select=*&order=debut.asc', { headers: SB_HEADERS });
    let rows = res.ok ? await res.json() : [];
    let isFictional = false;
    if (!rows.length) {
      rows = homeFictionalMatches();
      isFictional = true;
    }
    homeMatchesCache = rows;
    const now = new Date();
    const upcoming = rows.filter(r => new Date(r.debut) >= now);
    const past = rows.filter(r => new Date(r.debut) < now && (r.score_nous !== null && r.score_nous !== undefined));

    document.getElementById('home-fictional-notice').style.display = isFictional ? 'block' : 'none';

    // Hero : le prochain match de chaque équipe. Si une équipe n'a rien, on complète avec le match suivant
    // (peu importe l'équipe) plutôt que de répéter le même — toujours 2 cartes, jamais de doublon.
    const heroWrap = document.getElementById('home-hero-scroll');
    const heroList = [];
    ['1', '2'].forEach(eq => {
      const m = upcoming.find(u => String(u.equipe) === eq);
      if (m) heroList.push(m);
    });
    for (const m of upcoming) {
      if (heroList.length >= 2) break;
      if (!heroList.some(h => h.id === m.id)) heroList.push(m);
    }
    heroList.sort((a, b) => new Date(a.debut) - new Date(b.debut));
    if (!heroList.length) {
      heroWrap.innerHTML = '<div class="home-hero-empty">Aucun match programmé pour le moment.</div>';
    } else {
      heroWrap.innerHTML = heroList.map(m => {
        const info = homeParseOpponent(m.titre);
        const t2 = String(m.equipe) === '2';
        return `<div class="home-hero${t2 ? ' home-hero-t2' : ''}">
          <span class="kind">Équipe ${m.equipe} · Match</span>
          <div class="home-hero-vs">
            <div class="crest us">CS</div><span class="sep">–</span><div class="crest them">${escapeSvgText(homeCrest(info.opp))}</div>
          </div>
          <div class="home-hero-mid">
            <div class="name">${info.home ? 'vs' : 'à'} ${escapeSvgText(info.opp)}</div>
            <div class="meta">${homeFmtDateShort(m.debut)}</div>
          </div>
          <span class="countdown">${homeCountdown(m.debut)}</span>
        </div>`;
      }).join('');
    }

    // Résultats : matchs passés avec score renseigné
    const resWrap = document.getElementById('home-results-wrap');
    const resScroll = document.getElementById('home-results-scroll');
    if (past.length) {
      resWrap.style.display = 'block';
      resScroll.innerHTML = past.slice(-8).reverse().map(m => {
        const info = homeParseOpponent(m.titre);
        const win = m.score_nous > m.score_eux;
        const scoreDisplay = info.home ? `${m.score_nous}–${m.score_eux}` : `${m.score_eux}–${m.score_nous}`;
        return `<div class="home-rchip ${win ? 'w' : 'l'}" style="cursor:pointer;" onclick="openMatchDetail('${m.id}')"><span class="dot">${win ? 'V' : 'D'}</span><span class="lbl">${escapeSvgText(info.opp)}</span><span class="sc">${scoreDisplay}</span></div>`;
      }).join('');
    } else {
      resWrap.style.display = 'none';
    }

    // Agenda : tout le reste des échéances à venir (hors celles déjà mises en avant dans le hero)
    const agendaWrap = document.getElementById('home-agenda-wrap');
    const agendaScroll = document.getElementById('home-agenda-scroll');
    const heroIds = new Set(heroList.map(m => m.id));
    const agendaItems = upcoming.filter(m => !heroIds.has(m.id));
    if (agendaItems.length) {
      agendaWrap.style.display = 'block';
      const mois = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
      agendaScroll.innerHTML = agendaItems.map(m => {
        const d = new Date(m.debut);
        const info = homeParseOpponent(m.titre);
        return `<div class="ticket"><div class="kind">Équipe ${m.equipe}</div><div class="daynum">${String(d.getDate()).padStart(2, '0')}</div><div class="monthlbl">${mois[d.getMonth()]}</div><div class="perf"></div>
          <div class="opp">${info.home ? 'vs' : 'à'} ${escapeSvgText(info.opp)}</div><div class="time">${String(d.getHours()).padStart(2, '0')}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : '00'}</div></div>`;
      }).join('');
    } else {
      agendaWrap.style.display = 'none';
    }
  } catch (e) {
    document.getElementById('home-hero-scroll').innerHTML = '<div class="home-hero-empty">Erreur de chargement des matchs.</div>';
  }
}

// Détail d'un résultat (score final + détail par tiers-temps si renseigné)
function openMatchDetail(matchId) {
  const m = homeMatchesCache.find(x => String(x.id) === String(matchId));
  if (!m) return;
  const info = homeParseOpponent(m.titre);
  const scoreDisplay = info.home ? `${m.score_nous}–${m.score_eux}` : `${m.score_eux}–${m.score_nous}`;
  let periodsHtml = '';
  if (Array.isArray(m.score_periodes) && m.score_periodes.length) {
    periodsHtml = '<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);">' +
      '<div style="font-size:11px;color:var(--gris-texte);text-transform:uppercase;font-weight:800;margin-bottom:8px;text-align:center;">Détail par tiers-temps</div>' +
      m.score_periodes.map((p, i) => {
        const pd = info.home ? `${p.nous}–${p.eux}` : `${p.eux}–${p.nous}`;
        return `<div style="display:flex;justify-content:space-between;padding:5px 2px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;color:var(--gris-clair);"><span>Tiers-temps ${i + 1}</span><span style="font-weight:800;color:var(--blanc);">${pd}</span></div>`;
      }).join('') + '</div>';
  }
  const sheetHtml = (m.url_ffhb && /^https:\/\/(www\.)?ffhandball\.fr\//i.test(m.url_ffhb))
    ? `<a href="${m.url_ffhb}" target="_blank" rel="noopener" style="display:block;margin-top:16px;padding:11px 12px;border-radius:10px;background:var(--jaune);color:#0a1628;font-weight:800;font-size:13px;text-align:center;text-decoration:none;">📄 Feuille de match (site FFHandball)</a>`
    : '';
  document.getElementById('match-lightbox-content').innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:11px;color:var(--gris-texte);margin-bottom:4px;">Équipe ${m.equipe} · ${homeFmtDateShort(m.debut)}</div>
      <div style="font-size:16px;font-weight:800;color:var(--blanc);margin-bottom:10px;">${info.home ? 'vs' : 'à'} ${escapeSvgText(info.opp)}</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:900;color:var(--jaune);">${scoreDisplay}</div>
    </div>
    ${periodsHtml}
    ${sheetHtml}
  `;
  // La fenêtre est rangée dans le niveau de la page (et non dans l'écran « Prépa estivale », masqué à l'accueil)
  const lb = document.getElementById('match-lightbox');
  if (lb.parentElement !== document.body) document.body.appendChild(lb);
  lb.classList.add('show');
}
function closeMatchDetail(e) {
  if (e && e.target.closest('.img-lightbox-inner') && !e.target.classList.contains('img-lightbox-close')) return;
  document.getElementById('match-lightbox').classList.remove('show');
}

function goHome() {
  if (typeof qjAlertTick === 'function') setTimeout(qjAlertTick, 300);
  document.getElementById('screen-app').style.display = 'none';
  document.getElementById('screen-home').style.display = 'flex';
  document.getElementById('login-overlay').style.display = 'none';
}
function enterClubSpace() {
  document.getElementById('screen-home').style.display = 'none';
  document.getElementById('screen-club').style.display = 'block';
  if (typeof ejApplyLayout === 'function') ejApplyLayout();
  if (typeof ejcLoad === 'function') ejcLoad();
  if (typeof qjLoad === 'function') qjLoad();
  clubStatsLoad();
  clubProgrammeLoad();
}
// ===================== RÉGLAGES APP (Supabase, pilotés depuis l'Espace coachs) =====================
let appSettings = {};
async function loadAppSettings() {
  try {
    const res = await fetch(SB_URL + '/rest/v1/app_settings?select=key,value', { headers: SB_HEADERS });
    if (res.ok) {
      const rows = await res.json();
      rows.forEach(r => { appSettings[r.key] = r.value; });
    }
  } catch (e) { /* pas grave, on garde les valeurs par defaut (visible, sans code) */ }
  applyAppSettingsToHome();
  ejSettingsLoadIntoForm();
  if (typeof ejApplyLayout === 'function') { ejApplyLayout(); ejModulesRenderUi(); }
}
function applyAppSettingsToHome() {
  const btn = document.getElementById('home-btn-ej');
  if (btn) btn.style.display = (appSettings.espace_joueurs_visible === 'false') ? 'none' : 'flex';
}
async function enterClubSpaceGated() {
  let requis = !!appSettings.espace_joueurs_code;   // valeur de secours si le serveur ne répond pas
  try { requis = !!(await sbRpc('ej_code_requis')); } catch (e) {}
  if (requis) {
    document.getElementById('ej-code-input').value = '';
    document.getElementById('ej-code-error').textContent = '';
    document.getElementById('ej-code-overlay').style.display = 'flex';
    setTimeout(() => document.getElementById('ej-code-input').focus(), 50);
  } else {
    enterClubSpace();
  }
}
async function submitEjCode() {
  const val = document.getElementById('ej-code-input').value.trim();
  let ok = false;
  try { ok = !!val && !!(await sbRpc('ej_verifier_code', { p_code: val })); } catch (e) { ok = !!val && val === appSettings.espace_joueurs_code; }
  if (ok) {
    document.getElementById('ej-code-overlay').style.display = 'none';
    enterClubSpace();
  } else {
    document.getElementById('ej-code-error').textContent = 'Code incorrect.';
  }
}
function ejSettingsLoadIntoForm() {
  const cb = document.getElementById('ej-settings-visible');
  const codeInput = document.getElementById('ej-settings-code');
  if (!cb || !codeInput) return;
  cb.checked = appSettings.espace_joueurs_visible !== 'false';
  codeInput.value = appSettings.espace_joueurs_code || '';
  // Le coach relit le code avec sa propre connexion (le public ne pourra plus le lire après z28b)
  if (typeof coachSession !== 'undefined' && coachSession) {
    fetch(SB_URL + '/rest/v1/app_settings?key=eq.espace_joueurs_code&select=value', { headers: coachAuthHeaders() })
      .then(r => r.ok ? r.json() : []).then(rows => { if (rows[0] && !codeInput.matches(':focus')) codeInput.value = rows[0].value || ''; }).catch(() => {});
  }
}
async function ejSettingsSave() {
  const visible = document.getElementById('ej-settings-visible').checked ? 'true' : 'false';
  const code = document.getElementById('ej-settings-code').value.trim();
  const msg = document.getElementById('ej-settings-msg');
  msg.style.color = 'var(--gris-texte)';
  msg.textContent = 'Enregistrement...';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([
        { key: 'espace_joueurs_visible', value: visible, updated_at: new Date().toISOString() },
        { key: 'espace_joueurs_code', value: code, updated_at: new Date().toISOString() },
      ]),
    });
    if (!res.ok) throw new Error('save failed');
    appSettings.espace_joueurs_visible = visible;
    appSettings.espace_joueurs_code = code;
    applyAppSettingsToHome();
    msg.style.color = 'var(--vert)';
    msg.textContent = '✓ Enregistré — appliqué immédiatement pour tous.';
  } catch (e) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Erreur — réessaie.';
  }
}
function goHomeFromClub() {
  if (typeof qjAlertTick === 'function') setTimeout(qjAlertTick, 300);
  document.getElementById('screen-club').style.display = 'none';
  document.getElementById('screen-home').style.display = 'flex';
}
async function clubStatsLoad() {
  const wrap = document.getElementById('club-stats-pie');
  try {
    const res = await fetch(SB_URL + '/rest/v1/presence_stats_global?select=status,total', { headers: SB_HEADERS });
    if (!res.ok) throw new Error('load failed');
    const rows = await res.json();
    const counts = { present: 0, absent: 0, excuse: 0, retard: 0 };
    rows.forEach(r => { if (counts[r.status] !== undefined) counts[r.status] = r.total; });
    const total = counts.present + counts.absent + counts.excuse + counts.retard;
    if (!total) {
      wrap.innerHTML = '<div style="text-align:center;padding:16px;color:var(--gris-texte);font-size:12px;">Aucune présence enregistrée pour le moment.</div>';
      return;
    }
    const data = [
      { label: 'Présent', value: counts.present, color: '#2ecc71' },
      { label: 'Absent', value: counts.absent, color: '#e74c3c' },
      { label: 'Excusé', value: counts.excuse, color: '#f39c12' },
      { label: 'Retard', value: counts.retard, color: '#3498db' },
    ];
    wrap.innerHTML = svgPieChart(data);
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:16px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}
let clubProgressMonth = null;
function clubProgressShiftMonth(delta) {
  const d = new Date(clubProgressMonth + 'T00:00:00');
  d.setMonth(d.getMonth() + delta, 1);
  clubProgressMonth = monthFirstStr(d);
  clubProgrammeLoad();
}
async function clubProgrammeLoad() {
  if (!clubProgressMonth) clubProgressMonth = monthFirstStr(new Date());
  document.getElementById('club-progress-month-label').textContent = progressMonthLabel(clubProgressMonth);
  const wrap = document.getElementById('club-programme-list');
  try {
    const [itemsRes, avgRes] = await Promise.all([
      fetch(SB_URL + '/rest/v1/programme_saison?select=*&order=categorie,ordre,created_at', { headers: SB_HEADERS }),
      fetch(SB_URL + '/rest/v1/objectif_progress_avg?select=objectif_id,moyenne&mois=eq.' + clubProgressMonth, { headers: SB_HEADERS }),
    ]);
    if (!itemsRes.ok) throw new Error('load failed');
    const rows = await itemsRes.json();
    const avgRows = avgRes.ok ? await avgRes.json() : [];
    const avgById = {}; avgRows.forEach(r => { avgById[r.objectif_id] = r; });
    if (!rows.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:16px;color:var(--gris-texte);font-size:12px;">Aucun objectif publié pour le moment.</div>';
      return;
    }
    const byCat = {};
    rows.filter(r => !r.parent_id).forEach(r => {
      if (!byCat[r.categorie]) byCat[r.categorie] = [];
      byCat[r.categorie].push(r);
    });
    wrap.innerHTML = Object.keys(byCat).sort().map(cat => {
      const items = byCat[cat].map(item => {
        const children = rows.filter(r => r.parent_id === item.id);
        const childHtml = children.map(c => {
          const cAvg = avgById[c.id];
          const cSemaine = c.semaine ? `<span style="flex-shrink:0;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:800;color:var(--jaune);background:rgba(255,215,0,0.12);border-radius:5px;padding:2px 6px;margin-right:6px;">${escapeSvgText(c.semaine)}</span>` : '';
          return `<div style="padding:6px 0 6px 16px;">
            <div style="font-size:12px;color:var(--gris-clair);">${cSemaine}· ${escapeSvgText(c.titre)}</div>
            ${gaugeHtml(c.id, cAvg ? cAvg.moyenne : 0, false)}
          </div>`;
        }).join('');
        const iAvg = avgById[item.id];
        const iSemaine = item.semaine ? `<span style="flex-shrink:0;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:800;color:var(--jaune);background:rgba(255,215,0,0.12);border-radius:5px;padding:2px 6px;margin-right:6px;">${escapeSvgText(item.semaine)}</span>` : '';
        return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:13px;color:var(--blanc);font-weight:700;">${iSemaine}${escapeSvgText(item.titre)}</div>
          ${gaugeHtml(item.id, iAvg ? iAvg.moyenne : 0, false)}
          ${childHtml}
        </div>`;
      }).join('');
      return `<div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:800;color:var(--jaune);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${escapeSvgText(cat)}</div>
        ${items}
      </div>`;
    }).join('');
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:16px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}
function enterApp(tabName) {
  document.getElementById('screen-home').style.display = 'none';
  document.getElementById('screen-app').style.display = 'block';
  document.getElementById('prepa-chrome').style.display = (tabName === 'coachs2') ? 'none' : 'block';
  document.querySelector('.tabs').style.display = (tabName === 'coachs2') ? 'none' : 'flex';
  const el = document.getElementById('tab-' + tabName) ||
    Array.from(document.querySelectorAll('.tabs button')).find(b => b.getAttribute('onclick') === `switchTab('${tabName}',this)`);
  switchTab(tabName, el);
  if (tabName !== 'coachs2' && !appState.playerCode) {
    document.getElementById('login-overlay').style.display = 'flex';
  }
}

function updateCoachs2TabVisibility() {
  const homeBtn = document.getElementById('home-btn-coachs');
  if (!homeBtn) return;
  if (isCoachSpaceUnlocked()) {
    homeBtn.style.display = 'flex';
  } else {
    homeBtn.style.display = 'none';
    if (document.getElementById('panel-coachs2') && document.getElementById('panel-coachs2').classList.contains('active')) {
      goHome();
    }
  }
}

function renderCoachNamePicker() {
  const wrap = document.getElementById('coachs2-namepick');
  wrap.innerHTML = COACH_LOGINS.map(c =>
    `<button type="button" data-login="${c.login}" onclick="pickCoachLogin('${c.login}')"
      style="padding:8px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);background:var(--gris-fonce);color:var(--gris-clair);font-size:13px;cursor:pointer;">${c.name}</button>`
  ).join('');
  pickCoachLogin(COACH_LOGINS[0].login);
}
function pickCoachLogin(login) {
  coachAuthSelectedLogin = login;
  document.querySelectorAll('#coachs2-namepick button').forEach(b => {
    const active = b.dataset.login === login;
    b.style.background = active ? 'var(--jaune)' : 'var(--gris-fonce)';
    b.style.color = active ? '#1a1a1a' : 'var(--gris-clair)';
    b.style.fontWeight = active ? '800' : '400';
  });
  document.getElementById('coachs2-login-error').textContent = '';
  try { pwForgotWho(); } catch (e) {}
}

function coachSubtabSwitch(name) {
  if (name === 'evaluations' && coachSession && coachSession.name === 'Sandrine') name = 'presence';
  const boxes = { dashboard: 'cs-box-dashboard', presence: 'cs-box-presence', stats: 'cs-box-stats', programme: 'cs-box-programme', seance: 'cs-box-seance', schemas: 'cs-box-schemas', composition: 'cs-box-composition', outils: 'cs-box-outils', evaluations: 'cs-box-evaluations', reglages: 'cs-box-reglages' };
  Object.keys(boxes).forEach(key => {
    document.getElementById(boxes[key]).classList.toggle('cs-hide', key !== name);
    const btn = document.getElementById('cs-subtab-' + key);
    if (!btn) return;
    const active = key === name;
    btn.style.border = active ? '1px solid var(--jaune)' : '1px solid rgba(255,255,255,0.15)';
    btn.style.background = active ? 'rgba(255,215,0,0.12)' : 'transparent';
    btn.style.color = active ? 'var(--jaune)' : 'var(--gris-clair)';
    btn.style.fontWeight = active ? '800' : '400';
  });
  if (name === 'dashboard') dashboardLoad();
  if (name === 'outils') { outilsInit(); outilsPaneInit(); }
  if (name === 'evaluations') evaluationsInit();
  if (name === 'reglages') { loadAppSettings(); try { dispRenderUi(); pwUiInit(); } catch (e) {} try { crCfgRenderUi(); crCfgPull(); } catch (e) {} }
  if (name === 'seance') seancePaneInit();
  if (name === 'schemas') schInit();
  if (typeof qjAlertTick === 'function') qjAlertTick();
}

// ---------- Compositions du week-end (coach) ----------
let compositionInited = false;
let compositionRoster = [];
let compositionAssign = {}; // player_code -> 1 | 2

function nextWeekendDayOnOrAfter(d) {
  const copy = new Date(d);
  while (copy.getDay() !== 6 && copy.getDay() !== 0) copy.setDate(copy.getDate() + 1);
  return copy;
}
function compositionInit() {
  if (compositionInited) return;
  compositionInited = true;
  const today = new Date();
  const d = (today.getDay() === 6 || today.getDay() === 0) ? today : nextWeekendDayOnOrAfter(today);
  document.getElementById('composition-date').value = dateStr(d);
  compositionLoadRoster();
}
function compositionShiftDay(delta) {
  const input = document.getElementById('composition-date');
  const d = new Date(input.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  input.value = dateStr(d);
  compositionDateChanged();
}
async function compositionLoadRoster() {
  document.getElementById('composition-roster-list').innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);">Chargement...</div>';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/players?select=code,name,postes,numero&claimed_at=not.is.null&order=name', { headers: coachAuthHeaders() });
    const rows = await res.json();
    compositionRoster = rows.filter(p => p.code !== 'COACHTEST' && p.name);
  } catch (e) { compositionRoster = []; }
  compositionDateChanged();
}
async function compositionDateChanged() {
  const input = document.getElementById('composition-date');
  compositionAssign = {};
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/match_lineup?select=player_code,equipe&session_date=eq.' + input.value, {
      headers: coachAuthHeaders(),
    });
    if (res.ok) {
      const rows = await res.json();
      rows.forEach(r => { compositionAssign[r.player_code] = r.equipe; });
    }
    await compositionLoadOpponents(input.value);
  } catch (e) {}
  compositionRender();
}
async function compositionLoadOpponents(dateVal) {
  const dayStart = dateVal + 'T00:00:00';
  const dayEnd = dateVal + 'T23:59:59';
  for (const eq of [1, 2]) {
    const el = document.getElementById('composition-team' + eq + '-opp');
    if (!el) continue;
    try {
      const mRes = await fetch(SB_URL + '/rest/v1/matches?select=titre,lieu&equipe=eq.' + eq + '&debut=gte.' + dayStart + '&debut=lte.' + dayEnd + '&order=debut&limit=1', { headers: coachAuthHeaders() });
      const mRows = mRes.ok ? await mRes.json() : [];
      if (mRows.length) {
        const info = homeParseOpponent(mRows[0].titre);
        el.textContent = (info.home ? 'vs ' : 'à ') + info.opp;
      } else {
        el.textContent = '';
      }
    } catch (e) { el.textContent = ''; }
  }
}
function compositionRender() {
  const rosterWrap = document.getElementById('composition-roster-list');
  const t1Wrap = document.getElementById('composition-team1-list');
  const t2Wrap = document.getElementById('composition-team2-list');
  const absWrap = document.getElementById('composition-absent-list');

  const t1 = compositionRoster.filter(p => compositionAssign[p.code] === 1);
  const t2 = compositionRoster.filter(p => compositionAssign[p.code] === 2);
  const abs = compositionRoster.filter(p => compositionAssign[p.code] === -1);
  const unassigned = compositionRoster.length - t1.length - t2.length - abs.length;
  t1Wrap.innerHTML = t1.length ? t1.map(p => `<div>• ${nameWithNumero(p, true)}</div>`).join('') : '<div style="color:var(--gris-texte);">Aucun joueur</div>';
  t2Wrap.innerHTML = t2.length ? t2.map(p => `<div>• ${nameWithNumero(p, true)}</div>`).join('') : '<div style="color:var(--gris-texte);">Aucun joueur</div>';
  document.getElementById('composition-team1-count').textContent = t1.length;
  document.getElementById('composition-team2-count').textContent = t2.length;
  if (absWrap) {
    absWrap.innerHTML = abs.length ? abs.map(p => `<div>• ${nameWithNumero(p, true)}</div>`).join('') : '<div style="color:var(--gris-texte);">Aucune absence signalée</div>';
    document.getElementById('composition-absent-count').textContent = abs.length;
  }
  document.getElementById('composition-unassigned-count').textContent = unassigned > 0 ? unassigned + ' joueur' + (unassigned > 1 ? 's' : '') + ' pas encore assigné' + (unassigned > 1 ? 's' : '') : '';

  if (!compositionRoster.length) {
    rosterWrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);">Aucun joueur dans l\'effectif.</div>';
    return;
  }
  rosterWrap.innerHTML = compositionRoster.map(p => {
    const cur = compositionAssign[p.code] || 0;
    const btn = (val, label, color) => {
      const active = cur === val;
      return `<button type="button" onclick="compositionSetTeam('${p.code}', ${val})" style="min-width:0;padding:6px 2px;border-radius:6px;border:1px solid ${active ? color : 'rgba(255,255,255,0.15)'};background:${active ? color + '22' : 'transparent'};color:${active ? color : 'var(--gris-texte)'};font-weight:${active ? '800' : '400'};font-size:10.5px;cursor:pointer;">${label}</button>`;
    };
    return `<div style="background:var(--noir);border-radius:8px;padding:8px 10px;">
      <div style="font-size:13px;margin-bottom:6px;color:${cur === -1 ? 'var(--gris-texte)' : 'var(--blanc)'};${cur === -1 ? 'text-decoration:line-through;' : ''}">${nameWithNumero(p, true)}</div>
      <div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:6px;">
        ${btn(0, 'Aucune', '#8a97ad')}
        ${btn(1, 'Éq.1', '#F5C400')}
        ${btn(2, 'Éq.2', '#3498db')}
        ${btn(-1, 'Absent', '#e74c3c')}
      </div>
    </div>`;
  }).join('');
}
async function compositionSetTeam(code, equipe) {
  compositionAssign[code] = equipe || undefined;
  compositionRender();
  const input = document.getElementById('composition-date');
  try {
    await ensureCoachSession();
    if (!equipe) {
      await fetch(SB_URL + '/rest/v1/match_lineup?session_date=eq.' + input.value + '&player_code=eq.' + encodeURIComponent(code), {
        method: 'DELETE', headers: coachAuthHeaders(),
      });
    } else {
      await fetch(SB_URL + '/rest/v1/match_lineup?on_conflict=session_date,player_code', {
        method: 'POST',
        headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify([{ session_date: input.value, player_code: code, equipe, created_by: coachSession ? coachSession.id : null }]),
      });
    }
  } catch (e) {}
  playerLineupLevelsCache = null;
}

function postesOpenEditor() {
  const box = document.getElementById('postes-editor');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
  if (box.style.display === 'none') return;
  postesRenderEditor();
}
function postesRenderEditor() {
  const wrap = document.getElementById('postes-editor-list');
  const sorted = [...presenceRoster].sort((a, b) => {
    const missA = !(a.postes && a.postes[0]), missB = !(b.postes && b.postes[0]);
    if (missA !== missB) return missA ? -1 : 1;
    return a.name.localeCompare(b.name, 'fr');
  });
  const nbMissing = sorted.filter(p => !(p.postes && p.postes[0])).length;
  const header = nbMissing
    ? `<div id="postes-editor-header" style="font-size:11px;color:#e74c3c;margin-bottom:8px;">⚠️ ${nbMissing} joueur${nbMissing > 1 ? 's' : ''} sans poste défini — affiché${nbMissing > 1 ? 's' : ''} en premier</div>`
    : `<div id="postes-editor-header" style="font-size:11px;color:#2ecc71;margin-bottom:8px;">✓ Tout l'effectif a un poste défini</div>`;
  wrap.innerHTML = header + sorted.map(p => {
    const current = (p.postes && p.postes[0]) || '';
    const missing = !current;
    const opts = POSTES.map(code => `<option value="${code}" ${current === code ? 'selected' : ''}>${code} — ${POSTE_LABELS[code]}</option>`).join('');
    return `<div id="postes-row-${p.code}" style="display:flex;align-items:center;gap:8px;background:var(--noir);border-radius:8px;padding:6px 10px;border:1px solid ${missing ? 'rgba(231,76,60,0.4)' : 'transparent'};transition:border-color 0.3s, background 0.3s;">
      <span style="flex:1;min-width:0;font-size:clamp(11px,3vw,14px);color:${missing ? '#e74c3c' : 'var(--blanc)'};overflow-wrap:break-word;">${escapeSvgText(p.name)}</span>
      <select onchange="postesSetDefault('${p.code}', this.value)" style="flex-shrink:0;max-width:36%;background:var(--gris-fonce);color:var(--blanc);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:5px 4px;font-size:clamp(10px,2.6vw,12px);">
        <option value="">—</option>
        ${opts}
      </select>
      <span id="postes-check-${p.code}" style="flex-shrink:0;width:16px;font-size:14px;color:#2ecc71;"></span>
    </div>`;
  }).join('');
}
async function postesSetDefault(code, poste) {
  const p = presenceRoster.find(r => r.code === code);
  const current = p ? (p.postes || []) : [];
  const next = poste ? [poste, ...current.filter(x => x !== poste)].slice(0, 2) : current.slice(1);
  const row = document.getElementById('postes-row-' + code);
  const check = document.getElementById('postes-check-' + code);
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(code), {
      method: 'PATCH',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ postes: next }),
    });
    if (!res.ok) throw new Error('save failed');
    const updated = await res.json();
    if (!updated.length) throw new Error('no row updated — RLS ?');
    if (p) p.postes = next;
    if (check) {
      check.textContent = '✓';
      setTimeout(() => { check.textContent = ''; }, 1800);
    }
    if (row) {
      row.style.borderColor = 'rgba(46,204,113,0.5)';
      setTimeout(() => { row.style.borderColor = poste ? 'transparent' : 'rgba(231,76,60,0.4)'; }, 1200);
    }
  } catch (e) {
    if (check) check.textContent = '';
    alert('Erreur — poste non enregistré, réessaie.');
  }
}

