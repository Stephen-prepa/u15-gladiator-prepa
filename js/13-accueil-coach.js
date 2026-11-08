// Prépa U15 HBCCS — js/13-accueil-coach.js — dernière modification : version z36 (08/11/2026)
// ===== Partage en GIF d'un schéma de la bibliothèque (module Schémas) =====
// Même principe que l'ancien export : une image par instant de l'animation (celle que montre le lecteur), puis GIF 256 couleurs ; image fixe (PNG) s'il n'y a rien à animer.
function schGifPalette(svgs) {
  const cols = [], seen = new Set(), add = (r, g, b) => { const k = (r << 16) | (g << 8) | b; if (cols.length < 256 && !seen.has(k)) { seen.add(k); cols.push([r, g, b]); } };
  add(255, 255, 255); add(0, 0, 0); add(245, 196, 0); add(10, 22, 40); add(138, 160, 192);
  const hx = new Set();
  svgs.forEach(sv => (sv.match(/#[0-9a-fA-F]{6}\b/g) || []).forEach(h => { const l = h.toLowerCase(); if (hx.has(l) || hx.size >= 110) return; hx.add(l); add(parseInt(l.slice(1, 3), 16), parseInt(l.slice(3, 5), 16), parseInt(l.slice(5, 7), 16)); }));
  const lv = [0, 64, 128, 191, 255];
  for (const r of lv) for (const g of lv) for (const b of lv) add(r, g, b);
  while (cols.length < 256) cols.push([0, 0, 0]);
  return cols;
}
async function schBuildGif(name, drawings) {
  const tl = schTimeline(drawings), W = 400;
  const vbs = {}; let H = 0;
  tl.ph.forEach(p => { const v = schView(p.d.view); vbs[p.d.view] = v.vb; H = Math.max(H, Math.round(W * v.vb[3] / v.vb[2])); });
  H = Math.min(H, 720);
  const dt0 = 0.08, maxN = 260, dt = Math.max(dt0, tl.total / maxN);
  const times = []; for (let t = 0; t < tl.total - 1e-6; t += dt) times.push(t);
  const holds = new Set();
  tl.ph.forEach(p => { if (p.k < tl.n - 1) { const tb = p.T + p.D; holds.add(Math.round(tb * 1000)); if (!times.some(x => Math.abs(x - tb) < 1e-4)) times.push(tb); } });
  times.push(tl.total); times.sort((a, b) => a - b);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const label = String(name || 'Schéma').slice(0, 36);
  const svgFor = t => {
    const r = schAt(tl, t), vb = vbs[r.view] || schView(r.view).vb, sc = Math.min(W / vb[2], H / vb[3]), dw = Math.round(vb[2] * sc), dh = Math.round(vb[3] * sc);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${dw}" height="${dh}"><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="#fff"/>${schCourtSvg(r.view)}${schBodySvg(r.frame)}</svg>`;
    return { svg, dw, dh, k: r.k };
  };
  const svgs = times.map(svgFor);
  const draw = async f => {
    const im = await crLoadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(f.svg));
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(im, Math.round((W - f.dw) / 2), Math.round((H - f.dh) / 2), f.dw, f.dh);
    ctx.font = 'bold 13px Arial, sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    const cap = label + (tl.n > 1 ? '  ·  ' + (f.k + 1) + '/' + tl.n : '');
    ctx.fillStyle = 'rgba(10,22,40,0.88)'; ctx.fillRect(4, 3, ctx.measureText(cap).width + 10, 20);
    ctx.fillStyle = '#F5C400'; ctx.fillText(cap, 9, 6);
    ctx.font = 'bold 10px Arial, sans-serif'; ctx.fillStyle = '#8AA0C0'; ctx.textAlign = 'right'; ctx.fillText('HBCCS U15', W - 8, H - 14); ctx.textAlign = 'left';
  };
  const pal = schGifPalette(svgs.map(f => f.svg).concat(tl.ph.map(p => schCourtSvg(p.d.view)))), lut = new Uint16Array(32768).fill(0xFFFF);
  const near = key => {
    const r = ((key >> 10) & 31) * 8 + 4, g = ((key >> 5) & 31) * 8 + 4, bl = (key & 31) * 8 + 4; let best = 0, bd = 1e9;
    for (let i = 0; i < 256; i++) { const q = pal[i], d = (q[0] - r) * (q[0] - r) + (q[1] - g) * (q[1] - g) + (q[2] - bl) * (q[2] - bl); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const grab = () => {
    const d = ctx.getImageData(0, 0, W, H).data, idx = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) { const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3); let v = lut[key]; if (v === 0xFFFF) { v = near(key); lut[key] = v; } idx[j] = v; }
    return idx;
  };
  const frames = [];
  for (let i = 0; i < times.length; i++) {
    await draw(svgs[i]);
    const idx = grab(), last = i === times.length - 1;
    let delay = last ? 250 : Math.max(4, Math.round((times[i + 1] - times[i]) * 100));
    if (i === 0) delay = Math.max(delay, 40);
    if (holds.has(Math.round(times[i] * 1000))) delay = Math.max(delay, 90);
    const prev = frames[frames.length - 1];
    if (prev && prev.idx.length === idx.length && prev.idx.every((v, j) => v === idx[j])) prev.delay = Math.min(65535, prev.delay + delay);
    else frames.push({ idx, delay });
  }
  if (frames.length < 2) {
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    return { blob, type: 'image/png', ext: 'png' };
  }
  const bytes = crGifEncode(frames, W, H, pal);
  return { blob: new Blob([bytes], { type: 'image/gif' }), type: 'image/gif', ext: 'gif', bytes, frames: frames.length, w: W, h: H };
}
async function schShareGif(name, drawings, btn) {
  if (typeof schPl !== 'undefined' && schPl && schPl.ro) return;   // lecteur en lecture seule (joueurs) : pas d'export GIF
  const lab = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Création…'; }
  try {
    const m = await schBuildGif(name, drawings);
    const slug = String(name || 'schema').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'schema';
    m.name = slug + '.' + m.ext;
    if (crShareMedia && crShareMedia.url) URL.revokeObjectURL(crShareMedia.url);
    m.url = URL.createObjectURL(m.blob);
    crShareMedia = m;
    document.getElementById('cr-modal-inner').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><h3 style="font-size:17px;color:var(--blanc);">${m.ext === 'gif' ? 'Animation prête' : 'Image prête'}</h3><button type="button" class="cr-btn sm" onclick="crCloseModal()">✕</button></div>
      <img src="${m.url}" alt="${crEsc(name || '')}" style="width:100%;max-height:52vh;object-fit:contain;border-radius:10px;display:block;background:#fff;border:1px solid #D5DEEA;">
      <div style="font-size:12px;color:var(--gris-texte);margin:8px 0;">${m.ext === 'gif' ? (m.frames + ' vues · ' + Math.round(m.blob.size / 1024) + ' Ko · ') : ''}Envoie-la par WhatsApp, SMS ou mail, ou enregistre-la.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="cr-btn primary" onclick="crDoShare()">📤 Partager</button><button type="button" class="cr-btn" onclick="crDoDownload()">⬇ Enregistrer</button></div>`;
    const mo = document.getElementById('cr-modal'); mo.style.zIndex = '100000'; mo.classList.add('show');
  } catch (e) {
    alert("Impossible de créer l'animation (" + (e.message || e) + ').');
  }
  if (btn) { btn.disabled = false; btn.textContent = lab; }
}
function schShareCur(btn) { schEnsure(); const ex = schDemo[schUi.ex]; if (ex) schShareGif(ex.name, ex.drawings, btn); }
function crSchShare(t, btn) { const L = crSchHolder(t).schemaLib; if (L) schShareGif(L.name, L.drawings, btn); }

// ---------- Scores à saisir (coach) ----------
// ---------- Tableau de bord d'accueil coach ----------
// ===================== SUIVI COACH — SÉANCE MAISON EXCEPTIONNELLE =====================
async function homeSessionTrackingLoad() {
  const box = document.getElementById('dash-sm1-box');
  const wrap = document.getElementById('dash-sm1-wrap');
  if (!box || !wrap) return;
  const todayStr = todayDateStr();
  const homeSeances = Array.from(document.querySelectorAll('#screen-home .seance[data-only-date]'));
  const activeEl = homeSeances.find(el => homeSeanceActiveOn(el, todayStr));
  if (!activeEl) { box.style.display = 'none'; return; }
  const sid = activeEl.id.replace(/^seance-/, '');
  box.style.display = 'block';
  wrap.innerHTML = '<div style="text-align:center;padding:12px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/completions?session_id=eq.' + encodeURIComponent(sid) + '&select=player_code,difficulty,completed_at&order=completed_at.desc', { headers: coachAuthHeaders() });
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:12px;color:var(--gris-texte);font-size:12px;">Personne n\'a encore fait la séance.</div>';
      return;
    }
    const codesParam = rows.map(r => encodeURIComponent(r.player_code)).join(',');
    const pRes = await fetch(SB_URL + '/rest/v1/players?code=in.(' + codesParam + ')&select=code,name', { headers: coachAuthHeaders() });
    const players = pRes.ok ? await pRes.json() : [];
    const nameByCode = {};
    players.forEach(p => { nameByCode[p.code] = p.name; });
    const DIFF_EMOJI = { facile: '😊', correct: '😐', dur: '🥵' };
    wrap.innerHTML = `<div style="font-size:11px;color:var(--gris-texte);margin-bottom:8px;">${rows.length} joueur${rows.length > 1 ? 's' : ''} — séance terminée</div>` +
      rows.map(r => {
        const name = nameByCode[r.player_code] || r.player_code;
        const t = new Date(r.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const emoji = r.difficulty && DIFF_EMOJI[r.difficulty] ? ' ' + DIFF_EMOJI[r.difficulty] : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;">
          <span style="color:var(--blanc);font-weight:700;">${escapeSvgText(name)}${emoji}</span>
          <span style="color:var(--gris-texte);">${t}</span>
        </div>`;
      }).join('');
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:12px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}

// ===================== ACCUEIL COACH — RAPPEL PROCHAIN MATCH + DERNIER ENTRAÎNEMENT =====================
async function dashboardNextMatchLoad() {
  const wrap = document.getElementById('dash-next-match-box');
  if (!wrap) return;
  wrap.innerHTML = '';
  try {
    const res = await fetch(SB_URL + '/rest/v1/matches?select=*&debut=gte.' + new Date().toISOString() + '&order=debut.asc&limit=10', { headers: SB_HEADERS });
    const rows = res.ok ? await res.json() : [];
    const next = {};
    rows.forEach(m => { if (!next[m.equipe]) next[m.equipe] = m; });
    const chips = [1, 2].filter(eq => next[eq]).map(eq => {
      const m = next[eq];
      const info = homeParseOpponent(m.titre);
      return `<div style="flex:1;background:var(--noir);border-radius:8px;padding:8px 10px;">
        <div style="font-size:10px;color:var(--gris-texte);text-transform:uppercase;font-weight:800;">Équipe ${eq} · ${homeCountdown(m.debut)}</div>
        <div style="font-size:12.5px;color:var(--blanc);font-weight:700;margin-top:2px;">${info.home ? 'vs' : 'à'} ${escapeSvgText(info.opp)}</div>
        <div style="font-size:11px;color:var(--gris-clair);">${homeFmtDateShort(m.debut)}</div>
      </div>`;
    }).join('');
    if (chips) {
      wrap.innerHTML = '<div class="section-title" style="margin:0 0 8px;">🔔 Prochain match</div><div style="display:flex;gap:8px;">' + chips + '</div>';
    }
  } catch (e) { /* pas grave, le rappel n'est qu'indicatif */ }
}
// MIS DE CÔTÉ (z36) : plus appelée tant que le bloc #dash-last-session-box est masqué. Conservée pour pouvoir la ressortir.
async function dashboardLastSessionLoad() {
  const wrap = document.getElementById('dash-last-session-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:4px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  try {
    await ensureCoachSession();
    const today = dateStr(new Date());
    const [noteRes, compDateRes] = await Promise.all([
      fetch(SB_URL + '/rest/v1/session_notes?select=session_date,content&session_date=lte.' + today + '&order=session_date.desc&limit=1', { headers: coachAuthHeaders() }),
      fetch(SB_URL + '/rest/v1/outils_composition?select=session_date&session_date=lte.' + today + '&order=session_date.desc&limit=1', { headers: coachAuthHeaders() }),
    ]);
    const noteRows = noteRes.ok ? await noteRes.json() : [];
    const compDateRows = compDateRes.ok ? await compDateRes.json() : [];
    const note = noteRows[0] || null;
    const lastCompDate = compDateRows[0] ? compDateRows[0].session_date : null;
    const lastDate = [note ? note.session_date : null, lastCompDate].filter(Boolean).sort().reverse()[0] || null;

    if (!lastDate) {
      wrap.innerHTML = '<div style="text-align:center;padding:4px;color:var(--gris-texte);font-size:12px;">Aucune séance enregistrée pour le moment.</div>';
      return;
    }

    let teamsHtml = '';
    if (lastCompDate === lastDate) {
      const [compRes, goalsRes] = await Promise.all([
        fetch(SB_URL + '/rest/v1/outils_composition?select=player_code,team_index&session_date=eq.' + lastCompDate, { headers: coachAuthHeaders() }),
        fetch(SB_URL + '/rest/v1/outils_goals?select=team_index,player_code,points&session_date=eq.' + lastCompDate, { headers: coachAuthHeaders() }),
      ]);
      const compRows = compRes.ok ? await compRes.json() : [];
      const goalRows = goalsRes.ok ? await goalsRes.json() : [];
      const codes = [...new Set(compRows.map(r => r.player_code))];
      const nameByCode = {};
      if (codes.length) {
        const pRes = await fetch(SB_URL + '/rest/v1/players?code=in.(' + codes.map(encodeURIComponent).join(',') + ')&select=code,name', { headers: coachAuthHeaders() });
        const pRows = pRes.ok ? await pRes.json() : [];
        pRows.forEach(p => { nameByCode[p.code] = p.name; });
      }
      const maxIdx = compRows.length ? Math.max(...compRows.map(r => r.team_index)) : -1;
      const teams = [];
      for (let i = 0; i <= maxIdx; i++) teams.push([]);
      compRows.forEach(r => { if (teams[r.team_index]) teams[r.team_index].push(nameByCode[r.player_code] || r.player_code); });
      const hasGoals = goalRows.length > 0;
      const scoreByTeam = teams.map((_, i) => goalRows.filter(g => g.team_index === i).reduce((s, g) => s + (g.points != null ? g.points : 1), 0));
      const scorerTally = {};
      goalRows.forEach(g => {
        const pts = g.points != null ? g.points : 1;
        if (g.player_code && pts > 0) scorerTally[g.player_code] = (scorerTally[g.player_code] || 0) + pts;
      });
      let topScorer = null, topScore = 0;
      Object.entries(scorerTally).forEach(([code, n]) => { if (n > topScore) { topScore = n; topScorer = code; } });
      teamsHtml = '<div style="margin-top:10px;display:flex;flex-direction:column;gap:5px;">' +
        teams.map((t, i) => `<div style="font-size:12px;color:var(--gris-clair);"><span style="font-weight:800;color:${TEAM_COLORS[i]};">Équipe ${i + 1}${hasGoals ? ' · ' + scoreByTeam[i] : ''}</span> — ${t.length ? t.map(escapeSvgText).join(', ') : '(vide)'}</div>`).join('') +
        (topScorer ? `<div style="font-size:11px;color:var(--jaune);margin-top:2px;">⚽ Meilleur buteur : ${escapeSvgText(nameByCode[topScorer] || topScorer)} (${topScore})</div>` : '') +
        '</div>';
    }

    const themeText = (note && note.session_date === lastDate && note.content && note.content.trim()) ? note.content.trim() : null;
    wrap.innerHTML = `<div style="font-size:11px;color:var(--jaune);font-weight:800;margin-bottom:4px;">${lastDate}</div>` +
      (themeText ? `<div style="font-size:13px;color:var(--gris-clair);">${escapeSvgText(themeText)}</div>` : '<div style="font-size:12px;color:var(--gris-texte);">(pas de thème noté)</div>') +
      teamsHtml;
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:4px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}
async function dashboardLoad() {
  const nameEl = document.getElementById('dash-coach-name');
  if (nameEl) nameEl.textContent = coachSession ? coachSession.name : '';
  dashboardNextMatchLoad();
  scoresTodoLoad();
  // dashboardLastSessionLoad(); // MIS DE CÔTÉ (z36) : bloc « Dernier entraînement » masqué, voir index.html
  homeSessionTrackingLoad();
  loadAppSettings();
  const wrap = document.getElementById('dash-todo-list');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:16px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  try {
    await ensureCoachSession();
    const today = dateStr(new Date());
    const [scoresRes, presRes, outilsRes] = await Promise.all([
      fetch(SB_URL + '/rest/v1/matches?select=id&debut=lt.' + new Date().toISOString() + '&score_nous=is.null&ics_uid=not.like.manuel-*', { headers: coachAuthHeaders() }).catch(() => null),
      fetch(SB_URL + '/rest/v1/presences?select=id&session_date=eq.' + today + '&limit=1', { headers: coachAuthHeaders() }).catch(() => null),
      fetch(SB_URL + '/rest/v1/outils_composition?select=id&session_date=eq.' + today + '&limit=1', { headers: coachAuthHeaders() }).catch(() => null),
    ]);
    const nbScores = scoresRes && scoresRes.ok ? (await scoresRes.json()).length : 0;
    const hasPresToday = presRes && presRes.ok ? (await presRes.json()).length > 0 : false;
    const hasOutilsToday = outilsRes && outilsRes.ok ? (await outilsRes.json()).length > 0 : false;

    const rows = [];
    rows.push({
      warn: nbScores > 0, tab: 'seance', icon: nbScores > 0 ? '⚠️' : '✅',
      title: nbScores > 0 ? nbScores + ' score' + (nbScores > 1 ? 's' : '') + ' officiel' + (nbScores > 1 ? 's' : '') + ' à saisir' : 'Aucun score officiel en attente',
      sub: 'Onglet Séance — Scores à saisir',
    });
    rows.push({
      warn: !hasPresToday, tab: 'presence', icon: hasPresToday ? '✅' : '⚠️',
      title: hasPresToday ? 'Présences déjà marquées aujourd\'hui' : 'Présences pas encore marquées aujourd\'hui',
      sub: 'Onglet Présences',
    });
    rows.push({
      warn: !hasOutilsToday, tab: 'outils', icon: hasOutilsToday ? '✅' : '⚠️',
      title: hasOutilsToday ? 'Équipes du jour déjà composées' : 'Pas encore d\'équipes composées aujourd\'hui',
      sub: 'Onglet Équipes',
    });

    wrap.innerHTML = rows.map(r => `
      <div class="dash-row ${r.warn ? 'warn' : 'ok'}" onclick="coachSubtabSwitch('${r.tab}')">
        <span class="dash-icon">${r.icon}</span>
        <span class="dash-text">
          <span class="dash-title">${escapeSvgText(r.title)}</span>
          <span class="dash-sub">${escapeSvgText(r.sub)}</span>
        </span>
        <span class="dash-arrow">›</span>
      </div>
    `).join('');
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:16px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}

async function scoresTodoLoad() {
  const wrap = document.getElementById('scores-todo-list');
  wrap.innerHTML = '<div style="text-align:center;padding:8px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/matches?select=*&debut=lt.' + new Date().toISOString() + '&score_nous=is.null&order=debut.desc', { headers: coachAuthHeaders() });
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:8px;color:var(--gris-texte);font-size:12px;">Rien à saisir — tout est à jour.</div>';
      return;
    }
    wrap.innerHTML = rows.map(m => {
      const info = homeParseOpponent(m.titre);
      const d = new Date(m.debut);
      return `<div style="background:var(--gris-fonce);border-radius:8px;padding:8px 10px;">
        <div style="font-size:12px;color:var(--gris-clair);margin-bottom:6px;">Éq.${m.equipe} ${info.home ? 'vs' : 'à'} ${escapeSvgText(info.opp)} · ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="number" min="0" id="score-us-${m.id}" placeholder="Nous" style="width:60px;background:var(--noir);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px;color:var(--blanc);text-align:center;">
          <span style="color:var(--gris-texte);">–</span>
          <input type="number" min="0" id="score-them-${m.id}" placeholder="Eux" style="width:60px;background:var(--noir);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px;color:var(--blanc);text-align:center;">
          <button onclick="scoreSave('${m.id}')" style="flex:1;padding:7px;border:none;border-radius:6px;background:var(--jaune);color:#1a1a1a;font-weight:800;font-size:11px;cursor:pointer;">Enregistrer</button>
        </div>
        <input type="text" id="score-periods-${m.id}" placeholder="Tiers-temps (optionnel) ex: 6-4, 8-5, 10-9" style="width:100%;box-sizing:border-box;margin-top:6px;background:var(--noir);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px 8px;color:var(--gris-clair);font-size:11px;">
      </div>`;
    }).join('');
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:8px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}
function formatScorePeriodes(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr.map(p => p.nous + '-' + p.eux).join(', ');
}
function parseScorePeriodes(text) {
  text = (text || '').trim();
  if (!text) return undefined; // champ laisse vide -> on ne touche pas au detail existant
  const parts = text.split(',').map(s => s.trim()).filter(Boolean);
  const periodes = [];
  for (const p of parts) {
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) return null; // format invalide
    periodes.push({ nous: parseInt(m[1], 10), eux: parseInt(m[2], 10) });
  }
  return periodes.length ? periodes : undefined;
}
async function scoreSave(matchId) {
  const us = document.getElementById('score-us-' + matchId).value;
  const them = document.getElementById('score-them-' + matchId).value;
  if (us === '' || them === '') { alert('Renseigne les deux scores.'); return; }
  const periodsInput = document.getElementById('score-periods-' + matchId);
  const periodes = periodsInput ? parseScorePeriodes(periodsInput.value) : undefined;
  if (periodes === null) { alert('Format des tiers-temps invalide — exemple : 6-4, 8-5, 10-9'); return; }
  try {
    await ensureCoachSession();
    const body = { score_nous: parseInt(us, 10), score_eux: parseInt(them, 10) };
    if (periodes !== undefined) body.score_periodes = periodes;
    const res = await fetch(SB_URL + '/rest/v1/matches?id=eq.' + matchId, {
      method: 'PATCH',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('save failed');
    scoresTodoLoad();
    homeLoadMatches();
    if (document.getElementById('scores-done-editor').style.display !== 'none') scoresDoneRenderEditor();
  } catch (e) {
    alert('Erreur — impossible d\'enregistrer le score.');
  }
}
function scoresDoneOpenEditor() {
  const box = document.getElementById('scores-done-editor');
  const show = box.style.display === 'none';
  box.style.display = show ? 'block' : 'none';
  if (show) scoresDoneRenderEditor();
}
async function scoresDoneRenderEditor() {
  const wrap = document.getElementById('scores-done-list');
  wrap.innerHTML = '<div style="text-align:center;padding:8px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/matches?select=*&score_nous=not.is.null&order=debut.desc&limit=10', { headers: coachAuthHeaders() });
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:8px;color:var(--gris-texte);font-size:12px;">Aucun score enregistré pour le moment.</div>';
      return;
    }
    wrap.innerHTML = rows.map(m => {
      const info = homeParseOpponent(m.titre);
      const d = new Date(m.debut);
      return `<div style="background:var(--gris-fonce);border-radius:8px;padding:8px 10px;">
        <div style="font-size:12px;color:var(--gris-clair);margin-bottom:6px;">Éq.${m.equipe} ${info.home ? 'vs' : 'à'} ${escapeSvgText(info.opp)} · ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="number" min="0" id="score-us-${m.id}" value="${m.score_nous}" style="width:60px;background:var(--noir);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px;color:var(--blanc);text-align:center;">
          <span style="color:var(--gris-texte);">–</span>
          <input type="number" min="0" id="score-them-${m.id}" value="${m.score_eux}" style="width:60px;background:var(--noir);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px;color:var(--blanc);text-align:center;">
          <button onclick="scoreSave('${m.id}')" style="flex:1;padding:7px;border:none;border-radius:6px;background:var(--jaune);color:#1a1a1a;font-weight:800;font-size:11px;cursor:pointer;">Corriger</button>
        </div>
        <input type="text" id="score-periods-${m.id}" value="${formatScorePeriodes(m.score_periodes)}" placeholder="Tiers-temps (optionnel) ex: 6-4, 8-5, 10-9" style="width:100%;box-sizing:border-box;margin-top:6px;background:var(--noir);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px 8px;color:var(--gris-clair);font-size:11px;">
      </div>`;
    }).join('');
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:8px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}

// ---------- Résumé de séance (module simple, en attendant mieux) ----------
let seanceInited = false;
function seanceInit() {
  if (seanceInited) return;
  seanceInited = true;
  const start = new Date('2026-08-17T00:00:00');
  const today = new Date();
  const base = today < start ? start : today;
  const d = isTrainingDay(base) ? base : nextTrainingDayOnOrAfter(base);
  document.getElementById('seance-date').value = dateStr(d);
  seanceDateChanged();
  seanceLoadRecent();
}
function seanceShiftDay(delta) {
  const input = document.getElementById('seance-date');
  const d = new Date(input.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  input.value = dateStr(d);
  seanceDateChanged();
}
async function seanceDateChanged() {
  const input = document.getElementById('seance-date');
  const contentEl = document.getElementById('seance-content');
  const msgEl = document.getElementById('seance-save-msg');
  msgEl.textContent = '';
  contentEl.value = '';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/session_notes?select=content&session_date=eq.' + input.value, {
      headers: coachAuthHeaders(),
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length) contentEl.value = rows[0].content || '';
    }
  } catch (e) {}
}
async function seanceSave() {
  const input = document.getElementById('seance-date');
  const contentEl = document.getElementById('seance-content');
  const msgEl = document.getElementById('seance-save-msg');
  const btn = document.getElementById('seance-save-btn');
  btn.disabled = true; btn.textContent = 'Enregistrement...';
  try {
    const sess = await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/session_notes?on_conflict=session_date', {
      method: 'POST',
      headers: { ...coachAuthHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{
        session_date: input.value,
        content: contentEl.value,
        updated_by: coachSession ? coachSession.id : null,
        updated_at: new Date().toISOString(),
      }]),
    });
    if (!res.ok) throw new Error('save failed');
    msgEl.style.color = '#2ecc71';
    msgEl.textContent = 'Résumé enregistré ✓';
    seanceLoadRecent();
  } catch (e) {
    msgEl.style.color = '#e74c3c';
    msgEl.textContent = 'Erreur — vérifie ta connexion et réessaie.';
  }
  btn.disabled = false; btn.textContent = 'Enregistrer';
}
async function seanceLoadRecent() {
  const wrap = document.getElementById('seance-recent');
  wrap.innerHTML = '<div style="text-align:center;padding:10px;color:var(--gris-texte);font-size:12px;">Chargement...</div>';
  try {
    await ensureCoachSession();
    const res = await fetch(SB_URL + '/rest/v1/session_notes?select=session_date,content&order=session_date.desc&limit=10', {
      headers: coachAuthHeaders(),
    });
    const rows = res.ok ? await res.json() : [];
    if (!rows.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:10px;color:var(--gris-texte);font-size:12px;">Aucune séance enregistrée.</div>';
      return;
    }
    wrap.innerHTML = rows.map(r => {
      const preview = (r.content || '').trim();
      const short = preview.length > 80 ? preview.slice(0, 80) + '…' : (preview || '(vide)');
      return `<button type="button" onclick="seanceGoToDate('${r.session_date}')" style="text-align:left;background:var(--noir);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px;cursor:pointer;color:var(--gris-clair);">
        <div style="font-size:11px;font-weight:800;color:var(--jaune);margin-bottom:2px;">${r.session_date}</div>
        <div style="font-size:12px;">${escapeSvgText(short)}</div>
      </button>`;
    }).join('');
  } catch (e) {
    wrap.innerHTML = '<div style="text-align:center;padding:10px;color:#e74c3c;font-size:12px;">Erreur de chargement.</div>';
  }
}
// ---------- Séance : Créateur + Résumé réunis ----------
function seancePane(which) {
  const isC = which !== 'resume';
  document.getElementById('seance-pane-createur').style.display = isC ? '' : 'none';
  document.getElementById('seance-pane-resume').style.display = isC ? 'none' : '';
  document.getElementById('seance-seg-createur').classList.toggle('on', isC);
  document.getElementById('seance-seg-resume').classList.toggle('on', !isC);
  try { localStorage.setItem('seancePane', isC ? 'createur' : 'resume'); } catch (e) {}
  if (isC) crInit(); else seanceInit();
}
function outilsPane(which) {
  const isE = which !== 'match';
  document.getElementById('outils-pane-equipes').style.display = isE ? '' : 'none';
  document.getElementById('outils-pane-match').style.display = isE ? 'none' : '';
  document.getElementById('outils-seg-equipes').classList.toggle('on', isE);
  document.getElementById('outils-seg-match').classList.toggle('on', !isE);
  try { if (typeof outilsInit === 'function') outilsInit(); } catch (e) {}
}
function outilsPaneInit() { outilsPane('equipes'); }
function seancePaneInit() {
  let w = 'createur';
  try { w = localStorage.getItem('seancePane') || 'createur'; } catch (e) {}
  seancePane(w);
}
function seancePlanText(p) {
  let t = '🗂️ Séance préparée : ' + p.title + ' (' + crFmtDur(crTotal(p)) + ')';
  const meta = [];
  if (p.theme) meta.push('Thème : ' + p.theme);
  if (p.objectif_principal) meta.push('Objectif : ' + p.objectif_principal);
  if (meta.length) t += '\n' + meta.join(' · ');
  (p.blocks || []).forEach(b => {
    const ex = (b.exercises || []).map(x => x.name).filter(Boolean).join(', ');
    t += '\n• ' + b.name + ' — ' + crBlockMin(b) + ' min' + (ex ? ' : ' + ex : '');
  });
  return t;
}
async function seanceImportOpen() {
  if (!crLoaded) await crLoadPlans();
  const date = document.getElementById('seance-date').value;
  const plans = crPlans.filter(p => !p.is_template && p.status !== 'archivee')
    .sort((a, b) => ((b.seance_date === date) - (a.seance_date === date)) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  const list = plans.length ? plans.map(p => `<button type="button" class="cr-tpl" onclick="seanceImportPlan('${p.id}')"><b>${crEsc(p.title)}</b><span>${p.seance_date ? '📅 ' + crEsc(p.seance_date.split('-').reverse().join('/')) + ' · ' : ''}${(p.blocks || []).length} blocs</span><i>${crFmtDur(crTotal(p))}${p.seance_date === date ? ' · prévue ce jour' : ''}</i></button>`).join('')
    : '<div style="color:var(--gris-texte);font-size:13px;padding:10px 0;">Aucune séance préparée pour l\'instant — crée-la dans l\'onglet Créateur.</div>';
  document.getElementById('cr-modal-inner').innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;"><h3 style="font-size:18px;color:var(--blanc);">Importer une séance</h3><button type="button" class="cr-btn sm" onclick="crCloseModal()">✕</button></div><div style="font-size:12px;color:var(--gris-texte);margin:6px 0 12px;">Le déroulé est ajouté au résumé de la date affichée.</div>' + list;
  document.getElementById('cr-modal').classList.add('show');
}
async function seanceImportPlan(id, fromEditor) {
  const p = crPlans.find(x => x.id === id); if (!p) return;
  if (fromEditor && typeof crSaveNow === 'function') await crSaveNow();
  crCloseModal();
  coachSubtabSwitch('seance');
  seancePane('resume');
  const inp = document.getElementById('seance-date');
  if (fromEditor || !inp.value) inp.value = p.seance_date || dateStr(new Date());
  await seanceDateChanged();
  const ta = document.getElementById('seance-content');
  if (!ta.value.includes('🗂️ Séance préparée : ' + p.title)) ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + seancePlanText(p);
  const msg = document.getElementById('seance-save-msg');
  if (msg) { msg.style.color = 'var(--jaune)'; msg.textContent = 'Séance importée — pense à enregistrer.'; }
  window.scrollTo(0, 0);
}

function seanceGoToDate(dateVal) {
  document.getElementById('seance-date').value = dateVal;
  seanceDateChanged();
  coachSubtabSwitch('seance');
  seancePane('resume');
}

