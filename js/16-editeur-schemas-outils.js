// Prépa U15 HBCCS — js/16-editeur-schemas-outils.js — dernière modification : version z23 (05/11/2026)
// ----- Outils (barre du bas) -----
// Barre d'outils à plat sur 2 lignes (le plus utile en premier, à gauche). Ce qui ne tient pas dans 2 lignes passe sous « Plus ».
const SCH_TOOL_ORDER = ['PLAYER', 'DEFENDER', 'BALL', 'DISC', 'MOVE', 'PASS', 'SHOT', 'select', 'multi', 'RUN', 'GOALKEEPER', 'SCREEN', 'CONE', 'POLE', 'HOOP', 'HURDLE', 'LADDER', 'POPUP_GOAL', 'ZONE_RECT', 'TEXT', 'ZONE_CIRCLE', 'BALLOON', 'BALL_BOX', 'DUMMY', 'MAT', 'BENCH', 'BOX', 'RECT', '@d06', '@d15', '@att', 'pan', 'PEN', 'ERASER'];
// Ordre effectif des outils : celui choisi dans Réglages (cet appareil), complété par les outils manquants dans l'ordre par défaut
function schToolOrder() {
  const out = [], saved = (typeof dispCfg !== 'undefined' && dispCfg && Array.isArray(dispCfg.toolOrder)) ? dispCfg.toolOrder : [];
  saved.forEach(id => { if (SCH_TOOL_ORDER.includes(id) && !out.includes(id)) out.push(id); });
  SCH_TOOL_ORDER.forEach((id, i) => { if (out.includes(id)) return; const prev = i > 0 ? out.indexOf(SCH_TOOL_ORDER[i - 1]) : -1; if (prev >= 0) out.splice(prev + 1, 0, id); else out.push(id); });
  return out;
}
function schToolLabel(id) {
  if (id[0] === '@') return '⊞ ' + SCH_PRESETS[id.slice(1)].name;
  if (id === 'select') return '☝ Sélection';
  if (id === 'multi') return '⬚ Sélection multiple';
  if (id === 'pan') return '✥ Déplacer la vue';
  let n = id; SCH_GROUPS.forEach(g => g.tools.forEach(t => { if (t[0] === id) n = t[1]; })); return n;
}
// Préférences d'affichage des outils (Réglages, cet appareil) : taille, texte/icône, nombre de lignes, outils masqués (rangés sous « Plus »)
function schToolPrefs() {
  const c = (typeof dispCfg !== 'undefined' && dispCfg) || {};
  return { size: ['s', 'm', 'l'].includes(c.toolSize) ? c.toolSize : 'm', mode: ['both', 'icon', 'text'].includes(c.toolMode) ? c.toolMode : 'both', rows: [1, 2, 3].includes(Number(c.toolRows)) ? Number(c.toolRows) : 2, hidden: Array.isArray(c.toolHidden) ? c.toolHidden : [] };
}
function schEdTools() {
  const S = schEd, box = S.el.querySelector('#sche-tools'), names = {}, P = schToolPrefs();
  SCH_GROUPS.forEach(g => g.tools.forEach(t => { names[t[0]] = t[1]; }));
  const mk = id => id[0] === '@' ? { id, pre: id.slice(1), label: SCH_PRESETS[id.slice(1)].name } : { id, label: names[id] };
  const all = schToolOrder(), vis = all.filter(id => !P.hidden.includes(id)).map(mk), hid = all.filter(id => P.hidden.includes(id)).map(mk);
  const pitch = { s: 54, m: 62, l: 78 }[P.size];
  const side = !!(window.matchMedia && window.matchMedia('(min-width:1100px) and (min-height:560px)').matches); // palette à gauche : tout est visible, on fait défiler
  const cols = side ? Math.max(2, Math.floor(((box.clientWidth || 200) - 20 + 6) / (pitch + 22))) : Math.max(3, Math.floor(((box.clientWidth || window.innerWidth) - 16 + 5) / pitch)), slots = side ? 1e9 : cols * P.rows - (S.sel && S.tool !== 'select' ? 1 : 0);
  let items = vis, more = '';
  if (S.more && (vis.length > slots || hid.length)) { items = vis.concat(hid); more = `<button type="button" class="sche-tool" onclick="schEdMore(false)"><span class="sche-ic">▴</span><span class="sche-lb">Moins</span></button>`; }
  else if (vis.length > slots || hid.length) { items = vis.slice(0, Math.max(1, slots - 1)); more = `<button type="button" class="sche-tool" onclick="schEdMore(true)"><span class="sche-ic">⋯</span><span class="sche-lb">Plus</span></button>`; }
  box.setAttribute('data-size', P.size); box.setAttribute('data-mode', P.mode);
  let h = `<div class="sche-tl" style="grid-template-columns:repeat(${cols},minmax(0,1fr));">`;
  if (S.sel && S.tool !== 'select') h += `<button type="button" class="sche-tool acc" onclick="schEdTool('select')"><span class="sche-ic">✎</span><span class="sche-lb">Options</span></button>`;
  items.forEach(t => {
    if (t.pre) { h += `<button type="button" class="sche-tool pre" onclick="schEdPreset('${t.pre}')"><span class="sche-ic">⊞</span><span class="sche-lb">${t.label}</span></button>`; return; }
    const icon = t.id === 'select' ? '<span class="sche-ic">☝</span>' : t.id === 'multi' ? '<span class="sche-ic">⬚</span>' : t.id === 'pan' ? '<span class="sche-ic">✥</span>' : schToolIcon(t.id);
    h += `<button type="button" class="sche-tool ${S.tool === t.id ? 'on' : ''}" onclick="schEdTool('${t.id}')" aria-label="${schEsc(t.label)}" title="${schEsc(t.label)}${schKeyOf('tool:' + t.id) ? ' (' + schKeyLabel(schKeyOf('tool:' + t.id)) + ')' : ''}">${icon}<span class="sche-lb">${t.label}</span></button>`;
  });
  box.innerHTML = h + more + '</div>';
}
function schEdMore(on) { schEd.more = !!on; schEdTools(); }
function schEdGroup(id) { const g = SCH_GROUPS.find(x => x.id === id); if (!g) return; schEd.group = id; if (id === 'tools') schEd.tool = 'select'; else if (!g.tools.some(t => t[0] === schEd.tool)) schEd.tool = g.tools[0][0]; schEdTools(); schEdPanel(); }
function schEdTool(t) {
  if (t === 'multi' && schEd.tool !== 'multi') { schEdMultiSet(schEd.sel ? [schEd.sel] : schEdMultiIds()); schEd.sel = null; } else if (t !== 'multi') schEdMultiSet([]);
  schEd.tool = t; const g = SCH_GROUPS.find(x => x.tools.some(y => y[0] === t)); if (g) schEd.group = g.id; if (t !== 'select') schEd.drag = null;
  schEdTools(); schEdPanel(); schEdDraw();
}
function schEdPreset(k) {
  const S = schEd, d = schEdD(), P = SCH_PRESETS[k];
  const pv = schViewParse(d.view);
  if (pv.base !== 'half' && pv.base !== 'full') { schEdToast('Placements disponibles sur « ½ terrain » ou « Terrain entier »'); return; }
  schEdPush();
  P.pts.forEach(pt => { const o = { type: P.type, x: pv.base === 'full' ? pt[1] : pt[0], y: pv.base === 'full' ? pt[0] : pt[1], label: schNextLabel(d.elements, P.type), z: Math.max(0, ...d.elements.map(e => e.z)) + 1 };
    if (pv.rot) { const bv = SCH_VIEWS[pv.base]; let w = bv.w, h = bv.h; for (let i = 0; i < pv.rot / 90; i++) { const nx = h - o.y, ny = o.x; o.x = schR(nx, 2); o.y = schR(ny, 2); const t = w; w = h; h = t; } if (P.type === 'DEFENDER') o.rotation = pv.rot; }
    d.elements.push(schNormElement(o)); });
  schEdChanged(true);
}

// ----- Géométrie écran ↔ terrain -----
function schEdMap(vb) { const r = schEd.stage.getBoundingClientRect(), s = Math.min(r.width / vb.w, r.height / vb.h) || 1; return { r, s, ox: (r.width - vb.w * s) / 2, oy: (r.height - vb.h * s) / 2 }; }
function schEdPt(e, vb) { vb = vb || schEd.vb; const m = schEdMap(vb); return { x: vb.x + (e.clientX - m.r.left - m.ox) / m.s, y: vb.y + (e.clientY - m.r.top - m.oy) / m.s, s: m.s }; }
const schSnap = (v, g) => Math.round(v / g) * g;
function schEdClampPt(p) { const v = SCH_VIEWS[schEdD().view]; return { x: Math.max(0, Math.min(v.w, p.x)), y: Math.max(0, Math.min(v.h, p.y)) }; }

// ----- Sélection par toucher -----
function schEdRad(e) {
  if (schIsPlayer(e)) return SCH_PR * (e.scale || 1);
  return ({ HURDLE: 0.85, BALL_BOX: 0.85, POPUP_GOAL: 0.85, BALL: 0.5 }[e.type] || 0.55) * (e.scale || 1);
}
function schEdPos(e, els) { return e.type === 'BALL' ? schBallStart(e, els) : { x: e.x, y: e.y }; }
function schEdHandles(e) {
  if (schIsAction(e)) {
    const P = e.points, n = P.length, m = n === 3 ? schQuadAt(P[0], P[1], P[2], 0.5) : { x: (P[0].x + P[1].x) / 2, y: (P[0].y + P[1].y) / 2 };
    return [{ k: 'pt', i: 0, x: P[0].x, y: P[0].y }, { k: 'pt', i: n - 1, x: P[n - 1].x, y: P[n - 1].y }, { k: 'mid', x: m.x, y: m.y }];
  }
  if (e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE') return [{ k: 'zone', x: e.x + e.w / 2, y: e.y + e.h / 2 }];
  if (SCH_RECTS[e.type]) { const a = (e.rotation || 0) * Math.PI / 180, hw = e.w / 2, hh = e.h / 2; return [{ k: 'rect', x: schR(e.x + hw * Math.cos(a) - hh * Math.sin(a), 3), y: schR(e.y + hw * Math.sin(a) + hh * Math.cos(a), 3) }]; } // coin : tirer pour changer longueur et largeur
  return [];
}
function schDistSeg(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0; return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)); }
// o : { zones, actions } (par défaut oui) ; renvoie { kind:'handle', h } | { kind:'el', e } | null
function schEdHit(pt, o) {
  o = o || {}; const d = schEdD(), els = d.elements, tol = (schEd.touch ? 26 : 12) / pt.s;
  const sel = schEdSel();
  // Poignée de l'élément sélectionné (extrémités d'un tracé, coin d'une zone) : elle n'est prise que si aucun élément n'est plus proche du doigt (sinon, un joueur au départ d'un tracé sélectionné ne pouvait plus être déplacé)
  let hBest = null, hBd = 1e9;
  if (sel && o.handles !== false) { let bd0 = tol * 1.15; schEdHandles(sel).forEach(h => { const dd = Math.hypot(h.x - pt.x, h.y - pt.y); if (dd < bd0) { bd0 = dd; hBest = h; hBd = dd; } }); }
  let best = null, bd = 1e9;
  els.forEach(e => {
    if (schIsAction(e) || e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE' || e.type === 'PEN') return;
    const p = schEdPos(e, els); let dd;
    if (e.type === 'TEXT') { const fs = 0.95 * (e.scale || 1), w = Math.max(1, e.label.length * fs * 0.62); if (Math.abs(p.x - pt.x) <= w / 2 + tol * 0.4 && Math.abs(p.y - pt.y) <= fs / 2 + tol * 0.4) dd = Math.hypot(p.x - pt.x, p.y - pt.y) * 0.5; else return; }
    else if (e.type === 'LADDER') { const a = -(e.rotation || 0) * Math.PI / 180, ux = pt.x - p.x, uy = pt.y - p.y, lx = ux * Math.cos(a) - uy * Math.sin(a), ly = ux * Math.sin(a) + uy * Math.cos(a), s2 = e.scale || 1; if (Math.abs(lx) <= (e.n || 8) * 0.25 * s2 + tol * 0.4 && Math.abs(ly) <= 0.3 * s2 + tol * 0.6) dd = 2; else return; } // derrière les joueurs / ballons posés dessus
    else if (SCH_RECTS[e.type]) { const a = -(e.rotation || 0) * Math.PI / 180, ux = pt.x - p.x, uy = pt.y - p.y, lx = ux * Math.cos(a) - uy * Math.sin(a), ly = ux * Math.sin(a) + uy * Math.cos(a); if (Math.abs(lx) <= e.w / 2 + tol * 0.4 && Math.abs(ly) <= e.h / 2 + tol * 0.6) dd = 2 - Math.min(0.99, (e.z || 0) * 0.001); else return; } // derrière les joueurs ; entre structures, celle du dessus gagne
    else { dd = Math.hypot(p.x - pt.x, p.y - pt.y); if (dd > Math.max(schEdRad(e) + 0.15, tol)) return; }
    if (dd < bd) { bd = dd; best = e; }
  });
  if (hBest && (!best || hBd < bd)) return { kind: 'handle', h: hBest };
  if (best) return { kind: 'el', e: best };
  if (o.actions !== false) {
    let ba = null, bda = tol;
    els.forEach(e => { if (!schIsAction(e)) return; const S = schSample(e.points, 24); let m = 1e9; for (let i = 1; i < S.length; i++) m = Math.min(m, schDistSeg(pt, S[i - 1], S[i])); if (m < bda) { bda = m; ba = e; } });
    if (ba) return { kind: 'el', e: ba };
  }
  if (o.actions !== false) { // trait libre : proche de la ligne
    let bp = null, bdp = tol * 0.8;
    els.forEach(e => { if (e.type !== 'PEN') return; const P = schPenAbs(e); let m = 1e9; for (let i = 1; i < P.length; i++) m = Math.min(m, schDistSeg(pt, P[i - 1], P[i])); if (m < bdp) { bdp = m; bp = e; } });
    if (bp) return { kind: 'el', e: bp };
  }
  if (o.zones !== false) {
    const zs = els.filter(e => e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE').reverse();
    for (const z of zs) { const dx = (pt.x - z.x) / (z.w / 2), dy = (pt.y - z.y) / (z.h / 2); if (z.type === 'ZONE_RECT' ? (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) : (dx * dx + dy * dy <= 1)) return { kind: 'el', e: z }; }
  }
  return null;
}

// ----- Gestes -----
function schEdSelect(id) { schEd.sel = id; if (id) schEdMultiSet([]); schEdTools(); schEdPanel(); schEdDraw(); }
// ----- Sélection multiple -----
function schEdMultiIds() { const S = schEd; if (!S || !S.multi || S.multiK !== S.k) return []; const els = schEdD().elements; return S.multi.filter(id => els.some(e => e.id === id)); }
function schEdMultiSet(ids) { schEd.multi = ids.slice(); schEd.multiK = schEd.k; }
function schEdMultiPts(e, els) { return schIsAction(e) ? e.points : (e.type === 'PEN' ? schPenAbs(e) : [schEdPos(e, els)]); }
function schEdMultiAll() { schEdMultiSet(schEdD().elements.map(e => e.id)); schEdPanel(); schEdDraw(); }
function schEdMultiClear() { schEdMultiSet([]); schEdPanel(); schEdDraw(); }
function schEdMultiDel() {
  const S = schEd, ids = schEdMultiIds(); if (!ids.length) return; schEdPush(); const d = schEdD();
  d.elements = d.elements.filter(x => !ids.includes(x.id));
  d.elements.forEach(x => { ['fromElementId', 'toElementId', 'ballId', 'holderId'].forEach(k => { if (ids.includes(x[k])) delete x[k]; }); });
  schEdMultiSet([]); schEdTools(); schEdChanged(true); schEdToast(ids.length + ' élément' + (ids.length > 1 ? 's supprimés' : ' supprimé'));
}
// Duplique la sélection : liens (joueur ↔ passe ↔ ballon) conservés entre les copies, ou retirés si l'autre bout n'est pas copié ; copies décalées de 1 m et sélectionnées
function schEdMultiDup() {
  const S = schEd, ids = schEdMultiIds(); if (!ids.length) return; schEdPush();
  const d = schEdD(), V = SCH_VIEWS[d.view] || SCH_VIEWS.half, src = d.elements.filter(e => ids.includes(e.id)), map = {}, pairs = [], OFF = 1;
  let x1 = 0, y1 = 0; src.forEach(e => schEdMultiPts(e, d.elements).forEach(p => { x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }));
  const dx = x1 + OFF <= V.w ? OFF : -OFF, dy = y1 + OFF <= V.h ? OFF : -OFF;
  src.forEach(e => { const c = JSON.parse(JSON.stringify(e)); c.id = schUid(); map[e.id] = c.id; pairs.push([e, c]); });
  let z = Math.max(0, ...d.elements.map(x => x.z || 0)); const tmp = d.elements.slice(), out = [];
  pairs.forEach(([e, c]) => {
    c.z = ++z;
    if (schIsAction(e)) { c.points = c.points.map(p => ({ x: schR(p.x + dx, 2), y: schR(p.y + dy, 2) })); ['fromElementId', 'toElementId', 'ballId'].forEach(k => { if (c[k]) { if (map[c[k]]) c[k] = map[c[k]]; else delete c[k]; } }); }
    else if (e.type === 'BALL') { if (e.holderId && e.holderId !== '-' && map[e.holderId]) c.holderId = map[e.holderId]; else { const p0 = schEdPos(e, d.elements); c.holderId = '-'; c.x = schR(p0.x + dx, 2); c.y = schR(p0.y + dy, 2); } }
    else { c.x = schR(e.x + dx, 2); c.y = schR(e.y + dy, 2); if (schIsPlayer(e)) c.label = schNextLabel(tmp, e.type) || e.label; }
    const n = schNormElement(c); tmp.push(n); out.push(n);
  });
  out.forEach(n => d.elements.push(n)); schEdMultiSet(out.map(n => n.id)); schEdChanged(true);
  schEdToast(out.length + ' élément' + (out.length > 1 ? 's dupliqués' : ' dupliqué') + ' (décalés de 1 m) : glisse-les pour les placer');
}
function schEdMultiPanel() {
  const ids = schEdMultiIds(), n = ids.length;
  const b = (fn, lab, cls, dis) => `<button type="button" ${cls ? `class="${cls}"` : ''} ${dis ? 'disabled style="opacity:.35"' : ''} onclick="${fn}">${lab}</button>`;
  return `<div class="sche-ph"><b>${n ? n + ' élément' + (n > 1 ? 's sélectionnés' : ' sélectionné') : 'Sélection multiple'}</b><span class="sche-sp"></span>${b('schEdMultiDup()', 'Dupliquer', '', !n)}${b('schEdMultiDel()', 'Supprimer', 'red', !n)}</div>`
    + `<div class="sche-row sche-wide" style="flex-direction:row;gap:8px;flex-wrap:wrap;">${b('schEdMultiAll()', 'Tout sélectionner', 'sche-all')}${b('schEdMultiClear()', 'Tout désélectionner', 'sche-all', !n)}</div>`
    + `<div class="sche-hint">Touche des éléments pour les ajouter ou les retirer, ou trace un rectangle sur le terrain pour en prendre plusieurs. Glisse un élément sélectionné pour déplacer tout le groupe. Touche le terrain vide pour tout désélectionner. Avec la souris, le clic droit fait la même chose depuis n\'importe quel outil, puis le clic gauche retrouve son rôle habituel (glisser un élément du groupe le déplace en entier).</div>`;
}
function schEdRingSvg(e, els, col, sc) {
  if (e.type === 'PEN') { const b = schPenBox(e), pd = 0.35; return `<rect x="${b.x0 - pd}" y="${b.y0 - pd}" width="${b.x1 - b.x0 + pd * 2}" height="${b.y1 - b.y0 + pd * 2}" rx="0.15" fill="none" stroke="${col}" stroke-width="0.16" stroke-dasharray="0.5 0.3"/>`; }
  if (schIsAction(e)) { const Sm = schSample(e.points, 24); return `<polyline points="${Sm.map(p => p.x + ',' + p.y).join(' ')}" fill="none" stroke="${col}" stroke-opacity="0.55" stroke-width="0.55" stroke-linecap="round" stroke-linejoin="round"/>`; }
  if (e.type === 'ZONE_RECT') return `<rect x="${e.x - e.w / 2}" y="${e.y - e.h / 2}" width="${e.w}" height="${e.h}" fill="none" stroke="${col}" stroke-width="0.16" stroke-dasharray="0.5 0.3"/>`;
  if (e.type === 'ZONE_CIRCLE') return `<ellipse cx="${e.x}" cy="${e.y}" rx="${e.w / 2}" ry="${e.h / 2}" fill="none" stroke="${col}" stroke-width="0.16" stroke-dasharray="0.5 0.3"/>`;
  if (e.type === 'LADDER') { const s2 = e.scale || 1, hw = (e.n || 8) * 0.25 * s2 + 0.25, hh = 0.3 * s2 + 0.25; return `<rect x="${e.x - hw}" y="${e.y - hh}" width="${hw * 2}" height="${hh * 2}" rx="0.15" fill="none" stroke="${col}" stroke-width="0.16" stroke-dasharray="0.5 0.3"${e.rotation ? ` transform="rotate(${e.rotation} ${e.x} ${e.y})"` : ''}/>`; }
  if (SCH_RECTS[e.type]) { const hw = e.w / 2 + 0.25, hh = e.h / 2 + 0.25; return `<rect x="${e.x - hw}" y="${e.y - hh}" width="${hw * 2}" height="${hh * 2}" rx="0.15" fill="none" stroke="${col}" stroke-width="0.16" stroke-dasharray="0.5 0.3"${e.rotation ? ` transform="rotate(${e.rotation} ${e.x} ${e.y})"` : ''}/>`; }
  const p = schEdPos(e, els), r = e.type === 'TEXT' ? Math.max(1, e.label.length * 0.95 * (e.scale || 1) * 0.35) + 0.3 : Math.max(0.9, schEdRad(e) + 0.3);
  return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="none" stroke="${col}" stroke-width="0.16" stroke-dasharray="0.45 0.3"/>`;
}
function schEdDown(e) {
  const S = schEd; if (!S) return;
  if (e.pointerType === 'mouse' && e.button > 0 && e.button !== 2) return;
  const rightBtn = e.pointerType === 'mouse' && e.button === 2; // clic droit : sélection multiple (toucher = ajouter / retirer, glisser = rectangle)
  if (e.pointerType === 'pen') S.penAt = performance.now();
  if (e.pointerType === 'touch' && (((e.width > 45 && e.height > 45) && ![...S.ptrs.values()].some(v => v.ty === 'touch')) || performance.now() - S.penAt < 800)) return; // paume / stylet en cours (un 2e doigt, même large, reste accepté : pinch)
  try { S.stage.setPointerCapture(e.pointerId); } catch (x) {}
  const now0 = performance.now(); let tc = [...S.ptrs.values()].filter(v => v.ty === 'touch').length;
  S.ptrs.forEach((v, k) => { if (now0 - (v.t || 0) > 1500 && (v.ty !== 'touch' || (S.nTouch === undefined || tc > S.nTouch))) { S.ptrs.delete(k); if (v.ty === 'touch') tc--; } }); if (S.ptrs.size < 2) S.pinch = null; // appui jamais relâché (iOS) : on l'oublie, sauf un doigt réellement posé (nombre de doigts lu sur les évènements tactiles)
  S.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: now0, ty: e.pointerType });
  S.touch = e.pointerType !== 'mouse';
  if (document.activeElement && /^(INPUT|SELECT)$/.test(document.activeElement.tagName)) document.activeElement.blur();
  if (S.ptrs.size >= 2) { schEdCancelDrag(); const ps = [...S.ptrs.values()]; S.pinch = { d0: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1, mid0: { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 }, vb0: { ...S.vb } }; S.pinch.m0 = schEdPt({ clientX: S.pinch.mid0.x, clientY: S.pinch.mid0.y }, S.pinch.vb0); return; }
  const pt = schEdPt(e), tool = S.tool, d = schEdD();
  S.down = { id: e.pointerId, cx: e.clientX, cy: e.clientY, moved: false, pt, hit: null };
  // Clic droit : sélection multiple provisoire (l'outil en cours ne change pas). Clic gauche avec un groupe sélectionné : sur un élément du groupe (outil Sélection) on le déplace ; ailleurs le groupe est abandonné et le clic garde son rôle habituel.
  let mtool = rightBtn ? 'multi' : tool;
  if (rightBtn && S.sel) { schEdMultiSet(schEdMultiIds().concat(S.sel)); S.sel = null; schEdTools(); }
  if (!rightBtn && tool !== 'multi' && schEdMultiIds().length) {
    if (tool === 'select') { const h0 = schEdHit(pt, { handles: false }); if (h0 && h0.kind === 'el' && schEdMultiIds().includes(h0.e.id)) mtool = 'multimove'; }
    if (mtool !== 'multimove') { schEdMultiSet([]); schEdPanel(); schEdDraw(); }
  }
  if (tool === 'pan' && mtool !== 'multi') { S.drag = { kind: 'pan', vb0: { ...S.vb } }; return; }
  if (tool === 'PEN' && !rightBtn) { S.sel = null; schEdPanel(); const q0 = { x: Math.round(pt.x * 100) / 100, y: Math.round(pt.y * 100) / 100 }; S.drag = { kind: 'pen', pts: [q0] }; schEdDraw(); return; }
  if (tool === 'ERASER' && !rightBtn) { S.drag = { kind: 'erase', pushed: false, n: 0 }; schEdEraseAt(pt, S.drag, e); return; }
  if (mtool === 'multi' || mtool === 'multimove') {
    const hit = schEdHit(pt, { handles: false }), els0 = d.elements;
    if (hit && hit.kind === 'el') {
      let ids = schEdMultiIds(); const was = ids.includes(hit.e.id); if (!was) { ids = ids.concat(hit.e.id); schEdMultiSet(ids); schEdPanel(); }
      const orig = {}, bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
      ids.forEach(id => { const e = els0.find(x => x.id === id); if (!e) return; orig[id] = schIsAction(e) ? { pts: e.points.map(p => ({ ...p })) } : { p: schEdPos(e, els0), holder: e.holderId }; schEdMultiPts(e, els0).forEach(p => { bb.x0 = Math.min(bb.x0, p.x); bb.y0 = Math.min(bb.y0, p.y); bb.x1 = Math.max(bb.x1, p.x); bb.y1 = Math.max(bb.y1, p.y); }); });
      S.drag = { kind: 'mmove', ids, orig, bb, pt0: pt, snap0: schEdSnapStr(), tapId: mtool === 'multimove' ? null : (was ? hit.e.id : null), single: mtool === 'multimove' ? hit.e.id : null }; schEdDraw(); return;
    }
    S.drag = { kind: 'lasso', p0: pt, p1: pt }; return;
  }
  if (SCH_ACTIONS.includes(tool)) { S.plan = schPlan(d); const q0 = schEdClampPt(pt); S.drag = { kind: 'new', type: tool, p0: q0, p1: q0, pts: [q0] }; return; }
  const hit = tool === 'BALL' ? null : schEdHit(pt, tool === 'select' ? {} : { zones: false, actions: false, handles: false }); // le ballon se pose sur un joueur : pas de sélection
  S.down.hit = hit;
  if (hit && hit.kind === 'handle') { S.drag = { kind: 'handle', h: hit.h, snap0: schEdSnapStr() }; return; }
  if (hit && hit.kind === 'el' && schIsAction(hit.e) && tool === 'select') { // glisser directement sur le tracé : on le courbe
    const e0 = hit.e, Sm = schSample(e0.points, 24); let bi = 0, bd = 1e9; Sm.forEach((q, i) => { const dd = Math.hypot(q.x - pt.x, q.y - pt.y); if (dd < bd) { bd = dd; bi = i; } });
    S.sel = e0.id; schEdTools(); schEdPanel(); schEdDraw();
    S.drag = { kind: 'bend', id: e0.id, t: Math.max(0.2, Math.min(0.8, bi / (Sm.length - 1))), snap0: schEdSnapStr() }; return;
  }
  if (hit && hit.kind === 'el') {
    if (tool !== 'select') { S.tool = 'select'; S.group = 'tools'; }
    S.sel = hit.e.id; schEdTools(); schEdPanel();
    const p = schEdPos(hit.e, d.elements); S.drag = { kind: 'move', id: hit.e.id, off: { x: pt.x - p.x, y: pt.y - p.y }, snap0: schEdSnapStr() }; schEdDraw(); return;
  }
  if (tool === 'select') { S.sel = null; schEdTools(); schEdPanel(); schEdDraw(); S.drag = { kind: 'pan', vb0: { ...S.vb } }; return; }
  S.drag = { kind: 'place' }; // placement au relâchement s'il n'y a pas eu de glissement
}
function schEdCancelDrag() {
  const S = schEd, dr = S.drag;
  if (dr && dr.snap0 && dr.snap0 !== schEdSnapStr()) { S.ex.drawings = schNormDrawings(JSON.parse(dr.snap0)); }
  S.drag = null; S.down = null; schEdDraw();
}
function schEdMove(e) {
  const S = schEd; if (!S) return; const p = S.ptrs.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY; p.t = performance.now();
  if (S.pinch) {
    const ps = [...S.ptrs.values()]; if (ps.length < 2) return;
    const dist = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1, mid = { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 }, base = schEdBaseVb(), pv = S.pinch;
    const z = Math.max(1, Math.min(5, (base.w / pv.vb0.w) * dist / pv.d0)), nw = base.w / z, nh = base.h / z;
    const r = S.stage.getBoundingClientRect(), s2 = Math.min(r.width / nw, r.height / nh) || 1, ox = (r.width - nw * s2) / 2, oy = (r.height - nh * s2) / 2;
    schEdSetVb({ x: pv.m0.x - (mid.x - r.left - ox) / s2, y: pv.m0.y - (mid.y - r.top - oy) / s2, w: nw, h: nh }); return;
  }
  const dn = S.down, dr = S.drag; if (!dn || dn.id !== e.pointerId || !dr) return;
  if (!dn.moved && Math.hypot(e.clientX - dn.cx, e.clientY - dn.cy) > 6) dn.moved = true;
  if (dr.kind === 'pan') { if (!dn.moved) return; const m = schEdMap(dr.vb0); schEdSetVb({ ...dr.vb0, x: dr.vb0.x - (e.clientX - dn.cx) / m.s, y: dr.vb0.y - (e.clientY - dn.cy) / m.s }); return; }
  if (dr.kind === 'pen') {
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null; let add = false;
    (evs && evs.length ? evs : [e]).forEach(ev => { const q = schEdPt(ev), L = dr.pts[dr.pts.length - 1]; if (Math.hypot(q.x - L.x, q.y - L.y) >= 0.07 && dr.pts.length < 900) { dr.pts.push({ x: Math.round(q.x * 100) / 100, y: Math.round(q.y * 100) / 100 }); add = true; } });
    if (add) schEdDraw(); return;
  }
  if (dr.kind === 'erase') { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null; (evs && evs.length ? evs : [e]).forEach(ev => schEdEraseAt(schEdPt(ev), dr, ev)); return; }
  const pt = schEdPt(e), d = schEdD(), els = d.elements;
  if (dr.kind === 'new') { dr.p1 = schEdClampPt(pt); const L = dr.pts[dr.pts.length - 1]; if (Math.hypot(dr.p1.x - L.x, dr.p1.y - L.y) > 0.15) dr.pts.push(dr.p1); schEdDraw(); return; }
  if (!dn.moved) return;
  if (dr.kind === 'lasso') { dr.p1 = pt; schEdDraw(); return; }
  if (dr.kind === 'mmove') {
    const V = SCH_VIEWS[d.view] || SCH_VIEWS.half, bb = dr.bb;
    const dx = Math.max(-bb.x0, Math.min(V.w - bb.x1, schSnap(pt.x - dr.pt0.x, 0.25))), dy = Math.max(-bb.y0, Math.min(V.h - bb.y1, schSnap(pt.y - dr.pt0.y, 0.25)));
    dr.ids.forEach(id => {
      const el = els.find(x => x.id === id), o = dr.orig[id]; if (!el || !o) return;
      if (schIsAction(el)) el.points = o.pts.map(p => ({ x: schR(p.x + dx, 2), y: schR(p.y + dy, 2) }));
      else if (el.type === 'BALL') { if (o.holder && o.holder !== '-' && dr.ids.includes(o.holder)) return; el.holderId = '-'; el.x = schR(o.p.x + dx, 2); el.y = schR(o.p.y + dy, 2); }
      else { el.x = schR(o.p.x + dx, 2); el.y = schR(o.p.y + dy, 2); }
    });
    schEdDraw(); return;
  }
  if (dr.kind === 'move') {
    const el = els.find(x => x.id === dr.id); if (!el) return; const q = schEdClampPt({ x: pt.x - dr.off.x, y: pt.y - dr.off.y });
    if (el.type === 'BALL') { el.holderId = '-'; el.x = schSnap(q.x, 0.25); el.y = schSnap(q.y, 0.25); }
    else if (schIsAction(el)) { if (!dr.orig) dr.orig = el.points.map(a => ({ ...a })); const dx2 = schSnap(q.x, 0.1) - dr.orig[0].x, dy2 = schSnap(q.y, 0.1) - dr.orig[0].y; el.points = dr.orig.map(a => ({ x: schR(a.x + dx2, 2), y: schR(a.y + dy2, 2) })); }
    else if (el.type === 'PEN') { el.x = schR(q.x, 2); el.y = schR(q.y, 2); }
    else { el.x = schSnap(q.x, 0.25); el.y = schSnap(q.y, 0.25); }
    schEdDraw(); return;
  }
  if (dr.kind === 'bend') {
    const el = els.find(x => x.id === dr.id); if (!el) return; const P0 = el.points[0], P1 = el.points[el.points.length - 1], t = dr.t, b = 2 * t * (1 - t), M = schEdClampPt(pt);
    el.points = [P0, { x: schR((M.x - (1 - t) * (1 - t) * P0.x - t * t * P1.x) / b, 2), y: schR((M.y - (1 - t) * (1 - t) * P0.y - t * t * P1.y) / b, 2) }, P1]; schEdDraw(); return;
  }
  if (dr.kind === 'handle') {
    const el = schEdSel(); if (!el) return; const h = dr.h, q = schEdClampPt(pt), g = { x: schSnap(q.x, 0.1), y: schSnap(q.y, 0.1) };
    if (h.k === 'pt') el.points[h.i] = { x: schR(g.x, 2), y: schR(g.y, 2) };
    else if (h.k === 'mid') { const P0 = el.points[0], P1 = el.points[el.points.length - 1]; el.points = [P0, { x: schR(2 * g.x - (P0.x + P1.x) / 2, 2), y: schR(2 * g.y - (P0.y + P1.y) / 2, 2) }, P1]; }
    else if (h.k === 'zone') { el.w = Math.max(1, schR(schSnap(2 * Math.abs(q.x - el.x), 0.5), 1)); el.h = Math.max(1, schR(schSnap(2 * Math.abs(q.y - el.y), 0.5), 1)); }
    else if (h.k === 'rect') { const a = (el.rotation || 0) * Math.PI / 180, ux = q.x - el.x, uy = q.y - el.y; el.w = Math.max(0.25, Math.min(12, schR(schSnap(2 * Math.abs(ux * Math.cos(a) + uy * Math.sin(a)), 0.25), 2))); el.h = Math.max(0.25, Math.min(12, schR(schSnap(2 * Math.abs(-ux * Math.sin(a) + uy * Math.cos(a)), 0.25), 2))); }
    schEdDraw();
  }
}
function schEdSetVb(v) {
  const b = schEdBaseVb(); v.w = Math.min(b.w, v.w); v.h = Math.min(b.h, v.h);
  const cx = Math.max(b.x, Math.min(b.x + b.w, v.x + v.w / 2)), cy = Math.max(b.y, Math.min(b.y + b.h, v.y + v.h / 2));
  schEd.vb = { x: cx - v.w / 2, y: cy - v.h / 2, w: v.w, h: v.h }; schEdDraw();
}
function schEdWheel(e) {
  if (!schEd) return; e.preventDefault();
  const b = schEdBaseVb(), pt = schEdPt(e), f = e.deltaY < 0 ? 1.15 : 1 / 1.15, nw = Math.max(b.w / 5, Math.min(b.w, schEd.vb.w / f)), nh = nw * b.h / b.w;
  const r = schEd.stage.getBoundingClientRect(), s2 = Math.min(r.width / nw, r.height / nh) || 1, ox = (r.width - nw * s2) / 2, oy = (r.height - nh * s2) / 2;
  schEdSetVb({ x: pt.x - (e.clientX - r.left - ox) / s2, y: pt.y - (e.clientY - r.top - oy) / s2, w: nw, h: nh });
}
function schEdUp(e) {
  const S = schEd; if (!S) return; const had = S.ptrs.delete(e.pointerId);
  if (!had) return;
  try { S.stage.releasePointerCapture(e.pointerId); } catch (x) {}
  if (S.pinch) { if (S.ptrs.size < 2) S.pinch = null; S.down = null; S.drag = null; return; }
  const dn = S.down, dr = S.drag; S.down = null; S.drag = null;
  if (!dn || dn.id !== e.pointerId || !dr || e.type === 'pointercancel') { if (dr && dr.snap0 && e.type === 'pointercancel') { S.drag = dr; schEdCancelDrag(); } if (dr && dr.kind === 'lasso') schEdDraw(); return; }
  const d = schEdD(), els = d.elements;
  if (dr.kind === 'pen') { schEdPenDone(dr); return; }
  if (dr.kind === 'erase') { if (dr.n) schEdChanged(true); else schEdDraw(); return; }
  if (dr.kind === 'new') { schEdFinishAction(dr); return; }
  if (dr.kind === 'lasso') {
    if (dn.moved) {
      const a = dr.p0, b = dr.p1, x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y), cur = schEdMultiIds();
      const inside = els.filter(e => schEdMultiPts(e, els).every(p => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1)).map(e => e.id);
      schEdMultiSet(cur.concat(inside.filter(id => !cur.includes(id))));
    } else schEdMultiSet([]);
    schEdPanel(); schEdDraw(); return;
  }
  if (dr.kind === 'mmove') {
    if (!dn.moved) { if (dr.single) { schEdMultiSet([]); S.sel = dr.single; schEdTools(); } else if (dr.tapId) schEdMultiSet(schEdMultiIds().filter(id => id !== dr.tapId)); schEdPanel(); schEdDraw(); return; }
    dr.ids.forEach(id => {
      const el = els.find(x => x.id === id); if (!el) return;
      if (schIsAction(el)) { if (el.fromElementId && !dr.ids.includes(el.fromElementId)) delete el.fromElementId; if (el.toElementId && !dr.ids.includes(el.toElementId)) delete el.toElementId; }
      else if (el.type === 'BALL' && el.holderId === '-') { const h = schNearestPlayer(els, el, 1.8); if (h) { const bo = schBallOff(schBallIdx(el, els)); el.holderId = h.id; el.x = h.x + bo.x; el.y = h.y + bo.y; } }
    });
    if (dr.snap0 !== schEdSnapStr()) { schEdPush(dr.snap0); schEdChanged(true); } else schEdPanel();
    return;
  }
  if (dr.kind === 'place') { if (!dn.moved) schEdPlace(S.tool, schEdPt(e)); return; }
  if (dr.kind === 'move') {
    const el = els.find(x => x.id === dr.id);
    if (el && el.type === 'BALL' && dn.moved) { const h = schNearestPlayer(els, el, 1.8); if (h) { const bo = schBallOff(schBallIdx(el, els)); el.holderId = h.id; el.x = h.x + bo.x; el.y = h.y + bo.y; } }
    if (dr.snap0 !== schEdSnapStr()) { schEdPush(dr.snap0); schEdChanged(true); }
    else if (!dn.moved) { schEdPanel(); }
    return;
  }
  if (dr.kind === 'bend') {
    const el = els.find(x => x.id === dr.id);
    if (el && el.points.length === 3) { const P = el.points, m = { x: (P[0].x + P[2].x) / 2, y: (P[0].y + P[2].y) / 2 }, b = schQuadAt(P[0], P[1], P[2], 0.5); if (Math.hypot(b.x - m.x, b.y - m.y) < 0.15) el.points = [P[0], P[2]]; }
    if (dr.snap0 !== schEdSnapStr()) { schEdPush(dr.snap0); schEdChanged(true); }
    return;
  }
  if (dr.kind === 'handle') {
    const el = schEdSel();
    if (el && schIsAction(el)) {
      const plan = schPlan(d), P = el.points;
      if (P.length === 3) { const m = { x: (P[0].x + P[2].x) / 2, y: (P[0].y + P[2].y) / 2 }, b = schQuadAt(P[0], P[1], P[2], 0.5); if (Math.hypot(b.x - m.x, b.y - m.y) < 0.15) el.points = [P[0], P[2]]; }
      schEdAttach(el, plan, dr.h.k === 'pt' ? dr.h.i : -1);
    }
    if (dr.snap0 !== schEdSnapStr()) { schEdPush(dr.snap0); schEdChanged(true); }
  }
}
// Rattache le début (joueur qui agit) et la fin (receveur d'une passe) d'une action à un joueur proche ; aimante sur sa position de référence
function schEdAttach(a, plan, which) {
  const tol = (schEd.touch ? 26 : 14) / schEdMap(schEd.vb).s, near = (pt, exceptId) => { let best = null, bd = Math.max(1.3, tol); plan.els.forEach(e => { if (!schIsPlayer(e) || e.id === exceptId) return; schPlayerRefs(e, plan).forEach(r => { const dd = Math.hypot(r.x - pt.x, r.y - pt.y); if (dd < bd) { bd = dd; best = { e, r }; } }); }); return best; };
  const P = a.points;
  if (which === 0 || which === 'all') { const h = near(P[0]); if (h) { a.fromElementId = h.e.id; P[0] = { x: schR(h.r.x, 2), y: schR(h.r.y, 2) }; } }
  if ((which === P.length - 1 || which === 'all') && a.type === 'PASS') { const h = near(P[P.length - 1], a.fromElementId); if (h) { a.toElementId = h.e.id; P[P.length - 1] = { x: schR(h.r.x, 2), y: schR(h.r.y, 2) }; } }
}
// Trait dessiné au doigt → droite (2 points) ou courbe de Bézier quadratique (3 points) qui épouse le tracé (moindres carrés, paramétrage par longueur)
function schEdFit(pts, last) {
  const P0 = pts[0], P1 = last || pts[pts.length - 1], dx = P1.x - P0.x, dy = P1.y - P0.y, L = Math.hypot(dx, dy);
  if (pts.length < 3 || L < 0.7) return [P0, P1];
  const S = pts.slice(); if (S[S.length - 1] !== P1) S.push(P1);
  const cum = [0]; for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + Math.hypot(S[i].x - S[i - 1].x, S[i].y - S[i - 1].y));
  const T = cum[cum.length - 1] || 1; let maxDev = 0;
  S.forEach(q => { maxDev = Math.max(maxDev, Math.abs((q.x - P0.x) * dy - (q.y - P0.y) * dx) / L); });
  if (maxDev < 0.55) return [P0, P1]; // trait quasi droit : on garde une droite
  let num = { x: 0, y: 0 }, den = 0;
  S.forEach((q, i) => { const t = cum[i] / T, b = 2 * t * (1 - t), rx = q.x - (1 - t) * (1 - t) * P0.x - t * t * P1.x, ry = q.y - (1 - t) * (1 - t) * P0.y - t * t * P1.y; num.x += b * rx; num.y += b * ry; den += b * b; });
  if (!den) return [P0, P1];
  const C = { x: num.x / den, y: num.y / den };
  return [P0, { x: Math.max(-1, Math.min(41, C.x)), y: Math.max(-1, Math.min(21, C.y)) }, P1];
}
function schEdFinishAction(dr) {
  const S = schEd, d = schEdD(), els = d.elements;
  if (Math.hypot(dr.p1.x - dr.p0.x, dr.p1.y - dr.p0.y) < 0.7) { schEdDraw(); schEdToast('Glisse le doigt pour tracer ' + (dr.type === 'MOVE' ? 'un déplacement' : 'l\'action')); return; }
  schEdPush();
  const fit = schEdFit(dr.pts, dr.p1).map(q => ({ x: schR(schSnap(q.x, 0.1), 2), y: schR(schSnap(q.y, 0.1), 2) }));
  const a = schNormElement({ type: dr.type, x: dr.p0.x, y: dr.p0.y, points: fit, step: schAutoStep(els, dr.type, dr.p0, S.plan || schPlan(d)), z: Math.max(0, ...els.map(e => e.z)) + 1 });
  schEdAttach(a, S.plan || schPlan(d), 'all');
  els.push(a); S.sel = a.id; schEdTools(); schEdChanged(true);
}
// ----- Crayon et gomme -----
function schPenSimplify(P, tol) {
  if (P.length < 3) return P;
  const a = P[0], b = P[P.length - 1]; let dm = 0, ix = 0;
  for (let i = 1; i < P.length - 1; i++) { const d = schDistSeg(P[i], a, b); if (d > dm) { dm = d; ix = i; } }
  if (dm > tol) { const l = schPenSimplify(P.slice(0, ix + 1), tol), r = schPenSimplify(P.slice(ix), tol); return l.slice(0, -1).concat(r); }
  return [a, b];
}
function schEdPenDone(dr) {
  const S = schEd; let P = dr.pts;
  if (P.length < 2) { const q = P[0]; P = [q, { x: q.x + 0.02, y: q.y }]; }
  let tol = 0.04, Q = schPenSimplify(P, tol); while (Q.length > 300 && tol < 1) { tol *= 1.5; Q = schPenSimplify(P, tol); }
  const d = schEdD(), a = Q[0], el = schNormElement({ type: 'PEN', x: a.x, y: a.y, pts: Q.map(q => ({ x: q.x - a.x, y: q.y - a.y })), scale: S.penW || 1, color: S.penCol || undefined, z: Math.max(0, ...d.elements.map(e => e.z)) + 1 });
  schEdPush(); d.elements.push(el); schEdChanged(false);
}
function schEdEraseAt(pt, dr, ev) {
  const S = schEd, d = schEdD(), els = d.elements, tol = ((ev && ev.pointerType === 'pen') ? 12 : 20) / (pt.s || 1);
  const hit = e => {
    if (e.type === 'PEN') { const P = schPenAbs(e); for (let i = 1; i < P.length; i++) if (schDistSeg(pt, P[i - 1], P[i]) <= tol) return true; return false; }
    if (e.type === 'TEXT') { const fs = 0.95 * (e.scale || 1), w = Math.max(1, e.label.length * fs * 0.62); return Math.abs(e.x - pt.x) <= w / 2 + tol * 0.4 && Math.abs(e.y - pt.y) <= fs / 2 + tol * 0.4; }
    return false;
  };
  let gone = els.filter(e => (e.type === 'PEN' || e.type === 'TEXT') && hit(e)).map(e => e.id);
  if (!gone.length) gone = els.filter(e => (e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE') && (() => { const dx = (pt.x - e.x) / (e.w / 2), dy = (pt.y - e.y) / (e.h / 2); return e.type === 'ZONE_RECT' ? (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) : (dx * dx + dy * dy <= 1); })()).map(e => e.id).slice(-1);
  if (!gone.length) return;
  if (!dr.pushed) { schEdPush(); dr.pushed = true; }
  d.elements = els.filter(e => !gone.includes(e.id)); dr.n += gone.length; if (gone.includes(S.sel)) S.sel = null;
  schEdDraw();
}
function schEdPenCol(c) { schEd.penCol = c || null; schEdPanel(); }
function schEdPenW(v) { schEd.penW = Math.max(0.4, Math.min(3, Math.round(((schEd.penW || 1) + v) * 10) / 10)); schEdPanel(); }
function schEdPlace(type, pt) {
  const S = schEd, d = schEdD(), els = d.elements; schEdPush();
  const q = schEdClampPt(pt), o = { type, x: schSnap(q.x, 0.25), y: schSnap(q.y, 0.25), label: schNextLabel(els, type), z: Math.max(0, ...els.map(e => e.z)) + 1 };
  if (type === 'ZONE_RECT' || type === 'ZONE_CIRCLE') { o.w = 4; o.h = 3; }
  if (type === 'TEXT') o.label = 'Texte';
  let el;
  if (type === 'BALL') {
    const nb = els.filter(e => e.type === 'BALL').length; // chaque appui pose un NOUVEAU ballon (4 au plus) ; pour déplacer un ballon, on le fait glisser
    if (nb >= SCH_MAX_BALLS) { schEdToast(SCH_MAX_BALLS + ' ballons maximum par étape'); S.undo.pop(); return; }
    el = schNormElement(o); els.push(el);
    const h = schNearestPlayer(els, el, 1.8), bo = schBallOff(nb); if (h) { el.holderId = h.id; el.x = h.x + bo.x; el.y = h.y + bo.y; } else el.holderId = '-';
    if (nb > 0) schEdToast('Ballon ' + (nb + 1) + ' posé');
  } else { el = schNormElement(o); els.push(el); }
  S.sel = el.id;
  if (type === 'TEXT') { S.tool = 'select'; S.group = 'tools'; }
  schEdTools(); schEdChanged(true);
  if (type === 'TEXT') { const inp = S.el.querySelector('#sche-label'); if (inp) { inp.focus(); inp.select(); } } // ouvre le clavier (dans le geste de relâchement)
}

// ----- Rendu -----
function schEdDraw() {
  const S = schEd; if (!S) return;
  const d = schEdD(), els = d.elements, sc = schEdMap(S.vb).s, f = { els: els.filter(e => !schIsAction(e) && e.type !== 'BALL'), acts: els.filter(schIsAction).map(a => ({ a, badge: true })), balls: [], ghosts: [] };
  const bl = els.filter(e => e.type === 'BALL'); bl.forEach((b, i) => { const st = schBallStart(b, els); f.balls.push({ x: st.x, y: st.y, s: b.scale, i, m: bl.length > 1 }); });
  if (S.drag && S.drag.kind === 'new') f.acts.push({ a: schNormElement({ type: S.drag.type, points: schEdFit(S.drag.pts, S.drag.p1) }), badge: false });
  let ov = '';
  const plan = schPlan(d); (plan.warnings || []).forEach(w => { const a = plan.byId[w.id]; if (a) ov += `<circle cx="${a.points[0].x}" cy="${a.points[0].y}" r="0.95" fill="none" stroke="#E74C3C" stroke-width="0.13" stroke-dasharray="0.35 0.25"/>`; });
  if (S.drag && S.drag.kind === 'pen' && S.drag.pts.length) ov += schPenSvg(S.drag.pts, S.penCol || SCH_COL.stroke, 0.16 * (S.penW || 1));
  const sel = schEdSel();
  if (sel) {
    const HY = '#1F6FEB', hr = 10 / sc;
    if (schIsAction(sel)) { const Sm = schSample(sel.points, 24); ov += `<polyline points="${Sm.map(p => p.x + ',' + p.y).join(' ')}" fill="none" stroke="${HY}" stroke-opacity="0.5" stroke-width="${0.55}" stroke-linecap="round" stroke-linejoin="round"/>`; }
    else if (sel.type === 'ZONE_RECT') ov += `<rect x="${sel.x - sel.w / 2}" y="${sel.y - sel.h / 2}" width="${sel.w}" height="${sel.h}" fill="none" stroke="${HY}" stroke-width="0.16" stroke-dasharray="0.5 0.3"/>`;
    else if (sel.type === 'ZONE_CIRCLE') ov += `<ellipse cx="${sel.x}" cy="${sel.y}" rx="${sel.w / 2}" ry="${sel.h / 2}" fill="none" stroke="${HY}" stroke-width="0.16" stroke-dasharray="0.5 0.3"/>`;
    else if (sel.type === 'LADDER' || SCH_RECTS[sel.type] || sel.type === 'PEN') ov += schEdRingSvg(sel, els, HY, sc);
    else { const p = schEdPos(sel, els), r = sel.type === 'TEXT' ? Math.max(1, sel.label.length * 0.95 * (sel.scale || 1) * 0.35) + 0.3 : Math.max(0.9, schEdRad(sel) + 0.3); ov += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="none" stroke="${HY}" stroke-width="0.16" stroke-dasharray="0.45 0.3"/>`; }
    schEdHandles(sel).forEach(h => { ov += `<circle cx="${h.x}" cy="${h.y}" r="${hr}" fill="${h.k === 'mid' ? HY : 'rgba(255,255,255,0.6)'}" stroke="#14213D" stroke-width="${hr * 0.2}"/>`; });
  }
  if (S.tool === 'multi' || schEdMultiIds().length) {
    const MC = '#00B7FF'; schEdMultiIds().forEach(id => { const e = els.find(x => x.id === id); if (e) ov += schEdRingSvg(e, els, MC, sc); });
    const dl = S.drag; if (dl && dl.kind === 'lasso' && S.down && S.down.moved) ov += `<rect x="${Math.min(dl.p0.x, dl.p1.x)}" y="${Math.min(dl.p0.y, dl.p1.y)}" width="${Math.abs(dl.p1.x - dl.p0.x)}" height="${Math.abs(dl.p1.y - dl.p0.y)}" fill="rgba(0,183,255,0.14)" stroke="${MC}" stroke-width="${2 / sc}" stroke-dasharray="${6 / sc} ${4 / sc}"/>`;
  }
  const vb = S.vb;
  S.stage.innerHTML = `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;display:block;background:transparent;touch-action:none;">${schCourtSvg(d.view)}${schBodySvg(f)}${ov}</svg>`;
}
function schEdWarn() {
  const S = schEd; if (!S) return; const d = schEdD(), plan = schPlan(d), box = S.el.querySelector('#sche-warn'), seen = {}, lines = [];
  plan.warnings.forEach(w => { const o = plan.byId[w.owner], k = w.owner + '|' + w.step; if (seen[k]) return; seen[k] = 1; const wa = plan.byId[w.id], bi = wa && wa.ballId ? plan.balls.findIndex(z => z.id === wa.ballId) + 1 : 0; lines.push(`${schEsc(schPlayerName(o))} n'a pas encore le ballon${bi ? ' ' + bi : ''} à l'action ${w.step}`); });
  const hasBallAct = d.elements.some(e => e.type === 'PASS' || e.type === 'SHOT'), hasBall = d.elements.some(e => e.type === 'BALL');
  let h = '';
  if (lines.length) h = `<span>⚠ ${lines.slice(0, 2).join(' · ')}${lines.length > 2 ? ' · +' + (lines.length - 2) : ''}</span><button type="button" onclick="schEdReorder()">Remettre dans l'ordre logique</button>`;
  else if (hasBallAct && !hasBall) h = `<span>Ajoute un ballon (onglet Objets) pour que les passes et tirs s'animent.</span>`;
  box.innerHTML = h; box.style.display = h ? '' : 'none';
}
function schEdReorder() {
  const d = schEdD(), s0 = schEdSnapStr(), c = schNormDrawing(JSON.parse(JSON.stringify(d))), ch = schReorder(c);
  if (!ch) { schEdToast('Impossible de réordonner : vérifie qui a le ballon au départ'); return; }
  schEdPush(s0); d.elements.forEach(e => { const x = c.elements.find(y => y.id === e.id); if (x && schIsAction(e)) e.step = x.step; }); schEdChanged(true); schEdToast('Numéros remis dans l\'ordre logique');
}

// ----- Panneau d'options -----
function schEdPanel() {
  const S = schEd; if (!S) return; const e = schEdSel(), box = S.el.querySelector('#sche-panel');
  if (S.tool === 'multi' || (!e && schEdMultiIds().length)) { box.style.display = ''; box.innerHTML = schEdMultiPanel(); return; }
  if (S.tool === 'PEN' || S.tool === 'ERASER') {
    box.style.display = '';
    if (S.tool === 'ERASER') { box.innerHTML = `<div class="sche-hint">Passe le doigt (ou le stylet) sur un trait, un texte ou une zone pour l'effacer. Un geste annulé se retrouve avec ↶.</div>`; return; }
    const cur = S.penCol || '';
    box.innerHTML = `<div class="sche-row sche-wide"><span class="sche-lab">Couleur du crayon</span><div class="sche-sws"><button type="button" class="sche-sw auto ${cur ? '' : 'on'}" onclick="schEdPenCol('')" aria-label="Couleur d'origine" title="Couleur d'origine"></button>${SCH_SWATCHES.map(c => `<button type="button" class="sche-sw ${cur === c ? 'on' : ''}" style="background:${c}" onclick="schEdPenCol('${c}')" aria-label="${c}"></button>`).join('')}</div></div>`
      + `<div class="sche-row"><span class="sche-lab">Épaisseur</span><div class="sche-stp"><button type="button" onclick="schEdPenW(-0.2)" aria-label="moins">−</button><b>${schR(S.penW || 1, 1)}×</b><button type="button" onclick="schEdPenW(0.2)" aria-label="plus">+</button></div></div><div class="sche-hint">Dessine à main levée sur le terrain. Pour déplacer ou modifier un trait, choisis « Sélection » puis touche-le.</div>`; return;
  }
  const ballRow = (() => { const dd = schEdD(), bl = dd.elements.filter(x => x.type === 'BALL'); if (e || bl.length < 2) return ''; return `<div class="sche-row"><span class="sche-lab">Ballon joué dans cette étape</span><select class="sche-sel2" onchange="schEdBallPlay(this.value)" aria-label="Ballon joué"><option value="">Tous (automatique)</option>${bl.map((b, i) => `<option value="${b.id}" ${dd.ballPlay === b.id ? 'selected' : ''}>Ballon ${i + 1}</option>`).join('')}</select></div>`; })();
  if (!e || S.tool !== 'select') { box.style.display = ''; box.innerHTML = ballRow + `<div class="sche-hint">${e ? 'Outil actif : touche le terrain pour placer. Touche « Options » (en bas) pour régler l\'élément sélectionné.' : 'Touche un élément du terrain pour régler ses options (couleur, taille, numéro, étape…).'}</div>`; return; }
  const d = schEdD(), players = d.elements.filter(schIsPlayer), isAct = schIsAction(e), isZone = e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE';
  const row = (lab, body) => `<div class="sche-row"><span class="sche-lab">${lab}</span>${body}</div>`;
  const stp = (val, a, b) => `<div class="sche-stp"><button type="button" onclick="${a}" aria-label="moins">−</button><b>${val}</b><button type="button" onclick="${b}" aria-label="plus">+</button></div>`;
  const sel = (prop, cur, list) => `<select class="sche-sel2" onchange="schEdSet('${prop}',this.value)">${list.map(o => `<option value="${schEsc(o[0])}" ${String(cur || '') === String(o[0]) ? 'selected' : ''}>${schEsc(o[1])}</option>`).join('')}</select>`;
  const plist = players.map(p => [p.id, schPlayerName(p)]);
  const ballsAll = d.elements.filter(x => x.type === 'BALL'), ttl = e.type === 'BALL' && ballsAll.length > 1 ? 'Ballon ' + (ballsAll.indexOf(e) + 1) : (SCH_NAMES[e.type] || e.type);
  let h = `<div class="sche-ph"><b>${ttl}</b><span class="sche-sp"></span><button type="button" onclick="schEdDup()">Dupliquer</button><button type="button" class="red" onclick="schEdDel()">Supprimer</button><button type="button" onclick="schEdSelect(null)" aria-label="Fermer le panneau">✕</button></div><div class="sche-grid">`;
  if (e.type === 'TEXT') h += row('Texte', `<input id="sche-label" class="sche-in" maxlength="30" value="${schEsc(e.label)}" oninput="schEdLabel(this.value)" onfocus="schEdTxtFocus()" onchange="schEdTxtDone()" style="-webkit-user-select:text;user-select:text;">`);
  else if (schIsPlayer(e)) {
    h += row('Équipe / rôle', sel('type', e.type, [['PLAYER', 'Attaque'], ['DEFENDER', 'Défense'], ['GOALKEEPER', 'Gardien']].concat(e.type === 'PARENT' || e.type === 'COACH' ? [[e.type, SCH_NAMES[e.type]]] : [])));
    h += row('Numéro', `<input id="sche-label" class="sche-in" maxlength="3" value="${schEsc(e.label)}" placeholder="${e.type === 'GOALKEEPER' ? 'GB' : ''}" oninput="schEdLabel(this.value)" onfocus="schEdTxtFocus()" onchange="schEdTxtDone()" style="-webkit-user-select:text;user-select:text;">`);
  }
  if (schColorable(e.type)) {
    const cur = e.color || '', nm = e.type === 'PLAYER' ? 'les attaquants' : e.type === 'DEFENDER' ? 'les défenseurs' : e.type === 'GOALKEEPER' ? 'les gardiens' : null;
    h += `<div class="sche-row sche-wide"><span class="sche-lab">Couleur</span><div class="sche-sws"><button type="button" class="sche-sw auto ${cur ? '' : 'on'}" onclick="schEdColor('')" aria-label="Couleur d'origine" title="Couleur d'origine"></button>${SCH_SWATCHES.map(c => `<button type="button" class="sche-sw ${cur === c ? 'on' : ''}" style="background:${c}" onclick="schEdColor('${c}')" aria-label="Couleur ${c}"></button>`).join('')}</div></div>`;
    h += `<div class="sche-row sche-wide"><button type="button" class="sche-all" onclick="schEdApplyAll()">${nm ? `Appliquer couleur et taille à ${nm} de l'étape` : `Appliquer la couleur à tous les « ${SCH_NAMES[e.type] || e.type} » de l'étape`}</button></div>`;
  }
  if (isAct) {
    h += row('Étape (n°)', `<div class="sche-stp"><button type="button" onclick="schEdAdd('step',-1,1,30)" aria-label="moins">−</button><input type="number" inputmode="numeric" min="1" max="30" class="sche-in" style="width:64px;text-align:center;padding:0 4px;" value="${e.step}" onchange="schEdStepSet(this.value)" aria-label="Numéro d'étape"><button type="button" onclick="schEdAdd('step',1,1,30)" aria-label="plus">+</button></div>`);
    // passe / tir d'un joueur qui court dans la même étape : le décalage se lit en « moment de sa course » (Début, ¼, ½, ⅔, ⅚, Fin) plutôt qu'en secondes
    let dLab = 'Décalage', dVal = e.delay ? '+' + String(e.delay).replace('.', ',') + ' s' : '0 s';
    if (e.type === 'PASS' || e.type === 'SHOT') {
      const pl = schPlan(d), w = pl.windows[e.id], o = pl.own[e.id], sg = o && w ? (pl.segs[o.id] || []).find(g => g.a.id !== e.id && g.a.step === e.step) : null;
      if (sg) { const pc = Math.max(0, Math.min(100, Math.round((w[0] - sg.t0) / (sg.t1 - sg.t0) * 100))), pt = [[0, 'Début'], [25, '¼'], [50, '½'], [67, '⅔'], [83, '⅚'], [100, 'Fin']].reduce((m, q) => Math.abs(q[0] - pc) < Math.abs(m[0] - pc) ? q : m); dLab = (e.type === 'PASS' ? 'Passe' : 'Tir') + ' part à'; dVal = pt[0] === 0 || pt[0] === 100 ? pt[1] : pt[1] + ' · ' + pc + ' %'; }
    }
    h += row(dLab, stp(dVal, `schEdAdd('delay',-0.25,0,2)`, `schEdAdd('delay',0.25,0,2)`));
    h += row('Part de', sel('fromElementId', e.fromElementId, [['', 'Automatique']].concat(plist)));
    if (ballsAll.length > 1 && (e.type === 'PASS' || e.type === 'SHOT' || e.type === 'RUN')) h += row('Ballon', sel('ballId', e.ballId, [['', 'Automatique (celui du joueur)']].concat(ballsAll.map((b, i) => [b.id, 'Ballon ' + (i + 1)]))));
    if (e.type === 'PASS') h += row('Receveur', sel('toElementId', e.toElementId, [['', 'Automatique']].concat(plist.filter(p => p[0] !== e.fromElementId))));
    h += row('Tracé', `<div class="sche-stp"><button type="button" style="width:auto;padding:0 14px;font-size:14px" onclick="schEdCurve()">${e.points.length === 3 ? 'Redresser' : 'Courber'}</button></div>`);
  }
  if (e.type === 'BALL') h += row('Porteur', sel('holderId', e.holderId, [['', 'Automatique (le plus proche)'], ['-', 'Aucun (au sol)']].concat(plist)));
  if (e.type === 'PEN') h += row('Épaisseur', stp(schR(e.scale, 1) + '×', `schEdAdd('scale',-0.2,0.4,3)`, `schEdAdd('scale',0.2,0.4,3)`));
  if (!isAct && !isZone && e.type !== 'PEN') { if (e.type !== 'BALL' && e.type !== 'CONE' && e.type !== 'DISC' && e.type !== 'POLE' && e.type !== 'BALLOON' && !schIsPlayer(e) || e.type === 'DEFENDER') h += row('Rotation', stp(Math.round(e.rotation) + '°', `schEdAdd('rotation',-15,0,360)`, `schEdAdd('rotation',15,0,360)`)); if (!SCH_RECTS[e.type]) h += row('Taille', stp(schR(e.scale, 1) + '×', `schEdAdd('scale',-0.2,0.4,3)`, `schEdAdd('scale',0.2,0.4,3)`)); }
  if (SCH_RECTS[e.type]) { const fm = v => String(schR(v, 2)).replace('.', ',') + ' m'; h += row('Longueur', stp(fm(e.w), `schEdDim('w',-0.25)`, `schEdDim('w',0.25)`)) + row('Largeur', stp(fm(e.h), `schEdDim('h',-0.25)`, `schEdDim('h',0.25)`)) + row('Sens', `<div class="sche-stp"><button type="button" style="width:auto;padding:0 14px;font-size:14px" onclick="schEdSetRot(0)">↔</button><button type="button" style="width:auto;padding:0 14px;font-size:14px" onclick="schEdSetRot(90)">↕</button></div>`); }
  if (e.type === 'LADDER') h += row('Cases (barreaux)', `<div class="sche-stp"><button type="button" onclick="schEdLadderN(${(e.n || 8) - 1})" aria-label="moins">−</button><input type="number" inputmode="numeric" min="2" max="${SCH_LADDER_MAX}" class="sche-in" style="width:64px;text-align:center;padding:0 4px;" value="${e.n || 8}" onchange="schEdLadderN(this.value)" aria-label="Nombre de cases"><button type="button" onclick="schEdLadderN(${(e.n || 8) + 1})" aria-label="plus">+</button></div>`)
    + row('Sens', `<div class="sche-stp"><button type="button" style="width:auto;padding:0 14px;font-size:14px" onclick="schEdSetRot(0)">↔</button><button type="button" style="width:auto;padding:0 14px;font-size:14px" onclick="schEdSetRot(90)">↕</button></div>`);
  if (isZone) h += row('Taille', stp(e.w + ' × ' + e.h + ' m', `schEdZone(-0.5)`, `schEdZone(0.5)`));
  box.innerHTML = h + '</div>'; box.style.display = '';
}
const SCH_SWATCHES = ['#F5C400', '#E8543A', '#0052B4', '#2ECC71', '#8E5BD9', '#F28C28', '#FFFFFF', '#14213D', '#00B7FF', '#E84393', '#7F8C8D', '#8B5A2B'];
function schEdDim(prop, delta) { const e = schEdSel(); if (!e || !SCH_RECTS[e.type]) return; const v = Math.max(0.25, Math.min(12, schR((e[prop] || SCH_RECTS[e.type][prop]) + delta, 2))); if (v === e[prop]) return; schEdPush(); e[prop] = v; schEdChanged(true); }
function schEdColor(c) { const e = schEdSel(); if (!e || !schColorable(e.type)) return; schEdPush(); if (c) e.color = c; else delete e.color; schEdChanged(true); }
function schEdApplyAll() {
  const e = schEdSel(); if (!e || !schColorable(e.type)) return; schEdPush(); let n = 0;
  schEdD().elements.forEach(x => { if (x.type !== e.type || x === e) return; if (e.color) x.color = e.color; else delete x.color; if (schIsPlayer(e)) x.scale = e.scale; n++; });
  schEdChanged(true); schEdToast(n ? 'Appliqué à ' + n + ' autre' + (n > 1 ? 's' : '') : 'Aucun autre élément de ce type');
}
function schEdLabel(v) { const e = schEdSel(); if (!e) return; e.label = v.slice(0, e.type === 'TEXT' ? 30 : 3); schEdDraw(); schEdTouch(); }
function schEdTxtFocus() { schEd.txtSnap = schEdSnapStr(); }
function schEdTxtDone() { if (schEd.txtSnap && schEd.txtSnap !== schEdSnapStr()) { schEdPush(schEd.txtSnap); schEdBar(); } schEd.txtSnap = null; }
function schEdSet(prop, val) {
  const e = schEdSel(); if (!e) return; schEdPush();
  if (val === '' || val == null) delete e[prop]; else e[prop] = val;
  if (prop === 'type' && val === 'GOALKEEPER' && /^\d$/.test(e.label)) e.label = '';
  schEdChanged(true); schEdBar();
}
function schEdStepSet(v) { const e = schEdSel(); if (!e || !schIsAction(e)) return; v = Math.max(1, Math.min(30, Math.round(+v) || e.step)); if (v === e.step) { schEdPanel(); return; } schEdPush(); e.step = v; schEdChanged(true); }
function schEdAdd(prop, delta, lo, hi) {
  const e = schEdSel(); if (!e) return; schEdPush(); let v = (e[prop] || 0) + delta;
  if (prop === 'rotation') v = (v + 360) % 360; else v = Math.max(lo, Math.min(hi, v));
  e[prop] = prop === 'step' ? Math.round(v) : schR(v, 2); schEdChanged(true); schEdBar();
}
function schEdLadderN(v) { const e = schEdSel(); if (!e || e.type !== 'LADDER') return; v = Math.max(2, Math.min(SCH_LADDER_MAX, Math.round(+v) || e.n || 8)); if (v === (e.n || 8)) { schEdPanel(); return; } schEdPush(); e.n = v; schEdChanged(true); }
function schEdSetRot(a) { const e = schEdSel(); if (!e) return; schEdPush(); e.rotation = a; schEdChanged(true); }
function schEdZone(delta) { const e = schEdSel(); if (!e) return; schEdPush(); e.w = Math.max(1, schR(e.w + delta * 2, 1)); e.h = Math.max(1, schR(e.h + delta * 2, 1)); schEdChanged(true); schEdBar(); }
function schEdCurve() {
  const e = schEdSel(); if (!e || !schIsAction(e)) return; schEdPush(); const P = e.points;
  if (P.length === 3) e.points = [P[0], P[2]]; else { const dx = P[1].x - P[0].x, dy = P[1].y - P[0].y, L = Math.hypot(dx, dy) || 1; e.points = [P[0], { x: schR((P[0].x + P[1].x) / 2 - dy / L * L * 0.3, 2), y: schR((P[0].y + P[1].y) / 2 + dx / L * L * 0.3, 2) }, P[1]]; }
  schEdChanged(true); schEdBar();
}
function schEdDel() {
  const S = schEd, e = schEdSel(); if (!e) return; schEdPush(); const d = schEdD();
  d.elements = d.elements.filter(x => x !== e);
  d.elements.forEach(x => { if (x.fromElementId === e.id) delete x.fromElementId; if (x.toElementId === e.id) delete x.toElementId; if (x.ballId === e.id) delete x.ballId; if (x.holderId === e.id) delete x.holderId; });
  S.sel = null; schEdTools(); schEdChanged(true); schEdBar();
}
function schEdDup() {
  const S = schEd, e = schEdSel(); if (!e) return; schEdPush(); const d = schEdD(), c = JSON.parse(JSON.stringify(e)); c.id = schUid(); c.z = Math.max(0, ...d.elements.map(x => x.z)) + 1;
  if (schIsAction(e)) { c.points = c.points.map(p => ({ x: schR(p.x + 0.8, 2), y: schR(p.y + 0.8, 2) })); delete c.fromElementId; delete c.ballId; } else { c.x = schR(e.x + 0.8, 2); c.y = schR(e.y + 0.8, 2); if (schIsPlayer(e)) c.label = schNextLabel(d.elements, e.type) || e.label; }
  if (e.type === 'BALL') { if (d.elements.filter(x => x.type === 'BALL').length >= SCH_MAX_BALLS) { schEdToast(SCH_MAX_BALLS + ' ballons maximum par étape'); S.undo.pop(); return; } const p0 = schEdPos(e, d.elements); c.holderId = '-'; c.x = schR(p0.x + 0.8, 2); c.y = schR(p0.y + 0.8, 2); }
  const n = schNormElement(c); d.elements.push(n); S.sel = n.id; schEdChanged(true); schEdBar();
}

// ----- Liste d'exercices (démonstration) : nouvel exercice / copie / suppression -----
function schNewEx(kind, theme) {
  schEnsure();
  const r = schRec({ id: schUuid(), name: 'Nouvel exercice', kind, theme, drawings: [schNormDrawing({ title: 'Étape 1', view: 'half' })], dirty: true }); schUserEx.push(r); schRebuild();
  schUserSave(); schUi.ex = schDemo.indexOf(r); schUi.step = 0; schEditorOpen(schUi.ex);
}
// Fenêtre « Nouveau schéma » / « Classer le schéma » : type et thème obligatoires
let schClsCtx = null;
function schNewExAsk() { schClassUi('new', null); }
function schClassUi(mode, ex) {
  schClassClose(); schClsCtx = { mode, ex: ex || null, kind: ex ? ex.kind || '' : '', theme: ex ? ex.theme || '' : '' };
  const o = document.createElement('div'); o.id = 'sch-cls'; o.className = 'sch-cls'; o.addEventListener('pointerdown', ev => { if (ev.target === o) schClassClose(); });
  document.documentElement.appendChild(o); schClassRender();
}
function schClassRender() {
  const o = document.getElementById('sch-cls'), st = schClsCtx; if (!o || !st) return;
  const chip = (on, fn, lab) => `<button type="button" class="sch-cls-chip${on ? ' on' : ''}" onclick="${fn}">${lab}</button>`, ready = !!(st.kind && st.theme);
  o.innerHTML = `<div class="sch-cls-card" role="dialog" aria-label="${st.mode === 'new' ? 'Nouveau schéma' : 'Classer le schéma'}"><div class="sch-cls-t">${st.mode === 'new' ? 'Nouveau schéma' : 'Classer le schéma'}</div><div class="sch-cls-s">Ces deux choix servent aux filtres de la bibliothèque.</div>`
    + `<div class="sch-cls-l">Type de schéma</div><div class="sch-cls-r">${Object.keys(SCH_KINDS).map(k => chip(st.kind === k, `schClassSet('kind','${k}')`, SCH_KINDS[k])).join('')}</div>`
    + `<div class="sch-cls-l">Thème (par poste)</div><div class="sch-cls-r">${Object.keys(SCH_THEMES).map(k => SCH_CUSTOM[k] ? `<span class="sch-cls-cx">${chip(st.theme === k, `schClassSet('theme','${k}')`, schEsc(SCH_THEMES[k]))}${schThemeUsed(k) ? '' : `<button type="button" class="sch-cls-x" aria-label="Supprimer ce thème" onclick="schThemeDel('${k}')">✕</button>`}</span>` : chip(st.theme === k, `schClassSet('theme','${k}')`, SCH_THEMES[k])).join('')}${st.adding ? '' : chip(false, 'schThemeAdd()', '＋ Nouveau thème')}</div>`
    + (st.adding ? `<div class="sch-cls-add"><input id="sch-cls-new" class="sch-cls-in" type="text" maxlength="40" placeholder="Nom du thème (ex. Sortie de balle)" onkeydown="if(event.key==='Enter'){event.preventDefault();schThemeAddGo();}"><button type="button" class="sch-cls-ok" onclick="schThemeAddGo()">Ajouter</button></div>` : '')
    + `<button type="button" class="sch-cls-go" ${ready ? '' : 'disabled'} onclick="schClassGo()">${st.mode === 'new' ? 'Créer le schéma' : 'Enregistrer'}</button>${ready ? '' : '<div class="sch-cls-h">Choisis le type et le thème pour continuer.</div>'}<button type="button" class="sch-cls-c" onclick="schClassClose()">Annuler</button></div>`;
}
function schThemeUsed(k) { return schUserEx.some(x => !x.deleted && x.theme === k) || schDemo.some(x => x.theme === k) || (schEd && schEd.ex && schEd.ex.theme === k); }
function schThemeAdd() { if (!schClsCtx) return; schClsCtx.adding = true; schClassRender(); const i = document.getElementById('sch-cls-new'); if (i) i.focus(); }
function schThemeAddGo() {
  const i = document.getElementById('sch-cls-new'), st = schClsCtx; if (!i || !st) return;
  const label = i.value.replace(/\s+/g, ' ').trim(); if (!label) { i.focus(); return; }
  const low = label.toLowerCase(), have = Object.keys(SCH_THEMES).find(k => SCH_THEMES[k].toLowerCase() === low);
  let key = have;
  if (!key) { key = schThemeKey(label); if (key.length < 3) key = 'x:theme-' + Date.now().toString(36); let n = 2, base = key; while (SCH_THEMES[key]) key = base + '-' + n++; schThemeReg(key, label, true); }
  st.theme = key; st.adding = false; schClassRender();
}
function schThemeDel(k) {
  if (!SCH_CUSTOM[k] || schThemeUsed(k)) return;
  delete SCH_THEMES[k]; delete SCH_THEMES_S[k]; delete SCH_CUSTOM[k]; schThemesSave();
  if (schClsCtx && schClsCtx.theme === k) schClsCtx.theme = '';
  if (schUi.ft === k) schUi.ft = '';
  schClassRender();
}
function schClassSet(k, v) { if (schClsCtx) { schClsCtx[k] = v; schClassRender(); } }
function schClassClose() { const o = document.getElementById('sch-cls'); if (o) o.remove(); schClsCtx = null; }
function schClassGo() {
  const st = schClsCtx; if (!st || !st.kind || !st.theme) return; schClassClose();
  if (st.mode === 'new') { schNewEx(st.kind, st.theme); return; }
  const ex = st.ex; if (!ex) return; ex.kind = st.kind; ex.theme = st.theme;
  if (schEd && schEd.ex === ex) { schEdTouch(); schEdTagUi(); } else { schMarkDirty(ex); schUserSave(); schSyncSoon(); schRenderDemo(); }
}
function schTagText(ex) { return ex && ex.kind && ex.theme ? SCH_KINDS_S[ex.kind] + ' · ' + SCH_THEMES_S[ex.theme] : ''; }
function schEdTagUi() { const b = schEd && schEd.el.querySelector('#sche-tag'); if (!b) return; const t = schTagText(schEd.ex); b.textContent = t ? '🏷 ' + t : '🏷 Classer'; b.classList.toggle('todo', !t); }
function schEditCur() {
  schEnsure(); const ex = schDemo[schUi.ex]; if (!ex) return;
  if (!ex.user) { const r = schRec({ id: schUuid(), name: ('Copie – ' + ex.name).slice(0, 120), drawings: JSON.parse(JSON.stringify(ex.drawings)), dirty: true }); schUserEx.push(r); schRebuild(); schUserSave(); schUi.ex = schDemo.indexOf(r); schUi.step = 0; }
  schEditorOpen(schUi.ex);
}
function schDelCur() {
  const ex = schDemo[schUi.ex]; if (!ex || !ex.user) return;
  if (!confirm('Supprimer « ' + ex.name + ' » ?\nL\'exercice disparaîtra aussi chez les autres coachs.')) return;
  ex.deleted = true; schMarkDirty(ex); schUserSave(); schRebuild(); schUi.ex = 0; schUi.step = 0; schRenderDemo(); schSyncSoon(300);
}

// ----- Liste d'exercices (démonstration + exercices créés sur cet appareil ; Supabase viendra à l'étape 4) -----
function schDemoData() {
  const P = (id, type, x, y, label) => ({ id, type, x, y, label });
  const att = [[1.2, 3.2, '2'], [4.2, 10.8, '3'], [10, 12, '4'], [15.8, 10.8, '5'], [18.8, 3.2, '6'], [10, 7.6, '1']];
  const def = [[1.6, 2.4], [4.4, 5.6], [8.2, 6.9], [11.8, 6.9], [15.6, 5.6], [18.4, 2.4]];
  const base = () => [P('gk', 'GOALKEEPER', 10, 0.9, 'GB')].concat(att.map((a, i) => P('a' + i, 'PLAYER', a[0], a[1], a[2])), def.map((a, i) => P('d' + i, 'DEFENDER', a[0], a[1], String(i + 1))));
  const A = (id, type, pts, step, extra) => Object.assign({ id, type, x: pts[0][0], y: pts[0][1], step, points: pts.map(p => ({ x: p[0], y: p[1] })) }, extra || {});
  const s1 = base().concat([{ id: 'ball', type: 'BALL', x: 10, y: 12, holderId: 'a2' },
    A('p1', 'PASS', [[10.4, 11.6], [15.4, 10.6]], 1, { toElementId: 'a3' }), A('m1', 'MOVE', [[10, 7.6], [13, 6.9]], 1),
    { id: 'z1', type: 'ZONE_CIRCLE', x: 13.3, y: 5.6, w: 4.4, h: 3.4, label: '' }, { id: 't1', type: 'TEXT', x: 5.2, y: 15.5, label: 'Le 3 sert le 5' }]);
  const s2 = base().filter(e => e.id !== 'a3' && e.id !== 'a5').concat([P('a3', 'PLAYER', 15.8, 10.8, '5'), P('a5', 'PLAYER', 13, 6.9, '1'), { id: 'ball', type: 'BALL', x: 16, y: 10, holderId: 'a3' },
    A('r1', 'RUN', [[15.8, 10.8], [15.6, 8.6], [14.4, 8.2]], 1), A('p2', 'PASS', [[14.7, 8.1], [13.4, 7.1]], 2, { toElementId: 'a5' }), A('m2', 'MOVE', [[18.8, 3.2], [16.4, 3.8]], 2, { delay: 0.5 }), A('sc', 'SCREEN', [[8.6, 8.1], [10.4, 7.5]], 1, { fromElementId: 'a2' })]);
  const s3 = base().filter(e => e.id !== 'a5').concat([P('a5', 'PLAYER', 13, 6.9, '1'), { id: 'ball', type: 'BALL', x: 13.8, y: 6.4, holderId: 'a5' }, A('sh', 'SHOT', [[13.4, 6.5], [10.6, 0.5]], 1, { fromElementId: 'a5' }), { id: 'c1', type: 'CONE', x: 10, y: 15 }]);
  return [
    { key: 'demo', kind: 'attaque', theme: 'autre', name: 'Attaque placée vs 0-6 (3 étapes)', drawings: [{ id: 'd1', title: 'Étape 1', view: 'half', elements: s1 }, { id: 'd2', title: 'Étape 2', view: 'half', elements: s2 }, { id: 'd3', title: 'Étape 3', view: 'half', elements: s3 }] },
  ];
}
let schDemo = null, schUi = { ex: 0, step: 0, view: '', ball: true, fk: '', ft: '', q: '', open: false };
try { const f = JSON.parse(localStorage.getItem('sch_filter_v1') || '{}'); if (f && SCH_KINDS[f.fk] || f.fk === '-') schUi.fk = f.fk; if (f && SCH_THEMES[f.ft] || f.ft === '-') schUi.ft = f.ft; } catch (e) {}
function schInit() {
  schEnsure();
  schRenderDemo(); schSyncAll();
}
function schRenderDemo() {
  const box = document.getElementById('sch-demo'); if (!box) return;
  const ex = schDemo[schUi.ex], d0 = ex.drawings[Math.min(schUi.step, ex.drawings.length - 1)], d = schUi.view ? { ...d0, view: schUi.view + (schViewParse(d0.view).rot ? '@' + schViewParse(d0.view).rot : '') } : d0;
  const btn = (on, fn, label) => `<button type="button" class="sch-chip ${on ? 'on' : ''}" onclick="${fn}">${label}</button>`;
  const q = (schUi.q || '').trim().toLowerCase();
  const okE = e => (schUi.fk === '' || (schUi.fk === '-' ? !e.kind : e.kind === schUi.fk)) && (schUi.ft === '' || (schUi.ft === '-' ? !e.theme : e.theme === schUi.ft)) && (!q || String(e.name).toLowerCase().includes(q));
  const shown = schDemo.map((e, i) => [e, i]).filter(([e, i]) => i === schUi.ex || okE(e)); // l'exercice ouvert reste toujours visible
  const opts = (map, cur, all) => `<option value="">${all}</option>` + Object.keys(map).map(k => `<option value="${k}" ${cur === k ? 'selected' : ''}>${schEsc(map[k])}</option>`).join('') + `<option value="-" ${cur === '-' ? 'selected' : ''}>Non classé</option>`;
  const nMatch = schDemo.filter(okE).length;
  const keepQ = document.activeElement && document.activeElement.id === 'sch-q';
  const fold = `<button type="button" class="sch-fold${schUi.open ? ' open' : ''}" aria-expanded="${schUi.open ? 'true' : 'false'}" onclick="schToggleFolder()"><span class="sch-fold-i">${schUi.open ? '📂' : '📁'}</span><span class="sch-fold-t"><span><b>Mes schémas</b> <small>(${schDemo.length})</small></span><span class="sch-fold-c">${schEsc(ex.name)}</span></span><span class="sch-fold-a">${schUi.open ? '▴' : '▾'}</span></button>`;
  box.innerHTML = fold + (!schUi.open ? '' : `<div class="sch-bar sch-filt"><select class="sch-fsel" aria-label="Filtrer par type" onchange="schSetFilter('fk',this.value)">${opts(SCH_KINDS, schUi.fk, 'Tous les types')}</select><select class="sch-fsel" aria-label="Filtrer par thème" onchange="schSetFilter('ft',this.value)">${opts(SCH_THEMES, schUi.ft, 'Tous les thèmes')}</select><input id="sch-q" class="sch-fq" type="search" placeholder="Rechercher…" value="${schEsc(schUi.q || '')}" oninput="schSetQuery(this.value)" aria-label="Rechercher un schéma"><span class="sch-fn">${nMatch} / ${schDemo.length}</span></div>`
    + `<div class="sch-bar"><button type="button" class="sch-play alt" onclick="schNewExAsk()">＋ Nouvel exercice</button></div>`
    + `<div class="sch-grid" id="sch-grid">${shown.map(([e, i]) => { const n = (e.drawings || []).length, tg = schTagText(e); return `<button type="button" class="sch-gc ${i === schUi.ex ? 'on' : ''}" onclick="schSet('ex',${i})"><span class="sch-gt">${n ? schDrawingSvg(e.drawings[0], { showBallStart: false }) : ''}</span><span class="sch-gn">${e.user ? '✎ ' : ''}${schEsc(e.name)}</span><span class="sch-gm">${tg ? `<em>${schEsc(tg)}</em>` : ''}<em>${n} étape${n > 1 ? 's' : ''}</em></span></button>`; }).join('') || '<span>Aucun schéma ne correspond.</span>'}</div>`)
    + (schUi.open ? '' : (ex.drawings.length > 1 ? `<div class="sch-bar">${ex.drawings.map((x, i) => btn(i === schUi.step, `schSet('step',${i})`, schEsc(x.title))).join('')}</div>` : '')
    + `<label class="sch-chk"><input type="checkbox" ${schUi.ball ? 'checked' : ''} onchange="schSet('ball',this.checked)"> Afficher le départ du ballon</label>`
    + `<div class="sch-bar"><span id="sch-sync" class="sch-sync">${schSyncLabel(false)}</span><button type="button" class="sch-chip" onclick="schSyncAll()">↻ Synchroniser</button></div>`
    + `<div class="sch-bar"><button type="button" class="sch-play" onclick="schPlayerOpen(${schUi.ex})">▶ Animer l'enchaînement</button><button type="button" class="sch-play alt" onclick="schShareCur(this)">📤 Partager (GIF)</button><button type="button" class="sch-play alt" onclick="schEditCur()">${ex.user ? '✏️ Modifier' : '✏️ Copier et modifier'}</button><button type="button" class="sch-play alt" onclick="schNewExAsk()">＋ Nouvel exercice</button>${ex.user ? '<button type="button" class="sch-play alt" onclick="schDelCur()">🗑 Supprimer</button>' : ''}</div>`
    + `<div class="sch-svg">${schDrawingSvg(d, { showBallStart: schUi.ball })}</div>`
    + (ex.user ? `<div class="sch-bar"><button type="button" class="sch-chip" onclick="schClassUi('edit', schDemo[schUi.ex])">🏷 ${schTagText(ex) ? 'Type et thème : ' + schEsc(schTagText(ex)) : 'Classer ce schéma (type et thème)'}</button></div>` : ''));
  const L = document.getElementById('sch-list'), on = L && L.querySelector('.sch-chip.on'); if (L && on) L.scrollTop = Math.max(0, on.offsetTop - L.offsetTop - 4);
  if (keepQ) { const qi = document.getElementById('sch-q'); if (qi) { qi.focus(); try { qi.setSelectionRange(qi.value.length, qi.value.length); } catch (e) {} } }
}
function schSet(k, v) { schUi[k] = v; if (k === 'ex') { schUi.step = 0; schUi.open = false; } schRenderDemo(); } // choisir un schéma referme le dossier
function schToggleFolder() { schUi.open = !schUi.open; schRenderDemo(); }
function schSetFilter(k, v) { schUi[k] = v; try { localStorage.setItem('sch_filter_v1', JSON.stringify({ fk: schUi.fk, ft: schUi.ft })); } catch (e) {} schRenderDemo(); }
function schSetQuery(v) { schUi.q = v; schRenderDemo(); }

