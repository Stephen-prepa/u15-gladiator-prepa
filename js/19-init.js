// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  try { dispInit(); } catch (e) { console.error(e); }
  applyRole();
  initInstallBanner();
  injectExerciseImageIcons();
  showHomeSessionIfToday();
  loadAppSettings();
  updateGlobalProgress();
  refreshDoneBadges();
  loadCoachSession();
  updateCoachs2TabVisibility();
  homeSyncAndLoad();
  renderCoachs2View();
  ensureCoachSession();
  checkCoachDeviceStillActive();
  const first = document.querySelector('.sg-header');
  if (first) { first.nextElementSibling.classList.add('open'); first.querySelector('.sg-chev').classList.add('open'); }

  const loginOverlay = document.getElementById('login-overlay');
  loginOverlay.style.display = 'none';
  if (!isCoachSpaceUnlocked()) {
    // Avant le 17 aout : comportement d'origine, on saute l'accueil et on entre direct dans la prepa
    enterApp('planning');
  }
  if (appState.playerCode) {
    showWhoAmI();
    sbPullCompletions(appState.playerCode).then(() => {
      refreshDoneBadges();
      updateGlobalProgress();
      flushPendingSync();
    });
  }
  document.getElementById('login-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitLoginCode();
  });
  document.getElementById('login-code').addEventListener('input', () => {
    const lnw = document.getElementById('login-name-wrap');
    if (lnw.style.display !== 'none') {
      lnw.style.display = 'none';
      lnw.dataset.mode = '';
      document.getElementById('login-name').value = '';
      document.getElementById('login-name-hint').style.display = 'none';
      document.getElementById('login-error').textContent = '';
      document.getElementById('login-btn').textContent = 'Valider';
    }
  });
    document.getElementById('login-name') && document.getElementById('login-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitLoginCode();
    });
  document.getElementById('ej-code-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitEjCode();
  });
});
