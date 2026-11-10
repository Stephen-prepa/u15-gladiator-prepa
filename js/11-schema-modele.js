// Prépa U15 HBCCS — js/11-schema-modele.js — dernière modification : version z48 (10/11/2026)
// ----- Schéma (terrain) : modèle, rendu, éditeur image par image -----
const CR_COURT = { half: { w: 200, h: 200, vb: [-10, -10, 220, 220], k: 1 }, full: { w: 400, h: 200, vb: [-10, -10, 420, 220], k: 1.35 }, free: { w: 300, h: 200, vb: [-10, -10, 320, 220], k: 1.1 } };
const CR_MAX_FRAMES = 40;
function crNormSchema(s) {
  if (Array.isArray(s)) s = { mode: 'full', frames: [{ els: s }] };
  if (!s || typeof s !== 'object') s = {};
  if (!CR_COURT[s.mode]) s.mode = 'half';
  if (!Array.isArray(s.frames) || !s.frames.length) s.frames = [{ els: [] }];
  s.frames.forEach(f => { if (!Array.isArray(f.els)) f.els = []; f.els.forEach(e => { if (!e.id) e.id = crUid(); }); });
  s.sc = Math.max(0.5, Math.min(2.5, parseFloat(s.sc) || 1));
  return s;
}
// ----- Schémas de la bibliothèque (module Schémas) rattachés aux exercices de séance -----
// L'exercice garde une copie (schemaLib : id, nom, date, étapes) : la fiche, le PDF et le mode hors ligne n'ont pas besoin du réseau ; « Mettre à jour » reprend la version de la bibliothèque.
// ----- Conversion d'un ancien dessin (ancien éditeur, par images) en étapes de l'éditeur de schémas -----
// Images → étapes ; mouvements entre deux images → déplacements / dribbles / écrans ; passes et tirs du ballon (legs) → actions ; crayon, zones, textes, échelles → équivalents. L'ancien dessin reste dans l'exercice (x.schema).
const CR_TO_SCH = { att: 'PLAYER', def: 'DEFENDER', gb: 'GOALKEEPER', ball: 'BALL', cone: 'CONE', coupelle: 'DISC', jalon: 'POLE', cerceau: 'HOOP', haie: 'HURDLE', minibut: 'POPUP_GOAL' };
function crSchemaConvert(x) {
  const s = crNormSchema(JSON.parse(JSON.stringify(x.schema))), R = v => Math.round(v * 100) / 100, m = v => R((+v || 0) / 10), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const view = { half: 'half', full: 'full', free: 'free' }[s.mode] || 'half', sc = s.sc || 1, PL = ['att', 'def', 'gb'];
  const drawings = s.frames.map((fr, fi) => {
    const next = s.frames[fi + 1] || null, els = [], arrows = fr.els.filter(a => a.x1 != null), nmap = {}; let z = 0;
    if (next) next.els.forEach(q => { if (q.x1 == null) nmap[q.id] = q; });
    fr.els.forEach(e => {
      if (e.x1 != null) return;
      const s1 = parseFloat(e.s) || 1, col = /^#[0-9a-f]{6}$/i.test(e.c || '') ? e.c : undefined, base = { id: e.id, x: m(e.x), y: m(e.y), color: col, z: ++z };
      if (CR_TO_SCH[e.t]) {
        const o = { ...base, type: CR_TO_SCH[e.t], scale: clamp(s1 * sc, 0.4, 3), label: (e.t === 'att' || e.t === 'def' || e.t === 'gb') ? String(e.n || '').slice(0, 3) : '' };
        if (e.t === 'ball') { delete o.color; const h = e.hold && fr.els.find(q => q.id === e.hold && PL.includes(q.t)); o.holderId = h ? e.hold : '-'; }
        els.push(o);
      } else if (e.t === 'pen') {
        const P = (Array.isArray(e.pts) ? e.pts : []).map(q => ({ x: R((+q[0] || 0) * s1 / 10), y: R((+q[1] || 0) * s1 / 10) }));
        if (P.length >= 2) els.push({ ...base, type: 'PEN', pts: P, scale: clamp(crLw(e) / 1.4, 0.4, 3) });
      } else if (e.t === 'zone') els.push({ ...base, type: e.shape === 'ellipse' ? 'ZONE_CIRCLE' : 'ZONE_RECT', w: Math.max(0.5, R(2 * (+e.w || 1) * s1 / 10)), h: Math.max(0.5, R(2 * (+e.h || 1) * s1 / 10)) });
      else if (e.t === 'text') els.push({ ...base, type: 'TEXT', label: String(e.txt || '').slice(0, 30), scale: clamp(s1, 0.4, 3) });
      else if (e.t === 'echelle') { const n = clamp(Math.round(+e.n || 8), 2, SCH_LADDER_MAX); els.push({ ...base, type: 'LADDER', n, rotation: +e.a || 0, scale: clamp(((+e.L || 20) * s1 / 5) / (n * 0.5), 0.4, 3) }); }
    });
    const act = (type, pts, step, extra) => els.push({ id: schUid(), type, points: pts, step: Math.max(1, Math.min(30, step || 1)), delay: 0, ...(extra || {}) });
    const linked = a => Array.isArray(a.lnk) && a.lnk.some(id => fr.els.some(q => q.id === id));
    if (next) {
      const ord = crOrderInfo(fr, next), stepOf = {}, lk = {};
      ord.mv.forEach(a => { stepOf[a.id] = ord.ranks[a.id] + 1; });
      arrows.forEach(a => { (Array.isArray(a.lnk) ? a.lnk : []).forEach(id => { lk[id] = a.t; }); });
      ord.mv.forEach(a => {
        const b = nmap[a.id]; if (!b || a.t === 'ball') return;
        const pts = [{ x: m(a.x), y: m(a.y) }, { x: m(b.x), y: m(b.y) }];
        if (Array.isArray(a.pth) && a.pth.length) { const mid = crPolyAt(crPathPoly(a, b), 0.5); pts.splice(1, 0, { x: R((2 * mid[0] - (a.x + b.x) / 2) / 10), y: R((2 * mid[1] - (a.y + b.y) / 2) / 10) }); }
        const hasBall = fr.els.some(q => q.t === 'ball' && q.hold === a.id), type = (a.dr || lk[a.id] === 'dribble') && hasBall ? 'RUN' : (lk[a.id] === 'screen' ? 'SCREEN' : 'MOVE');
        act(type, pts, stepOf[a.id], { fromElementId: a.id });
      });
      const nBalls = fr.els.filter(q => q.t === 'ball').length;
      fr.els.filter(q => q.t === 'ball' && Array.isArray(q.legs) && q.legs.length).forEach(ball => {
        let holder = ball.hold || null, prevStep = 1, prevDelay = 0;
        ball.legs.forEach((L, j) => {
          const arrow = arrows.find(a => a.id === L.aid), kind = arrow ? arrow.t : (L.h ? 'pass' : 'shot');
          const Hk = holder && fr.els.find(q => q.id === holder), Hn = holder && nmap[holder], hMoves = !!(Hk && stepOf[holder] != null && Hn);
          let sp, step, delay = 0;
          if (!Hk) sp = arrow ? { x: m(arrow.x1), y: m(arrow.y1) } : { x: m(ball.x), y: m(ball.y) };
          else if (hMoves && j === 0) { const q = crPolyAt(crPathPoly(Hk, Hn), L.f == null ? 1 : L.f); sp = { x: m(q[0]), y: m(q[1]) }; }
          else if (hMoves) sp = { x: m(Hn.x), y: m(Hn.y) };
          else sp = { x: m(Hk.x), y: m(Hk.y) };
          if (hMoves && j === 0) { step = stepOf[holder]; delay = clamp(Math.round((L.f == null ? 1 : L.f) * 1.2 / 0.25) * 0.25, 0, 2); }
          else if (L.h && stepOf[L.h] != null) step = stepOf[L.h]; else step = prevStep;
          step = Math.max(step, prevStep); if (step === prevStep) delay = Math.max(delay, prevDelay); // même étape : une passe enchaînée ne part pas avant la précédente
          const ex = { fromElementId: holder || undefined, delay };
          if (nBalls > 1) ex.ballId = ball.id;
          const type = (kind === 'shot' || (!L.h && kind !== 'pass')) ? 'SHOT' : 'PASS';
          if (type === 'PASS' && L.h) ex.toElementId = L.h;
          act(type, [sp, { x: m(L.x), y: m(L.y) }], step, ex);
          holder = L.h || null; prevStep = step; prevDelay = delay;
        });
      });
    }
    arrows.filter(a => !linked(a)).forEach(a => act({ pass: 'PASS', shot: 'SHOT', dribble: 'RUN', screen: 'SCREEN' }[a.t] || 'MOVE', [{ x: m(a.x1), y: m(a.y1) }, { x: m(a.x2), y: m(a.y2) }], 1));
    return { id: schUid(), title: 'Étape ' + (fi + 1), view, elements: els };
  });
  return schNormDrawings(drawings);
}
// Rattache à l'exercice la version convertie de son ancien dessin (une seule fois : x.schemaConv)
function crSchemaMigrate(x) {
  if (!x || x.schemaLib || x.schemaConv || !crSchemaHas(x)) return;
  try {
    const dr = crSchemaConvert(x); x.schemaConv = true;
    if (dr.length && dr.some(d => d.elements.length)) x.schemaLib = { id: schUuid(), name: String(x.name || 'Schéma').slice(0, 120), at: null, drawings: dr, fromOld: true };
  } catch (e) { console.error('conversion de l\'ancien dessin', e); }
}
function crSchemaCardLegacy(x) {
  return `<div id="cr-ex-schema" onclick="crOpenDraw()" style="cursor:pointer;">${crSchemaHas(x) ? crSvgStatic(x.schema, 0) : `<div style="border:2px dashed rgba(245,196,0,0.5);border-radius:12px;padding:26px 10px;text-align:center;"><div style="font-size:30px;color:var(--jaune);">＋</div><div style="font-weight:800;color:var(--blanc);">Dessiner la situation</div><div style="font-size:12px;color:var(--gris-texte);margin-top:4px;">Joueurs, ballon, passes, déplacements, tirs… et animation image par image</div></div>`}</div>
      ${crSchemaHas(x) ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><button type="button" class="cr-btn sm" onclick="crOpenDraw()">✏️ Modifier le schéma</button><button type="button" class="cr-btn sm" id="cr-ex-share" onclick="crShareAnim()">📤 Partager</button>${crSchemaFrames(x) > 1 ? `<button type="button" class="cr-btn sm primary" id="cr-ex-play" onclick="crExTogglePlay()">▶ Lecture</button><span style="font-size:11px;color:var(--gris-texte);">${crSchemaFrames(x)} images</span>` : ''}</div>` : ''}`;
}
function crSchLibRec(L) { schEnsure(); return L ? schUserEx.find(r => r.id === L.id && !r.deleted) || null : null; }
function crSchHolder(t) { const x = crCurEx(); return t === 'gb' ? x.gb : x; }
let crSchTgt = 'main';
function crSchemaCard(h, t) {
  t = t || 'main';
  const L = h.schemaLib, q = "'" + t + "'";
  if (L && L.drawings && L.drawings.length) {
    const n = L.drawings.length, rec = crSchLibRec(L), newer = rec && rec.updatedAt && (!L.at || rec.updatedAt > L.at);
    const prev = n === 1 ? `<div class="cr-ex-schema" style="max-width:520px;">${schDrawingSvg(L.drawings[0], { showBallStart: false })}</div>`
      : `<div class="cr-ex-schema" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:640px;">${L.drawings.map(d => `<div><div style="font-size:11px;color:var(--gris-texte);margin-bottom:2px;">${crEsc(d.title)}</div>${schDrawingSvg(d, { showBallStart: false })}</div>`).join('')}</div>`;
    const descH = L.desc ? `<div class="cr-schdesc"><b>Descriptif du schéma</b><div>${crEsc(L.desc).replace(/\n/g, '<br>')}</div>${t === 'main' ? `<button type="button" class="cr-btn sm" onclick="crSchCopyDesc()">Copier dans « Disposition initiale »</button>` : ''}</div>` : '';
    return prev + descH + `<div style="margin-top:8px;font-size:12px;color:var(--gris-texte);">🎬 ${crEsc(L.name)} · ${n} étape${n > 1 ? 's' : ''}${rec || L.fromOld || L.pend ? '' : ' · ⚠ plus dans la bibliothèque (la copie est conservée)'}${!rec && L.fromOld ? ' · converti depuis l\'ancien éditeur' : ''}${L.pend || (rec && !L.own) ? ' · modifier crée une copie : l\'original de la bibliothèque reste intact' : ''}${newer ? ' · <b style="color:var(--jaune);">version plus récente dans la bibliothèque</b>' : ''}</div>`
      + `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="cr-btn sm primary" onclick="crSchPlay(${q})">▶ Animer</button><button type="button" class="cr-btn sm" onclick="crSchShare(${q},this)">📤 Partager</button>${rec || L.fromOld || L.pend ? `<button type="button" class="cr-btn sm" onclick="crSchEdit(${q})">✏️ Modifier</button>` : ''}${newer ? `<button type="button" class="cr-btn sm" onclick="crSchUpdate(${q})">↻ Mettre à jour</button>` : ''}<button type="button" class="cr-btn sm" onclick="crSchPick(${q})">Changer</button><button type="button" class="cr-btn sm danger" onclick="crSchDetach(${q})">Retirer</button></div>`;
  }
  if (t === 'main' && crSchemaHas(h)) return crSchemaCardLegacy(h) + `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:var(--gris-texte);">Ancien schéma (ancien éditeur). Tu peux le remplacer par un schéma de la bibliothèque ; l'ancien est conservé si tu le retires ensuite.</div><div style="margin-top:6px;"><button type="button" class="cr-btn sm" onclick="crSchPick('main')">🎬 Remplacer par un schéma de la bibliothèque</button></div>`;
  return `<div style="border:2px dashed rgba(245,196,0,0.5);border-radius:12px;padding:22px 10px;text-align:center;"><div style="font-size:30px;color:var(--jaune);">＋</div><div style="font-weight:800;color:var(--blanc);">${t === 'gb' ? 'Schéma du travail GB' : 'Dessiner la situation'}</div><div style="font-size:12px;color:var(--gris-texte);margin:4px 0 12px;">Joueurs, ballon, passes, déplacements, tirs… avec animation</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button type="button" class="cr-btn primary" onclick="crSchPick(${q})">Choisir dans la bibliothèque</button><button type="button" class="cr-btn" onclick="crSchNew(${q})">✏️ Créer un nouveau schéma</button></div></div>`;
}
function crSchSnap(rec, own) { const o = { id: rec.id, name: rec.name, desc: rec.desc || '', at: rec.updatedAt || null, drawings: JSON.parse(JSON.stringify(rec.drawings)) }; if (own) o.own = true; return o; }
// Le titre du schéma devient le nom de l'exercice tant que celui-ci s'appelle encore « Nouvel exercice » (ou est vide) ; un nom saisi par le coach n'est jamais écrasé
function crSchAdoptName(t, name) {
  if (t === 'gb') return;
  const x = crCurEx(), cur = String((x && x.name) || '').trim(), nm = String(name || '').trim();
  const isDef = v => !v || /^nouvel exercice$/i.test(v) || /^sch[ée]ma$/i.test(v);
  if (!x || !isDef(cur) || isDef(nm)) return;
  x.name = nm.replace(/\s*\(copie\)\s*$/i, '').trim() || nm;
}
function crSchAttach(id) {
  schEnsure(); const rec = schUserEx.find(r => r.id === id && !r.deleted); if (!rec) return;
  const h = crSchHolder(crSchTgt); if (!h) return;
  // copie indépendante : l'exercice garde sa propre version ; l'original de la bibliothèque ne sera jamais modifié par un changement fait ici
  h.schemaLib = { ...crSchSnap(rec), id: schUuid(), srcId: rec.id, own: true, pend: true }; crSchAdoptName(crSchTgt, rec.name); crSchPickClose(); crTouch(); crRenderExView();
}
function crSchUpdate(t) { const h = crSchHolder(t), rec = crSchLibRec(h.schemaLib); if (!rec) return; h.schemaLib = crSchSnap(rec); crTouch(); crRenderExView(); }
function crSchDetach(t) { if (!confirm('Retirer le schéma de cet exercice ? (Il reste dans la bibliothèque.)')) return; delete crSchHolder(t).schemaLib; crTouch(); crRenderExView(); }
function crSchPlay(t) { const L = crSchHolder(t).schemaLib; if (L) schPlayerOpenData(L.name, L.drawings); }
function crSchEdit(t) {
  const h = crSchHolder(t), L = h.schemaLib; if (!L) return;
  schEnsure();
  let rec = crSchLibRec(L), fork = null, before = '';
  const sig = dr => JSON.stringify((dr || []).map(d => { const o = { ...d }; delete o.updatedAt; delete o.validatedAt; return o; })); // contenu du schéma, sans les dates
  const baseName = n => { n = String(n || 'Schéma'); return (/\(copie\)\s*$/.test(n) ? n : n + ' (copie)').slice(0, 120); };
  if (!rec && (L.fromOld || L.pend) && L.drawings) { // copie de l'exercice pas encore dans la bibliothèque : elle y entre à la première modification
    before = sig(L.drawings);
    rec = schRec({ id: L.id, name: L.pend ? baseName(L.name) : L.name, drawings: JSON.parse(JSON.stringify(L.drawings)), dirty: true }); schUserEx.push(rec); schRebuild(); schUserSave(); fork = 'pend';
  } else if (rec && !L.own) { // ancien lien direct vers la bibliothèque : on travaille sur une copie, l'original reste intact
    before = sig(rec.drawings);
    rec = schRec({ id: schUuid(), name: baseName(rec.name), drawings: JSON.parse(JSON.stringify(rec.drawings)), kind: rec.kind, theme: rec.theme, dirty: true }); schUserEx.push(rec); schRebuild(); schUserSave(); fork = 'link';
  }
  if (!rec) { alert('Ce schéma n\'est plus dans la bibliothèque.'); return; }
  schEditorOpen(schDemo.indexOf(rec), ex => {
    const y = crSchHolder(t);
    if (fork && !ex.deleted && sig(ex.drawings) === before) { // rien modifié : la copie ne sert à rien
      ex.deleted = true; schMarkDirty(ex); schUserSave(); schRebuild();
      if (fork === 'pend' && y && y.schemaLib && y.schemaLib.id === ex.id) y.schemaLib.id = schUuid(); // la copie de l'exercice garde un identifiant neuf
      crRenderExView(); return;
    }
    if (y && y.schemaLib && (fork || y.schemaLib.id === ex.id) && !ex.deleted) { const src = y.schemaLib.srcId; y.schemaLib = crSchSnap(ex, true); if (src) y.schemaLib.srcId = src; crSchAdoptName(t, ex.name); crTouch(); }
    crRenderExView();
  });
}
function crSchNew(t) {
  t = t || 'main';
  const x = crCurEx(); schEnsure(); crSchPickClose();
  const r = schRec({ id: schUuid(), name: ((t === 'gb' ? 'GB · ' : '') + (x.name || 'Schéma')).slice(0, 120), drawings: [schNormDrawing({ title: 'Étape 1', view: t === 'gb' ? 'goal' : 'half' })], dirty: true }); schUserEx.push(r); schRebuild(); schUserSave();
  schEditorOpen(schDemo.indexOf(r), ex => {
    if (ex.drawings.every(d => !d.elements.length)) { ex.deleted = true; schMarkDirty(ex); schUserSave(); schRebuild(); crRenderExView(); return; } // rien dessiné : on ne garde pas un schéma vide
    const h = crSchHolder(t); if (h) { h.schemaLib = crSchSnap(ex, true); crSchAdoptName(t, ex.name); crTouch(); } crRenderExView();
  });
}
let crSchPickEl = null;
function crSchPick(t) {
  crSchTgt = t || 'main';
  schEnsure(); schSyncAll(); crSchPickClose();
  const el = document.createElement('div'); el.id = 'cr-schpick'; el.className = 'crsp';
  el.style.cssText = 'position:fixed;inset:0;z-index:99970;background:rgba(5,10,20,0.92);display:flex;flex-direction:column;padding:12px;padding-top:max(12px,env(safe-area-inset-top));color:#fff;font-family:Arial,sans-serif;';
  document.documentElement.appendChild(el); crSchPickEl = el; crSchPickRender();
}
function crSchPickClose() { if (crSchPickEl) { crSchPickEl.remove(); crSchPickEl = null; } }
function crSchPickRefresh() { if (crSchPickEl) crSchPickRender(); }
function crSchPickRender() {
  const el = crSchPickEl; if (!el) return; el.style.background = 'rgba(5,10,20,0.92)'; const list = schUserEx.filter(x => !x.deleted && x.drawings.length), cur = (((crSchHolder(crSchTgt) || {}).schemaLib || {}).srcId) || ((crSchHolder(crSchTgt) || {}).schemaLib || {}).id;
  el.innerHTML = `<div class="crsp-top"><b style="font-size:17px;">Schémas de la bibliothèque</b><button type="button" onclick="crSchPickClose()" aria-label="Fermer">✕</button></div><div style="font-size:11px;color:#8FA3BF;margin:2px 0 8px;">${schEsc(schSyncLabel(false))}</div>`
    + `<div class="crsp-list">${list.length ? list.map(x => { const n = x.drawings.length; return `<button type="button" class="crsp-card ${x.id === cur ? 'on' : ''}" onclick="crSchPrev('${x.id}')"><div class="crsp-thumb">${schDrawingSvg(x.drawings[0], { showBallStart: false })}</div><div class="crsp-name">${schEsc(x.name)}</div><div class="crsp-meta">${n} étape${n > 1 ? 's' : ''}${schTagText(x) ? ' · ' + schEsc(schTagText(x)) : ''}${x.id === cur ? ' · choisi' : ''}</div>${x.desc ? `<div class="crsp-desc">${schEsc(x.desc)}</div>` : ''}</button>`; }).join('') : '<div style="color:#8FA3BF;font-size:13px;padding:20px 4px;">La bibliothèque est vide pour l\'instant. Crée ton premier schéma ci-dessous.</div>'}</div>`
    + `<div style="padding-top:10px;"><button type="button" class="cr-btn primary" style="width:100%;padding:14px;" onclick="crSchNew(crSchTgt)">＋ Créer un nouveau schéma</button></div>`;
}
// Aperçu avant réutilisation : tous les temps du schéma + son descriptif, puis « Utiliser ce schéma »
function crSchPrev(id) {
  schEnsure(); const el = crSchPickEl, x = schUserEx.find(r => r.id === id && !r.deleted); if (!el || !x) return;
  const n = x.drawings.length, tag = schTagText(x); el.style.background = '#0b1424';
  el.innerHTML = `<div class="crsp-top"><b style="font-size:17px;min-width:0;overflow:hidden;text-overflow:ellipsis;">${schEsc(x.name)}</b><button type="button" onclick="crSchPickClose()" aria-label="Fermer">✕</button></div>`
    + `<div class="crsp-prev"><div class="crsp-pgrid" style="grid-template-columns:${n > 1 ? 'repeat(auto-fit,minmax(240px,1fr))' : '1fr'};">${x.drawings.map(d => `<div><div class="crsp-ptt">${schEsc(d.title || '')}</div>${schDrawingSvg(d, { showBallStart: true })}</div>`).join('')}</div>`
    + `<div class="crsp-meta" style="margin:8px 0 4px;">${n} étape${n > 1 ? 's' : ''}${tag ? ' · ' + schEsc(tag) : ''}</div>`
    + (x.desc ? `<div class="crsp-pdesc">${schEsc(x.desc).replace(/\n/g, '<br>')}</div>` : `<div class="crsp-pdesc none">Aucun descriptif pour ce schéma. Tu peux en ajouter un dans la bibliothèque : bouton 🏷 « Classer » de l'éditeur de schémas.</div>`) + `</div>`
    + `<div class="crsp-pbtn"><button type="button" class="cr-btn" onclick="crSchPickRender()">← Retour</button>${crSchAnimOk(x) ? `<button type="button" class="cr-btn" onclick="schPlayerOpenData(schUserEx.find(r=>r.id==='${x.id}').name,schUserEx.find(r=>r.id==='${x.id}').drawings)">▶ Animer</button>` : ''}<button type="button" class="cr-btn primary" style="flex:1;" onclick="crSchAttach('${x.id}')">Utiliser ce schéma</button></div>`;
}
// Ajoute le descriptif du schéma à la « Disposition initiale » de l'exercice (sans rien écraser)
function crSchCopyDesc() {
  const x = crCurEx(), L = x && x.schemaLib; if (!L || !L.desc) return;
  x.org = x.org || {}; const cur = String(x.org.setup || '');
  if (cur.indexOf(L.desc) >= 0) return;
  x.org.setup = cur ? cur.replace(/\s+$/, '') + '\n' + L.desc : L.desc; crTouch(); crRenderExView();
}
function crSchAnimOk(L) { return !!(L && L.drawings && L.drawings.length && (L.drawings.length > 1 || L.drawings.some(d => (d.elements || []).some(schIsAction)))); }
function crFicheSchemaLib(L) {
  if (!L || !L.drawings || !L.drawings.length) return '';
  const n = L.drawings.length, one = d => schDrawingSvg(d, { showBallStart: false });
  const leg = `<div class="cr-fig-leg">Les numéros indiquent l'ordre des actions (même numéro : en même temps). Trait pointillé : passe (deux pointes : passe aller-retour).</div>`;
  if (n === 1) return `<div class="cr-fig1">${one(L.drawings[0])}</div>${leg}`;
  return `<div class="cr-figs">${L.drawings.map((d, i) => `<figure class="cr-fig"><figcaption>${crCirc(i + 1)} ${crEsc(d.title)}</figcaption>${one(d)}</figure>`).join('')}</div>${leg}`;
}
function crSchemaHas(x) { return !!(x && x.schema && x.schema.frames && x.schema.frames.some(f => f.els.length)); }
function crSchemaFrames(x) { return (x && x.schema && x.schema.frames) ? x.schema.frames.length : 0; }

// Palette du schéma : thème "dark" (appli : marine / jaune / bleu / rouge) et "print" (fiche PDF, fond clair)
const CR_TH = {
  dark: { svgBg: '#0E1F3D', bg: '#12284D', line: '#C8D4E8', lw: 2.4, zone: 'rgba(0,82,180,0.45)', dash: '#F5C400', gk: '#1A3060', mark: '#F5C400', grid: '#1A3060', free: '#12284D', freeLine: '#3a5588',
    att: '#F5C400', attTx: '#0A1628', attSt: '#0A1628', def: '#E8543A', defTx: '#FFFFFF', defSt: '#0A1628', gb: '#0052B4', gbIn: '#003F8A', gbSt: '#F5C400', gbTx: '#FFFFFF',
    arrow: '#FFFFFF', shot: '#E8543A', ball: '#FF9F1C', ballSt: '#7a3f00', cone: '#F28C1E', coneSt: '#0A1628', coupelle: '#F5C400', cerceau: '#4d9bff', cerceauBg: 'rgba(77,155,255,0.12)', haie: '#F5C400', mini: '#C8D4E8', miniSt: '#0A1628', sel: '#F5C400', jalon: '#FFFFFF', jalonDot: '#E8543A' },
  print: { svgBg: '#FFFFFF', bg: '#F4F8FD', line: '#0A1628', lw: 2.4, zone: 'rgba(0,63,138,0.14)', dash: '#003F8A', gk: '#C8D4E8', mark: '#0A1628', grid: '#dbe5f1', free: '#F8FBFF', freeLine: '#9fb4cf',
    att: '#F5C400', attTx: '#0A1628', attSt: '#0A1628', def: '#C0392B', defTx: '#FFFFFF', defSt: '#0A1628', gb: '#003F8A', gbIn: '#0052B4', gbSt: '#0A1628', gbTx: '#FFFFFF',
    arrow: '#0A1628', shot: '#C0392B', ball: '#FF9F1C', ballSt: '#7a3f00', cone: '#F28C1E', coneSt: '#7a3f00', coupelle: '#F5C400', cerceau: '#0052B4', cerceauBg: 'rgba(0,82,180,0.08)', haie: '#C9A000', mini: '#E6EDF6', miniSt: '#0A1628', sel: '#003F8A', jalon: '#FFFFFF', jalonDot: '#C0392B' },
};
function crCourtSvg(mode, th) {
  th = th || CR_TH.dark;
  const L = th.line, lw = th.lw;
  if (mode === 'half') {
    return `<rect x="0" y="0" width="200" height="200" fill="${th.bg}" stroke="${L}" stroke-width="${lw + 0.4}"/>
    <path d="M25 0 A60 60 0 0 0 85 60 L115 60 A60 60 0 0 0 175 0 Z" fill="${th.zone}" stroke="${L}" stroke-width="${lw}"/>
    <path d="M0 29.6 A90 90 0 0 0 85 90 L115 90 A90 90 0 0 0 200 29.6" fill="none" stroke="${th.dash}" stroke-width="1.8" stroke-dasharray="6 5"/>
    <line x1="95" y1="70" x2="105" y2="70" stroke="${th.mark}" stroke-width="2"/>
    <rect x="85" y="-7" width="30" height="7" fill="${th.gk}" stroke="${L}" stroke-width="${lw}"/>`;
  }
  if (mode === 'full') {
    const side = `<path d="M0 25 A60 60 0 0 1 60 85 L60 115 A60 60 0 0 1 0 175 Z" fill="${th.zone}" stroke="${L}" stroke-width="${lw}"/><path d="M29.6 0 A90 90 0 0 1 90 85 L90 115 A90 90 0 0 1 29.6 200" fill="none" stroke="${th.dash}" stroke-width="1.8" stroke-dasharray="6 5"/><line x1="70" y1="95" x2="70" y2="105" stroke="${th.mark}" stroke-width="2"/><rect x="-7" y="85" width="7" height="30" fill="${th.gk}" stroke="${L}" stroke-width="${lw}"/>`;
    return `<rect x="0" y="0" width="400" height="200" fill="${th.bg}" stroke="${L}" stroke-width="${lw + 0.4}"/><line x1="200" y1="0" x2="200" y2="200" stroke="${L}" stroke-width="1.6"/><circle cx="200" cy="100" r="3" fill="${L}"/>${side}<g transform="translate(400,0) scale(-1,1)">${side}</g>`;
  }
  let grid = '';
  for (let x = 25; x < 300; x += 25) grid += `<line x1="${x}" y1="0" x2="${x}" y2="200" stroke="${th.grid}" stroke-width="1"/>`;
  for (let y = 25; y < 200; y += 25) grid += `<line x1="0" y1="${y}" x2="300" y2="${y}" stroke="${th.grid}" stroke-width="1"/>`;
  return `<rect x="0" y="0" width="300" height="200" fill="${th.free}" stroke="${th.freeLine}" stroke-width="2" stroke-dasharray="7 5"/>${grid}`;
}
function crArrowSvg(e, k, th) {
  th = th || CR_TH.dark;
  const kind = e.t, x1 = e.x1, y1 = e.y1, x2 = e.x2, y2 = e.y2;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const col = kind === 'shot' ? th.shot : th.arrow, w = (kind === 'shot' ? 2.3 : 1.45) * Math.min(k, 1.2);
  const hl = 7 * k, hw = 4.1 * k;
  if (kind === 'screen') {
    const bw = 8 * k;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><line x1="${x2 + px * bw}" y1="${y2 + py * bw}" x2="${x2 - px * bw}" y2="${y2 - py * bw}" stroke="${col}" stroke-width="${w + 0.6}" stroke-linecap="round"/>`;
  }
  const bx = x2 - ux * hl, by = y2 - uy * hl;
  let line;
  if (kind === 'dribble') {
    const len = Math.max(0, L - hl), n = Math.max(2, Math.round(len / 3));
    let d = `M${x1} ${y1}`;
    for (let i = 1; i <= n; i++) { const s = (i / n) * len, off = Math.sin(i * 1.3) * 2.4 * k; d += ` L${(x1 + ux * s + px * off).toFixed(1)} ${(y1 + uy * s + py * off).toFixed(1)}`; }
    line = `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/>`;
  } else {
    line = `<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${col}" stroke-width="${w}" ${kind === 'pass' ? 'stroke-dasharray="6 4"' : ''} stroke-linecap="round"/>`;
  }
  return line + `<polygon points="${x2},${y2} ${bx + px * hw},${by + py * hw} ${bx - px * hw},${by - py * hw}" fill="${col}"/>`;
}
// Couleurs personnalisables des joueurs et du matériel (e.c)
const CR_COLS = [['#F5C400', 'Jaune'], ['#F28C1E', 'Orange'], ['#E8543A', 'Rouge'], ['#E84393', 'Rose'], ['#8E5BD9', 'Violet'], ['#2F7DE1', 'Bleu'], ['#2ECC71', 'Vert'], ['#FFFFFF', 'Blanc'], ['#1B1B1B', 'Noir']];
const CR_DRAWT = ['pen', 'zone', 'text', 'echelle']; // annotations : crayon libre, zones (rectangle / ellipse), texte
const CR_COLORABLE = ['att', 'def', 'gb', 'ball', 'cone', 'coupelle', 'jalon', 'cerceau', 'haie', 'minibut', 'pen', 'zone', 'text', 'echelle'];
// épaisseur du trait (crayon, zone) : e.lt réglable en continu ; e.lw (1-3) = anciens réglages
function crLw(e) { if (e.lt != null && isFinite(+e.lt)) return Math.max(0.3, Math.min(5, +e.lt)); const v = parseInt(e.lw, 10); return v >= 1 && v <= 3 ? [0.84, 1.44, 2.4][v - 1] : 1.4; }
// Rectangle englobant (unités terrain) d'une annotation
function crDrawBox(e, k0, sc) {
  const s = parseFloat(e.s) || 1, x = +e.x || 0, y = +e.y || 0;
  if (e.t === 'pen') {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    (Array.isArray(e.pts) ? e.pts : []).forEach(q => { const a = (+q[0] || 0) * s, b = (+q[1] || 0) * s; x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); });
    if (x0 > x1) { x0 = x1 = y0 = y1 = 0; }
    return { x0: x + x0, x1: x + x1, y0: y + y0, y1: y + y1 };
  }
  if (e.t === 'zone') { const w = (+e.w || 1) * s, h = (+e.h || 1) * s; return { x0: x - w, x1: x + w, y0: y - h, y1: y + h }; }
  if (e.t === 'echelle') { const L = (+e.L || 20) * s, W = 3.4 * s, a = (+e.a || 0) * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), hx = Math.abs(L * cs) + Math.abs(W * sn), hy = Math.abs(L * sn) + Math.abs(W * cs); return { x0: x - hx, x1: x + hx, y0: y - hy, y1: y + hy }; }
  const fs = 9 * (k0 || 1) * (sc || 1) * s, w = Math.max(3, String(e.txt || '').length) * 0.58 * fs;
  return { x0: x - w / 2, x1: x + w / 2, y0: y - fs * 0.62, y1: y + fs * 0.62 };
}
function crPenPath(P) {
  if (!P.length) return '';
  const f = v => Math.round(v * 10) / 10;
  if (P.length === 1) return `M${f(P[0][0])} ${f(P[0][1])} l0.01 0`;
  if (P.length === 2) return `M${f(P[0][0])} ${f(P[0][1])} L${f(P[1][0])} ${f(P[1][1])}`;
  let d = `M${f(P[0][0])} ${f(P[0][1])} L${f((P[0][0] + P[1][0]) / 2)} ${f((P[0][1] + P[1][1]) / 2)}`;
  for (let i = 1; i < P.length - 1; i++) d += ` Q${f(P[i][0])} ${f(P[i][1])} ${f((P[i][0] + P[i + 1][0]) / 2)} ${f((P[i][1] + P[i + 1][1]) / 2)}`;
  return d + ` L${f(P[P.length - 1][0])} ${f(P[P.length - 1][1])}`;
}
function crTxtOn(hex) { const h = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#888888'; const l = (0.299 * parseInt(h.slice(1, 3), 16) + 0.587 * parseInt(h.slice(3, 5), 16) + 0.114 * parseInt(h.slice(5, 7), 16)) / 255; return l > 0.6 ? '#0A1628' : '#FFFFFF'; }
function crShade(hex, f) { const h = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#888888'; const c = i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0'); return '#' + c(1) + c(3) + c(5); }
function crTokenSvg(e, k, th) {
  th = th || CR_TH.dark;
  const x = e.x, y = e.y, r = 8 * k;
  const C = (typeof e.c === 'string' && /^#[0-9a-f]{6}$/i.test(e.c)) ? e.c : null;
  let s = '';
  if (e.t === 'att') s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${C || th.att}" stroke="${th.attSt}" stroke-width="${1.6 * k}"/><text x="${x}" y="${y + 4 * k}" text-anchor="middle" font-size="${11 * k}" font-weight="800" fill="${C ? crTxtOn(C) : th.attTx}" style="pointer-events:none;font-family:Arial,sans-serif;">${crEsc(e.n || '')}</text>`;
  else if (e.t === 'def') s = `<polygon points="${x - r * 1.15},${y - r * 0.9} ${x + r * 1.15},${y - r * 0.9} ${x},${y + r * 1.15}" fill="${C || th.def}" stroke="${th.defSt}" stroke-width="${1.4 * k}" stroke-linejoin="round"/><text x="${x}" y="${y - r * 0.02}" text-anchor="middle" font-size="${8.5 * k}" font-weight="800" fill="${C ? crTxtOn(C) : th.defTx}" style="pointer-events:none;font-family:Arial,sans-serif;">${crEsc(e.n || '')}</text>`;
  else if (e.t === 'gb') s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${C || th.gb}" stroke="${th.gbSt}" stroke-width="${2 * k}"/><circle cx="${x}" cy="${y}" r="${r - 3 * k}" fill="${C ? crShade(C, 0.72) : th.gbIn}"/><text x="${x}" y="${y + 3.4 * k}" text-anchor="middle" font-size="${8.5 * k}" font-weight="800" fill="${C ? crTxtOn(crShade(C, 0.72)) : th.gbTx}" style="pointer-events:none;font-family:Arial,sans-serif;">GB</text>`;
  else if (e.t === 'ball') s = `<circle cx="${x}" cy="${y}" r="${5.5 * k}" fill="${C || th.ball}" stroke="${th.ballSt}" stroke-width="${1 * k}"/><path d="M${x - 5.5 * k} ${y} Q${x} ${y - 3 * k} ${x + 5.5 * k} ${y}" fill="none" stroke="${th.ballSt}" stroke-width="${0.8 * k}"/>`;
  else if (e.t === 'cone') s = `<polygon points="${x},${y - 8 * k} ${x - 7 * k},${y + 6 * k} ${x + 7 * k},${y + 6 * k}" fill="${C || th.cone}" stroke="${th.coneSt}" stroke-width="${1 * k}" stroke-linejoin="round"/>`;
  else if (e.t === 'coupelle') s = `<circle cx="${x}" cy="${y}" r="${5.5 * k}" fill="${C || th.coupelle}" stroke="${th.coneSt}" stroke-width="${1 * k}"/><circle cx="${x}" cy="${y}" r="${1.8 * k}" fill="${th.coneSt}"/>`;
  else if (e.t === 'jalon') s = `<circle cx="${x}" cy="${y}" r="${4.5 * k}" fill="${C || th.jalon}" stroke="${th.coneSt}" stroke-width="${1 * k}"/><circle cx="${x}" cy="${y}" r="${1.8 * k}" fill="${th.jalonDot}"/>`;
  else if (e.t === 'cerceau') s = `<circle cx="${x}" cy="${y}" r="${8 * k}" fill="${C || th.cerceauBg}" ${C ? 'fill-opacity="0.18"' : ''} stroke="${C || th.cerceau}" stroke-width="${2 * k}"/>`;
  else if (e.t === 'haie') s = `<line x1="${x - 9 * k}" y1="${y}" x2="${x + 9 * k}" y2="${y}" stroke="${C || th.haie}" stroke-width="${2.6 * k}" stroke-linecap="round"/><line x1="${x - 9 * k}" y1="${y - 3.5 * k}" x2="${x - 9 * k}" y2="${y + 3.5 * k}" stroke="${C || th.haie}" stroke-width="${2 * k}"/><line x1="${x + 9 * k}" y1="${y - 3.5 * k}" x2="${x + 9 * k}" y2="${y + 3.5 * k}" stroke="${C || th.haie}" stroke-width="${2 * k}"/>`;
  else if (e.t === 'minibut') s = `<rect x="${x - 10 * k}" y="${y - 4 * k}" width="${20 * k}" height="${8 * k}" fill="${C || th.mini}" stroke="${th.miniSt}" stroke-width="${1.4 * k}"/><line x1="${x - 10 * k}" y1="${y}" x2="${x + 10 * k}" y2="${y}" stroke="${th.miniSt}" stroke-opacity=".35" stroke-width="${0.8 * k}"/>`;
  else if (CR_DRAWT.includes(e.t)) {
    const u = k / CR_TB, sg = parseFloat(e.s) || 1, sw = crLw(e) * u;
    if (e.t === 'pen') {
      const P = (Array.isArray(e.pts) ? e.pts : []).map(q => [(+e.x || 0) + (+q[0] || 0) * sg, (+e.y || 0) + (+q[1] || 0) * sg]);
      s = `<path d="${crPenPath(P)}" fill="none" stroke="${C || th.arrow}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (e.t === 'zone') {
      const w = (+e.w || 1) * sg, h = (+e.h || 1) * sg, f = e.f == null ? 1 : +e.f, col = C || th.dash, fo = f <= 0 ? 0 : (f === 1 ? 0.16 : 0.42);
      s = e.shape === 'ellipse'
        ? `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="${col}" fill-opacity="${fo}" stroke="${col}" stroke-width="${sw}"/>`
        : `<rect x="${x - w}" y="${y - h}" width="${w * 2}" height="${h * 2}" rx="${Math.min(2, w, h) * 0.6}" fill="${col}" fill-opacity="${fo}" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    } else if (e.t === 'echelle') {
      // échelle de rythme : 2 montants + barreaux (n cases), L = demi-longueur, a = angle en degrés ; 10 unités = 1 m
      const Ls = (+e.L || 20) * sg, Ws = 3.4 * sg, n = Math.max(2, Math.min(16, Math.round(+e.n || 8))), col = C || th.haie, rw = Math.max(0.5, 1.0 * u * Math.min(1.4, sg));
      let g = `<rect x="${x - Ls}" y="${y - Ws}" width="${Ls * 2}" height="${Ws * 2}" fill="${col}" fill-opacity="0.08" stroke="none"/><line x1="${x - Ls}" y1="${y - Ws}" x2="${x + Ls}" y2="${y - Ws}"/><line x1="${x - Ls}" y1="${y + Ws}" x2="${x + Ls}" y2="${y + Ws}"/>`;
      for (let i = 0; i <= n; i++) { const lx = x - Ls + (2 * Ls) * i / n; g += `<line x1="${lx.toFixed(2)}" y1="${y - Ws}" x2="${lx.toFixed(2)}" y2="${y + Ws}"/>`; }
      s = `<g transform="rotate(${+e.a || 0} ${x} ${y})" stroke="${col}" stroke-width="${rw}" stroke-linecap="round" fill="none">${g}</g>`;
    } else {
      const fs = 9 * u;
      s = `<text x="${x}" y="${y + fs * 0.35}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${C || th.arrow}" stroke="${th.svgBg}" stroke-width="${fs * 0.24}" stroke-linejoin="round" style="paint-order:stroke;pointer-events:none;font-family:Arial,sans-serif;">${crEsc(String(e.txt || '').slice(0, 40))}</text>`;
    }
  }
  return s;
}
// Proportions : joueurs et matériel réduits (un terrain de hand fait 40 m : un joueur ne doit pas en occuper la moitié)
const CR_TB = 0.62, CR_AB = 0.8;
// Trajectoires : courbe lissée passant par les points intermédiaires (a.pth) entre la position en a et en b
function crPathPoly(a, b) {
  const P = [[a.x, a.y]].concat(Array.isArray(a.pth) ? a.pth : [], [[b.x, b.y]]);
  if (P.length === 2) return P;
  const out = [P[0]];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let n = 1; n <= 8; n++) {
      const t = n / 8, t2 = t * t, t3 = t2 * t;
      const f = j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  return out;
}
function crPolyAt(poly, u) {
  const seg = []; let L = 0;
  for (let i = 1; i < poly.length; i++) { const d = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]); seg.push(d); L += d; }
  if (L < 1e-6) return poly[poly.length - 1];
  let target = Math.max(0, Math.min(1, u)) * L;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) { const r = seg[i] ? Math.min(1, target / seg[i]) : 1; return [poly[i][0] + (poly[i + 1][0] - poly[i][0]) * r, poly[i][1] + (poly[i + 1][1] - poly[i][1]) * r]; }
    target -= seg[i];
  }
  return poly[poly.length - 1];
}
function crRdp(pts, tol) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1e-9;
  let dm = 0, ix = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((pts[i].x - a.x) * dy - (pts[i].y - a.y) * dx) / L; if (d > dm) { dm = d; ix = i; } }
  if (dm > tol) { const l = crRdp(pts.slice(0, ix + 1), tol), r = crRdp(pts.slice(ix), tol); return l.slice(0, -1).concat(r); }
  return [a, b];
}
// Points intermédiaires (max 6) d'un tracé au doigt ; vide si le tracé est quasi droit
function crSimplifyMid(pts) {
  let tol = 3, r = crRdp(pts, tol);
  while (r.length - 2 > 6 && tol < 60) { tol *= 1.4; r = crRdp(pts, tol); }
  return r.slice(1, -1).map(q => [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]);
}
// Trajets de l'image courante vers la suivante (pointillés + flèche), pour l'éditeur et la fiche
function crGhostSvg(els, next, ks, th, skip) {
  const nm = {}; next.forEach(z => { if (z.x1 == null) nm[z.id] = z; });
  let out = '';
  els.forEach(a => {
    if (a.x1 != null) return;
    const b = nm[a.id]; if (!b) return;
    if (Math.hypot(b.x - a.x, b.y - a.y) < 1.5 && !(Array.isArray(a.pth) && a.pth.length)) return;
    if (a.t === 'ball' && a.hold && a.hold === b.hold) return;
    if (a.t !== 'ball') out += `<g style="pointer-events:none;" opacity="0.32">${crTokenSvg({ ...a, x: b.x, y: b.y }, ks / 0.8 * CR_TB * (parseFloat(a.s) || 1), th)}</g>`;
    if (skip && skip[a.id]) return;
    const poly = crPathPoly(a, b), n = poly.length, e = poly[n - 1], q = poly[Math.max(0, n - 3)];
    const dx = e[0] - q[0], dy = e[1] - q[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hl = 5 * ks, hw = 2.7 * ks;
    const bx = e[0] - ux * hl, by = e[1] - uy * hl;
    out += `<g style="pointer-events:none;" opacity="0.7"><path d="M${poly.map(z => z[0].toFixed(1) + ' ' + z[1].toFixed(1)).join(' L')}" fill="none" stroke="${th.arrow}" stroke-width="${1.05 * ks}" stroke-dasharray="${3 * ks} ${3 * ks}" stroke-linecap="round" stroke-linejoin="round"/><polygon points="${e[0]},${e[1]} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}" fill="${th.arrow}"/></g>`;
  });
  return out;
}
// Rendu d'une liste d'éléments sur un terrain. o: {edit, sels, arrows (défaut true), sc, next}
function crElsSvg(mode, els, o) {
  o = o || {};
  const k0 = CR_COURT[mode].k, th = CR_TH[o.th || 'dark'], sc = o.sc || 1;
  const rank = e => e.x1 != null ? 0 : (e.t === 'ball' ? 2 : (e.t === 'zone' || e.t === 'echelle' ? -1 : (e.t === 'pen' || e.t === 'text' ? 3 : 1)));
  const order = els.map((e, i) => i).sort((a, b) => (rank(els[a]) - rank(els[b])) || (a - b));
  let body = '';
  if (o.next) { const skip = {}; els.forEach(z => { if (z.x1 != null && Array.isArray(z.lnk)) z.lnk.forEach(i => { skip[i] = 1; }); }); body += crGhostSvg(els, o.next, k0 * sc * 0.8, th, skip); }
  order.forEach(i => {
    const e = els[i], isA = e.x1 != null;
    if (isA && o.arrows === false) return;
    const k = k0 * sc * (parseFloat(e.s) || 1) * (isA ? CR_AB : CR_TB);
    const selected = o.sels && o.sels.includes(e.id), single = o.sels && o.sels.length === 1;
    if (isA) {
      body += `<g data-id="${e.id}">${o.edit ? `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="transparent" stroke-width="${Math.max(18 * k, 14 * k0)}"/>` : ''}${crArrowSvg(e, k, th)}</g>`;
      if (selected && single) body += `<circle data-h="1" data-id="${e.id}" cx="${e.x1}" cy="${e.y1}" r="${Math.max(6 * k, 6 * k0)}" fill="${th.svgBg}" stroke="${th.sel}" stroke-width="2.4"/><circle data-h="2" data-id="${e.id}" cx="${e.x2}" cy="${e.y2}" r="${Math.max(6 * k, 6 * k0)}" fill="${th.svgBg}" stroke="${th.sel}" stroke-width="2.4"/>`;
    } else {
      const dr = CR_DRAWT.includes(e.t);
      body += `<g data-id="${e.id}" ${e.o != null ? `opacity="${e.o}"` : ''}>${o.edit && !dr ? `<circle cx="${e.x}" cy="${e.y}" r="${e.t === 'ball' ? Math.max(10 * k, 5.5 * k0) : Math.max(14 * k, 9 * k0)}" fill="transparent"/>` : ''}${crTokenSvg(e, k, th)}</g>`;
      if (selected && dr && e.t === 'echelle') {
        const sg = parseFloat(e.s) || 1, Ls = (+e.L || 20) * sg, Ws = 3.4 * sg, pd = 1.8 * k0, a = (+e.a || 0) * Math.PI / 180;
        body += `<rect transform="rotate(${+e.a || 0} ${e.x} ${e.y})" x="${e.x - Ls - pd}" y="${e.y - Ws - pd}" width="${Ls * 2 + pd * 2}" height="${Ws * 2 + pd * 2}" fill="none" stroke="${th.sel}" stroke-width="1.6" stroke-dasharray="3.5 2.6" style="pointer-events:none;"/>`;
        if (single) body += `<circle data-h="l" data-id="${e.id}" cx="${e.x + Math.cos(a) * Ls}" cy="${e.y + Math.sin(a) * Ls}" r="${Math.max(6 * k, 6 * k0)}" fill="${th.svgBg}" stroke="${th.sel}" stroke-width="2.4"/>`;
      } else if (selected && dr) {
        const b = crDrawBox(e, k0, sc), pd = 2.2 * k0;
        body += `<rect x="${b.x0 - pd}" y="${b.y0 - pd}" width="${b.x1 - b.x0 + pd * 2}" height="${b.y1 - b.y0 + pd * 2}" fill="none" stroke="${th.sel}" stroke-width="1.6" stroke-dasharray="3.5 2.6" style="pointer-events:none;"/>`;
        if (single && e.t === 'zone') body += `<circle data-h="z" data-id="${e.id}" cx="${b.x1}" cy="${b.y1}" r="${Math.max(6 * k, 6 * k0)}" fill="${th.svgBg}" stroke="${th.sel}" stroke-width="2.4"/>`;
      } else if (selected) body += `<circle cx="${e.x}" cy="${e.y}" r="${Math.max(11.5 * k, 6.5 * k0)}" fill="none" stroke="${th.sel}" stroke-width="1.8" stroke-dasharray="3.5 2.6" style="pointer-events:none;"/>`;
    }
  });
  return crCourtSvg(mode, th) + body;
}
function crSvgStatic(schema, fi, thName) {
  const s = crNormSchema(schema), c = CR_COURT[s.mode];
  const fx = Math.min(fi || 0, s.frames.length - 1), els = (s.frames[fx] || s.frames[0]).els;
  const th = CR_TH[thName || 'dark'], nx = s.frames[fx + 1];
  return `<svg viewBox="${c.vb.join(' ')}" style="width:100%;display:block;background:${th.svgBg};border-radius:10px;">${crElsSvg(s.mode, els, { th: thName || 'dark', sc: s.sc, next: nx ? nx.els : null })}</svg>`;
}
// Mouvements de l'image fa vers fb : éléments qui se déplacent (hors ballon simplement porté)
function crMovers(fa, fb) {
  const bm = {}; fb.els.forEach(z => { if (z.x1 == null) bm[z.id] = z; });
  return fa.els.filter(a => {
    if (a.x1 != null || CR_DRAWT.includes(a.t)) return false;
    const b = bm[a.id]; if (!b) return false;
    if (a.t === 'ball' && Array.isArray(a.legs) && a.legs.length) return false;
    if (a.t === 'ball' && a.hold && a.hold === b.hold) return false;
    return Math.hypot(b.x - a.x, b.y - a.y) >= 1.5 || (Array.isArray(a.pth) && a.pth.length > 0);
  });
}
// Ordre de départ des mouvements (a.q : ordre d'enregistrement ; à défaut, ordre de création des éléments)
function crOrderInfo(fa, fb) {
  const mv = crMovers(fa, fb), idx = {}; fa.els.forEach((z, i) => { idx[z.id] = i; });
  const qOf = a => (a.q != null && isFinite(+a.q)) ? +a.q : 1000 + idx[a.id];
  const qs = [...new Set(mv.map(qOf))].sort((x, y) => x - y), ranks = {};
  mv.forEach(a => { ranks[a.id] = qs.indexOf(qOf(a)); });
  return { mv, ranks, n: qs.length, qs, qOf };
}
const CR_BASE_MS = 1800;
// Plan d'une transition : fenêtres des mouvements + passes enchaînées du ballon (a.legs : [{h:receveur|null, x, y, f:fraction de la course du passeur où part la passe}])
function crTrans(fa, fb) {
  const ord = crOrderInfo(fa, fb), n = Math.max(1, ord.n), dur = 1 / (1 + 0.85 * (n - 1)), st = 0.85 * dur;
  const df = Math.max(0.1, 0.4 * dur);
  const win = id => { const r = ord.ranks[id]; return r == null ? null : [r * st, r * st + dur]; };
  const plans = {}; let T = 1;
  fa.els.forEach(a => {
    if (a.x1 != null || a.t !== 'ball' || !Array.isArray(a.legs) || !a.legs.length) return;
    let prev = 0, holder = a.hold || null; const legs = [];
    a.legs.forEach(L => {
      const f = L.f == null ? 1 : L.f, wp = holder ? win(holder) : null, wr = L.h ? win(L.h) : null;
      let ts;
      if (wp) ts = wp[0] + f * (wp[1] - wp[0]);
      else if (wr) ts = wr[0] + 0.7 * (wr[1] - wr[0]) - df;
      else ts = prev;
      ts = Math.max(ts, prev, 0);
      const te = ts + df;
      legs.push({ ...L, from: holder, ts, te }); prev = te; holder = L.h || null; T = Math.max(T, te);
    });
    plans[a.id] = legs;
  });
  return { ord, n, dur, st, plans, T };
}
function crInterp(fa, fb, t) {
  const out = [], pos = {}, paths = {};
  const bmap = {}; fb.els.forEach(x => { if (x.x1 == null) bmap[x.id] = x; });
  const amap = {}; fa.els.forEach(x => { amap[x.id] = x; });
  // chaque mouvement démarre quand le précédent se termine (très léger chevauchement) ; « = Avec le précédent » les rend simultanés
  // tt : temps interne (0 → T) ; T dépasse 1 quand des passes enchaînées se terminent après le dernier mouvement
  const tr = crTrans(fa, fb), ord = tr.ord, dur = tr.dur, st = tr.st, tt = Math.max(0, Math.min(1, t)) * tr.T;
  const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const eLoc = (id, u) => { const r = ord.ranks[id]; return r == null ? ease(u) : ease((u - r * st) / dur); };
  fa.els.forEach(a => {
    if (a.x1 != null || a.t === 'ball') return;
    const b = bmap[a.id];
    if (b) {
      const poly = crPathPoly(a, b); let L = 0; for (let i = 1; i < poly.length; i++) L += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
      poly.len = L; paths[a.id] = poly;
      const q = crPolyAt(poly, eLoc(a.id, tt)); pos[a.id] = q; out.push({ ...a, x: q[0], y: q[1] });
    } else out.push({ ...a, o: Math.max(0, 1 - t * 2) });
  });
  const posOf = (id, u) => crPolyAt(paths[id], eLoc(id, u));
  // rebonds du ballon pendant un dribble (un rebond environ tous les 14 unités parcourues)
  const bounce = (ha, id, u) => { const el = eLoc(id, u); return (ha.dr && paths[id] && paths[id].len > 0 && el > 0 && el < 1) ? Math.abs(Math.sin(Math.PI * paths[id].len * el / 14)) * 4.5 : 0; };
  fa.els.forEach(a => {
    if (a.x1 != null || a.t !== 'ball') return;
    const b = bmap[a.id], ha = a.hold ? amap[a.hold] : null;
    const plan = b ? tr.plans[a.id] : null;
    if (plan) {
      // passes enchaînées : porté par le porteur, vol vers le receveur (qui peut être en pleine course), porté par lui, vol vers le suivant…
      const o0 = ha ? [a.x - ha.x, a.y - ha.y] : [0, 0], hb = b.hold ? bmap[b.hold] : null, oF = hb ? [b.x - hb.x, b.y - hb.y] : o0;
      const carried = (id, u) => {
        const h = amap[id]; if (!h) return [a.x, a.y];
        const o = id === b.hold ? oF : o0, q = paths[id] ? posOf(id, u) : [h.x, h.y];
        return [q[0] + o[0], q[1] + o[1] - bounce(h, id, u)];
      };
      let p = null;
      if (tt <= plan[0].ts) p = carried(a.hold, tt);
      else for (let i = 0; i < plan.length && !p; i++) {
        const L = plan[i], nx = plan[i + 1] ? plan[i + 1].ts : Infinity;
        if (tt < L.te) {
          const s0 = carried(L.from, L.ts), e0 = L.h ? carried(L.h, L.te) : [L.x, L.y], u = (tt - L.ts) / (L.te - L.ts);
          p = [s0[0] + (e0[0] - s0[0]) * u, s0[1] + (e0[1] - s0[1]) * u];
        } else if (tt < nx) p = L.h ? carried(L.h, tt) : [L.x, L.y];
      }
      out.push({ ...a, x: p[0], y: p[1] }); return;
    }
    if (b && ha && paths[a.hold]) {
      const dx = a.x - ha.x, dy = a.y - ha.y;
      if (a.hold === b.hold) {
        // ballon porté (et dribblé si le joueur est en dribble : rebonds réguliers pendant la course)
        const q = pos[a.hold];
        out.push({ ...a, x: q[0] + dx, y: q[1] + dy - bounce(ha, a.hold, tt) }); return;
      }
      // passe ou tir : porté par le passeur jusqu'au départ, puis vol en ligne droite vers la destination
      const r = ord.ranks[a.id], ts = r == null ? 0 : r * st;
      if (tt <= ts) { const q = posOf(a.hold, tt); out.push({ ...a, x: q[0] + dx, y: q[1] + dy - bounce(ha, a.hold, tt) }); return; }
      const s0 = posOf(a.hold, ts), x0 = s0[0] + dx, y0 = s0[1] + dy - bounce(ha, a.hold, ts), u = ease((tt - ts) / dur);
      out.push({ ...a, x: x0 + (b.x - x0) * u, y: y0 + (b.y - y0) * u }); return;
    }
    if (b) { const q = crPolyAt(crPathPoly(a, b), eLoc(a.id, tt)); out.push({ ...a, x: q[0], y: q[1] }); }
    else out.push({ ...a, o: Math.max(0, 1 - t * 2) });
  });
  fb.els.forEach(b => { if (b.x1 == null && !amap[b.id]) out.push({ ...b, o: Math.max(0, t * 2 - 1) }); });
  return out;
}
// Chronologie de lecture : durée de chaque transition selon le nombre de mouvements successifs, courte pause à chaque image clé
function crTimeline(frames) {
  const segs = []; let acc = 0;
  for (let i = 0; i < frames.length; i++) {
    let m = 0, dur;
    if (i < frames.length - 1) { const tr = crTrans(frames[i], frames[i + 1]); m = CR_BASE_MS * (1 + 0.6 * Math.max(0, tr.ord.n - 1)) * tr.T; dur = m + 350; }
    else dur = 900;
    segs.push({ i, start: acc, dur, m }); acc += dur;
  }
  return { segs, total: acc };
}
// Fin d'une lecture unique : on s'arrête un instant sur la dernière image
function crTimeEnd(tl) { const l = tl.segs[tl.segs.length - 1]; return l.start + 500; }
function crTimeAt(tl, ms) {
  const x = ((ms % tl.total) + tl.total) % tl.total;
  for (const sg of tl.segs) if (x < sg.start + sg.dur) return { i: sg.i, t: sg.m ? Math.min(1, (x - sg.start) / sg.m) : 0 };
  return { i: tl.segs.length - 1, t: 0 };
}
// Lecture d'animation dans un conteneur (page d'exercice)
let crPlayRaf = null;
function crPlayStop() { if (crPlayRaf) cancelAnimationFrame(crPlayRaf); crPlayRaf = null; }
function crPlayInto(boxId, schema, speed) {
  crPlayStop();
  const s = crNormSchema(JSON.parse(JSON.stringify(schema))), box = document.getElementById(boxId);
  if (!box || s.frames.length < 2) return;
  const c = CR_COURT[s.mode], tl = crTimeline(s.frames), t0 = performance.now();
  const step = now => {
    if (!document.body.contains(box)) { crPlayRaf = null; return; }
    const ms = (now - t0) * (speed || 1), done = ms >= crTimeEnd(tl);
    const q = crTimeAt(tl, done ? tl.segs[tl.segs.length - 1].start : ms), i = q.i, t = q.t;
    const els = (i + 1 < s.frames.length) ? crInterp(s.frames[i], s.frames[i + 1], t) : s.frames[i].els.filter(x => x.x1 == null);
    box.innerHTML = `<svg viewBox="${c.vb.join(' ')}" style="width:100%;display:block;background:${CR_TH.dark.svgBg};border-radius:10px;">${crElsSvg(s.mode, els, { sc: s.sc })}</svg>`;
    if (done) { crPlayRaf = null; const bt = document.getElementById('cr-ex-play'); if (bt) bt.textContent = '↺ Rejouer'; return; }
    crPlayRaf = requestAnimationFrame(step);
  };
  crPlayRaf = requestAnimationFrame(step);
}
function crExTogglePlay() {
  const x = crCurEx(), btn = document.getElementById('cr-ex-play');
  if (crPlayRaf) { crPlayStop(); document.getElementById('cr-ex-schema').innerHTML = crSvgStatic(x.schema, 0); if (btn) btn.textContent = '▶ Lecture'; return; }
  crPlayInto('cr-ex-schema', x.schema, 1);
  if (btn) btn.textContent = '⏸ Pause';
}
function crFicheSchema(schema) {
  const s = crNormSchema(schema);
  if (!s.frames.some(f => f.els.length)) return '';
  const n = s.frames.length;
  if (n === 1) return `<div style="max-width:420px;margin-top:6px;">${crSvgStatic(s, 0, 'print')}</div>`;
  const keys = [];
  const m = Math.min(6, n);
  for (let i = 0; i < m; i++) { const idx = m === 1 ? 0 : Math.round(i * (n - 1) / (m - 1)); if (!keys.includes(idx)) keys.push(idx); }
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:520px;margin-top:6px;">${keys.map(i => `<div><div style="font-size:10px;color:#6a7d95;margin-bottom:2px;">Image ${i + 1}/${n}</div>${crSvgStatic(s, i, 'print')}</div>`).join('')}</div><div style="font-size:11px;color:#6a7d95;margin-top:4px;">Animation de ${n} images — visible dans l'appli (Créateur → exercice → ▶ Lecture).</div>`;
}

