// Prépa U15 HBCCS — js/04-moteur-seance.js — dernière modification : version z23 (05/11/2026)
// ===================== SESSION ENGINE =====================
// ===================== WAKE LOCK (empeche l'ecran de se verrouiller pendant une seance) =====================
let wakeLock = null;
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return; // navigateur trop ancien -> pas de crash, juste pas de wake lock
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) { /* refuse (ex: batterie faible) -> tant pis, pas bloquant */ }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  // Si l'ecran se rallume (onglet revient au premier plan) pendant une seance en cours, on reprend le wake lock
  if (document.visibilityState === 'visible' && sessionId && !wakeLock) {
    acquireWakeLock();
  }
});

// Lance une séance depuis l'écran d'accueil (avant login) : impose la connexion
// par code joueur d'abord, pour que la séance soit bien rattachée et suivie côté coach.
let pendingHomeLaunch = null;
function launchHomeSessionSM1() {
  if (!appState.playerCode) {
    pendingHomeLaunch = 'SM1';
    document.getElementById('login-overlay').style.display = 'flex';
    return;
  }
  launchSession('SM1');
}
function launchHomeSessionSM2() {
  if (!appState.playerCode) {
    pendingHomeLaunch = 'SM2';
    document.getElementById('login-overlay').style.display = 'flex';
    return;
  }
  launchSession('SM2');
}
function handlePendingHomeLaunch() {
  if (!pendingHomeLaunch) return;
  const sid = pendingHomeLaunch;
  pendingHomeLaunch = null;
  launchSession(sid);
}
function launchSession(sid) {
  unlockAudio();
  acquireWakeLock();
  document.getElementById('so-difficulty').style.display = 'none';
  const cfg = buildSessions(appState.role || 'joueur')[sid];
  if (!cfg) return;
  sessionId = sid;
  sessionSteps = cfg.steps;
  currentStepIdx = appState[pk('resume_'+sid)] || 0;
  globalRemaining = appState[pk('global_'+sid)] || cfg.duration;
  isPaused = false;

  document.getElementById('so-title').textContent = cfg.name;
  document.getElementById('session-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  document.getElementById('so-pause-btn').textContent = '⏸ Pause';
  document.getElementById('so-pause-btn').classList.remove('paused');
  document.getElementById('so-pause-overlay').classList.remove('show');
  const vbtn = document.getElementById('so-voice-btn');
  if (vbtn) { vbtn.textContent = voiceEnabled ? '🔊' : '🔇'; vbtn.classList.toggle('off', !voiceEnabled); }

  buildDots();
  runStep();
  startGlobalTimer();
}

function buildDots() {
  const exoCount = sessionSteps.filter(s => s.type === 'exo').length;
  document.getElementById('so-dots').innerHTML = Array.from({length:exoCount}, (_,i) =>
    '<div class="so-dot" id="sdot-'+i+'"></div>').join('');
}

function updateDots() {
  const doneExo = sessionSteps.slice(0, currentStepIdx).filter(s => s.type === 'exo').length;
  sessionSteps.filter(s => s.type === 'exo').forEach((_, i) => {
    const d = document.getElementById('sdot-'+i);
    if (d) d.className = 'so-dot' + (i < doneExo ? ' done' : i === doneExo ? ' current' : '');
  });
}

function runStep() {
  if (currentStepIdx >= sessionSteps.length) { finishSession(); return; }
  const step = sessionSteps[currentStepIdx];
  stepDuration = step.duration;
  // Pour un exercice : on annonce tout de suite, mais le vrai decompte ne demarre
  // que 3 sec plus tard (le temps d'entendre le nom et de se mettre en position).
  const prepDelay = (step.type === 'exo' && !step.silent && !step.noDelay) ? 5 : 0;
  stepStartTime = Date.now() + prepDelay * 1000;
  stepRemaining = step.duration;

  if (step.type === 'exo') {
    if (!step.silent) playAudioOrSpeak(step.name);
    if (step.announceDuration) setTimeout(() => speak(secondsToFrench(step.announceDuration)), 900);
    if (prepDelay) setTimeout(bip_start, prepDelay * 1000); else bip_start();
  }
  else if (step.type === 'repos') {
    bip_rest();
    if (!step.silent) playAudioOrSpeak(step.name);
    if (step.announceDuration) setTimeout(() => speak(secondsToFrench(step.announceDuration)), 900);
  }
  else if (step.type === 'retour') { bip_rest(); playAudioOrSpeak(step.name); }
  else if (step.type === 'fond') { playAudioOrSpeak(step.name); }
  else if (step.type === 'info') { step.audioKey ? playSequence([step.audioKey], step.name) : playInfoAnnouncement(step.name); }
  else if (step.type === 'trans') { bip_rest(); }

  currentImageKey = step.type === 'exo' ? imageKey(step.name) : '';
  const imgEl = document.getElementById('so-img');
  if (imgEl) {
    if (currentImageKey && KNOWN_IMAGES.has(currentImageKey)) {
      imgEl.src = IMAGE_BASE + currentImageKey + '.jpg';
      imgEl.alt = step.name;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
      imgEl.src = '';
    }
  }

  renderStep(step);
  updateDots();

  if (mainInterval) clearInterval(mainInterval);
  let lastAlerted = -1;
  mainInterval = setInterval(() => {
    if (isPaused) return;
    // Calculate remaining using wall clock — survives sleep/background
    const elapsed = Math.floor((Date.now() - stepStartTime) / 1000);
    stepRemaining = elapsed < 0 ? stepDuration : Math.max(0, stepDuration - elapsed);

    // Alert beeps at 3,2,1
    if (stepRemaining <= 3 && stepRemaining > 0 && stepRemaining !== lastAlerted &&
        (step.type === 'exo' || step.type === 'repos' || step.type === 'fond' || step.type === 'retour')) {
      bip_alert();
      lastAlerted = stepRemaining;
    }
    if (stepRemaining <= 0) {
      clearInterval(mainInterval);
      if (step.type === 'exo') bip_end();
      else if (step.type === 'repos') bip_resume();
      currentStepIdx++;
      appState[pk('resume_'+sessionId)] = currentStepIdx;
      saveState();
      setTimeout(runStep, 350);
    } else {
      document.getElementById('so-time').textContent = fmt(stepRemaining);
      document.getElementById('so-cd-fill').style.width = (stepRemaining / stepDuration * 100) + '%';
    }
  }, 250); // Check every 250ms for responsiveness after wake
}

function renderStep(step) {
  const phaseEl = document.getElementById('so-phase');
  const exEl = document.getElementById('so-exercise');
  const detEl = document.getElementById('so-detail');
  const timeEl = document.getElementById('so-time');
  const fillEl = document.getElementById('so-cd-fill');
  const nextEl = document.getElementById('so-next-ex');
  const infoEl = document.getElementById('so-bloc-info');
  const progEl = document.getElementById('so-prog-fill');

  const phaseMap = {exo:'EXERCICE',repos:'REPOS',trans:'TRANSITION',info:'PROCHAINE ETAPE',fond:'CARDIO',retour:'RETOUR AU CALME'};
  phaseEl.className = 'so-phase ' + (step.type === 'repos' || step.type === 'retour' ? 'repos' : step.type === 'trans' ? 'transition' : step.type === 'info' ? 'transition' : 'exercice');
  phaseEl.textContent = phaseMap[step.type] || 'EXERCICE';

  exEl.className = 'so-exercise' + (step.type === 'repos' || step.type === 'retour' ? ' rest-ex' : step.type === 'trans' || step.type === 'info' ? ' trans-ex' : '');
  exEl.textContent = step.name;
  detEl.textContent = step.detail || '';

  timeEl.className = 'so-time' + (step.type === 'repos' || step.type === 'retour' ? ' repos' : step.type === 'trans' ? ' trans' : '');
  timeEl.textContent = fmt(step.duration);

  fillEl.className = 'so-cd-fill ' + (step.type === 'repos' || step.type === 'retour' ? 'rest' : step.type === 'trans' ? 'trans' : 'ex');
  fillEl.style.width = '100%';

  const next = sessionSteps[currentStepIdx + 1];
  nextEl.textContent = next ? next.name : 'Fin de séance !';

  const exoIdx = sessionSteps.slice(0, currentStepIdx + 1).filter(s => s.type === 'exo').length;
  const totalExo = sessionSteps.filter(s => s.type === 'exo').length;
  infoEl.textContent = 'Étape ' + (currentStepIdx+1) + '/' + sessionSteps.length + ' · ' + exoIdx + '/' + totalExo + ' exercices';
  progEl.style.width = Math.round(currentStepIdx / sessionSteps.length * 100) + '%';
}

function fmt(secs) {
  return String(Math.floor(secs/60)).padStart(2,'0') + ':' + String(secs%60).padStart(2,'0');
}

function startGlobalTimer() {
  if (globalInterval) clearInterval(globalInterval);
  globalDuration = globalRemaining;
  globalStartTime = Date.now();
  document.getElementById('so-global-time').textContent = fmt(Math.max(0, globalRemaining));
  globalInterval = setInterval(() => {
    if (isPaused) return;
    const elapsed = Math.floor((Date.now() - globalStartTime) / 1000);
    globalRemaining = Math.max(0, globalDuration - elapsed);
    appState[pk('global_'+sessionId)] = globalRemaining;
    document.getElementById('so-global-time').textContent = fmt(globalRemaining);
    if (globalRemaining <= 0) clearInterval(globalInterval);
  }, 500);
}

function togglePause() {
  unlockAudio();
  isPaused = !isPaused;
  if (isPaused) {
    // Save remaining at pause
    pausedStepRemaining = stepRemaining;
    pausedGlobalRemaining = globalRemaining;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } else {
    // Recalculate start times so wall-clock is correct on resume
    stepStartTime = Date.now() - ((stepDuration - pausedStepRemaining) * 1000);
    globalStartTime = Date.now() - ((globalDuration - pausedGlobalRemaining) * 1000);
    bip_resume();
  }
  const btn = document.getElementById('so-pause-btn');
  btn.textContent = isPaused ? '▶ Reprendre' : '⏸ Pause';
  btn.classList.toggle('paused', isPaused);
  document.getElementById('so-pause-overlay').classList.toggle('show', isPaused);
}

function skipStep() {
  if (mainInterval) clearInterval(mainInterval);
  currentStepIdx++;
  appState[pk('resume_'+sessionId)] = currentStepIdx;
  saveState();
  stepStartTime = Date.now();
  runStep();
}
function rewindStep() {
  if (currentStepIdx <= 0) return; // deja au tout debut
  if (mainInterval) clearInterval(mainInterval);
  currentStepIdx--;
  appState[pk('resume_'+sessionId)] = currentStepIdx;
  saveState();
  stepStartTime = Date.now();
  runStep();
  // Le chrono global de la seance continue de tourner normalement : reculer ne le remet pas
  // a zero, donc revenir en arriere peut naturellement rallonger la duree totale de la seance.
}
function restartSession() {
  if (!confirm('Revenir au tout debut de la seance ?')) return;
  if (mainInterval) clearInterval(mainInterval);
  currentStepIdx = 0;
  appState[pk('resume_'+sessionId)] = 0;
  saveState();
  stepStartTime = Date.now();
  runStep();
}

function quitSession() {
  if (mainInterval) clearInterval(mainInterval);
  if (globalInterval) clearInterval(globalInterval);
  isPaused = false;
  releaseWakeLock();
  document.getElementById('so-difficulty').style.display = 'none';
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  document.getElementById('session-overlay').classList.remove('active');
  document.getElementById('so-pause-overlay').classList.remove('show');
  document.body.style.overflow = '';
  sessionId = null;
}

function finishSession() {
  if (mainInterval) clearInterval(mainInterval);
  if (globalInterval) clearInterval(globalInterval);
  releaseWakeLock();
  bip_finish();
  playAudioOrSpeak('Séance terminée, bravo !');

  document.getElementById('so-phase').className = 'so-phase termine';
  document.getElementById('so-phase').textContent = 'TERMINÉ !';
  document.getElementById('so-exercise').className = 'so-exercise';
  document.getElementById('so-exercise').style.color = 'var(--vert)';
  document.getElementById('so-exercise').textContent = '🎉 Séance terminée !';
  document.getElementById('so-detail').textContent = 'Bravo !';
  document.getElementById('so-time').className = 'so-time fin';
  document.getElementById('so-time').textContent = '✓';
  document.getElementById('so-cd-fill').style.width = '0%';
  document.getElementById('so-prog-fill').style.width = '100%';
  document.getElementById('so-next-ex').textContent = '—';

  appState[pk('done_'+sessionId)] = true;
  delete appState[pk('resume_'+sessionId)];
  delete appState[pk('global_'+sessionId)];
  saveState();
  sbPushCompletion(sessionId); // synchro immediate (filet de securite si le joueur quitte avant de noter)

  const badge = document.getElementById('done-'+sessionId);
  if (badge) badge.classList.add('show');
  updateGlobalProgress();

  setTimeout(() => {
    document.getElementById('so-difficulty').style.display = 'block';
  }, 1500);
}
function submitDifficulty(level) {
  document.getElementById('so-difficulty').style.display = 'none';
  sbPushCompletion(sessionId, level); // upsert : complete la note sur la ligne deja envoyee
  document.getElementById('so-detail').textContent = level ? 'Merci !' : 'Bravo !';
  setTimeout(() => {
    document.getElementById('session-overlay').classList.remove('active');
    document.body.style.overflow = '';
    sessionId = null;
  }, 900);
}

// ===================== NAVIGATION =====================
function goToSeance(sid) {
  switchTab('seances', null);
  setTimeout(() => {
    const el = document.getElementById('seance-'+sid);
    if (!el) return;
    const sgBody = el.closest('.sg-body');
    if (sgBody && !sgBody.classList.contains('open')) {
      sgBody.classList.add('open');
      sgBody.previousElementSibling.querySelector('.sg-chev').classList.add('open');
    }
    const sb = el.querySelector('.seance-body');
    if (sb && !sb.classList.contains('open')) {
      sb.classList.add('open');
      el.querySelector('.schev').classList.add('open');
    }
    el.scrollIntoView({behavior:'smooth', block:'start'});
  }, 100);
}

// ===================== INSTALL BANNER =====================
let deferredInstallPrompt = null;
const IB_DISMISS_KEY = 'u15hbccs_install_dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
function isSafari() {
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallBanner('android');
});

function showInstallBanner(platform) {
  if (isStandalone()) return;
  if (localStorage.getItem(IB_DISMISS_KEY)) return;
  const banner = document.getElementById('install-banner');
  const title = document.getElementById('ib-title');
  const sub = document.getElementById('ib-sub');
  const btn = document.getElementById('ib-btn');
  if (platform === 'ios-safari') {
    title.textContent = "Installe l'appli sur ton téléphone";
    sub.textContent = "Accès en un tap, comme une vraie appli";
    btn.textContent = 'Voir comment';
    btn.onclick = () => { document.getElementById('ios-install-guide').classList.add('show'); };
  } else {
    title.textContent = "Installe l'appli sur ton téléphone";
    sub.textContent = "Accès en un tap, comme une vraie appli";
    btn.textContent = 'Installer';
    btn.onclick = async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') dismissInstallBanner();
      deferredInstallPrompt = null;
    };
  }
  banner.style.display = 'flex';
}
function dismissInstallBanner() {
  document.getElementById('install-banner').style.display = 'none';
  localStorage.setItem(IB_DISMISS_KEY, '1');
}
function closeIosGuide() {
  document.getElementById('ios-install-guide').classList.remove('show');
}

function initInstallBanner() {
  if (isStandalone()) return;
  if (isIos() && isSafari()) {
    showInstallBanner('ios-safari');
  }
  // Android/Chrome case is handled by the beforeinstallprompt listener above
}

