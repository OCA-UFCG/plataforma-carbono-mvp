/* Começa parada, sem fauna e sem chuva; os botões de etapa ficam na página. */
FAUNA = false; playing = false; phase = 0.6;
/* ---------- estoques de carbono ----------
   Percentuais de Caatinga densa (cerca de 125 Mg C/ha; média regional de 48 áreas, solo e raízes até 1 m ou até a rocha): Menezes et al. (2021), Geoderma 390:114943.
   Na tela, "t" (tonelada) no lugar de "Mg", que é a mesma unidade.
   Razão raiz:parte aérea (0,56) e 41% das raízes sob a base dos troncos: Albuquerque et al. (2015), J. Arid Environments 116:82-88 (outro estudo, outras áreas).
   Os desenhos (troncos caídos, posição das raízes) são ilustrativos; só os percentuais vêm dos estudos. */
var STK = [
  { id: 'solo', nome: 'Solo', pct: 72.1, col: '#d9803a', src: 0,
    txt: 'Maior estoque. Carbono orgânico do solo até 1 m de profundidade ou até a camada de rocha, o que vier primeiro. Em solo raso, o limite é a rocha.' },
  { id: 'aerea', nome: 'Parte aérea', pct: 15.9, col: '#5fae45', src: 0,
    txt: 'Troncos, galhos e folhas de árvores e arbustos vivos. Perde as folhas na seca, mas o carbono da madeira permanece.' },
  { id: 'raizes', nome: 'Raízes', pct: 7.3, col: '#f3e2b0', src: 0,
    txt: 'Raízes finas e grossas e xilopódios (como os do umbuzeiro). Em seis áreas de PE e CE, a razão raiz:parte aérea foi 0,56 em biomassa e 41% das raízes ficaram sob a base dos troncos (Albuquerque et al., 2015).' },
  { id: 'morta', nome: 'Madeira morta', pct: 2.9, col: '#a3714a', src: 0,
    txt: 'Troncos e galhos mortos, caídos ou em pé. Os troncos desenhados são ilustrativos.' },
  { id: 'serap', nome: 'Serapilheira', pct: 1.3, col: '#e0b43c', src: 0,
    txt: 'Folhas, flores e galhos finos caídos sobre o solo. Cai sobretudo no fim das chuvas e no início da seca, quando as árvores perdem as folhas.' },
  { id: 'herb', nome: 'Herbáceas', pct: 0.5, col: '#a6d04f', src: 0,
    txt: 'Capim e ervas que brotam com a chuva e secam na estação seca. É o menor estoque.' }
];
var STK_ALL = 'Cerca de 125 toneladas de carbono por hectare, média de 48 áreas de Caatinga densa do Nordeste (mata fechada, em geral secundária). 72,1% está no solo e 27,9% nos demais compartimentos. Escolha um compartimento para destacá-lo.';
var SRC = ['Fonte: Menezes et al. (2021)'];
var sel = -1, va = 0, ha = 1, clk = 0, tourT = 0, touring = !reduce, LROWS = [];
function pc(v) { return v.toFixed(1).replace('.', ',') + '%'; }
function stockSelect(i, user) {
  if (user) touring = false;
  sel = i; ha = 0; tourT = 0;
}
cv.addEventListener('pointerdown', function (e) {
  var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  for (var i = 0; i < LROWS.length; i++) { var q = LROWS[i]; if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) { stockSelect(sel === q.i ? -1 : q.i, true); return; } }
});
function stockUpdate(dt) {
  clk += dt;
  va += ((sel >= 0 ? 1 : 0) - va) * Math.min(1, dt * 6);
  ha = Math.min(1, ha + dt * 4);
  if (touring) { tourT += dt; if (tourT > 4.8) stockSelect(sel >= STK.length - 1 ? -1 : sel + 1, false); }
}
/* madeira morta: troncos caídos sobre o solo, longe das espécies e dos afloramentos */
var LOGS = null;
function buildLogs() {
  var r = mulberry32(4711), xs = [60, 160, 250, 330, 420, 520, 610, 700, 800, 870, 930], out = [], i, j, ok, L, x, t;
  for (i = 0; i < xs.length; i++) {
    x = xs[i]; L = 56 + r() * 30; t = 8 + r() * 3; ok = true;
    for (j = 0; j < SP.length; j++) if (Math.abs(SP[j].x - x) < 22 + L / 2) ok = false;
    for (j = -3; j <= 3; j++) if (outcropH(x + j * L / 6) > 0.5) ok = false;
    if (ok) out.push({ x: x, L: L, t: t, a: groundY(x + L / 2) - groundY(x - L / 2) });
  }
  return out;
}
function drawLogs() {
  if (!LOGS) LOGS = buildLogs();
  ctx.save(); ctx.lineCap = 'round';
  LOGS.forEach(function (g) {
    var ang = Math.atan2(g.a, g.L), yy = groundY(g.x) - g.t * 0.45;
    ctx.save(); ctx.translate(g.x, yy); ctx.rotate(ang);
    ctx.fillStyle = '#946444'; ctx.strokeStyle = 'rgba(30,18,10,0.85)'; ctx.lineWidth = 1;
    rrect(-g.L / 2, -g.t / 2, g.L, g.t, g.t * 0.45); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,18,10,0.45)'; ctx.lineWidth = 0.8; ctx.beginPath();
    ctx.moveTo(-g.L * 0.42, -g.t * 0.15); ctx.lineTo(g.L * 0.1, -g.t * 0.15); ctx.moveTo(-g.L * 0.2, g.t * 0.2); ctx.lineTo(g.L * 0.4, g.t * 0.2); ctx.stroke();
    ctx.fillStyle = '#c9a77c'; ctx.beginPath(); ctx.ellipse(g.L / 2 - g.t * 0.25, 0, g.t * 0.3, g.t * 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}
/* destaque: véu escuro sobre a cena e o compartimento escolhido redesenhado por cima */
function drawStockOverlay(pan, bark) {
  if (va < 0.01) return;
  var i, sets, wet;
  ctx.fillStyle = 'rgba(24,18,14,' + (0.62 * va) + ')'; ctx.fillRect(-120, -20, W + 240, H + 40);
  if (sel < 0 || ha < 0.01) return;
  ctx.save(); ctx.globalAlpha = ha;
  if (sel === 0) {
    wet = 0.75 * clamp(st.S);
    ctx.save(); band(GY, GS); ctx.clip();
    ctx.fillStyle = rgb(mix(SC.A[0], SC.A[1], wet)); band(GY, GA); ctx.fill();
    ctx.fillStyle = rgb(mix(SC.B[0], SC.B[1], wet)); band(GA, GS); ctx.fill();
    ctx.drawImage(T1, -96, TY0, W + 192, H + 12 - TY0);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,244,214,' + (0.7 + 0.3 * Math.sin(clk * 4)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -clk * 12;
    ctx.beginPath(); for (i = 0; i < GX.length; i++) { if (i) ctx.lineTo(GX[i], GS[i]); else ctx.moveTo(GX[i], GS[i]); } ctx.stroke(); ctx.setLineDash([]);
    /* régua: da superfície até a rocha (no estudo, até 1 m ou até a rocha) */
    var rx = 925, rt = groundY(rx), rb = soilBase(rx), rfs = Math.max(12, 5.4 * W / cssW);
    ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(rx, rt); ctx.lineTo(rx, rb); ctx.moveTo(rx - 7, rt); ctx.lineTo(rx + 7, rt); ctx.moveTo(rx - 7, rb); ctx.lineTo(rx + 7, rb); ctx.stroke();
    ctx.font = '600 ' + rfs + 'px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    var rl = ['solo: até 1 m de profundidade', 'ou até a rocha'];
    ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(30,20,14,0.75)';
    for (i = 0; i < 2; i++) { ctx.strokeText(rl[i], W - 10, rt - rfs * 1.3 - (1 - i) * rfs * 1.2); ctx.fillStyle = '#fff4dc'; ctx.fillText(rl[i], W - 10, rt - rfs * 1.3 - (1 - i) * rfs * 1.2); }
    ctx.textAlign = 'left';
  } else if (sel === 1) {
    for (i = 0; i < near.length; i++) if (!near[i].hidden) drawPlant(near[i], bark, false);
    for (i = 0; i < fill.length; i++) drawPlant(fill[i], bark, false);
    drawSpecies(); drawSucc(0.94 + 0.06 * st.S);
  } else if (sel === 2) {
    sets = rootSets(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(30,16,8,0.75)';
    sets.forEach(function (r) { ctx.lineWidth = r.w[0] + 2.6; ctx.stroke(r.thick); ctx.lineWidth = r.w[1] + 2.4; ctx.stroke(r.main); ctx.lineWidth = r.w[2] + 2; ctx.stroke(r.fine); });
    ctx.strokeStyle = '#fff1c9';
    sets.forEach(function (r) { ctx.lineWidth = r.w[0] + 0.8; ctx.stroke(r.thick); ctx.lineWidth = r.w[1] + 0.6; ctx.stroke(r.main); ctx.lineWidth = r.w[2] + 0.5; ctx.stroke(r.fine); });
    var um = SP[0].rt.tub;
    for (i = 0; i < um.length; i++) {
      var tb = um[i];
      ctx.fillStyle = '#e8c88f'; ctx.strokeStyle = 'rgba(30,16,8,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(tb[0], tb[1], tb[2], tb[3], 0.12, 0, TAU); ctx.fill(); ctx.stroke();
    }
  } else if (sel === 3) {
    drawLogs();
    ctx.strokeStyle = 'rgba(255,236,200,0.9)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]);
    LOGS.forEach(function (g) { rrect(g.x - g.L / 2 - 4, groundY(g.x) - g.t - 6, g.L + 8, g.t + 9, 4); ctx.stroke(); });
    ctx.setLineDash([]);
  } else if (sel === 4) {
    ctx.strokeStyle = 'rgba(240,196,70,0.45)'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); for (i = 0; i <= 96; i++) { var gx = i * 10; if (i) ctx.lineTo(gx, groundY(gx) - 1); else ctx.moveTo(gx, groundY(gx) - 1); } ctx.stroke();
    for (i = -2; i <= 2; i++) { ctx.save(); ctx.translate(0, i * 0.9); drawLitter(litFg, Math.max(st.lit, 0.55), 1); ctx.restore(); }
  } else if (sel === 5) {
    drawHerbs(herbsFg, false, pan, 1);
  }
  ctx.restore();
}
function wrapLines(s, maxW) {
  var w = s.split(' '), lines = [], cur = '', t, i;
  for (i = 0; i < w.length; i++) { t = cur ? cur + ' ' + w[i] : w[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function drawStocksHUD() {
  var x0 = Math.max(12, 10 * W / cssW), i, fs, pad, lh, y, s;
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  /* título */
  fs = Math.max(15, 7 * W / cssW); pad = fs * 0.6;
  ctx.font = '700 ' + fs + 'px ' + FONT; s = 'Caatinga densa: ≈ 125 t C/ha';
  ctx.fillStyle = 'rgba(255,255,255,0.72)'; rrect(x0, x0, ctx.measureText(s).width + pad * 2, fs * 1.9, fs * 0.4); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(s, x0 + pad, x0 + fs * 1.27);
  /* lista de compartimentos (clicável) */
  fs = Math.max(12.5, 5.6 * W / cssW); pad = fs * 0.7; lh = fs * 1.62;
  var nw = 0, bw = fs * 4.4, cw = fs * 0.95, pw, ph, px, py;
  ctx.font = '600 ' + fs + 'px ' + FONT; for (i = 0; i < STK.length; i++) nw = Math.max(nw, ctx.measureText(STK[i].nome).width);
  ctx.font = '600 ' + fs + 'px ' + FONT; var vw = ctx.measureText('72,1%').width;
  pw = pad * 2 + cw + fs * 0.6 + nw + fs * 0.7 + bw + fs * 0.6 + vw; ph = pad * 2 + lh * STK.length + fs * 1.1;
  px = W - x0 - pw; py = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('% do carbono armazenado', px + pad, py + pad + fs * 0.7);
  LROWS = [];
  for (i = 0; i < STK.length; i++) {
    var s2 = STK[i], ry = py + pad + fs * 1.1 + lh * i, on = sel === i;
    if (on) { ctx.fillStyle = 'rgba(22,34,42,0.13)'; rrect(px + pad * 0.4, ry, pw - pad * 0.8, lh, fs * 0.3); ctx.fill(); }
    LROWS.push({ i: i, x: px, y: ry, w: pw, h: lh });
    var cy = ry + lh * 0.5;
    ctx.fillStyle = s2.col; ctx.strokeStyle = 'rgba(22,34,42,0.6)'; ctx.lineWidth = 1; rrect(px + pad, cy - cw / 2, cw, cw, fs * 0.2); ctx.fill(); ctx.stroke();
    ctx.font = (on ? '700 ' : '600 ') + fs + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.textAlign = 'left';
    ctx.fillText(s2.nome, px + pad + cw + fs * 0.6, cy + fs * 0.35);
    var bx = px + pad + cw + fs * 0.6 + nw + fs * 0.7;
    ctx.fillStyle = 'rgba(22,34,42,0.13)'; rrect(bx, cy - fs * 0.25, bw, fs * 0.5, fs * 0.25); ctx.fill();
    ctx.fillStyle = s2.col; rrect(bx, cy - fs * 0.25, Math.max(fs * 0.3, bw * s2.pct / 72.1), fs * 0.5, fs * 0.25); ctx.fill();
    ctx.strokeStyle = 'rgba(22,34,42,0.45)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = '#16222a'; ctx.textAlign = 'right'; ctx.fillText(pc(s2.pct), px + pw - pad, cy + fs * 0.35); ctx.textAlign = 'left';
  }
  /* quadro de texto, embaixo à esquerda */
  fs = Math.max(12.5, 5.8 * W / cssW); pad = fs * 0.8;
  var cwid = Math.min(W - 2 * x0, fs * 46), title, body, tag, lines, ch, cx, cyy, lh2 = fs * 1.38;
  if (sel < 0) { title = 'Visão geral'; body = STK_ALL; tag = SRC[0]; }
  else { title = STK[sel].nome + ': ' + pc(STK[sel].pct); body = STK[sel].txt; tag = sel === 2 ? 'Fonte: Menezes et al. (2021); Albuquerque et al. (2015)' : SRC[0]; }
  ctx.font = '500 ' + fs + 'px ' + FONT; lines = wrapLines(body, cwid - pad * 2);
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; var tl = wrapLines(tag, cwid - pad * 2);
  ch = pad * 2 + fs * 1.5 + lines.length * lh2 + tl.length * fs * 1.1 + fs * 0.3; cx = x0; cyy = H - x0 - ch;
  ctx.fillStyle = 'rgba(24,18,14,0.84)'; rrect(cx, cyy, cwid, ch, fs * 0.5); ctx.fill();
  y = cyy + pad + fs * 0.95;
  if (sel >= 0) { ctx.fillStyle = STK[sel].col; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; rrect(cx + pad, y - fs * 0.82, fs * 0.95, fs * 0.95, fs * 0.2); ctx.fill(); ctx.stroke(); }
  ctx.font = '700 ' + fs * 1.1 + 'px ' + FONT; ctx.fillStyle = '#fbf3e2'; ctx.fillText(title, cx + pad + (sel >= 0 ? fs * 1.35 : 0), y);
  y += fs * 0.55;
  ctx.font = '500 ' + fs + 'px ' + FONT; ctx.fillStyle = '#f1e8d4';
  for (i = 0; i < lines.length; i++) { y += lh2; ctx.fillText(lines[i], cx + pad, y); }
  y += fs * 0.3; ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#c9bfa8';
  for (i = 0; i < tl.length; i++) { y += fs * 1.1; ctx.fillText(tl[i], cx + pad, y); }
  ctx.restore();
}
stockSelect(-1, false);
function textoEstoque() { return sel < 0 ? STK_ALL : STK[sel].nome + ', ' + pc(STK[sel].pct) + ' do estoque. ' + STK[sel].txt; }
var cena = {
  torre: false,
  semTempo: true,
  aposTorre: drawLogs,
  serapilheiraMin: 0.55,
  primeiroPlano: drawStockOverlay,
  substituirInterface: drawStocksHUD,
  ajustarEstado: function () { st.rainI = 0; st.cloud = Math.min(st.cloud, 0.15); },
  atualizar: stockUpdate,
  etapas: [{ nome: 'Tudo', cor: null }].concat(STK.map(function (s) { return { nome: s.nome, cor: s.col }; })),
  selecionarEtapa: function (i) { stockSelect(i - 1, true); },
  etapaAtual: function () { return sel + 1; },
  textoEtapa: textoEstoque
};
