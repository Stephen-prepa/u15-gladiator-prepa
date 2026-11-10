// Prépa U15 HBCCS — js/08-createur-seances.js — dernière modification : version z47 (10/11/2026)
// ---------- Créateur de séances (coach) ----------
const CR_CATS = ['Baby (3-5 ans)', '-7 ans', '-9 ans', '-11 ans', '-13 ans', '-15 ans', '-17 ans', '-18 ans', 'Seniors', 'Loisirs', 'Détection', 'Gardiens'];
const CR_PUBLICS = ['Mixte', 'Garçons', 'Filles'];
const CR_MATERIEL = ['Ballons', 'Chasubles', 'Plots', 'Coupelles', 'Jalons', 'Cerceaux', 'Haies', 'Échelles', 'Buts', 'Mini-buts', 'Tapis', 'Élastiques'];
const CR_TEMPLATES = [
  { key: 'vierge', title: 'Séance vierge', desc: 'Partir de zéro', blocks: [] },
  { key: 'baby', title: 'Séance BabyHand 3-5 ans', desc: 'Une histoire dans un univers : entrée, 3 ateliers, rangement, thème du jour', type: 'babyhand', cat: 'Baby (3-5 ans)',
    blocks: [["Entrée dans l'histoire", 5], ['Échauffement ludique', 10], ['Atelier 1', 10], ['Atelier 2', 10], ['Atelier 3', 10], ['Thème du jour / jeu collectif', 10], ['Rangement & retour au calme', 5]] },
  { key: '1h', title: 'Séance 1h', desc: 'Format court',
    blocks: [['Échauffement', 10], ['Technique', 15], ['Situation', 20], ['Jeu', 10], ['Bilan', 5]] },
  { key: '1h30', title: 'Séance 1h30', desc: 'Échauffement · travail GB · technique · tactique · jeu · bilan',
    blocks: [['Accueil / mise en route', 5], ['Échauffement', 15], ['Travail GB', 10], ['Technique', 15], ['Tactique collective', 25], ['Jeu', 15], ['Retour au calme / bilan', 5]] },
  { key: '2h', title: 'Séance 2h', desc: 'Séance complète',
    blocks: [['Accueil', 5], ['Échauffement', 15], ['Motricité', 15], ['Technique', 20], ['Tactique individuelle', 20], ['Tactique collective', 25], ['Jeu', 15], ['Retour au calme / bilan', 5]] },
  { key: 'detection', title: 'Séance détection', desc: "Ateliers d'observation + match",
    blocks: [['Accueil / présentation', 10], ['Échauffement', 15], ['Ateliers motricité', 20], ['Ateliers technique', 20], ['Situations de jeu réduit', 25], ['Match', 20], ['Bilan', 10]] },
  { key: 'defense', title: 'Séance défense', desc: 'Individuel → collectif',
    blocks: [['Échauffement', 15], ['Duels défensifs', 20], ['Coopération à 2 / 3', 20], ['Système défensif', 25], ['Jeu à thème', 15], ['Bilan', 5]] },
  { key: 'attaque', title: 'Séance attaque', desc: 'Passe / tir, jeu à 2-3, attaque placée',
    blocks: [['Échauffement', 15], ['Technique de passe / tir', 20], ['Jeu à 2 / 3', 20], ['Attaque placée', 25], ['Jeu', 15], ['Bilan', 5]] },
  { key: 'gardiens', title: 'Séance gardiens', desc: 'Spécifique GB',
    blocks: [['Échauffement spécifique', 15], ['Placement / déplacements', 20], ['Parades', 20], ['Relances', 15], ['Situations de tir', 15], ['Bilan', 5]] },
  { key: 'match', title: 'Préparation match', desc: 'Rappels + opposition',
    blocks: [['Échauffement', 15], ['Rappels défensifs', 15], ['Rappels offensifs', 15], ['Opposition', 20], ['Situations spéciales', 10], ['Bilan', 5]] },
  { key: 'motricite', title: 'Séance motricité', desc: 'Coordination / appuis / parcours',
    blocks: [['Échauffement', 10], ['Coordination', 15], ['Appuis / vitesse', 15], ['Parcours', 15], ['Jeu', 15], ['Bilan', 5]] },
];
let crPlans = [];
let crFilter = 'toutes';
// Code couleur des séances (z44) : rouge = défense, bleu = attaque, vert = motricité / manipulation, violet = technique individuelle
const CR_COULEURS = [['rouge', 'Défense'], ['bleu', 'Attaque'], ['vert', 'Motricité / manipulation'], ['violet', 'Technique individuelle']];
let crColF = '';
// Tri de la liste par date de séance (z45) : récentes d'abord par défaut ; sans date à la fin
let crSortDesc = true;
try { crSortDesc = localStorage.getItem('cr_sort_v1') !== 'asc'; } catch (e) {}
function crToggleSort() { crSortDesc = !crSortDesc; try { localStorage.setItem('cr_sort_v1', crSortDesc ? 'desc' : 'asc'); } catch (e) {} crRenderLegend(); crRenderList(); }
function crSortPlans(rows) {
  const dir = crSortDesc ? -1 : 1, upd = p => String(p.updated_at || '');
  return rows.slice().sort((a, b) => {
    const da = a.seance_date || '', db = b.seance_date || '';
    if (da && !db) return -1;
    if (!da && db) return 1;
    if (da !== db) return da < db ? -dir : dir;
    return upd(a) < upd(b) ? 1 : upd(a) > upd(b) ? -1 : 0;
  });
}
const crColLabel = k => { const c = CR_COULEURS.find(x => x[0] === k); return c ? c[1] : ''; };
function crSetColF(k) { crColF = crColF === k ? '' : k; crRenderLegend(); crRenderList(); }
function crRenderLegend() {
  const el = document.getElementById('cr-legend'); if (!el) return;
  el.innerHTML = '<span class="cr-leg-t">Couleurs</span>' + CR_COULEURS.map(([k, l]) => `<button type="button" class="cr-leg${crColF === k ? ' on' : ''}" data-sc="${k}" onclick="crSetColF('${k}')"><i></i>${l}</button>`).join('') + `<button type="button" class="cr-leg cr-sortbtn" onclick="crToggleSort()" title="Trier par date de séance">Date ${crSortDesc ? '▾' : '▴'}</button>`;
}
function crSetColor(k) {
  crCur.couleur = (crCur.couleur === k) ? null : k;
  crTouch(); crRenderEditor(crCur);
}
let crCur = null;
let crSaveTimer = null;
let crLoaded = false;

function crEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function crFmtDur(min) {
  min = Math.max(0, Math.round(min || 0));
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return m + ' min';
  return m === 0 ? h + 'h' : h + 'h' + String(m).padStart(2, '0');
}
function crExCount(p) { return (p.blocks || []).reduce((s, b) => s + (b.exercises || []).length, 0); }
function crUid() { return 'b' + Math.random().toString(36).slice(2, 9); }

async function crInit() {
  try { crCfgPull(); } catch (e) {}
  crRenderFilters();
  const sel = document.getElementById('cr-cat-filter');
  if (sel && !sel.options.length) sel.innerHTML = '<option value="">Toutes catégories</option>' + CR_CATS.map(c => '<option>' + crEsc(c) + '</option>').join('');
  crShowList();
  await crLoadPlans();
}
async function crLoadPlans() {
  const listEl = document.getElementById('cr-list');
  if (!crLoaded) listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);">Chargement...</div>';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/seance_plans?select=*&order=updated_at.desc&limit=300', { headers: coachAuthHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    crPlans = await res.json();
    crLoaded = true; crLastSync = Date.now(); crSyncErr = false;
  } catch (e) {
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6b6b;">Impossible de charger les séances. Réessaie dans un instant.</div>';
    return;
  }
  crRenderFilters(); crRenderLegend();
  crRenderList(); crSyncStamp();
}
function crFilterCount(f) { return crPlans.filter(p => crMatchFilter(p, f)).length; }
function crMatchFilter(p, f) {
  if (f === 'archivees') return p.status === 'archivee';
  if (p.status === 'archivee') return false;
  if (f === 'modeles') return !!p.is_template;
  if (p.is_template) return false;
  if (f === 'brouillons') return p.status === 'brouillon';
  if (f === 'terminees') return p.status === 'terminee';
  return true;
}
function crRenderFilters() {
  const defs = [['toutes', 'Toutes'], ['brouillons', 'Brouillons'], ['terminees', 'Terminées'], ['modeles', 'Modèles'], ['archivees', 'Archivées']];
  document.getElementById('cr-filters').innerHTML = defs.map(([k, l]) =>
    `<button type="button" class="cr-chip ${crFilter === k ? 'on' : ''}" onclick="crSetFilter('${k}')">${l}<span class="n">${crFilterCount(k)}</span></button>`).join('');
}
function crSetFilter(k) { crFilter = k; crRenderFilters(); crRenderList(); }
function crRenderList() {
  const q = crFold((document.getElementById('cr-search').value || '').trim());
  const cat = document.getElementById('cr-cat-filter').value;
  const rows = crSortPlans(crPlans.filter(p => crMatchFilter(p, crFilter))).filter(p => !cat || p.categorie === cat).filter(p => !crColF || p.couleur === crColF).filter(p => {
    if (!q) return true;
    return crPlanText(p).includes(q);
  });
  const el = document.getElementById('cr-list');
  if (!rows.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px 10px;color:var(--gris-texte);font-size:13px;">' + (crPlans.length ? 'Aucune séance ne correspond.' : 'Aucune séance pour l\'instant — clique sur « Créer une séance ».') + '</div>';
    return;
  }
  el.innerHTML = rows.map(p => {
    const n = crExCount(p);
    const typeLabel = p.seance_type === 'babyhand' ? '🧸 BabyHand 3-5 ans' : ('Handball' + (p.categorie ? ' · ' + crEsc(p.categorie) : ''));
    const stLbl = p.is_template ? '<span class="cr-c2-st tpl">Modèle</span>' : (p.status === 'archivee' ? '<span class="cr-c2-st">Archivée</span>' : (p.status === 'terminee' ? '<span class="cr-c2-st ok">Terminée</span>' : '<span class="cr-c2-st">Brouillon</span>'));
    const colPill = p.couleur ? `<span class="cr-sc-pill">${crEsc(crColLabel(p.couleur))}</span>` : '';
    return `<div class="cr-c2-card" data-sc="${p.couleur || ''}">
      <div>
        <div class="cr-c2-t" onclick="crOpen('${p.id}')">${crEsc(p.title)}</div>
        <div class="cr-c2-m">${colPill}${stLbl}<span>${typeLabel}</span><span>${crFmtDur(crTotal(p))} · ${n} exercice${n > 1 ? 's' : ''}</span>${p.seance_date ? '<span>' + crEsc(p.seance_date.split('-').reverse().join('/')) + '</span>' : ''}</div>
      </div>
      <div class="cr-c2-foot">
        <button type="button" class="cr-c2-btn" onclick="crOpen('${p.id}')">Ouvrir</button>
        <button type="button" class="cr-c2-btn ghost" onclick="crLectOpen('${p.id}')">▶ Terrain</button>
        <button type="button" class="cr-c2-btn ghost" onclick="crOpenFiche('${p.id}')">Fiche PDF</button>
        <button type="button" class="cr-c2-more" aria-label="Plus d'actions" onclick="crMenu(event,'${p.id}')">⋯</button>
      </div>
      <div class="cr-c2-menu" id="crm-${p.id}">
        <button type="button" onclick="ejcPubSeance('${p.id}')">📢 Publier aux joueurs</button>
        <button type="button" onclick="crDuplicate('${p.id}')">Dupliquer</button>
        <button type="button" onclick="crToggleTemplate('${p.id}')">${p.is_template ? 'Retirer des modèles' : 'Enregistrer comme modèle'}</button>
        <button type="button" onclick="crArchive('${p.id}')">${p.status === 'archivee' ? 'Désarchiver' : 'Archiver'}</button>
        <hr>
        <button type="button" class="red" onclick="crDelete('${p.id}')">Supprimer</button>
      </div></div>`;
  }).join('');
}
function crMenu(ev, id) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('crm-' + id);
  const open = m && m.classList.contains('show');
  document.querySelectorAll('.cr-c2-menu.show').forEach(x => x.classList.remove('show'));
  if (m && !open) m.classList.add('show');
}
document.addEventListener('click', () => { document.querySelectorAll('.cr-c2-menu.show').forEach(x => x.classList.remove('show')); });
function crShowList() {
  document.getElementById('cr-list-view').style.display = '';
  document.getElementById('cr-edit-view').style.display = 'none';
  document.getElementById('cr-ex-view').style.display = 'none';
  crCur = null;
}

// ----- Modèles -----
function crOpenTemplates() {
  const mine = crPlans.filter(p => p.is_template && p.status !== 'archivee');
  const tplHtml = (key, title, desc, tot, n) => `<button type="button" class="cr-tpl" onclick="crCreate('${key}')"><b>${crEsc(title)}</b><span>${crEsc(desc)}</span>${n != null ? `<i>${crFmtDur(tot)} · ${n} bloc${n > 1 ? 's' : ''}</i>` : ''}</button>`;
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;"><h3 style="font-size:18px;color:var(--blanc);">Nouvelle séance</h3><button type="button" class="cr-btn sm" onclick="crCloseModal()">✕</button></div><div style="font-size:12px;color:var(--gris-texte);margin:6px 0 12px;">Choisis un point de départ — tout reste modifiable.</div>';
  if (mine.length) {
    html += '<div class="section-title">⭐ Mes modèles</div>' + mine.map(p => tplHtml('plan:' + p.id, p.title, p.theme || 'Modèle personnel', crTotal(p), (p.blocks || []).length)).join('') + '<div class="section-title" style="margin-top:10px;">Modèles de base</div>';
  }
  html += CR_TEMPLATES.map(t => tplHtml(t.key, t.title, t.desc, t.blocks.reduce((s, b) => s + b[1], 0), t.blocks.length ? t.blocks.length : null)).join('');
  document.getElementById('cr-modal-inner').innerHTML = html;
  document.getElementById('cr-modal').classList.add('show');
}
function crCloseModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('cr-modal').classList.remove('show');
}
async function crCreate(key) {
  let base = { title: 'Nouvelle séance', seance_type: 'handball', categorie: '-15 ans', public_cible: 'Garçons', niveau: '', materiel: [], blocks: [] };
  if (key.startsWith('plan:')) {
    const src = crPlans.find(p => p.id === key.slice(5));
    if (!src) return;
    base = { title: src.title, seance_type: src.seance_type, categorie: src.categorie, public_cible: src.public_cible, niveau: src.niveau || '', theme: src.theme, objectif_principal: src.objectif_principal, objectifs_secondaires: src.objectifs_secondaires, contexte: src.contexte,
      materiel: JSON.parse(JSON.stringify(src.materiel || [])), blocks: (src.blocks || []).map(crCloneBlock), ...(src.couleur !== undefined ? { couleur: src.couleur } : {}), ...crIntCopy(src) };
  } else {
    const t = CR_TEMPLATES.find(x => x.key === key);
    if (!t) return;
    base.title = t.key === 'vierge' ? 'Nouvelle séance' : t.title;
    if (t.type) { base.seance_type = t.type; base.categorie = t.cat; base.public_cible = 'Mixte'; }
    base.blocks = t.blocks.map(b => ({ id: crUid(), name: b[0], minutes: b[1], exercises: [] }));
  }
  base.entraineur = (coachSession && coachSession.name) || '';
  base.status = 'brouillon';
  base.is_template = false;
  base.total_minutes = crTotal(base);
  crCloseModal();
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/seance_plans', { method: 'POST', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify([base]) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows[0]) throw new Error('réponse vide');
    crPlans.unshift(rows[0]);
    crRenderFilters();
    crRenderEditor(rows[0]);
  } catch (e) {
    alert("Impossible de créer la séance (" + (e.message || e) + ").");
  }
}

// ----- Édition -----
function crOpen(id) {
  const p = crPlans.find(x => x.id === id);
  if (!p) return;
  const back = crBackupRestore(p); // modifications d'une session précédente qui n'avaient pas pu être envoyées
  crRenderEditor(p);
  if (back) { crTouch(); crSetStatus('↻ Modifications non enregistrées reprises', false); }
}
function crSetStatus(txt, err) {
  document.querySelectorAll('.cr-save-status').forEach(el => { el.textContent = txt; el.style.color = err ? '#ff6b6b' : '#2ecc71'; });
}
function crTouch() {
  if (!crCur) return;
  crRev++; crDirty = true;
  crSyncBlockMinutes(crCur);
  crCur.total_minutes = crTotal(crCur);
  crSetStatus('Enregistrement…', false);
  clearTimeout(crSaveTimer);
  crSaveTimer = setTimeout(crSaveNow, 700);
  clearTimeout(crBkTimer); crBkTimer = setTimeout(() => { if (crCur && crDirty) crBackupPut(crCur); }, 250);
}
// ----- Filet de sécurité : tes modifications non enregistrées sont aussi gardées sur cet appareil et reprises à la réouverture de la séance -----
let crBkTimer = null;
function crBackupPut(p) { try { if (p && p.id) localStorage.setItem('crUnsaved_' + p.id, JSON.stringify({ at: Date.now(), base: p.updated_at || null, body: crBody(p) })); } catch (e) {} }
function crBackupDrop(id) { try { localStorage.removeItem('crUnsaved_' + id); } catch (e) {} }
function crBackupRestore(p) {
  let b = null; try { b = JSON.parse(localStorage.getItem('crUnsaved_' + p.id) || 'null'); } catch (e) {}
  if (!b || !b.body || !Array.isArray(b.body.blocks)) return false;
  if (JSON.stringify(crBody(p)) === JSON.stringify(b.body)) { crBackupDrop(p.id); return false; }
  Object.assign(p, b.body); return true;
}
window.addEventListener('pagehide', () => { if (crCur && crDirty) crBackupPut(crCur); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && crCur && crDirty) crBackupPut(crCur); });
let crRev = 0, crDirty = false, crPulling = false, crLastSync = 0, crSyncErr = false;
const crRemote = {}; // versions plus récentes d'une séance ouverte, en attente d'être chargées (id → ligne)
const CR_INT_KEYS = ['constat_positif', 'constat', 'objectif_individuel', 'comportements_attendus', 'criteres_reussite'];
function crIntBody(p) { const o = {}; CR_INT_KEYS.forEach(k => { if (p[k] !== undefined) o[k] = p[k] || null; }); return o; }
function crIntCopy(s) { const o = {}; CR_INT_KEYS.forEach(k => { if (s[k] !== undefined) o[k] = s[k]; }); return o; }
function crBody(p) {
  return { title: p.title || 'Sans titre', seance_type: p.seance_type, status: p.status, is_template: !!p.is_template, categorie: p.categorie || null, public_cible: p.public_cible || null, niveau: p.niveau || null,
    seance_date: p.seance_date || null, nb_joueurs: p.nb_joueurs || null, entraineur: p.entraineur || null, theme: p.theme || null, objectif_principal: p.objectif_principal || null,
    objectifs_secondaires: p.objectifs_secondaires || null, contexte: p.contexte || null, materiel: p.materiel || [], blocks: p.blocks || [], videos: p.videos || [], total_minutes: crTotal(p), ...(p.couleur !== undefined ? { couleur: p.couleur || null } : {}), ...crIntBody(p) };
}
async function crSaveNow() {
  if (!crCur) return;
  const p = crCur, rev0 = crRev, known = p.updated_at;
  clearTimeout(crSaveTimer);
  crSyncBlockMinutes(p);
  const body = { ...crBody(p), updated_at: new Date().toISOString() };
  try {
    await ensureCoachSession();
    // « updated_at <= version connue » : si un autre appareil a enregistré entre-temps, rien n'est écrasé (aucune ligne modifiée) et on règle le conflit
    const url = SB_URL + '/rest/v1/seance_plans?id=eq.' + p.id + (known ? '&updated_at=lte.' + encodeURIComponent(known) : '') + '&select=id,updated_at';
    const res = await fetch(url, { method: 'PATCH', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = await res.json();
    if (!rows.length) { await crConflict(p); return; }
    p.updated_at = rows[0].updated_at || body.updated_at; delete crRemote[p.id]; crNoticeHide();
    if (crRev === rev0) { crDirty = false; crBackupDrop(p.id); }
    crSaveFailed = false;
    crSetStatus('✓ Enregistré', false);
  } catch (e) { crSaveFailed = true; crSetStatus(navigator.onLine === false ? '⚠ Hors connexion : à enregistrer au retour du réseau' : '⚠ Non enregistré', true); }
}
// La séance a été modifiée sur un autre appareil pendant que celle-ci était modifiée ici : rien n'est perdu — ta version est gardée en copie, la version de l'autre appareil est chargée
async function crConflict(p) {
  clearTimeout(crSaveTimer); crSaveFailed = false;
  try {
    const base = SB_URL + '/rest/v1/seance_plans', H = coachAuthHeaders();
    const rr = await fetch(base + '?select=*&id=eq.' + p.id, { headers: H }), rem = rr.ok ? await rr.json() : null;
    if (!Array.isArray(rem)) throw new Error('lecture');
    const mine = { ...crBody(p), title: String(p.title || 'Sans titre').slice(0, 80) + (rem[0] ? ' (ma version)' : ''), status: 'brouillon', blocks: (p.blocks || []).map(crCloneBlock), updated_at: new Date().toISOString() };
    const pr = await fetch(base, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify([mine]) });
    if (!pr.ok) throw new Error('copie');
    const copy = (await pr.json())[0];
    if (!copy || !copy.id) throw new Error('copie vide'); // rien n'est remplacé tant que la copie de ta version n'est pas bien enregistrée
    crBackupDrop(p.id); // ta version est maintenant gardée côté serveur
    if (rem[0]) {
      Object.keys(p).forEach(k => delete p[k]); Object.assign(p, rem[0]); crPlans.unshift(copy);
      crDirty = false; delete crRemote[p.id]; if (crCur === p) crRenderEditor(p);
      crNotice('⚠ Cette séance a été modifiée sur un autre appareil. Tu vois sa version ; ta version est gardée dans la séance « ' + crEsc(copy.title) + ' ».');
    } else { // supprimée ailleurs : la copie la remplace
      const ix = crPlans.indexOf(p); if (ix >= 0) crPlans[ix] = copy; else crPlans.unshift(copy);
      crDirty = false; if (crCur === p) crRenderEditor(copy);
      crNotice('⚠ Cette séance a été supprimée sur un autre appareil : elle a été recréée avec ta version.');
    }
    crSetStatus('✓ Enregistré', false); crRenderFilters(); if (document.getElementById('cr-list-view').style.display !== 'none') crRenderList();
  } catch (e) { crSaveFailed = true; crSetStatus('⚠ Non enregistré (séance modifiée ailleurs, nouvel essai au prochain changement)', true); }
}
// ----- Bandeau d'information (en haut de l'écran) -----
function crNotice(html, btn) {
  let el = document.getElementById('cr-notice');
  if (!el) { el = document.createElement('div'); el.id = 'cr-notice'; el.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99000;background:#FFF4D6;color:#5A3B00;border:1px solid #E0A100;border-radius:12px;padding:10px 12px;font:600 13px/1.35 Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,0.35);display:flex;gap:10px;align-items:center;'; document.documentElement.appendChild(el); }
  el.innerHTML = '<div style="flex:1;">' + html + '</div>' + (btn ? '<button type="button" onclick="' + btn[1] + '" style="border:0;background:#0A3D7A;color:#fff;border-radius:9px;padding:9px 12px;font:800 13px Arial,sans-serif;white-space:nowrap;">' + btn[0] + '</button>' : '') + '<button type="button" onclick="crNoticeHide()" aria-label="Fermer" style="border:0;background:transparent;color:#5A3B00;font-size:18px;padding:4px 6px;">✕</button>';
}
function crNoticeHide() { const el = document.getElementById('cr-notice'); if (el) el.remove(); }
// ----- Mise à jour depuis les autres appareils (séances) -----
function crSafeToApply() {
  const ev = document.getElementById('cr-edit-view'), ex = document.getElementById('cr-ex-view'), a = document.activeElement;
  if (crDirty || crSaveFailed || !crCur || !ev || ev.style.display === 'none' || (ex && ex.style.display !== 'none')) return false;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && ev.contains(a)) return false;
  if (typeof crD !== 'undefined' && crD) return false;
  if (document.getElementById('sch-editor')) return false;
  return true;
}
function crApplyRemote(id) {
  const row = crRemote[id], cur = crPlans.find(p => p.id === id); if (!row || !cur) { crNoticeHide(); return; }
  Object.keys(cur).forEach(k => delete cur[k]); Object.assign(cur, row); delete crRemote[id]; crDirty = false; crNoticeHide();
  if (crCur === cur) crRenderEditor(cur); crSetStatus('↻ Mise à jour depuis un autre appareil', false);
}
function crSyncStamp() {
  const el = document.getElementById('cr-sync'); if (!el) return;
  const t = crLastSync ? new Date(crLastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  el.textContent = !navigator.onLine ? '📴 Hors connexion : les séances affichées sont celles de la dernière mise à jour' : crSyncErr ? '⚠ Mise à jour impossible pour l\'instant (nouvel essai automatique)' : '☁ À jour' + (t ? ' · ' + t : '');
}
async function crPullPlans() {
  if (!crLoaded || crPulling || !navigator.onLine || !coachSession) { crSyncStamp(); return; }
  crPulling = true;
  try {
    await ensureCoachSession();
    const H = coachAuthHeaders(), base = SB_URL + '/rest/v1/seance_plans';
    const r = await fetch(base + '?select=id,updated_at&order=updated_at.desc&limit=300', { headers: H });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rem = await r.json(), loc = {}, ts = v => { const t = Date.parse(v); return isFinite(t) ? t : 0; };
    crPlans.forEach(p => { loc[p.id] = p; });
    const ids = rem.filter(x => !loc[x.id] || ts(x.updated_at) > ts(loc[x.id].updated_at)).map(x => x.id);
    const gone = rem.length < 300 ? crPlans.filter(p => !rem.some(x => x.id === p.id) && !(crCur && crCur.id === p.id)) : [];
    let changed = gone.length > 0; if (gone.length) crPlans = crPlans.filter(p => !gone.includes(p));
    for (let k = 0; k < ids.length; k += 10) {
      const rr = await fetch(base + '?select=*&id=in.(' + ids.slice(k, k + 10).join(',') + ')', { headers: H });
      if (!rr.ok) throw new Error('HTTP ' + rr.status);
      for (const row of await rr.json()) {
        const cur = loc[row.id];
        if (cur && crCur === cur) {
          if (crSafeToApply()) { crRemote[row.id] = row; crApplyRemote(row.id); }
          else { crRemote[row.id] = row; crNotice('🔄 Cette séance a été modifiée sur un autre appareil.', ['Charger la nouvelle version', "crApplyRemote('" + row.id + "')"]); }
        } else if (cur) { Object.keys(cur).forEach(x => delete cur[x]); Object.assign(cur, row); changed = true; }
        else { crPlans.push(row); changed = true; }
      }
    }
    if (ids.length) crPlans.sort((a, b) => ts(b.updated_at) - ts(a.updated_at));
    crSyncErr = false; crLastSync = Date.now();
    if (changed) { try { crRenderFilters(); const lv = document.getElementById('cr-list-view'); if (lv && lv.style.display !== 'none') crRenderList(); } catch (e) {} }
  } catch (e) { crSyncErr = true; }
  finally { crPulling = false; crSyncStamp(); }
}
// ----- Mise à jour automatique : retour sur l'app, retour du réseau, puis toutes les 30 s -----
let syncNowAt = 0;
function syncAllNow(reason) {
  if (!coachSession || document.visibilityState === 'hidden') return;
  const now = Date.now(); if (reason !== 'poll' && now - syncNowAt < 1500) return; syncNowAt = now;
  const a = document.activeElement, typing = !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  if (!(reason === 'poll' && typing)) { try { schSyncAll(true); } catch (e) {} } // la liste des schémas se redessine : pas pendant une saisie
  try { crPullPlans(); } catch (e) {}
  try { crCfgPull(); } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncAllNow('visible'); });
window.addEventListener('focus', () => syncAllNow('focus'));
window.addEventListener('pageshow', () => syncAllNow('pageshow'));
window.addEventListener('online', () => { syncNowAt = 0; syncAllNow('online'); });
window.addEventListener('offline', () => { try { crSyncStamp(); } catch (e) {} });
setInterval(() => syncAllNow('poll'), 30000);
let crSaveFailed = false;
window.addEventListener('online', () => { if (crSaveFailed && crCur) crSaveNow(); });
function crSel(opts, val, cb) {
  return '<select class="cr-in" onchange="' + cb + '"><option value="">—</option>' + opts.map(o => `<option ${o === val ? 'selected' : ''}>${crEsc(o)}</option>`).join('') + '</select>';
}
// ----- Intention de la séance (constat → objectifs contextuels → comportements → critères) -----
const CR_CTX_CHIPS = ['Face à une défense 6-0', 'Face à une défense 5-1', 'Face à une défense 3-2-1', 'Face à une défense étagée', 'Face à une défense agressive', 'Sur grands espaces', 'En espace réduit', 'En contre-attaque', 'En montée de balle', 'En supériorité numérique', 'En infériorité numérique', 'Contre repli défensif', 'Sous pression', 'Pour…'];
let crIntLast = 'objectif_principal';
const CR_VERBS = ['Améliorer', 'Mettre en place', 'Construire', 'Développer', 'Renforcer', 'Automatiser', 'Stabiliser', 'Optimiser', 'Exploiter', 'Faire évoluer'];
function crIntField(label, key, ph, rows, extra) {
  const v = crCur[key] || '';
  return `<label class="cr-lbl">${label}</label><textarea class="cr-in" id="cr-int-${key}" rows="${rows}" placeholder="${crEsc(ph)}" onfocus="crIntLast='${key}'" oninput="crSetField('${key}',this.value);${extra || ''}">${crEsc(v)}</textarea>`;
}
// Le verbe choisi se place au début du champ objectif (principal ou individuel) et remplace un verbe de la liste déjà présent
function crIntVerb(v) {
  const k = (crIntLast === 'objectif_individuel') ? 'objectif_individuel' : 'objectif_principal';
  const el = document.getElementById('cr-int-' + k); if (!el) return;
  let t = el.value.replace(/^\s+/, '');
  CR_VERBS.slice().sort((a, b) => b.length - a.length).some(x => { if (t.toLowerCase().indexOf(x.toLowerCase()) === 0) { t = t.slice(x.length).replace(/^[\s,:–-]+/, ''); return true; } return false; });
  el.value = v + ' ' + (t ? t.charAt(0).toLowerCase() + t.slice(1) : '');
  crSetField(k, el.value); crIntVerbCheck(); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
}
// Rappel discret : l'objectif principal commence par un verbe à l'infinitif
function crIntVerbCheck() {
  const el = document.getElementById('cr-int-objectif_principal'), m = document.getElementById('cr-int-vchk'); if (!el || !m) return;
  const w = (el.value.trim().split(/\s+/)[0] || '').toLowerCase().replace(/[^a-zàâçéèêëîïôûùüœ]/g, '');
  const ok = !w || /(er|ir|re|oir)$/.test(w) || w === 'faire';
  m.style.display = ok ? 'none' : ''; m.textContent = ok ? '' : 'Astuce : commence par un verbe à l\u2019infinitif (améliorer, construire, mettre en place…).';
}
// Rappel discret : formuler la problématique sans négation
function crIntNeg(v) {
  const m = document.getElementById('cr-int-neg'); if (!m) return;
  const bad = /\bn[e']\s*\w*[^.]{0,25}\bpas\b|\bmanqu|\bmauvais|\bproblème|\bdifficult|\bjamais\b|\baucun|\bincapable/i.test(v || '');
  m.style.display = bad ? '' : 'none'; m.textContent = bad ? 'Astuce : formule ce qu\u2019il reste à construire plutôt que ce qui manque (ex. « comment exploiter… », « comment faire évoluer… »).' : '';
}
// Une puce ajoute un début de phrase au champ « objectif » dans lequel on écrivait en dernier
function crIntChip(btn) {
  const k = (crIntLast === 'objectif_individuel') ? 'objectif_individuel' : 'objectif_principal';
  const el = document.getElementById('cr-int-' + k); if (!el) return;
  const t = btn.textContent, cur = el.value;
  el.value = cur && !/\s$/.test(cur) ? cur + (/[.,;:]$/.test(cur) ? ' ' : ', ') + t.charAt(0).toLowerCase() + t.slice(1) : cur + t;
  crSetField(k, el.value); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
}
function crField(label, key, ph, multi) {
  const v = crCur[key] || '';
  return `<label class="cr-lbl">${label}</label>` + (multi
    ? `<textarea class="cr-in" rows="2" placeholder="${crEsc(ph)}" oninput="crSetField('${key}',this.value)">${crEsc(v)}</textarea>`
    : `<input class="cr-in" placeholder="${crEsc(ph)}" value="${crEsc(v)}" oninput="crSetField('${key}',this.value)">`);
}
function crSetField(k, v) {
  crCur[k] = v;
  if (k === 'title') { const h = document.getElementById('cr-head-title'); if (h) h.textContent = v || 'Sans titre'; }
  crTouch();
}
let crInfoOpen = true;
function crRenderEditor(p) {
  if (!p || typeof p !== 'object') return; // jamais de séance « vide » : celle qui est ouverte reste intacte
  crCur = p;
  if (!Array.isArray(p.blocks)) p.blocks = [];
  if (!Array.isArray(p.materiel)) p.materiel = [];
  if (!Array.isArray(p.videos)) p.videos = [];
  p.blocks.forEach(b => { if (!b.id) b.id = crUid(); if (!Array.isArray(b.exercises)) b.exercises = []; b.exercises = b.exercises.map(crNormEx); });
  document.getElementById('cr-list-view').style.display = 'none';
  document.getElementById('cr-ex-view').style.display = 'none';
  const ev = document.getElementById('cr-edit-view');
  ev.style.display = '';
  const done = p.status === 'terminee';
  const matChips = CR_MATERIEL.map(m => `<button type="button" class="cr-chip ${p.materiel.includes(m) ? 'on' : ''}" onclick="crToggleMat('${m}')">${p.materiel.includes(m) ? '✓' : '＋'} ${m}</button>`).join(' ');
  const customMat = p.materiel.filter(m => !CR_MATERIEL.includes(m)).map(m => `<button type="button" class="cr-chip on" onclick="crToggleMat(this.dataset.m)" data-m="${crEsc(m)}">✓ ${crEsc(m)}</button>`).join(' ');
  ev.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <button type="button" class="cr-btn" onclick="crBack()">←</button>
      <div id="cr-head-title" data-sc="${p.couleur || ''}" style="flex:1;font-size:17px;font-weight:800;color:var(--blanc);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${crEsc(p.title || 'Sans titre')}</div>
      <span class="cr-save-status" style="font-size:12px;color:#2ecc71;white-space:nowrap;">✓ Enregistré</span>
    </div>
    <div class="cr-edit-grid"><div class="cr-edit-l">
    <div class="cr-card">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><span class="cr-badge ${done ? 'ok' : ''}" id="cr-status-badge">${done ? 'Terminée' : 'Brouillon'}</span><span style="font-size:12px;color:var(--gris-texte);">Visible par les coachs uniquement.</span></div>
      <div style="margin-top:10px;"><button type="button" class="cr-btn" id="cr-status-btn" onclick="crToggleDone()">${done ? '↩ Repasser en brouillon' : '✓ Marquer comme terminée'}</button><button type="button" class="cr-btn" style="margin-left:6px;" onclick="seanceImportPlan(crCur.id, true)">📝 Utiliser pour le résumé de séance</button></div>
    </div>
    <div class="cr-card cr-int">
      <div style="font-size:16px;font-weight:800;color:var(--blanc);margin-bottom:2px;">Intention de la séance</div>
      <div style="font-size:12px;color:var(--gris-texte);margin-bottom:4px;">Du constat à l'objectif : pourquoi cette séance, face à quoi, et à quoi on reconnaît qu'elle a fonctionné.</div>
      ${crIntField('1a. Ce que j\'ai vu de positif', 'constat_positif', 'Un point d\'appui observé (match du week-end, dernier entraînement) : ce qui fonctionne déjà', 2)}
      ${crIntField('1b. La problématique qui en découle', 'constat', 'Ce qu\'il reste à construire, formulé comme un axe ou une question, sans négation', 2, "crIntNeg(this.value)")}
      <div class="cr-int-neg" id="cr-int-neg" style="display:none;"></div>
      ${crIntField('2. Objectif principal (collectif)', 'objectif_principal', 'Verbe à l\'infinitif + quoi + face à quoi / dans quelle situation', 2, "crIntVerbCheck()")}
      <div class="cr-chips cr-verbs" id="cr-int-verbs">${CR_VERBS.map(v => `<button type="button" class="cr-ctxchip cr-verbchip" onclick="crIntVerb('${v}')">${v}</button>`).join('')}</div>
      <div class="cr-int-neg" id="cr-int-vchk" style="display:none;"></div>
      <div class="cr-chips" id="cr-int-chips">${CR_CTX_CHIPS.map(c => `<button type="button" class="cr-ctxchip" onclick="crIntChip(this)">${crEsc(c)}</button>`).join('')}</div>
      ${crIntField('3. Objectif individuel', 'objectif_individuel', 'Un joueur ou un poste : ce que je lui demande dans ce contexte (un par ligne)', 2)}
      ${crIntField('4. Comportements attendus', 'comportements_attendus', 'Ce que je dois voir : un comportement observable par ligne', 3)}
      ${crIntField('5. Critères de réussite', 'criteres_reussite', 'À quoi je vois que c\'est réussi : un critère par ligne (chiffré si possible)', 2)}
    </div>
    <div class="cr-card">
      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="crInfoOpen=!crInfoOpen;document.getElementById('cr-info').style.display=crInfoOpen?'':'none';this.querySelector('span').textContent=crInfoOpen?'▲':'▼';">
        <div style="font-size:16px;font-weight:800;color:var(--blanc);">Informations générales</div><span style="color:var(--gris-texte);">${crInfoOpen ? '▲' : '▼'}</span></div>
      <div id="cr-info" style="${crInfoOpen ? '' : 'display:none;'}">
        ${crField('Titre', 'title', 'Titre de la séance')}
        <label class="cr-lbl">Type de séance</label>
        <div style="display:flex;gap:0;border:1px solid var(--gris-moyen);border-radius:8px;overflow:hidden;">
          <button type="button" class="cr-chip ${p.seance_type === 'handball' ? 'on' : ''}" style="flex:1;border-radius:0;border:none;padding:11px;" onclick="crSetType('handball')">Handball</button>
          <button type="button" class="cr-chip ${p.seance_type === 'babyhand' ? 'on' : ''}" style="flex:1;border-radius:0;border:none;padding:11px;" onclick="crSetType('babyhand')">🧸 BabyHand 3-5 ans</button>
        </div>
        <label class="cr-lbl">Couleur de la séance</label>
        <div class="cr-colrow">${CR_COULEURS.map(([k, l]) => `<button type="button" class="cr-colchip${p.couleur === k ? ' on' : ''}" data-sc="${k}" onclick="crSetColor('${k}')"><i></i>${l}</button>`).join('')}</div>
        <label class="cr-lbl">Catégorie</label>${crSel(CR_CATS, p.categorie, "crSetField('categorie',this.value)")}
        <label class="cr-lbl">Public</label>${crSel(CR_PUBLICS, p.public_cible, "crSetField('public_cible',this.value)")}
        ${crField('Niveau', 'niveau', 'Départemental, régional, détection…')}
        <label class="cr-lbl">Date</label><input type="date" class="cr-in" value="${crEsc(p.seance_date || '')}" onchange="crSetField('seance_date',this.value)">
        ${crField('Nombre de joueurs', 'nb_joueurs', '14, 12 à 16…')}
        ${crField('Entraîneur', 'entraineur', 'Nom de l\'entraîneur')}
        ${crField('Thème principal', 'theme', 'Montée de balle, défense étagée…')}
        ${crField('Objectifs secondaires', 'objectifs_secondaires', 'Un objectif par ligne', true)}
        ${crField('Contexte', 'contexte', 'Période de la saison, état du groupe…', true)}
        <label class="cr-lbl">Matériel général</label>
        <div id="cr-mat" style="display:flex;flex-wrap:wrap;gap:6px;">${matChips} ${customMat}</div>
        <div style="display:flex;gap:6px;margin-top:8px;"><input class="cr-in" id="cr-mat-other" placeholder="Autre matériel…"><button type="button" class="cr-btn" onclick="crAddMat()">Ajouter</button></div>
      </div>
    </div>
    </div><div class="cr-edit-r">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin:14px 2px 8px;"><div style="font-size:17px;font-weight:800;color:var(--blanc);">Déroulé</div><div style="font-size:13px;font-weight:800;color:var(--jaune);">Durée prévue : <span class="cr-total">${crFmtDur(crTotal(p))}</span></div></div>
    <div id="cr-blocks"></div>
    <button type="button" class="cr-add" style="margin-bottom:12px;" onclick="crAddBlock()">＋ Ajouter un bloc</button>
    <div class="cr-card">
      <div style="font-size:16px;font-weight:800;color:var(--blanc);margin-bottom:6px;">Matériel nécessaire</div>
      <div id="cr-mat-agg" style="font-size:14px;"></div>
    </div>
    <div class="cr-card">
      <div style="font-size:16px;font-weight:800;color:var(--blanc);margin-bottom:4px;">Vidéos de la séance</div>
      <div style="font-size:12px;color:var(--gris-texte);margin-bottom:8px;">Ajoute un lien (YouTube, Drive…) vers une démonstration filmée.</div>
      <div id="cr-videos"></div>
      <input class="cr-in" id="cr-vid-title" placeholder="Titre de la vidéo" style="margin-bottom:6px;">
      <div style="display:flex;gap:6px;"><input class="cr-in" id="cr-vid-url" placeholder="https://…" inputmode="url"><button type="button" class="cr-btn" onclick="crAddVideo()">Associer</button></div>
    </div>
    </div></div>
    <div class="cr-foot"><div><div style="font-size:10px;letter-spacing:1px;color:var(--gris-texte);font-weight:800;">DURÉE PRÉVUE</div><div class="cr-total" style="font-size:24px;font-weight:800;color:var(--blanc);">${crFmtDur(crTotal(p))}</div></div>
      <div style="display:flex;gap:8px;"><button type="button" class="cr-btn" style="padding:13px 14px;font-size:14px;" onclick="crLectOpen(crCur.id)">▶ Lire / Terrain</button>
      <button type="button" class="cr-btn primary" style="padding:13px 16px;font-size:14px;" onclick="crOpenFiche(crCur.id)">Aperçu fiche &amp; PDF →</button></div></div>`;
  crRenderBlocks();
  crRenderVideos();
  window.scrollTo(0, 0);
}
function crUpdateTotals() {
  const t = crFmtDur(crTotal(crCur));
  document.querySelectorAll('#cr-edit-view .cr-total').forEach(e => { e.textContent = t; });
  crCur.blocks.forEach((b, bi) => { const e = document.getElementById('cr-bd-' + bi); if (e) e.textContent = crFmtDur(crBlockMin(b)); });
  const m = document.getElementById('cr-mat-agg');
  if (m) { const tx = crEquipText(crEquipAgg(crCur)); m.textContent = tx || 'Aucun matériel renseigné pour l\u2019instant.'; m.style.color = tx ? 'var(--blanc)' : 'var(--gris-texte)'; }
}
function crBack() { crSaveNow(); crShowList(); crRenderFilters(); crRenderLegend(); crRenderList(); }
function crSetType(t) {
  crCur.seance_type = t;
  if (t === 'babyhand') { crCur.categorie = 'Baby (3-5 ans)'; }
  crTouch(); crRenderEditor(crCur);
}
function crToggleDone() {
  crCur.status = crCur.status === 'terminee' ? 'brouillon' : 'terminee';
  const done = crCur.status === 'terminee';
  const b = document.getElementById('cr-status-badge'); b.textContent = done ? 'Terminée' : 'Brouillon'; b.className = 'cr-badge ' + (done ? 'ok' : '');
  document.getElementById('cr-status-btn').textContent = done ? '↩ Repasser en brouillon' : '✓ Marquer comme terminée';
  crTouch();
}
function crToggleMat(m) {
  const i = crCur.materiel.indexOf(m);
  if (i >= 0) crCur.materiel.splice(i, 1); else crCur.materiel.push(m);
  crTouch();
  const open = document.getElementById('cr-info') ? true : false;
  const sy = window.scrollY;
  crRenderEditor(crCur); window.scrollTo(0, sy);
}
function crAddMat() {
  const inp = document.getElementById('cr-mat-other');
  const v = (inp.value || '').trim();
  if (!v) return;
  if (!crCur.materiel.includes(v)) crCur.materiel.push(v);
  crTouch();
  const sy = window.scrollY; crRenderEditor(crCur); window.scrollTo(0, sy);
}
function crBlockMin(b) {
  const ex = b.exercises || [];
  return ex.length ? ex.reduce((s, x) => s + (parseInt(x.minutes, 10) || 0), 0) : (parseInt(b.minutes, 10) || 0);
}
function crTotal(p) { return (p.blocks || []).reduce((s, b) => s + crBlockMin(b), 0); }
function crSyncBlockMinutes(p) { (p.blocks || []).forEach(b => { if ((b.exercises || []).length) b.minutes = crBlockMin(b); }); }
function crThumb(x) {
  const kd = crKind(x), n0 = x.schemaLib && x.schemaLib.drawings ? x.schemaLib.drawings.length : 0;
  if (kd === 'renfo') { const r = crNormRenfo(x.renfo); return `<div class="cr-thumb kd"><b>💪</b><em>${r.format === 'circuit' ? 'Circuit' : 'Séries'} · ${r.moves.length}</em></div>`; }
  if (kd === 'jeu' && !n0 && !crSchemaHas(x)) return `<div class="cr-thumb kd"><b>🎲</b><em>Jeu</em></div>`;
  const n = x.schemaLib && x.schemaLib.drawings ? x.schemaLib.drawings.length : 0;
  let inner = '<span>Pas de schéma</span>';
  try {
    if (n) inner = schDrawingSvg(x.schemaLib.drawings[0], { showBallStart: false });
    else if (crSchemaHas(x)) inner = crSvgStatic(x.schema, 0);
  } catch (e) {}
  return `<div class="cr-thumb">${inner}${n > 1 ? `<i>${n} étapes</i>` : ''}</div>`;
}
function crRenderBlocks() {
  const p = crCur;
  const el = document.getElementById('cr-blocks');
  if (!p.blocks.length) { el.innerHTML = '<div style="text-align:center;color:var(--gris-texte);font-size:13px;padding:12px;">Aucun bloc — ajoute le premier ci-dessous.</div>'; crUpdateTotals(); return; }
  let num = 0;
  el.innerHTML = p.blocks.map((b, bi) => {
    const nEx = (b.exercises || []).length;
    const dur = nEx ? `<span class="cr-bdur" id="cr-bd-${bi}">${crFmtDur(crBlockMin(b))}</span>`
      : `<div class="cr-step"><button type="button" onclick="crStep(${bi},-5)">−</button><input type="number" inputmode="numeric" min="0" id="cr-min-${bi}" value="${parseInt(b.minutes, 10) || 0}" oninput="crBlockField(${bi},'minutes',this.value)"><span style="font-size:12px;color:var(--gris-texte);">min</span><button type="button" onclick="crStep(${bi},5)">+</button></div>`;
    const exs = (b.exercises || []).map((x, ei) => {
      num++;
      const first = crFlatIdx(bi, ei) === 0, last = crFlatIdx(bi, ei) === crExFlat().length - 1;
      const meta = [crHeadcountText(x), crEquipText(crNormEquip(x.equipment))].filter(Boolean).join(' · ');
      const obj = crTxt(x.objective);
      return `<div class="cr-ex2">
        <div class="cr-ex2-main" onclick="crOpenEx(${bi},${ei})">${crThumb(x)}
          <div class="cr-ex2-info"><small>Exercice ${num}</small><b>${crEsc(x.name || 'Exercice')}</b>${obj ? `<span class="o">${crEsc(obj)}</span>` : ''}${meta ? `<span class="m">${crEsc(meta)}</span>` : ''}${crKind(x) !== 'schema' ? `<span class="m">${crEsc(crKindMeta(x))}</span>` : ''}${crHasGb(x) && crKind(x) !== 'renfo' ? '<span class="m">🧤 travail GB</span>' : ''}</div>
          <span class="cr-ex2-dur">${x.minutes ? x.minutes + ' min' : '—'}</span></div>
        <div class="cr-ex2-act"><button type="button" ${first ? 'disabled' : ''} onclick="crMoveEx(${bi},${ei},-1)" title="Monter (passe dans le bloc précédent en haut de bloc)">↑</button><button type="button" ${last ? 'disabled' : ''} onclick="crMoveEx(${bi},${ei},1)" title="Descendre (passe dans le bloc suivant en bas de bloc)">↓</button><button type="button" onclick="crDupEx(${bi},${ei})" title="Dupliquer">⧉</button><button type="button" style="color:#ff6b6b;" onclick="crDelEx(${bi},${ei})" title="Supprimer">✕</button></div>
      </div>`;
    }).join('');
    return `
    <div class="cr-block">
      <div class="cr-block-head">
        <input class="cr-block-name" value="${crEsc(b.name)}" placeholder="Nom du bloc" oninput="crBlockField(${bi},'name',this.value)">
        ${dur}
      </div>
      <input class="cr-block-obj" value="${crEsc(b.objective || '')}" placeholder="🎯 Objectif du bloc (une ligne)" oninput="crBlockField(${bi},'objective',this.value)">
      <div class="cr-actions">
        <button type="button" ${bi === 0 ? 'disabled' : ''} onclick="crMoveBlock(${bi},-1)">↑</button>
        <button type="button" ${bi === p.blocks.length - 1 ? 'disabled' : ''} onclick="crMoveBlock(${bi},1)">↓</button>
        <button type="button" onclick="crDupBlock(${bi})" title="Dupliquer">⧉</button>
        <button type="button" style="color:#ff6b6b;" onclick="crDelBlock(${bi})" title="Supprimer">✕</button>
      </div>
      ${exs}
      <button type="button" class="cr-add" onclick="crKindPick(${bi})">＋ Ajouter un exercice</button>
    </div>`;
  }).join('');
  crUpdateTotals();
}
function crFlatIdx(bi, ei) { return crExFlat().findIndex(a => a[0] === bi && a[1] === ei); }
function crBlockField(bi, k, v) {
  if (k === 'minutes') { crCur.blocks[bi].minutes = Math.max(0, parseInt(v, 10) || 0); crUpdateTotals(); }
  else crCur.blocks[bi][k] = v;
  crTouch();
}
function crStep(bi, d) {
  const b = crCur.blocks[bi];
  b.minutes = Math.max(0, (parseInt(b.minutes, 10) || 0) + d);
  document.getElementById('cr-min-' + bi).value = b.minutes;
  crUpdateTotals(); crTouch();
}
function crAddBlock() { crCur.blocks.push({ id: crUid(), name: 'Nouveau bloc', minutes: 10, exercises: [] }); crTouch(); crRenderBlocks(); }
function crMoveBlock(bi, d) {
  const j = bi + d; if (j < 0 || j >= crCur.blocks.length) return;
  const a = crCur.blocks; [a[bi], a[j]] = [a[j], a[bi]]; crTouch(); crRenderBlocks();
}
// Copies : tout ce qui est imbriqué reçoit de nouveaux identifiants (éléments de schéma et liens compris)
function crCloneDrawings(L) {
  const map = {};
  L.drawings.forEach(d => { d.id = schUid(); (d.elements || []).forEach(e => { const n = schUid(); map[e.id] = n; e.id = n; }); });
  L.drawings.forEach(d => (d.elements || []).forEach(e => ['fromElementId', 'toElementId', 'holderId', 'ballId'].forEach(k => { if (e[k] && map[e[k]]) e[k] = map[e[k]]; })));
}
function crCloneEx(x) {
  const c = JSON.parse(JSON.stringify(crNormEx(x)));
  c.id = crUid();
  Object.keys(c.items).forEach(k => c.items[k].forEach(it => { it.id = crUid(); }));
  (c.evolutions || []).forEach(e => { e.id = crUid(); });
  c.equipment.forEach(e => { e.id = crUid(); });
  if (c.renfo) c.renfo.moves.forEach(m => { m.id = crUid(); });
  if (c.gb) { c.gb.instructions.forEach(it => { it.id = crUid(); }); c.gb.success.forEach(it => { it.id = crUid(); }); c.gb.equipment.forEach(e => { e.id = crUid(); }); if (c.gb.schemaLib) { delete c.gb.schemaLib.own; if (c.gb.schemaLib.pend || c.gb.schemaLib.fromOld) c.gb.schemaLib.id = schUuid(); crCloneDrawings(c.gb.schemaLib); } }
  if (c.schemaLib) { crCloneDrawings(c.schemaLib); delete c.schemaLib.own; if (c.schemaLib.pend || c.schemaLib.fromOld) c.schemaLib.id = schUuid(); }
  return c;
}
function crCloneBlock(b) { const c = JSON.parse(JSON.stringify(b)); c.id = crUid(); c.exercises = (b.exercises || []).map(crCloneEx); return c; }
function crNextTitle(t) { t = t || ''; const m = /^(.*?)(\d+)\s*$/.exec(t); return m ? m[1] + (parseInt(m[2], 10) + 1) : t + ' (copie)'; }
function crDupBlock(bi) { crCur.blocks.splice(bi + 1, 0, crCloneBlock(crCur.blocks[bi])); crTouch(); crRenderBlocks(); }
function crDupEx(bi, ei) { const a = crCur.blocks[bi].exercises; a.splice(ei + 1, 0, crCloneEx(a[ei])); crTouch(); crRenderBlocks(); }
function crMoveEx(bi, ei, d) {
  const bl = crCur.blocks, a = bl[bi].exercises, j = ei + d;
  if (j >= 0 && j < a.length) { [a[ei], a[j]] = [a[j], a[ei]]; }
  else {
    const nb = bi + d; if (nb < 0 || nb >= bl.length) return;
    const x = a.splice(ei, 1)[0];
    if (d < 0) bl[nb].exercises.push(x); else bl[nb].exercises.unshift(x);
  }
  crTouch(); crRenderBlocks();
}
function crDelBlock(bi) {
  const b = crCur.blocks[bi];
  if ((b.exercises || []).length && !confirm('Supprimer ce bloc et ses exercices ?')) return;
  crCur.blocks.splice(bi, 1); crTouch(); crRenderBlocks();
}
function crAddEx(bi) {
  const x = crNormEx({ name: 'Nouvel exercice', minutes: 10 });
  crCur.blocks[bi].exercises.push(x);
  crTouch();
  crOpenEx(bi, crCur.blocks[bi].exercises.length - 1, true);
}
function crDelEx(bi, ei) {
  if (!confirm('Supprimer cet exercice ?')) return;
  crCur.blocks[bi].exercises.splice(ei, 1); crTouch(); crRenderBlocks();
}
// Matériel global : matériel de la séance + de chaque exercice (ballons, GB inclus), fusionné par nom, quantité maximale
function crEquipAgg(p) {
  const map = new Map();
  const add = (name, qty) => { name = crTxt(name); if (!name) return; const k = crFold(name), q = parseInt(qty, 10) || 0, c = map.get(k); if (!c) map.set(k, { name, qty: q }); else c.qty = Math.max(c.qty, q); };
  (p.materiel || []).forEach(n => add(n, 0));
  (p.blocks || []).forEach(b => (b.exercises || []).forEach(raw => {
    const x = crNormEx(raw);
    x.equipment.forEach(e => add(e.name, e.qty));
    const bl = parseInt(x.balls, 10); if (bl > 0) add('Ballons', bl);
    if (x.gb) x.gb.equipment.forEach(e => add(e.name, e.qty));
  }));
  return Array.from(map.values());
}
function crEquipText(list) { return (list || []).map(e => (e.qty > 0 ? e.qty + ' ' : '') + e.name.toLowerCase()).join(' · '); }
// Recherche plein texte (sans accents ni casse) : séance, blocs, exercices et tous les textes des listes
function crPlanText(p) {
  const parts = [p.title, p.categorie, p.public_cible, p.theme, p.objectif_principal, p.objectifs_secondaires, p.contexte, p.constat_positif, p.constat, p.objectif_individuel, p.comportements_attendus, p.criteres_reussite, p.niveau, p.entraineur, p.nb_joueurs].concat(p.materiel || []);
  (p.blocks || []).forEach(b => {
    parts.push(b.name);
    (b.exercises || []).forEach(raw => {
      const x = crNormEx(raw);
      parts.push(x.name, x.objective, x.theme, x.subTheme, x.space, x.headcount.players);
      CR_ORG_FIELDS.forEach(([k]) => parts.push(x.org[k]));
      Object.keys(x.items).forEach(k => x.items[k].forEach(it => parts.push(it.text, it.extra, it.tag)));
      x.evolutions.forEach(e => parts.push(e.title, e.text));
      x.equipment.forEach(e => parts.push(e.name));
      if (x.gb) { parts.push(x.gb.objective); x.gb.instructions.concat(x.gb.success).forEach(it => parts.push(it.text)); x.gb.equipment.forEach(e => parts.push(e.name)); }
    });
  });
  return crFold(parts.filter(Boolean).join(' '));
}
function crDownloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function crBackup() {
  const data = { app: 'PrepaU15', type: 'seances', exported_at: new Date().toISOString(), count: crPlans.length, plans: crPlans };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const name = 'sauvegarde-seances-' + dateStr(new Date()) + '.json';
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (('ontouchstart' in window) && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(e => { if (!e || e.name !== 'AbortError') crDownloadBlob(blob, name); });
      return;
    }
  } catch (e) {}
  crDownloadBlob(blob, name);
}
function crRenderVideos() {
  const el = document.getElementById('cr-videos');
  if (!el) return;
  el.innerHTML = crCur.videos.map((v, i) => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;"><a href="${crEsc(v.url)}" target="_blank" rel="noopener" style="flex:1;min-width:0;color:var(--jaune);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">▶ ${crEsc(v.title || v.url)}</a><button type="button" class="cr-btn sm danger" onclick="crDelVideo(${i})">✕</button></div>`).join('');
}
function crAddVideo() {
  const t = document.getElementById('cr-vid-title'), u = document.getElementById('cr-vid-url');
  let url = (u.value || '').trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  crCur.videos.push({ title: (t.value || '').trim(), url });
  t.value = ''; u.value = '';
  crTouch(); crRenderVideos();
}
function crDelVideo(i) { crCur.videos.splice(i, 1); crTouch(); crRenderVideos(); }

// ----- Actions de liste -----
async function crPatch(id, fields) {
  await ensureCoachSession();
  const ts = new Date().toISOString();
  const res = await fetch(SB_URL + '/rest/v1/seance_plans?id=eq.' + id + '&select=id,updated_at', { method: 'PATCH', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ ...fields, updated_at: ts }) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  let srv = ts; try { const r = await res.json(); if (r && r[0] && r[0].updated_at) srv = r[0].updated_at; } catch (e) {}
  const pl = crPlans.find(x => x.id === id); if (pl) pl.updated_at = srv; // la version connue reste à jour (sinon le prochain enregistrement croirait à un conflit)
}
async function crDuplicate(id) {
  const s = crPlans.find(p => p.id === id); if (!s) return;
  const copy = { title: crNextTitle(s.title), seance_type: s.seance_type, status: 'brouillon', is_template: false, categorie: s.categorie, public_cible: s.public_cible, niveau: s.niveau, seance_date: null, nb_joueurs: s.nb_joueurs,
    entraineur: s.entraineur, theme: s.theme, objectif_principal: s.objectif_principal, objectifs_secondaires: s.objectifs_secondaires, contexte: s.contexte, materiel: s.materiel || [],
    blocks: (s.blocks || []).map(crCloneBlock), videos: s.videos || [], total_minutes: crTotal(s), ...(s.couleur !== undefined ? { couleur: s.couleur } : {}), ...crIntCopy(s) };
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/seance_plans', { method: 'POST', headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify([copy]) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    crPlans.unshift((await res.json())[0]);
    crFilter = 'toutes'; crRenderFilters(); crRenderList();
  } catch (e) { alert('Duplication impossible (' + (e.message || e) + ').'); }
}
async function crToggleTemplate(id) {
  const p = crPlans.find(x => x.id === id); if (!p) return;
  try { await crPatch(id, { is_template: !p.is_template }); p.is_template = !p.is_template; crRenderFilters(); crRenderList(); }
  catch (e) { alert('Action impossible (' + (e.message || e) + ').'); }
}
async function crArchive(id) {
  const p = crPlans.find(x => x.id === id); if (!p) return;
  const st = p.status === 'archivee' ? 'brouillon' : 'archivee';
  try { await crPatch(id, { status: st }); p.status = st; crRenderFilters(); crRenderList(); }
  catch (e) { alert('Action impossible (' + (e.message || e) + ').'); }
}
async function crDelete(id) {
  const p = crPlans.find(x => x.id === id); if (!p) return;
  if (!confirm('Supprimer définitivement « ' + p.title + ' » ?')) return;
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/seance_plans?id=eq.' + id, { method: 'DELETE', headers: coachAuthHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    crPlans = crPlans.filter(x => x.id !== id); crRenderFilters(); crRenderList();
  } catch (e) { alert('Suppression impossible (' + (e.message || e) + ').'); }
}

// ----- Fiche de séance (aperçu + impression A4 / PDF) -----
let crFiche = null, crFicheTitleBak = null, crFicheAnimMap = {};
const CR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function crDateLong(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (!m) return '';
  return (+m[3]) + (m[3] === '01' ? 'er' : '') + ' ' + (CR_MONTHS[+m[2] - 1] || '') + ' ' + m[1];
}
function crCirc(n) { return n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : '(' + n + ')'; }
function crFicheSlug(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'fiche-de-seance'; }
function crOpenFiche(id, exId) {
  const p = (crCur && crCur.id === id) ? crCur : crPlans.find(x => x.id === id);
  if (!p) return;
  const live = !!(crCur && crCur.id === id); // séance modifiable : crayon ✎ sur les exercices
  if (live) crSaveNow();
  crFiche = { id, title: p.title }; crFicheAnimMap = {};
  const cell = (l, v) => crTxt(v) ? `<div class="cr-fiche-cell"><small>${l}</small><b>${crEsc(v)}</b></div>` : '';
  const lines = t => (t || '').split('\n').map(s => s.replace(/^\s*[-•·*]+\s*/, '').trim()).filter(Boolean);
  const total = crTotal(p), pl = crTxt(p.nb_joueurs);
  const cat = (p.seance_type === 'babyhand' ? ['BabyHand'] : []).concat([p.categorie, p.public_cible].map(crTxt).filter(Boolean)).join(' · ');
  let exNum = 0, rows = '', arts = '';
  (p.blocks || []).forEach((b, bi) => {
    const list = b.exercises || [];
    rows += `<div class="cr-fiche-row blk"><span>${crEsc(b.name || 'Bloc')}${crTxt(b.objective) ? `<em class="cr-fiche-bobj"> — ${crEsc(b.objective)}</em>` : ''}</span><span>${crFmtDur(crBlockMin(b))}</span></div>`;
    list.forEach((raw, ei) => {
      const x = crNormEx(raw), n = ++exNum;
      rows += `<a class="cr-fiche-link" href="#crfx-${x.id}" onclick="crFicheGo('${x.id}');return false;"><span>${n}. ${crEsc(x.name || 'Exercice')}</span><span>${x.minutes ? crFmtDur(x.minutes) : ''}</span></a>`;
      arts += crFicheEx(x, n, b.name, bi, ei, live);
    });
  });
  const sec = lines(p.objectifs_secondaires), eqAll = crEquipText(crEquipAgg(p));
  const cmp = lines(p.comportements_attendus), crit = lines(p.criteres_reussite), indiv = lines(p.objectif_individuel);
  const constatH = (crTxt(p.constat_positif) || crTxt(p.constat)) ? `<div class="cr-fiche-cst"><h3>Constat</h3>${crTxt(p.constat_positif) ? `<div><b>Point d\u2019appui :</b> ${crEsc(p.constat_positif).replace(/\n/g, '<br>')}</div>` : ''}${crTxt(p.constat) ? `<div style="margin-top:4px;"><b>Problématique :</b> ${crEsc(p.constat).replace(/\n/g, '<br>')}</div>` : ''}</div>` : '';
  const obj2 = (indiv.length || cmp.length || crit.length) ? `<div class="cr-fiche-cmp">${indiv.length ? `<div><h3>Objectif individuel</h3><ul>${indiv.map(l => `<li>${crEsc(l)}</li>`).join('')}</ul></div>` : ''}${cmp.length ? `<div><h3>Comportements attendus</h3><ul>${cmp.map(l => `<li>${crEsc(l)}</li>`).join('')}</ul></div>` : ''}${crit.length ? `<div><h3>Critères de réussite</h3><ul>${crit.map(l => `<li>${crEsc(l)}</li>`).join('')}</ul></div>` : ''}</div>` : '';
  const obj = constatH + ((crTxt(p.objectif_principal) || sec.length) ? `<div class="cr-fiche-obj">${crTxt(p.objectif_principal) ? `<h3>Objectif de la séance</h3><div class="main">${crEsc(p.objectif_principal).replace(/\n/g, '<br>')}</div>` : ''}${sec.length ? `<h3>Objectifs secondaires</h3><ul>${sec.map(l => `<li>${crEsc(l)}</li>`).join('')}</ul>` : ''}</div>` : '') + obj2;
  const ctx = crTxt(p.contexte) ? `<div><div class="cr-fiche-h">Contexte</div><div>${crEsc(p.contexte).replace(/\n/g, '<br>')}</div></div>` : '', mat = eqAll ? `<div><div class="cr-fiche-h">Matériel global</div><div>${crEsc(eqAll)}</div></div>` : '';
  const vids = (p.videos || []).length ? `<div class="cr-fiche-h">Vidéos</div>${(p.videos || []).map(v => `<div style="font-size:13px;word-break:break-all;">▶ ${crEsc(v.title || '')} <a href="${crEsc(v.url)}">${crEsc(v.url)}</a></div>`).join('')}` : '';
  document.getElementById('cr-fiche').innerHTML = `
    <div class="cr-fiche-bar"><button type="button" onclick="crCloseFiche()">← Retour</button><span class="cr-fiche-sp"></span><span id="cr-fiche-msg" class="msg" role="status"></span>
      <span class="cr-fiche-cols">Colonnes <button type="button" data-c="1" onclick="crFicheCols(1)">1</button><button type="button" data-c="2" onclick="crFicheCols(2)">2</button><button type="button" data-c="3" onclick="crFicheCols(3)">3</button></span>
      <button type="button" onclick="crFichePrint(false)">🖨 Aperçu / Imprimer</button><button type="button" class="pdf" onclick="crFichePrint(true)">⬇ PDF</button></div>
    <div class="cr-fiche-page" data-sc="${p.couleur || ''}">
      <div class="cr-fiche-head"><div><div class="cr-fiche-kicker">Fiche de séance</div><h1>${crEsc(p.title)}</h1>${crTxt(p.theme) ? `<div class="cr-fiche-sub">${crEsc(p.theme)}</div>` : ''}</div><img class="cr-fiche-logo" src="icon-192.png" alt="" onerror="this.style.display='none'"></div>
      <div class="cr-fiche-rule"></div>
      <div class="cr-fiche-grid">${cell('Catégorie', cat)}${cell('Date', crDateLong(p.seance_date))}${cell('Durée', total ? crFmtDur(total) : '')}${cell('Effectif', pl ? (/^\d+$/.test(pl) ? pl + ' joueur' + (pl === '1' ? '' : 's') : pl) : '')}${cell('Entraîneur', p.entraineur)}${cell('Niveau', p.niveau)}</div>
      ${obj}
      ${ctx || mat ? `<div class="cr-fiche-cols${ctx && mat ? ' two' : ''}">${ctx}${mat}</div>` : ''}
      <div class="cr-fiche-h">Déroulé de la séance</div>
      ${exNum || (p.blocks || []).length ? `<div class="cr-fiche-table">${rows}<div class="cr-fiche-row tot"><span>Durée totale</span><span>${crFmtDur(total)}</span></div></div>` : ''}
      ${exNum ? '' : `<div class="cr-fiche-empty">Aucun exercice pour l'instant. <a href="#" onclick="crCloseFiche();return false;">Ajouter des exercices</a></div>`}
      ${vids}
      ${arts}
      <div class="cr-fiche-foot">Handball Club Clermont Salagou · Filière masculine</div>
    </div>`;
  document.getElementById('cr-fiche').classList.add('show'); crFicheCols();
  document.getElementById('cr-fiche').scrollTop = 0;
  if (exId) { const t = document.getElementById('crfx-' + exId); if (t) t.scrollIntoView(); }
}
function crCloseFiche() { document.getElementById('cr-fiche').classList.remove('show'); crFicheRestoreTitle(); }
// ----- Mode « Lire / Terrain » : la séance se lit exercice par exercice (schéma animable, dispositif, rotations, comportements attendus, critères de réussite), sans passer par le PDF -----
let crLect = null, crLectBound = false;
// Mise en page : « côte à côte » (schéma à gauche, texte à droite) ou « empilé » (schéma au-dessus). Par défaut : côte à côte dès que l'écran est assez large (tablette, en paysage comme en portrait) ; le choix du coach est mémorisé sur l'appareil.
function crLectLayoutPref() { try { const v = localStorage.getItem('crLectLayout'); return v === 'side' || v === 'stack' ? v : ''; } catch (e) { return ''; } }
function crLectIsSide() { const v = crLectLayoutPref(); return v ? v === 'side' : innerWidth >= 700; }
function crLectApplyLayout() { const el = document.getElementById('cr-lect'); if (!el) return; el.classList.toggle('side', crLectIsSide()); el.classList.toggle('narrow', innerWidth < 1000); }
function crLectLayout() { try { localStorage.setItem('crLectLayout', crLectIsSide() ? 'stack' : 'side'); } catch (e) {} crLectRender(); }
function crLectOpen(id, exId) {
  const p = (crCur && crCur.id === id) ? crCur : crPlans.find(x => x.id === id);
  if (!p) return;
  const items = [];
  (p.blocks || []).forEach((b, bi) => (b.exercises || []).forEach((raw, ei) => items.push({ x: crNormEx(raw), bname: b.name || 'Bloc', bi, ei })));
  let k = exId ? items.findIndex(i => i.x.id === exId) : 0; if (k < 0) k = 0;
  crLect = { p, items, k, sec: 'main', step: 0, toc: false };
  { const lectEl = document.getElementById('cr-lect'); if (lectEl) lectEl.setAttribute('data-sc', p.couleur || ''); }
  if (!crLectBound) {
    crLectBound = true;
    document.addEventListener('keydown', ev => { if (!crLect || ev.target.closest && ev.target.closest('input,textarea,select')) return; if (ev.key === 'ArrowRight') crLectGo(1); else if (ev.key === 'ArrowLeft') crLectGo(-1); else if (ev.key === 'Escape' && !document.getElementById('sch-player')) crLectClose(); });
    document.addEventListener('visibilitychange', () => { if (crLect && document.visibilityState === 'visible' && !wakeLock) acquireWakeLock(); });
    let t0 = null; const el = document.getElementById('cr-lect');
    el.addEventListener('touchstart', ev => { t0 = ev.touches.length === 1 ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null; }, { passive: true });
    el.addEventListener('touchend', ev => { if (!t0 || !crLect) return; const t = ev.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y; t0 = null; if (Math.abs(dx) > 80 && Math.abs(dy) < 50 && Math.abs(dx) > 2 * Math.abs(dy)) crLectGo(dx < 0 ? 1 : -1); }, { passive: true });
  }
  acquireWakeLock(); // l'écran reste allumé pendant la lecture sur le terrain
  document.getElementById('cr-lect').classList.add('show'); crLectRender();
}
function crLectClose() {
  crLectRfStop(); crLectAnimStop(); crLect = null; const el = document.getElementById('cr-lect'); if (el) { el.classList.remove('show'); el.innerHTML = ''; }
  if (typeof sessionId === 'undefined' || !sessionId) releaseWakeLock();
}
function crLectGo(d, abs) {
  const S = crLect; if (!S) return; const k = abs ? d : S.k + d;
  if (k < 0 || k >= S.items.length) return;
  crLectRfStop(); crLectAnimStop(); S.k = k; S.sec = 'main'; S.step = 0; S.toc = false; crLectRender();
}
// Le schéma prend toute la place disponible sans déborder (puis le bouton Animer reste visible)
function crLectFit() {
  const el = document.getElementById('cr-lect'), S = crLect; if (!S || !el) return;
  crLectApplyLayout();
  const box = el.querySelector('.crl-svg'), fc = el.querySelector('.crl-figc'); if (!box || !fc) return;
  let ratio = S.anim ? S.anim.ratio : 0;
  if (!ratio) { const svg = box.querySelector('svg'); if (!svg) return; const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number); ratio = vb[2] > 0 ? vb[3] / vb[2] : 0.8; }
  const w = box.clientWidth; if (!w) return;
  const two = getComputedStyle(el.querySelector('.crl-main')).display === 'grid';
  const chips = el.querySelector('.crl-steps'), bar = el.querySelector('.crl-figbar'), pr = el.querySelector('.crl-aprog');
  const avail = two ? fc.clientHeight - (chips ? chips.offsetHeight + 8 : 0) - (bar ? bar.offsetHeight + 20 : 0) - (pr ? 16 : 0) - 8 : innerHeight * 0.68;
  const h = Math.max(160, Math.min(w * ratio, avail));
  S.fitW = Math.floor(Math.min(w, h / ratio));
  const svg = box.querySelector('svg'); if (svg) { svg.style.width = S.fitW + 'px'; svg.style.margin = '0 auto'; }
  if (pr) { pr.style.width = S.fitW + 'px'; }
}
window.addEventListener('resize', () => { if (crLect) { crLectApplyLayout(); crLectFit(); } });
function crLectSec(s) { const S = crLect; if (!S) return; crLectRfStop(); crLectAnimStop(); S.sec = s; S.step = 0; crLectRender(); }
function crLectStep(i) { const S = crLect; if (!S) return; S.step = i; crLectRender(); }
function crLectToc() { const S = crLect; if (!S) return; S.toc = !S.toc; crLectRender(); }
// Lecture directe dans le schéma (sans changer d'écran) : toute la séquence d'un trait, sans pause ni étapes ; on peut la rejouer à volonté ou la mettre en boucle
function crLectCurL() { const S = crLect; if (!S) return null; const x = S.items[S.k].x; return S.sec === 'gb' ? (x.gb || {}).schemaLib : x.schemaLib; }
function crLectLoopOn() { try { return localStorage.getItem('crLectLoop') === '1'; } catch (e) { return false; } }
function crLectAnimStop() { const S = crLect; if (S && S.anim) { cancelAnimationFrame(S.anim.raf); S.anim = null; } }
function crLectAnim() {
  const S = crLect, L = crLectCurL(); if (!S || !L || !crSchAnimOk(L)) return;
  crLectAnimStop();
  const tl = schTimeline(L.drawings); let ratio = 0;
  tl.ph.forEach(ph => { const vb = schView(ph.d.view).vb; if (vb[2] > 0) ratio = Math.max(ratio, vb[3] / vb[2]); });
  S.anim = { tl, t: 0, playing: true, last: performance.now(), raf: 0, hold: 0, done: false, ratio: ratio || 0.8 };
  crLectFigRefresh(); S.anim.raf = requestAnimationFrame(crLectAnimLoop);
}
function crLectAnimReplay() {
  const S = crLect, a = S && S.anim; if (!a) { crLectAnim(); return; }
  cancelAnimationFrame(a.raf); a.t = 0; a.hold = 0; a.playing = true; a.done = false; a.last = performance.now();
  crLectFigRefresh(); a.raf = requestAnimationFrame(crLectAnimLoop);
}
function crLectAnimClose() { crLectAnimStop(); crLectFigRefresh(); }
function crLectLoopToggle() {
  const on = !crLectLoopOn(); try { localStorage.setItem('crLectLoop', on ? '1' : '0'); } catch (e) {}
  const a = crLect && crLect.anim; if (a && on && a.done) { crLectAnimReplay(); return; } crLectFigRefresh();
}
function crLectAnimLoop(now) {
  const S = crLect, a = S && S.anim; if (!a) return;
  if (a.playing) {
    const dt = Math.min(0.1, (now - a.last) / 1000);
    if (a.hold > 0) { a.hold -= dt; if (a.hold <= 0) { a.hold = 0; a.t = 0; } }
    else {
      a.t += dt;
      if (a.t >= a.tl.total) {
        a.t = a.tl.total;
        if (crLectLoopOn()) a.hold = 0.9; else { a.playing = false; a.done = true; crLectDrawAnim(); crLectFigRefresh(); return; }
      }
    }
    crLectDrawAnim();
  }
  a.last = now; a.raf = requestAnimationFrame(crLectAnimLoop);
}
function crLectDrawAnim() {
  const S = crLect, a = S && S.anim, st = document.getElementById('crl-stage'); if (!a || !st) return;
  const r = schAt(a.tl, a.t), vw = schView(r.view);
  st.innerHTML = `<svg viewBox="${vw.vb.join(' ')}" xmlns="http://www.w3.org/2000/svg" style="display:block;width:${S.fitW ? S.fitW + 'px' : '100%'};margin:0 auto;border-radius:10px;background:#fff;">${schCourtSvg(r.view)}${schBodySvg(r.frame)}</svg>`;
  const b = document.getElementById('crl-prog-a'); if (b) b.style.width = Math.round(a.t / a.tl.total * 100) + '%';
}
function crLectFigRefresh() {
  const el = document.getElementById('cr-lect'), c = el && el.querySelector('.crl-figc'); if (!crLect || !c) return;
  c.innerHTML = crLectFig(); crLectFit(); if (crLect.anim) crLectDrawAnim();
}
// zone « schéma » : schéma fixe + étapes, ou animation en cours
function crLectFigSchema() {
  const S = crLect, x = S.items[S.k].x, gb = S.sec === 'gb' && crHasGb(x), L = crLectCurL();
  if (L && L.drawings && L.drawings.length) {
    const nd = L.drawings.length; if (S.step >= nd) S.step = 0;
    const can = crSchAnimOk(L), a = S.anim, loop = crLectLoopOn();
    const leg = `<span class="crl-leg">Les numéros indiquent l'ordre des actions (même numéro : en même temps). Trait pointillé : passe.</span>`;
    const loopBtn = `<button type="button" class="crl-fbtn${loop ? ' on' : ''}" onclick="crLectLoopToggle()" aria-pressed="${loop}">🔁 En boucle</button>`;
    if (a) {
      return `<div class="crl-svg" id="crl-stage"></div><div class="crl-aprog"><i id="crl-prog-a"></i></div>`
        + `<div class="crl-figbar">${a.done ? `<button type="button" class="crl-anim" onclick="crLectAnimReplay()">↻ Rejouer</button>` : `<button type="button" class="crl-anim" onclick="crLectAnimClose()">■ Arrêter</button>`}${loopBtn}${a.done ? `<button type="button" class="crl-fbtn" onclick="crLectAnimClose()">Revenir au schéma</button>` : ''}</div>`;
    }
    const chips = nd > 1 ? `<div class="crl-steps">${L.drawings.map((d, i) => `<button type="button" class="${S.step === i ? 'on' : ''}" onclick="crLectStep(${i})">${crEsc(d.title)}</button>`).join('')}<button type="button" class="${S.step === -1 ? 'on' : ''}" onclick="crLectStep(-1)">Toutes</button></div>` : '';
    const body = S.step === -1 ? `<div class="crl-all">${L.drawings.map((d, i) => `<figure><figcaption>${crCirc(i + 1)} ${crEsc(d.title)}</figcaption>${schDrawingSvg(d, { showBallStart: false })}</figure>`).join('')}</div>` : `<div class="crl-svg">${schDrawingSvg(L.drawings[S.step], { showBallStart: false })}</div>`;
    return chips + body + `<div class="crl-figbar">${can ? `<button type="button" class="crl-anim" onclick="crLectAnim()">▶ Animer</button>${loopBtn}<button type="button" class="crl-fbtn" onclick="crLectAnimFull()" title="Lecteur complet : pause, étapes, vitesse, GIF">⛶ Lecteur complet</button>` : ''}${leg}</div>`;
  }
  if (!gb && crSchemaHas(x)) return `<div class="crl-old">${crFicheSchema(x.schema)}</div>`;
  return `<div class="crl-nofig">Pas de schéma pour ${gb ? 'le travail GB' : 'cet exercice'}.</div>`;
}
// lecteur plein écran d'origine (pause, étapes, vitesse, GIF) : toujours disponible
function crLectAnimFull() {
  const S = crLect, L = crLectCurL(); if (!S || !L || !crSchAnimOk(L)) return; const x = S.items[S.k].x;
  schPlayerOpenData((x.name || 'Exercice') + (S.sec === 'gb' ? ' · GB' : ''), L.drawings);
}
// listes d'un exercice, regroupées par sous-rubrique comme dans la fiche
function crLectItems(x, k) {
  const subs = crSubs(k);
  return ((x.items || {})[k] || []).map((it, i) => ({ it, i, g: subs.findIndex(z => z.id === crSubOf(k, it)) })).sort((a, b) => (a.g < 0 ? 99 : a.g) - (b.g < 0 ? 99 : b.g) || a.i - b.i).map(o => ({ ...o.it, tag: crSubName(k, o.it) }));
}
function crLectList(title, arr, o) {
  o = o || {};
  const it = (arr || []).filter(i => crTxt(i.text) || crTxt(i.extra)); if (!it.length) return '';
  const li = it.map((i, n) => {
    const tag = i.tag || (o.auto ? (n === 0 ? 'Principale' : 'Secondaire') : '');
    return `<li>${tag ? `<span class="crl-tag">${crEsc(tag)}</span>` : ''}${crEsc(i.text).replace(/\n/g, '<br>')}${crTxt(i.extra) ? `<span class="crl-extra">→ ${crEsc(i.extra).replace(/\n/g, '<br>')}</span>` : ''}</li>`;
  }).join('');
  return `<section class="crl-sec ${o.cls || ''}"><h3>${crEsc(title)}</h3><${o.num ? 'ol' : 'ul'}>${li}</${o.num ? 'ol' : 'ul'}></section>`;
}
function crLectRender() {
  const S = crLect, el = document.getElementById('cr-lect'); if (!S || !el) return;
  crLectApplyLayout();
  const n = S.items.length, p = S.p;
  if (!n) { el.innerHTML = `<div class="crl-top"><button type="button" class="crl-back" onclick="crLectClose()">← Retour</button><div class="crl-ttl"><small>${crEsc(p.title)}</small><b>Aucun exercice</b></div></div><div class="crl-empty">Cette séance ne contient pas encore d'exercice.</div>`; return; }
  const it = S.items[S.k], x = it.x, kd = crKind(x), gbOk = crHasGb(x) && kd !== 'renfo', gb = S.sec === 'gb' && gbOk, g = x.gb || {}, on = crSecOn;
  const nm = (k, d) => (crSecDefs().find(t => t.k === k) || {}).label || d;
  // --- schéma
  const fig = crLectFig();
  // --- texte
  let txt = '';
  if (gb) {
    const geq = crEquipText(crNormEquip(g.equipment));
    txt = (crTxt(g.objective) ? `<section class="crl-obj"><h3>Objectif GB</h3><p>${crEsc(g.objective).replace(/\n/g, '<br>')}</p></section>` : '')
      + (geq ? `<section class="crl-sec"><h3>Matériel</h3><p>${crEsc(geq)}</p></section>` : '')
      + crLectList('Consignes GB', g.instructions) + crLectList('Critères de réussite GB', g.success, { cls: 'key' });
  } else {
    const eq = crEquipText(crNormEquip(x.equipment).concat(parseInt(x.balls, 10) > 0 ? [{ name: 'Ballons', qty: parseInt(x.balls, 10) }] : []));
    const theme = [crTxt(x.theme), crTxt(x.subTheme)].filter(Boolean).join(' · ');
    const rows = [['Effectif', crHeadcountText(x), 0], ['Espace', x.space, 0], ['Matériel', eq, 0], ['Disposition', x.org.setup, 1], ['Groupes', x.org.groups, 1], ['Rotations', x.org.rotations, 1], ['Rôles', x.org.roles, 1]].filter(r => crTxt(r[1]));
    const chipsR = rows.filter(r => !r[2]), bigR = rows.filter(r => r[2]);
    const disp = rows.length ? `<section class="crl-sec crl-disp"><h3>Dispositif</h3>${chipsR.length ? `<div class="crl-chips">${chipsR.map(r => `<span><b>${r[0]}</b> ${crEsc(r[1])}</span>`).join('')}</div>` : ''}${bigR.length ? `<dl>${bigR.map(r => `<div class="hl"><dt>${r[0]}</dt><dd>${crEsc(r[1]).replace(/\n/g, '<br>')}</dd></div>`).join('')}</dl>` : ''}</section>` : '';
    const evs = (x.evolutions || []).filter(e => crTxt(e.title) || crTxt(e.text));
    const evo = (on('evolutions') && evs.length) ? `<section class="crl-sec"><h3>Évolutions</h3><ul>${evs.map((e, i) => `<li><span class="crl-tag">Évolution N°${i + 1}</span>${crTxt(e.title) ? '<b>' + crEsc(e.title) + '</b> ' : ''}${crEsc(e.text || '').replace(/\n/g, '<br>')}</li>`).join('')}</ul></section>` : '';
    const L1 = (k, t, o) => on(k) ? crLectList(nm(k, t), crLectItems(x, k), o) : '';
    const rfR = kd === 'renfo' ? crNormRenfo(x.renfo) : null;
    const rfTxt = (rfR && rfR.format === 'circuit' && rfR.moves.length) ? `<section class="crl-sec"><h3>Circuit</h3><p>Travail <b>${rfR.circuit.work} s</b> · repos <b>${rfR.circuit.rest} s</b> · <b>${rfR.circuit.rounds} tour${rfR.circuit.rounds > 1 ? 's' : ''}</b>${rfR.circuit.rounds > 1 && rfR.circuit.between ? ` (${rfR.circuit.between} s entre les tours)` : ''}<br>Durée ≈ <b>${crRfDurText(crRfCircuitSec(rfR))}</b></p><ol>${rfR.moves.map((m, i) => `<li>${crEsc(m.name || 'Station ' + (i + 1))}</li>`).join('')}</ol></section>` : '';
    const jeuTxt = (kd === 'jeu' && crLectHasSchema(x)) ? crLectJeu(x) : '';
    txt = (crTxt(x.objective) ? `<section class="crl-obj"><h3>Objectif</h3><p>${crEsc(x.objective).replace(/\n/g, '<br>')}</p></section>` : '') + jeuTxt + rfTxt + disp
      + L1('comportements', 'Comportements attendus', { cls: 'key' }) + L1('reussite', 'Critères de réussite', { cls: 'key' })
      + (on('consignes') ? crLectList('Consignes', crLectItems(x, 'consignes'), { auto: true }) : '')
      + L1('besoins', 'Besoins') + L1('fonctionnement', 'Fonctionnement') + evo
      + (on('realisation') ? crLectList('Critères de réalisation', crLectItems(x, 'realisation')) : '')
      + (on('variables') ? crLectList('Simplifier ↓', crLectItems(x, 'simplify'), { cls: 'simplify' }) + crLectList('Complexifier ↑', crLectItems(x, 'complexify'), { cls: 'complexify' }) : '')
      + (on('vigilance') ? crLectList('Points de vigilance', crLectItems(x, 'vigilance')) : '')
      + (on('corrections') ? crLectList('Corrections / régulations', crLectItems(x, 'corrections'), { num: true }) : '')
      + (on('progression') ? crLectList('Progression', crLectItems(x, 'progression')) + crLectList('Régression', crLectItems(x, 'regression')) : '')
      + crCfgGet().custom.filter(c => on(c.k)).map(c => crLectList(nm(c.k, c.name), crLectItems(x, c.k))).join('');
    if (theme) txt = `<div class="crl-theme">${crEsc(theme)}</div>` + txt;
  }
  if (!txt && !(!gb && (crKind(x) === 'renfo' || (crKind(x) === 'jeu' && !crLectHasSchema(x))))) txt = `<div class="crl-nofig">Rien de renseigné pour ${gb ? 'le travail GB' : 'cet exercice'}.</div>`;
  { const bo = crTxt((p.blocks[it.bi] || {}).objective), so = crTxt(p.objectif_principal), cm = crTxt(p.comportements_attendus);
    if (bo || so || cm) txt = `<div class="crl-intent">${so ? `<div><b>Séance</b> ${crEsc(so).replace(/\n/g, ' · ')}</div>` : ''}${bo ? `<div><b>Bloc</b> ${crEsc(bo)}</div>` : ''}${cm ? `<div><b>À voir</b> ${crEsc(cm.split('\n').filter(Boolean).join(' · '))}</div>` : ''}</div>` + txt; }
  // --- cadre
  const seg = Array.from({ length: n }, (_, i) => `<button type="button" class="${i === S.k ? 'on' : (i < S.k ? 'past' : '')}" onclick="crLectGo(${i},true)" aria-label="Exercice ${i + 1}"></button>`).join('');
  const toc = S.toc ? `<div class="crl-toc"><div class="crl-toc-in"><div class="crl-toc-h"><b>Déroulé de la séance</b><button type="button" onclick="crLectToc()" aria-label="Fermer">✕</button></div>${(() => { let h = '', last = -1; S.items.forEach((q, i) => { if (q.bi !== last) { last = q.bi; h += `<div class="crl-toc-b">${crEsc(q.bname)}</div>`; } h += `<button type="button" class="${i === S.k ? 'on' : ''}" onclick="crLectGo(${i},true)"><span>${i + 1}</span><b>${crEsc(q.x.name || 'Exercice')}</b><em>${q.x.minutes ? crFmtDur(q.x.minutes) : ''}</em></button>`; }); return h; })()}</div></div>` : '';
  el.innerHTML = `<div class="crl-top"><button type="button" class="crl-back" onclick="crLectClose()">← Retour</button><div class="crl-ttl"><small>${crEsc(p.title)}</small><b>${crEsc(it.bname)} · exercice ${S.k + 1} / ${n}</b></div><button type="button" class="crl-lay" onclick="crLectLayout()" aria-label="Changer la mise en page" title="Changer la mise en page">${crLectIsSide() ? '▤' : '◫'}<span>${crLectIsSide() ? 'Empilé' : 'Côte à côte'}</span></button><button type="button" class="crl-tocb" onclick="crLectToc()" aria-label="Sommaire">☰</button></div>
    <div class="crl-prog">${seg}</div>
    <div class="crl-head"><span class="crl-n">${S.k + 1}</span><h2>${crEsc(x.name || 'Exercice')}</h2><span class="crl-d">${x.minutes ? crFmtDur(x.minutes) : ''}</span></div>
    ${gbOk ? `<div class="crl-seg"><button type="button" class="${!gb ? 'on' : ''}" onclick="crLectSec('main')">Exercice</button><button type="button" class="${gb ? 'on' : ''}" onclick="crLectSec('gb')">🧤 Travail GB</button></div>` : ''}
    <div class="crl-main"><div class="crl-col crl-figc">${fig}</div><div class="crl-col crl-txt">${txt}</div></div>
    <div class="crl-nav"><button type="button" class="crl-prev" onclick="crLectGo(-1)" ${S.k === 0 ? 'disabled' : ''}>← Précédent</button><button type="button" class="crl-mid" onclick="crLectToc()">☰ ${S.k + 1}/${n}</button>${S.k < n - 1 ? `<button type="button" class="crl-next" onclick="crLectGo(1)">Suivant →</button>` : `<button type="button" class="crl-next" onclick="crLectClose()">Fin de séance ✓</button>`}</div>${toc}`;
  crLectFit(); if (S.anim) crLectDrawAnim();
}

