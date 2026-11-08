// Prépa U15 HBCCS — js/21-contenus-joueurs.js — dernière modification : version z32 (06/11/2026)
// ===================== CONTENUS PUBLIÉS AUX JOUEURS (lecture seule) =====================
// Le coach « publie » une COPIE d'un schéma ou d'une séance dans la table Supabase contenus_joueurs.
// Les joueurs ne lisent que ces copies (jamais la bibliothèque du coach). Modifier l'original ne change
// rien pour les joueurs tant qu'on ne republie pas.
// Rubriques : 'seance' (Séance du jour), 'enclenchements' (Enclenchements d'attaque), 'fonctionnement' (Fonctionnement).

const EJC_RUBS = {
  seance: 'Séance du jour',
  enclenchements: "Enclenchements d'attaque",
  fonctionnement: 'Fonctionnement',
};
let ejcItems = [];          // contenus visibles (côté joueur) ou tous (côté coach, Réglages)
let ejcLoadedOk = false;

function ejcEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function ejcDate(iso) { try { return new Date(iso).toLocaleDateString('fr-FR'); } catch (e) { return ''; } }

// ---------------------------------------------------------------- Côté joueur : lecture
async function ejcLoad() {
  try {
    const res = await fetch(SB_URL + '/rest/v1/contenus_joueurs?select=id,kind,rubrique,title,payload,sort_order,published_at&order=published_at.desc&limit=200', { headers: SB_HEADERS });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ejcItems = await res.json(); ejcLoadedOk = true;
  } catch (e) { ejcLoadedOk = false; }
  ejcRender();
}
function ejcRender() {
  Object.keys(EJC_RUBS).forEach(rub => {
    const el = document.getElementById('ej-c-' + rub); if (!el) return;
    const list = ejcItems.filter(x => x.rubrique === rub);
    if (!list.length) { el.innerHTML = `<div style="text-align:center;padding:14px;color:var(--gris-texte);font-size:12px;">${ejcLoadedOk ? 'Rien de publié pour le moment.' : 'Contenu indisponible (connexion ?).'}</div>`; return; }
    el.innerHTML = list.map(x => {
      const n = x.kind === 'seance' ? ejcExCount(x.payload) : ((x.payload && x.payload.drawings) || []).length;
      const sub = x.kind === 'seance' ? `${n} exercice${n > 1 ? 's' : ''}` : `${n} étape${n > 1 ? 's' : ''}`;
      const th = ejcThumb(x);
      return `<button type="button" class="ejc-card" onclick="ejcOpen('${x.id}')">${th ? `<span class="ejc-th">${th}</span>` : `<span class="ejc-ic">${x.kind === 'seance' ? '📋' : '▶'}</span>`}<span class="ejc-t"><b>${ejcEsc(x.title)}</b><small>${sub} · publié le ${ejcDate(x.published_at)}</small></span></button>`;
    }).join('');
  });
}
// Miniature : première étape du schéma (ou du premier exercice illustré d'une séance)
function ejcThumb(x) {
  try {
    let d = null;
    if (x.kind === 'schema') d = x.payload && x.payload.drawings && x.payload.drawings[0];
    else ((x.payload && x.payload.blocks) || []).some(b => (b.exercises || []).some(e => (d = e.drawings && e.drawings[0])));
    return d && typeof schDrawingSvg === 'function' ? schDrawingSvg(d, { showBallStart: false }) : '';
  } catch (e) { return ''; }
}
function ejcExCount(p) { return ((p && p.blocks) || []).reduce((s, b) => s + (b.exercises || []).length, 0); }
function ejcOpen(id) {
  const x = ejcItems.find(i => i.id === id); if (!x) return;
  // Consultation enregistrée pour le coach (une ouverture = une lecture ; discret, sans message au joueur)
  if (appState && appState.playerCode && typeof sbRpc === 'function') sbRpc('joueur_vue_contenu', { p_code: appState.playerCode, p_token: getOrCreateDeviceToken(), p_contenu: id }).catch(() => {});
  if (x.kind === 'seance') ejcSeanceOpen(x);
  else ejcPlay(x.title, x.payload && x.payload.drawings);
}
function ejcPlay(name, drawings) {
  if (!drawings || !drawings.length) { alert("Pas d'animation disponible."); return; }
  schPlayerOpenData(name, drawings, 0, { readOnly: true });   // lecture seule : pas de bouton GIF (retiré du lecteur, export refusé)
}

// Lecteur de séance, exercice par exercice
let ejcR = null;
const EJC_LISTS = [['fonctionnement', 'Fonctionnement'], ['consignes', 'Consignes'], ['realisation', 'Réalisation'], ['reussite', 'Critères de réussite'], ['comportements', 'Comportements attendus']];
function ejcSeanceOpen(x) {
  const steps = [];
  ((x.payload && x.payload.blocks) || []).forEach(b => (b.exercises || []).forEach(e => steps.push({ block: b.name, e })));
  if (!steps.length) { alert('Cette séance ne contient pas encore d’exercice.'); return; }
  ejcR = { x, steps, k: 0 };
  let el = document.getElementById('ej-reader');
  if (!el) { el = document.createElement('div'); el.id = 'ej-reader'; document.body.appendChild(el); }
  el.style.display = 'flex'; document.documentElement.style.overflow = 'hidden';
  ejcSeanceDraw();
}
function ejcSeanceDraw() {
  const el = document.getElementById('ej-reader'); if (!el || !ejcR) return;
  const { x, steps, k } = ejcR, s = steps[k], e = s.e, pl = x.payload || {};
  const lists = EJC_LISTS.map(([key, lbl]) => {
    const a = ((e.items || {})[key] || []).filter(t => String(t || '').trim());
    return a.length ? `<section><h4>${lbl}</h4><ul>${a.map(t => `<li>${ejcEsc(t)}</li>`).join('')}</ul></section>` : '';
  }).join('');
  el.innerHTML = `<div class="ejr-top"><div><small>${ejcEsc(x.title)}</small><b>Exercice ${k + 1} / ${steps.length}</b></div><button type="button" class="ejr-x" onclick="ejcSeanceClose()" aria-label="Fermer">✕</button></div>
    <div class="ejr-body">
      <div class="ejr-block">${ejcEsc(s.block || '')}${e.minutes ? ' · ' + e.minutes + ' min' : ''}</div>
      <h3>${e.icon ? ejcEsc(e.icon) + ' ' : ''}${ejcEsc(e.name || 'Exercice')}</h3>
      ${e.objective ? `<section><h4>Objectif</h4><p>${ejcEsc(e.objective).replace(/\n/g, '<br>')}</p></section>` : ''}
      ${e.drawings ? `<button type="button" class="ejr-anim" onclick="ejcSeancePlay()">▶ Voir l'animation</button>` : ''}
      ${lists}
    </div>
    <div class="ejr-nav"><button type="button" ${k === 0 ? 'disabled' : ''} onclick="ejcSeanceGo(-1)">◀ Précédent</button><button type="button" ${k === steps.length - 1 ? 'disabled' : ''} onclick="ejcSeanceGo(1)">Suivant ▶</button></div>`;
  const body = el.querySelector('.ejr-body'); if (body) body.scrollTop = 0;
}
function ejcSeanceGo(d) { if (!ejcR) return; ejcR.k = Math.max(0, Math.min(ejcR.steps.length - 1, ejcR.k + d)); ejcSeanceDraw(); }
function ejcSeancePlay() { const e = ejcR && ejcR.steps[ejcR.k].e; if (e) ejcPlay(e.name || 'Exercice', e.drawings); }
function ejcSeanceClose() { const el = document.getElementById('ej-reader'); if (el) el.style.display = 'none'; document.documentElement.style.overflow = ''; ejcR = null; }

// ---------------------------------------------------------------- Côté coach : publier
function ejcPubDialog(defRub, rubs, title, onOk) {
  const old = document.getElementById('ejc-dlg'); if (old) old.remove();
  const d = document.createElement('div'); d.id = 'ejc-dlg';
  d.innerHTML = `<div class="ejc-box"><b>📢 Publier aux joueurs</b>
    <div class="ejc-sm">Une copie sera visible par tous les joueurs (lecture seule). Ne publie rien de confidentiel.</div>
    <label>Titre affiché<input type="text" id="ejc-title" maxlength="80" value="${ejcEsc(title)}"></label>
    ${rubs.length > 1 ? `<label>Rubrique<select id="ejc-rub">${rubs.map(r => `<option value="${r}" ${r === defRub ? 'selected' : ''}>${ejcEsc(EJC_RUBS[r])}</option>`).join('')}</select></label>` : `<div class="ejc-sm">Rubrique : <b>${ejcEsc(EJC_RUBS[rubs[0]])}</b></div>`}
    <div class="ejc-btns"><button type="button" onclick="document.getElementById('ejc-dlg').remove()">Annuler</button><button type="button" class="ok" id="ejc-ok">Publier</button></div>
    <div class="ejc-sm" id="ejc-msg"></div></div>`;
  document.body.appendChild(d);
  document.getElementById('ejc-ok').onclick = async () => {
    const t = document.getElementById('ejc-title').value.trim() || title;
    const r = document.getElementById('ejc-rub') ? document.getElementById('ejc-rub').value : rubs[0];
    const msg = document.getElementById('ejc-msg'); msg.textContent = 'Publication…';
    try { await onOk(t, r); d.remove(); alert('✓ Publié. Les joueurs le voient dans l’Espace Joueurs.'); ejcAdminRender(); }
    catch (e) { msg.style.color = '#e74c3c'; msg.textContent = 'Erreur — réessaie (connexion coach ?).'; }
  };
}
async function ejcSave(kind, rubrique, title, sourceId, payload) {
  await ensureCoachSession();
  const H = { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const base = SB_URL + '/rest/v1/contenus_joueurs';
  let existing = null;
  if (sourceId) {
    const r = await fetch(base + '?select=id&kind=eq.' + kind + '&source_id=eq.' + encodeURIComponent(sourceId), { headers: coachAuthHeaders() });
    if (r.ok) existing = (await r.json())[0] || null;
  } else if (kind === 'schema' && payload) {
    // schéma intégré à l'appli (sans identifiant) : on retrouve sa copie par sa clé, ou à défaut par son titre d'origine
    const r = await fetch(base + '?select=id,title,src_key:payload->>src_key&kind=eq.schema&source_id=is.null', { headers: coachAuthHeaders() });
    if (r.ok) { const rows = await r.json(); existing = rows.find(x => payload.src_key ? x.src_key === payload.src_key : false) || rows.find(x => !x.src_key && x.title === (payload.orig_name || title)) || null; }
  }
  const row = { kind, rubrique, title, source_id: sourceId || null, payload, visible: true, published_at: new Date().toISOString() };
  const res = existing
    ? await fetch(base + '?id=eq.' + existing.id, { method: 'PATCH', headers: H, body: JSON.stringify(row) })
    : await fetch(base, { method: 'POST', headers: H, body: JSON.stringify([row]) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}
function ejcSeancePayload(p) {
  const clean = a => (Array.isArray(a) ? a : []).map(t => (t && typeof t === 'object' ? t.text : t)).filter(t => String(t || '').trim());
  return {
    theme: p.theme || '', seance_date: p.seance_date || null,
    blocks: (p.blocks || []).map(b => ({
      name: b.name || '', minutes: b.minutes || 0,
      exercises: (b.exercises || []).map(x => {
        const dr = x.schemaLib && Array.isArray(x.schemaLib.drawings) && x.schemaLib.drawings.length ? JSON.parse(JSON.stringify(x.schemaLib.drawings)) : null;
        const items = {}; EJC_LISTS.forEach(([k]) => { items[k] = clean((x.items || {})[k]); });
        return { name: x.name || '', minutes: x.minutes || 0, kind: x.kind || 'schema', icon: (typeof CR_KINDS !== 'undefined' && CR_KINDS[x.kind] && x.kind !== 'schema') ? CR_KINDS[x.kind].icon : '', objective: x.objective || '', items, drawings: dr };
      }),
    })),
  };
}
function ejcPubSeance(id) {
  const p = (typeof crPlans !== 'undefined' ? crPlans : []).find(q => q.id === id); if (!p) return;
  ejcPubDialog('seance', ['seance'], p.title || 'Séance', (t, r) => ejcSave('seance', 'seance', t, p.id, ejcSeancePayload(p)));
}
function ejcPubSchema(i) {
  const ex = schDemo[i]; if (!ex || !(ex.drawings || []).length) { alert("Ce schéma n'a pas d'étape à publier."); return; }
  const src = (typeof ex.id === 'string' && /^[0-9a-f-]{36}$/i.test(ex.id)) ? ex.id : null;
  ejcPubDialog('enclenchements', ['enclenchements', 'fonctionnement'], ex.name || 'Schéma', async (t, r) => {
    await ejcSave('schema', r, t, src, { drawings: JSON.parse(JSON.stringify(ex.drawings)), src_key: src ? null : (ex.key || ex.name), orig_name: ex.name || '' });
    await ejcPubRefresh(); if (typeof schRenderDemo === 'function') schRenderDemo();
  });
}

// ---------------------------------------------------------------- Côté coach : état de publication des schémas + lectures
let ejcPubList = [];   // copies de schémas (visibles ou non) : id, title, source_id, visible, src_key
let ejcViews = [];     // consultations : contenu_id, player_code, nb_vues, derniere_vue
async function ejcPubRefresh() {
  if (typeof coachSession === 'undefined' || !coachSession) return;
  try {
    await ensureCoachSession();
    const [a, v] = await Promise.all([
      fetch(SB_URL + '/rest/v1/contenus_joueurs?select=id,kind,title,source_id,visible,src_key:payload->>src_key&kind=eq.schema&limit=500', { headers: coachAuthHeaders() }),
      fetch(SB_URL + '/rest/v1/vues_contenus?select=contenu_id,player_code,nb_vues,derniere_vue&limit=5000', { headers: coachAuthHeaders() }),
    ]);
    if (a.ok) ejcPubList = await a.json();
    if (v.ok) ejcViews = await v.json();
  } catch (e) {}
}
// Copie publiée (visible ou non) correspondant à un schéma de la bibliothèque
function ejcPubRow(ex) {
  if (!ex) return null;
  if (ex.user && typeof ex.id === 'string') return ejcPubList.find(r => r.source_id === ex.id) || null;
  return ejcPubList.find(r => !r.source_id && (r.src_key ? r.src_key === (ex.key || ex.name) : r.title === ex.name)) || null;
}
function ejcIsPublished(ex) { const r = ejcPubRow(ex); return !!(r && r.visible); }
function ejcViewStats(contenuId) {
  const v = ejcViews.filter(x => x.contenu_id === contenuId);
  const lectures = v.reduce((s, x) => s + (x.nb_vues || 0), 0);
  return { joueurs: v.length, lectures, relectures: Math.max(0, lectures - v.length), rows: v };
}
function ejcViewLine(ex) {
  const r = ejcPubRow(ex); if (!r || !r.visible) return '';
  const s = ejcViewStats(r.id);
  return `👁 ${s.joueurs} joueur${s.joueurs > 1 ? 's' : ''} · ${s.lectures} lecture${s.lectures > 1 ? 's' : ''} dont ${s.relectures} relecture${s.relectures > 1 ? 's' : ''}`;
}
async function ejcUnpubSchema(i) {
  const ex = schDemo[i], r = ejcPubRow(ex); if (!r) return;
  if (!confirm('Retirer « ' + (r.title || ex.name) + ' » de l’Espace Joueurs ?\n(L’original reste intact, tu pourras le republier. Les statistiques de lecture sont conservées.)')) return;
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/contenus_joueurs?id=eq.' + r.id, { method: 'PATCH', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ visible: false }) });
    if (!res.ok) throw new Error();
    await ejcPubRefresh(); schRenderDemo();
  } catch (e) { alert('Erreur — réessaie (connexion coach ?).'); }
}

// ---------------------------------------------------------------- Côté coach : gestion (Réglages › Contenus publiés)
async function ejcAdminLoad() {
  const el = document.getElementById('ejc-admin'); if (!el) return;
  el.innerHTML = '<div style="color:var(--gris-texte);font-size:12px;">Chargement…</div>';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/contenus_joueurs?select=id,kind,rubrique,title,visible,published_at&order=published_at.desc&limit=200', { headers: coachAuthHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ejcAdmin = await res.json();
    await ejcPubRefresh();
    try {
      const pr = await fetch(SB_URL + '/rest/v1/players?select=code,name&claimed_at=not.is.null&code=neq.COACHTEST&order=name', { headers: coachAuthHeaders() });
      ejcPlayers = pr.ok ? await pr.json() : [];
    } catch (e) { ejcPlayers = []; }
  } catch (e) { el.innerHTML = '<div style="color:#e74c3c;font-size:12px;">Impossible de charger (connecte-toi en coach puis rouvre).</div>'; return; }
  ejcAdminRender();
}
let ejcAdmin = [];
let ejcPlayers = [];
function ejcAdminRender() {
  const el = document.getElementById('ejc-admin'); if (!el) return;
  if (!ejcAdmin.length) { el.innerHTML = '<div style="color:var(--gris-texte);font-size:12px;">Rien de publié. Utilise « 📢 Publier aux joueurs » sur une séance (menu ⋯) ou un schéma.</div>'; return; }
  const nm = c => { const p = ejcPlayers.find(x => x.code === c); return p ? p.name : 'Joueur'; };
  el.innerHTML = ejcAdmin.map(x => {
    const s = ejcViewStats(x.id), seen = new Set(s.rows.map(r => r.player_code));
    const unseen = ejcPlayers.filter(p => !seen.has(p.code)).map(p => ejcEsc(p.name));
    const det = `<details class="ejc-views"><summary>👁 ${s.joueurs}${ejcPlayers.length ? ' / ' + ejcPlayers.length : ''} joueur${s.joueurs > 1 ? 's' : ''} · ${s.lectures} lecture${s.lectures > 1 ? 's' : ''} dont ${s.relectures} relecture${s.relectures > 1 ? 's' : ''}</summary>
      ${s.rows.length ? '<ul>' + s.rows.slice().sort((a, b) => b.nb_vues - a.nb_vues).map(r => `<li><b>${ejcEsc(nm(r.player_code))}</b> — ${r.nb_vues} lecture${r.nb_vues > 1 ? 's' : ''} (${Math.max(0, r.nb_vues - 1)} relecture${r.nb_vues > 2 ? 's' : ''}), dernière le ${ejcDate(r.derniere_vue)}</li>`).join('') + '</ul>' : '<div class="ejc-sm">Personne n’a encore ouvert ce contenu.</div>'}
      ${unseen.length && s.rows.length ? `<div class="ejc-sm"><b>Pas encore ouvert :</b> ${unseen.join(', ')}</div>` : ''}</details>`;
    return `<div class="ej-row">
    <input type="checkbox" ${x.visible ? 'checked' : ''} style="width:18px;height:18px;" aria-label="Visible par les joueurs" onchange="ejcAdminSet('${x.id}',{visible:this.checked})">
    <span class="nm"><b>${ejcEsc(x.title)}</b><small>${ejcEsc(EJC_RUBS[x.rubrique] || x.rubrique)} · ${x.visible ? 'publié' : 'masqué'} le ${ejcDate(x.published_at)}</small></span>
    <button type="button" class="disp-mini" onclick="ejcAdminDel('${x.id}')">Supprimer</button>${det}</div>`; }).join('')
    + '<div style="font-size:11px;color:var(--gris-texte);margin-top:6px;">Pour mettre à jour un contenu : republie-le depuis son original (il remplace l’ancienne copie).</div>';
}
async function ejcAdminSet(id, fields) {
  try {
    await ensureCoachSession();
    const r = await fetch(SB_URL + '/rest/v1/contenus_joueurs?id=eq.' + id, { method: 'PATCH', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    if (!r.ok) throw new Error();
    const x = ejcAdmin.find(i => i.id === id); if (x) Object.assign(x, fields);
  } catch (e) { alert('Erreur — réessaie.'); ejcAdminLoad(); }
}
async function ejcAdminDel(id) {
  if (!confirm('Supprimer ce contenu publié ? (L’original reste intact.)')) return;
  try {
    await ensureCoachSession();
    const r = await fetch(SB_URL + '/rest/v1/contenus_joueurs?id=eq.' + id, { method: 'DELETE', headers: coachAuthHeaders() });
    if (!r.ok) throw new Error();
    ejcAdmin = ejcAdmin.filter(i => i.id !== id); ejcAdminRender();
  } catch (e) { alert('Erreur — réessaie.'); }
}

// ---------------------------------------------------------------- Déclaration des rubriques (registre z25)
ejRegister({ id: 'seance', title: '📋 Séance du jour', desc: 'Séance publiée, lue exercice par exercice', box: 'ej-mod-seance', titleEl: 'ej-mod-seance-title' });
ejRegister({ id: 'enclenchements', title: "▶ Enclenchements d'attaque", desc: 'Animations des schémas publiés', box: 'ej-mod-enclenchements', titleEl: 'ej-mod-enclenchements-title' });
ejRegister({ id: 'fonctionnement', title: '🧭 Fonctionnement', desc: 'Principes de jeu (schémas animés)', box: 'ej-mod-fonctionnement', titleEl: 'ej-mod-fonctionnement-title' });
ejModulesRenderUi();
ejApplyLayout();
