// Prépa U15 HBCCS — js/14-schemas-tactiques.js — dernière modification : version z33 (06/11/2026)
// ===================== SCHÉMAS TACTIQUES (module) =====================
// Étape 1 : modèle de données + rendu SVG en lecture seule. Unités : mètres (terrain de handball 40 × 20 m).
// Drawing : { id, title, view:'half'|'full'|'goal'|'free', elements:[Element], updatedAt, validatedAt, variant ('B', 'C'… : variante de l'étape qui précède), ballPlay (id du ballon joué dans l'étape, si plusieurs ballons) }
// Element : { id, type, x, y, rotation, scale, label, team, z, step, fromElementId, points:[{x,y}], w, h, delay, holderId, toElementId, ballId (passe / tir / dribble : quel ballon, si plusieurs), color (couleur choisie, #RRGGBB : joueurs, objets, zones, texte) }
//   - joueurs/objets : x,y = centre ; zones : x,y = centre, w,h = dimensions (m) ; actions : points (2 = droite, 3 = Bézier quadratique, le 2e = point de contrôle)
//   - label : 3 caractères max (30 pour TEXT)
const SCH_PLAYERS = ['PLAYER', 'DEFENDER', 'GOALKEEPER', 'PARENT', 'COACH'];
const SCH_ACTIONS = ['MOVE', 'RUN', 'PASS', 'SHOT', 'SCREEN'];
const SCH_OBJECTS = ['BALL', 'CONE', 'DISC', 'POLE', 'HOOP', 'HURDLE', 'LADDER', 'POPUP_GOAL', 'BALLOON', 'BALL_BOX', 'DUMMY', 'MAT', 'BENCH', 'BOX', 'RECT'];
// Structures rectangulaires (vue de dessus) : w × h en mètres (réglables), couleur d'origine c. MAT et RECT sont posés au sol (dessinés sous les joueurs).
const SCH_RECTS = { DUMMY: { w: 0.9, h: 0.5, c: '#E8543A' }, MAT: { w: 2, h: 1, c: '#2F7DE1' }, BENCH: { w: 2.4, h: 0.4, c: '#B9783E' }, BOX: { w: 1.2, h: 0.8, c: '#F28C28' }, RECT: { w: 2, h: 1, c: '#8FA3BF' } };
const SCH_FLOOR = ['HOOP', 'MAT', 'RECT'];
const SCH_ZONES = ['ZONE_RECT', 'ZONE_CIRCLE', 'TEXT'];
const SCH_TYPES = SCH_PLAYERS.concat(SCH_ACTIONS, SCH_OBJECTS, SCH_ZONES, ['PEN']); // PEN : trait libre (crayon) : pts = points relatifs à (x, y) en m ; scale = épaisseur
const SCH_LADDER_MAX = 20; // nombre de cases maximum d'une échelle de rythme
const SCH_VIEWS = { half: { w: 20, h: 20, name: '½ terrain' }, full: { w: 40, h: 20, name: 'Terrain entier' }, goal: { w: 20, h: 11.5, name: 'Zone de but' }, free: { w: 30, h: 20, name: 'Espace libre' } };
const SCH_VIEW_KEYS = Object.keys(SCH_VIEWS); // les 4 terrains proposés ; chacun existe aussi pivoté de 90° / 180° / 270° (clé « half@90 »…)
SCH_VIEW_KEYS.forEach(k => [90, 180, 270].forEach(a => { const b = SCH_VIEWS[k], sw = a !== 180; SCH_VIEWS[k + '@' + a] = { w: sw ? b.h : b.w, h: sw ? b.w : b.h, name: b.name + ' ↻' + a + '°' }; }));
function schViewParse(v) { const m = /^([a-z]+)@(90|180|270)$/.exec(v || ''); return m ? { base: m[1], rot: +m[2] } : { base: v, rot: 0 }; }
// marges autour du terrain (le côté du but garde sa marge plus large, quel que soit le sens)
function schViewMargins(view, mx, top) { const p = schViewParse(view); let M = { l: mx, t: (p.base === 'half' || p.base === 'goal') ? top : mx, r: mx, b: mx }; for (let i = 0; i < p.rot / 90; i++) M = { t: M.l, r: M.t, b: M.r, l: M.b }; return M; }
const SCH_COL = { floor: '#F4F8FC', zone: '#DCEAF6', line: '#003D7A', ball: '#F2B705', cone: '#F28C28', disc: '#2EAD5B', stroke: '#14213D', att: '#F5C400', attLine: '#0A1628', def: '#E8543A', gk: '#0052B4', shot: '#C0392B', parent: '#8E5BD9', coach: '#2ECC71', hoop: '#2F7DE1', badge: '#14213D', zoneFill: '#2F7DE1' };
const SCH_MAX_BALLS = Infinity; // aucun plafond : autant de ballons que voulu
const SCH_BALL_COLS = [['#F2B705', '#14213D'], ['#2F7DE1', '#FFFFFF'], ['#1FA35C', '#FFFFFF'], ['#8E5BD9', '#FFFFFF'], ['#E8543A', '#FFFFFF'], ['#17A2B8', '#FFFFFF'], ['#E84393', '#FFFFFF'], ['#14213D', '#FFFFFF']]; // [fond, chiffre] du ballon 1 à 8 (au-delà, les couleurs se répètent : le chiffre les distingue)
const SCH_BALL_OFFS = [{ x: 0.85, y: -0.55 }, { x: -0.85, y: -0.55 }, { x: 0.85, y: 0.55 }, { x: -0.85, y: 0.55 }]; // place du ballon porté, selon son numéro (deux ballons chez le même joueur ne se superposent pas)
const SCH_BALL_OFF = SCH_BALL_OFFS[0];
function schBallOff(i) {
  i = i || 0; if (SCH_BALL_OFFS[i]) return SCH_BALL_OFFS[i];
  const a = ((i - 4) * 47 + 20) * Math.PI / 180, r = 1.15 + 0.2 * Math.floor((i - 4) / 8); // au-delà de 4 ballons chez un même joueur : couronne autour de lui
  return { x: Math.round(Math.cos(a) * r * 100) / 100, y: Math.round(Math.sin(a) * r * 100) / 100 };
}
function schBallIdx(ball, els) { let i = 0; for (const e of els) { if (e === ball || e.id === ball.id) return i; if (e.type === 'BALL') i++; } return 0; }
function schBallSvg(x, y, k, opacity, i, multi) {
  const o = opacity != null ? `opacity="${opacity}"` : '';
  if (multi) {
    const r = 0.4 * k, c = SCH_BALL_COLS[(i || 0) % SCH_BALL_COLS.length], lab = (i || 0) + 1;
    return `<g ${o}><circle cx="${x}" cy="${y}" r="${r}" fill="${c[0]}" stroke="${SCH_COL.stroke}" stroke-width="0.08"/><text x="${x}" y="${y + r * (lab > 9 ? 0.36 : 0.46)}" text-anchor="middle" font-size="${r * (lab > 9 ? 1.0 : 1.35)}" font-weight="800" fill="${c[1]}" style="font-family:Arial,sans-serif;pointer-events:none;">${(i || 0) + 1}</text></g>`;
  }
  const r = 0.34 * k;
  return `<g ${o}><circle cx="${x}" cy="${y}" r="${r}" fill="${SCH_COL.ball}" stroke="${SCH_COL.stroke}" stroke-width="0.07"/><path d="M${x - r} ${y} Q${x} ${y - r * 0.55} ${x + r} ${y}" fill="none" stroke="${SCH_COL.stroke}" stroke-width="0.05"/></g>`;
}
const SCH_PR = 0.62; // rayon d'un joueur (m)
// Texte lisible (sombre ou clair) sur une couleur de fond choisie
function schInk(hex, dark, light) { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || ''); if (!m) return dark; const L = 0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16); return L > 150 ? dark : light; }
function schEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function schNum(v, d) { v = +v; return isFinite(v) ? v : d; }
function schR(v, p) { const k = Math.pow(10, p == null ? 2 : p); return Math.round(v * k) / k; }
function schUid() { return 'e' + Math.random().toString(36).slice(2, 9); }
function schIsAction(e) { return SCH_ACTIONS.includes(e.type); }
function schIsPlayer(e) { return SCH_PLAYERS.includes(e.type); }
function schColorable(t) { return !SCH_ACTIONS.includes(t) && t !== 'BALL'; } // tout se colore sauf les tracés et le ballon

// ----- Normalisation (accepte d'anciennes données ou des données incomplètes) -----
function schNormElement(e) {
  e = e && typeof e === 'object' ? e : {};
  const o = { id: e.id || schUid(), type: SCH_TYPES.includes(e.type) ? e.type : 'CONE', x: schNum(e.x, 0), y: schNum(e.y, 0), rotation: schNum(e.rotation, 0), scale: Math.max(0.4, Math.min(3, schNum(e.scale, 1))), label: String(e.label == null ? '' : e.label).slice(0, e.type === 'TEXT' ? 30 : 3), team: e.team || '', z: schNum(e.z, 0), step: Math.max(1, Math.round(schNum(e.step, 1))) };
  if (e.fromElementId) o.fromElementId = e.fromElementId;
  if (SCH_ACTIONS.includes(o.type)) {
    o.points = (Array.isArray(e.points) ? e.points : []).map(p => ({ x: schNum(p && p.x, 0), y: schNum(p && p.y, 0) })).slice(0, 3);
    if (o.points.length < 2) o.points = [{ x: o.x, y: o.y }, { x: o.x + 3, y: o.y }];
    o.delay = Math.max(0, Math.min(2, Math.round(schNum(e.delay, 0) / 0.25) * 0.25));
    if (o.type === 'PASS' && e.toElementId) o.toElementId = e.toElementId;
    if ((o.type === 'PASS' || o.type === 'SHOT' || o.type === 'RUN') && e.ballId) o.ballId = e.ballId;
  }
  if (o.type === 'ZONE_RECT' || o.type === 'ZONE_CIRCLE') { o.w = Math.max(0.5, schNum(e.w, 4)); o.h = Math.max(0.5, schNum(e.h, 3)); }
  if (o.type === 'LADDER') o.n = Math.max(2, Math.min(SCH_LADDER_MAX, Math.round(schNum(e.n, 8))));
  if (o.type === 'PEN') { o.pts = (Array.isArray(e.pts) ? e.pts : []).slice(0, 600).map(q => ({ x: Math.round(schNum(q && q.x, 0) * 100) / 100, y: Math.round(schNum(q && q.y, 0) * 100) / 100 })); if (o.pts.length < 2) o.pts = [{ x: 0, y: 0 }, { x: 0.01, y: 0 }]; o.rotation = 0; }
  if (o.type === 'BALL' && e.holderId) o.holderId = e.holderId;
  if (SCH_RECTS[o.type]) { const D = SCH_RECTS[o.type]; o.w = Math.max(0.25, Math.min(12, schNum(e.w, D.w))); o.h = Math.max(0.25, Math.min(12, schNum(e.h, D.h))); }
  if (schColorable(o.type) && /^#[0-9a-fA-F]{6}$/.test(e.color || '')) o.color = e.color.toUpperCase();
  return o;
}
function schNormDrawing(d) {
  d = d && typeof d === 'object' ? d : {};
  const o = { id: d.id || schUid(), title: d.title || 'Étape 1', view: SCH_VIEWS[d.view] ? d.view : 'half', elements: (Array.isArray(d.elements) ? d.elements : []).map(schNormElement), updatedAt: d.updatedAt || null, validatedAt: d.validatedAt || null };
  if (/^[A-Z]$/.test(d.variant || '')) o.variant = d.variant;
  if (typeof d.ballPlay === 'string' && d.ballPlay) o.ballPlay = d.ballPlay; // ballon joué dans cette étape (identifiant d'un ballon) ; absent = automatique
  return o;
}
function schNormDrawings(arr) { return (Array.isArray(arr) ? arr : []).map(schNormDrawing); }

// ----- Logique de rattachement (joueur d'une action, porteur du ballon, receveur d'une passe) -----
function schDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function schNearestPlayer(els, pt, maxD, exceptId) {
  let best = null, bd = 1e9;
  els.forEach(e => { if (!schIsPlayer(e) || e.id === exceptId) return; const d = schDist(e, pt); if (d < bd) { bd = d; best = e; } });
  return best && bd < maxD ? best : null;
}
function schActionOwner(a, els) {
  if (a.fromElementId) { const f = els.find(e => e.id === a.fromElementId); if (f) return f; }
  return schNearestPlayer(els, a.points[0], 1.8);
}
function schBallHolder(ball, els) {
  if (ball.holderId === '-') return null; // « aucun porteur » : ballon au sol
  if (ball.holderId) { const h = els.find(e => e.id === ball.holderId); if (h) return h; }
  return schNearestPlayer(els, ball, 1.5);
}
// Position de départ du ballon pour l'étape : à côté du porteur s'il y en a un, sinon à sa propre position
function schBallStart(ball, els) {
  const h = schBallHolder(ball, els), o = schBallOff(schBallIdx(ball, els));
  return h ? { x: h.x + o.x, y: h.y + o.y, holder: h } : { x: ball.x, y: ball.y, holder: null };
}

// ----- Géométrie des tracés -----
function schQuadAt(p0, c, p1, t) { const u = 1 - t; return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y }; }
function schSample(points, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n; out.push(points.length === 3 ? schQuadAt(points[0], points[1], points[2], t) : { x: points[0].x + (points[1].x - points[0].x) * t, y: points[0].y + (points[1].y - points[0].y) * t }); }
  return out;
}
function schPathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += schDist(pts[i], pts[i - 1]); return L; }
// Point à la fraction u (0-1) de la longueur du tracé
function schPointAt(points, u) {
  const pts = schSample(points, 40), L = schPathLen(pts); let target = Math.max(0, Math.min(1, u)) * L;
  for (let i = 1; i < pts.length; i++) { const d = schDist(pts[i], pts[i - 1]); if (target <= d || i === pts.length - 1) { const r = d ? Math.min(1, target / d) : 1; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * r, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * r }; } target -= d; }
  return pts[pts.length - 1];
}
function schEndTangent(points) {
  const a = points.length === 3 ? points[1] : points[0], b = points[points.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return { ux: dx / L, uy: dy / L };
}

// ----- Terrain -----
function schView(view) {
  const v = SCH_VIEWS[view] || SCH_VIEWS.half, M = schViewMargins(view, 1.2, 2.4);
  return { W: v.w, H: v.h, vb: [-M.l, -M.t, v.w + M.l + M.r, v.h + M.t + M.b] };
}
function schCourtSvg(view) {
  const pv = schViewParse(view);
  if (pv.rot) { const b = SCH_VIEWS[pv.base] || SCH_VIEWS.half, t = pv.rot === 90 ? `translate(${b.h} 0) rotate(90)` : pv.rot === 180 ? `translate(${b.w} ${b.h}) rotate(180)` : `translate(0 ${b.w}) rotate(270)`; return `<g transform="${t}">${schCourtSvg(pv.base)}</g>`; }
  const C = SCH_COL, v = SCH_VIEWS[view] || SCH_VIEWS.half, lw = 0.13, W = v.w, H = v.h;
  if (view === 'free') {
    let g = ''; for (let x = 5; x < W; x += 5) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`; for (let y = 5; y < H; y += 5) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
    return `<rect x="0" y="0" width="${W}" height="${H}" fill="${C.floor}"/><g stroke="#DDE6F0" stroke-width="0.06">${g}</g><rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#9FB4CF" stroke-width="0.14" stroke-dasharray="0.7 0.5"/>`;
  }
  // moitié de terrain, but en haut (y = 0). 10 unités = 1 m ; poteaux à x = 8,5 et 11,5 ; zone des 6 m (plein), 9 m (pointillés), jet de 7 m, ligne des 4 m du gardien
  const half = (extra) => `<path d="M2.5 0 A6 6 0 0 0 8.5 6 L11.5 6 A6 6 0 0 0 17.5 0 Z" fill="${C.zone}" stroke="${C.line}" stroke-width="${lw}"/><path d="M0 2.96 A9 9 0 0 0 8.5 9 L11.5 9 A9 9 0 0 0 20 2.96" fill="none" stroke="${C.line}" stroke-width="${lw * 0.9}" stroke-dasharray="0.6 0.45"/><line x1="9.5" y1="7" x2="10.5" y2="7" stroke="${C.line}" stroke-width="${lw}"/><line x1="9.8" y1="4" x2="10.2" y2="4" stroke="${C.line}" stroke-width="${lw}"/><rect x="8.5" y="-1" width="3" height="1" fill="#fff" stroke="${C.line}" stroke-width="${lw}"/>`;
  if (view === 'full') {
    const side = `<path d="M0 2.5 A6 6 0 0 1 6 8.5 L6 11.5 A6 6 0 0 1 0 17.5 Z" fill="${C.zone}" stroke="${C.line}" stroke-width="${lw}"/><path d="M2.96 0 A9 9 0 0 1 9 8.5 L9 11.5 A9 9 0 0 1 2.96 20" fill="none" stroke="${C.line}" stroke-width="${lw * 0.9}" stroke-dasharray="0.6 0.45"/><line x1="7" y1="9.5" x2="7" y2="10.5" stroke="${C.line}" stroke-width="${lw}"/><line x1="4" y1="9.8" x2="4" y2="10.2" stroke="${C.line}" stroke-width="${lw}"/><rect x="-1" y="8.5" width="1" height="3" fill="#fff" stroke="${C.line}" stroke-width="${lw}"/>`;
    return `<rect x="0" y="0" width="40" height="20" fill="${C.floor}" stroke="${C.line}" stroke-width="${lw + 0.03}"/><line x1="20" y1="0" x2="20" y2="20" stroke="${C.line}" stroke-width="${lw}"/>${side}<g transform="translate(40 0) scale(-1 1)">${side}</g>`;
  }
  const clip = view === 'goal' ? `<clipPath id="sch-clip-goal"><rect x="-0.2" y="-1.2" width="20.4" height="${H + 1.2}"/></clipPath>` : '';
  const body = `<rect x="0" y="0" width="20" height="${view === 'goal' ? H : 20}" fill="${C.floor}" stroke="${view === 'goal' ? 'none' : C.line}" stroke-width="${lw + 0.03}"/>` + half();
  if (view === 'goal') return clip + `<g clip-path="url(#sch-clip-goal)">${body}</g><line x1="0" y1="0" x2="0" y2="${H}" stroke="${C.line}" stroke-width="${lw + 0.03}"/><line x1="20" y1="0" x2="20" y2="${H}" stroke="${C.line}" stroke-width="${lw + 0.03}"/><line x1="0" y1="${H}" x2="20" y2="${H}" stroke="#9FB4CF" stroke-width="0.14" stroke-dasharray="0.7 0.5"/>`;
  return body;
}

// ----- Éléments -----
// Trait libre : courbe lissée passant par le milieu des segments (points absolus)
function schPenPath(P) {
  const f = v => Math.round(v * 100) / 100;
  if (!P.length) return '';
  if (P.length === 1) return `M${f(P[0].x)} ${f(P[0].y)} l0.01 0`;
  if (P.length === 2) return `M${f(P[0].x)} ${f(P[0].y)} L${f(P[1].x)} ${f(P[1].y)}`;
  let d = `M${f(P[0].x)} ${f(P[0].y)} L${f((P[0].x + P[1].x) / 2)} ${f((P[0].y + P[1].y) / 2)}`;
  for (let i = 1; i < P.length - 1; i++) d += ` Q${f(P[i].x)} ${f(P[i].y)} ${f((P[i].x + P[i + 1].x) / 2)} ${f((P[i].y + P[i + 1].y) / 2)}`;
  return d + ` L${f(P[P.length - 1].x)} ${f(P[P.length - 1].y)}`;
}
function schPenAbs(e) { return (e.pts || []).map(q => ({ x: e.x + q.x, y: e.y + q.y })); }
function schPenBox(e) { const P = schPenAbs(e); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(q => { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }); if (x0 > x1) { x0 = x1 = e.x; y0 = y1 = e.y; } return { x0, y0, x1, y1 }; }
function schPenSvg(P, col, w) { return `<path d="${schPenPath(P)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; }
function schElementSvg(e, k) {
  const C = SCH_COL, x = e.x, y = e.y, s = e.scale || 1, r = SCH_PR * s, tr = e.rotation ? ` transform="rotate(${e.rotation} ${x} ${y})"` : '';
  const txt = (t, col, fs, dy) => t ? `<text x="${x}" y="${y + (dy || 0) + fs * 0.35}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${col}" style="font-family:Arial,sans-serif;pointer-events:none;">${schEsc(t)}</text>` : '';
  switch (e.type) {
    case 'PEN': return schPenSvg(schPenAbs(e), e.color || SCH_COL.stroke, 0.16 * (e.scale || 1));
    case 'PLAYER': { const f = e.color || C.att; return `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" stroke="${C.attLine}" stroke-width="0.12"/>${txt(e.label, schInk(f, C.attLine, '#fff'), r * 1.15)}`; }
    case 'DEFENDER': return `<polygon${tr} points="${x - r * 1.15},${y - r * 0.9} ${x + r * 1.15},${y - r * 0.9} ${x},${y + r * 1.15}" fill="${e.color || C.def}" stroke="${C.attLine}" stroke-width="0.12" stroke-linejoin="round"/>${txt(e.label, schInk(e.color || C.def, C.attLine, '#fff'), r * 0.95, -r * 0.3)}`;
    case 'GOALKEEPER': return `<circle cx="${x}" cy="${y}" r="${r}" fill="${e.color || C.gk}" stroke="${C.att}" stroke-width="0.16"/>${txt(e.label || 'GB', schInk(e.color || C.gk, C.attLine, '#fff'), r * (e.label && e.label.length > 1 ? 0.95 : 0.9))}`;
    case 'PARENT': return `<circle cx="${x}" cy="${y}" r="${r}" fill="${e.color || C.parent}" stroke="${C.attLine}" stroke-width="0.12"/>${txt(e.label || 'P', e.color ? schInk(e.color, C.attLine, '#fff') : '#fff', r)}`;
    case 'COACH': return `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.3}" fill="${e.color || C.coach}" stroke="${C.attLine}" stroke-width="0.12"/>${txt(e.label || 'C', e.color ? schInk(e.color, C.attLine, '#fff') : C.attLine, r)}`;
    case 'BALL': return schBallSvg(x, y, s);
    case 'CONE': return `<polygon points="${x},${y - 0.4 * s} ${x - 0.34 * s},${y + 0.3 * s} ${x + 0.34 * s},${y + 0.3 * s}" fill="${e.color || C.cone}" stroke="${C.stroke}" stroke-width="0.07" stroke-linejoin="round"/>`;
    case 'DISC': return `<circle cx="${x}" cy="${y}" r="${0.28 * s}" fill="${e.color || C.disc}" stroke="${C.stroke}" stroke-width="0.07"/><circle cx="${x}" cy="${y}" r="${0.1 * s}" fill="${C.stroke}"/>`;
    case 'POLE': return `<circle cx="${x}" cy="${y}" r="${0.2 * s}" fill="#fff" stroke="${C.stroke}" stroke-width="0.07"/><circle cx="${x}" cy="${y}" r="${0.08 * s}" fill="${e.color || C.def}"/>`;
    case 'HOOP': return `<circle cx="${x}" cy="${y}" r="${0.5 * s}" fill="${e.color || 'rgba(47,125,225,0.10)'}"${e.color ? ' fill-opacity="0.12"' : ''} stroke="${e.color || C.hoop}" stroke-width="${0.12 * s}"/>`;
    case 'HURDLE': return `<g${tr}><line x1="${x - 0.55 * s}" y1="${y}" x2="${x + 0.55 * s}" y2="${y}" stroke="${e.color || C.cone}" stroke-width="${0.14 * s}" stroke-linecap="round"/><line x1="${x - 0.55 * s}" y1="${y - 0.22 * s}" x2="${x - 0.55 * s}" y2="${y + 0.22 * s}" stroke="${C.stroke}" stroke-width="0.08"/><line x1="${x + 0.55 * s}" y1="${y - 0.22 * s}" x2="${x + 0.55 * s}" y2="${y + 0.22 * s}" stroke="${C.stroke}" stroke-width="0.08"/></g>`;
    case 'LADDER': { // échelle de rythme : 2 montants + (n + 1) barreaux, n cases de 0,5 m × taille ; centrée sur x,y
      const n = Math.max(2, Math.min(SCH_LADDER_MAX, Math.round(e.n || 8))), cl = 0.5 * s, L = n * cl, W = 0.6 * s, x0 = x - L / 2;
      let g = `<rect x="${x0}" y="${y - W / 2}" width="${L}" height="${W}" fill="${e.color || C.cone}" fill-opacity="0.10" stroke="none"/><line x1="${x0}" y1="${y - W / 2}" x2="${x0 + L}" y2="${y - W / 2}"/><line x1="${x0}" y1="${y + W / 2}" x2="${x0 + L}" y2="${y + W / 2}"/>`;
      for (let i = 0; i <= n; i++) { const lx = schR(x0 + i * cl, 3); g += `<line x1="${lx}" y1="${y - W / 2}" x2="${lx}" y2="${y + W / 2}"/>`; }
      return `<g${tr} stroke="${e.color || C.cone}" stroke-width="${Math.max(0.06, 0.09 * s)}" stroke-linecap="round" fill="none">${g}</g>`;
    }
    case 'POPUP_GOAL': { const pc = e.color || C.stroke; return `<g${tr}><rect x="${x - 0.7 * s}" y="${y - 0.4 * s}" width="${1.4 * s}" height="${0.8 * s}" rx="0.1" fill="rgba(255,255,255,0.85)" stroke="${pc}" stroke-width="0.09"/>${e.color ? `<rect x="${x - 0.7 * s}" y="${y - 0.4 * s}" width="${1.4 * s}" height="${0.8 * s}" rx="0.1" fill="${pc}" fill-opacity="0.3" stroke="none"/>` : ''}<line x1="${x - 0.7 * s}" y1="${y}" x2="${x + 0.7 * s}" y2="${y}" stroke="${pc}" stroke-opacity=".4" stroke-width="0.05"/></g>`; }
    case 'BALLOON': return `<circle cx="${x}" cy="${y}" r="${0.4 * s}" fill="${e.color || '#E84393'}" stroke="${C.stroke}" stroke-width="0.07"/><path d="M${x} ${y + 0.4 * s} q0.1 0.35 -0.08 0.7" fill="none" stroke="${C.stroke}" stroke-width="0.05"/>`;
    case 'BALL_BOX': return `<g${tr}><rect x="${x - 0.55 * s}" y="${y - 0.4 * s}" width="${1.1 * s}" height="${0.8 * s}" rx="0.1" fill="${e.color || '#fff'}"${e.color ? ' fill-opacity="0.35"' : ''} stroke="${e.color || C.stroke}" stroke-width="0.09"/>${schBallSvg(x - 0.2 * s, y, 0.7 * s)}${schBallSvg(x + 0.2 * s, y, 0.7 * s)}</g>`;
    case 'ZONE_RECT': { const zc = e.color || C.zoneFill; return `<rect${tr} x="${x - e.w / 2}" y="${y - e.h / 2}" width="${e.w}" height="${e.h}" rx="0.15" fill="${zc}" fill-opacity="0.16" stroke="${zc}" stroke-width="0.12" stroke-dasharray="0.5 0.3"/>`; }
    case 'ZONE_CIRCLE': { const zc = e.color || C.zoneFill; return `<ellipse${tr} cx="${x}" cy="${y}" rx="${e.w / 2}" ry="${e.h / 2}" fill="${zc}" fill-opacity="0.16" stroke="${zc}" stroke-width="0.12" stroke-dasharray="0.5 0.3"/>`; }
    case 'DUMMY': case 'MAT': case 'BENCH': case 'BOX': case 'RECT': { // structures rectangulaires, vues de dessus
      const D = SCH_RECTS[e.type], w = e.w || D.w, h = e.h || D.h, c = e.color || D.c, x0 = x - w / 2, y0 = y - h / 2, m = Math.min(w, h);
      let g;
      if (e.type === 'DUMMY') g = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${schR(m * 0.35, 3)}" fill="${c}" stroke="${C.stroke}" stroke-width="0.08"/><circle cx="${x}" cy="${y}" r="${schR(m * 0.3, 3)}" fill="#fff" fill-opacity="0.45" stroke="${C.stroke}" stroke-opacity="0.5" stroke-width="0.05"/>`;
      else if (e.type === 'MAT') { const i = Math.min(0.15, m * 0.2); g = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="0.12" fill="${c}" fill-opacity="0.9" stroke="${C.stroke}" stroke-width="0.08"/><rect x="${schR(x0 + i, 3)}" y="${schR(y0 + i, 3)}" width="${schR(Math.max(0.05, w - 2 * i), 3)}" height="${schR(Math.max(0.05, h - 2 * i), 3)}" rx="0.06" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="0.05" stroke-dasharray="0.3 0.2"/>`; }
      else if (e.type === 'BENCH') { const lg = Math.min(0.18, w / 4); g = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="0.05" fill="${c}" stroke="${C.stroke}" stroke-width="0.08"/><line x1="${schR(x0 + lg, 3)}" y1="${y0}" x2="${schR(x0 + lg, 3)}" y2="${y0 + h}" stroke="${C.stroke}" stroke-opacity="0.7" stroke-width="0.06"/><line x1="${schR(x0 + w - lg, 3)}" y1="${y0}" x2="${schR(x0 + w - lg, 3)}" y2="${y0 + h}" stroke="${C.stroke}" stroke-opacity="0.7" stroke-width="0.06"/><line x1="${schR(x0 + lg, 3)}" y1="${y}" x2="${schR(x0 + w - lg, 3)}" y2="${y}" stroke="#fff" stroke-opacity="0.5" stroke-width="0.04"/>`; }
      else if (e.type === 'BOX') { const i = Math.min(0.14, m * 0.2); g = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="0.08" fill="${c}" stroke="${C.stroke}" stroke-width="0.08"/><rect x="${schR(x0 + i, 3)}" y="${schR(y0 + i, 3)}" width="${schR(Math.max(0.05, w - 2 * i), 3)}" height="${schR(Math.max(0.05, h - 2 * i), 3)}" rx="0.04" fill="none" stroke="#fff" stroke-opacity="0.65" stroke-width="0.05"/>`; }
      else g = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="0.1" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="0.12"/>`;
      return `<g${tr}>${g}</g>`;
    }
    case 'TEXT': { const fs = 0.95 * s, tc = e.color || C.stroke; return `<text x="${x}" y="${y + fs * 0.35}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${tc}" stroke="${schInk(tc, C.stroke, '#fff')}" stroke-width="${fs * 0.22}" style="paint-order:stroke;font-family:Arial,sans-serif;pointer-events:none;"${e.rotation ? ` transform="rotate(${e.rotation} ${x} ${y})"` : ''}>${schEsc(e.label)}</text>`; }
  }
  return '';
}
function schActionSvg(a, badge) {
  const C = SCH_COL, P = a.points, s = a.scale || 1, col = a.type === 'SHOT' ? C.shot : C.stroke, w = (a.type === 'SHOT' ? 0.11 : 0.07) * s;
  const t = schEndTangent(P), e = P[P.length - 1], px = -t.uy, py = t.ux;
  let g = '';
  if (a.type === 'SCREEN') {
    const bw = 0.4 * s;
    g = `${P.length === 3 ? `<path d="M${P[0].x} ${P[0].y} Q${P[1].x} ${P[1].y} ${e.x} ${e.y}" fill="none"` : `<line x1="${P[0].x}" y1="${P[0].y}" x2="${e.x}" y2="${e.y}"`} stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><line x1="${e.x + px * bw}" y1="${e.y + py * bw}" x2="${e.x - px * bw}" y2="${e.y - py * bw}" stroke="${col}" stroke-width="${w * 1.6}" stroke-linecap="round"/>`;
  } else {
    const hl = 0.6 * s, hw = 0.28 * s, bx = e.x - t.ux * hl, by = e.y - t.uy * hl, end = { x: bx, y: by };
    if (a.type === 'RUN') { // dribble : trait ondulé
      const Q = P.slice(0, P.length - 1).concat([end]), L = schPathLen(schSample(Q, 30)), n = Math.max(6, Math.round(L / 0.24)); let d = `M${P[0].x} ${P[0].y}`;
      for (let i = 1; i <= n; i++) { const q = schPointAt(Q, i / n), q2 = schPointAt(Q, Math.min(1, i / n + 0.01)), dx = q2.x - q.x, dy = q2.y - q.y, l = Math.hypot(dx, dy) || 1, off = Math.sin(i * 1.2) * 0.11 * s * (i === n ? 0 : 1); d += ` L${schR(q.x - dy / l * off)} ${schR(q.y + dx / l * off)}`; }
      g = `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
    } else if (P.length === 3) g = `<path d="M${P[0].x} ${P[0].y} Q${P[1].x} ${P[1].y} ${bx} ${by}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${a.type === 'PASS' ? 'stroke-dasharray="0.4 0.28"' : ''}/>`;
    else g = `<line x1="${P[0].x}" y1="${P[0].y}" x2="${bx}" y2="${by}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${a.type === 'PASS' ? 'stroke-dasharray="0.4 0.28"' : ''}/>`;
    g += `<polygon points="${e.x},${e.y} ${bx + px * hw},${by + py * hw} ${bx - px * hw},${by - py * hw}" fill="${col}"/>`;
  }
  if (badge !== false) { // numéro d'action au milieu du tracé, dans un cercle aussi fin que le trait (+ décalage s'il est non nul)
    const m = schPointAt(P, 0.5), r = 0.45 * Math.max(0.8, s), dl = a.delay || 0;
    g += `<g style="pointer-events:none;"><circle cx="${schR(m.x)}" cy="${schR(m.y)}" r="${r}" fill="#fff" stroke="${col}" stroke-width="${w}"/><text x="${schR(m.x)}" y="${schR(m.y + r * 0.37, 3)}" text-anchor="middle" font-size="${schR(r * 1.2, 3)}" font-weight="800" fill="${col}" style="font-family:Arial,sans-serif;">${schEsc(a.step)}</text>`;
    if (dl > 0) g += `<rect x="${schR(m.x + r + 0.15)}" y="${schR(m.y - 0.28)}" width="1.35" height="0.5" rx="0.2" fill="#fff" stroke="${col}" stroke-width="${w}"/><text x="${schR(m.x + r + 0.15 + 0.675)}" y="${schR(m.y + 0.09, 3)}" text-anchor="middle" font-size="0.36" font-weight="800" fill="${col}" style="font-family:Arial,sans-serif;">+${String(dl).replace('.', ',')} s</text>`;
    g += `</g>`;
  }
  return g;
}
// Rendu : un « cadre » (frame) décrit ce qu'il faut dessiner à un instant donné : { els (hors actions et ballon), acts:[{a, badge}], balls:[{x,y,o,s}], ghosts:[{x,y,o,s}] }
// Chaque élément peut porter _o (opacité 0-1). Ordre d'empilement : zones → cerceaux → actions → joueurs → objets → ballon → texte.
function schBodySvg(f) {
  const sorted = (list) => list.slice().sort((a, b) => a.z - b.z);
  const withO = (e, svg) => e._o != null && e._o < 1 ? `<g opacity="${schR(Math.max(0, e._o), 2)}">${svg}</g>` : svg;
  const els = f.els;
  let body = '';
  sorted(els.filter(e => e.type === 'ZONE_RECT' || e.type === 'ZONE_CIRCLE')).forEach(e => { body += withO(e, schElementSvg(e)); });
  sorted(els.filter(e => SCH_FLOOR.includes(e.type))).forEach(e => { body += withO(e, schElementSvg(e)); });
  f.acts.forEach(x => { body += schActionSvg(x.a, x.badge); });
  sorted(f.pghosts || []).forEach(e => { body += withO(e, schElementSvg(e)); });
  sorted(els.filter(schIsPlayer)).forEach(e => { body += withO(e, schElementSvg(e)); });
  sorted(els.filter(e => SCH_OBJECTS.includes(e.type) && !SCH_FLOOR.includes(e.type))).forEach(e => { body += withO(e, schElementSvg(e)); });
  f.ghosts.forEach(g => { body += schBallSvg(g.x, g.y, g.s || 1, schR(0.3 * (g.o == null ? 1 : g.o), 2), g.i, g.m); });
  f.balls.forEach(b => { body += schBallSvg(b.x, b.y, b.s || 1, b.o != null && b.o < 1 ? schR(b.o, 2) : null, b.i, b.m); });
  sorted(els.filter(e => e.type === 'PEN')).forEach(e => { body += withO(e, schElementSvg(e)); });
  sorted(els.filter(e => e.type === 'TEXT')).forEach(e => { body += withO(e, schElementSvg(e)); });
  return body;
}
// Rendu complet d'un schéma fixe. o : { showBallStart (filigrane, défaut true), hideBall, hideActions }
function schDrawingSvg(d, o) {
  o = o || {}; d = schNormDrawing(d);
  const vw = schView(d.view), els = d.elements, balls = els.filter(e => e.type === 'BALL');
  const f = { els: els.filter(e => !schIsAction(e) && e.type !== 'BALL'), acts: o.hideActions ? [] : els.filter(schIsAction).map(a => ({ a, badge: true })), balls: [], ghosts: [] };
  balls.forEach((b, i) => { const st = schBallStart(b, els), m = balls.length > 1; if (o.showBallStart !== false) f.ghosts.push({ x: st.x, y: st.y, s: b.scale, i, m }); if (!o.hideBall) f.balls.push({ x: st.x, y: st.y, s: b.scale, i, m }); });
  return `<svg viewBox="${vw.vb.join(' ')}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;border-radius:10px;background:#fff;touch-action:manipulation;">${schCourtSvg(d.view)}${schBodySvg(f)}</svg>`;
}

// ===================== ANIMATION =====================
// Chronologie : les actions sont regroupées par numéro d'étape (step) croissant. Un groupe dure 1,4 s + son plus grand décalage ; chaque action démarre à (début du groupe + son décalage) et dure 1,2 s.
// Tout est calculé à partir du temps seul (aucun état cumulé) : la barre de position (seek) donne donc exactement le même résultat qu'une lecture normale.
const SCH_DUR = 1.2, SCH_GAP = 1.4, SCH_EMPTY = 0.6, SCH_TRANS = 0.9;
function schEase(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function schGroups(d) {
  const acts = d.elements.filter(schIsAction), steps = [...new Set(acts.map(a => a.step))].sort((a, b) => a - b);
  let start = 0;
  const groups = steps.map(s => { const list = acts.filter(a => a.step === s), md = Math.max(0, ...list.map(a => a.delay || 0)), g = { step: s, start, actions: list, dur: SCH_GAP + md }; start += g.dur; return g; });
  return { groups, total: start };
}
// Position d'un joueur sur sa suite de déplacements (segs triés par t0) ; fondu entre sa position réelle et le début du tracé pour éviter tout saut
function schPosOn(base, segs, t) {
  let pos = { x: base.x, y: base.y };
  for (const s of segs) {
    if (t < s.t0) break;
    const P = s.pts, end = P[P.length - 1];
    if (t >= s.t1) { pos = { x: end.x, y: end.y }; continue; }
    const u = schEase((t - s.t0) / (s.t1 - s.t0)), q = schPointAt(P, u);
    return { x: q.x + (pos.x - P[0].x) * (1 - u), y: q.y + (pos.y - P[0].y) * (1 - u) };
  }
  return pos;
}
// Plan d'un schéma : mouvements des joueurs, trajets de CHAQUE ballon (4 au plus), fenêtres de temps de chaque action, incohérences
function schPlan(d0) {
  const d = schNormDrawing(d0), els = d.elements, byId = {}; els.forEach(e => { byId[e.id] = e; });
  const gr = schGroups(d), sched = [];
  gr.groups.forEach(g => g.actions.forEach(a => sched.push({ a, ts: g.start + (a.delay || 0), step: a.step, idx: els.indexOf(a) })));
  sched.sort((p, q) => p.ts - q.ts || p.step - q.step || p.idx - q.idx);
  const isMove = a => a.type === 'MOVE' || a.type === 'RUN' || a.type === 'SCREEN', isBall = a => a.type === 'PASS' || a.type === 'SHOT' || a.type === 'RUN';
  const players = els.filter(schIsPlayer), pre = {}, own = {};
  // pré-passe : à qui appartient chaque action ? (fromElementId, sinon joueur le plus proche du départ du tracé, à sa position du moment ou de départ)
  const nearestAt = (pt, t) => { let best = null, bd = 1.8; players.forEach(e => { const q = schPosOn(e, pre[e.id] || [], t), dd = Math.min(Math.hypot(q.x - pt.x, q.y - pt.y), Math.hypot(e.x - pt.x, e.y - pt.y)); if (dd < bd) { bd = dd; best = e; } }); return best; };
  sched.forEach(s => {
    const a = s.a, f = a.fromElementId && byId[a.fromElementId];
    const o = f && schIsPlayer(f) ? f : nearestAt(a.points[0], s.ts); own[a.id] = o;
    if (isMove(a) && o) (pre[o.id] = pre[o.id] || []).push({ t0: s.ts, t1: s.ts + SCH_DUR, pts: a.points });
  });
  // un état de possession PAR ballon : porteur (ou position au sol) et instant à partir duquel il peut être rejoué
  const bs = els.filter(e => e.type === 'BALL').slice(0, SCH_MAX_BALLS).map((b, i) => {
    const st = schBallStart(b, els), g = st.holder ? null : { x: st.x, y: st.y };
    return { el: b, id: b.id, i, poss: st.holder ? st.holder.id : null, ground: g, tAvail: 0, init: { poss: st.holder ? st.holder.id : null, ground: g } };
  });
  const segs = {}, events = [], windows = {}, warnings = [], ballOf = {};
  let maxEnd = 0;
  const addSeg = (id, t0, a) => { (segs[id] = segs[id] || []).push({ t0, t1: t0 + SCH_DUR, pts: a.points, a }); windows[a.id] = [t0, t0 + SCH_DUR]; maxEnd = Math.max(maxEnd, t0 + SCH_DUR); };
  // quel ballon cette action déplace-t-elle ? celui qui est choisi à la main, sinon celui que tient son joueur
  const bp = d.ballPlay && bs.some(q => q.id === d.ballPlay) ? d.ballPlay : null; // ballon joué dans l'étape : celui des passes / tirs / dribbles sans ballon choisi
  const ballFor = (a, o) => { const bid = a.ballId || bp; if (bid) { const z = bs.find(q => q.id === bid); if (z) return z; } return o ? (bs.find(q => q.poss === o.id) || null) : null; };
  sched.forEach(s => {
    const a = s.a; let o = own[a.id], t0 = s.ts;
    const win = (w0) => { windows[a.id] = [w0, w0 + SCH_DUR]; maxEnd = Math.max(maxEnd, w0 + SCH_DUR); };
    // une action de ballon sans joueur imposé revient au porteur s'il est près de son départ (même s'il s'est déplacé entre-temps)
    if (bs.length && isBall(a) && !a.fromElementId) {
      const cands = (a.ballId || bp) ? bs.filter(q => q.id === (a.ballId || bp)) : bs;
      if (!(o && cands.some(q => q.poss === o.id))) {
        for (const q of cands) { if (!q.poss) continue; const pe = byId[q.poss], pp = schPosOn(pe, segs[q.poss] || [], t0), P0 = a.points[0]; if (Math.min(Math.hypot(pp.x - P0.x, pp.y - P0.y), Math.hypot(pe.x - P0.x, pe.y - P0.y)) < 1.8) { o = pe; break; } }
      }
    }
    if (a.type === 'MOVE' || a.type === 'SCREEN') { if (o) addSeg(o.id, t0, a); else win(t0); return; }
    if (a.type === 'RUN') {
      if (o) { const z = ballFor(a, o); if (bs.length && z && z.poss === o.id) { t0 = Math.max(t0, z.tAvail); ballOf[a.id] = z.id; } else if (bs.length) warnings.push({ id: a.id, owner: o.id, step: a.step }); addSeg(o.id, t0, a); } else win(t0);
      return;
    }
    // PASS / SHOT : n'est jouée que si son joueur a le ballon ; sinon la passe est signalée et le ballon ne bouge pas (pas de passe fantôme)
    if (!bs.length || !o) { win(t0); return; }
    const z = ballFor(a, o);
    if (!z || z.poss !== o.id) { warnings.push({ id: a.id, owner: o.id, step: a.step }); win(t0); return; }
    ballOf[a.id] = z.id;
    t0 = Math.max(t0, z.tAvail); win(t0);
    const t1 = t0 + SCH_DUR, endPt = a.points[a.points.length - 1];
    if (a.type === 'SHOT') { events.push({ type: 'SHOT', t0, t1, a, from: o.id, end: { x: endPt.x, y: endPt.y }, ball: z.id }); z.poss = null; z.ground = { x: endPt.x, y: endPt.y }; z.tAvail = t1; return; }
    let to = a.toElementId && byId[a.toElementId] && schIsPlayer(byId[a.toElementId]) ? a.toElementId : null;
    if (!to) { // receveur : joueur le plus proche de la fin de la passe, à sa position au moment de l'arrivée
      let best = null, bd = 2.0;
      players.forEach(e => { if (e.id === o.id) return; const q = schPosOn(e, pre[e.id] || [], t1), dd = Math.hypot(q.x - endPt.x, q.y - endPt.y); if (dd < bd) { bd = dd; best = e.id; } });
      to = best;
    }
    events.push({ type: 'PASS', t0, t1, a, from: o.id, to, end: { x: endPt.x, y: endPt.y }, ball: z.id });
    z.poss = to; z.ground = to ? null : { x: endPt.x, y: endPt.y }; z.tAvail = t1;
  });
  Object.keys(segs).forEach(id => segs[id].sort((p, q) => p.t0 - q.t0));
  const D = Math.max(gr.total || SCH_EMPTY, maxEnd + 0.2);
  const balls = bs.map(z => ({ el: z.el, id: z.id, i: z.i, init: z.init, fin: { poss: z.poss, ground: z.ground } }));
  // ball / fin / init : premier ballon (compatibilité)
  return { d, els, byId, segs, pre, own, events, windows, warnings, D, balls, ballOf, ball: balls[0] ? balls[0].el : undefined, fin: balls[0] ? balls[0].fin : { poss: null, ground: null }, init: balls[0] ? balls[0].init : null };
}
function schPlanState(p, tau) {
  const pos = {};
  p.els.forEach(e => { if (!schIsAction(e)) pos[e.id] = (schIsPlayer(e) ? schPosOn(e, p.segs[e.id] || [], tau) : { x: e.x, y: e.y }); });
  const heldAt = (id, t, i) => { const q = schPosOn(p.byId[id], p.segs[id] || [], t), o = schBallOff(i); return { x: q.x + o.x, y: q.y + o.y }; };
  const bpos = {};
  p.balls.forEach(b => {
    let cur = { poss: b.init.poss, ground: b.init.ground }, done = false;
    for (const ev of p.events) {
      if (ev.ball !== b.id) continue;
      if (tau < ev.t0) break;
      if (tau < ev.t1) {
        const u = schEase((tau - ev.t0) / (ev.t1 - ev.t0)), q = schPointAt(ev.a.points, u), P0 = ev.a.points[0], PE = ev.a.points[ev.a.points.length - 1];
        const S = cur.poss ? heldAt(cur.poss, ev.t0, b.i) : { x: P0.x, y: P0.y };
        const T = (ev.type === 'PASS' && ev.to) ? heldAt(ev.to, ev.t1, b.i) : { x: PE.x, y: PE.y };
        bpos[b.id] = { x: q.x + (S.x - P0.x) * (1 - u) + (T.x - PE.x) * u, y: q.y + (S.y - P0.y) * (1 - u) + (T.y - PE.y) * u };
        done = true; break;
      }
      cur = (ev.type === 'PASS' && ev.to) ? { poss: ev.to, ground: null } : { poss: null, ground: ev.end };
    }
    if (!done) bpos[b.id] = cur.poss ? heldAt(cur.poss, tau, b.i) : cur.ground;
  });
  const drawn = {};
  p.els.forEach(e => { if (!schIsAction(e)) return; const w = p.windows[e.id]; if (!w || tau < w[0]) return; drawn[e.id] = schEase((tau - w[0]) / (w[1] - w[0])); });
  return { pos, ball: p.balls[0] ? bpos[p.balls[0].id] : null, balls: bpos, drawn };
}

// Chronologie de l'enchaînement : étape k = [T, T + D], puis transition douce de 0,9 s vers l'étape suivante
function schTimeline(drawings) {
  const ds = schNormDrawings(drawings); let T = 0; const ph = [];
  ds.forEach((d, k) => { const plan = schPlan(d), last = k === ds.length - 1; ph.push({ k, d, plan, T, D: plan.D, trans: last ? 0 : SCH_TRANS }); T += plan.D + (last ? 0 : SCH_TRANS); });
  return { ph, total: T, n: ds.length };
}
function schSub(a, u) { // sous-courbe [0,u] d'un tracé (droite ou Bézier quadratique, de Casteljau)
  const P = a.points, e = schPointAt(P, 1);
  if (P.length === 2) return [P[0], { x: P[0].x + (P[1].x - P[0].x) * u, y: P[0].y + (P[1].y - P[0].y) * u }];
  const t = u, c = { x: P[0].x + (P[1].x - P[0].x) * t, y: P[0].y + (P[1].y - P[0].y) * t }, end = schQuadAt(P[0], P[1], P[2], t);
  return e ? [P[0], c, end] : P;
}
// Cadre à l'instant t (secondes depuis le début de l'enchaînement)
// Filigranes de l'animation : ils apparaissent quand l'élément quitte sa place (ballon : point de départ du porteur et départ de chaque passe / tir, après ses déplacements ; joueur : sa position de départ)
// et disparaissent à la fin de l'étape, sans passer à l'étape suivante.
const SCH_GHOST_OPACITY = 0.3;  // transparence du filigrane
const SCH_GHOST_END = 0;        // MOMENT DE DISPARITION (s) par rapport à la fin de l'étape : 0 = à la fin ; -0,5 = 0,5 s avant ; +0,3 = 0,3 s après
const SCH_GHOST_FADE = 0.35;    // durée (s) du fondu de disparition
function schGhostFade(tau, D) { const t1 = D + SCH_GHOST_END; return tau <= t1 ? 1 : Math.max(0, 1 - (tau - t1) / SCH_GHOST_FADE); }
function schBallStart0(plan, b) { return b.init.poss ? schBallStart(b.el, plan.els) : { x: b.init.ground.x, y: b.init.ground.y }; }
function schGhosts(plan, tau) {
  const st = schPlanState(plan, tau), multi = plan.balls.length > 1, out = { balls: [], players: [] }, same = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.06;
  plan.els.forEach(e => { if (!schIsPlayer(e)) return; const p = st.pos[e.id]; if (p && Math.hypot(p.x - e.x, p.y - e.y) > 0.08) out.players.push({ ...e }); });
  plan.balls.forEach(b => {
    const s0 = schBallStart0(plan, b), cur = st.balls[b.id], pts = [];
    if (cur && Math.hypot(cur.x - s0.x, cur.y - s0.y) > 0.08) pts.push(s0);
    plan.events.forEach(ev => {
      if (ev.ball !== b.id || tau < ev.t0 || !ev.from || !plan.byId[ev.from]) return;
      const q = schPosOn(plan.byId[ev.from], plan.segs[ev.from] || [], ev.t0), o = schBallOff(b.i), S = { x: q.x + o.x, y: q.y + o.y };
      if (!pts.some(p => same(p, S))) pts.push(S);
    });
    pts.forEach(p => out.balls.push({ x: p.x, y: p.y, s: b.el.scale, i: b.i, m: multi }));
  });
  return out;
}
function schAt(tl, t) {
  t = Math.max(0, Math.min(tl.total, t));
  let ph = tl.ph[tl.ph.length - 1];
  for (const x of tl.ph) { if (t < x.T + x.D + x.trans) { ph = x; break; } }
  const tau = t - ph.T, inTrans = ph.trans > 0 && tau > ph.D;
  const mk = (plan, st, extraO) => {
    const els = [];
    plan.els.forEach(e => { if (schIsAction(e) || e.type === 'BALL') return; const p = st.pos[e.id]; els.push({ ...e, x: p.x, y: p.y, _o: extraO && extraO[e.id] != null ? extraO[e.id] : 1 }); });
    return els;
  };
  const startOf = schBallStart0;
  const addGhosts = (f, plan, tau, fade) => { if (fade <= 0) return; const g = schGhosts(plan, tau); g.balls.forEach(b => f.ghosts.push({ ...b, o: fade })); g.players.forEach(e => f.pghosts.push({ ...e, _o: SCH_GHOST_OPACITY * fade })); };
  if (!inTrans) {
    const st = schPlanState(ph.plan, Math.min(tau, ph.D)), f = { els: mk(ph.plan, st), acts: [], balls: [], ghosts: [], pghosts: [] };
    ph.plan.els.forEach(a => { if (!schIsAction(a) || st.drawn[a.id] == null) return; const u = st.drawn[a.id]; f.acts.push({ a: u >= 0.999 ? a : { ...a, points: schSub(a, Math.max(0.001, u)) }, badge: false }); });
    const multi = ph.plan.balls.length > 1;
    ph.plan.balls.forEach(b => { const q = st.balls[b.id]; f.balls.push({ x: q.x, y: q.y, s: b.el.scale, i: b.i, m: multi }); });
    addGhosts(f, ph.plan, Math.min(tau, ph.D), schGhostFade(tau, ph.D));
    return { k: ph.k, view: ph.d.view, frame: f, phase: 'play' };
  }
  // transition : positions finales de l'étape k → positions de départ de l'étape k+1
  const nx = tl.ph[ph.k + 1], e = schEase((tau - ph.D) / ph.trans), A = schPlanState(ph.plan, ph.D), B = schPlanState(nx.plan, 0);
  const elsA = mk(ph.plan, A), elsB = mk(nx.plan, B), mapB = {}; elsB.forEach(x => { mapB[x.id] = x; });
  const out = [], seen = {};
  elsA.forEach(a => { const b = mapB[a.id]; seen[a.id] = 1; if (b) out.push({ ...b, x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, _o: 1 }); else out.push({ ...a, _o: 1 - e }); });
  elsB.forEach(b => { if (!seen[b.id]) out.push({ ...b, _o: e }); });
  const f = { els: out, acts: [], balls: [], ghosts: [], pghosts: [] };
  addGhosts(f, ph.plan, ph.D, schGhostFade(tau, ph.D)); // fin du fondu des filigranes de l'étape qui se termine ; l'étape suivante n'en reçoit aucun
  // ballons : un ballon de l'étape k est relié au ballon de l'étape k+1 qui a le même identifiant, sinon au suivant disponible
  const Ab = ph.plan.balls, Bb = nx.plan.balls, used = new Set(), pairs = [];
  Ab.forEach(a => { const b = Bb.find(z => z.id === a.id); if (b) used.add(b); pairs.push([a, b || null]); });
  pairs.forEach(pr => { if (!pr[1]) { const b = Bb.find(z => !used.has(z)); if (b) { used.add(b); pr[1] = b; } } });
  Bb.forEach(b => { if (!used.has(b)) pairs.push([null, b]); });
  const multi = Math.max(Ab.length, Bb.length) > 1;
  pairs.forEach(([a, b]) => {
    const pa = a ? A.balls[a.id] : null, pb = b ? startOf(nx.plan, b) : null, i = b ? b.i : a.i, s = (b || a).el.scale;
    if (pa && pb) f.balls.push({ x: pa.x + (pb.x - pa.x) * e, y: pa.y + (pb.y - pa.y) * e, s, i, m: multi });
    else if (pa) f.balls.push({ x: pa.x, y: pa.y, o: 1 - e, s, i, m: multi });
    else if (pb) f.balls.push({ x: pb.x, y: pb.y, o: e, s, i, m: multi });
  });
  return { k: e > 0.5 ? nx.k : ph.k, view: e > 0.5 ? nx.d.view : ph.d.view, frame: f, phase: 'trans' };
}

// ===================== LECTEUR D'ANIMATION (plein écran) =====================
// Superposition ajoutée à <html> (pas à <body>) : le zoom CSS du body sur iPad ne la déforme pas.
let schPl = null;
const SCH_WATERMARK = 'S G';   // filigrane affiché aux joueurs sur les animations (lecture seule) ; à changer ici
// Filigrane : motif de textes en diagonale, très discret, qui glisse lentement ; ne capte aucun clic.
function schWatermarkAdd(el) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="190" height="130"><text x="95" y="68" transform="rotate(-24 95 65)" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,0.16)" stroke="rgba(0,0,0,0.10)" stroke-width="0.6">' + SCH_WATERMARK.replace(/[<>&]/g, '') + '</text></svg>';
  const w = document.createElement('div'); w.className = 'schp-wm';
  w.style.cssText = 'position:absolute;inset:0;z-index:5;pointer-events:none;background-image:url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '");background-size:190px 130px;animation:schpWm 40s linear infinite;';
  el.appendChild(w);
  if (!document.getElementById('schp-wm-style')) { const st = document.createElement('style'); st.id = 'schp-wm-style'; st.textContent = '@keyframes schpWm{from{background-position:0 0}to{background-position:190px 130px}}'; document.head.appendChild(st); }
}
function schFmtT(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function schPlayerOpen(exIdx, fromStep) { // fromStep : numéro d'étape (0 = première) où démarrer ; depuis l'éditeur, l'étape en cours
  schEnsure();
  const ex = schDemo[exIdx == null ? schUi.ex : exIdx]; if (!ex) return;
  schPlayerOpenData(ex.name, ex.drawings, fromStep);
}
function schPlayerOpenData(name, drawings, fromStep, opts) {
  const ro = !!(opts && opts.readOnly);   // lecture seule (joueurs) : aucun bouton GIF, et l'export est refusé
  const ex = { name, drawings };
  schPlayerClose();
  const tl = schTimeline(ex.drawings);
  const css = 'position:fixed;inset:0;z-index:99999;background:#0B1220;display:flex;flex-direction:column;color:#fff;font-family:Arial,sans-serif;-webkit-user-select:none;user-select:none;touch-action:manipulation;';
  const el = document.createElement('div'); el.id = 'sch-player'; el.style.cssText = css;
  const sp = [0.5, 1, 1.5, 2];
  el.innerHTML = `<div class="schp-top"><div class="schp-title" id="schp-title"></div><div style="display:flex;gap:8px;">${ro ? '' : '<button type="button" class="schp-btn" id="schp-gif" aria-label="Partager en GIF" style="font-size:15px;padding:0 14px;">📤 GIF</button>'}<button type="button" class="schp-btn" id="schp-close" aria-label="Fermer">✕</button></div></div>`
    + `<div class="schp-stage" id="schp-stage"></div><div class="schp-warn" id="schp-warn"></div>`
    + `<div class="schp-ctl"><input type="range" id="schp-seek" min="0" max="1000" value="0" aria-label="Position">`
    + `<div class="schp-row"><button type="button" class="schp-btn" id="schp-prev" aria-label="Étape précédente">⏮</button><button type="button" class="schp-btn schp-main" id="schp-play" aria-label="Lecture">⏸</button><button type="button" class="schp-btn" id="schp-next" aria-label="Étape suivante">⏭</button><span class="schp-time" id="schp-time"></span>`
    + `<span class="schp-sp">${sp.map(v => `<button type="button" class="schp-chip${v === 1 ? ' on' : ''}" data-sp="${v}">×${String(v).replace('.', ',')}</button>`).join('')}</span></div>`
    + (tl.n > 1 ? `<label class="schp-chk"><input type="checkbox" id="schp-pause" checked> Pause entre les étapes</label>` : '') + `</div>`;
  document.documentElement.appendChild(el);
  schPl = { tl, name: ex.name, el, t: (fromStep > 0 && tl.ph[Math.min(fromStep, tl.n - 1)]) ? tl.ph[Math.min(fromStep, tl.n - 1)].T : 0, playing: true, speed: 1, pause: tl.n > 1, last: 0, raf: 0, prevOverflow: document.documentElement.style.overflow, warned: tl.ph.map(p => p.plan.warnings.length) };
  document.documentElement.style.overflow = 'hidden';
  const $ = id => el.querySelector('#' + id);
  $('schp-close').onclick = schPlayerClose;
  schPl.ro = ro;
  if (ro) { schWatermarkAdd(el); el.style.webkitTouchCallout = 'none'; el.addEventListener('contextmenu', e => e.preventDefault()); }   // joueurs : filigrane + pas de menu « enregistrer / copier »
  if ($('schp-gif')) $('schp-gif').onclick = () => { if (schPl && !schPl.ro) schShareGif(schPl.name, schPl.tl.ph.map(x => x.d), $('schp-gif')); };
  $('schp-play').onclick = schPlToggle;
  $('schp-stage').onclick = schPlToggle;
  $('schp-prev').onclick = () => schPlStep(-1);
  $('schp-next').onclick = () => schPlStep(1);
  $('schp-seek').oninput = e => { schPl.playing = false; schPlSeek(e.target.value / 1000 * schPl.tl.total); };
  el.querySelectorAll('[data-sp]').forEach(b => { b.onclick = () => { schPl.speed = parseFloat(b.dataset.sp); el.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('on', x === b)); }; });
  if ($('schp-pause')) $('schp-pause').onchange = e => { schPl.pause = e.target.checked; };
  document.addEventListener('keydown', schPlKey, true);
  schPlDraw(); schPl.last = performance.now(); schPl.raf = requestAnimationFrame(schPlLoop);
}
function schPlayerClose() {
  if (!schPl) return;
  cancelAnimationFrame(schPl.raf); document.removeEventListener('keydown', schPlKey, true);
  document.documentElement.style.overflow = schPl.prevOverflow || ''; schPl.el.remove(); schPl = null;
}
function schPlKey(e) {
  if (!schPl) return;
  if (e.key === 'Escape') { e.preventDefault(); schPlayerClose(); }
  else if (e.key === ' ') { e.preventDefault(); schPlToggle(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); schPlStep(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); schPlStep(1); }
}
function schPlToggle() {
  if (!schPl) return;
  if (!schPl.playing && schPl.t >= schPl.tl.total - 0.001) schPl.t = 0; // rejouer
  schPl.playing = !schPl.playing; schPl.last = performance.now(); schPlDraw();
}
function schPlSeek(t) { if (!schPl) return; schPl.t = Math.max(0, Math.min(schPl.tl.total, t)); schPlDraw(); }
function schPlStep(dir) { // début de l'étape précédente / suivante
  if (!schPl) return; const tl = schPl.tl, t = schPl.t; let cur = 0;
  tl.ph.forEach(p => { if (t >= p.T - 0.001) cur = p.k; });
  let k = dir > 0 ? cur + 1 : (t - tl.ph[cur].T > 0.6 ? cur : cur - 1);
  if (k >= tl.n) { schPlSeek(tl.total); schPl.playing = false; schPlDraw(); return; }
  schPlSeek(tl.ph[Math.max(0, k)].T);
}
function schPlLoop(now) {
  if (!schPl) return;
  const p = schPl;
  if (p.playing) {
    const dt = Math.min(0.1, (now - p.last) / 1000) * p.speed; let t1 = p.t + dt;
    if (p.pause) { const stop = p.tl.ph.find(x => x.k < p.tl.n - 1 && x.T + x.D > p.t + 1e-6 && x.T + x.D <= t1); if (stop) { t1 = stop.T + stop.D; p.playing = false; } }
    if (t1 >= p.tl.total) { t1 = p.tl.total; p.playing = false; }
    p.t = t1; schPlDraw();
  }
  p.last = now; p.raf = requestAnimationFrame(schPlLoop);
}
function schPlDraw() {
  const p = schPl; if (!p) return;
  const r = schAt(p.tl, p.t), vw = schView(r.view), $ = id => p.el.querySelector('#' + id);
  $('schp-stage').innerHTML = `<svg viewBox="${vw.vb.join(' ')}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;max-height:100%;width:100%;height:100%;display:block;border-radius:10px;background:#fff;">${schCourtSvg(r.view)}${schBodySvg(r.frame)}</svg>`;
  const ph = p.tl.ph[r.k], n = p.tl.n;
  { const bl = ph.d.elements.filter(x => x.type === 'BALL'), bi = ph.d.ballPlay ? bl.findIndex(x => x.id === ph.d.ballPlay) : -1;
  $('schp-title').textContent = (ph.d.title || 'Étape ' + (r.k + 1)) + (n > 1 ? ' · ' + (r.k + 1) + '/' + n : '') + (bl.length > 1 && bi >= 0 ? ' · ballon ' + (bi + 1) : ''); }
  $('schp-play').textContent = p.playing ? '⏸' : (p.t >= p.tl.total - 0.001 ? '↻' : '▶');
  $('schp-seek').value = Math.round(p.t / p.tl.total * 1000);
  $('schp-time').textContent = schFmtT(p.t) + ' / ' + schFmtT(p.tl.total);
  $('schp-warn').textContent = p.warned[r.k] ? '⚠ Une action de ballon (passe, tir, dribble) de cette étape part d\'un joueur qui n\'a pas encore le ballon : passe et tir ne sont pas joués.' : '';
}

