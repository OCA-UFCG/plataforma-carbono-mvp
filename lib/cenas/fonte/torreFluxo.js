/* Começa parada no primeiro caso, sem fauna; os botões de etapa ficam na página. */
FAUNA = false; playing = false; phase = 0.29;
/* ---------- como a torre sente o carbono (covariância dos vórtices) ----------
   Parcelas de ar (vórtices) passam pelos sensores: cada uma tem um movimento vertical (sobe ou desce) e uma quantidade de CO2 (pontos).
   Absorção: o ar que sobe leva menos CO2 que o ar que desce. Liberação: o contrário. Equilíbrio: sem relação.
   Diferenças exageradas, só para o desenho; cores, pontos e velocidades são ilustrativos. */
var CO2IN = '#0b7a97', CO2OUT = '#d2661a';
var EM = [
  { nome: 'Sensores', corr: 0, ph: 0.29,
    txt: 'No topo da torre, acima das copas, o anemômetro sônico mede o vento nas três direções e o analisador de gás mede o CO₂ no mesmo ponto, 10 a 20 vezes por segundo. A cada 30 minutos, milhares dessas medidas viram um valor de troca de CO₂. O saldo-radiômetro, no braço, mede a energia que chega e sai da superfície.' },
  { nome: 'Área medida', corr: 0, ph: 0.45, fp: true, col: '#e3c25a',
    txt: 'O ar chega aos sensores vindo de barlavento, de onde o vento sopra. A faixa de vegetação que contribui para a medida vai de dezenas a centenas de metros, cresce com a altura da torre e muda com o vento e com a hora do dia. A torre resume a vegetação em volta, não uma planta.' },
  { nome: 'Absorção', corr: -1, ph: 0.45, col: CO2IN,
    txt: 'O ar desce rico em CO₂, a vegetação retira parte dele na fotossíntese e o ar volta a subir mais pobre. Por isso o ar que sobe leva menos CO₂ do que o ar que desce. A torre mede o vento vertical e o CO₂ e calcula como os dois variam juntos (covariância).' },
  { nome: 'Equilíbrio', corr: 0, ph: 0.29, col: '#4a5258',
    txt: 'O ar que desce e o ar que sobe têm CO₂ parecido: o que a fotossíntese retira e o que a respiração devolve quase se compensam, e a covariância fica perto de zero.' },
  { nome: 'Liberação', corr: 1, ph: 0.88, col: CO2OUT,
    txt: 'O ar desce mais pobre em CO₂, solo, serapilheira e plantas liberam CO₂ na respiração e o ar volta a subir mais rico. Por isso o ar que sobe leva mais CO₂ do que o ar que desce. É o que acontece à noite, sem fotossíntese, e pode acontecer em parte da seca.' }
];
var em = 0, emTour = 0, emTouring = !reduce, emClk = 0, fpA = 0, phTarget = 0.29, avgU = 0.5, avgD = 0.5, parc = [], pulses = [], spawnT = 0, emVa = 0;
function twr() { if (!TWR) TWR = buildTower(); return TOWER; }
function newParcel(pre) {
  var T0 = twr(), r = 15 + Math.random() * 7, dots = [], i, ey = T0.eddy.y, y0 = ey - 26 - Math.random() * 8, yc = 208 + Math.random() * 36, v = 26 + Math.random() * 8, vx = 30 + Math.random() * 8;
  for (i = 0; i < 20; i++) dots.push([Math.random() * TAU, Math.sqrt(Math.random()) * 0.78]);
  /* o vento leva a parcela para a direita; parte nasce no ponto certo para passar pelo sensor na descida, parte para passar na subida (vinda de longe, contra o vento) */
  var q = Math.random(), tD = (ey - y0) / v, tU = (yc - y0) / v + 0.8 + (yc - ey) / v, x0 = T0.x + (Math.random() * 2 - 1) * 24 - vx * (q < 0.4 ? tD : q < 0.8 ? tU : 0) + (q >= 0.8 ? (Math.random() * 2 - 1) * 420 : 0);
  var p = { x: x0, y: y0, vx: vx, v: v, r: r, nz: Math.random() * 2 - 1, dots: dots, ph: Math.random() * TAU, yc: yc, st: 0, tt: 0, a: 0, c: 0.5, sg: -1, cD: 0, cU: 0 };
  p.cD = cDown(p); p.cU = cUp(p); p.c = p.cD;
  if (pre) { var u = Math.random() * 0.97; p.x = -30 + Math.random() * (W - 60); if (u < 0.45) p.y += (p.yc - p.y) * (u / 0.45); else if (u < 0.5) { p.y = p.yc; p.st = 1; p.tt = (u - 0.45) / 0.05 * 0.8; } else { p.st = 2; p.sg = 1; p.c = p.cU; p.y = p.yc - (p.yc - ey + 40) * ((u - 0.5) / 0.47); } p.a = 1; }
  return p;
}
function cDown(p) { return clamp(0.5 - EM[em].corr * 0.3 + p.nz * (EM[em].corr ? 0.1 : 0.2), 0.04, 0.96); }
function cUp(p) { return clamp(0.5 + EM[em].corr * 0.3 + p.nz * (EM[em].corr ? 0.1 : 0.2), 0.04, 0.96); }
var fx = [];
function prefill() { parc.length = 0; pulses.length = 0; fx.length = 0; for (var k = 0; k < 11; k++) parc.push(newParcel(true)); }
function parcelColor(c) { return mix([58, 150, 186], [226, 126, 48], c); }
function emSelect(i, user) {
  if (user) emTouring = false;
  em = i; emTour = 0; phTarget = EM[i].ph; leaves.length = 0; avgU = 0.5; avgD = 0.5;
  if (i === 0) { parc.length = 0; pulses.length = 0; fx.length = 0; } else {
    if (!parc.length) prefill();
    parc.forEach(function (p) { p.cD = cDown(p); p.cU = cUp(p); p.c = p.st === 2 ? p.cU : p.cD; });
    if (reduce) { var k = EM[i].corr * 0.3; avgU = clamp(0.5 + k); avgD = clamp(0.5 - k); }
  }
}
function emUpdate(dt) {
  emClk += dt;
  if (needPre) { needPre = false; prefill(); }
  phase += (phTarget - phase) * Math.min(1, dt * 2.5);
  emVa += ((em === 0 ? 1 : 0) - emVa) * Math.min(1, dt * 6);
  fpA += ((EM[em].fp ? 1 : 0) - fpA) * Math.min(1, dt * 5);
  if (emTouring) { emTour += dt; if (emTour > 15) emSelect((em + 1) % EM.length, false); }
  var T0 = twr(), i, p, c;
  for (i = pulses.length - 1; i >= 0; i--) { pulses[i].t += dt; if (pulses[i].t > 0.8) pulses.splice(i, 1); }
  if (em === 0 || reduce) return;
  spawnT -= dt; if (spawnT <= 0) { parc.push(newParcel(false)); spawnT = 0.5 + Math.random() * 0.4; }
  for (i = fx.length - 1; i >= 0; i--) { var f = fx[i]; f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t > f.life) fx.splice(i, 1); }
  var ey = T0.eddy.y, k2;
  for (i = parc.length - 1; i >= 0; i--) {
    p = parc[i]; p.x += p.vx * dt; p.ph += dt * 1.6; p.a = Math.min(1, p.a + dt * 1.5);
    var yo = p.y;
    if (p.st === 0) {
      p.y += p.v * dt;
      if (yo < ey && p.y >= ey && Math.abs(p.x - T0.x) < p.r + 14) { avgD += (p.cD - avgD) * 0.3; pulses.push({ t: 0, c: p.cD }); }
      if (p.y >= p.yc) { p.y = p.yc; p.st = 1; p.tt = 0; var mc = EM[em].corr; if (mc) for (k2 = 0; k2 < 5; k2++) fx.push({ x: p.x + (Math.random() - 0.5) * p.r * 1.4, y: p.y + (mc < 0 ? p.r * 0.5 : p.r + 26), vx: 0, vy: mc < 0 ? 26 : -26, t: 0, life: 0.9, dir: mc }); }
    } else if (p.st === 1) {
      p.tt += dt; p.c = p.cD + (p.cU - p.cD) * clamp(p.tt / 0.8);
      if (p.tt >= 0.8) { p.st = 2; p.sg = 1; p.c = p.cU; }
    } else {
      p.y -= p.v * dt;
      if (yo > ey && p.y <= ey && Math.abs(p.x - T0.x) < p.r + 14) { avgU += (p.cU - avgU) * 0.3; pulses.push({ t: 0, c: p.cU }); }
      if (p.y < ey - 44) p.a = Math.max(0, p.a - dt * 3);
      if (p.y < ey - 70) parc.splice(i, 1);
    }
    if (parc[i] === p && p.x > W + 50) parc.splice(i, 1);
  }
}
/* área medida (footprint): faixa no chão a barlavento da torre, mais forte perto dela e com cauda longa; desenho fora de escala */
function fpW(x, x0, x1) { var u = (x - x0) / (x1 - x0); if (u <= 0 || u >= 1) return 0; return Math.pow(u, 1.6) * Math.pow(1 - u, 0.45) * 2.6; }
function drawFootprint() {
  if (fpA < 0.01) return;
  var T0 = twr(), x0 = 24, x1 = T0.x - 6, x, w, fs = Math.max(12.5, 6 * W / cssW);
  ctx.save(); ctx.globalAlpha = fpA;
  /* véu sobre tudo, com um recorte na faixa (chão e copas) de onde vem o ar medido */
  ctx.fillStyle = 'rgba(24,18,14,0.5)'; ctx.beginPath(); ctx.rect(-120, -20, W + 240, H + 40);
  for (x = x0; x <= x1; x += 6) { w = Math.sqrt(fpW(x, x0, x1) / 2.6); var yy = groundY(x) - 12 - 165 * w; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
  for (x = x1; x >= x0; x -= 6) { w = fpW(x, x0, x1); ctx.lineTo(x, groundY(x) + 4 + 16 * w); }
  ctx.closePath(); ctx.fill('evenodd');
  /* faixa no chão: mais forte perto da torre, cauda longa a barlavento */
  var g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(255,215,80,0.1)'); g.addColorStop(0.55, 'rgba(255,215,80,0.7)'); g.addColorStop(1, 'rgba(255,215,80,0.2)');
  ctx.fillStyle = g; ctx.beginPath();
  for (x = x0; x <= x1; x += 6) { w = fpW(x, x0, x1); var y2 = groundY(x) - 5 - 13 * w; if (x === x0) ctx.moveTo(x, y2); else ctx.lineTo(x, y2); }
  for (x = x1; x >= x0; x -= 6) { w = fpW(x, x0, x1); ctx.lineTo(x, groundY(x) + 4 + 16 * w); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,180,0.95)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -emClk * 10; ctx.stroke(); ctx.setLineDash([]);
  /* o vento leva o ar na horizontal, da esquerda para a torre */
  ctx.strokeStyle = 'rgba(255,245,210,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -emClk * 46; ctx.lineCap = 'round';
  [0.28, 0.5, 0.72].forEach(function (q) {
    var y = T0.eddy.y + (groundY(T0.x) - 40 - T0.eddy.y) * q;
    ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(T0.x - 30, y); ctx.stroke();
  });
  ctx.setLineDash([]);
  /* o que a vegetação troca com o ar sai em pequenas nuvens que o vento leva e que se espalham
     para cima enquanto avançam. As que nascem a uma certa distância chegam à altura dos sensores; as
     que nascem ao pé da torre passam por baixo deles; as de muito longe passam por cima, diluídas.
     Formas e velocidades ilustrativas. */
  var hit = 0, sens = T0.eddy;
  [110, 270, 410].forEach(function (sx, k) {
    var gy = groundY(sx) - 18, per = 3, n;
    for (n = 0; n < 5; n++) {
      var t = ((emClk + k * 0.7) % per) + n * per, d = 38 * t, x = sx + d;
      if (x > T0.x + 60) continue;
      var r = 4 + 0.1 * d, y = gy - 0.98 * d, al = Math.min(1, t * 2) * 0.6 * Math.min(1, 12 / r);
      if (x > T0.x) al *= 1 - (x - T0.x) / 60;
      ctx.fillStyle = 'rgba(255,214,90,' + al.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      var dx = x - sens.x, dy = y - sens.y;
      if (dx * dx + dy * dy < r * r) hit = Math.max(hit, al * 1.6);
    }
  });
  if (hit > 0.02) {
    ctx.strokeStyle = 'rgba(255,236,150,' + Math.min(1, hit).toFixed(3) + ')'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(sens.x, sens.y, 12, 0, TAU); ctx.stroke();
  }
  /* redemoinhos sobre as copas: setas curvas girando */
  ctx.strokeStyle = 'rgba(255,245,210,0.9)'; ctx.lineWidth = 1.6;
  [[110, 0.4], [210, 0.55], [300, 0.45], [390, 0.6]].forEach(function (q, k) {
    var cx = q[0], cy = groundY(cx) - 60 - 70 * q[1], r = 9 + 6 * q[1], a0 = emClk * (k % 2 ? -2.2 : 2.6) + k;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + Math.PI * 1.45); ctx.stroke();
    var ax = cx + r * Math.cos(a0 + Math.PI * 1.45), ay = cy + r * Math.sin(a0 + Math.PI * 1.45), ta = a0 + Math.PI * 1.45 + Math.PI / 2 * (k % 2 ? -1 : 1);
    ctx.beginPath(); ctx.moveTo(ax - 5 * Math.cos(ta - 0.5), ay - 5 * Math.sin(ta - 0.5)); ctx.lineTo(ax, ay); ctx.lineTo(ax - 5 * Math.cos(ta + 0.5), ay - 5 * Math.sin(ta + 0.5)); ctx.stroke();
  });
  ctx.font = '600 ' + fs + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  var lab = 'área que influencia a medida', px = 30, py = groundY(150) - 12 - 165 * Math.sqrt(fpW(150, x0, x1) / 2.6) - fs * 1.2, tw = ctx.measureText(lab).width;
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; rrect(px, py - fs * 1.05, tw + fs * 0.9, fs * 1.5, fs * 0.35); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(lab, px + fs * 0.45, py);
  ctx.restore();
}
function drawParcels() {
  drawFootprint();
  if (em === 0 || !parc.length) return;
  var i, j, p, c, col, a, n, q, an, rr;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (i = 0; i < parc.length; i++) {
    /* na etapa da área medida, as parcelas recuam para o vento e as nuvens ficarem em primeiro plano */
    p = parc[i]; c = p.c; col = parcelColor(c); a = clamp(p.a) * (1 - 0.7 * fpA);
    ctx.globalAlpha = a;
    ctx.fillStyle = rgb(col, 0.5); ctx.strokeStyle = rgb(mix(col, [20, 24, 28], 0.45), 0.95); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -p.ph * 6; ctx.stroke(); ctx.setLineDash([]);
    n = Math.round(4 + 16 * c); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath();
    for (j = 0; j < n; j++) { q = p.dots[j]; an = q[0] + p.ph * 0.35; rr = q[1] * p.r * 0.86; ctx.moveTo(p.x + Math.cos(an) * rr + 1.6, p.y + Math.sin(an) * rr); ctx.arc(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr, 1.6, 0, TAU); }
    ctx.fill();
    if (p.st !== 1) {
      var ax = p.x + p.r + 7, d = p.sg > 0 ? -1 : 1;
      ctx.strokeStyle = 'rgba(22,34,42,0.9)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(ax, p.y - d * 7); ctx.lineTo(ax, p.y + d * 7); ctx.moveTo(ax - 4, p.y + d * 7 - d * 5); ctx.lineTo(ax, p.y + d * 7); ctx.lineTo(ax + 4, p.y + d * 7 - d * 5); ctx.stroke();
    }
  }
  /* CO2 entrando na vegetação (absorção) ou saindo dela (liberação) */
  for (i = 0; i < fx.length; i++) {
    var f = fx[i], u = f.t / f.life; ctx.globalAlpha = f.dir < 0 ? 1 - u : Math.min(1, u * 3) * (1 - u * 0.3);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(22,34,42,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, 2.6, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (i = 0; i < pulses.length; i++) {
    var T0 = TOWER, pu = pulses[i], u2 = pu.t / 0.8;
    ctx.strokeStyle = rgb(parcelColor(pu.c), 1 - u2); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(T0.eddy.x, T0.eddy.y, 8 + u2 * 16, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  /* o topo da torre fica por cima das parcelas */
  ctx.save(); ctx.beginPath(); ctx.rect(TOWER.x - 70, 0, 140, TOWER.eddy.y + 70); ctx.clip(); drawTower(); ctx.restore();
}
function labelPill(s, tx, ty, ax, ay, fs, al) {
  ctx.font = '600 ' + fs + 'px ' + FONT; var w = ctx.measureText(s).width, px = al === 'r' ? tx - w - fs * 0.8 : tx;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(al === 'r' ? tx : tx, ty - fs * 0.35); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ax, ay, 3, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; rrect(px, ty - fs * 1.0, w + fs * 0.8, fs * 1.5, fs * 0.35); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, px + fs * 0.4, ty + fs * 0.05);
}
/* modo Sensores: véu, torre redesenhada por cima e rótulos */
function drawEmOverlay() {
  if (emVa < 0.01) return;
  ctx.fillStyle = 'rgba(24,18,14,' + (0.5 * emVa) + ')'; ctx.fillRect(-120, -20, W + 240, H + 40);
  ctx.save(); ctx.globalAlpha = Math.min(1, emVa * 1.4); drawTower(); 
  var T0 = TOWER, fs = Math.max(12.5, 6 * W / cssW);
  labelPill('anemômetro sônico: vento', T0.eddy.x + 62, T0.eddy.y - 6, T0.eddy.x + 6, T0.eddy.y - 2, fs);
  labelPill('analisador de gás: CO₂', T0.eddy.x + 62, T0.eddy.y + 30, T0.eddy.x + 17, T0.eddy.y + 20, fs);
  labelPill('saldo-radiômetro: energia', T0.rad.x - 14, T0.rad.y + 34, T0.rad.x, T0.rad.y + 4, fs);
  ctx.restore();
}
function wrapLines(s, maxW) {
  var w = s.split(' '), lines = [], cur = '', t, i;
  for (i = 0; i < w.length; i++) { t = cur ? cur + ' ' + w[i] : w[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function drawEmHUD() {
  var x0 = Math.max(12, 10 * W / cssW), i, fs, pad, y, s, m = EM[em];
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  fs = Math.max(15, 7 * W / cssW); pad = fs * 0.6;
  ctx.font = '700 ' + fs + 'px ' + FONT; s = 'Como a torre mede o carbono';
  ctx.fillStyle = 'rgba(255,255,255,0.72)'; rrect(x0, x0, ctx.measureText(s).width + pad * 2, fs * 1.9, fs * 0.4); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(s, x0 + pad, x0 + fs * 1.27);
  if (em > 0) {
    var wy = x0 + fs * 1.9 + fs * 0.9, wl = fs * 3.2;
    ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; var wt = ctx.measureText('vento').width;
    ctx.fillStyle = 'rgba(255,255,255,0.72)'; rrect(x0, wy - fs * 0.75, wl + wt + fs * 1.6, fs * 1.5, fs * 0.4); ctx.fill();
    ctx.strokeStyle = '#16222a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    ctx.moveTo(x0 + fs * 0.6, wy); ctx.lineTo(x0 + fs * 0.6 + wl, wy); ctx.moveTo(x0 + fs * 0.6 + wl - fs * 0.35, wy - fs * 0.3); ctx.lineTo(x0 + fs * 0.6 + wl, wy); ctx.lineTo(x0 + fs * 0.6 + wl - fs * 0.35, wy + fs * 0.3); ctx.stroke();
    ctx.fillStyle = '#16222a'; ctx.fillText('vento', x0 + fs * 0.6 + wl + fs * 0.4, wy + fs * 0.3);
  }
  /* painel de leitura (modos com parcelas, exceto a área medida) */
  if (em > 0 && !m.fp) {
    fs = Math.max(12.5, 5.6 * W / cssW); pad = fs * 0.75;
    var lh = fs * 1.75, bw = fs * 4.4; ctx.font = '600 ' + fs + 'px ' + FONT; var w1 = ctx.measureText('ar que desce').width; ctx.font = '700 ' + fs + 'px ' + FONT; var w2 = ctx.measureText('Saldo: perto do equilíbrio').width; var pw = pad * 2 + Math.max(fs * 1.1 + w1 + fs * 0.8 + bw, w2), ph = pad * 2 + fs * 1.1 + lh * 2 + fs * 2.4, px = W - x0 - pw, py = x0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
    ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('CO₂ médio medido na torre', px + pad, py + pad + fs * 0.7);
    var rows = [['ar que sobe', avgU, -1], ['ar que desce', avgD, 1]];
    for (i = 0; i < 2; i++) {
      var ry = py + pad + fs * 1.1 + lh * i + lh * 0.6, d = rows[i][2];
      ctx.strokeStyle = '#16222a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.moveTo(px + pad + fs * 0.4, ry - fs * 0.7 + (d > 0 ? 0 : fs * 0.7) * 0 - d * fs * 0.35); ctx.lineTo(px + pad + fs * 0.4, ry - fs * 0.3 + d * fs * 0.35 - fs * 0.1);
      ctx.moveTo(px + pad + fs * 0.4 - fs * 0.25, ry - fs * 0.3 + d * fs * 0.35 - fs * 0.1 - d * fs * 0.25); ctx.lineTo(px + pad + fs * 0.4, ry - fs * 0.3 + d * fs * 0.35 - fs * 0.1); ctx.lineTo(px + pad + fs * 0.4 + fs * 0.25, ry - fs * 0.3 + d * fs * 0.35 - fs * 0.1 - d * fs * 0.25); ctx.stroke();
      ctx.font = '600 ' + fs + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(rows[i][0], px + pad + fs * 1.1, ry);
      var bx = px + pw - pad - bw;
      ctx.fillStyle = 'rgba(22,34,42,0.13)'; rrect(bx, ry - fs * 0.6, bw, fs * 0.55, fs * 0.27); ctx.fill();
      ctx.fillStyle = rgb(parcelColor(rows[i][1])); rrect(bx, ry - fs * 0.6, Math.max(fs * 0.5, bw * rows[i][1]), fs * 0.55, fs * 0.27); ctx.fill();
      ctx.strokeStyle = 'rgba(22,34,42,0.45)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    var df = avgU - avgD, sal = df < -0.1 ? ['Saldo: absorve CO₂', CO2IN] : df > 0.1 ? ['Saldo: libera CO₂', CO2OUT] : ['Saldo: perto do equilíbrio', '#4a5258'];
    ctx.font = '700 ' + fs + 'px ' + FONT; ctx.fillStyle = sal[1]; ctx.fillText(sal[0], px + pad, py + pad + fs * 1.1 + lh * 2 + fs * 0.9);
    ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('mais pontos = mais CO₂', px + pad, py + ph - pad * 0.8);
  }
  /* quadro de texto */
  fs = Math.max(12.5, 5.8 * W / cssW); pad = fs * 0.8;
  var cwid = Math.min(W - 2 * x0, fs * 46), lines, ch, cx = x0, cyy, lh2 = fs * 1.38, title = m.nome === 'Sensores' ? 'Os sensores no topo' : m.fp ? 'De onde vem o ar medido' : m.nome;
  ctx.font = '500 ' + fs + 'px ' + FONT; lines = wrapLines(m.txt, cwid - pad * 2);
  ch = pad * 1.7 + fs * 1.5 + lines.length * lh2; cyy = H - x0 - ch;
  ctx.fillStyle = 'rgba(24,18,14,0.84)'; rrect(cx, cyy, cwid, ch, fs * 0.5); ctx.fill();
  y = cyy + pad + fs * 0.95;
  ctx.font = '700 ' + fs * 1.1 + 'px ' + FONT; ctx.fillStyle = '#fbf3e2'; ctx.fillText(title, cx + pad, y);
  y += fs * 0.55; ctx.font = '500 ' + fs + 'px ' + FONT; ctx.fillStyle = '#f1e8d4';
  for (i = 0; i < lines.length; i++) { y += lh2; ctx.fillText(lines[i], cx + pad, y); }
  ctx.restore();
}
var needPre = true;
emSelect(0, false);
/* vista de cima, no canto superior direito: a área de onde vem o ar medido se estende contra o
   vento a partir da torre, mais larga e mais longa à noite, com o ar mais estável. Copas, forma e
   tamanhos ilustrativos, sem escala. */
var AER = (function () {
  var r = mulberry32(4711), c = [], i;
  for (i = 0; i < 70; i++) c.push([r(), r(), 0.025 + r() * 0.03, r()]);
  return c;
})();
var aerN = 0;
function drawFootprintAerial() {
  if (fpA < 0.01) return;
  var fs = Math.max(12.5, 5.8 * W / cssW), bw = Math.min(300, W * 0.3), bh = bw * 0.62, bx = W - bw - Math.max(12, 10 * W / cssW), by = Math.max(12, 10 * W / cssW), i, k;
  aerN += (((Math.floor(emClk / 4) % 2) && !reduce ? 1 : 0) - aerN) * 0.06;
  ctx.save(); ctx.globalAlpha = fpA;
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; rrect(bx - 6, by - 6, bw + 12, bh + fs * 1.9 + 12, fs * 0.5); ctx.fill();
  ctx.save(); rrect(bx, by, bw, bh, fs * 0.35); ctx.clip();
  ctx.fillStyle = '#d9c9a3'; ctx.fillRect(bx, by, bw, bh);
  for (i = 0; i < AER.length; i++) {
    var a = AER[i]; ctx.fillStyle = a[3] < 0.3 ? '#8a9a52' : a[3] < 0.7 ? '#6f8a3e' : '#58733a';
    ctx.beginPath(); ctx.arc(bx + a[0] * bw, by + a[1] * bh, a[2] * bw, 0, TAU); ctx.fill();
  }
  /* torre perto da borda a sotavento; a área se abre para a esquerda, de onde vem o vento */
  var tx = bx + bw * 0.8, ty = by + bh * 0.52, L = bw * (0.42 + 0.2 * aerN), Wd = bh * (0.2 + 0.08 * aerN);
  function gota(esc) {
    var l = L * esc, w = Wd * esc;
    ctx.beginPath(); ctx.moveTo(tx + 4, ty);
    ctx.bezierCurveTo(tx - l * 0.15, ty - w * 1.1, tx - l * 0.95, ty - w, tx - l, ty);
    ctx.bezierCurveTo(tx - l * 0.95, ty + w, tx - l * 0.15, ty + w * 1.1, tx + 4, ty);
    ctx.closePath();
  }
  var g = ctx.createRadialGradient(tx - L * 0.15, ty, 2, tx - L * 0.3, ty, L);
  g.addColorStop(0, 'rgba(255,205,60,0.85)'); g.addColorStop(1, 'rgba(255,215,80,0.12)');
  gota(1); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#3d2f12'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
  gota(0.45); ctx.lineWidth = 1.6; ctx.stroke();
  /* setas de vento */
  ctx.strokeStyle = 'rgba(22,34,42,0.75)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (k = 0; k < 3; k++) {
    var wy = by + bh * (0.22 + 0.28 * k), wx = bx + bw * 0.05 + ((emClk * 18 + k * 30) % (bw * 0.12));
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + bw * 0.1, wy); ctx.lineTo(wx + bw * 0.1 - 5, wy - 4); ctx.moveTo(wx + bw * 0.1, wy); ctx.lineTo(wx + bw * 0.1 - 5, wy + 4); ctx.stroke();
  }
  /* torre vista de cima */
  ctx.fillStyle = '#c4501f'; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.2;
  ctx.fillRect(tx - 4, ty - 4, 8, 8); ctx.strokeRect(tx - 4, ty - 4, 8, 8);
  ctx.restore();
  ctx.font = '700 ' + fs + 'px ' + FONT; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = '#16222a';
  ctx.fillText('Vista de cima', bx, by + bh + fs * 1.35);
  ctx.font = '600 ' + fs * 0.9 + 'px ' + FONT; ctx.textAlign = 'right'; ctx.fillStyle = aerN > 0.5 ? '#2d3a6b' : '#8a5a00';
  ctx.fillText(aerN > 0.5 ? 'noite: área maior' : 'dia: área menor', bx + bw, by + bh + fs * 1.35);
  ctx.restore();
}
var cena = {
  primeiroPlano: function () { drawParcels(); drawEmOverlay(); },
  substituirInterface: function () { drawEmHUD(); drawFootprintAerial(); },
  antes: emUpdate,
  ajustarEstado: function () { st.rainI = 0; st.cloud = Math.min(st.cloud, 0.15); },
  etapas: EM.map(function (m) { return { nome: m.nome, cor: m.col || null }; }),
  selecionarEtapa: function (i) { emSelect(i, true); },
  etapaAtual: function () { return em; },
  textoEtapa: function () { return EM[em].nome + '. ' + EM[em].txt; }
};
