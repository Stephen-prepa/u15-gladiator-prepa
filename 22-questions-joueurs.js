// Prépa U15 HBCCS — js/22-questions-joueurs.js — dernière modification : version z28c (06/11/2026)
// ===================== QUESTIONS DES JOUEURS =====================
// Table Supabase questions_joueurs. Le joueur pose sa question via la fonction serveur poser_question(code, texte)
// (elle vérifie le code joueur ; max 3 questions en attente). Le coach valide, répond (texte, lien YouTube, schéma animé)
// et publie. Les joueurs ne voient que les questions publiées, SANS nom ni code (colonnes non lisibles côté public).

let qjPublic = [];          // questions publiées (côté joueur)
let qjAdmin = [];           // toutes les questions (côté coach)
let qjLoadedOk = false;

function qjEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
// Accepte uniquement un vrai lien YouTube ; renvoie l'adresse nettoyée ou ''.
function qjYoutube(u) {
  u = String(u || '').trim(); if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { const x = new URL(u); const h = x.hostname.replace(/^www\.|^m\./, ''); if (h === 'youtube.com' || h === 'youtu.be' || h === 'youtube-nocookie.com') return x.href; } catch (e) {}
  return '';
}

// ---------------------------------------------------------------- Côté joueur
async function qjLoad() {
  try {
    const res = await fetch(SB_URL + '/rest/v1/questions_joueurs?select=id,question,answer_text,answer_youtube,answer_title,answer_drawings,published_at&status=eq.publiee&order=published_at.desc&limit=100', { headers: SB_HEADERS });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    qjPublic = await res.json(); qjLoadedOk = true;
  } catch (e) { qjLoadedOk = false; }
  qjRender();
}
function qjRender() {
  const el = document.getElementById('ej-c-questions'); if (!el) return;
  const ask = appState && appState.playerCode
    ? `<div class="qj-ask"><textarea id="qj-text" maxlength="300" rows="2" placeholder="Pose ta question au coach (elle sera relue avant publication)…"></textarea><button type="button" onclick="qjAsk()">Envoyer ma question</button><div id="qj-msg" class="qj-msg"></div></div>`
    : `<div class="qj-msg" style="text-align:left;margin-bottom:10px;">Pour poser une question, ouvre l'appli avec ton code joueur.</div>`;
  const list = qjPublic.length ? qjPublic.map(q => {
    const yt = qjYoutube(q.answer_youtube);
    const nd = (q.answer_drawings || []).length;
    return `<div class="qj-card"><div class="qj-q">❓ ${qjEsc(q.question)}</div>
      ${q.answer_text ? `<div class="qj-a">${qjEsc(q.answer_text).replace(/\n/g, '<br>')}</div>` : ''}
      <div class="qj-links">${nd ? `<button type="button" onclick="qjPlay('${q.id}')">▶ ${qjEsc(q.answer_title || 'Voir le schéma')}</button>` : ''}${yt ? `<a href="${qjEsc(yt)}" target="_blank" rel="noopener noreferrer">▶ Voir la vidéo</a>` : ''}</div></div>`;
  }).join('') : `<div class="qj-msg">${qjLoadedOk ? 'Aucune question publiée pour le moment.' : 'Contenu indisponible (connexion ?).'}</div>`;
  el.innerHTML = ask + list;
}
function qjPlay(id) { const q = qjPublic.find(x => x.id === id); if (q) ejcPlay(q.answer_title || 'Schéma', q.answer_drawings); }
async function qjAsk() {
  const t = document.getElementById('qj-text'), msg = document.getElementById('qj-msg');
  const txt = (t.value || '').trim();
  if (txt.length < 3) { msg.style.color = '#e74c3c'; msg.textContent = 'Écris ta question (3 caractères minimum).'; return; }
  msg.style.color = 'var(--gris-texte)'; msg.textContent = 'Envoi…';
  try {
    const res = await fetch(SB_URL + '/rest/v1/rpc/poser_question', { method: 'POST', headers: { ...SB_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_code: appState.playerCode, p_question: txt }) });
    if (!res.ok) { const e = await res.text(); throw new Error(e); }
    t.value = ''; msg.style.color = 'var(--vert)'; msg.textContent = '✓ Question envoyée. Le coach la lira avant de la publier.';
  } catch (e) {
    msg.style.color = '#e74c3c';
    msg.textContent = /trop de questions/.test(String(e.message)) ? 'Tu as déjà 3 questions en attente : patiente que le coach y réponde.' : 'Envoi impossible — réessaie.';
  }
}

// ---------------------------------------------------------------- Côté coach (Réglages › Questions)
async function qjAdminLoad() {
  const el = document.getElementById('qj-admin'); if (!el) return;
  el.innerHTML = '<div style="color:var(--gris-texte);font-size:12px;">Chargement…</div>';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/questions_joueurs?select=*&order=created_at.desc&limit=200', { headers: coachAuthHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    qjAdmin = await res.json();
  } catch (e) { el.innerHTML = '<div style="color:#e74c3c;font-size:12px;">Impossible de charger (connecte-toi en coach puis rouvre).</div>'; return; }
  qjAdminRender();
}
function qjAdminRender() {
  const el = document.getElementById('qj-admin'); if (!el) return;
  const nb = qjAdmin.filter(q => q.status === 'en_attente').length;
  const badge = document.getElementById('qj-badge'); if (badge) badge.textContent = nb ? ' · ' + nb + ' en attente' : '';
  qjPending = nb; qjAlertShow();
  const lbl = { en_attente: '🟡 En attente', publiee: '🟢 Publiée', rejetee: '⚪ Rejetée' };
  const schemas = (typeof schEnsure === 'function') ? (schEnsure(), (schDemo || [])) : [];
  const add = `<div class="ej-row"><input type="text" class="ej-title-input" id="qj-new" maxlength="300" placeholder="Poser une question toi-même (coach)…" style="flex:1 1 70%"><button type="button" class="disp-mini" onclick="qjAdminNew()">Ajouter</button></div>`;
  el.innerHTML = add + (qjAdmin.length ? qjAdmin.map(q => `<div class="qj-adm" data-id="${q.id}">
    <div class="qj-adm-h"><b>${qjEsc(q.question)}</b><small>${lbl[q.status] || q.status} · ${q.player_name ? '👤 ' + qjEsc(q.player_name) + ' (réponse affichée anonymement)' : 'posée par le coach'}</small></div>
    <textarea id="qja-t-${q.id}" rows="2" maxlength="1500" placeholder="Réponse écrite">${qjEsc(q.answer_text || '')}</textarea>
    <input type="text" id="qja-y-${q.id}" class="ej-title-input" placeholder="Lien YouTube (optionnel)" value="${qjEsc(q.answer_youtube || '')}">
    <select id="qja-s-${q.id}" class="ej-title-input"><option value="">Pas de schéma</option>${q.answer_drawings ? `<option value="__keep" selected>Garder le schéma actuel${q.answer_title ? ' : ' + qjEsc(q.answer_title) : ''}</option>` : ''}${schemas.map((s, i) => (s.drawings || []).length ? `<option value="${i}">${qjEsc(s.name)}</option>` : '').join('')}</select>
    <div class="qj-btns"><button type="button" class="disp-mini" onclick="qjAdminSave('${q.id}','publiee')">${q.status === 'publiee' ? 'Mettre à jour' : '✓ Publier'}</button>${q.status !== 'en_attente' ? `<button type="button" class="disp-mini" onclick="qjAdminSave('${q.id}','en_attente')">Remettre en attente</button>` : ''}${q.status !== 'rejetee' ? `<button type="button" class="disp-mini" onclick="qjAdminSave('${q.id}','rejetee')">Rejeter</button>` : ''}<button type="button" class="disp-mini" onclick="qjAdminDel('${q.id}')">Supprimer</button></div></div>`).join('') : '<div style="color:var(--gris-texte);font-size:12px;margin-top:8px;">Aucune question pour le moment.</div>');
}
async function qjAdminNew() {
  const i = document.getElementById('qj-new'), txt = (i.value || '').trim();
  if (txt.length < 3) return;
  try {
    await ensureCoachSession();
    const r = await fetch(SB_URL + '/rest/v1/questions_joueurs', { method: 'POST', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify([{ question: txt }]) });
    if (!r.ok) throw new Error();
    await qjAdminLoad();
  } catch (e) { alert('Erreur — réessaie.'); }
}
async function qjAdminSave(id, status) {
  const q = qjAdmin.find(x => x.id === id); if (!q) return;
  const raw = document.getElementById('qja-y-' + id).value.trim(), yt = qjYoutube(raw);
  if (raw && !yt) { alert('Ce lien n’est pas un lien YouTube.'); return; }
  const sel = document.getElementById('qja-s-' + id).value;
  const f = { status, answer_text: document.getElementById('qja-t-' + id).value.trim() || null, answer_youtube: yt || null };
  if (sel === '') { f.answer_drawings = null; f.answer_title = null; }
  else if (sel !== '__keep') { const s = schDemo[parseInt(sel, 10)]; if (s) { f.answer_drawings = JSON.parse(JSON.stringify(s.drawings)); f.answer_title = s.name || 'Schéma'; } }
  if (status === 'publiee') {
    if (!f.answer_text && !f.answer_youtube && !(f.answer_drawings || (sel === '__keep' && q.answer_drawings))) { alert('Ajoute une réponse (texte, vidéo ou schéma) avant de publier.'); return; }
    f.published_at = new Date().toISOString();
  }
  try {
    await ensureCoachSession();
    const r = await fetch(SB_URL + '/rest/v1/questions_joueurs?id=eq.' + id, { method: 'PATCH', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    if (!r.ok) throw new Error();
    await qjAdminLoad();
  } catch (e) { alert('Erreur — réessaie.'); }
}
async function qjAdminDel(id) {
  if (!confirm('Supprimer cette question ?')) return;
  try {
    await ensureCoachSession();
    const r = await fetch(SB_URL + '/rest/v1/questions_joueurs?id=eq.' + id, { method: 'DELETE', headers: coachAuthHeaders() });
    if (!r.ok) throw new Error();
    qjAdmin = qjAdmin.filter(x => x.id !== id); qjAdminRender();
  } catch (e) { alert('Erreur — réessaie.'); }
}

// ---------------------------------------------------------------- Alerte coach : questions en attente
let qjPending = 0;
async function qjAlertTick() {
  if (typeof coachSession === 'undefined' || !coachSession || document.hidden) return;
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/questions_joueurs?select=id&status=eq.en_attente', { headers: coachAuthHeaders() });
    if (!res.ok) return;
    qjPending = (await res.json()).length;
  } catch (e) { return; }
  qjAlertShow();
}
function qjAlertShow() {
  const n = qjPending;
  // Pastille sur l'onglet Réglages
  const tab = document.getElementById('cs-subtab-reglages');
  if (tab) {
    let b = tab.querySelector('.qj-dot');
    if (n && !b) { b = document.createElement('span'); b.className = 'qj-dot'; tab.style.position = 'relative'; tab.appendChild(b); }
    if (b) { b.textContent = n || ''; b.style.display = n ? 'flex' : 'none'; }
  }
  // Bannière en haut de l'accueil coach
  const box = document.getElementById('cs-box-dashboard');
  if (!box) return;
  let a = document.getElementById('qj-alert');
  if (!n) { if (a) a.style.display = 'none'; return; }
  if (!a) { a = document.createElement('button'); a.type = 'button'; a.id = 'qj-alert'; a.onclick = qjAlertOpen; box.insertBefore(a, box.firstChild); }
  a.style.display = 'block';
  a.textContent = '❓ ' + n + ' question' + (n > 1 ? 's' : '') + ' de joueur' + (n > 1 ? 's' : '') + ' à valider — appuie pour répondre';
}
function qjAlertOpen() {
  coachSubtabSwitch('reglages');
  const d = document.getElementById('qj-box');
  if (d) { d.open = true; qjAdminLoad(); setTimeout(() => d.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }
}
setInterval(qjAlertTick, 60000);
setTimeout(qjAlertTick, 3000);

ejRegister({ id: 'questions', title: '❓ Questions / réponses', desc: 'Poser une question au coach, réponses publiées (anonymes)', box: 'ej-mod-questions', titleEl: 'ej-mod-questions-title' });
ejModulesRenderUi();
ejApplyLayout();
