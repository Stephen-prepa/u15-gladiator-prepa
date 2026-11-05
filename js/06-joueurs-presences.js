// ===================== GESTION DES CODES JOUEURS =====================
function codesOpenEditor() {
  const box = document.getElementById('codes-editor');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
  if (box.style.display === 'none') return;
  codesRenderEditor();
}
function codesRenderEditor() {
  const wrap = document.getElementById('codes-editor-list');
  const sorted = [...presenceRoster].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  wrap.innerHTML = sorted.map(p => {
    const locked = !!p.device_token;
    return `<div id="codes-row-${p.code}" style="background:var(--noir);border-radius:8px;padding:8px 10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:700;color:var(--blanc);overflow-wrap:break-word;">${escapeSvgText(p.name)}</span>
        <span style="flex-shrink:0;font-size:9px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;padding:2px 7px;border-radius:10px;${locked ? 'background:rgba(231,76,60,0.15);color:#e74c3c;' : 'background:rgba(46,204,113,0.15);color:#2ecc71;'}">${locked ? 'Verrouillé' : 'Libre'}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="flex:1;min-width:0;font-family:monospace;font-size:13px;letter-spacing:1px;color:var(--jaune);background:rgba(245,196,0,0.08);border-radius:6px;padding:5px 8px;overflow-wrap:break-word;">${escapeSvgText(p.code)}</span>
        <button type="button" onclick="playerUnlockDevice('${p.code}', '${p.name.replace(/'/g, "\\'")}')" title="Débloquer l'appareil" style="flex-shrink:0;background:none;border:1px solid rgba(255,255,255,0.15);color:var(--gris-clair);border-radius:6px;padding:5px 9px;font-size:13px;cursor:pointer;">🔓</button>
        <button type="button" onclick="playerResetConfirm('${p.code}', '${p.name.replace(/'/g, "\\'")}')" title="Réinitialiser complètement" style="flex-shrink:0;background:none;border:1px solid rgba(255,255,255,0.15);color:var(--gris-clair);border-radius:6px;padding:5px 9px;font-size:13px;cursor:pointer;">♻️</button>
      </div>
      <div id="codes-msg-${p.code}" style="font-size:11px;text-align:center;margin-top:6px;min-height:14px;"></div>
    </div>`;
  }).join('');
}
async function playerUnlockDevice(code, name) {
  if (!confirm('Débloquer l\'appareil de ' + name + ' ?\n\nIl pourra se reconnecter avec son code sur un nouvel appareil sans avoir à confirmer son prénom.')) return;
  const msg = document.getElementById('codes-msg-' + code);
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(code), {
      method: 'PATCH',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_token: null }),
    });
    if (!res.ok) throw new Error('unlock failed');
    const p = presenceRoster.find(r => r.code === code);
    if (p) p.device_token = null;
    codesRenderEditor();
  } catch (e) {
    if (msg) { msg.style.color = '#e74c3c'; msg.textContent = 'Erreur — réessaie.'; }
  }
}
async function playerResetConfirm(code, name) {
  if (!confirm('Réinitialiser complètement le code de ' + name + ' ?\n\nLe prénom sera effacé et le code redeviendra disponible comme neuf. L\'historique déjà enregistré (présences, séances...) est conservé.')) return;
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(code), {
      method: 'PATCH',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: null, claimed_at: null, device_token: null }),
    });
    if (!res.ok) throw new Error('reset failed');
    await presenceLoadRoster();
    codesRenderEditor();
  } catch (e) {
    alert('Erreur — impossible de réinitialiser.');
  }
}

async function convocGenerate() {
  const out = document.getElementById('convoc-output');
  out.innerHTML = '<div style="text-align:center;padding:12px;color:var(--gris-texte);font-size:12px;">Génération...</div>';
  const dateVal = document.getElementById('composition-date').value;
  const refDate = new Date(dateVal + 'T12:00:00'); // midi comme point de repère pour comparer les distances
  const blocks = [];
  try {
    await ensureCoachSession();
    for (const eq of [1, 2]) {
      const players = compositionRoster.filter(p => compositionAssign[p.code] === eq).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      const names = players.map(p => p.name + (p.numero ? ' (#' + p.numero + ')' : ''));
      if (!names.length) continue;
      // On cherche le match de CETTE équipe le plus proche de la date choisie (pas forcément le même jour),
      // car les 2 équipes ne jouent presque jamais le même jour.
      const mRes = await fetch(SB_URL + '/rest/v1/matches?select=*&equipe=eq.' + eq + '&order=debut', { headers: coachAuthHeaders() });
      const mRows = mRes.ok ? await mRes.json() : [];
      let m = null, bestDiff = Infinity;
      for (const row of mRows) {
        const diff = Math.abs(new Date(row.debut) - refDate);
        if (diff < bestDiff) { bestDiff = diff; m = row; }
      }
      const dateLabel = m
        ? new Date(m.debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        : new Date(dateVal + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      let heureMatch = '', opp = 'l\'adversaire', lieu = 'à préciser', heureRdv = '';
      let besoins = '(à compléter)';
      if (m) {
        const info = homeParseOpponent(m.titre);
        opp = info.opp;
        const dm = new Date(m.debut);
        heureMatch = String(dm.getHours()).padStart(2, '0') + 'h' + (dm.getMinutes() ? String(dm.getMinutes()).padStart(2, '0') : '00');
        lieu = m.lieu || (info.home ? 'Clermont-l\'Hérault (à confirmer)' : opp + ' (à confirmer)');
        const rdv = new Date(dm.getTime() - 60 * 60000);
        heureRdv = String(rdv.getHours()).padStart(2, '0') + 'h' + (rdv.getMinutes() ? String(rdv.getMinutes()).padStart(2, '0') : '00');
        besoins = info.home
          ? 'Parents table de marque, police de terrain et goûter/apéro d\'après-match à proposer et partager avec l\'équipe adverse'
          : 'Parents à la table de marque';
      }
      const text = `🔵 *Match — ${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} face à ${opp}* 💪🏾

Les joueurs convoqués :

*${names.join(', ')}*

Lieu: *${lieu}*
Heure RDV: *${heureRdv || '(à compléter)'}*
Heure Match: *${heureMatch || '(à compléter)'}*

Besoins: *${besoins}*

*Vamos!!!*`;
      blocks.push({ eq, text });
    }
    if (!blocks.length) {
      out.innerHTML = '<div style="text-align:center;padding:12px;color:var(--gris-texte);font-size:12px;">Aucun joueur assigné à une équipe pour cette date.</div>';
      return;
    }
    out.innerHTML = blocks.map(b => `
      <div style="margin-top:12px;">
        <div style="font-size:11px;font-weight:800;color:${b.eq === 1 ? 'var(--jaune)' : '#e67e22'};margin-bottom:6px;">Équipe ${b.eq}</div>
        <textarea id="convoc-text-${b.eq}" rows="12" style="width:100%;box-sizing:border-box;background:var(--noir);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;color:var(--blanc);font-size:12.5px;font-family:inherit;resize:vertical;">${b.text}</textarea>
        <button onclick="convocCopy(${b.eq})" style="width:100%;margin-top:6px;padding:8px;border:none;border-radius:6px;background:var(--jaune);color:#1a1a1a;font-weight:800;font-size:12px;cursor:pointer;">Copier le message Équipe ${b.eq}</button>
        <div id="convoc-copied-${b.eq}" style="text-align:center;font-size:11px;color:#2ecc71;margin-top:4px;height:14px;"></div>
      </div>
    `).join('');
  } catch (e) {
    out.innerHTML = '<div style="text-align:center;padding:12px;color:#e74c3c;font-size:12px;">Erreur de génération.</div>';
  }
}
function convocCopy(eq) {
  const ta = document.getElementById('convoc-text-' + eq);
  ta.select();
  navigator.clipboard && navigator.clipboard.writeText(ta.value).then(() => {
    const msg = document.getElementById('convoc-copied-' + eq);
    msg.textContent = 'Copié ✓';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  }).catch(() => {
    document.execCommand('copy');
  });
}


let programmeItems = [];
function monthFirstStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
}
let progressMonth = null; // 'YYYY-MM-01'
let progressOwnByObjectif = {}; // objectif_id -> valeur (0-100) du coach courant pour progressMonth
let progressAvgByObjectif = {}; // objectif_id -> { moyenne, nb_evaluations }

function progressMonthLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
function progressShiftMonth(delta) {
  const d = new Date(progressMonth + 'T00:00:00');
  d.setMonth(d.getMonth() + delta, 1);
  progressMonth = monthFirstStr(d);
  programmeLoad();
}
function gaugeHtml(objectifId, value, editable) {
  const val = Math.round(value || 0);
  const fillStyle = 'position:absolute;top:-4px;left:calc(' + val + '% - 2px);width:4px;height:16px;background:var(--jaune);border-radius:2px;pointer-events:none;';
  const track = `<div style="position:relative;height:8px;border-radius:4px;background:linear-gradient(to right, #8a97ad 0%, #8a97ad 33%, #f39c12 33%, #f39c12 66%, #2ecc71 66%, #2ecc71 100%);opacity:0.4;">
      <div style="${fillStyle}"></div>
    </div>`;
  const slider = editable
    ? `<input type="range" min="0" max="100" step="5" value="${val}"
        oninput="progressSliderPreview('${objectifId}', this.value)"
        onchange="progressSliderSave('${objectifId}', this.value)"
        style="width:100%;margin:4px 0;accent-color:var(--jaune);">`
    : '';
  return `<div style="margin-top:6px;">
    ${track}
    ${slider}
    <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--gris-texte);margin-top:2px;">
      <span>Non acquis</span><span>En cours</span><span>Acquis</span>
    </div>
    <div id="gauge-val-${objectifId}" style="text-align:right;font-size:11px;font-weight:800;color:var(--jaune);margin-top:2px;">${val}%</div>
  </div>`;
}

function programmeToggleAddForm() {
  const form = document.getElementById('programme-add-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function programmeLoad() {
  if (!progressMonth) progressMonth = monthFirstStr(new Date());
  document.getElementById('progress-month-label').textContent = progressMonthLabel(progressMonth);
  const wrap = document.getElementById('programme-list');
  wrap.innerHTML = '<div style="text-align:center;padding:16px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  try {
    await ensureCoachSession();
    const myId = coachSession ? coachSession.id : null;
    const [itemsRes, ownRes, avgRes] = await Promise.all([
      fetch(SB_URL + '/rest/v1/programme_saison?select=*&order=categorie,ordre,created_at', { headers: coachAuthHeaders() }),
      fetch(SB_URL + '/rest/v1/objectif_progress?select=objectif_id,mois,valeur&coach_id=eq.' + myId + '&mois=lte.' + progressMonth + '&order=mois.desc', { headers: coachAuthHeaders() }),
      fetch(SB_URL + '/rest/v1/objectif_progress_avg?select=objectif_id,moyenne&mois=eq.' + progressMonth, { headers: coachAuthHeaders() }),
    ]);
    if (!itemsRes.ok) throw new Error('load failed');
    programmeItems = await itemsRes.json();
    const own = ownRes.ok ? await ownRes.json() : [];
    const avg = avgRes.ok ? await avgRes.json() : [];
    // pour chaque objectif : valeur du mois courant si elle existe, sinon dernière valeur connue (report automatique)
    progressOwnByObjectif = {};
    own.forEach(r => {
      if (progressOwnByObjectif[r.objectif_id] === undefined) progressOwnByObjectif[r.objectif_id] = r.valeur;
    });
    progressAvgByObjectif = {}; avg.forEach(r => { progressAvgByObjectif[r.objectif_id] = r; });
    programmeRender();
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:16px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}

function programmeRender() {
  const wrap = document.getElementById('programme-list');
  const tops = programmeItems.filter(i => !i.parent_id);
  if (!tops.length) {
    wrap.innerHTML = '<div style="text-align:center;padding:16px;color:var(--gris-texte);font-size:12px;">Aucun objectif pour le moment — ajoute le premier avec "+ Objectif".</div>';
    return;
  }
  const byCat = {};
  tops.forEach(t => { (byCat[t.categorie] = byCat[t.categorie] || []).push(t); });

  wrap.innerHTML = Object.keys(byCat).sort().map(cat => {
    const rows = byCat[cat].map(item => programmeRowHtml(item, 0)).join('');
    return `<div style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:800;color:var(--gris-texte);text-transform:uppercase;margin-bottom:6px;">${escapeSvgText(cat)}</div>
      ${rows}
    </div>`;
  }).join('');
}

function programmeRowHtml(item, depth) {
  const children = programmeItems.filter(i => i.parent_id === item.id);
  const childRows = children.map(c => programmeRowHtml(c, depth + 1)).join('');
  const myVal = progressOwnByObjectif[item.id] || 0;
  const avgInfo = progressAvgByObjectif[item.id];
  const avgLabel = avgInfo ? `moyenne équipe : ${avgInfo.moyenne}%` : 'pas encore évalué';
  const semaineBadge = item.semaine ? `<span style="flex-shrink:0;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:800;color:var(--jaune);background:rgba(255,215,0,0.12);border-radius:5px;padding:2px 6px;">${escapeSvgText(item.semaine)}</span>` : '';
  return `
    <div style="padding:8px 0;margin-left:${depth * 18}px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;gap:8px;">
        ${semaineBadge}
        <span style="flex:1;font-size:13px;color:var(--gris-clair);">${escapeSvgText(item.titre)}</span>
        ${depth === 0 ? `<button type="button" onclick="programmeShowSubForm('${item.id}')" title="Ajouter un sous-objectif" style="background:none;border:none;color:var(--gris-texte);font-size:14px;cursor:pointer;padding:2px 6px;">＋</button>` : ''}
        <button type="button" onclick="programmeDelete('${item.id}')" title="Supprimer" style="background:none;border:none;color:var(--gris-texte);font-size:13px;cursor:pointer;padding:2px 6px;">✕</button>
      </div>
      <div style="font-size:10px;color:var(--gris-texte);margin-top:2px;">${avgLabel}</div>
      ${gaugeHtml(item.id, myVal, true)}
    </div>
    <div id="prog-subform-${item.id}" style="display:none;margin-left:${(depth + 1) * 18}px;margin-bottom:6px;">
      <div style="display:flex;gap:6px;">
        <input type="text" id="prog-subinput-${item.id}" class="login-input" placeholder="Sous-objectif" style="flex:1;margin:0;">
        <input type="text" id="prog-subsemaine-${item.id}" class="login-input" placeholder="Semaine" style="width:80px;margin:0;">
        <button onclick="programmeAddObjectif('${item.id}')" style="padding:0 12px;border:none;border-radius:6px;background:var(--jaune);color:#1a1a1a;font-weight:800;font-size:12px;cursor:pointer;">OK</button>
      </div>
    </div>
    ${childRows}
  `;
}

function programmeShowSubForm(parentId) {
  const el = document.getElementById('prog-subform-' + parentId);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function programmeAddObjectif(parentId) {
  let categorie = 'Général', titre, semaine;
  if (parentId) {
    const input = document.getElementById('prog-subinput-' + parentId);
    titre = input.value.trim();
    semaine = document.getElementById('prog-subsemaine-' + parentId).value.trim() || null;
    const parent = programmeItems.find(i => i.id === parentId);
    categorie = parent ? parent.categorie : 'Général';
  } else {
    categorie = document.getElementById('prog-add-categorie').value.trim() || 'Général';
    titre = document.getElementById('prog-add-titre').value.trim();
    semaine = document.getElementById('prog-add-semaine').value.trim() || null;
  }
  if (!titre) return;
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/programme_saison', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ categorie, titre, semaine, parent_id: parentId || null, updated_by: coachSession ? coachSession.id : null }),
    });
    if (!res.ok) throw new Error('add failed');
    if (!parentId) {
      document.getElementById('prog-add-categorie').value = '';
      document.getElementById('prog-add-titre').value = '';
      document.getElementById('prog-add-semaine').value = '';
      document.getElementById('programme-add-form').style.display = 'none';
    }
    programmeLoad();
  } catch (e) { alert('Erreur — impossible d\'ajouter l\'objectif.'); }
}

function progressSliderPreview(objectifId, value) {
  const el = document.getElementById('gauge-val-' + objectifId);
  if (el) el.textContent = value + '%';
}
async function progressSliderSave(objectifId, value) {
  try {
    await ensureCoachSession();
    const myId = coachSession ? coachSession.id : null;
    if (!myId) return;
    await fetch(SB_URL + '/rest/v1/objectif_progress?on_conflict=objectif_id,mois,coach_id', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ objectif_id: objectifId, mois: progressMonth, coach_id: myId, valeur: parseInt(value, 10), updated_at: new Date().toISOString() }]),
    });
    progressOwnByObjectif[objectifId] = parseInt(value, 10);
    // recharge juste la moyenne pour cet objectif
    const avgRes = await fetch(SB_URL + '/rest/v1/objectif_progress_avg?select=objectif_id,moyenne&mois=eq.' + progressMonth + '&objectif_id=eq.' + objectifId, { headers: coachAuthHeaders() });
    if (avgRes.ok) {
      const rows = await avgRes.json();
      if (rows.length) progressAvgByObjectif[objectifId] = rows[0];
      programmeRender();
    }
  } catch (e) {}
}

async function programmeDelete(id) {
  if (!confirm('Supprimer cet objectif (et ses sous-objectifs, et toutes les évaluations associées) ?')) return;
  try {
    await ensureCoachSession();
    await fetch(SB_URL + '/rest/v1/programme_saison?id=eq.' + id, { method: 'DELETE', headers: coachAuthHeaders() });
    programmeLoad();
  } catch (e) { alert('Erreur — suppression impossible.'); }
}

function renderCoachs2View() {
  const isIn = !!(coachSession && coachSession.access_token);
  document.getElementById('coachs2-login').style.display = isIn ? 'none' : 'block';
  document.getElementById('coachs2-app').style.display = isIn ? 'block' : 'none';
  if (isIn) {
    document.getElementById('coachs2-name').textContent = coachSession.name || '';
    coachSubtabSwitch(dispFirstTab());
    presenceInit();
    statsLoad();
    programmeLoad();
    seanceInit();
    scoresTodoLoad();
    compositionInit();
    applyCoachPermissions();
  } else {
    renderCoachNamePicker();
  }
}

// Restrictions d'accès par coach (client-side — cohérent avec le reste de la gestion des rôles dans cette appli).
function applyCoachPermissions() {
  const restricted = coachSession && coachSession.name === 'Sandrine';
  const evalTab = document.getElementById('cs-subtab-evaluations');
  if (evalTab) evalTab.style.display = restricted ? 'none' : '';
  const convocBtn = document.getElementById('convoc-btn');
  if (convocBtn) convocBtn.style.display = restricted ? 'none' : '';
  try { dispApplyTabs(); } catch (e) {}
}

// ---------- Presences ----------
const PRESENCE_STATUSES = [
  { key: 'present', label: 'Présent', color: '#2ecc71' },
  { key: 'absent', label: 'Absent', color: '#e74c3c' },
  { key: 'excuse', label: 'Excusé', color: '#f39c12' },
  { key: 'retard', label: 'Retard', color: '#3498db' },
];
let presenceRoster = []; // [{code, name}]
let presenceMarks = {};  // { code: status }
let presenceInited = false;

function dateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function isTrainingDay(d) {
  const day = d.getDay(); // 0=dim ... 1=lun, 3=mer, 5=ven
  const cutoff = new Date('2026-08-31T23:59:59');
  if (d <= cutoff) return day === 1 || day === 3 || day === 5;
  return day === 1 || day === 3;
}
function nextTrainingDayOnOrAfter(d) {
  const copy = new Date(d);
  for (let i = 0; i < 14; i++) {
    if (isTrainingDay(copy)) return copy;
    copy.setDate(copy.getDate() + 1);
  }
  return d;
}

function presenceInit() {
  if (presenceInited) return;
  presenceInited = true;
  const start = new Date('2026-08-17T00:00:00');
  const today = new Date();
  const base = today < start ? start : today;
  const d = isTrainingDay(base) ? base : nextTrainingDayOnOrAfter(base);
  document.getElementById('presence-date').value = dateStr(d);
  presenceLoadRoster();
}
function presenceShiftDay(delta) {
  const input = document.getElementById('presence-date');
  const d = new Date(input.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  input.value = dateStr(d);
  presenceDateChanged();
}
function presenceDateChanged() {
  const input = document.getElementById('presence-date');
  const d = new Date(input.value + 'T00:00:00');
  document.getElementById('presence-daywarn').style.display = isTrainingDay(d) ? 'none' : 'block';
  presenceLoadExisting();
}

// ---------- Ajout manuel de joueur (coach) ----------
function genPlayerCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function playerAddToggleForm() {
  const form = document.getElementById('player-add-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  if (form.style.display === 'block') document.getElementById('player-add-name').focus();
}
async function playerAddManual() {
  const input = document.getElementById('player-add-name');
  const codeInput = document.getElementById('player-add-code');
  const name = input.value.trim();
  let customCode = codeInput.value.trim().toUpperCase();
  const msgEl = document.getElementById('player-add-msg');
  const btn = document.getElementById('player-add-btn');
  if (!name) { msgEl.style.color = '#e74c3c'; msgEl.textContent = 'Entre un nom.'; return; }
  btn.disabled = true; btn.textContent = 'Ajout...';
  msgEl.textContent = '';
  try {
    await ensureCoachSession();
    if (customCode) {
      const checkRes = await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(customCode) + '&select=code', { headers: coachAuthHeaders() });
      const existing = checkRes.ok ? await checkRes.json() : [];
      if (existing.length) {
        msgEl.style.color = '#e74c3c';
        msgEl.textContent = 'Ce code existe déjà — choisis-en un autre.';
        btn.disabled = false; btn.textContent = 'Ajouter';
        return;
      }
    }
    const res = await fetch(SB_URL + '/rest/v1/players', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ code: customCode || genPlayerCode(), name, claimed_at: new Date().toISOString(), role: 'joueur', postes: [] }),
    });
    if (!res.ok) throw new Error('add failed');
    input.value = '';
    codeInput.value = '';
    document.getElementById('player-add-form').style.display = 'none';
    presenceLoadRoster();
    statsLoad();
  } catch (e) {
    msgEl.style.color = '#e74c3c';
    msgEl.textContent = "Erreur — impossible d'ajouter le joueur.";
  }
  btn.disabled = false; btn.textContent = 'Ajouter';
}

async function presenceLoadRoster() {
  document.getElementById('presence-list').innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);">Chargement...</div>';
  try {
    const res = await fetch(SB_URL + '/rest/v1/players?select=code,name,postes,numero,device_token&claimed_at=not.is.null&order=name', { headers: SB_HEADERS });
    const rows = await res.json();
    presenceRoster = rows.filter(p => p.code !== 'COACHTEST' && p.name);
  } catch (e) { presenceRoster = []; }
  presenceDateChanged();
}

async function presenceLoadExisting() {
  const input = document.getElementById('presence-date');
  presenceMarks = {};
  try {
    const sess = await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/presences?select=player_code,status&session_date=eq.' + input.value, {
      headers: coachAuthHeaders(),
    });
    if (res.ok) {
      const rows = await res.json();
      rows.forEach(r => { presenceMarks[r.player_code] = r.status; });
    }
  } catch (e) {}
  presenceRenderList();
}

function presenceRenderList() {
  const wrap = document.getElementById('presence-list');
  if (!presenceRoster.length) {
    wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-texte);">Aucun joueur avec un code réclamé.</div>';
    return;
  }
  wrap.innerHTML = presenceRoster.map(p => {
    const current = presenceMarks[p.code] || null;
    const btns = PRESENCE_STATUSES.map(s => {
      const active = current === s.key;
      return `<button type="button" onclick="presenceSetMark('${p.code}','${s.key}')"
        style="flex:1;min-width:0;padding:6px 4px;border-radius:6px;border:1px solid ${active ? s.color : 'rgba(255,255,255,0.12)'};background:${active ? s.color : 'transparent'};color:${active ? '#1a1a1a' : 'var(--gris-clair)'};font-size:11px;font-weight:${active ? '800':'400'};cursor:pointer;">${s.label}</button>`;
    }).join('');
    return `<div style="background:var(--gris-fonce);border-radius:8px;padding:8px 10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:700;color:var(--blanc);">${nameWithNumero(p, true)}</div>
        <button type="button" onclick="playerDeleteConfirm('${p.code}', '${p.name.replace(/'/g, "\\'")}')" title="Supprimer ce joueur" style="background:none;border:1px solid rgba(231,76,60,0.4);color:#e74c3c;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;">✕</button>
      </div>
      <div style="display:flex;gap:6px;">${btns}</div>
    </div>`;
  }).join('');
}
function presenceSetMark(code, status) {
  presenceMarks[code] = presenceMarks[code] === status ? null : status;
  if (presenceMarks[code] === null) delete presenceMarks[code];
  presenceRenderList();
}
function presenceMarkAll(status) {
  presenceRoster.forEach(p => { presenceMarks[p.code] = status; });
  presenceRenderList();
}
async function playerDeleteConfirm(code, name) {
  const ok = window.confirm(`Supprimer ${name} ?\n\nCeci efface aussi définitivement son historique de présences, sa prépa physique et ses évaluations. Action irréversible.`);
  if (!ok) return;
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/players?code=eq.' + encodeURIComponent(code), {
      method: 'DELETE',
      headers: coachAuthHeaders(),
    });
    if (!res.ok) throw new Error('delete failed');
    delete presenceMarks[code];
    presenceLoadRoster();
    statsLoad();
  } catch (e) {
    alert("Erreur — impossible de supprimer ce joueur.");
  }
}

async function presenceSave() {
  const input = document.getElementById('presence-date');
  const msgEl = document.getElementById('presence-save-msg');
  const btn = document.getElementById('presence-save-btn');
  const entries = Object.keys(presenceMarks);
  if (!entries.length) { msgEl.style.color = '#e74c3c'; msgEl.textContent = 'Marque au moins un joueur avant d\'enregistrer.'; return; }
  btn.disabled = true; btn.textContent = 'Enregistrement...';
  try {
    await ensureCoachSession();
    const rows = entries.map(code => ({
      player_code: code,
      session_date: input.value,
      status: presenceMarks[code],
      created_by: coachSession ? coachSession.id : null,
    }));
    const res = await fetch(SB_URL + '/rest/v1/presences?on_conflict=player_code,session_date', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error('save failed');
    msgEl.style.color = '#2ecc71';
    msgEl.textContent = 'Présences enregistrées ✓';
    statsLoad();
  } catch (e) {
    msgEl.style.color = '#e74c3c';
    msgEl.textContent = 'Erreur — vérifie ta connexion et réessaie.';
  }
  btn.disabled = false; btn.textContent = 'Enregistrer';
}
// ---------- Postes (référentiel commun) ----------
// Couleurs d'équipe : UNE seule définition, réutilisée partout où "Équipe 1/2/3/4" apparaît
// (Compos, accueil, Outils, Match) — pour que la couleur ait toujours le même sens dans toute l'appli.
const TEAM_COLORS = ['#F5C400', '#e67e22', '#3498db', '#2ecc71'];
const POSTES = ['GB', 'ALG', 'ARG', 'DC', 'PVT', 'ARD', 'ALD'];
const POSTE_LABELS = { GB: 'Gardien', ARG: 'Arrière G.', DC: 'Demi-centre', ARD: 'Arrière D.', ALG: 'Ailier G.', ALD: 'Ailier D.', PVT: 'Pivot' };

// ---------- Outils entraînement : clavier de composition d'équipes ----------
let outilsNb = 2;
let outilsMode = 'mixte'; // 'mixte' | 'eq1' | 'eq2' | 'separe' (2 terrains en parallèle)
let outilsTeams = []; // [[{code,name,postes}], ...]
let outilsPool = [];  // joueurs pas encore assignés
let outilsCurrentTeam = 0; // équipe active pour les prochains taps (choisie manuellement)
let outilsInited = false;
let outilsLoadedDate = null;
const OUTILS_THRESHOLD = { 2: 10, 3: 7, 4: 5 };

function outilsCurrentDate() {
  const el = document.getElementById('presence-date');
  return el && el.value ? el.value : dateStr(new Date());
}

async function outilsInit() {
  const dateVal = outilsCurrentDate();
  if (outilsInited && outilsLoadedDate === dateVal) { outilsRenderPool(); outilsRenderTeams(); return; }
  outilsInited = true;
  await outilsLoadFromDb();
}

// Recharge la composition déjà enregistrée pour la date en cours (si elle existe), sinon repart des présents.
async function outilsLoadFromDb() {
  const present = presenceRoster.filter(p => presenceMarks[p.code] === 'present');
  const byCode = {}; present.forEach(p => { byCode[p.code] = p; });
  const dateVal = outilsCurrentDate();
  outilsLoadedDate = dateVal;
  const labelEl = document.getElementById('outils-date-label');
  if (labelEl) {
    const d = new Date(dateVal + 'T00:00:00');
    const isToday = dateVal === dateStr(new Date());
    labelEl.textContent = '📅 ' + d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (isToday ? " (aujourd'hui)" : '');
  }
  let rows = [];
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/outils_composition?select=player_code,team_index,mode&session_date=eq.' + dateVal, { headers: coachAuthHeaders() });
    if (res.ok) rows = await res.json();
  } catch (e) {}

  if (rows.length) {
    const maxIdx = Math.max(...rows.map(r => r.team_index));
    outilsMode = rows[0].mode || 'mixte';
    outilsNb = outilsMode === 'separe' ? 4 : Math.min(4, Math.max(2, maxIdx + 1));
    outilsTeams = Array.from({ length: outilsNb }, () => []);
    const assigned = new Set();
    rows.forEach(r => {
      const p = byCode[r.player_code];
      if (p && outilsTeams[r.team_index]) { outilsTeams[r.team_index].push(p); assigned.add(r.player_code); }
    });
    outilsPool = present.filter(p => !assigned.has(p.code));
  } else {
    outilsTeams = Array.from({ length: outilsNb }, () => []);
    outilsPool = present.slice();
  }
  outilsCurrentTeam = 0;
  outilsRenderNbButtons();
  outilsRenderModeUI();
  outilsRenderPool();
  await outilsLoadGoals();
  outilsRenderTeams();
}

async function outilsSetNb(n) {
  if (outilsMode === 'separe') return; // 2 terrains = toujours 4 équipes
  outilsNb = n;
  outilsRenderNbButtons();
  await outilsClearDb(); // le nombre d'équipes change : les anciennes affectations n'ont plus de sens
  outilsReset();
}
