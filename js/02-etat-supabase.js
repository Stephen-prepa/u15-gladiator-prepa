// Prépa U15 HBCCS — js/02-etat-supabase.js — dernière modification : version z23 (05/11/2026)
// ===================== STATE =====================
const SK = 'hbccs_prepa_u15_v7';
let appState = {};
try { appState = JSON.parse(localStorage.getItem(SK) || '{}'); } catch(e) {}
function saveState() { try { localStorage.setItem(SK, JSON.stringify(appState)); } catch(e) {} }
function pk(key) {
  // Namespace progress keys by player code so switching codes on the same device
  // never shows another player's local progress.
  return 'p_' + (appState.playerCode || 'anon') + '__' + key;
}
let voiceEnabled = appState.voiceEnabled !== false;

// ===================== SUPABASE =====================
const SB_URL = 'https://cponudkorfxtwptwtulq.supabase.co';
const SB_KEY = 'sb_publishable_nJX25A0br_xcAsvEzUrJCg_olfuuySe';
const SB_HEADERS = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

async function sbValidateCode(code) {
  const res = await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(code) + '&select=*', { headers: SB_HEADERS });
  if (!res.ok) throw new Error('network');
  const rows = await res.json();
  return rows[0] || null;
}
async function sbClaimPlayer(code, name, deviceToken) {
  await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(code), {
    method: 'PATCH',
    headers: { ...SB_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, claimed_at: new Date().toISOString(), device_token: deviceToken }),
  }).catch(() => {});
}
function getOrCreateDeviceToken() {
  if (!appState.deviceToken) {
    appState.deviceToken = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
    saveState();
  }
  return appState.deviceToken;
}
async function sbPushCompletion(sessionId, difficulty) {
  if (!appState.playerCode) return true;
  try {
    const body = { player_code: appState.playerCode, session_id: sessionId };
    if (difficulty !== undefined) body.difficulty = difficulty || null;
    const res = await fetch(SB_URL + '/rest/v1/completions?on_conflict=player_code,session_id', {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { queuePendingSync(sessionId, difficulty); return false; }
    markSynced(sessionId);
    return true;
  } catch(e) { queuePendingSync(sessionId, difficulty); return false; }
}
function queuePendingSync(sessionId, difficulty) {
  const key = pk('pendingSync');
  const q = appState[key] || {};
  q[sessionId] = difficulty !== undefined ? difficulty : (q[sessionId] || null);
  appState[key] = q;
  saveState();
}
function markSynced(sessionId) {
  const key = pk('pendingSync');
  if (appState[key] && appState[key][sessionId] !== undefined) {
    delete appState[key][sessionId];
    saveState();
  }
}
async function flushPendingSync() {
  if (!appState.playerCode || !navigator.onLine) return;
  // 1) Rejoue les envois qui avaient echoue
  const key = pk('pendingSync');
  const q = appState[key] || {};
  for (const sessionId of Object.keys(q)) {
    await sbPushCompletion(sessionId, q[sessionId] === null ? undefined : q[sessionId]);
  }
  // 2) Filet de securite : toute seance marquee faite localement mais jamais confirmee synchronisee
  const donePrefix = pk('done_');
  const syncedKey = pk('confirmedSynced');
  const confirmed = appState[syncedKey] || {};
  for (const k of Object.keys(appState)) {
    if (!k.startsWith(donePrefix)) continue;
    const sessionId = k.slice(donePrefix.length);
    if (!confirmed[sessionId]) {
      const ok = await sbPushCompletion(sessionId);
      if (ok) { confirmed[sessionId] = true; appState[syncedKey] = confirmed; saveState(); }
    }
  }
}
async function sbPullCompletions(code) {
  try {
    const res = await fetch(SB_URL + '/rest/v1/completions?player_code=eq.' + encodeURIComponent(code) + '&select=session_id', { headers: SB_HEADERS });
    if (!res.ok) return;
    const rows = await res.json();
    const syncedKey = pk('confirmedSynced');
    const confirmed = appState[syncedKey] || {};
    rows.forEach(r => { appState[pk('done_' + r.session_id)] = true; confirmed[r.session_id] = true; });
    appState[syncedKey] = confirmed;
    saveState();
  } catch(e) {}
}

function normalizeName(s) {
  return (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function submitLoginCode() {
  const codeInput = document.getElementById('login-code');
  const nameWrap = document.getElementById('login-name-wrap');
  const nameInput = document.getElementById('login-name');
  const hintEl = document.getElementById('login-name-hint');
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  const code = codeInput.value.trim().toUpperCase();
  errEl.textContent = '';
  if (!code) { errEl.textContent = 'Entre ton code.'; return; }

  btn.disabled = true; btn.textContent = 'Vérification...';
  try {
    const player = await sbValidateCode(code);
    if (!player) {
      errEl.textContent = 'Code inconnu — vérifie auprès du coach.';
      btn.disabled = false; btn.textContent = 'Valider';
      return;
    }
    const myDeviceToken = getOrCreateDeviceToken();
    const locked = code !== 'COACHTEST' && player.claimed_at && player.device_token && player.device_token !== myDeviceToken;

    if (locked && nameWrap.dataset.mode !== 'unlock') {
      // Self-service unlock instead of a hard block: ask for the first name on file
      nameWrap.style.display = 'block';
      nameWrap.dataset.mode = 'unlock';
      hintEl.style.display = 'block';
      hintEl.textContent = "Ce code est déjà utilisé sur un autre appareil. Si c'est bien toi (nouveau téléphone, appli réinstallée...), confirme ton prénom pour le débloquer ici :";
      btn.textContent = 'Redébloquer';
      btn.disabled = false;
      nameInput.value = '';
      nameInput.focus();
      return;
    }
    if (locked && nameWrap.dataset.mode === 'unlock') {
      const entered = normalizeName(nameInput.value);
      if (!entered || entered !== normalizeName(player.name)) {
        errEl.textContent = 'Prénom incorrect — demande à ton coach de réinitialiser ce code.';
        btn.disabled = false; btn.textContent = 'Redébloquer';
        return;
      }
      await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(code), {
        method: 'PATCH',
        headers: { ...SB_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_token: myDeviceToken }),
      }).catch(() => {});
      appState.playerName = player.name;
      appState.playerCode = code;
      nameWrap.dataset.mode = '';
      hintEl.style.display = 'none';
      saveState();
      sbSyncRole(appState.role || 'joueur');
      await sbPullCompletions(code);
      document.getElementById('login-overlay').style.display = 'none';
      refreshDoneBadges();
      updateGlobalProgress();
      showWhoAmI();
      handlePendingHomeLaunch();
      return;
    }
    if (!player.claimed_at && nameWrap.style.display === 'none') {
      // First time with this code: ask for a first name
      nameWrap.style.display = 'block';
      nameWrap.dataset.mode = 'claim';
      btn.textContent = 'Confirmer';
      btn.disabled = false;
      nameInput.focus();
      return;
    }
    if (!player.claimed_at) {
      const name = nameInput.value.trim();
      if (!name) { errEl.textContent = 'Entre ton prénom.'; btn.disabled = false; btn.textContent = 'Confirmer'; return; }
      await sbClaimPlayer(code, name, myDeviceToken);
      appState.playerName = name;
    } else if (!player.device_token) {
      // Deja revendique avant l'ajout du verrouillage : on adopte cet appareil comme reference
      await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(code), {
        method: 'PATCH',
        headers: { ...SB_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_token: myDeviceToken }),
      }).catch(() => {});
      appState.playerName = player.name;
    } else {
      appState.playerName = player.name;
    }
    appState.playerCode = code;
    saveState();
    sbSyncRole(appState.role || 'joueur');
    await sbPullCompletions(code);
    document.getElementById('login-overlay').style.display = 'none';
    refreshDoneBadges();
    updateGlobalProgress();
    showWhoAmI();
    handlePendingHomeLaunch();
  } catch(e) {
    errEl.textContent = 'Connexion impossible — réessaie (vérifie ta connexion internet).';
    btn.disabled = false; btn.textContent = 'Valider';
  }
}
function refreshDoneBadges() {
  // Clear all badges first so a previous player's progress never leaks visually
  document.querySelectorAll('.seance-done-badge.show').forEach(b => b.classList.remove('show'));
  const prefix = pk('done_');
  Object.keys(appState).forEach(k => {
    if (k.startsWith(prefix)) {
      const badge = document.getElementById('done-' + k.slice(prefix.length));
      if (badge) badge.classList.add('show');
    }
  });
}
function showWhoAmI() {
  const el = document.getElementById('whoami');
  if (!el) return;
  if (appState.playerCode) {
    el.style.display = 'block';
    document.getElementById('whoami-name').textContent = appState.playerName || appState.playerCode;
  } else {
    el.style.display = 'none';
  }
  updateCoachTabVisibility();
}
function logoutPlayer() {
  if (!confirm('Se déconnecter ? Tu devras retaper ton code pour revenir.')) return;
  delete appState.playerCode;
  delete appState.playerName;
  saveState();
  showWhoAmI();
  refreshDoneBadges();
  updateGlobalProgress();
  document.getElementById('login-code').value = '';
  const lnw = document.getElementById('login-name-wrap');
  lnw.style.display = 'none';
  lnw.dataset.mode = '';
  document.getElementById('login-name').value = '';
  document.getElementById('login-name-hint').style.display = 'none';
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-btn').textContent = 'Valider';
  document.getElementById('login-overlay').style.display = 'flex';
}

let sessionId = null, sessionSteps = [], currentStepIdx = 0;
let currentImageKey = '';
let stepRemaining = 0, globalRemaining = 0, isPaused = false;
let mainInterval = null, globalInterval = null;
let stepStartTime = null, stepDuration = 0;
let globalStartTime = null, globalDuration = 0;
let pausedStepRemaining = 0, pausedGlobalRemaining = 0;

