// Prépa U15 HBCCS — js/12-editeur-schema-plein-ecran.js — dernière modification : version z23 (05/11/2026)
// ----- Éditeur de schéma plein écran -----
let crD = null;
let crDRaf = null;
const CR_ACTIONS = ['mv', 'pass', 'dribble', 'shot', 'screen'];
function crPalIcon(t) {
  if (t === 'traj') return '<svg viewBox="-14 -14 28 28" width="30" height="30"><circle cx="-9" cy="8" r="3.4" fill="#F5C400"/><path d="M-7 5 C-6 -8 4 -9 8 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-dasharray="3 2.6" stroke-linecap="round"/><polygon points="11,-8 4.5,-8.5 8.5,-2.5" fill="#fff"/></svg>';
  if (t === 'sel') return '<svg viewBox="-14 -14 28 28" width="30" height="30"><path d="M-6 -10 L-6 9 L-1.5 5 L2 11 L5 9.5 L1.5 3.5 L8 3 Z" fill="#F5C400"/></svg>';
  if (t === 'multi') return '<svg viewBox="-14 -14 28 28" width="30" height="30"><rect x="-11" y="-11" width="22" height="22" rx="3" fill="none" stroke="#F5C400" stroke-width="2" stroke-dasharray="4 3"/><circle cx="-4" cy="-3" r="3.5" fill="#F5C400"/><circle cx="5" cy="5" r="3" fill="#fff"/></svg>';
  if (t === 'dessin') return '<svg viewBox="-14 -14 28 28" width="30" height="30"><path d="M-10 11 L-9 5.5 L5 -8.5 L9.5 -4 L-4.5 10 Z" fill="#F5C400"/><path d="M-10 11 L-9 5.5 L-4.5 10 Z" fill="#fff"/><path d="M5 -8.5 L7.2 -10.7 Q9 -11.8 10.9 -10 Q12.1 -8.2 10.9 -6.3 L9.5 -4 Z" fill="#fff"/><path d="M-12 13 Q-8 11 -3 13.5 T6 13" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/></svg>';
  if (t === 'pan') return '<svg viewBox="-14 -14 28 28" width="30" height="30" fill="none" stroke="#F5C400" stroke-width="2" stroke-linecap="round"><path d="M0 -11 V11 M-11 0 H11 M0 -11 l-3 3 M0 -11 l3 3 M0 11 l-3 -3 M0 11 l3 -3 M-11 0 l3 -3 M-11 0 l3 3 M11 0 l-3 -3 M11 0 l-3 3"/></svg>';
  const e = CR_ACTIONS.includes(t) ? { t, x1: -10, y1: 8, x2: 10, y2: -8 } : { t, x: 0, y: 0, n: 1 };
  return `<svg viewBox="-14 -14 28 28" width="30" height="30">${e.x1 != null ? crArrowSvg(e, 0.9, CR_TH.dark) : crTokenSvg(e, 1, CR_TH.dark)}</svg>`;
}
function crDFrame() { return crD.schema.frames[crD.f]; }
function crDEl(id) { return crDFrame().els.find(e => e.id === id); }
function crDPush() {
  crD.undo.push(JSON.stringify(crD.schema)); if (crD.undo.length > 80) crD.undo.shift();
  crD.redo = [];
}
function crDUndo() {
  if (crD.playing || !crD.undo.length) return;
  crD.redo.push(JSON.stringify(crD.schema));
  crD.schema = JSON.parse(crD.undo.pop());
  crD.f = Math.min(crD.f, crD.schema.frames.length - 1); crD.sels = []; crD.pending = null; crDRefresh();
}
function crDRedo() {
  if (crD.playing || !crD.redo.length) return;
  crD.undo.push(JSON.stringify(crD.schema));
  crD.schema = JSON.parse(crD.redo.pop());
  crD.f = Math.min(crD.f, crD.schema.frames.length - 1); crD.sels = []; crD.pending = null; crDRefresh();
}
function crOpenDraw() {
  crPlayStop();
  crD = { schema: crNormSchema(JSON.parse(JSON.stringify(crCurEx().schema))), f: 0, tool: 'sel', sels: [], pending: null, rec: false, undo: [], redo: [], z: 1, cx: null, cy: null, playing: false, speed: 1, drag: null, ptrs: {}, pinch: null, cols: {}, scrub: null, anim: null, dr: false, flash: null, dm: 'pen', dcol: null, dlt: 1.4, dn: 8, dfill: 1, dtxt: '', prevTool: null, prevDm: null, snap: crDSnapPref(), penT: 0, penDown: false };
  const root = document.getElementById('cr-draw');
  if (root.parentNode !== document.documentElement) document.documentElement.appendChild(root); // hors du zoom CSS du body : le toucher tombe exactement sous le doigt / la pointe
  root.innerHTML = `
    <div class="cr-d-top">
      <button type="button" class="cr-d-ib" onclick="crDClose(false)" aria-label="Retour">←</button>
      <div id="cr-d-title" style="flex:1;font-weight:800;font-size:16px;color:#0a3f7a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
      <span style="font-size:10px;color:#6b7c93;white-space:nowrap;" title="Version de l'éditeur">éditeur ${CR_BUILD}</span>
      <button type="button" class="cr-d-ok" onclick="crDClose(true)">✓ Valider</button>
    </div>
    <div class="cr-d-top" style="padding-top:0;">
      <div class="cr-d-seg" id="cr-d-seg"></div>
      <button type="button" class="cr-d-ib" id="cr-d-undo" onclick="crDUndo()" aria-label="Annuler">↶</button>
      <button type="button" class="cr-d-ib" id="cr-d-redo" onclick="crDRedo()" aria-label="Rétablir">↷</button>
      <button type="button" class="cr-d-ib ${crDSnapPref() ? 'on' : ''}" id="cr-d-snap" onclick="crDToggleSnap()" aria-label="Aimant : placer sur une grille de 50 cm" title="Aimant / grille">🧲</button>
      <button type="button" class="cr-d-ib" onclick="crDFit()" aria-label="Recentrer">⤢</button>
    </div>
    <div id="cr-d-ctx" class="cr-d-ctx"></div>
    <div id="cr-d-canvas" class="cr-d-canvas">
      <div id="cr-d-svgbox" style="position:absolute;inset:0;"></div>
      <div id="cr-d-quick" style="position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:8px;"><button type="button" class="cr-d-ib" id="cr-d-qundo" onclick="crDUndo()" aria-label="Annuler">↶</button><button type="button" class="cr-d-ib" id="cr-d-qredo" onclick="crDRedo()" aria-label="Rétablir">↷</button><button type="button" class="cr-d-ib" id="cr-d-erase" onclick="crDEraserToggle()" aria-label="Gomme : effacer les dessins, textes et zones" title="Gomme">🧽</button></div>
      <div style="position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:6px;"><button type="button" class="cr-d-ib" onclick="crDZoom(1.4)" aria-label="Zoom avant">🔍+</button><button type="button" class="cr-d-ib" onclick="crDZoom(1/1.4)" aria-label="Zoom arrière">🔍−</button></div>
      <div style="position:absolute;left:8px;top:8px;display:flex;flex-direction:column;gap:6px;"><button type="button" class="cr-d-ib" onclick="crDSize(1.2)" aria-label="Agrandir les éléments">A+</button><button type="button" class="cr-d-ib" onclick="crDSize(1/1.2)" aria-label="Réduire les éléments">A−</button><button type="button" class="cr-d-ib" id="cr-d-sizelbl" onclick="crDSizeReset()" style="font-size:10px;line-height:1.15;padding:0 2px;" aria-label="Taille normale"></button></div>
    </div>
    <div class="cr-d-scrubrow" id="cr-d-scrubrow"><span id="cr-d-scrublbl">🎞️</span><input type="range" id="cr-d-scrub" min="0" max="100" step="1" value="0" oninput="crDScrub(this.value / 100)" onchange="crDScrubEnd(this.value / 100)" aria-label="Parcourir l'animation"></div>
    <div class="cr-d-frames" id="cr-d-frames"></div>
    <div class="cr-d-pal" id="cr-d-pal"></div>`;
  root.classList.add('show');
  const cv = document.getElementById('cr-d-canvas');
  cv.addEventListener('pointerdown', crDDown);
  cv.addEventListener('pointermove', crDMove);
  cv.addEventListener('pointerup', crDUp);
  cv.addEventListener('pointercancel', crDUp);
  cv.addEventListener('pointerleave', crDHoverOff);
  cv.addEventListener('wheel', crDWheel, { passive: false });
  crDRefresh();
}
function crDClose(save) {
  if (!crD) return;
  if (crD.playing) crDStop();
  if (save) {
    crCurEx().schema = crNormSchema(JSON.parse(JSON.stringify(crD.schema)));
    crTouch();
  } else if (crD.undo.length && !confirm('Quitter sans enregistrer le schéma ?')) return;
  document.getElementById('cr-draw').classList.remove('show');
  document.getElementById('cr-draw').innerHTML = '';
  crD = null;
  crRenderExView();
}
function crDRefresh() {
  if (!crD) return;
  crD.scrub = null;
  const modes = [['half', '½ terrain'], ['full', 'Terrain'], ['free', 'Espace libre']];
  document.getElementById('cr-d-seg').innerHTML = modes.map(([k, l]) => `<button type="button" class="${crD.schema.mode === k ? 'on' : ''}" onclick="crDMode('${k}')">${l}</button>`).join('');
  document.getElementById('cr-d-title').textContent = 'Image ' + (crD.f + 1) + ' / ' + crD.schema.frames.length + ' · ' + (crCurEx().name || 'Exercice');
  crDUndoUi();
  crDPalette(); crDFramesBar(); crDCtx(); crDRender();
}
// Palette sur 2 lignes, sans défilement : joueurs, ballon et outils de mouvement d'abord
const CR_PAL_FLAT = [
  ['sel', 'Sélect.'], ['att', 'Att.'], ['def', 'Déf.'], ['mv', 'Dépl.'], ['pass', 'Passe'], ['ball', 'Ballon'], ['traj', 'Trajet'], ['dribble', 'Drib.'], ['shot', 'Tir'], ['gb', 'GB'],
  ['dessin', 'Dessin'], ['screen', 'Écran'], ['cone', 'Plot'], ['coupelle', 'Coup.'], ['jalon', 'Jalon'], ['cerceau', 'Cerc.'], ['haie', 'Haie'], ['minibut', 'Mini'], ['multi', 'Multi'], ['pan', 'Vue'],
];
const CR_TOOL_NAMES = { sel: 'Sélection', att: 'Attaquant', def: 'Défenseur', gb: 'Gardien', ball: 'Ballon', traj: 'Trajectoire', pass: 'Passe', dribble: 'Dribble', mv: 'Déplacement', shot: 'Tir', screen: 'Écran / bloc', cone: 'Plot', coupelle: 'Coupelle', jalon: 'Jalon', cerceau: 'Cerceau', haie: 'Haie', minibut: 'Mini-but', dessin: 'Dessin : crayon, zones, texte', multi: 'Multi-sélection', pan: 'Déplacer la vue' };
function crDPalette() {
  document.getElementById('cr-d-pal').innerHTML = CR_PAL_FLAT.map(([k, l]) => `<button type="button" class="cr-d-tool ${crD.tool === k ? 'on' : ''}" title="${CR_TOOL_NAMES[k] || l}" aria-label="${CR_TOOL_NAMES[k] || l}" onclick="crDTool('${k}')">${crPalIcon(k)}<span>${l}</span></button>`).join('');
}
function crDTool(k) { if (crD.playing) return; crD.tool = k; crD.pending = null; if (k !== 'sel' && k !== 'multi') crD.sels = []; crDRefresh(); }
function crDMode(m) {
  if (crD.playing || crD.schema.mode === m) return;
  crDPush(); crD.schema.mode = m; crD.cx = crD.cy = null; crD.z = 1;
  const c = CR_COURT[m];
  crD.schema.frames.forEach(f => f.els.forEach(e => {
    if (e.x1 != null) { e.x1 = Math.min(c.w, e.x1); e.x2 = Math.min(c.w, e.x2); e.y1 = Math.min(c.h, e.y1); e.y2 = Math.min(c.h, e.y2); }
    else { e.x = Math.min(c.w, e.x); e.y = Math.min(c.h, e.y); }
  }));
  crDRefresh();
}
function crDFit() { crD.z = 1; crD.cx = crD.cy = null; crDRender(); }
function crDZoom(f) { crD.z = Math.max(1, Math.min(4, crD.z * f)); crDRender(); }
function crDVB() {
  const [x0, y0, w, h] = CR_COURT[crD.schema.mode].vb, z = crD.z, vw = w / z, vh = h / z;
  let cx = crD.cx == null ? x0 + w / 2 : crD.cx, cy = crD.cy == null ? y0 + h / 2 : crD.cy;
  cx = Math.max(x0 + vw / 2, Math.min(x0 + w - vw / 2, cx)); cy = Math.max(y0 + vh / 2, Math.min(y0 + h - vh / 2, cy));
  crD.cx = cx; crD.cy = cy;
  return [cx - vw / 2, cy - vh / 2, vw, vh];
}
function crDRender(customEls) {
  const box = document.getElementById('cr-d-svgbox');
  if (!box) return;
  const preview = !customEls && crD.scrub != null;
  const els = customEls || (preview ? crDScrubEls() : crDFrame().els);
  const next = (!customEls && !preview) ? ((crD.schema.frames[crD.f + 1] || {}).els || null) : null;
  let extra = '';
  if (crD.snap && !customEls && !preview && !crD.playing) { const c = CR_COURT[crD.schema.mode]; let d = ''; for (let x = 0; x <= c.w; x += CR_SNAP) d += `M${x} 0V${c.h}`; for (let y = 0; y <= c.h; y += CR_SNAP) d += `M0 ${y}H${c.w}`; extra += `<path d="${d}" stroke="#fff" stroke-opacity=".07" stroke-width=".35" fill="none" style="pointer-events:none;"/>`; }
  if (crD.pending) extra = `<circle cx="${crD.pending.x}" cy="${crD.pending.y}" r="5" fill="none" stroke="#F5C400" stroke-width="2.4"/>`;
  box.innerHTML = `<svg class="cr-d-svg" viewBox="${crDVB().join(' ')}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;touch-action:none;">${crElsSvg(crD.schema.mode, els, { edit: !crD.playing && !preview, sels: crD.sels, arrows: !customEls && !preview, sc: crD.schema.sc, next })}${extra}</svg>`;
}
function crDSwatches(cur) {
  return '<span style="display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap;">' + CR_COLS.map(([c, n]) => `<button type="button" class="cr-d-sw ${cur && cur.toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c};" aria-label="${n}" onclick="crDColor('${c}')"></button>`).join('') + `<button type="button" class="cr-d-sw def ${cur ? '' : 'on'}" onclick="crDColor(null)">Défaut</button></span>`;
}
function crDColor(c) {
  if (!crD || crD.playing) return;
  const toks = crD.sels.map(crDEl).filter(z => z && z.x1 == null && CR_COLORABLE.includes(z.t));
  if (toks.length) {
    crDPush();
    toks.forEach(z => crD.schema.frames.forEach(fr => fr.els.forEach(q => { if (q.id === z.id) { if (c) q.c = c; else delete q.c; } })));
  } else if (crD.tool === 'dessin') crD.dcol = c || null;
  else if (CR_COLORABLE.includes(crD.tool)) { if (c) crD.cols[crD.tool] = c; else delete crD.cols[crD.tool]; }
  crDCtx(); crDRender();
}
// Épaisseur, remplissage, forme : sur l'annotation sélectionnée (toutes les images où elle figure), sinon réglage par défaut du prochain dessin
function crDSetProp(prop, val) {
  if (!crD || crD.playing) return;
  const sels = crD.sels.map(crDEl).filter(z => z && z.x1 == null && CR_DRAWT.includes(z.t));
  if (sels.length) {
    crDPush();
    sels.forEach(z => crD.schema.frames.forEach(fr => fr.els.forEach(q => { if (q.id === z.id) q[prop] = val; })));
  } else if (prop === 'f') crD.dfill = val; else if (prop === 'shape') crD.dm = val; else if (prop === 'n') crD.dn = val;
  crDCtx(); crDRender();
}
// Épaisseur du trait (crayon et zones) : curseur et boutons − / +
function crDLtCur() { const z = crD.sels.map(crDEl).find(q => q && (q.t === 'pen' || q.t === 'zone')); return z ? crLw(z) : crD.dlt; }
function crDThickSet(v, refresh) {
  if (!crD || crD.playing) return;
  v = Math.round(Math.max(0.3, Math.min(5, parseFloat(v) || 1.4)) * 10) / 10;
  const sels = crD.sels.map(crDEl).filter(z => z && (z.t === 'pen' || z.t === 'zone'));
  if (sels.length) {
    const sig = 'lt' + sels.map(z => z.id).join() + ':' + crD.undo.length; if (crD.ltSig !== sig) { crDPush(); crD.ltSig = 'lt' + sels.map(z => z.id).join() + ':' + crD.undo.length; }
    sels.forEach(z => crD.schema.frames.forEach(fr => fr.els.forEach(q => { if (q.id === z.id) { q.lt = v; delete q.lw; } })));
  } else crD.dlt = v;
  const l = document.getElementById('cr-d-lt'); if (l) l.textContent = v.toFixed(1);
  if (refresh) crDCtx();
  crDRender();
}
function crDThickStep(d) { crDThickSet(crDLtCur() + d * 0.2, true); }
function crDSetAng(v, rel) {
  const e = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null; if (!e || e.t !== 'echelle') return;
  crDPush(); let a = rel ? (+e.a || 0) + v : v; a = ((a % 360) + 540) % 360 - 180;
  crD.schema.frames.forEach(fr => fr.els.forEach(q => { if (q.id === e.id) q.a = a; }));
  crDCtx(); crDRender();
}
function crSnapAng(a) { a = ((a % 360) + 540) % 360 - 180; const m = Math.round(a / 45) * 45; return Math.abs(a - m) < 4 ? m : Math.round(a * 10) / 10; }
function crDSetMode(m) { crD.dm = m; crDCtx(); }
function crDSetTxt(v) {
  const e = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null; if (!e || e.t !== 'text') return;
  const sig = e.id + ':' + crD.undo.length; if (crD.txtSig !== sig) { crDPush(); crD.txtSig = e.id + ':' + crD.undo.length; }
  const tx = String(v).slice(0, 40);
  crD.schema.frames.forEach(fr => fr.els.forEach(q => { if (q.id === e.id) q.txt = tx; }));
  crDRender();
}
function crDChips(prop, cur, opts) { return opts.map(([v, l]) => `<button type="button" class="cr-d-opt ${cur === v ? 'on' : ''}" onclick="crDSetProp('${prop}',${typeof v === 'string' ? `'${v}'` : v})">${l}</button>`).join(' '); }
function crDDrawOpts(src) {
  // src : annotation sélectionnée, ou null pour le réglage par défaut du prochain dessin
  const t = src ? src.t : ({ pen: 'pen', text: 'text', echelle: 'echelle', erase: '' }[crD.dm] != null ? { pen: 'pen', text: 'text', echelle: 'echelle', erase: '' }[crD.dm] : 'zone');
  let h = '';
  if (t === 'zone') h += ` <span>Forme :</span> ` + crDChips('shape', src ? (src.shape === 'ellipse' ? 'ellipse' : 'rect') : crD.dm, [['rect', '▭'], ['ellipse', '◯']]) + ` <span>Fond :</span> ` + crDChips('f', src ? (src.f == null ? 1 : +src.f) : crD.dfill, [[0, 'Vide'], [1, 'Léger'], [2, 'Plein']]);
  if (t === 'echelle') {
    h += ` <span>Cases :</span> ` + crDChips('n', src ? Math.round(+src.n || 8) : crD.dn, [[6, '6'], [8, '8'], [10, '10'], [12, '12']]);
    if (src) h += ` <span>Sens :</span> <button type="button" class="cr-d-opt" onclick="crDSetAng(0)">↔</button> <button type="button" class="cr-d-opt" onclick="crDSetAng(90)">↕</button> <button type="button" class="cr-d-opt" onclick="crDSetAng(-15,1)">⟲ 15°</button> <button type="button" class="cr-d-opt" onclick="crDSetAng(15,1)">⟳ 15°</button> <span style="font-size:11px;">Tire la poignée pour allonger, raccourcir ou pivoter · A+ / A− = taille</span>`;
  }
  if (t === 'pen' || t === 'zone') { const lt = src ? crLw(src) : crD.dlt; h += ` <span>Trait :</span> <button type="button" class="cr-d-opt" onclick="crDThickStep(-1)" aria-label="Plus fin">−</button> <input type="range" min="0.3" max="5" step="0.1" value="${lt}" oninput="crDThickSet(this.value)" style="width:120px;padding:0;vertical-align:middle;" aria-label="Épaisseur du trait"> <button type="button" class="cr-d-opt" onclick="crDThickStep(1)" aria-label="Plus épais">+</button> <b id="cr-d-lt" style="min-width:28px;display:inline-block;">${lt.toFixed(1)}</b>`; }
  return h;
}
function crDUndoUi() {
  if (!crD) return;
  const u = !crD.undo.length || crD.playing, r = !crD.redo.length || crD.playing;
  ['cr-d-undo', 'cr-d-qundo'].forEach(i => { const b = document.getElementById(i); if (b) b.disabled = u; });
  ['cr-d-redo', 'cr-d-qredo'].forEach(i => { const b = document.getElementById(i); if (b) b.disabled = r; });
  const g = document.getElementById('cr-d-erase'); if (g) g.classList.toggle('on', crD.tool === 'dessin' && crD.dm === 'erase');
}
// Gomme : bascule rapide (puis retour à l'outil précédent)
function crDEraserToggle() {
  if (!crD || crD.playing) return;
  if (crD.tool === 'dessin' && crD.dm === 'erase') { crD.tool = crD.prevTool || 'sel'; crD.dm = crD.prevDm || 'pen'; }
  else { crD.prevTool = crD.tool; crD.prevDm = crD.dm === 'erase' ? 'pen' : crD.dm; crD.tool = 'dessin'; crD.dm = 'erase'; crD.sels = []; crD.pending = null; }
  crDRefresh();
}
function crDCtx() {
  crDSizeUi(); crDUndoUi();
  const el = document.getElementById('cr-d-ctx');
  if (crD.flash) { el.innerHTML = `<b>${crD.flash}</b>`; return; }
  if (crD.scrub != null) { el.textContent = 'Aperçu de l\'animation — touche le terrain ou une image pour reprendre l\'édition.'; return; }
  const t = crD.tool, sel = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null;
  const selToks = crD.sels.map(crDEl).filter(z => z && z.x1 == null && CR_COLORABLE.includes(z.t));
  if (crD.sels.length > 1) {
    el.innerHTML = `<b>${crD.sels.length} éléments</b> <span>glisse l'un d'eux pour tout déplacer · A+ / A− = taille</span> <button type="button" class="cr-d-del" onclick="crDDelSel()">🗑 Supprimer</button> <button type="button" class="cr-d-del" style="color:var(--gris-clair);border-color:rgba(255,255,255,0.25);" onclick="crDClearSel()">Désélectionner</button>` + (selToks.length ? ` <span>Couleur :</span> ` + crDSwatches(selToks.every(z => z.c === selToks[0].c) ? selToks[0].c : null) : ''); return;
  }
  if (sel) {
    let h = `<b>${{ pen: 'Dessin', zone: 'Zone', text: 'Texte', echelle: 'Échelle de rythme', att: 'Attaquant', def: 'Défenseur', gb: 'Gardien', ball: 'Ballon', cone: 'Plot', coupelle: 'Coupelle', jalon: 'Jalon', cerceau: 'Cerceau', haie: 'Haie', minibut: 'Mini-but', mv: 'Déplacement', pass: 'Passe', dribble: 'Dribble', shot: 'Tir', screen: 'Écran / bloc' }[sel.t] || ''}</b>`;
    if (sel.t === 'att' || sel.t === 'def') h += ` N° <input type="number" inputmode="numeric" min="1" max="99" value="${crEsc(sel.n || '')}" oninput="crDSetN(this.value)" style="width:56px;">`;
    if (sel.t === 'text') h += ` <input type="text" id="cr-d-txt" maxlength="40" value="${crEsc(sel.txt || '')}" oninput="crDSetTxt(this.value)" onkeydown="if(event.key==='Enter')this.blur()" enterkeyhint="done" autocomplete="off" placeholder="Texte" style="width:170px;text-align:left;">`;
    if (CR_DRAWT.includes(sel.t)) h += crDDrawOpts(sel);
    if (sel.t === 'ball') h += sel.hold ? ` <span>porté par un joueur</span> <button type="button" class="cr-d-del" style="color:var(--gris-clair);border-color:rgba(255,255,255,0.25);" onclick="crDRelease()">Lâcher</button>` : ` <span>pose-le sur un joueur pour le lui attacher</span>`;
    const lg = crDLegOf(sel);
    if (lg) {
      const fv = lg.leg.f == null ? 1 : lg.leg.f;
      h += lg.mover ? ` <span>Passe part à :</span> ` + [[0, 'Début'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [1, 'Fin']].map(([v, l]) => `<button type="button" class="cr-d-opt ${Math.abs(fv - v) < 0.02 ? 'on' : ''}" onclick="crDLegF(${v})">${l}</button>`).join(' ') + (lg.late != null ? ` <span style="font-size:11px;">Le ballon n'arrive qu'à ${Math.min(100, lg.late)} % de sa course : il part dès réception. Pour partir plus tôt, avance la passe précédente.</span>` : '') : ` <span style="font-size:11px;">La passe part dès que le porteur a le ballon.</span>`;
    }
    if (!(sel.x1 != null && (sel.t === 'pass' || sel.t === 'shot'))) h += crDMovePanel(sel);
    if (sel.x1 == null && window.innerWidth >= 900) h += ` <span style="display:inline-flex;gap:4px;align-items:center;"><span style="font-size:11px;">Ajuster (10 cm) :</span>` + [['◀', -1, 0], ['▲', 0, -1], ['▼', 0, 1], ['▶', 1, 0]].map(([l, dx, dy]) => `<button type="button" class="cr-d-opt" style="padding:5px 10px;" onclick="crDNudge(${dx},${dy})">${l}</button>`).join('') + `</span>`;
    const delLbl = sel.x1 != null ? (sel.t === 'pass' || sel.t === 'shot' ? '🗑 Supprimer la passe' : '🗑 Supprimer la flèche et son déplacement') : '🗑 Supprimer le joueur';
    h += ` <button type="button" class="cr-d-del" onclick="crDDelSel()">${CR_DRAWT.includes(sel.t) ? { pen: '🗑 Supprimer le dessin', zone: '🗑 Supprimer la zone', text: '🗑 Supprimer le texte', echelle: '🗑 Supprimer l\'échelle' }[sel.t] : (sel.x1 == null && !CR_PLAYERS.includes(sel.t) ? '🗑 Supprimer' : delLbl)}</button>`;
    if (selToks.length) h += ` <span>Couleur :</span> ` + crDSwatches(sel.c);
    el.innerHTML = h; return;
  }
  const hint = t === 'sel' ? 'Touche un élément pour le déplacer, ou glisse sur le terrain pour en entourer plusieurs. Pince à deux doigts pour zoomer · A+ / A− pour la taille des éléments.' : t === 'multi' ? 'Touche plusieurs éléments pour les grouper, puis glisse l\'un d\'eux (ou entoure-les en glissant sur le terrain).' : t === 'traj' ? 'Touche un joueur (ou le ballon), puis trace son trajet avec le doigt : il le suivra dans l\'animation, courbe comprise.' : t === 'pan' ? 'Glisse pour déplacer la vue (pince à deux doigts ou 🔍+ / 🔍− pour zoomer).' : CR_ACTIONS.includes(t) ? 'Glisse du départ à l\'arrivée (ou touche départ puis arrivée).' : 'Touche le terrain pour placer l\'élément.';
  if (t === 'dessin') {
    const md = [['pen', '✏️ Crayon'], ['rect', '▭ Rectangle'], ['ellipse', '◯ Ellipse'], ['text', '🔤 Texte'], ['echelle', '🪜 Échelle'], ['erase', '🧽 Gomme']];
    el.innerHTML = md.map(([v, l]) => `<button type="button" class="cr-d-opt ${crD.dm === v ? 'on' : ''}" onclick="crDSetMode('${v}')">${l}</button>`).join(' ')
      + (crD.dm === 'text' ? ` <input type="text" id="cr-d-txt" maxlength="40" value="${crEsc(crD.dtxt || '')}" oninput="crD.dtxt=this.value" onkeydown="if(event.key==='Enter')this.blur()" enterkeyhint="done" autocomplete="off" placeholder="Texte à poser" style="width:170px;text-align:left;">` : '')
      + crDDrawOpts(null) + (crD.dm === 'erase' ? '' : ` <span>Couleur :</span> ` + crDSwatches(crD.dcol))
      + ` <span style="font-size:11px;">${{ pen: 'Dessine au doigt ou au stylet.', rect: 'Glisse d\'un coin à l\'autre (ou touche pour une zone standard).', ellipse: 'Glisse d\'un coin à l\'autre (ou touche pour une zone standard).', text: 'Écris le texte puis touche le terrain.', echelle: 'Glisse du début à la fin de l\'échelle (ou touche pour une échelle standard de 5 m).', erase: 'Passe sur un dessin, un texte, une échelle ou le bord d\'une zone pour l\'effacer.' }[crD.dm]} Pour modifier ou supprimer : outil Sélect.</span>`;
    return;
  }
  if (CR_COLORABLE.includes(t)) { el.innerHTML = `<span>Couleur :</span> ` + crDSwatches(crD.cols[t]) + ` <span>puis touche le terrain pour placer.</span>`; return; }
  if (t === 'traj') { el.innerHTML = `<span>Trace le trajet d'un joueur ou du ballon :</span> <button type="button" class="cr-d-opt ${crD.dr ? '' : 'on'}" onclick="crDToggleDr(false)">🏃 Course</button> <button type="button" class="cr-d-opt ${crD.dr ? 'on' : ''}" onclick="crDToggleDr(true)">⚽ Dribble</button>`; return; }
  if (CR_ACTIONS.includes(t)) {
    const on = crDAnimOn();
    el.innerHTML = `<span>${crD.pending ? 'Touche maintenant le point d\'arrivée.' : 'Glisse du départ à l\'arrivée.'}</span> <button type="button" class="cr-d-opt ${on ? 'on' : ''}" onclick="crDToggleAnim()">🎬 Animer : ${on ? 'OUI' : 'NON'}</button>` + (on ? ` <span style="font-size:11px;">${{ mv: 'Pars d\'un joueur : il va au bout de la flèche.', dribble: 'Pars du porteur : il dribble jusqu\'au bout.', pass: 'Trace d\'abord les courses. Passe : pars de l\'arrivée du porteur, finis sur l\'arrivée du receveur.', shot: 'Pars du tireur : le ballon file au bout.', screen: 'Pars d\'un joueur : il va se placer.' }[t] || ''}</span>` : ''); return;
  }
  el.textContent = (crD.pending ? 'Touche maintenant le point d\'arrivée. ' : '') + hint;
}
function crDSetN(v) { const e = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null; if (!e) return; e.n = v === '' ? '' : Math.max(1, Math.min(99, parseInt(v, 10) || 1)); crDRender(); }
function crDClearSel() { crD.sels = []; crDCtx(); crDRender(); }
// ----- Taille des éléments (A+ / A−) : sélection si présente, sinon tous les éléments -----
function crDSizeClamp(v, lo, hi) { return Math.round(Math.max(lo, Math.min(hi, v)) * 100) / 100; }
function crDSize(f) {
  if (!crD || crD.playing) return;
  crDPush();
  if (crD.sels.length) {
    crD.sels.forEach(id => {
      const e = crDEl(id); if (!e) return;
      const ns = crDSizeClamp((parseFloat(e.s) || 1) * f, 0.4, 3);
      if (e.x1 == null) crD.schema.frames.forEach(fr => fr.els.forEach(z => { if (z.id === id) z.s = ns; }));
      else e.s = ns;
    });
  } else crD.schema.sc = crDSizeClamp(crD.schema.sc * f, 0.5, 2.5);
  crDSyncAll(); crDSizeUi(); crDRender();
}
function crDSizeReset() {
  if (!crD || crD.playing) return;
  crDPush();
  if (crD.sels.length) crD.sels.forEach(id => { const e = crDEl(id); if (!e) return; if (e.x1 == null) crD.schema.frames.forEach(fr => fr.els.forEach(z => { if (z.id === id) delete z.s; })); else delete e.s; });
  else crD.schema.sc = 1;
  crDSyncAll(); crDSizeUi(); crDRender();
}
function crDSizeUi() {
  const b = document.getElementById('cr-d-sizelbl'); if (!b || !crD) return;
  let v, l;
  if (crD.sels.length) { const e = crDEl(crD.sels[0]); v = e ? (parseFloat(e.s) || 1) : 1; l = crD.sels.length > 1 ? 'Sél.' : 'Élém.'; }
  else { v = crD.schema.sc; l = 'Tous'; }
  b.innerHTML = l + '<br>' + Math.round(v * 100) + '%';
}

// ----- Zoom : pincement à deux doigts (centré sur les doigts) et molette -----
function crDRaw(x, y) {
  // calcul direct à partir du rectangle affiché et du viewBox (même résultat que getScreenCTM, sans ses défauts sous Safari)
  const svg = document.querySelector('#cr-d-svgbox svg'), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  const sc = Math.min(r.width / vb.width, r.height / vb.height), ox = (r.width - vb.width * sc) / 2, oy = (r.height - vb.height * sc) / 2;
  return { x: vb.x + (x - r.left - ox) / sc, y: vb.y + (y - r.top - oy) / sc };
}
function crDZoomAt(px, py, nx, ny, nz) {
  const svg = document.querySelector('#cr-d-svgbox svg'); if (!svg) return;
  const q = crDRaw(px, py);
  crD.z = Math.max(1, Math.min(4, nz));
  svg.setAttribute('viewBox', crDVB().join(' '));
  const q2 = crDRaw(nx, ny);
  crD.cx += q.x - q2.x; crD.cy += q.y - q2.y;
  svg.setAttribute('viewBox', crDVB().join(' '));
}
function crDPinchStart() {
  const pts = Object.values(crD.ptrs).slice(0, 2);
  crD.drag = null;
  crD.pinch = { d0: Math.max(10, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)), z0: crD.z, mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
}
function crDPinchMove() {
  const pts = Object.values(crD.ptrs).slice(0, 2), pi = crD.pinch;
  if (pts.length < 2) return;
  const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
  crDZoomAt(pi.mx, pi.my, mx, my, pi.z0 * d / pi.d0);
  pi.mx = mx; pi.my = my;
}
function crDWheel(e) {
  if (!crD) return;
  e.preventDefault();
  crDZoomAt(e.clientX, e.clientY, e.clientX, e.clientY, crD.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
}
// ----- Flèches qui animent : déplacement, dribble, passe, tir -----
let crDFlashT = null;
function crDFlash(msg) { crD.flash = msg; clearTimeout(crDFlashT); crDFlashT = setTimeout(() => { if (crD) { crD.flash = null; crDCtx(); } }, 4000); }
function crDAnimOn() { return crD.anim != null ? crD.anim : (crD.schema.frames.length >= 2 || crD.rec); }
function crDToggleAnim() { crD.anim = !crDAnimOn(); crDCtx(); }
function crDToggleDr(v) { crD.dr = v; crDCtx(); }
const CR_PLAYERS = ['att', 'def', 'gb'];
// Panneau « déplacement » d'un joueur (ou de la flèche qui le fait bouger) : tout ce qui concerne sa course vers l'image suivante, au même endroit
function crDMovePanel(sel) {
  const tok = crDOrderTarget(); if (!tok || tok.x1 != null) return '';
  const fr = crD.schema.frames, f = crD.f, nx = fr[f + 1];
  const row = inner => `<div class="cr-d-mv" style="width:100%;display:flex;align-items:center;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.12);padding-top:5px;">${inner}</div>`;
  const sm = t => `<span style="font-size:11px;">${t}</span>`;
  const bt = (cls, fn, label, dis) => `<button type="button" class="${cls}" onclick="${fn}" ${dis ? 'disabled' : ''}>${label}</button>`;
  if (CR_DRAWT.includes(tok.t)) return '';
  const od = nx ? crDOrderOf(tok) : null;
  if (!od) {
    if (tok.t === 'ball' || !CR_PLAYERS.includes(tok.t)) return '';
    if (!nx) return row(sm('Aucun déplacement. Pour le faire bouger : outil <b>Trajet</b> ou <b>Déplacement</b>, puis trace son parcours.'));
    return row(sm(`Image ${f + 1} → ${f + 2} : <b>reste en place</b>. Pour le faire bouger : outil <b>Trajet</b> ou <b>Déplacement</b>.`));
  }
  const hasBall = fr[f].els.some(b => b.t === 'ball' && b.hold === tok.id);
  const nth = k => k === 1 ? '1er' : k + 'ᵉ';
  let h = `<b>Son déplacement</b> ${sm('(image ' + (f + 1) + ' → ' + (f + 2) + ')')}`;
  const sh = od.o.mv.filter(a => od.o.ranks[a.id] === od.rank).length - 1;
  if (od.n > 1 || sh > 0) h += `<div style="width:100%;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${sm('Part en <b>' + nth(od.rank + 1) + '</b> sur ' + od.n + (sh > 0 ? ' <b>(en même temps que ' + sh + ' autre' + (sh > 1 ? 's' : '') + ')</b>' : '') + ' :')} ` + bt('cr-d-opt', 'crDOrderMove(-1)', '◀ Plus tôt', od.rank < 1 && sh < 1) + bt('cr-d-opt', 'crDOrderMove(1)', 'Plus tard ▶', od.rank >= od.n - 1 && sh < 1) + (od.rank >= 1 ? bt('cr-d-opt', 'crDOrderTogether()', '⇉ Avec le précédent') : '') + `</div>`;
  else h += ` ${sm('· seul à bouger')}`;
  h += `<div style="width:100%;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">`;
  if (hasBall) h += sm('Ballon :') + ' ' + bt('cr-d-opt ' + (tok.dr ? '' : 'on'), 'crDSetDrb(false)', '🏃 Course') + bt('cr-d-opt ' + (tok.dr ? 'on' : ''), 'crDSetDrb(true)', '⚽ Dribble');
  if (tok.pth && tok.pth.length) h += bt('cr-d-opt', 'crDStraight()', '↩ Trajet droit');
  h += bt('cr-d-opt', 'crDCancelMove()', '✕ Annuler le déplacement') + `</div>`;
  return row(h);
}
// Dribble ou course : met à jour le joueur ET le type des flèches qui le font bouger (trait ondulé ou droit)
function crDSetDrb(on) {
  const tok = crDOrderTarget(); if (!tok || tok.x1 != null) return;
  crDPush(); if (on) tok.dr = 1; else delete tok.dr;
  crDFrame().els.forEach(a => { if (a.x1 != null && Array.isArray(a.lnk) && a.lnk.includes(tok.id) && (a.t === 'mv' || a.t === 'dribble')) a.t = on ? 'dribble' : 'mv'; });
  crDCtx(); crDRender();
}
// Annule le déplacement d'un joueur vers l'image suivante : il reste à sa place, les flèches qui le faisaient bouger disparaissent
function crDCancelMoveOf(tok) {
  const nx = crD.schema.frames[crD.f + 1], nz = nx && nx.els.find(z => z.id === tok.id);
  if (nz) { nz.x = tok.x; nz.y = tok.y; crDSyncHeld(nx, tok.id); }
  delete tok.pth; delete tok.q; delete tok.dr;
  crDFrame().els = crDFrame().els.filter(a => !(a.x1 != null && Array.isArray(a.lnk) && a.lnk.includes(tok.id) && a.t !== 'pass' && a.t !== 'shot'));
}
function crDCancelMove() {
  const tok = crDOrderTarget(); if (!tok || tok.x1 != null) return;
  crDPush(); crDCancelMoveOf(tok); crD.sels = [tok.id]; crDRefresh();
}
function crDToggleDrb() {
  const sel = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null; if (!sel) return;
  crDPush(); if (sel.dr) delete sel.dr; else sel.dr = 1; crDCtx(); crDRender();
}
function crDNearestTok(fr, x, y, rad, types, skipId) {
  let best = null, bd = 1e9;
  fr.els.forEach(z => { if (z.x1 != null || z.id === skipId || (types && !types.includes(z.t))) return; const d = Math.hypot(z.x - x, z.y - y); if (d < bd) { bd = d; best = z; } });
  return best && bd <= rad ? best : null;
}
// Cherche le joueur le plus proche d'un point, en tenant compte de sa position de départ ET de sa position d'arrivée (image suivante)
function crDFindTok(cur, nf, x, y, rad, types, skipId) {
  let best = null, bd = 1e9;
  cur.els.forEach(z => {
    if (z.x1 != null || z.id === skipId || (types && !types.includes(z.t))) return;
    const nz = nf ? nf.els.find(q => q.id === z.id) : null;
    [[z.x, z.y], nz ? [nz.x, nz.y] : null].forEach(pt => { if (!pt) return; const d = Math.hypot(pt[0] - x, pt[1] - y); if (d < bd) { bd = d; best = z; } });
  });
  return best && bd <= rad ? best : null;
}
function crDNextFrame() {
  const fr = crD.schema.frames, f = crD.f;
  if (f < fr.length - 1) return fr[f + 1];
  if (fr.length >= CR_MAX_FRAMES) return null;
  const nf = { els: JSON.parse(JSON.stringify(fr[f].els.filter(z => z.x1 == null))) };
  nf.els.forEach(z => { delete z.pth; delete z.q; delete z.dr; delete z.legs; });
  fr.push(nf); return nf;
}
// La flèche tracée devient un vrai mouvement dans l'image suivante :
// déplacement / dribble = le joueur (et son ballon) va au bout de la flèche ; passe = le ballon passe au joueur visé ; tir = le ballon part au bout de la flèche
function crDArrowAnimate(a) {
  const f = crD.f, fr = crD.schema.frames, cur = fr[f], k0 = CR_COURT[crD.schema.mode].k, sc = crD.schema.sc, R = 12 * k0 * sc, PL = ['att', 'def', 'gb'];
  const rnd = v => Math.round(v * 10) / 10;
  const isPass = a.t === 'pass' || a.t === 'shot';
  // déplacement / dribble : on part d'un joueur ; passe / tir : on part du porteur, là où il sera à la fin de sa course (ou là où il est)
  const S = isPass ? crDFindTok(cur, fr[f + 1] || null, a.x1, a.y1, R * 1.1, PL) : crDNearestTok(cur, a.x1, a.y1, R, PL);
  if (!S) { crDFlash('Flèche non animée : elle doit partir d\'un joueur' + (isPass ? ' (ou de son point d\'arrivée).' : '.')); return; }
  const nf = crDNextFrame(); if (!nf) return;
  if (isPass) {
    // ballon porté par S « à ce moment-là » : porteur initial (sans passe encore) ou receveur de la dernière passe enchaînée
    const lastH = z => Array.isArray(z.legs) && z.legs.length ? z.legs[z.legs.length - 1].h : z.hold;
    // anciennes données : une passe sans « legs » (hold différent d'une image à l'autre) est convertie
    cur.els.forEach(z => {
      if (z.t !== 'ball' || (Array.isArray(z.legs) && z.legs.length) || !z.hold) return;
      const zb = nf.els.find(q => q.id === z.id);
      if (zb && zb.hold && zb.hold !== z.hold) { z.legs = [{ h: zb.hold, x: zb.x, y: zb.y, f: 1 }]; delete z.q; }
    });
    let ball = cur.els.find(z => z.t === 'ball' && lastH(z) === S.id);
    if (!ball) {
      const near = crDNearestTok(cur, S.x, S.y, R * 1.2, ['ball']);
      if (near && !(Array.isArray(near.legs) && near.legs.length)) { ball = near; ball.hold = S.id; crDSyncHeld(cur, S.id); }
    }
    if (!ball) { crDFlash('Flèche non animée : ce joueur n\'a pas le ballon à ce moment-là.'); return; }
    const nb = nf.els.find(z => z.id === ball.id); if (!nb) return;
    const Q = a.t === 'pass' ? crDFindTok(cur, nf, a.x2, a.y2, 14 * k0 * sc, PL, S.id) : null;
    if (!Array.isArray(ball.legs)) ball.legs = [];
    ball.legs.push({ h: Q ? Q.id : null, x: rnd(a.x2), y: rnd(a.y2), f: ball.legs.length ? 0.5 : 1, aid: a.id });
    if (Q) { nb.hold = Q.id; crDSyncHeld(nf, Q.id); } else { delete nb.hold; nb.x = rnd(a.x2); nb.y = rnd(a.y2); }
    delete ball.q; a.lnk = [ball.id];
  } else {
    const ns = nf.els.find(z => z.id === S.id); if (!ns) return;
    ns.x = rnd(a.x2); ns.y = rnd(a.y2); delete S.pth;
    if (a.t === 'dribble') S.dr = 1; else delete S.dr;
    crDSyncHeld(nf, S.id);
    S.q = crDNextQ(f, [S.id]); a.lnk = [S.id];
  }
}
// ----- Ballon porté par un joueur -----
function crHoldOff(h, k0, sc) { const r = 8 * CR_TB * k0 * sc * (parseFloat(h.s) || 1); return [r * 0.95, r * 0.75]; }
function crDSyncHeld(fr, id) {
  const h = fr.els.find(z => z.id === id); if (!h) return;
  const o = crHoldOff(h, CR_COURT[crD.schema.mode].k, crD.schema.sc);
  fr.els.forEach(b => { if (b.t === 'ball' && b.hold === id) { b.x = Math.round((h.x + o[0]) * 10) / 10; b.y = Math.round((h.y + o[1]) * 10) / 10; } });
}
function crDSyncAll() { crD.schema.frames.forEach(fr => fr.els.forEach(b => { if (b.t === 'ball' && b.hold) crDSyncHeld(fr, b.hold); })); }
function crDSnapBall(b, fr) {
  const k0 = CR_COURT[crD.schema.mode].k, sc = crD.schema.sc;
  let best = null, bd = 1e9;
  fr.els.forEach(z => { if (z.x1 == null && (z.t === 'att' || z.t === 'def' || z.t === 'gb')) { const d = Math.hypot(z.x - b.x, z.y - b.y); if (d < bd) { bd = d; best = z; } } });
  if (best && bd <= 12 * k0 * sc) { b.hold = best.id; const o = crHoldOff(best, k0, sc); b.x = Math.round((best.x + o[0]) * 10) / 10; b.y = Math.round((best.y + o[1]) * 10) / 10; }
  else delete b.hold;
}
function crDRelease() { const e = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null; if (!e || !e.hold) return; crDPush(); delete e.hold; crDCtx(); crDRender(); }
// Ordre d'un nouveau mouvement : après tous ceux déjà présents dans la transition de l'image f
function crDNextQ(f, exceptIds) {
  const fr = crD.schema.frames; if (!fr[f + 1]) return 1;
  const o = crOrderInfo(fr[f], fr[f + 1]); let m = 0;
  o.mv.forEach(a => { if (!exceptIds.includes(a.id)) m = Math.max(m, o.qOf(a)); });
  return m + 1;
}
// Réglage de l'ordre depuis la barre contextuelle
// Cible du réglage d'ordre : l'élément sélectionné, ou l'élément animé par la flèche sélectionnée (passe, dribble…)
function crDOrderTarget() {
  const sel = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null; if (!sel) return null;
  if (sel.x1 != null) { const id = Array.isArray(sel.lnk) && sel.lnk[0]; return id ? (crDEl(id) || null) : null; }
  return sel;
}
function crDOrderOf(sel) {
  const fr = crD.schema.frames, f = crD.f; if (!sel || sel.x1 != null || !fr[f + 1]) return null;
  const o = crOrderInfo(fr[f], fr[f + 1]); const r = o.ranks[sel.id];
  return r == null ? null : { rank: r, n: o.n, o };
}
function crDOrderMove(dir) {
  const sel = crDOrderTarget(), od = crDOrderOf(sel); if (!od) return;
  const sh = od.o.mv.filter(a => od.o.ranks[a.id] === od.rank).length > 1, nr = od.rank + dir; if (!sh && (nr < 0 || nr >= od.n)) return;
  crDPush();
  od.o.mv.forEach(a => { a.q = od.o.ranks[a.id] * 10; });
  sel.q = nr * 10 + (dir > 0 ? 5 : -5);
  crDCtx(); crDRender();
}
function crDOrderTogether() {
  const sel = crDOrderTarget(), od = crDOrderOf(sel); if (!od || od.rank < 1) return;
  crDPush();
  od.o.mv.forEach(a => { a.q = od.o.ranks[a.id] * 10; });
  sel.q = (od.rank - 1) * 10;
  crDCtx(); crDRender();
}
// Passe enchaînée liée à une flèche (passe / tir) : ballon, maillon, rang, passeur, et si le passeur court (réglage du départ possible)
function crDLegOf(a) {
  if (!a || a.x1 == null || !Array.isArray(a.lnk) || (a.t !== 'pass' && a.t !== 'shot')) return null;
  const fr = crD.schema.frames, f = crD.f, cur = fr[f], ball = cur.els.find(z => z.id === a.lnk[0] && z.t === 'ball');
  if (!ball || !Array.isArray(ball.legs)) return null;
  const idx = ball.legs.findIndex(L => L.aid === a.id); if (idx < 0) return null;
  const holder = idx ? ball.legs[idx - 1].h : ball.hold, nx = fr[f + 1];
  const tr = nx ? crTrans(cur, nx) : null, r = tr && holder ? tr.ord.ranks[holder] : null, mover = r != null;
  let late = null; // si le ballon n'est pas encore arrivé à l'instant voulu : part de la course où il arrive réellement
  if (mover && tr.plans[ball.id]) {
    const pl = tr.plans[ball.id][idx], w0 = r * tr.st, f = ball.legs[idx].f == null ? 1 : ball.legs[idx].f;
    if (pl.ts > w0 + f * tr.dur + 0.004) late = Math.round(100 * (pl.ts - w0) / tr.dur);
  }
  return { ball, leg: ball.legs[idx], idx, holder, mover, late };
}
function crDLegF(v) {
  const a = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null, lg = crDLegOf(a); if (!lg) return;
  crDPush(); lg.leg.f = v; crDCtx(); crDRender();
}
// Supprime la passe liée à une flèche (et les passes suivantes de la chaîne) et remet le ballon de l'image suivante en cohérence
function crDUnlinkLeg(a) {
  const lg = crDLegOf(a); if (!lg) return;
  const ball = lg.ball; ball.legs.splice(lg.idx);
  const nf = crD.schema.frames[crD.f + 1], nb = nf && nf.els.find(z => z.id === ball.id);
  const last = ball.legs.length ? ball.legs[ball.legs.length - 1] : null;
  if (!ball.legs.length) delete ball.legs;
  if (nb) {
    const h = last ? last.h : ball.hold;
    if (h) { nb.hold = h; crDSyncHeld(nf, h); }
    else { delete nb.hold; nb.x = last ? last.x : ball.x; nb.y = last ? last.y : ball.y; }
  }
}
function crDStraight() { const e = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null; if (!e || !e.pth) return; crDPush(); delete e.pth; crDCtx(); crDRender(); }

// ----- Trajectoires -----
function crDClampPt(q) { const c = CR_COURT[crD.schema.mode]; return { x: Math.max(0, Math.min(c.w, q.x)), y: Math.max(0, Math.min(c.h, q.y)) }; }
// Outil "Trajectoire" : trace au doigt depuis un élément ; sa position dans l'image suivante devient l'arrivée du tracé
function crDApplyTraj(d) {
  const tr = d.trace;
  let len = 0; for (let i = 1; i < tr.length; i++) len += Math.hypot(tr[i].x - tr[i - 1].x, tr[i].y - tr[i - 1].y);
  crD.sels = [];
  if (tr.length < 2 || len < 8) { crDCtx(); crDRender(); return; }
  const fr = crD.schema.frames, f = crD.f;
  if (f === fr.length - 1 && fr.length >= CR_MAX_FRAMES) { crDCtx(); crDRender(); return; }
  crDPush();
  if (f === fr.length - 1) { fr.push({ els: JSON.parse(JSON.stringify(fr[f].els.filter(z => z.x1 == null))) }); fr[f + 1].els.forEach(z => { delete z.pth; delete z.q; delete z.dr; delete z.legs; }); }
  const nf = fr[f + 1], tok = crDEl(d.id), end = tr[tr.length - 1];
  if (!tok) { crDRefresh(); return; }
  let ntok = nf.els.find(z => z.id === d.id);
  if (!ntok) { ntok = JSON.parse(JSON.stringify(tok)); delete ntok.pth; nf.els.push(ntok); }
  ntok.x = Math.round(end.x * 10) / 10; ntok.y = Math.round(end.y * 10) / 10;
  const mid = crSimplifyMid(tr);
  if (mid.length) tok.pth = mid; else delete tok.pth;
  tok.q = crDNextQ(f, [tok.id]);
  if (tok.t !== 'ball') { if (crD.dr) tok.dr = 1; else delete tok.dr; }
  if (ntok.t === 'ball') crDSnapBall(ntok, nf); else crDSyncHeld(nf, ntok.id);
  crDRefresh();
}
// Enregistrement auto : le geste réel du doigt devient la trajectoire entre l'image précédente et la nouvelle
function crDStoreTrace(d) {
  const prev = crD.schema.frames[crD.f - 1], cur = crDFrame(); if (!prev || !d.trace) return;
  const ids = d.kind === 'group' ? d.ids : [d.id];
  const gq = crDNextQ(crD.f - 1, ids);
  ids.forEach(id => {
    const a = prev.els.find(z => z.id === id), b = cur.els.find(z => z.id === id);
    if (!a || !b || a.x1 != null) return;
    a.q = gq;
    if (a.t === 'ball' && a.hold && b.hold === a.hold) return;
    let pts = d.kind === 'group' ? d.trace.map(q => crDClampPt({ x: q.x - d.p0.x + a.x, y: q.y - d.p0.y + a.y })) : d.trace.map(q => ({ x: q.x, y: q.y }));
    pts[0] = { x: a.x, y: a.y }; pts[pts.length - 1] = { x: b.x, y: b.y };
    const mid = crSimplifyMid(pts);
    if (mid.length) a.pth = mid; else delete a.pth;
  });
}

// ----- Barre de progression de l'animation -----
function crDScrubEls() {
  const fr = crD.schema.frames, n = fr.length, v = Math.max(0, Math.min(n - 1, crD.scrub)), i = Math.min(n - 1, Math.floor(v));
  return i >= n - 1 ? fr[n - 1].els.filter(x => x.x1 == null) : crInterp(fr[i], fr[i + 1], v - i);
}
function crDScrubUi() {
  const row = document.getElementById('cr-d-scrubrow'); if (!row || !crD) return;
  const n = crD.schema.frames.length;
  row.style.display = n >= 2 ? 'flex' : 'none';
  const sl = document.getElementById('cr-d-scrub'); sl.max = String((n - 1) * 100);
  if (!crD.playing) sl.value = String(Math.round((crD.scrub != null ? crD.scrub : crD.f) * 100));
}
function crDScrub(v) {
  if (!crD) return;
  if (crD.playing) { crD.playing = false; if (crDRaf) cancelAnimationFrame(crDRaf); crDRaf = null; crDFramesBar(); }
  crD.sels = []; crD.pending = null; crD.scrub = v;
  const n = crD.schema.frames.length;
  document.getElementById('cr-d-title').textContent = 'Aperçu · image ' + (Math.min(n, Math.round(v) + 1)) + ' / ' + n;
  crDCtx(); crDRender();
}
function crDScrubEnd(v) {
  if (!crD || crD.scrub == null) return;
  if (Math.abs(v - Math.round(v)) < 0.04) { crD.f = Math.round(v); crD.sels = []; crDRefresh(); }
}
function crDScrubExit() {
  if (!crD || crD.scrub == null) return;
  crD.f = Math.max(0, Math.min(crD.schema.frames.length - 1, Math.round(crD.scrub))); crD.sels = []; crDRefresh();
}
function crDDelSel() {
  const ids = crD.sels.slice(); if (!ids.length) return;
  crDPush();
  ids.forEach(id => {
    const e = crDEl(id); if (!e) return;
    if (e.x1 != null) {
      crDUnlinkLeg(e);
      const lt = (e.t !== 'pass' && e.t !== 'shot' && Array.isArray(e.lnk)) ? crDEl(e.lnk[0]) : null;
      if (lt && lt.x1 == null) crDCancelMoveOf(lt);
      crDFrame().els = crDFrame().els.filter(x => x.id !== id);
    }
    else for (let i = crD.f; i < crD.schema.frames.length; i++) crD.schema.frames[i].els = crD.schema.frames[i].els.filter(x => x.id !== id);
  });
  crD.sels = []; crDRefresh();
}
// ----- Images (frames) -----
function crDFramesBar() {
  const s = crD.schema, n = s.frames.length, play = crD.playing;
  document.getElementById('cr-d-frames').innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
      <button type="button" class="cr-d-fb" onclick="crDAddFrame()" ${play || n >= CR_MAX_FRAMES ? 'disabled' : ''}>＋ Image</button>
      <button type="button" class="cr-d-fb" onclick="crDDelFrame()" ${play || n < 2 ? 'disabled' : ''}>🗑</button>
      <button type="button" class="cr-d-fb ${play ? 'on' : ''}" onclick="crDPlay()" ${n < 2 ? 'disabled' : ''}>${play ? '⏸ Stop' : '▶ Lecture'}</button>
      <select class="cr-d-fb" onchange="crD.speed=parseFloat(this.value)">${[[0.5, '×0,5'], [0.75, '×0,75'], [1, '×1'], [1.5, '×1,5'], [2, '×2']].map(([v, l]) => `<option value="${v}" ${crD.speed === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="cr-d-fb ${crD.rec ? 'rec' : ''}" onclick="crDRec()" ${play ? 'disabled' : ''}>${crD.rec ? '● Enreg. auto : OUI' : '○ Enreg. auto'}</button>
    </div>
    <div class="cr-d-strip" id="cr-d-strip">${s.frames.map((f, i) => `<button type="button" class="${i === crD.f ? 'on' : ''}" onclick="crDGo(${i})">${i + 1}</button>`).join('')}</div>`;
  const on = document.querySelector('#cr-d-strip .on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  crDScrubUi();
}
function crDRec() { crD.rec = !crD.rec; crDFramesBar(); }
function crDGo(i) { if (crD.playing) return; crD.f = i; crD.sels = []; crD.pending = null; crDRefresh(); }
function crDAddFrame(noPush) {
  if (crD.schema.frames.length >= CR_MAX_FRAMES) return false;
  if (!noPush) crDPush();
  const copy = { els: JSON.parse(JSON.stringify(crDFrame().els.filter(e => e.x1 == null))) };
  crDFrame().els.forEach(e => { delete e.pth; delete e.q; delete e.dr; delete e.legs; }); // la transition vers l'image suivante passe à la copie
  crD.schema.frames.splice(crD.f + 1, 0, copy); crD.f++;
  if (!noPush) crDRefresh();
  return true;
}
function crDDelFrame() {
  if (crD.schema.frames.length < 2) return;
  crDPush(); crD.schema.frames.splice(crD.f, 1); crD.f = Math.min(crD.f, crD.schema.frames.length - 1);
  const pv = crD.schema.frames[crD.f - 1]; if (pv) pv.els.forEach(e => { delete e.pth; delete e.q; delete e.dr; delete e.legs; });
  crD.sels = []; crDRefresh();
}
function crDPlay() {
  if (crD.playing) { crDStop(); return; }
  const n = crD.schema.frames.length; if (n < 2) return;
  crD.playing = true; crD.sels = []; crD.pending = null;
  const t0 = performance.now(), start = crD.f >= n - 1 ? 0 : crD.f, tl = crTimeline(crD.schema.frames), off = tl.segs[start].start;
  crDFramesBar(); crDCtx();
  const step = now => {
    if (!crD || !crD.playing) return;
    const ms = off + (now - t0) * crD.speed;
    if (ms >= crTimeEnd(tl)) { crDRaf = null; crD.playing = false; crD.f = n - 1; crD.sels = []; crDRefresh(); return; }
    const q = crTimeAt(tl, ms), i = q.i, t = q.t;
    const a = crD.schema.frames[i], b = crD.schema.frames[i + 1];
    crDRender(i + 1 < n ? crInterp(a, b, t) : a.els.filter(x => x.x1 == null));
    const sl = document.getElementById('cr-d-scrub'); if (sl) sl.value = String(Math.round((i + t) * 100));
    crDRaf = requestAnimationFrame(step);
  };
  crDRaf = requestAnimationFrame(step);
}
function crDStop() {
  if (crDRaf) cancelAnimationFrame(crDRaf); crDRaf = null;
  if (crD) { crD.playing = false; crDRefresh(); }
}
// ----- Interaction canvas -----
// ----- Précision (doigt, stylet Apple Pencil, souris) -----
const CR_BUILD = APP_VERSION; // repère de version affiché dans l'éditeur : identique à la version de l'application (voir 00-version.js)
const CR_SNAP = 5; // pas de l'aimant : 5 unités = 50 cm
function crDSnapPref() { try { return localStorage.getItem('cr_snap') === '1'; } catch (x) { return false; } }
function crDToggleSnap() {
  if (!crD) return; crD.snap = !crD.snap;
  try { localStorage.setItem('cr_snap', crD.snap ? '1' : '0'); } catch (x) {}
  const b = document.getElementById('cr-d-snap'); if (b) b.classList.toggle('on', crD.snap);
  crDFlash(crD.snap ? 'Aimant activé : les éléments se calent sur une grille de 50 cm.' : 'Aimant désactivé : placement libre.'); crDRender();
}
function crDSn(v) { return crD && crD.snap ? Math.round(v / CR_SNAP) * CR_SNAP : v; }
// tolérance de sélection en pixels écran selon l'outil : stylet très précis, souris précise, doigt plus large
function crDTolPx(e) { const t = e && e.pointerType; return t === 'pen' ? 4 : (t === 'mouse' ? 6 : 9); }
function crDDragPx(e) { return e && e.pointerType === 'pen' ? 2 : 4; }
function crDUpx() { const svg = document.querySelector('#cr-d-svgbox svg'); if (!svg) return 1; const r = svg.getBoundingClientRect(), vb = crDVB(); return 1 / Math.min(r.width / vb[2], r.height / vb[3]); }
// Point (aimanté si l'option est active) pour placer / déplacer / tracer
function crDPtS(e) { const p = crDPt(e), c = CR_COURT[crD.schema.mode]; return crD.snap ? { x: Math.max(0, Math.min(c.w, crDSn(p.x))), y: Math.max(0, Math.min(c.h, crDSn(p.y))) } : p; }
// Colle un point de départ / d'arrivée de flèche sur le centre d'un joueur voisin (sa position actuelle ou son arrivée en transparence)
function crDMagnet(p, e, skip) {
  const tol = crDTolPx(e) * crDUpx(), k0 = CR_COURT[crD.schema.mode].k, sc = crD.schema.sc, cur = crDFrame(), nf = crD.schema.frames[crD.f + 1];
  let best = null, bd = 1e9;
  cur.els.forEach(z => {
    if (z.x1 != null || z.t === 'ball' || CR_DRAWT.includes(z.t)) return;
    const rv = (CR_VIS_R[z.t] || 6) * k0 * sc * (parseFloat(z.s) || 1) * CR_TB, nz = nf ? nf.els.find(q => q.id === z.id) : null;
    [[z.x, z.y], nz ? [nz.x, nz.y] : null].forEach(pt => {
      if (!pt || (skip && Math.hypot(pt[0] - skip.x, pt[1] - skip.y) < 1.5)) return;
      const d = Math.hypot(pt[0] - p.x, pt[1] - p.y);
      if (d - rv <= tol && d < bd) { bd = d; best = { x: pt[0], y: pt[1] }; }
    });
  });
  return best || p;
}
// Pose à l'unité près (boutons ◀ ▲ ▼ ▶ de la barre contextuelle)
function crDNudge(dx, dy) {
  const el = crD.sels.length === 1 ? crDEl(crD.sels[0]) : null; if (!el || el.x1 != null) return;
  const c = CR_COURT[crD.schema.mode]; crDPush();
  el.x = Math.round(Math.max(0, Math.min(c.w, el.x + dx)) * 10) / 10; el.y = Math.round(Math.max(0, Math.min(c.h, el.y + dy)) * 10) / 10;
  if (CR_DRAWT.includes(el.t)) crDPropPos(el); else if (el.t !== 'ball') crDSyncHeld(crDFrame(), el.id); else crDSnapBall(el, crDFrame());
  crDRender();
}
// Survol du Pencil : anneau de visée, et l'élément qui serait saisi
// Clavier : le focus doit être donné pendant le relâchement du doigt / du stylet (pointerup), seul instant où iPadOS accepte d'ouvrir le clavier ;
// le redessin du terrain au pointerdown supprime l'élément touché, donc l'événement click n'arrive jamais
function crDFocusTxt() {
  if (!crD || !crD.focusTxt) return;
  crD.focusTxt = false;
  const i = document.getElementById('cr-d-txt'); if (!i) return;
  i.focus(); try { i.select(); } catch (x) {}
}
function crDHoverOff() { const g = document.getElementById('cr-d-hover'); if (g) g.remove(); }
function crDHover(e) {
  const svg = document.querySelector('#cr-d-svgbox svg'); if (!svg || crD.playing || crD.scrub != null) return;
  crDHoverOff();
  const p = crDPtS(e), hit = crDHit(e), el = hit && hit.dataset && hit.dataset.id ? crDEl(hit.dataset.id) : null, k0 = CR_COURT[crD.schema.mode].k;
  let h;
  if (el && el.x1 == null && !CR_DRAWT.includes(el.t)) { const r = (CR_VIS_R[el.t] || 6) * k0 * crD.schema.sc * (parseFloat(el.s) || 1) * CR_TB * 1.35 + 1; h = `<circle cx="${el.x}" cy="${el.y}" r="${r}" fill="none" stroke="#F5C400" stroke-width="1.4" stroke-dasharray="3 2"/>`; }
  else if (el && CR_DRAWT.includes(el.t)) { const b = crDrawBox(el, k0, crD.schema.sc); h = `<rect x="${b.x0 - 1.5}" y="${b.y0 - 1.5}" width="${b.x1 - b.x0 + 3}" height="${b.y1 - b.y0 + 3}" fill="none" stroke="#F5C400" stroke-width="1.2" stroke-dasharray="3 2"/>`; }
  else if (el) h = `<line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="#F5C400" stroke-opacity=".55" stroke-width="3.2" stroke-linecap="round"/>`;
  else h = `<circle cx="${p.x}" cy="${p.y}" r="2.2" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width=".9"/><circle cx="${p.x}" cy="${p.y}" r=".5" fill="#F5C400"/>`;
  svg.insertAdjacentHTML('beforeend', `<g id="cr-d-hover" style="pointer-events:none;">${h}</g>`);
}
function crDPt(e) {
  const q = crDRaw(e.clientX, e.clientY);
  const c = CR_COURT[crD.schema.mode];
  return { x: Math.round(Math.max(0, Math.min(c.w, q.x)) * 10) / 10, y: Math.round(Math.max(0, Math.min(c.h, q.y)) * 10) / 10 };
}
// Sélection précise : on retient l'élément dont le centre est le plus proche du doigt (tolérance d'environ 9 px autour de sa forme),
// plutôt que celui qui est dessiné au-dessus. Les flèches ne comptent que si aucun joueur/objet n'est visé.
const CR_VIS_R = { att: 8, gb: 8, def: 9.2, ball: 5.5, cone: 7.5, coupelle: 5.5, jalon: 4.5, cerceau: 8, haie: 9.5, minibut: 10.5 };
function crDHit(e) {
  const hh = e.target.closest ? e.target.closest('[data-h]') : null; if (hh) return hh;
  const svg = document.querySelector('#cr-d-svgbox svg'); if (!svg) return null;
  const q = crDRaw(e.clientX, e.clientY);
  const r = svg.getBoundingClientRect(), vb = crDVB(), upx = 1 / Math.min(r.width / vb[2], r.height / vb[3]), tol = crDTolPx(e) * upx;
  const k0 = CR_COURT[crD.schema.mode].k, sc = crD.schema.sc;
  let best = null, bd = 1e9;
  crDFrame().els.forEach(z => {
    if (z.x1 != null || CR_DRAWT.includes(z.t)) return;
    const rv = (CR_VIS_R[z.t] || 6) * k0 * sc * (parseFloat(z.s) || 1) * CR_TB, d = Math.hypot(z.x - q.x, z.y - q.y);
    if (d - rv <= tol && d < bd) { bd = d; best = z; }
  });
  if (best) return { dataset: { id: best.id } };
  let bp = null, bpd = 1e9;
  crDFrame().els.forEach(z => { if (z.x1 == null && (z.t === 'pen' || z.t === 'text')) { const d = crDDrawHit(z, q, tol, k0, sc); if (d != null && d < bpd) { bpd = d; bp = z; } } });
  if (bp) return { dataset: { id: bp.id } };
  let ba = null, bad = 1e9;
  crDFrame().els.forEach(z => {
    if (z.x1 == null) return;
    const dx = z.x2 - z.x1, dy = z.y2 - z.y1, L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((q.x - z.x1) * dx + (q.y - z.y1) * dy) / L2));
    const d = Math.hypot(z.x1 + dx * u - q.x, z.y1 + dy * u - q.y);
    if (d <= tol && d < bad) { bad = d; ba = z; }
  });
  if (ba) return { dataset: { id: ba.id } };
  let bz = null, ba2 = 1e18;
  crDFrame().els.forEach(z => { if (z.x1 == null && (z.t === 'zone' || z.t === 'echelle') && crDDrawHit(z, q, tol, k0, sc) != null) { const ar = z.t === 'echelle' ? (+z.L || 20) * 3.4 : (+z.w || 1) * (+z.h || 1); if (ar < ba2) { ba2 = ar; bz = z; } } });
  return bz ? { dataset: { id: bz.id } } : null;
}
// Distance (unités terrain) entre un point et une annotation, ou null si hors de portée
function crDDrawHit(z, q, tol, k0, sc, edge) {
  const s = parseFloat(z.s) || 1;
  if (z.t === 'text') { const b = crDrawBox(z, k0, sc); return (q.x >= b.x0 - tol && q.x <= b.x1 + tol && q.y >= b.y0 - tol && q.y <= b.y1 + tol) ? 0 : null; }
  if (z.t === 'pen') {
    const P = (Array.isArray(z.pts) ? z.pts : []).map(a => [z.x + (+a[0] || 0) * s, z.y + (+a[1] || 0) * s]); let best = 1e9;
    if (P.length === 1) best = Math.hypot(P[0][0] - q.x, P[0][1] - q.y);
    for (let i = 1; i < P.length; i++) {
      const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1], L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((q.x - P[i - 1][0]) * dx + (q.y - P[i - 1][1]) * dy) / L2));
      best = Math.min(best, Math.hypot(P[i - 1][0] + dx * u - q.x, P[i - 1][1] + dy * u - q.y));
    }
    return best <= tol + crLw(z) * k0 * sc * s * 0.5 ? best : null;
  }
  if (z.t === 'echelle') {
    const a = (+z.a || 0) * Math.PI / 180, dx = q.x - z.x, dy = q.y - z.y, lx = dx * Math.cos(a) + dy * Math.sin(a), ly = -dx * Math.sin(a) + dy * Math.cos(a);
    return (Math.abs(lx) <= (+z.L || 20) * s + tol && Math.abs(ly) <= 3.4 * s + tol) ? 0 : null;
  }
  const w = (+z.w || 1) * s, h = (+z.h || 1) * s, dx = q.x - z.x, dy = q.y - z.y;
  const d = z.shape === 'ellipse' ? (Math.hypot(dx / w, dy / h) - 1) * Math.min(w, h) : Math.max(Math.abs(dx) - w, Math.abs(dy) - h);
  const filled = !edge && (z.f == null ? 1 : +z.f) > 0;
  return (filled ? d <= tol : Math.abs(d) <= tol) ? Math.abs(d) : null;
}
// Positions des annotations : valables pour cette image et les suivantes
function crDPropPos(z) {
  for (let i = crD.f + 1; i < crD.schema.frames.length; i++) crD.schema.frames[i].els.forEach(q => { if (q.id === z.id) { q.x = z.x; q.y = z.y; if (z.t === 'zone') { q.w = z.w; q.h = z.h; } if (z.t === 'echelle') { q.L = z.L; q.a = z.a; } } });
}
function crDAddAll(el) {
  for (let i = crD.f; i < crD.schema.frames.length; i++) crD.schema.frames[i].els.push(i === crD.f ? el : JSON.parse(JSON.stringify(el)));
}
function crDLadderGeom(a, b, dist) {
  if (dist < 8) return { x: a.x, y: a.y, L: 25, a: 0 };
  const dx = b.x - a.x, dy = b.y - a.y;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, L: Math.max(4, Math.hypot(dx, dy) / 2), a: crSnapAng(Math.atan2(dy, dx) * 180 / Math.PI) };
}
function crDLadderDone(d, e) {
  const g = crDLadderGeom(d.a, d.b, Math.hypot(e.clientX - d.sx, e.clientY - d.sy)), r1 = v => Math.round(v * 10) / 10;
  const el = { id: crUid(), t: 'echelle', x: r1(g.x), y: r1(g.y), L: r1(g.L), a: g.a, n: crD.dn };
  if (crD.dcol) el.c = crD.dcol;
  crDPush(); crDAddAll(el); crD.tool = 'sel'; crD.sels = [el.id]; crDRefresh();
}
// Gomme : efface le dessin / texte touché ; à défaut le bord d'une zone ou l'échelle
function crDEraseDrag(e) {
  const d = crD.drag; if (!d) return;
  const k0 = CR_COURT[crD.schema.mode].k, sc = crD.schema.sc, tol = (e.pointerType === 'pen' ? 7 : 11) * crDUpx();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null; let last = crDRaw(e.clientX, e.clientY);
  (evs && evs.length ? evs : [e]).forEach(ev => {
    const q = crDRaw(ev.clientX, ev.clientY); last = q;
    const fr = crDFrame(); let gone = fr.els.filter(z => z.x1 == null && (z.t === 'pen' || z.t === 'text') && crDDrawHit(z, q, tol, k0, sc) != null).map(z => z.id);
    if (!gone.length) gone = fr.els.filter(z => z.x1 == null && (z.t === 'zone' || z.t === 'echelle') && crDDrawHit(z, q, tol, k0, sc, true) != null).map(z => z.id);
    if (!gone.length) return;
    if (!d.pushed) { crDPush(); d.pushed = true; }
    for (let i = crD.f; i < crD.schema.frames.length; i++) crD.schema.frames[i].els = crD.schema.frames[i].els.filter(z => !gone.includes(z.id));
    crD.sels = crD.sels.filter(i => !gone.includes(i));
  });
  crDRender();
  const svg = document.querySelector('#cr-d-svgbox svg');
  if (svg) svg.insertAdjacentHTML('beforeend', `<circle cx="${last.x}" cy="${last.y}" r="${tol}" fill="rgba(232,84,58,0.15)" stroke="#E8543A" stroke-width="${0.9 * crDUpx()}" style="pointer-events:none;"/>`);
}
function crDZoneGeom(a, b, dist) {
  const k0 = CR_COURT[crD.schema.mode].k;
  if (dist < 8) return { x: a.x, y: a.y, w: 20 * k0, h: 12 * k0 };
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: Math.max(2, Math.abs(b.x - a.x) / 2), h: Math.max(2, Math.abs(b.y - a.y) / 2) };
}
function crDDrawPrev(el) {
  const svg = document.querySelector('#cr-d-svgbox svg'); if (!svg) return;
  svg.insertAdjacentHTML('beforeend', `<g style="pointer-events:none;" opacity=".9">${crTokenSvg(el, CR_COURT[crD.schema.mode].k * crD.schema.sc * CR_TB, CR_TH.dark)}</g>`);
}
function crDPenDone(d) {
  const upx = crDUpx(); let P = d.pts, len = 0;
  for (let i = 1; i < P.length; i++) len += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
  if (P.length < 2 || len < 3 * upx) { crDRender(); return; }
  P = crRdp(P, Math.max(0.3, 0.7 * upx));
  const xs = P.map(q => q.x), ys = P.map(q => q.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, r1 = v => Math.round(v * 10) / 10;
  const el = { id: crUid(), t: 'pen', x: r1(cx), y: r1(cy), pts: P.map(q => [r1(q.x - cx), r1(q.y - cy)]), lt: crD.dlt };
  if (crD.dcol) el.c = crD.dcol;
  crDPush(); crDAddAll(el); crDRefresh();
}
function crDZoneDone(d, e) {
  const g = crDZoneGeom(d.a, d.b, Math.hypot(e.clientX - d.sx, e.clientY - d.sy)), r1 = v => Math.round(v * 10) / 10;
  const el = { id: crUid(), t: 'zone', shape: crD.dm === 'ellipse' ? 'ellipse' : 'rect', x: r1(g.x), y: r1(g.y), w: r1(g.w), h: r1(g.h), f: crD.dfill, lt: crD.dlt };
  if (crD.dcol) el.c = crD.dcol;
  crDPush(); crDAddAll(el); crD.tool = 'sel'; crD.sels = [el.id]; crDRefresh();
}
function crDNextN(t) { const ns = crDFrame().els.filter(e => e.t === t).map(e => parseInt(e.n, 10) || 0); return (ns.length ? Math.max(...ns) : 0) + 1; }
function crDDown(e) {
  if (!crD || crD.playing) return;
  if (e.target.closest && e.target.closest('button')) return;
  // stylet : la paume (toucher) posée à côté est ignorée pendant et juste après le tracé
  const nowT = performance.now();
  if (e.pointerType === 'pen') { crD.penT = nowT; crD.penDown = true; }
  else if (e.pointerType === 'touch' && crD.penDown && nowT - crD.penT < 350) return;
  else if (e.pointerType === 'touch') crD.penDown = false;
  if (crD.scrub != null) { crDScrubExit(); return; }
  if (e.isPrimary) { crD.ptrs = {}; crD.pinch = null; }
  crD.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (Object.keys(crD.ptrs).length >= 2) { crDPinchStart(); return; }
  const t = crD.tool, p = crDPt(e), ps = crDPtS(e), cv = document.getElementById('cr-d-canvas');
  const hitEl = crDHit(e);
  const cap = () => { if (crD.drag) crD.drag.pid = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {} };
  const base = { last: p, moved: false, sx: e.clientX, sy: e.clientY };
  // stylet : bouton latéral / gomme (si l'appareil les transmet) = gomme le temps du geste
  if (e.pointerType === 'pen' && (e.buttons & 34) && t !== 'pan') { crD.drag = { ...base, kind: 'erase', pushed: false }; cap(); crDEraseDrag(e); return; }
  if (t === 'pan') { crD.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY }; cap(); return; }
  if (t === 'sel' || t === 'multi') {
    const el = hitEl ? crDEl(hitEl.dataset.id) : null;
    if (el) {
      const id = el.id, tok = el.x1 == null;
      if (hitEl.dataset.h === 'z') { const sg = parseFloat(el.s) || 1; crD.sels = [id]; crD.drag = { ...base, kind: 'hz', id, off: { x: el.x + (+el.w || 1) * sg - p.x, y: el.y + (+el.h || 1) * sg - p.y } }; }
      else if (hitEl.dataset.h === 'l') { const sg = parseFloat(el.s) || 1, an = (+el.a || 0) * Math.PI / 180; crD.sels = [id]; crD.drag = { ...base, kind: 'hl', id, off: { x: el.x + Math.cos(an) * (+el.L || 20) * sg - p.x, y: el.y + Math.sin(an) * (+el.L || 20) * sg - p.y } }; }
      else if (hitEl.dataset.h) { crD.sels = [id]; const hx = hitEl.dataset.h === '1' ? el.x1 : el.x2, hy = hitEl.dataset.h === '1' ? el.y1 : el.y2; crD.drag = { ...base, kind: 'h' + hitEl.dataset.h, id, off: { x: hx - p.x, y: hy - p.y } }; }
      else if (t === 'multi' && tok) {
        const had = crD.sels.includes(id);
        if (!had) crD.sels = crD.sels.filter(i => { const z = crDEl(i); return z && z.x1 == null; }).concat(id);
        crD.drag = { ...base, kind: 'group', ids: crD.sels.slice(), toggle: had ? id : null };
      } else if (tok && crD.sels.length > 1 && crD.sels.includes(id)) {
        crD.drag = { ...base, kind: 'group', ids: crD.sels.slice(), toggle: null };
      } else {
        crD.sels = [id];
        crD.drag = { ...base, kind: tok ? 'token' : 'arrow', id, off: tok ? { x: el.x - p.x, y: el.y - p.y } : null };
      }
      cap();
    } else {
      crD.drag = { ...base, kind: 'marquee', a: p, b: p, keep: t === 'multi' ? crD.sels.slice() : [] };
      crD.sels = crD.drag.keep.slice();
      cap();
    }
    crDCtx(); crDRender(); return;
  }
  if (t === 'dessin') {
    if (crD.dm === 'text') { crD.drag = { ...base, kind: 'textplace', ps }; cap(); return; }
    if (crD.dm === 'erase') { crD.drag = { ...base, kind: 'erase', pushed: false }; cap(); crDEraseDrag(e); return; }
    crD.drag = crD.dm === 'pen' ? { ...base, kind: 'pen', pts: [p] } : (crD.dm === 'echelle' ? { ...base, kind: 'ladder', a: ps, b: ps } : { ...base, kind: 'zone', a: ps, b: ps });
    cap(); return;
  }
  if (t === 'traj') {
    const el = hitEl ? crDEl(hitEl.dataset.id) : null;
    if (el && el.x1 == null) { crD.sels = [el.id]; crD.drag = { ...base, kind: 'traj', id: el.id, trace: [{ x: el.x, y: el.y }] }; crDRender(); cap(); }
    return;
  }
  if (CR_ACTIONS.includes(t)) {
    const st = (t === 'pass' || t === 'shot' || t === 'mv' || t === 'dribble' || t === 'screen') ? crDMagnet(p, e) : ps, snapped = st !== p;
    crD.drag = { kind: 'draw', start: snapped ? st : ps, sx: e.clientX, sy: e.clientY, cur: snapped ? st : ps };
    cap(); return;
  }
  // placement d'un joueur / objet : présent dans cette image et les suivantes
  try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  crD.penDown = false;
  crDPush();
  const el = { id: crUid(), t, x: ps.x, y: ps.y };
  if (t === 'att' || t === 'def') el.n = crDNextN(t);
  if (t === 'ball') crDSnapBall(el, crDFrame());
  if (crD.cols[t]) el.c = crD.cols[t];
  for (let i = crD.f; i < crD.schema.frames.length; i++) crD.schema.frames[i].els.push(i === crD.f ? el : { ...el });
  crDRefresh();
}
function crDMove(e) {
  if (!crD) return;
  if (crD.ptrs[e.pointerId]) crD.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (crD.pinch) { crDPinchMove(); return; }
  if (e.pointerType === 'pen' && e.buttons > 0) crD.penT = performance.now();
  // Pencil qui survole alors qu'un geste est resté ouvert (relâchement perdu) : on le termine au lieu de traîner l'élément
  if (crD.drag && e.pointerType === 'pen' && e.buttons === 0 && crD.drag.pid === e.pointerId) { crDUp(e); crDHover(e); return; }
  if (!crD.drag) { if (e.pointerType === 'pen' && e.buttons === 0) crDHover(e); return; }
  const d = crD.drag;
  if (d.pid != null && e.pointerId !== d.pid) return;
  if (d.kind === 'pan') {
    const svg = document.querySelector('#cr-d-svgbox svg'), r = svg.getBoundingClientRect(), vb = crDVB();
    const scale = Math.min(r.width / vb[2], r.height / vb[3]);
    crD.cx -= (e.clientX - d.sx) / scale; crD.cy -= (e.clientY - d.sy) / scale; d.sx = e.clientX; d.sy = e.clientY;
    crDRender(); return;
  }
  const p = crDPt(e);
  if (d.kind === 'draw') { const pe = crDPtS(e), t = crD.tool; d.cur = (t === 'pass') ? crDMagnet(pe, e, d.start) : pe; crDRender(); const svg = document.querySelector('#cr-d-svgbox svg'); if (svg) svg.insertAdjacentHTML('beforeend', crArrowSvg({ t: crD.tool, x1: d.start.x, y1: d.start.y, x2: d.cur.x, y2: d.cur.y }, CR_COURT[crD.schema.mode].k, CR_TH.dark)); return; }
  if (d.kind === 'textplace') return;
  if (d.kind === 'erase') { crDEraseDrag(e); return; }
  if (d.kind === 'ladder') {
    d.b = crDPtS(e); crDRender();
    const g = crDLadderGeom(d.a, d.b, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
    crDDrawPrev({ t: 'echelle', x: g.x, y: g.y, L: g.L, a: g.a, n: crD.dn, c: crD.dcol });
    return;
  }
  if (d.kind === 'pen') {
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null, minD = (e.pointerType === 'pen' ? 0.8 : 1.4) * crDUpx();
    (evs && evs.length ? evs : [e]).forEach(ev => { const pp = crDPt(ev), l = d.pts[d.pts.length - 1]; if (d.pts.length < 3000 && Math.hypot(pp.x - l.x, pp.y - l.y) >= minD) { d.pts.push(pp); d.moved = true; } });
    crDRender(); crDDrawPrev({ t: 'pen', x: 0, y: 0, pts: d.pts.map(q => [q.x, q.y]), c: crD.dcol, lt: crD.dlt });
    return;
  }
  if (d.kind === 'zone') {
    d.b = crDPtS(e); crDRender();
    const g = crDZoneGeom(d.a, d.b, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
    crDDrawPrev({ t: 'zone', shape: crD.dm === 'ellipse' ? 'ellipse' : 'rect', x: g.x, y: g.y, w: g.w, h: g.h, f: crD.dfill, lt: crD.dlt, c: crD.dcol });
    return;
  }
  if (d.kind === 'marquee') {
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
    d.moved = true; d.b = p; crDRender();
    const svg = document.querySelector('#cr-d-svgbox svg');
    if (svg) svg.insertAdjacentHTML('beforeend', `<rect x="${Math.min(d.a.x, p.x)}" y="${Math.min(d.a.y, p.y)}" width="${Math.abs(p.x - d.a.x)}" height="${Math.abs(p.y - d.a.y)}" fill="rgba(245,196,0,0.12)" stroke="#F5C400" stroke-width="1.6" stroke-dasharray="5 4" style="pointer-events:none;"/>`);
    return;
  }
  if (d.kind === 'traj') {
    // le stylet envoie plusieurs points entre deux images : on les garde tous pour une courbe fidèle
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null, minD = e.pointerType === 'pen' ? 1.1 : 2;
    (evs && evs.length ? evs : [e]).forEach(ev => { const pp = crDPt(ev), l = d.trace[d.trace.length - 1]; if (Math.hypot(pp.x - l.x, pp.y - l.y) >= minD) { d.trace.push(pp); d.moved = true; } });
    crDRender();
    const svg = document.querySelector('#cr-d-svgbox svg');
    if (svg) svg.insertAdjacentHTML('beforeend', `<polyline points="${d.trace.map(q => q.x + ',' + q.y).join(' ')}" fill="none" stroke="#F5C400" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"/>`);
    return;
  }
  if (!d.moved) {
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < crDDragPx(e)) return;
    d.moved = true;
    if (crD.rec && (d.kind === 'token' || d.kind === 'group')) { crDAddFrame(); crDFramesBar(); d.rec = true; d.p0 = { x: d.last.x, y: d.last.y }; d.trace = [d.p0]; } else crDPush();
  }
  if (d.rec && d.trace) { const l = d.trace[d.trace.length - 1]; if (Math.hypot(p.x - l.x, p.y - l.y) >= 1.5) d.trace.push(p); }
  if (d.kind === 'group') {
    const els = d.ids.map(crDEl).filter(z => z && z.x1 == null), c = CR_COURT[crD.schema.mode];
    let dx = p.x - d.last.x, dy = p.y - d.last.y;
    els.forEach(z => { dx = Math.max(-z.x, Math.min(c.w - z.x, dx)); dy = Math.max(-z.y, Math.min(c.h - z.y, dy)); });
    els.forEach(z => { z.x = Math.round((z.x + dx) * 10) / 10; z.y = Math.round((z.y + dy) * 10) / 10; });
    d.last = { x: d.last.x + dx, y: d.last.y + dy };
    d.ids.forEach(id => crDSyncHeld(crDFrame(), id));
    crDRender(); return;
  }
  const el = crDEl(d.id); if (!el) return;
  const cc = CR_COURT[crD.schema.mode], po = d.off || { x: 0, y: 0 }, cl = (v, m) => Math.max(0, Math.min(m, v));
  const pt = { x: Math.round(cl(crDSn(p.x + po.x), cc.w) * 10) / 10, y: Math.round(cl(crDSn(p.y + po.y), cc.h) * 10) / 10 };
  if (d.kind === 'token') { el.x = pt.x; el.y = pt.y; if (el.t !== 'ball') crDSyncHeld(crDFrame(), el.id); }
  else if (d.kind === 'hl') { const sg = parseFloat(el.s) || 1, dx = pt.x - el.x, dy = pt.y - el.y; el.L = Math.max(4, Math.round(Math.hypot(dx, dy) / sg * 10) / 10); el.a = crSnapAng(Math.atan2(dy, dx) * 180 / Math.PI); }
  else if (d.kind === 'hz') { const sg = parseFloat(el.s) || 1; el.w = Math.max(2, Math.round(Math.abs(pt.x - el.x) / sg * 10) / 10); el.h = Math.max(2, Math.round(Math.abs(pt.y - el.y) / sg * 10) / 10); }
  else if (d.kind === 'h1') { el.x1 = pt.x; el.y1 = pt.y; }
  else if (d.kind === 'h2') { const m = (el.t === 'pass') ? crDMagnet(pt, e, { x: el.x1, y: el.y1 }) : pt; el.x2 = m.x; el.y2 = m.y; }
  else if (d.kind === 'arrow') {
    const c = CR_COURT[crD.schema.mode], dx = p.x - d.last.x, dy = p.y - d.last.y;
    const nx1 = el.x1 + dx, nx2 = el.x2 + dx, ny1 = el.y1 + dy, ny2 = el.y2 + dy;
    if (Math.min(nx1, nx2) >= 0 && Math.max(nx1, nx2) <= c.w && Math.min(ny1, ny2) >= 0 && Math.max(ny1, ny2) <= c.h) { el.x1 = nx1; el.x2 = nx2; el.y1 = ny1; el.y2 = ny2; }
    d.last = p;
  }
  crDRender();
}
function crDUp(e) {
  if (!crD) return;
  delete crD.ptrs[e.pointerId];
  if (e.pointerType === 'pen') { crD.penDown = false; crD.penT = 0; }
  if (crD.pinch) { if (Object.keys(crD.ptrs).length < 2) crD.pinch = null; crD.drag = null; return; }
  if (!crD.drag) return;
  if (crD.drag.pid != null && e.pointerId !== crD.drag.pid) return;
  const d = crD.drag; crD.drag = null;
  if (d.kind === 'draw') {
    if (e.type === 'pointercancel') { crDRefresh(); return; }
    const p = d.cur, dist = Math.hypot(e.clientX - d.sx, e.clientY - d.sy) / 1; // distance en pixels écran : une flèche courte au stylet est possible
    const mk = (a, b) => { crDPush(); const el = { id: crUid(), t: crD.tool, x1: a.x, y1: a.y, x2: b.x, y2: b.y }; crDFrame().els.push(el); crD.pending = null; crD.sels = []; if (crDAnimOn()) { crDArrowAnimate(el); if (crDLegOf(el)) crD.sels = [el.id]; } };
    if (dist > (e.pointerType === 'pen' ? 4 : 9) && Math.hypot(p.x - d.start.x, p.y - d.start.y) > 0.8) mk(d.start, p);
    else if (crD.pending) { if (Math.hypot(p.x - crD.pending.x, p.y - crD.pending.y) > 1.2) mk(crD.pending, p); else crD.pending = null; }
    else crD.pending = d.start;
    crDRefresh(); return;
  }
  if (d.kind === 'textplace') {
    if (e.type === 'pointercancel') return;
    const el = { id: crUid(), t: 'text', x: d.ps.x, y: d.ps.y, txt: (crD.dtxt || 'Texte').slice(0, 40) };
    if (crD.dcol) el.c = crD.dcol;
    crDPush(); crDAddAll(el); crD.tool = 'sel'; crD.sels = [el.id]; crDRefresh(); crD.focusTxt = true; crDFocusTxt(); return;
  }
  if (d.kind === 'erase') { if (d.pushed) crDRefresh(); else crDRender(); return; }
  if (d.kind === 'ladder') { if (e.type === 'pointercancel') { crDRender(); return; } crDLadderDone(d, e); return; }
  if (d.kind === 'pen') { if (e.type === 'pointercancel') { crDRender(); return; } crDPenDone(d); return; }
  if (d.kind === 'zone') { if (e.type === 'pointercancel') { crDRender(); return; } crDZoneDone(d, e); return; }
  if (d.kind === 'marquee') {
    if (d.moved) {
      const x0 = Math.min(d.a.x, d.b.x), x1 = Math.max(d.a.x, d.b.x), y0 = Math.min(d.a.y, d.b.y), y1 = Math.max(d.a.y, d.b.y);
      const inside = crDFrame().els.filter(z => z.x1 == null && z.x >= x0 && z.x <= x1 && z.y >= y0 && z.y <= y1).map(z => z.id);
      crD.sels = d.keep.concat(inside.filter(i => !d.keep.includes(i)));
    }
    crDCtx(); crDRender(); return;
  }
  if (d.kind === 'traj') { crDApplyTraj(d); return; }
  if (d.kind === 'token' && !d.moved) { const z = crDEl(d.id); if (z && z.t === 'text') crD.focusTxt = true; }
  if (d.kind === 'group' && !d.moved && d.toggle) crD.sels = crD.sels.filter(i => i !== d.toggle);
  if (d.moved && (d.kind === 'token' || d.kind === 'group')) {
    (d.kind === 'group' ? d.ids : [d.id]).forEach(id => { const z = crDEl(id); if (z && z.t === 'ball') crDSnapBall(z, crDFrame()); });
    if (d.rec) crDStoreTrace(d);
  }
  if (d.moved && !d.rec && (d.kind === 'token' || d.kind === 'group' || d.kind === 'hz' || d.kind === 'hl')) (d.kind === 'group' ? d.ids : [d.id]).forEach(id => { const z = crDEl(id); if (z && CR_DRAWT.includes(z.t)) crDPropPos(z); });
  if (d.moved) crDFramesBar();
  crDCtx(); crDRender();
  if (crD.focusTxt) crDFocusTxt();
}

// ----- Export / partage de l'animation (GIF, ou PNG s'il n'y a qu'une image) -----
function crSvgMarkup(schema, els, W, H, opts) {
  const c = CR_COURT[schema.mode], th = CR_TH.dark;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${c.vb.join(' ')}" width="${W}" height="${H}"><rect x="${c.vb[0]}" y="${c.vb[1]}" width="${c.vb[2]}" height="${c.vb[3]}" fill="${th.svgBg}"/>${crElsSvg(schema.mode, els, { arrows: !!(opts && opts.arrows), sc: schema.sc })}</svg>`;
}
function crLoadImg(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image')); im.src = src; });
}
function crGifPalette() {
  const cols = [];
  const add = (r, g, b) => { if (cols.length < 256 && !cols.some(c => c[0] === r && c[1] === g && c[2] === b)) cols.push([r, g, b]); };
  Object.values(CR_TH.dark).forEach(v => { if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) add(parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)); });
  add(255, 255, 255); add(0, 0, 0);
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) add(r * 51, g * 51, b * 51);
  while (cols.length < 256) cols.push([0, 0, 0]);
  return cols;
}
function crLzw(idx, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  let size = minCode + 1, next = eoi + 1, cur = 0, bits = 0;
  const out = [];
  const emit = c => { cur |= c << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; } };
  let dict = new Map();
  emit(clear);
  let prefix = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = prefix * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next === 4096) { emit(clear); dict = new Map(); next = eoi + 1; size = minCode + 1; }
    else { if (next >= (1 << size) && size < 12) size++; dict.set(key, next++); }
    prefix = k;
  }
  emit(prefix);
  if (next >= (1 << size) && size < 12) size++;
  emit(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}
function crGifEncode(frames, W, H, pal) {
  const b = [];
  const w16 = v => { b.push(v & 255, (v >> 8) & 255); };
  'GIF89a'.split('').forEach(ch => b.push(ch.charCodeAt(0)));
  w16(W); w16(H); b.push(0xF7, 0, 0);
  pal.forEach(c => b.push(c[0], c[1], c[2]));
  // pas d'extension de boucle : le GIF se joue une fois et reste sur la dernière image
  frames.forEach(f => {
    b.push(0x21, 0xF9, 4, 0x04); w16(f.delay); b.push(0, 0);
    b.push(0x2C); w16(0); w16(0); w16(W); w16(H); b.push(0, 8);
    const data = crLzw(f.idx, 8);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); b.push(n); for (let j = 0; j < n; j++) b.push(data[i + j]); }
    b.push(0);
  });
  b.push(0x3B);
  return new Uint8Array(b);
}
async function crBuildMedia(x) {
  const schema = crNormSchema(JSON.parse(JSON.stringify(x.schema)));
  const c = CR_COURT[schema.mode], W = 360, H = Math.round(W * c.vb[3] / c.vb[2]);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const draw = async (els, arrows, label) => {
    const im = await crLoadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(crSvgMarkup(schema, els, W, H, { arrows })));
    ctx.drawImage(im, 0, 0, W, H);
    ctx.font = 'bold 13px Arial, sans-serif'; ctx.textBaseline = 'top';
    const cap = (x.name || 'Exercice') + (label ? '  ·  ' + label : '');
    ctx.fillStyle = 'rgba(10,22,40,0.85)'; ctx.fillRect(4, 3, ctx.measureText(cap).width + 10, 20);
    ctx.fillStyle = '#F5C400'; ctx.fillText(cap, 9, 6);
    ctx.font = 'bold 10px Arial, sans-serif'; ctx.fillStyle = '#8AA0C0'; ctx.textAlign = 'right';
    ctx.fillText('HBCCS U15', W - 8, H - 14); ctx.textAlign = 'left';
  };
  const n = schema.frames.length;
  if (n < 2) {
    await draw(schema.frames[0].els, true, '');
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    return { blob, type: 'image/png', ext: 'png' };
  }
  const pal = crGifPalette(), lut = new Uint16Array(32768).fill(0xFFFF);
  const near = key => {
    const r = ((key >> 10) & 31) * 8 + 4, g = ((key >> 5) & 31) * 8 + 4, bl = (key & 31) * 8 + 4;
    let best = 0, bd = 1e9;
    for (let i = 0; i < 256; i++) { const p = pal[i], d = (p[0] - r) * (p[0] - r) + (p[1] - g) * (p[1] - g) + (p[2] - bl) * (p[2] - bl); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const grab = () => {
    const d = ctx.getImageData(0, 0, W, H).data, idx = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      let v = lut[key]; if (v === 0xFFFF) { v = near(key); lut[key] = v; }
      idx[j] = v;
    }
    return idx;
  };
  const steps = Math.max(3, Math.min(14, Math.floor(150 / (n - 1))));
  const frames = [];
  for (let i = 0; i < n; i++) {
    await draw(schema.frames[i].els, true, (i + 1) + '/' + n);
    frames.push({ idx: grab(), delay: i === n - 1 ? 200 : 40 });
    if (i < n - 1) {
      for (let s = 1; s <= steps; s++) {
        await draw(crInterp(schema.frames[i], schema.frames[i + 1], s / (steps + 1)), false, '');
        frames.push({ idx: grab(), delay: 7 });
      }
    }
  }
  const bytes = crGifEncode(frames, W, H, pal);
  return { blob: new Blob([bytes], { type: 'image/gif' }), type: 'image/gif', ext: 'gif', bytes, frames: frames.length };
}
let crShareMedia = null;
async function crShareAnim() {
  const x = crCurEx(); if (!crSchemaHas(x)) return;
  const btn = document.getElementById('cr-ex-share');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Création…'; }
  try {
    const m = await crBuildMedia(x);
    const slug = (x.name || 'exercice').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'exercice';
    m.name = slug + '.' + m.ext;
    if (crShareMedia && crShareMedia.url) URL.revokeObjectURL(crShareMedia.url);
    m.url = URL.createObjectURL(m.blob);
    crShareMedia = m;
    document.getElementById('cr-modal-inner').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><h3 style="font-size:17px;color:var(--blanc);">${m.ext === 'gif' ? 'Animation prête' : 'Image prête'}</h3><button type="button" class="cr-btn sm" onclick="crCloseModal()">✕</button></div>
      <img src="${m.url}" alt="${crEsc(x.name)}" style="width:100%;border-radius:10px;display:block;background:#0E1F3D;">
      <div style="font-size:12px;color:var(--gris-texte);margin:8px 0;">${m.ext === 'gif' ? (m.frames + ' vues · ' + Math.round(m.blob.size / 1024) + ' Ko · ') : ''}Envoie-la par WhatsApp, SMS ou mail, ou enregistre-la.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="cr-btn primary" onclick="crDoShare()">📤 Partager</button><button type="button" class="cr-btn" onclick="crDoDownload()">⬇ Enregistrer</button></div>`;
    document.getElementById('cr-modal').classList.add('show');
  } catch (e) {
    alert("Impossible de créer l'animation (" + (e.message || e) + ').');
  }
  if (btn) { btn.disabled = false; btn.textContent = '📤 Partager'; }
}
async function crDoShare() {
  const m = crShareMedia; if (!m) return;
  const file = new File([m.blob], m.name, { type: m.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: m.name }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  crDoDownload();
}
function crDoDownload() {
  const m = crShareMedia; if (!m) return;
  const a = document.createElement('a'); a.href = m.url; a.download = m.name; document.body.appendChild(a); a.click(); a.remove();
}

