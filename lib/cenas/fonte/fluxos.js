/* Começa tocando no fim das chuvas, sem fauna; com movimento reduzido, parada no auge. */
FAUNA = false; phase = 0.28; if (reduce) phase = 0.45;
/* ---------- animação 5: GPP, Ra, NPP, Rh, Reco e NEE ----------
   Relações: NPP = GPP - Ra; Reco = Ra + Rh; NEE = Reco - GPP = Rh - NPP (NEE negativo = o ecossistema absorve CO2).
   Magnitudes do modelo conceitual do ciclo anual (Ra = 0,40 de GPP; o resto de Reco é Rh). Valores relativos, não são medições. */
var CO2IN = '#0b7a97', CO2OUT = '#d2661a', RA_C = '#e07a1f', RH_C = '#b03a1c', NPP_C = '#3f9a3a', REC_C = '#c4521a';
var co2 = [], acc = [0, 0, 0, 0];
var FM = [
  { nome: 'Todos', w: [1, 1, 1, 1], hl: [],
    txt: 'O CO₂ entra pela fotossíntese (GPP). Parte volta pela respiração das plantas (Ra) e o resto vira folhas, madeira e raízes (NPP). Solo, serapilheira e madeira morta também respiram (Rh). As saídas somam a Reco, e a diferença entre Reco e GPP é a NEE, o saldo que a torre mede.' },
  { nome: 'GPP', w: [1, 0.1, 0.1, 0.1], hl: [0], col: CO2IN,
    txt: 'Produtividade primária bruta: todo o CO₂ que as plantas fixam na fotossíntese. É a entrada de carbono no ecossistema e acompanha a folhagem, que na Caatinga depende da chuva. A torre não a mede diretamente: a GPP é calculada a partir da NEE e da respiração estimada.' },
  { nome: 'Reco', w: [0.1, 1, 1, 0.1], hl: [1, 3, 4], col: REC_C,
    txt: 'Respiração do ecossistema: CO₂ liberado pelas plantas (Ra) e pelos microrganismos do solo, da serapilheira e da madeira morta (Rh). Reco = Ra + Rh. À noite, sem fotossíntese, a torre mede só a Reco; esse valor serve para estimar a respiração de dia.' },
  { nome: 'NPP', w: [0.45, 0.7, 0, 1], hl: [0, 1, 2], col: NPP_C,
    txt: 'Produtividade primária líquida: o que sobra da GPP depois da respiração das plantas. NPP = GPP − Ra. É o carbono que vira folhas, madeira e raízes.' },
  { nome: 'NEE', w: [0.6, 0.6, 0.6, 0], hl: [0, 4, 5], col: '#16222a',
    txt: 'Troca líquida do ecossistema: o único fluxo que a torre mede diretamente. NEE = Reco − GPP, ou Rh − NPP. Pela convenção usada aqui, NEE negativo significa que o ecossistema absorve CO₂ e positivo, que libera.' }
];
var fi = 0, fTour = 0, fTouring = !reduce, wcur = [1, 1, 1, 1], fclk = 0;
function fxSelect(i, user) {
  if (user) fTouring = false;
  fi = i; fTour = 0;
}
function canopyPt() {
  var pool = SP.concat(fill), tries, p, t, lv;
  for (tries = 0; tries < 10; tries++) {
    p = pool[(Math.random() * pool.length) | 0];
    if (p.kind && p.kind !== 'tree') continue;
    lv = p.st ? p.st.lv : p.lv;
    if (!(lv > 0.08)) continue;
    t = p.tips[(Math.random() * p.tips.length) | 0];
    if (t.r > lv * 1.05) continue;
    return { x: p.x + t.x, y: p.y + t.y, p: p };
  }
  return null;
}
function herbPt() {
  var x = 10 + Math.random() * (W - 20);
  if (outcropH(x) > 0.5 || st.H < 0.1) return null;
  return { x: x, y: groundY(x) - 5 - Math.random() * 9 };
}
/* k: 0 entra (GPP), 1 sai das plantas (Ra), 2 sai do solo e serapilheira (Rh), 3 carbono que fica nas plantas (NPP) */
function spawnFx(k) {
  var c, x, y, tp;
  if (k === 0) {
    c = (Math.random() < 0.2 ? herbPt() : null) || canopyPt(); if (!c) return;
    co2.push({ k: 0, x0: c.x + (Math.random() - 0.5) * 50, y0: c.y - 70 - Math.random() * 70, x1: c.x, y1: c.y, u: 0, v: 0.28 + Math.random() * 0.18, ph: Math.random() * TAU, tag: Math.random() < 0.06 });
  } else if (k === 1) {
    c = canopyPt(); if (!c) return;
    co2.push({ k: 1, x0: c.x, y0: c.y, x1: c.x + (Math.random() - 0.5) * 30, y1: c.y - 45 - Math.random() * 40, u: 0, v: 0.3 + Math.random() * 0.15, ph: Math.random() * TAU, tag: Math.random() < 0.06 });
  } else if (k === 2) {
    x = 8 + Math.random() * (W - 16); if (outcropH(x) > 0.5) return;
    y = groundY(x) - 1;
    co2.push({ k: 2, x0: x, y0: y, x1: x + (Math.random() - 0.5) * 24, y1: y - 60 - Math.random() * 50, u: 0, v: 0.26 + Math.random() * 0.14, ph: Math.random() * TAU, tag: Math.random() < 0.05 });
  } else {
    c = canopyPt(); if (!c) return; tp = c.p;
    co2.push({ k: 3, x0: c.x, y0: c.y, x1: tp.x, y1: tp.y - tp.h * 0.28, x2: tp.x + (Math.random() - 0.5) * 36, y2: groundY(tp.x) + 22 + Math.random() * 22, u: 0, v: 0.2 + Math.random() * 0.06, ph: 0, tag: false });
  }
}
function updateFx(dt) {
  var ra = 0.4 * st.GPP, rh = Math.max(0, st.Reco - ra), npp = 0.6 * st.GPP, i, r = [st.GPP * 22, ra * 22, rh * 44, npp * 22];
  for (i = 0; i < 4; i++) { acc[i] += r[i] * dt; while (acc[i] >= 1) { acc[i] -= 1; if (co2.length < 330) spawnFx(i); } }
  for (i = co2.length - 1; i >= 0; i--) { co2[i].u += co2[i].v * dt; if (co2[i].u >= 1) co2.splice(i, 1); }
  for (i = 0; i < 4; i++) wcur[i] += (FM[fi].w[i] - wcur[i]) * Math.min(1, dt * 5);
  fclk += dt;
  if (fTouring) { fTour += dt; if (fTour > 13) fxSelect((fi + 1) % FM.length, false); }
}
var FXCOL = [CO2IN, RA_C, RH_C, NPP_C];
function drawFx() {
  var i, p, a, r, x, y, dx, dy, dl, col, s = Math.max(10, 7.5 * W / cssW), u, wgt;
  ctx.lineCap = 'round';
  for (i = 0; i < co2.length; i++) {
    p = co2[i]; wgt = wcur[p.k]; if (wgt < 0.04) continue;
    col = FXCOL[p.k];
    if (p.k === 3) {
      u = p.u;
      if (u < 0.5) { var f = u / 0.5; x = p.x0 + (p.x1 - p.x0) * f; y = p.y0 + (p.y1 - p.y0) * f; dx = p.x1 - p.x0; dy = p.y1 - p.y0; }
      else { var g = (u - 0.5) / 0.5; x = p.x1 + (p.x2 - p.x1) * g; y = p.y1 + (p.y2 - p.y1) * g; dx = p.x2 - p.x1; dy = p.y2 - p.y1; }
      a = smooth(0, 0.1, u) * (1 - smooth(0.88, 1, u)); if (a < 0.03) continue;
      dl = Math.sqrt(dx * dx + dy * dy) || 1;
      ctx.globalAlpha = a * wgt * 0.5; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - dx / dl * 10, y - dy / dl * 10); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = a * wgt; ctx.fillStyle = col; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(x - 3.6, y - 3.6, 7.2, 7.2); ctx.fill(); ctx.stroke();
      continue;
    }
    x = p.x0 + (p.x1 - p.x0) * p.u + Math.sin(T * 2 + p.ph) * 3 * (1 - p.u); y = p.y0 + (p.y1 - p.y0) * p.u;
    if (p.k === 0) { a = smooth(0, 0.12, p.u) * (1 - smooth(0.86, 1, p.u)); r = 3.7 * (1 - 0.5 * smooth(0.8, 1, p.u)); }
    else { a = smooth(0, 0.1, p.u) * (1 - smooth(0.55, 1, p.u)); r = 3.7; }
    if (a < 0.03) continue;
    dx = p.x1 - p.x0; dy = p.y1 - p.y0; dl = Math.sqrt(dx * dx + dy * dy) || 1;
    ctx.globalAlpha = a * wgt * 0.55; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - dx / dl * 11, y - dy / dl * 11); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalAlpha = a * wgt; ctx.fillStyle = col; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    if (p.tag && wgt > 0.5) { ctx.globalAlpha = a; txt('CO₂', x + r + 3, y + s * 0.35, { c: col, halo: 'rgba(255,255,255,0.85)', sz: s, w: 700 }); }
  }
  ctx.globalAlpha = 1;
}
/* seta do saldo (NEE) no céu, à esquerda da torre */
function drawNetArrow() {
  if (fi !== 4) return;
  var n = st.NEE, m = clamp(Math.abs(n) / 0.45), fs = Math.max(13, 6 * W / cssW), cx = 250, y0 = 66, L = 78, i, col, bw;
  ctx.save(); ctx.lineJoin = 'round';
  if (Math.abs(n) < 0.04) {
    ctx.fillStyle = '#4a5258'; for (i = 0; i < 2; i++) { rrect(cx - 28, y0 + 22 + i * 18, 56, 8, 4); ctx.fill(); }
    col = '#4a5258';
  } else {
    col = n < 0 ? CO2IN : CO2OUT; bw = 12 + 28 * m; var d = n < 0 ? 1 : -1, ya = d > 0 ? y0 : y0 + L, yb = d > 0 ? y0 + L : y0, hh = 22 + 10 * m;
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - bw / 2, ya); ctx.lineTo(cx + bw / 2, ya); ctx.lineTo(cx + bw / 2, yb - d * hh); ctx.lineTo(cx + bw / 2 + 12, yb - d * hh); ctx.lineTo(cx, yb); ctx.lineTo(cx - bw / 2 - 12, yb - d * hh); ctx.lineTo(cx - bw / 2, yb - d * hh); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  var lab = Math.abs(n) < 0.04 ? 'NEE ≈ 0' : n < 0 ? 'NEE < 0: absorve' : 'NEE > 0: libera';
  ctx.font = '700 ' + fs + 'px ' + FONT; var tw = ctx.measureText(lab).width;
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; rrect(cx - tw / 2 - fs * 0.5, y0 + L + 10, tw + fs, fs * 1.6, fs * 0.4); ctx.fill();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(lab, cx, y0 + L + 10 + fs * 1.1);
  ctx.restore();
}
function wrapLines(s, maxW) {
  var w = s.split(' '), lines = [], cur = '', t, i;
  for (i = 0; i < w.length; i++) { t = cur ? cur + ' ' + w[i] : w[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function drawFluxHUD() {
  var x0 = Math.max(12, 10 * W / cssW), i, fs = Math.max(12.5, 5.6 * W / cssW), pad = fs * 0.75, lh = fs * 1.6, y, m = FM[fi];
  var gpp = st.GPP, ra = 0.4 * st.GPP, npp = 0.6 * st.GPP, rh = Math.max(0, st.Reco - ra), rec = st.Reco, nee = st.NEE;
  var rows = [['GPP', gpp, CO2IN], ['Ra: plantas', ra, RA_C], ['NPP = GPP − Ra', npp, NPP_C], ['Rh: solo e serapilheira', rh, RH_C], ['Reco = Ra + Rh', rec, REC_C], ['NEE = Reco − GPP', nee, null]];
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = '600 ' + fs + 'px ' + FONT;
  var nw = 0; for (i = 0; i < rows.length; i++) nw = Math.max(nw, ctx.measureText(rows[i][0]).width);
  var bw = fs * 4.6, pw = pad * 2 + fs * 1.1 + nw + fs * 0.7 + bw, ph = pad * 2 + fs * 1.2 + lh * rows.length + fs * 0.9, px = W - x0 - pw, py = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('fluxos de carbono (valores relativos)', px + pad, py + pad + fs * 0.7);
  for (i = 0; i < rows.length; i++) {
    var ry = py + pad + fs * 1.2 + lh * i, cy = ry + lh * 0.5, on = m.hl.indexOf(i) >= 0, bx = px + pw - pad - bw, col = rows[i][2];
    if (on) { ctx.fillStyle = 'rgba(22,34,42,0.13)'; rrect(px + pad * 0.4, ry, pw - pad * 0.8, lh, fs * 0.3); ctx.fill(); }
    if (i === 5) col = nee < -0.04 ? CO2IN : nee > 0.04 ? CO2OUT : '#4a5258';
    ctx.fillStyle = col; rrect(px + pad, cy - fs * 0.4, fs * 0.8, fs * 0.8, fs * 0.2); ctx.fill();
    ctx.font = (on ? '700 ' : '600 ') + fs + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(rows[i][0], px + pad + fs * 1.1, cy + fs * 0.35);
    ctx.fillStyle = 'rgba(22,34,42,0.13)'; rrect(bx, cy - fs * 0.27, bw, fs * 0.54, fs * 0.27); ctx.fill();
    ctx.fillStyle = col;
    if (i < 5) { rrect(bx, cy - fs * 0.27, Math.max(fs * 0.3, bw * clamp(rows[i][1])), fs * 0.54, fs * 0.27); ctx.fill(); }
    else {
      var half = bw / 2, len = half * clamp(Math.abs(nee) / 0.45);
      ctx.fillRect(nee < 0 ? bx + half - len : bx + half, cy - fs * 0.27, Math.max(len, 1.5), fs * 0.54);
      ctx.fillStyle = '#16222a'; ctx.fillRect(bx + half - 0.75, cy - fs * 0.42, 1.5, fs * 0.84);
    }
  }
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('NEE < 0 absorve; NEE > 0 libera', px + pad, py + ph - pad * 0.75);
  /* quadro de texto */
  fs = Math.max(12.5, 5.8 * W / cssW); pad = fs * 0.8;
  var cwid = Math.min(W - 2 * x0, fs * 46), lines, ch, cx = x0, cyy, lh2 = fs * 1.38, title = m.nome === 'Todos' ? 'Visão geral' : m.nome;
  ctx.font = '500 ' + fs + 'px ' + FONT; lines = wrapLines(m.txt, cwid - pad * 2);
  ch = pad * 1.7 + fs * 1.5 + lines.length * lh2; cyy = H - x0 - ch;
  ctx.fillStyle = 'rgba(24,18,14,0.84)'; rrect(cx, cyy, cwid, ch, fs * 0.5); ctx.fill();
  y = cyy + pad + fs * 0.95;
  if (m.col) { ctx.fillStyle = m.col === '#16222a' ? '#f1e8d4' : m.col; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; rrect(cx + pad, y - fs * 0.82, fs * 0.95, fs * 0.95, fs * 0.2); ctx.fill(); ctx.stroke(); }
  ctx.font = '700 ' + fs * 1.1 + 'px ' + FONT; ctx.fillStyle = '#fbf3e2'; ctx.fillText(title, cx + pad + (m.col ? fs * 1.35 : 0), y);
  y += fs * 0.55; ctx.font = '500 ' + fs + 'px ' + FONT; ctx.fillStyle = '#f1e8d4';
  for (i = 0; i < lines.length; i++) { y += lh2; ctx.fillText(lines[i], cx + pad, y); }
  ctx.restore();
}
fxSelect(0, false);
var cena = {
  primeiroPlano: function () { drawFx(); drawNetArrow(); },
  interface: drawFluxHUD,
  atualizar: function (dt) { if (!reduce) updateFx(dt); },
  reiniciar: function () { co2.length = 0; },
  etapas: FM.map(function (m) { return { nome: m.nome, cor: m.col || null }; }),
  selecionarEtapa: function (i) { fxSelect(i, true); },
  etapaAtual: function () { return fi; },
  textoEtapa: function () { return FM[fi].nome + '. ' + FM[fi].txt; }
};
