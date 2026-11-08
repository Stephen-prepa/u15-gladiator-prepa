// Prépa U15 HBCCS — js/00-version.js — dernière modification : version z40 (08/11/2026)
// ===================== VERSION DE L'APPLICATION =====================
// Source unique du numéro de version, affiché en bas à droite de l'accueil.
// À modifier à chaque livraison (règles dans LISEZ-MOI.md).
const APP_VERSION = 'z40';
const APP_VERSION_DATE = '08/11/2026';
(function () {
  document.querySelectorAll('.app-version').forEach(function (el) {
    el.textContent = 'Version ' + APP_VERSION + ' · ' + APP_VERSION_DATE;
    el.title = "Version de l'application";
  });
})();
