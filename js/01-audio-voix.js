// Prépa U15 HBCCS — js/01-audio-voix.js — dernière modification : version z35 (08/11/2026)
// ===================== AUDIO =====================
let audioCtx = null;
function unlockAudio() {
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.connect(audioCtx.destination); src.start(0);
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch(e) { audioCtx = null; }
}
function beep(freq, dur, vol, delay) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = 'sine'; o.frequency.value = freq;
    const t = audioCtx.currentTime + (delay || 0);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol || 0.8, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  } catch(e) {}
}
function bip_start()  { beep(880, 0.2, 0.85); }
function bip_end()    { beep(880, 0.15, 0.75); beep(1047, 0.25, 0.85, 0.2); }
function bip_rest()   { beep(440, 0.45, 0.75); }
function bip_resume() { beep(660, 0.12, 0.75); beep(880, 0.2, 0.85, 0.18); }
function bip_alert()  { beep(660, 0.1, 0.6); }
function bip_finish() { beep(880, 0.18, 0.85); beep(1047, 0.18, 0.9, 0.25); beep(1319, 0.35, 0.9, 0.5); }

// ===================== IMAGES D'EXERCICES =====================
const IMAGE_BASE = 'images/';
// Slugs des exercices pour lesquels une image existe (a completer au fur et a mesure)
const KNOWN_IMAGES = new Set([
  'bear-hold-toucher-epaule',
  'bird-dog',
  'y-t-w',
  'squat-bulgare',
  'dead-bug',
  'planche-extension-bras-alternee',
  'hip-thrust-station-debout-sur-un-pied',
  'hip-thrust',
  'squats-sumo',
  'skater-jumps-legers',
  'mobilite-hanche-assise',
  'russian-twist-leger',
  'bear-crawl',
]);
function imageKey(text) { return audioKey(text); } // meme logique de slug que l'audio
function openImageLightbox(key) {
  if (!key) return;
  document.getElementById('img-lightbox-img').src = IMAGE_BASE + key + '.jpg';
  document.getElementById('img-lightbox-caption').textContent = '';
  const lbi = document.getElementById('img-lightbox');
  if (lbi.parentElement !== document.body) document.body.appendChild(lbi);
  lbi.classList.add('show');
}
function closeImageLightbox(e) {
  if (e && e.target.closest('.img-lightbox-inner') && !e.target.classList.contains('img-lightbox-close')) return;
  document.getElementById('img-lightbox').classList.remove('show');
}
function injectExerciseImageIcons() {
  document.querySelectorAll('.bloc li strong, .bloc-alterne li strong, .circuit-box li strong').forEach(el => {
    if (el.dataset.imgDone) return;
    el.dataset.imgDone = '1';
    const key = imageKey(el.textContent);
    if (KNOWN_IMAGES.has(key)) {
      const icon = document.createElement('span');
      icon.className = 'ex-img-icon';
      icon.textContent = '📷';
      icon.onclick = (e) => { e.stopPropagation(); openImageLightbox(key); };
      el.after(icon);
    }
  });
}

// ===================== VOIX — FICHIERS AUDIO (avec repli synthese vocale) =====================
const AUDIO_BASE = 'audio/';
const audioMissing = new Set(); // slugs already confirmes 404 cette session, evite de re-tenter a chaque fois
function audioKey(text) {
  if (!text) return '';
  let t = text.toLowerCase();
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip accents
  t = t.replace(/×/g, 'x');
  t = t.replace(/\d+/g, '');       // strip numbers (reps/seconds)
  t = t.replace(/\bx\b/g, '');     // strip standalone x rep-count marker
  t = t.replace(/\bsec\b/g, '');
  t = t.replace(/[^a-z]+/g, '-');
  t = t.replace(/^-+|-+$/g, '');
  return t;
}

// Un seul lecteur audio reutilise pour toute l'appli — plus fiable sur iOS que de creer
// un nouvel objet Audio a chaque annonce (source des soucis de sons qui ne se declenchent pas).
const sharedPlayer = new Audio();
let playToken = 0;

function playAudioOrSpeak(text) {
  if (!voiceEnabled || !text) return;
  const key = audioKey(text);
  if (!key) { speak(text); return; }
  playSequence([key], text);
}

// ===================== ANNONCES DE CIRCUIT (Tour X/Y, Serie X/Y) — un seul fichier par combinaison =====================
function playInfoAnnouncement(text) {
  if (!voiceEnabled || !text) return;
  const m = text.match(/^(.+?) — (Tour|Série) (\d+)\/(\d+)$/);
  if (!m) { playAudioOrSpeak(text); return; }
  const [, category, , x, y] = m;
  const key = audioKey(category) + '-' + x + '-sur-' + y;
  playSequence([key], text);
}

// Joue une liste de fichiers audio les uns a la suite des autres avec le lecteur partage.
// Si un morceau manque, on passe au suivant ; si tout echoue ou que rien ne s'est joue au bout
// de 4 sec (bug navigateur, fichier corrompu, etc.), on bascule sur la voix de synthese.
function playSequence(keys, fallbackText) {
  const myToken = ++playToken;
  let started = false;
  playSegment(keys, 0, fallbackText, myToken, ['m4a', 'mp3'], () => { started = true; });
  setTimeout(() => {
    if (!started && myToken === playToken) speak(fallbackText);
  }, 4000);
}
function playSegment(keys, idx, fallbackText, token, extensions, onStart) {
  if (token !== playToken) return; // une annonce plus recente a pris le relais
  if (idx >= keys.length) return;
  const key = keys[idx];
  if (audioMissing.has(key)) {
    if (idx + 1 < keys.length) playSegment(keys, idx + 1, fallbackText, token, ['m4a', 'mp3'], onStart);
    return;
  }
  if (!extensions.length) {
    audioMissing.add(key);
    if (idx + 1 < keys.length) playSegment(keys, idx + 1, fallbackText, token, ['m4a', 'mp3'], onStart);
    return;
  }
  const [ext, ...rest] = extensions;
  sharedPlayer.onerror = null;
  sharedPlayer.onended = null;
  sharedPlayer.src = AUDIO_BASE + key + '.' + ext;
  sharedPlayer.onerror = () => { if (token === playToken) playSegment(keys, idx, fallbackText, token, rest, onStart); };
  sharedPlayer.onended = () => { if (token === playToken) playSegment(keys, idx + 1, fallbackText, token, ['m4a', 'mp3'], onStart); };
  sharedPlayer.play().then(() => { if (onStart) onStart(); }).catch(() => { if (token === playToken) playSegment(keys, idx, fallbackText, token, rest, onStart); });
}


// ===================== VOIX (Web Speech API) =====================
let frVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  frVoice = voices.find(v => v.lang === 'fr-FR') || voices.find(v => v.lang && v.lang.startsWith('fr')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text) {
  if (!voiceEnabled || !text) return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    if (frVoice) u.voice = frVoice;
    u.rate = 1.02;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch(e) {}
}
function secondsToFrench(sec) {
  if (!sec) return '';
  if (sec % 60 === 0) {
    const m = sec / 60;
    return m + (m === 1 ? ' minute' : ' minutes');
  }
  return sec + ' secondes';
}
function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  appState.voiceEnabled = voiceEnabled;
  saveState();
  const btn = document.getElementById('so-voice-btn');
  if (btn) { btn.textContent = voiceEnabled ? '🔊' : '🔇'; btn.classList.toggle('off', !voiceEnabled); }
  if (voiceEnabled) playAudioOrSpeak('Voix activée');
  else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

