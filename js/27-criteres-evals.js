// Prépa U15 HBCCS — js/27-criteres-evals.js — dernière modification : version z90 (26/11/2026)
// Éditeur des critères de la grille « compétences observables » (table eval_criteres).
// Qui peut modifier : Stephen, et les coachs qu'il a cochés (table eval_editors). Les autres coachs ne voient pas le bouton ⚙️ Critères.
// Les critères ne sont jamais supprimés (on les désactive) : les notes déjà saisies gardent leur sens et leur historique.
var evcOpen = false;
var evcEditors = {};      // id coach -> true (coachs autorisés par Stephen)
var evcCoaches = [];      // [{id, display_name}] — chargé pour Stephen seulement
var evcMsg = '';

function evcCanEdit() {
  if (!coachSession) return false;
  return anIsStephen() || !!evcEditors[coachSession.id];
}
async function evcLoadEditors() {
  try {
    await ensureCoachSession();
    var r = await fetch(SB_URL + '/rest/v1/eval_editors?select=coach_id', { headers: coachAuthHeaders() });
    if (r.ok) { evcEditors = {}; (await r.json()).forEach(function (x) { evcEditors[x.coach_id] = true; }); }
    if (anIsStephen()) {
      var c = await fetch(SB_URL + '/rest/v1/coaches?select=id,display_name&order=display_name', { headers: coachAuthHeaders() });
      if (c.ok) evcCoaches = (await c.json()).filter(function (x) { return x.id !== coachSession.id; });
    }
  } catch (e) {}
  evaluationsRenderGridBar();
  if (evcOpen) evcRender();
}
function evcToggle() {
  evcOpen = !evcOpen;
  evaluationsRenderGridBar();
  evcRender();
}
function evcHeaders() { return Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json' }); }
function evcSay(ok, txt) { evcMsg = '<span style="color:' + (ok ? '#2ecc71' : '#e74c3c') + ';">' + msEsc(txt) + '</span>'; var m = document.getElementById('evc-msg'); if (m) m.innerHTML = evcMsg; }
async function evcRefresh() {
  await evalObsLoad();
  evcRender(); evaluationsRenderItems(); evaluationsRenderAverages();
}
async function evcSave(code, field, value) {
  var body = { updated_at: new Date().toISOString() }; body[field] = value;
  try {
    await ensureCoachSession();
    var r = await fetch(SB_URL + '/rest/v1/eval_criteres?code=eq.' + encodeURIComponent(code), { method: 'PATCH', headers: evcHeaders(), body: JSON.stringify(body) });
    if (!r.ok) throw new Error('x');
    evcSay(true, '✓ Enregistré'); await evcRefresh(); evcSay(true, '✓ Enregistré');
  } catch (e) { evcSay(false, "Enregistrement impossible — tu n'as peut-être plus le droit de modifier, ou la connexion a coupé."); }
}
function evcField(code, field, el) {
  var v = el.type === 'checkbox' ? el.checked : el.value.replace(/^\s+|\s+$/g, '');
  if ((field === 'label' || field === 'domain') && !v) { evcSay(false, 'Ce champ ne peut pas rester vide.'); evcRender(); return; }
  evcSave(code, field, v);
}
async function evcMove(code, dir) {
  var list = evalObsAll.slice(), i = -1; list.forEach(function (x, k) { if (x.code === code) i = k; });
  var j = i + dir; if (i < 0 || j < 0 || j >= list.length) return;
  var a = list[i], b = list[j];
  var oa = a.ordre, ob = b.ordre; if (oa === ob) { ob = oa + (dir > 0 ? 5 : -5); }
  try {
    await ensureCoachSession();
    var r1 = await fetch(SB_URL + '/rest/v1/eval_criteres?code=eq.' + encodeURIComponent(a.code), { method: 'PATCH', headers: evcHeaders(), body: JSON.stringify({ ordre: ob }) });
    var r2 = await fetch(SB_URL + '/rest/v1/eval_criteres?code=eq.' + encodeURIComponent(b.code), { method: 'PATCH', headers: evcHeaders(), body: JSON.stringify({ ordre: oa }) });
    if (!r1.ok || !r2.ok) throw new Error('x');
    await evcRefresh();
  } catch (e) { evcSay(false, 'Déplacement impossible.'); }
}
async function evcAdd() {
  var last = evalObsAll.length ? evalObsAll[evalObsAll.length - 1] : null;
  var row = { code: 'OB-' + Date.now().toString(36).toUpperCase(), category: EVAL_CATEGORY, domain: last ? last.domain : 'Technique', label: 'Nouveau critère', indicateur: '', cle: false, actif: true,
    ordre: (last ? last.ordre : 0) + 10 };
  try {
    await ensureCoachSession();
    var r = await fetch(SB_URL + '/rest/v1/eval_criteres', { method: 'POST', headers: evcHeaders(), body: JSON.stringify([row]) });
    if (!r.ok) throw new Error('x');
    await evcRefresh(); evcSay(true, '✓ Critère ajouté en bas de liste : renomme-le et écris « comment le voir ».');
  } catch (e) { evcSay(false, "Ajout impossible."); }
}
async function evcSeuil(key, el) {
  var n = parseInt(el.value, 10), max = key === 'eval_seuil_note' ? 5 : 100;
  if (!(n >= 1 && n <= max)) { evcSay(false, 'Valeur entre 1 et ' + max + '.'); evcRender(); return; }
  try {
    await ensureCoachSession();
    var r = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', { method: 'POST', headers: Object.assign({}, evcHeaders(), { Prefer: 'resolution=merge-duplicates' }), body: JSON.stringify([{ key: key, value: String(n), updated_at: new Date().toISOString() }]) });
    if (!r.ok) throw new Error('x');
    appSettings[key] = String(n); evcSay(true, '✓ Seuil enregistré'); evaluationsRenderAverages();
  } catch (e) { evcSay(false, 'Enregistrement impossible.'); }
}
async function evcEditorSet(id, cb) {
  try {
    await ensureCoachSession();
    var r = cb.checked
      ? await fetch(SB_URL + '/rest/v1/eval_editors?on_conflict=coach_id', { method: 'POST', headers: Object.assign({}, evcHeaders(), { Prefer: 'resolution=merge-duplicates' }), body: JSON.stringify([{ coach_id: id }]) })
      : await fetch(SB_URL + '/rest/v1/eval_editors?coach_id=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: evcHeaders() });
    if (!r.ok) throw new Error('x');
    if (cb.checked) evcEditors[id] = true; else delete evcEditors[id];
    evcSay(true, cb.checked ? '✓ Ce coach peut modifier les critères' : '✓ Ce coach ne peut plus modifier les critères');
  } catch (e) { cb.checked = !cb.checked; evcSay(false, 'Erreur — réessaie.'); }
}
function evcRender() {
  var box = document.getElementById('eval-editor'); if (!box) return;
  if (!evcOpen || !evcCanEdit()) { box.innerHTML = ''; return; }
  var inp = 'background:var(--gris-fonce);color:var(--blanc);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:7px 8px;font-size:12.5px;width:100%;box-sizing:border-box;font-family:inherit;';
  var doms = []; evalObsAll.forEach(function (c) { if (doms.indexOf(c.domain) < 0) doms.push(c.domain); });
  var h = '<div style="background:var(--noir);border:1px solid var(--jaune);border-radius:12px;padding:12px;margin-bottom:14px;">' +
    '<div style="font-size:13px;font-weight:800;color:var(--jaune);margin-bottom:2px;">⚙️ Critères de la grille U15</div>' +
    '<div style="font-size:11px;color:var(--gris-texte);margin-bottom:10px;line-height:1.4;">Chaque changement s\'enregistre tout de suite pour tous les coachs. On ne supprime pas un critère : on le désactive (les notes déjà données sont gardées). ★ = critère clé (il compte pour la passerelle).</div>' +
    '<datalist id="evc-doms">' + doms.map(function (d) { return '<option value="' + msEsc(d) + '">'; }).join('') + '</datalist>';
  evalObsAll.forEach(function (c, k) {
    var code = msEsc(c.code);
    h += '<div style="border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px;margin-bottom:8px;opacity:' + (c.actif ? '1' : '.55') + ';">' +
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;"><span style="font-size:10px;color:var(--gris-texte);width:22px;">' + (k + 1) + '</span>' +
      '<input type="text" value="' + msEsc(c.label) + '" maxlength="90" style="' + inp + 'font-weight:700;" onchange="evcField(\'' + code + '\',\'label\',this)" aria-label="Nom du critère">' +
      '<button type="button" onclick="evcMove(\'' + code + '\',-1)" ' + (k === 0 ? 'disabled ' : '') + 'style="padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:var(--blanc);' + (k === 0 ? 'opacity:.3;' : '') + '" aria-label="Monter">▲</button>' +
      '<button type="button" onclick="evcMove(\'' + code + '\',1)" ' + (k === evalObsAll.length - 1 ? 'disabled ' : '') + 'style="padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:var(--blanc);' + (k === evalObsAll.length - 1 ? 'opacity:.3;' : '') + '" aria-label="Descendre">▼</button></div>' +
      '<textarea rows="2" maxlength="300" style="' + inp + 'margin-bottom:6px;resize:vertical;" placeholder="Comment le voir (un comportement observable)" onchange="evcField(\'' + code + '\',\'indicateur\',this)">' + msEsc(c.indicateur || '') + '</textarea>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><input type="text" list="evc-doms" value="' + msEsc(c.domain) + '" maxlength="30" style="' + inp + 'width:130px;" onchange="evcField(\'' + code + '\',\'domain\',this)" aria-label="Domaine">' +
      '<label style="font-size:12px;color:var(--gris-clair);display:flex;gap:5px;align-items:center;"><input type="checkbox" ' + (c.cle ? 'checked ' : '') + 'style="width:18px;height:18px;" onchange="evcField(\'' + code + '\',\'cle\',this)"> ★ clé</label>' +
      '<label style="font-size:12px;color:var(--gris-clair);display:flex;gap:5px;align-items:center;"><input type="checkbox" ' + (c.actif ? 'checked ' : '') + 'style="width:18px;height:18px;" onchange="evcField(\'' + code + '\',\'actif\',this)"> actif</label></div></div>';
  });
  h += '<button type="button" onclick="evcAdd()" style="padding:9px 14px;border-radius:10px;border:1px dashed var(--jaune);background:transparent;color:var(--jaune);font-weight:800;font-size:12.5px;cursor:pointer;">＋ Ajouter un critère</button>' +
    '<div style="margin-top:14px;font-size:12px;font-weight:800;color:var(--gris-clair);">Seuils de décision</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:12px;color:var(--gris-clair);">' +
    '<label>Note qui compte comme « en cours de stabilisation » (1 à 5) <input type="number" min="1" max="5" value="' + evalSeuil() + '" style="' + inp + 'width:70px;margin-top:4px;" onchange="evcSeuil(\'eval_seuil_note\',this)"></label>' +
    '<label>% de critères pour le passage <input type="number" min="1" max="100" value="' + evalSeuilPct() + '" style="' + inp + 'width:80px;margin-top:4px;" onchange="evcSeuil(\'eval_seuil_passage\',this)"></label></div>';
  if (anIsStephen()) {
    h += '<div style="margin-top:14px;font-size:12px;font-weight:800;color:var(--gris-clair);">Qui peut modifier ces critères ?</div><div style="font-size:11px;color:var(--gris-texte);margin:2px 0 6px;">Toi toujours. Coche un coach pour lui ouvrir l\'accès.</div>' +
      (evcCoaches.length ? evcCoaches.map(function (c) { return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--gris-clair);margin-bottom:6px;cursor:pointer;"><input type="checkbox" style="width:18px;height:18px;" ' + (evcEditors[c.id] ? 'checked ' : '') + 'onchange="evcEditorSet(\'' + msEsc(c.id) + '\',this)"> ' + msEsc(c.display_name) + '</label>'; }).join('') : '<div style="font-size:11px;color:var(--gris-texte);">Liste des coachs indisponible.</div>');
  }
  h += '<div id="evc-msg" style="min-height:16px;font-size:12px;margin-top:8px;font-weight:700;">' + evcMsg + '</div></div>';
  box.innerHTML = h;
}
