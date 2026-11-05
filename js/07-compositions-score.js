// ---------- Mode de composition : mixte / Éq.1 entre eux / Éq.2 entre eux / 2 terrains ----------
const OUTILS_MODE_HELP = {
  mixte: "Tous les présents mélangés, répartis de façon équilibrée par poste et par niveau.",
  eq1: "Seuls les joueurs de l'Équipe 1 du week-end s'opposent entre eux : une exigence proche de celle de leurs matchs.",
  eq2: "Seuls les joueurs de l'Équipe 2 du week-end s'opposent entre eux : une exigence proche de celle de leurs matchs.",
  separe: "Deux oppositions en parallèle (4 équipes) : les joueurs Éq.1 entre eux sur un terrain, les joueurs Éq.2 entre eux sur l'autre.",
};
function outilsRenderNbButtons() {
  const locked = outilsMode === 'separe';
  [2, 3, 4].forEach(v => {
    const btn = document.getElementById('outils-nb-' + v);
    if (!btn) return;
    const on = outilsNb === v;
    btn.disabled = locked;
    btn.style.opacity = locked ? '0.4' : '1';
    btn.style.border = on ? '1px solid var(--jaune)' : '1px solid rgba(255,255,255,0.15)';
    btn.style.background = on ? 'rgba(255,215,0,0.12)' : 'transparent';
    btn.style.color = on ? 'var(--jaune)' : 'var(--gris-clair)';
  });
}
function outilsRenderModeUI() {
  ['mixte', 'eq1', 'eq2', 'separe'].forEach(m => {
    const btn = document.getElementById('outils-mode-' + m);
    if (!btn) return;
    const on = outilsMode === m;
    btn.style.border = on ? '1px solid var(--jaune)' : '1px solid rgba(255,255,255,0.15)';
    btn.style.background = on ? 'rgba(255,215,0,0.12)' : 'transparent';
    btn.style.color = on ? 'var(--jaune)' : 'var(--gris-clair)';
    btn.style.fontWeight = on ? '800' : '400';
  });
  const help = document.getElementById('outils-mode-help');
  if (help) help.textContent = OUTILS_MODE_HELP[outilsMode] || '';
}
async function outilsSetMode(mode) {
  if (mode === outilsMode) return;
  const wasSepare = outilsMode === 'separe';
  const willBeSepare = mode === 'separe';
  outilsMode = mode;
  const info = document.getElementById('outils-mode-info');
  if (info) info.textContent = '';
  if (wasSepare !== willBeSepare) {
    // la structure change (2 terrains = 4 équipes) : on repart d'une composition vide
    outilsNb = willBeSepare ? 4 : 2;
    outilsRenderNbButtons();
    outilsRenderModeUI();
    await outilsReset();
    return;
  }
  outilsRenderModeUI();
  outilsRenderTeams();
  try {
    await ensureCoachSession();
    await fetch(SB_URL + '/rest/v1/outils_composition?session_date=eq.' + outilsCurrentDate(), {
      method: 'PATCH',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  } catch (e) {}
  outilsSyncToSeance();
}
// Groupe "week-end" de chaque joueur (1 ou 2), d'après les compositions de l'onglet Compos :
// pour chaque joueur, l'affectation la plus proche À VENIR (date >= date de la séance), sinon la plus récente passée.
async function getPlayerWeekendGroups(refDateStr) {
  const groups = {};
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/match_lineup?select=player_code,equipe,session_date&equipe=in.(1,2)&order=session_date', { headers: coachAuthHeaders() });
    const rows = res.ok ? await res.json() : [];
    const byPlayer = {};
    rows.forEach(r => { (byPlayer[r.player_code] = byPlayer[r.player_code] || []).push(r); });
    Object.keys(byPlayer).forEach(code => {
      const list = byPlayer[code]; // trié par date croissante
      const upcoming = list.find(r => r.session_date >= refDateStr);
      groups[code] = (upcoming || list[list.length - 1]).equipe;
    });
  } catch (e) {}
  return groups;
}
// Répartition équilibrée : (1) les postes sont répartis à parts égales entre équipes, (2) les tailles restent proches,
// (3) le niveau est équilibré, d'abord en plaçant chaque joueur là où le total de niveau est le plus faible,
// puis en échangeant des joueurs du MÊME poste entre équipes tant que l'écart de niveau moyen diminue.
function outilsBalance(players, nTeams) {
  const posteOf = p => (p.postes && p.postes[0]) || '';
  const byPoste = {};
  POSTES.forEach(c => { byPoste[c] = []; });
  byPoste[''] = [];
  players.forEach(p => { (byPoste[posteOf(p)] || byPoste['']).push(p); });
  const teams = Array.from({ length: nTeams }, () => []);
  const sum = teams.map(() => 0);
  [...POSTES, ''].forEach(k => {
    const list = byPoste[k].slice().sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'fr'));
    list.forEach(p => {
      const cnt = teams.map(t => t.filter(q => posteOf(q) === k).length);
      const minCnt = Math.min(...cnt);
      let best = -1;
      for (let i = 0; i < nTeams; i++) {
        if (cnt[i] !== minCnt) continue;
        if (best === -1 || teams[i].length < teams[best].length || (teams[i].length === teams[best].length && sum[i] < sum[best])) best = i;
      }
      teams[best].push(p);
      sum[best] += p.level;
    });
  });
  const spread = () => {
    const avgs = teams.map((t, i) => (t.length ? sum[i] / t.length : 0));
    return Math.max(...avgs) - Math.min(...avgs);
  };
  let improved = true, guard = 0;
  while (improved && guard++ < 60) {
    improved = false;
    for (let a = 0; a < nTeams && !improved; a++) {
      for (let b = a + 1; b < nTeams && !improved; b++) {
        for (let x = 0; x < teams[a].length && !improved; x++) {
          for (let y = 0; y < teams[b].length && !improved; y++) {
            const px = teams[a][x], py = teams[b][y];
            if (posteOf(px) !== posteOf(py) || px.level === py.level) continue;
            const before = spread();
            teams[a][x] = py; teams[b][y] = px;
            sum[a] += py.level - px.level; sum[b] += px.level - py.level;
            if (spread() < before - 1e-9) { improved = true; }
            else {
              teams[a][x] = px; teams[b][y] = py;
              sum[a] -= py.level - px.level; sum[b] -= px.level - py.level;
            }
          }
        }
      }
    }
  }
  return teams;
}
function outilsGroupOfTeam(i) {
  if (outilsMode === 'eq1') return 1;
  if (outilsMode === 'eq2') return 2;
  if (outilsMode === 'separe') return i < 2 ? 1 : 2;
  return 0;
}
function outilsGroupTag(i) {
  const g = outilsGroupOfTeam(i);
  return g ? ` <span style="font-family:Barlow,sans-serif;font-size:9.5px;font-weight:600;color:var(--gris-texte);border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:1px 6px;margin-left:4px;vertical-align:middle;">joueurs Éq.${g}</span>` : '';
}

async function outilsClearDb() {
  try {
    await ensureCoachSession();
    await fetch(SB_URL + '/rest/v1/outils_composition?session_date=eq.' + outilsCurrentDate(), {
      method: 'DELETE', headers: coachAuthHeaders(),
    });
  } catch (e) {}
}
async function outilsReset() {
  const present = presenceRoster.filter(p => presenceMarks[p.code] === 'present');
  outilsPool = present.map(p => ({ code: p.code, name: p.name, postes: p.postes || [], numero: p.numero }));
  outilsTeams = Array.from({ length: outilsNb }, () => []);
  outilsCurrentTeam = 0;
  await outilsClearDb();
  outilsRenderPool();
  outilsRenderTeams();
  outilsSyncToSeance();
}

// Calcule, pour chaque joueur ayant déjà été affecté à une équipe le week-end (table match_lineup),
// un "niveau" 0-1 basé sur sa fréquence en Équipe 1 vs Équipe 2 (1 = toujours Éq.1, 0 = toujours Éq.2).
// Les joueurs sans historique reçoivent 0.5 (neutre), pour ne pas fausser un équilibrage.
let playerLineupLevelsCache = null;
async function getPlayerLineupLevels(forceRefresh) {
  if (playerLineupLevelsCache && !forceRefresh) return playerLineupLevelsCache;
  try {
    await ensureCoachSession();
    const [lineupRes, playersRes] = await Promise.all([
      fetch(SB_URL + '/rest/v1/match_lineup?select=player_code,equipe&equipe=in.(1,2)', { headers: coachAuthHeaders() }),
      fetch(SB_URL + '/rest/v1/players?select=code,name&claimed_at=not.is.null', { headers: SB_HEADERS }),
    ]);
    const lineupRows = lineupRes.ok ? await lineupRes.json() : [];
    const players = playersRes.ok ? await playersRes.json() : [];
    const nameByCode = {}; players.forEach(p => { nameByCode[p.code] = p.name; });
    const counts = {};
    lineupRows.forEach(r => {
      if (!counts[r.player_code]) counts[r.player_code] = { team1: 0, team2: 0 };
      if (r.equipe === 1) counts[r.player_code].team1++;
      else if (r.equipe === 2) counts[r.player_code].team2++;
    });
    playerLineupLevelsCache = players.map(p => {
      const c = counts[p.code] || { team1: 0, team2: 0 };
      const total = c.team1 + c.team2;
      return { code: p.code, name: p.name, team1: c.team1, team2: c.team2, total, ratio: total > 0 ? c.team1 / total : 0.5 };
    });
    return playerLineupLevelsCache;
  } catch (e) {
    return [];
  }
}

// Génère automatiquement des équipes équilibrées : regroupe les présents par poste, et au sein
// de chaque poste les répartit en "serpentin" entre les équipes selon leur niveau habituel
// (fréquence Équipe 1 / Équipe 2 le week-end, table match_lineup). Le serpentin continue d'un
// poste à l'autre pour lisser aussi l'équilibre global, pas seulement poste par poste.
async function outilsAutoCompose() {
  const btn = document.getElementById('outils-auto-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Calcul en cours...'; }
  try {
    const present = presenceRoster.filter(p => presenceMarks[p.code] === 'present');
    if (!present.length) {
      alert('Marque d\'abord des joueurs "Présent" dans l\'onglet Présences.');
      return;
    }
    const levels = await getPlayerLineupLevels();
    const levelByCode = {}; levels.forEach(l => { levelByCode[l.code] = l.ratio; });
    const pool = present.map(p => ({ code: p.code, name: p.name, postes: p.postes || [], numero: p.numero, level: levelByCode[p.code] !== undefined ? levelByCode[p.code] : 0.5 }));

    let teams, leftover = [], infoText = '';
    if (outilsMode === 'mixte') {
      teams = outilsBalance(pool, outilsNb);
    } else {
      const groupOf = await getPlayerWeekendGroups(outilsCurrentDate());
      const g1 = pool.filter(p => groupOf[p.code] === 1);
      const g2 = pool.filter(p => groupOf[p.code] === 2);
      const none = pool.filter(p => !groupOf[p.code]);
      if (outilsMode === 'separe') {
        if (!g1.length && !g2.length) {
          alert('Aucun joueur présent n\'apparaît dans les compositions Équipe 1 / Équipe 2 du week-end (onglet Compos).');
          return;
        }
        teams = [...outilsBalance(g1, 2), ...outilsBalance(g2, 2)];
        leftover = none;
      } else {
        const wanted = outilsMode === 'eq1' ? 1 : 2;
        const g = wanted === 1 ? g1 : g2;
        if (!g.length) {
          alert('Aucun joueur présent n\'est identifié comme Équipe ' + wanted + ' dans les compositions du week-end (onglet Compos).');
          return;
        }
        teams = outilsBalance(g, outilsNb);
        leftover = pool.filter(p => !g.includes(p));
      }
      infoText = 'Présents : ' + g1.length + ' en Éq.1 · ' + g2.length + ' en Éq.2 · ' + none.length + ' sans équipe week-end. Les joueurs non utilisés restent dans la liste ci-dessous.';
    }

    outilsTeams = teams;
    outilsPool = leftover;
    outilsCurrentTeam = 0;
    await outilsClearDb();
    const rowsToSave = [];
    teams.forEach((t, i) => t.forEach(p => rowsToSave.push({
      session_date: outilsCurrentDate(), player_code: p.code, team_index: i, mode: outilsMode,
      created_by: coachSession ? coachSession.id : null,
    })));
    if (rowsToSave.length) {
      await fetch(SB_URL + '/rest/v1/outils_composition?on_conflict=session_date,player_code', {
        method: 'POST',
        headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(rowsToSave),
      });
    }
    const info = document.getElementById('outils-mode-info');
    if (info) info.textContent = infoText;
    outilsRenderPool();
    outilsRenderTeams();
    outilsSyncToSeance();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🎯 Générer équilibré (poste + niveau)'; }
  }
}

function outilsSetCurrentTeam(i) {
  outilsCurrentTeam = i;
  outilsRenderTeams();
}
function outilsRenderPool() {
  const wrap = document.getElementById('outils-pool');
  if (!wrap) return;
  if (!outilsPool.length) {
    const anyAssigned = outilsTeams.some(t => t.length);
    wrap.innerHTML = anyAssigned
      ? '<div style="text-align:center;padding:16px;color:var(--gris-texte);font-size:12px;">Tous les présents sont déjà assignés à une équipe ✓</div>'
      : '<div style="text-align:center;padding:16px;color:var(--gris-texte);font-size:12px;">Aucun joueur disponible — marque les présents dans l\'onglet Présences, puis reviens ici.</div>';
    return;
  }
  const sorted = [...outilsPool].sort((a, b) => {
    const pa = (a.postes && a.postes[0]) || '';
    const pb = (b.postes && b.postes[0]) || '';
    const ia = pa ? POSTES.indexOf(pa) : POSTES.length;
    const ib = pb ? POSTES.indexOf(pb) : POSTES.length;
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name, 'fr');
  });
  let lastPoste = null;
  const parts = [];
  sorted.forEach(p => {
    const poste = (p.postes && p.postes[0]) || '';
    if (poste !== lastPoste) {
      lastPoste = poste;
      const label = poste ? poste + ' — ' + POSTE_LABELS[poste] : 'Sans poste défini';
      parts.push(`<div style="grid-column:1/-1;font-size:9.5px;font-weight:800;color:var(--gris-texte);text-transform:uppercase;margin:6px 0 2px;">${label}</div>`);
    }
    parts.push(`<button type="button" onclick="outilsPick('${p.code}')" style="background:var(--noir);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 6px;text-align:center;cursor:pointer;">
      <div style="font-size:clamp(11px,3vw,13px);color:var(--blanc);font-weight:700;overflow-wrap:break-word;">${escapeSvgText(p.name)}${p.numero ? ' <span style="font-size:0.9em;">#' + p.numero + '</span>' : ''}</div>
      <div style="font-size:10px;color:var(--jaune);margin-top:2px;">${poste || '—'}</div>
    </button>`);
  });
  wrap.innerHTML = parts.join('');
}
function outilsRenderTeams() {
  const wrap = document.getElementById('outils-teams');
  const teamColors = TEAM_COLORS;
  const threshold = OUTILS_THRESHOLD[outilsNb];
  wrap.innerHTML = outilsTeams.map((team, i) => `
    <div onclick="outilsSetCurrentTeam(${i})" style="cursor:pointer;background:var(--noir);border-radius:10px;padding:10px;margin-bottom:8px;border:2px solid ${i === outilsCurrentTeam ? teamColors[i] : 'rgba(255,255,255,0.08)'};">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;">
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:14px;color:${teamColors[i]};">Équipe ${i + 1}${i === outilsCurrentTeam ? ' · active' : ''}${outilsGroupTag(i)}</span>
        <span style="font-size:11px;color:var(--gris-texte);">${team.length}/${threshold}${team.length > threshold ? ' (+' + (team.length - threshold) + ')' : ''}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${team.length ? team.map(p => `<button type="button" onclick="event.stopPropagation(); outilsUnpick('${p.code}')" style="background:${teamColors[i]}22;border:1px solid ${teamColors[i]}55;border-radius:6px;padding:4px 8px;font-size:11px;color:var(--gris-clair);cursor:pointer;">${escapeSvgText(p.name)}${p.numero ? ' <span style="font-size:0.9em;">#' + p.numero + '</span>' : ''} ${(p.postes && p.postes[0]) ? '· ' + p.postes[0] : ''}</button>`).join('') : '<span style="font-size:11px;color:var(--gris-texte);">Vide pour l\'instant — tape ici pour la rendre active</span>'}
      </div>
    </div>
  `).join('');
  outilsUpdateScoreboardVisibility();
}

// ---------- Tableau de score en direct + buteurs + sanctions (oppositions de fin de séance) ----------
let outilsGoals = []; // [{id, team_index, player_code, points}] pour la date en cours
let outilsPair = [0, 1]; // indices des 2 équipes actuellement sur le terrain (mode 3-4 équipes)

function outilsUpdateScoreboardVisibility() {
  const emptyMsg = document.getElementById('outils-match-empty');
  const content = document.getElementById('outils-match-content');
  if (!emptyMsg || !content) return;
  const nonEmptyTeams = outilsTeams.filter(t => t.length).length;
  emptyMsg.style.display = nonEmptyTeams >= 2 ? 'none' : 'block';
  content.style.display = nonEmptyTeams >= 2 ? 'block' : 'none';
  if (nonEmptyTeams >= 2) {
    if (outilsPair[0] >= outilsTeams.length || outilsPair[1] >= outilsTeams.length || outilsPair[0] === outilsPair[1]) {
      outilsPair = [0, 1];
    }
    outilsRenderPairPicker();
    outilsRenderScoreboard();
    outilsRenderTopScorers();
  }
}
async function outilsLoadGoals() {
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/outils_goals?select=id,team_index,player_code,points&session_date=eq.' + outilsCurrentDate() + '&order=created_at', { headers: coachAuthHeaders() });
    outilsGoals = res.ok ? await res.json() : [];
  } catch (e) { outilsGoals = []; }
}
function outilsRenderPairPicker() {
  const wrap = document.getElementById('outils-pair-picker');
  if (!wrap) return;
  if (outilsTeams.length <= 2 || outilsMode === 'separe') { wrap.innerHTML = ''; return; }
  const teamColors = TEAM_COLORS;
  wrap.innerHTML = `<div style="font-size:11px;color:var(--gris-texte);margin-bottom:6px;">Sur le terrain :</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${outilsTeams.map((t, i) => {
        const on = outilsPair.includes(i);
        return `<button type="button" onclick="outilsToggleOnCourt(${i})" style="padding:6px 10px;border-radius:6px;border:1px solid ${on ? teamColors[i] : 'rgba(255,255,255,0.15)'};background:${on ? teamColors[i] + '22' : 'transparent'};color:${on ? teamColors[i] : 'var(--gris-texte)'};font-weight:${on ? '800' : '400'};font-size:11px;cursor:pointer;">Équipe ${i + 1}${!t.length ? ' (vide)' : ''}</button>`;
      }).join('')}
    </div>`;
}
function outilsToggleOnCourt(i) {
  if (outilsPair.includes(i)) return; // déjà sur le terrain, rien à faire
  // fait entrer l'équipe i à la place de la plus ancienne des 2 déjà sur le terrain (rotation simple)
  outilsPair = [outilsPair[1], i];
  outilsRenderPairPicker();
  outilsRenderScoreboard();
}
function outilsGoalCount(teamIndex) {
  return outilsGoals.filter(g => g.team_index === teamIndex).reduce((sum, g) => sum + (g.points != null ? g.points : 1), 0);
}
function outilsTeamScoreCard(i) {
  const teamColors = TEAM_COLORS;
  const team = outilsTeams[i] || [];
  const score = outilsGoalCount(i);
  const players = [...team].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  return `<div style="background:var(--noir);border-radius:10px;padding:10px;border:1px solid ${teamColors[i]}55;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:11px;font-weight:800;color:${teamColors[i]};">Équipe ${i + 1}</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:32px;font-weight:900;color:var(--blanc);line-height:1;">${score}</div>
        <div style="display:flex;gap:6px;justify-content:center;margin-top:4px;">
          <button type="button" onclick="outilsAddGoal(${i}, null)" style="padding:5px 12px;border:none;border-radius:6px;background:${teamColors[i]};color:#0A1628;font-weight:800;font-size:11px;cursor:pointer;">+1 but</button>
          <button type="button" onclick="outilsAddPenalty(${i})" style="padding:5px 12px;border:1px solid #e74c3c;border-radius:6px;background:transparent;color:#e74c3c;font-weight:800;font-size:11px;cursor:pointer;">−1 sanction</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${players.length ? players.map(p => {
          const nb = outilsGoals.filter(g => g.team_index === i && g.player_code === p.code && (g.points != null ? g.points : 1) > 0).length;
          return `<button type="button" onclick="outilsAddGoal(${i}, '${p.code}')" style="display:flex;align-items:center;justify-content:space-between;background:${teamColors[i]}14;border:1px solid ${teamColors[i]}33;border-radius:6px;padding:5px 8px;font-size:11px;color:var(--gris-clair);cursor:pointer;text-align:left;">
            <span>${escapeSvgText(p.name)}${p.numero ? ' <span style="font-size:0.9em;">#' + p.numero + '</span>' : ''}</span>
            <span style="font-weight:800;color:${teamColors[i]};flex-shrink:0;margin-left:6px;">${nb > 0 ? nb : ''}</span>
          </button>`;
        }).join('') : '<div style="font-size:10px;color:var(--gris-texte);text-align:center;">Équipe vide</div>'}
      </div>
    </div>`;
}
function outilsRenderScoreboard() {
  const wrap = document.getElementById('outils-scoreboard');
  if (!wrap) return;
  const grid = pair => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">${pair.map(outilsTeamScoreCard).join('')}</div>`;
  if (outilsMode === 'separe') {
    // 2 terrains en parallèle : équipes 1-2 (joueurs Éq.1) d'un côté, équipes 3-4 (joueurs Éq.2) de l'autre
    const courts = [
      { pair: [0, 1], label: 'Terrain 1 — joueurs Éq.1 entre eux' },
      { pair: [2, 3], label: 'Terrain 2 — joueurs Éq.2 entre eux' },
    ].filter(c => c.pair.some(i => (outilsTeams[i] || []).length));
    wrap.innerHTML = courts.map(c => `<div class="section-title" style="margin-top:4px;">${c.label}</div>${grid(c.pair)}`).join('');
    return;
  }
  const pair = outilsTeams.length <= 2 ? [0, 1].filter(i => i < outilsTeams.length) : outilsPair;
  wrap.innerHTML = grid(pair);
}
async function outilsAddGoal(teamIndex, playerCode) {
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/outils_goals', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ session_date: outilsCurrentDate(), team_index: teamIndex, player_code: playerCode, points: 1, created_by: coachSession ? coachSession.id : null }),
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length) outilsGoals.push(rows[0]);
    }
    outilsRenderScoreboard();
    outilsRenderTopScorers();
  } catch (e) {}
}
// Retire un point à une équipe (sanction / régulation), sans l'attribuer à un joueur en particulier
// — n'entre donc jamais dans le compteur de buts personnel d'un joueur.
async function outilsAddPenalty(teamIndex) {
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/outils_goals', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ session_date: outilsCurrentDate(), team_index: teamIndex, player_code: null, points: -1, created_by: coachSession ? coachSession.id : null }),
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length) outilsGoals.push(rows[0]);
    }
    outilsRenderScoreboard();
  } catch (e) {}
}
async function outilsUndoLastGoal() {
  if (!outilsGoals.length) return;
  const last = outilsGoals[outilsGoals.length - 1];
  try {
    await ensureCoachSession();
    await fetch(SB_URL + '/rest/v1/outils_goals?id=eq.' + last.id, { method: 'DELETE', headers: coachAuthHeaders() });
    outilsGoals.pop();
    outilsRenderScoreboard();
    outilsRenderTopScorers();
  } catch (e) {}
}
function outilsRenderTopScorers() {
  const wrap = document.getElementById('outils-topscorers');
  if (!wrap) return;
  const byPlayer = {};
  outilsGoals.forEach(g => {
    if (!g.player_code) return;
    if ((g.points != null ? g.points : 1) <= 0) return; // les sanctions ne comptent jamais dans les buts d'un joueur
    byPlayer[g.player_code] = (byPlayer[g.player_code] || 0) + 1;
  });
  const nameByCode = {};
  outilsTeams.forEach(team => team.forEach(p => { nameByCode[p.code] = p.name; }));
  const rows = Object.keys(byPlayer).map(code => ({ code, name: nameByCode[code] || code, nb: byPlayer[code] })).sort((a, b) => b.nb - a.nb || a.name.localeCompare(b.name, 'fr'));
  wrap.innerHTML = rows.length
    ? rows.map((r, i) => `<div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--noir);border-radius:6px;margin-bottom:4px;font-size:12px;">
        <span style="color:var(--gris-clair);">${i + 1}. ${escapeSvgText(r.name)}</span>
        <span style="font-weight:800;color:var(--jaune);">${r.nb} but${r.nb > 1 ? 's' : ''}</span>
      </div>`).join('')
    : '<div style="font-size:11px;color:var(--gris-texte);text-align:center;">Aucun but attribué pour l\'instant.</div>';
}

async function outilsSaveAssignment(code, teamIndex) {
  try {
    await ensureCoachSession();
    await fetch(SB_URL + '/rest/v1/outils_composition?on_conflict=session_date,player_code', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ session_date: outilsCurrentDate(), player_code: code, team_index: teamIndex, mode: outilsMode, created_by: coachSession ? coachSession.id : null }]),
    });
  } catch (e) {}
}
async function outilsRemoveAssignment(code) {
  try {
    await ensureCoachSession();
    await fetch(SB_URL + '/rest/v1/outils_composition?session_date=eq.' + outilsCurrentDate() + '&player_code=eq.' + encodeURIComponent(code), {
      method: 'DELETE', headers: coachAuthHeaders(),
    });
  } catch (e) {}
}
function outilsPick(code) {
  const idx = outilsPool.findIndex(p => p.code === code);
  if (idx === -1) return;
  const player = outilsPool.splice(idx, 1)[0];
  outilsTeams[outilsCurrentTeam].push(player);
  // aide automatique : passe à l'équipe suivante une fois le seuil atteint, reste modifiable à tout moment via les boutons Équipe
  const threshold = OUTILS_THRESHOLD[outilsNb];
  if (outilsTeams[outilsCurrentTeam].length >= threshold && outilsCurrentTeam < outilsNb - 1) {
    outilsCurrentTeam++;
  }
  outilsRenderPool();
  outilsRenderTeams();
  outilsSaveAssignment(player.code, outilsTeams.findIndex(t => t.includes(player)));
  outilsSyncToSeance();
}
function outilsUnpick(code) {
  let found = null;
  outilsTeams.forEach(team => {
    const idx = team.findIndex(p => p.code === code);
    if (idx !== -1) found = team.splice(idx, 1)[0];
  });
  if (found) {
    outilsPool.push(found);
    outilsPool.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    outilsRenderPool();
    outilsRenderTeams();
    outilsRemoveAssignment(found.code);
    outilsSyncToSeance();
  }
}

// ---------- Synchronisation de la composition vers le résumé de séance ----------
const OUTILS_SEANCE_DELIM = '\n\n---\n';
function outilsBuildSummary() {
  const nonEmpty = outilsTeams.some(t => t.length);
  if (!nonEmpty) return '';
  const modeLabel = { mixte: '', eq1: ' (joueurs Équipe 1 entre eux)', eq2: ' (joueurs Équipe 2 entre eux)', separe: ' (2 terrains : Éq.1 entre eux / Éq.2 entre eux)' }[outilsMode] || '';
  const lines = ['🎽 Composition du match de fin de séance' + modeLabel + ' :'];
  outilsTeams.forEach((team, i) => {
    const names = team.map(p => p.name + (p.postes && p.postes[0] ? ' (' + p.postes[0] + ')' : '')).join(', ');
    const g = outilsGroupOfTeam(i);
    lines.push(`Équipe ${i + 1}${outilsMode === 'separe' && g ? ' [joueurs Éq.' + g + ']' : ''} : ${names || '—'}`);
  });
  return lines.join('\n');
}
async function outilsSyncToSeance() {
  const dateInput = document.getElementById('presence-date');
  if (!dateInput || !dateInput.value) return;
  const summary = outilsBuildSummary();
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/session_notes?select=content&session_date=eq.' + dateInput.value, { headers: coachAuthHeaders() });
    let existingFreeText = '';
    if (res.ok) {
      const rows = await res.json();
      if (rows.length && rows[0].content) {
        const parts = rows[0].content.split(OUTILS_SEANCE_DELIM);
        existingFreeText = parts.length > 1 ? parts.slice(1).join(OUTILS_SEANCE_DELIM) : (parts[0].startsWith('🎽 Composition') ? '' : parts[0]);
      }
    }
    const newContent = summary ? summary + OUTILS_SEANCE_DELIM + existingFreeText : existingFreeText;
    await fetch(SB_URL + '/rest/v1/session_notes?on_conflict=session_date', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{
        session_date: dateInput.value,
        content: newContent,
        updated_by: coachSession ? coachSession.id : null,
        updated_at: new Date().toISOString(),
      }]),
    });
    if (typeof seanceDateChanged === 'function' && document.getElementById('seance-date') && document.getElementById('seance-date').value === dateInput.value) {
      seanceDateChanged();
    }
  } catch (e) {}
}



