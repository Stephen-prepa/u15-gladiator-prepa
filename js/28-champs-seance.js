// Prépa U15 HBCCS — js/28-champs-seance.js — dernière modification : version z94 (26/11/2026)
// Champs de la fiche d'une séance (Créateur de séances › Informations générales) réglables depuis Réglages.
// - Champs standard : on peut les afficher / masquer (masquer ne supprime jamais les textes déjà écrits).
// - Champs personnalisés : nom + court/long texte ; valeurs rangées dans seance_plans.extras (jsonb).
// Réglage partagé par les 4 coachs : table app_settings, clé « seance_fields » (valeur = texte JSON).
// Code classique (pas de ?. ni ??), fonctions préfixées sf…

var SF_STD = [
  { k: 'niveau', label: 'Niveau', ph: 'Départemental, régional, détection…', multi: false, def: true },
  { k: 'nb_joueurs', label: 'Nombre de joueurs', ph: '14, 12 à 16…', multi: false, def: false },
  { k: 'entraineur', label: 'Entraîneur', ph: 'Nom de l\'entraîneur', multi: false, def: true },
  { k: 'theme', label: 'Thème principal', ph: 'Montée de balle, défense étagée…', multi: false, def: false },
  { k: 'objectifs_secondaires', label: 'Objectifs secondaires', ph: 'Un objectif par ligne', multi: true, def: false },
  { k: 'contexte', label: 'Contexte', ph: 'Période de la saison, état du groupe…', multi: true, def: false }
];
var sfCache = null, sfMsg = '';

function sfCfg() {
  if (sfCache) return sfCache;
  var c = { vis: {}, custom: [] };
  try {
    var raw = (typeof appSettings !== 'undefined' && appSettings.seance_fields) ? appSettings.seance_fields : '';
    if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') { c.vis = o.vis || {}; c.custom = Array.isArray(o.custom) ? o.custom : []; } }
  } catch (e) {}
  sfCache = c;
  return c;
}
function sfReset() { sfCache = null; }
function sfStdOn(f, plan) {
  var c = sfCfg(), on = c.vis[f.k] !== undefined ? !!c.vis[f.k] : f.def;
  // un champ masqué reste visible dans une séance où il contient déjà du texte
  if (!on && plan && plan[f.k] && String(plan[f.k]).replace(/\s+/g, '') !== '') return true;
  return on;
}
function sfCustomOn(f, plan) {
  if (!f.hidden) return true;
  return !!(plan && plan.extras && plan.extras[f.id] && String(plan.extras[f.id]).replace(/\s+/g, '') !== '');
}
async function sfSave() {
  try {
    await ensureCoachSession();
    var v = JSON.stringify(sfCfg());
    var r = await fetch(SB_URL + '/rest/v1/app_settings?on_conflict=key', { method: 'POST', headers: Object.assign({}, coachAuthHeaders(), { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }), body: JSON.stringify([{ key: 'seance_fields', value: v, updated_at: new Date().toISOString() }]) });
    if (!r.ok) throw new Error('x');
    appSettings.seance_fields = v; sfMsg = '✓ Enregistré pour tous les coachs';
  } catch (e) { sfMsg = 'Enregistrement impossible. Réessaie.'; }
  sfRender();
}
function sfToggleStd(k, on) { sfCfg().vis[k] = !!on; sfSave(); }
function sfToggleCus(i, on) { var f = sfCfg().custom[i]; if (f) { f.hidden = !on; sfSave(); } }
function sfNameCus(i, v) { var f = sfCfg().custom[i]; if (f) { f.label = String(v || '').replace(/^\s+|\s+$/g, '') || 'Nouveau champ'; sfSave(); } }
function sfMultiCus(i, multi) { var f = sfCfg().custom[i]; if (f) { f.multi = !!multi; sfSave(); } }
function sfMoveCus(i, d) {
  var a = sfCfg().custom, n = i + d; if (n < 0 || n >= a.length) return;
  var t = a[i]; a[i] = a[n]; a[n] = t; sfSave();
}
function sfAddCus() {
  var inp = document.getElementById('sf-new'), nm = inp ? String(inp.value || '').replace(/^\s+|\s+$/g, '') : '';
  if (!nm) { sfMsg = 'Écris le nom du champ (ex. Météo, Terrain, Intensité).'; sfRender(); return; }
  var multi = !!(document.getElementById('sf-new-multi') && document.getElementById('sf-new-multi').checked);
  sfCfg().custom.push({ id: 'c' + Date.now().toString(36), label: nm, multi: multi, hidden: false });
  sfSave();
}

// Rendu dans Réglages
function sfRender() {
  var box = document.getElementById('sf-ui'); if (!box) return;
  var c = sfCfg(), inp = 'background:var(--noir);border:1px solid rgba(255,255,255,0.18);color:var(--blanc);border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;';
  var row = function (inner) { return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' + inner + '</div>'; };
  var h = '<div style="font-size:12px;font-weight:800;color:var(--gris-clair);margin-bottom:6px;">Champs de base</div>';
  SF_STD.forEach(function (f) {
    var on = c.vis[f.k] !== undefined ? !!c.vis[f.k] : f.def;
    h += '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--gris-clair);margin-bottom:8px;cursor:pointer;"><input type="checkbox" style="width:18px;height:18px;" ' + (on ? 'checked ' : '') + 'onchange="sfToggleStd(\'' + f.k + '\',this.checked)"> ' + msEsc(f.label) + '</label>';
  });
  h += '<div style="font-size:12px;font-weight:800;color:var(--gris-clair);margin:14px 0 6px;">Mes champs</div>';
  if (!c.custom.length) h += '<div style="font-size:11px;color:var(--gris-texte);margin-bottom:8px;">Aucun champ perso pour l\'instant.</div>';
  c.custom.forEach(function (f, i) {
    h += row('<input type="checkbox" style="width:18px;height:18px;flex-shrink:0;" ' + (f.hidden ? '' : 'checked ') + 'onchange="sfToggleCus(' + i + ',this.checked)" title="Afficher dans la fiche">' +
      '<input value="' + msEsc(f.label) + '" onchange="sfNameCus(' + i + ',this.value)" style="' + inp + 'flex:1;min-width:0;">' +
      '<select onchange="sfMultiCus(' + i + ',this.value===\'1\')" style="' + inp + 'padding:8px 4px;"><option value="0"' + (f.multi ? '' : ' selected') + '>Court</option><option value="1"' + (f.multi ? ' selected' : '') + '>Long</option></select>' +
      '<button type="button" onclick="sfMoveCus(' + i + ',-1)" style="background:none;border:1px solid rgba(255,255,255,0.15);color:var(--gris-clair);border-radius:6px;padding:6px 8px;cursor:pointer;">↑</button>' +
      '<button type="button" onclick="sfMoveCus(' + i + ',1)" style="background:none;border:1px solid rgba(255,255,255,0.15);color:var(--gris-clair);border-radius:6px;padding:6px 8px;cursor:pointer;">↓</button>');
  });
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px;"><input id="sf-new" placeholder="Nom du nouveau champ (ex. Météo)" style="' + inp + 'flex:1;min-width:150px;"><label style="font-size:12px;color:var(--gris-texte);display:flex;align-items:center;gap:4px;"><input type="checkbox" id="sf-new-multi"> Texte long</label><button type="button" onclick="sfAddCus()" style="background:var(--jaune);color:var(--noir);border:none;border-radius:8px;padding:9px 14px;font-weight:800;cursor:pointer;">＋ Ajouter</button></div>';
  h += '<div style="font-size:11px;color:var(--gris-texte);margin-top:8px;">Décocher un champ le masque sans rien effacer : il réapparaît tout seul dans une séance où il contient déjà du texte.</div>';
  h += '<div style="min-height:16px;font-size:12px;margin-top:6px;font-weight:700;color:' + (sfMsg.charAt(0) === '✓' ? 'var(--vert)' : '#ff6b6b') + ';">' + msEsc(sfMsg) + '</div>';
  sfMsg = '';
  box.innerHTML = h;
}
function sfEnter() { sfReset(); sfRender(); }
