/* ---------- animação 1: ciclo anual com fluxos de CO2 ----------
   Entrada (fotossíntese) proporcional a st.GPP; saída pela respiração das plantas (0,40 de GPP no modelo) e do solo e da serapilheira
   (o restante de Reco, que inclui o pulso das primeiras chuvas). Magnitudes do modelo conceitual, não são medições.
   A fotossíntese depende de luz: cai durante cada pancada de chuva (luzAgora); a respiração continua.
   Fases do ano: nomes e frases didáticas; o mini-gráfico mostra chuva (barras), fotossíntese (azul) e respiração (laranja) ao longo do ciclo. */
var co2 = [], accIn = 0, accRa = 0, accRh = 0;
var CO2IN = '#0b7a97', CO2OUT = '#d2661a';
function canopyPoint() {
  var pool = SP.concat(fill), tries, p, t, lv;
  for (tries = 0; tries < 10; tries++) {
    p = pool[(Math.random() * pool.length) | 0];
    if (p.kind && p.kind !== 'tree') continue;
    lv = p.st ? p.st.lv : p.lv;
    if (!(lv > 0.08)) continue;
    t = p.tips[(Math.random() * p.tips.length) | 0];
    if (t.r > lv * 1.05) continue;
    return { x: p.x + t.x, y: p.y + t.y };
  }
  return null;
}
function herbPoint() {
  var x = 10 + Math.random() * (W - 20);
  if (outcropH(x) > 0.5 || st.H < 0.1) return null;
  return { x: x, y: groundY(x) - 5 - Math.random() * 9 };
}
function spawnCO2(kind) {
  var c, x, y;
  if (kind === 0) {
    c = (Math.random() < 0.2 ? herbPoint() : null) || canopyPoint(); if (!c) return;
    co2.push({ k: 0, x0: c.x + (Math.random() - 0.5) * 50, y0: c.y - 70 - Math.random() * 70, x1: c.x, y1: c.y, u: 0, v: 0.28 + Math.random() * 0.18, ph: Math.random() * TAU, tag: Math.random() < 0.06 });
  } else if (kind === 1) {
    c = canopyPoint(); if (!c) return;
    co2.push({ k: 1, x0: c.x, y0: c.y, x1: c.x + (Math.random() - 0.5) * 30, y1: c.y - 45 - Math.random() * 40, u: 0, v: 0.3 + Math.random() * 0.15, ph: Math.random() * TAU, tag: false });
  } else {
    x = 8 + Math.random() * (W - 16); if (outcropH(x) > 0.5) return;
    y = groundY(x) - 1;
    co2.push({ k: 1, x0: x, y0: y, x1: x + (Math.random() - 0.5) * 24, y1: y - 60 - Math.random() * 50, u: 0, v: 0.26 + Math.random() * 0.14, ph: Math.random() * TAU, tag: Math.random() < 0.05 });
  }
}
function updateCO2(dt) {
  var ra = 0.4 * st.GPP, rh = Math.max(0, st.Reco - ra), i;
  accIn += st.GPP * luzAgora() * 22 * dt; accRa += ra * 22 * dt; accRh += rh * 44 * dt;
  while (accIn >= 1) { accIn -= 1; if (co2.length < 260) spawnCO2(0); }
  while (accRa >= 1) { accRa -= 1; if (co2.length < 260) spawnCO2(1); }
  while (accRh >= 1) { accRh -= 1; if (co2.length < 260) spawnCO2(2); }
  for (i = co2.length - 1; i >= 0; i--) { co2[i].u += co2[i].v * dt; if (co2[i].u >= 1) co2.splice(i, 1); }
}
function drawCO2() {
  var i, p, a, r, x, y, dx, dy, dl, col, s = Math.max(10, 7.5 * W / cssW);
  ctx.lineCap = 'round';
  for (i = 0; i < co2.length; i++) {
    p = co2[i];
    x = p.x0 + (p.x1 - p.x0) * p.u + Math.sin(T * 2 + p.ph) * 3 * (1 - p.u); y = p.y0 + (p.y1 - p.y0) * p.u;
    if (p.k === 0) { a = smooth(0, 0.12, p.u) * (1 - smooth(0.86, 1, p.u)); r = 3.7 * (1 - 0.5 * smooth(0.8, 1, p.u)); col = CO2IN; }
    else { a = smooth(0, 0.1, p.u) * (1 - smooth(0.55, 1, p.u)); r = 3.7; col = CO2OUT; }
    if (a < 0.03) continue;
    dx = p.x1 - p.x0; dy = p.y1 - p.y0; dl = Math.sqrt(dx * dx + dy * dy) || 1;
    ctx.globalAlpha = a * 0.55; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - dx / dl * 11, y - dy / dl * 11); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    if (p.tag) { ctx.globalAlpha = a; txt('CO₂', x + r + 3, y + s * 0.35, { c: col, halo: 'rgba(255,255,255,0.85)', sz: s, w: 700 }); }
  }
  ctx.globalAlpha = 1;
}
/* nomes das espécies: etiqueta com linha até o topo da copa; vizinhas próximas alternam a altura para não se sobrepor em tela pequena (a última fica baixa, para não encostar na legenda) */
function drawLabels() {
  var fs = Math.max(12.5, 6.5 * W / cssW), i, sp, top, py, ph = fs * 1.7, tw;
  ctx.save(); ctx.font = '600 ' + fs + 'px ' + FONT; ctx.textBaseline = 'alphabetic';
  for (i = 0; i < SP.length; i++) {
    sp = SP[i]; top = sp.y - sp.h - 10; py = top - 12 - [0, 1, 0, 1, 0, 0][i] * fs * 2.1 - ph;
    tw = ctx.measureText(sp.nome).width;
    ctx.strokeStyle = 'rgba(22,34,42,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sp.x, py + ph); ctx.lineTo(sp.x, top + 4); ctx.stroke();
    ctx.fillStyle = 'rgba(22,34,42,0.7)'; ctx.beginPath(); ctx.arc(sp.x, top + 4, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.78)'; rrect(sp.x - tw / 2 - fs * 0.55, py, tw + fs * 1.1, ph, fs * 0.36); ctx.fill();
    ctx.fillStyle = '#16222a'; ctx.textAlign = 'center'; ctx.fillText(sp.nome, sp.x, py + ph * 0.7);
  }
  ctx.restore();
}
/* fases do ano: nomes e limites vêm de `bounds`, derivados do modelo; aqui, a frase de cada uma */
var PHT = [
  'Sem folhas e com o solo seco, entra pouco carbono e sai pouco. O umbuzeiro floresce ainda sem folhas, antes das chuvas.',
  'A chuva molha o solo seco e os microrganismos despertam: sai um pulso de CO₂. Em poucos dias surgem folhas novas e a fotossíntese cresce.',
  'Copas cheias e capim no chão: a fotossíntese absorve mais CO₂ do que a respiração libera, e o ecossistema funciona como sumidouro de carbono.',
  'A chuva acaba, o solo seca e as folhas caem e viram serapilheira. A entrada de carbono cai antes da saída.',
  'Só o juazeiro e os cactos seguem verdes. Entra pouco, sai pouco: o saldo fica perto de zero.'
];
function wrapLines(s, maxW) {
  var w = s.split(' '), lines = [], cur = '', t, i;
  for (i = 0; i < w.length; i++) { t = cur ? cur + ' ' + w[i] : w[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
/* painel no canto superior direito: o CO2 absorvido e o liberado neste momento, cada um com sua barra, e o saldo da estação.
   A barra da fotossíntese cai durante a chuva; o saldo segue o modelo da estação, para não piscar a cada pancada. */
function drawLegendPanel() {
  var fs = Math.max(13, 5.8 * W / cssW), pad = fs * 0.75, lh = fs * 1.3, ic = fs * 0.5, x0 = Math.max(12, 10 * W / cssW), tw = fs * 15.5, i, j;
  var nee = st.NEE, sal = nee < -0.04 ? ['sumidouro de carbono', CO2IN] : nee > 0.04 ? ['fonte de carbono', CO2OUT] : ['perto do equilíbrio', '#4a5258'];
  var rows = [['CO₂ absorvido da atmosfera pela fotossíntese', CO2IN, st.GPP * luzAgora(), 1], ['CO₂ liberado para a atmosfera pela respiração das plantas e do solo', CO2OUT, st.Reco, -1]];
  ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '600 ' + fs + 'px ' + FONT;
  var lines = rows.map(function (r) { return wrapLines(r[0], tw); }), tx = pad + ic * 2 + fs * 0.6;
  ctx.font = '700 ' + fs + 'px ' + FONT; var w4 = ctx.measureText('Saldo: sumidouro de carbono').width;
  var rowH = function (k) { return lines[k].length * lh + fs * 1.3; };
  var pw = Math.max(tx + tw, pad + w4) + pad, ph = pad * 2 + rowH(0) + rowH(1) + fs * 1.1, px = W - x0 - pw, py = x0, y = py + pad;
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  for (i = 0; i < 2; i++) {
    var ix = px + pad + ic, cy = y + fs * 0.62, d = rows[i][3] * ic * 0.5;
    ctx.fillStyle = rows[i][1]; ctx.beginPath(); ctx.arc(ix, cy, ic, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, fs * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    ctx.moveTo(ix, cy - d); ctx.lineTo(ix, cy + d); ctx.moveTo(ix - ic * 0.38, cy + d - rows[i][3] * ic * 0.38); ctx.lineTo(ix, cy + d); ctx.lineTo(ix + ic * 0.38, cy + d - rows[i][3] * ic * 0.38); ctx.stroke();
    ctx.font = '600 ' + fs + 'px ' + FONT; ctx.fillStyle = '#16222a';
    for (j = 0; j < lines[i].length; j++) ctx.fillText(lines[i][j], px + tx, y + fs * 0.95 + j * lh);
    var by = y + lines[i].length * lh + fs * 0.3;
    ctx.fillStyle = 'rgba(22,34,42,0.14)'; rrect(px + tx, by, tw, fs * 0.5, fs * 0.25); ctx.fill();
    ctx.fillStyle = rows[i][1]; rrect(px + tx, by, Math.max(fs * 0.5, tw * clamp(rows[i][2])), fs * 0.5, fs * 0.25); ctx.fill();
    y += rowH(i);
  }
  ctx.font = '700 ' + fs + 'px ' + FONT; ctx.fillStyle = sal[1]; ctx.fillText('Saldo: ' + sal[0], px + pad, y + fs * 0.75);
  ctx.restore();
}
/* mini-gráfico do ano: barras de chuva, linhas de fotossíntese e respiração e cursor no momento atual; embaixo, uma faixa
   com as cores das fases no lugar dos meses */
var YRC = null;
function yearCurves() {
  var n = 72, g = [], r = [], i, t;
  for (i = 0; i <= n; i++) { t = i / n; g.push(samp(sim.GPP, t)); r.push(samp(sim.Reco, t)); }
  return { g: g, r: r, n: n };
}
function drawYearChart(x, y, w, h, fs) {
  if (!YRC) YRC = yearCurves();
  var i, bx, bw = w / 12, base = y + h - fs * 0.9, top = y + fs * 0.2, hh = base - top;
  ctx.save();
  for (i = 0; i < 12; i++) {
    bx = x + i * bw;
    ctx.fillStyle = 'rgba(150,196,226,0.55)'; var rh = hh * RM[i] * 0.92; ctx.fillRect(bx + bw * 0.12, base - rh, bw * 0.76, rh);
  }
  for (i = 0; i < bounds.length; i++) { ctx.fillStyle = FASE_COR[i]; ctx.fillRect(x + w * bounds[i][1], base + fs * 0.3, w * (bounds[i][2] - bounds[i][1]), fs * 0.42); }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, base + 0.5); ctx.lineTo(x + w, base + 0.5); ctx.stroke();
  ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  [[YRC.r, CO2OUT], [YRC.g, CO2IN]].forEach(function (c) {
    ctx.strokeStyle = c[1]; ctx.beginPath();
    for (i = 0; i <= YRC.n; i++) { var px = x + w * i / YRC.n, py = base - hh * c[0][i] * 0.92; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
  });
  var cx = x + w * phase;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx, top - fs * 0.1); ctx.lineTo(cx, base + fs * 0.3); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - fs * 0.3, top - fs * 0.15); ctx.lineTo(cx + fs * 0.3, top - fs * 0.15); ctx.lineTo(cx, top + fs * 0.25); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/* quadro no canto inferior esquerdo: fase do ano, frase e mini-gráfico */
function drawPhaseCard() {
  var x0 = Math.max(12, 10 * W / cssW), fs = Math.max(12.5, 5.8 * W / cssW), pad = fs * 0.8, k = phaseAt(phase), i, y;
  var cwid = Math.min(W - 2 * x0, fs * 46), lh2 = fs * 1.34, chH = fs * 3.7, lines;
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = '500 ' + fs + 'px ' + FONT; lines = wrapLines(PHT[k], cwid - pad * 2);
  var ch = pad * 1.6 + fs * 1.5 + lines.length * lh2 + fs * 0.6 + chH, cx = x0, cyy = H - x0 - ch;
  ctx.fillStyle = 'rgba(24,18,14,0.84)'; rrect(cx, cyy, cwid, ch, fs * 0.5); ctx.fill();
  y = cyy + pad + fs * 0.95;
  ctx.font = '700 ' + fs * 1.1 + 'px ' + FONT; ctx.fillStyle = '#fbf3e2'; ctx.fillText(bounds[k][0], cx + pad, y);
  /* legenda do gráfico, na linha do título, alinhada à direita */
  ctx.font = '500 ' + fs * 0.78 + 'px ' + FONT;
  var items = [['chuva', 0], ['fotossíntese', 1], ['respiração', 2]], sw = fs * 0.7, gap = fs * 0.3, lx = cx + cwid - pad, j;
  for (j = items.length - 1; j >= 0; j--) {
    var tw = ctx.measureText(items[j][0]).width; lx -= tw; ctx.fillStyle = '#d9d2c2'; ctx.fillText(items[j][0], lx, y);
    lx -= gap + sw;
    if (items[j][1] === 0) { ctx.fillStyle = 'rgba(150,196,226,0.8)'; ctx.fillRect(lx, y - fs * 0.6, sw, fs * 0.6); }
    else { ctx.strokeStyle = items[j][1] === 1 ? CO2IN : CO2OUT; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, y - fs * 0.3); ctx.lineTo(lx + sw, y - fs * 0.3); ctx.stroke(); }
    lx -= fs * 0.8;
  }
  y += fs * 0.5; ctx.font = '500 ' + fs + 'px ' + FONT; ctx.fillStyle = '#f1e8d4';
  for (i = 0; i < lines.length; i++) { y += lh2; ctx.fillText(lines[i], cx + pad, y); }
  drawYearChart(cx + pad, y + fs * 0.5, cwid - pad * 2, chH, fs);
  ctx.restore();
}
function drawLegend() { drawLegendPanel(); drawPhaseCard(); }
var cena = {
  torre: false,
  primeiroPlano: function () { drawCO2(); drawLabels(); },
  interface: drawLegend,
  atualizar: function (dt) { if (!reduce) updateCO2(dt); },
  reiniciar: function () { co2.length = 0; }
};
