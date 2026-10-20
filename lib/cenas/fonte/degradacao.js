/* Começa parada, sem fauna, sem torre e sem pessoas; os botões de etapa ficam na página. */
FAUNA = false; playing = false; phase = 0.45;
/* ---------- animação 6: Caatinga degradada ----------
   Etapas ilustrativas sobre a paisagem padrão, sem pessoas: conservada, na seca (que não é degradação), corte, fogo,
   pastoreio e solo exposto, erosão. A recuperação fica para a animação de produção agroecológica.
   Estoque inicial (≈125 t C/ha em Caatinga densa e partição por compartimento) e perda média após a conversão para pasto ou
   lavoura (mais de 50%, quase 65 t C/ha): Menezes et al. (2021), Geoderma 390:114943. Valores das etapas intermediárias: ilustração.
   Fogo: pouca adaptação da vegetação e ignição predominantemente humana (Bezerra et al., 2026, Atmosphere 17:46;
   Franca Rocha et al., 2024, Fire 7:437). Vetores (corte e queima, lenha, carvão, pecuária extensiva, rebrota comprometida):
   Araujo et al. (2023), Sci. Rep. 13:18440. Os desenhos não têm escala. */
var KC = ['#d9803a', '#5fae45', '#f3e2b0', '#a3714a', '#e0b43c', '#a6d04f'], KN = ['Solo', 'Parte aérea', 'Raízes', 'Madeira morta', 'Serapilheira', 'Herbáceas'];
var CO2OUT = '#d2661a';
/* t: [corte, lenha empilhada, chão queimado, solo exposto, erosão] */
var DM = [
  { nome: 'Conservada', ph: 0.45, t: [0, 0, 0, 0, 0], C: [90.1, 19.9, 9.1, 3.6, 1.6, 0.6], tot: '≈ 125 t C/ha', tit: 'Caatinga conservada',
    txt: 'Uma Caatinga densa guarda cerca de 125 toneladas de carbono por hectare, quase três quartos no solo. Copas, serapilheira e capim protegem o solo do sol e da chuva forte, e as raízes o seguram.' },
  { nome: 'Na seca', ph: 0.88, t: [0, 0, 0, 0, 0], C: [90.1, 19.9, 9.1, 3.6, 1.6, 0.6], tot: '≈ 125 t C/ha', tit: 'Sem folhas na seca não é degradação',
    txt: 'Na seca a Caatinga perde as folhas, mas não está degradada: o carbono continua na madeira, nas raízes e no solo, e as folhas voltam com as primeiras chuvas. Confundir as duas coisas é um erro possível no monitoramento por satélite.' },
  { nome: 'Corte', ph: 0.82, t: [1, 1, 0, 0, 0], C: [90.1, 0, 9.1, 7, 1.6, 0.6], tot: '', tit: 'Corte da vegetação',
    txt: 'A retirada de madeira para lenha e carvão e o desmatamento para abrir área levam embora o carbono da parte aérea. Ficam tocos, raízes e galhos finos no chão, e o solo perde a sombra das copas.' },
  { nome: 'Fogo', ph: 0.95, t: [1, 0, 1, 0.6, 0], C: [89, 0, 8.5, 0.5, 0, 0], tot: '', tit: 'Fogo',
    txt: 'O fogo queima galhos, serapilheira e capim e devolve à atmosfera, em poucas horas, o carbono acumulado em anos. A vegetação da Caatinga tem pouca adaptação ao fogo, e a maior parte dos incêndios na região tem origem humana.' },
  { nome: 'Pastoreio', ph: 0.28, t: [1, 0, 0.3, 1, 0], C: [82, 0, 5.5, 0.2, 0.2, 0.3], tot: '', tit: 'Pastoreio e solo exposto',
    txt: 'Com o pastoreio contínuo, o capim fica rente ao chão e as rebrotas e plântulas são comidas, então a vegetação não volta. O solo descoberto endurece na superfície, e a água da chuva infiltra menos e escorre mais.' },
  { nome: 'Erosão', ph: 0.36, t: [1, 0, 0, 1, 1], C: [55, 0, 3.5, 0, 0.2, 0.3], tot: '≈ 60 t C/ha', tit: 'Erosão',
    txt: 'A chuva forte cai sobre o solo nu e a enxurrada arrasta a camada de cima, a mais escura e rica em matéria orgânica. Abrem-se sulcos e as raízes ficam de fora. Em média, trocar Caatinga densa por pasto ou lavoura perde mais da metade do carbono do ecossistema.' }
];
var dm = 0, dg = { cut: 0, pile: 0, char: 0, bare: 0, ero: 0 }, fireA = 0, cNow = DM[0].C.slice(), phT = 0.45, dTour = 0, dTouring = !reduce, dclk = 0, dha = 1;
var smoke = [], dco2 = [], accSm = 0, accC = 0;
var DKEYS = ['cut', 'pile', 'char', 'bare', 'ero'];
function dgSnap() { if (!reduce) return; var k; for (k = 0; k < 5; k++) dg[DKEYS[k]] = DM[dm].t[k]; fireA = dm === 3 ? 1 : 0; cNow = DM[dm].C.slice(); phase = phT; dha = 1; }
function dgSelect(i, user) {
  if (user) dTouring = false;
  dm = i; dTour = 0; phT = DM[i].ph; dha = 0;
  dgSnap();
}
/* geometria fixa: tocos, galhos no chão, pilhas de lenha, pontos de fogo, sulcos */
var STUMPS = null, SLASH = null, FLM = null, GUL = [[300, 16, 26], [500, 14, 22], [742, 16, 24]];
function buildDeg() {
  var r = mulberry32(9090), i, p, x;
  STUMPS = [];
  SP.forEach(function (s) { STUMPS.push({ x: s.x, w: s.kind === 'tree' ? 15 : 10, h: 9 + r() * 4, cac: s.kind !== 'tree' }); });
  near.forEach(function (q) { if (!q.hidden && q.h > 60) STUMPS.push({ x: q.x, w: 8, h: 6 + r() * 4 }); });
  fill.forEach(function (q) { if (q.h > 70) STUMPS.push({ x: q.x, w: 7, h: 5 + r() * 3 }); });
  SLASH = [];
  for (i = 0; i < 70; i++) { x = 14 + r() * (W - 28); if (outcropH(x) > 0.5) continue; SLASH.push({ x: x, a: (r() - 0.5) * 0.5, l: 10 + r() * 14, b: r() < 0.5 }); }
  FLM = [];
  for (x = 20; x < W - 10; x += 19) { if (outcropH(x) > 0.5) continue; FLM.push({ x: x + (r() - 0.5) * 8, h: 12 + r() * 12, ph: r() * TAU }); }
}
function gully(x) { var d = 0; for (var k = 0; k < GUL.length; k++) { var u = (x - GUL[k][0]) / GUL[k][1]; if (Math.abs(u) < 1) d = Math.max(d, GUL[k][2] * (1 - u * u)); } return d; }
function newSurf(x, i) { return GY[i] + dg.ero * (0.75 * (GA[i] - GY[i]) + gully(x)); }
function surfAt(x) { var y0 = groundY(x); return y0 + dg.ero * (0.75 * 0.3 * soilD(x) + gully(x)); }
function degUpdate(dt) {
  T += dt; dclk += dt; dha = Math.min(1, dha + dt * 3);
  var dph = ((phT - phase + 0.5) % 1 + 1) % 1 - 0.5; phase = (phase + dph * Math.min(1, dt * 2.2) + 1) % 1;
  var k, f = Math.min(1, dt * 1.6);
  for (k = 0; k < 5; k++) dg[DKEYS[k]] += (DM[dm].t[k] - dg[DKEYS[k]]) * f;
  for (k = 0; k < 6; k++) cNow[k] += (DM[dm].C[k] - cNow[k]) * Math.min(1, dt * 2);
  fireA += ((dm === 3 ? 1 : 0) - fireA) * Math.min(1, dt * 1.2);
  if (!FLM) buildDeg();
  /* fumaça e CO2 do fogo; um pouco de CO2 do solo exposto na erosão */
  accSm += fireA * 14 * dt; accC += (fireA * 26 + dg.ero * 4) * dt;
  while (accSm >= 1) { accSm -= 1; var fl = FLM[(Math.random() * FLM.length) | 0]; if (smoke.length < 120) smoke.push({ x: fl.x, y: groundY(fl.x) - 14, vx: 6 + Math.random() * 8, vy: -(22 + Math.random() * 16), r: 5, a: 0.36 }); }
  while (accC >= 1) {
    accC -= 1; var fx = fireA > 0.2 ? FLM[(Math.random() * FLM.length) | 0].x : 10 + Math.random() * (W - 20);
    if (dco2.length < 160) dco2.push({ x: fx, y: (fireA > 0.2 ? groundY(fx) - 16 : surfAt(fx) - 2), vy: -(fireA > 0.2 ? 60 + Math.random() * 30 : 24 + Math.random() * 12), u: 0, v: 0.45 + Math.random() * 0.2, ph: Math.random() * TAU, tag: Math.random() < 0.07 });
  }
  var i;
  for (i = smoke.length - 1; i >= 0; i--) { var s = smoke[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.r += 14 * dt; s.a -= (0.09 + 0.5 * (1 - fireA)) * dt; if (s.a <= 0) smoke.splice(i, 1); }
  for (i = dco2.length - 1; i >= 0; i--) { var c = dco2[i]; c.u += c.v * dt; c.y += c.vy * dt; if (c.u >= 1) dco2.splice(i, 1); }
  if (dTouring) { dTour += dt; if (dTour > 9) dgSelect((dm + 1) % DM.length, false); }
}
/* solo: chão queimado, crosta do solo exposto, camada de cima levada pela erosão, sulcos e enxurrada */
function drawSoilDeg() {
  if (!FLM) buildDeg();
  var i, n = GX.length, S = clamp(st.S);
  if (dg.char > 0.01) {
    ctx.fillStyle = 'rgba(30,22,16,' + (0.78 * dg.char) + ')'; ctx.beginPath();
    for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], GY[i] - 0.5); else ctx.moveTo(GX[i], GY[i] - 0.5); }
    for (i = n - 1; i >= 0; i--) ctx.lineTo(GX[i], GY[i] + 3 + 3 * dg.char);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(214,208,200,' + (0.7 * dg.char) + ')'; ctx.beginPath();
    for (i = 0; i < SLASH.length; i++) { var ax = SLASH[i].x + 4; ctx.moveTo(ax + 1.6, groundY(ax) - 1); ctx.arc(ax, groundY(ax) - 1, 1.6, 0, TAU); }
    ctx.fill();
  }
  if (dg.bare > 0.01 && dg.ero < 0.99) {
    ctx.strokeStyle = 'rgba(222,176,124,' + (0.85 * dg.bare * (1 - dg.ero)) + ')'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], GY[i] + 1.2); else ctx.moveTo(GX[i], GY[i] + 1.2); }
    ctx.stroke();
  }
  if (dg.ero > 0.01) {
    var bg = rgb(mix([170, 146, 112], [140, 118, 88], S)), ny = [];
    for (i = 0; i < n; i++) ny.push(newSurf(GX[i], i));
    ctx.fillStyle = bg; ctx.beginPath();
    for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], GY[i] - 1.5); else ctx.moveTo(GX[i], GY[i] - 1.5); }
    for (i = n - 1; i >= 0; i--) ctx.lineTo(GX[i], ny[i]);
    ctx.closePath(); ctx.fill();
    /* parede dos sulcos */
    ctx.strokeStyle = 'rgba(120,64,40,' + (0.7 * dg.ero) + ')'; ctx.lineWidth = 1;
    GUL.forEach(function (g) { for (var k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(g[0] + k * g[1], groundY(g[0] + k * g[1])); ctx.lineTo(g[0] + k * g[1] * 0.25, surfAt(g[0]) - 2); ctx.stroke(); } });
    /* nova superfície */
    ctx.strokeStyle = 'rgba(52,30,20,0.85)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], ny[i]); else ctx.moveTo(GX[i], ny[i]); }
    ctx.stroke();
    /* enxurrada: lâmina barrenta e riscos que correm morro abaixo (para a direita) */
    if (st.rainI > 0.05) {
      var wa = dg.ero * clamp(st.rainI * 1.5);
      ctx.strokeStyle = 'rgba(132,88,52,' + (0.6 * wa) + ')'; ctx.lineWidth = 3.2; ctx.beginPath();
      for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], ny[i] - 1.6); else ctx.moveTo(GX[i], ny[i] - 1.6); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(226,186,136,' + (0.95 * wa) + ')'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
      for (i = 0; i < 46; i++) { var xx = ((i * 23 + dclk * 46) % (W + 40)) - 20; if (outcropH(xx) > 0.5) continue; var yy = surfAt(xx) - 1.8; ctx.moveTo(xx, yy); ctx.lineTo(xx + 9, surfAt(xx + 9) - 1.8); }
      ctx.stroke();
    }
  }
}
/* água escorrendo no solo exposto (pastoreio): riscos azulados na superfície */
function drawRunoff() {
  var a = dg.bare * (1 - dg.ero) * clamp(st.rainI * 2);
  if (a < 0.03) return;
  ctx.save(); ctx.strokeStyle = 'rgba(120,186,236,' + (0.95 * a) + ')'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath();
  for (var i = 0; i < 40; i++) { var xx = ((i * 26 + dclk * 34) % (W + 40)) - 20; if (outcropH(xx) > 0.5) continue; ctx.moveTo(xx, groundY(xx) - 1.5); ctx.lineTo(xx + 10, groundY(xx + 10) - 1.5); }
  ctx.stroke(); ctx.restore();
}
function drawSlash() {
  if (!FLM) buildDeg();
  var a = dg.cut * (1 - dg.char);
  if (a > 0.02) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#6e6450'; ctx.lineCap = 'round';
    SLASH.forEach(function (s) {
      var y = groundY(s.x) - 1.5, dx = Math.cos(s.a) * s.l / 2, dy = Math.sin(s.a) * s.l / 2;
      ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(s.x - dx, y - dy); ctx.lineTo(s.x + dx, y + dy);
      if (s.b) { ctx.moveTo(s.x + dx * 0.3, y + dy * 0.3); ctx.lineTo(s.x + dx * 0.3 + 5, y - 5); }
      ctx.stroke();
    });
    ctx.restore();
  }
  if (dg.pile > 0.02) {
    ctx.save(); ctx.globalAlpha = dg.pile;
    [[200, 0], [600, 1], [760, 0]].forEach(function (pl) {
      var x = pl[0], y = groundY(x), k, row, cx, cy;
      for (row = 0; row < 3; row++) for (k = 0; k < 4 - row; k++) {
        cx = x - 15 + k * 10 + row * 5; cy = y - 4.5 - row * 8.5;
        ctx.fillStyle = '#8a6a4a'; ctx.strokeStyle = 'rgba(40,26,16,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, 4.6, 4.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d9bf93'; ctx.beginPath(); ctx.ellipse(cx, cy, 2.8, 2.5, 0, 0, TAU); ctx.fill();
      }
    });
    ctx.restore();
  }
}
/* tocos: no lugar de cada árvore, arbusto e cacto cortado; com a erosão, ficam sobre um pedestal de solo e com raízes de fora */
function drawStumps() {
  if (dg.cut < 0.02) return;
  if (!FLM) buildDeg();
  ctx.save(); ctx.globalAlpha = dg.cut; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  var ch = dg.char * 0.75;
  STUMPS.forEach(function (s) {
    var x = s.x, y = groundY(x), w = s.w, h = s.h, ny = surfAt(x);
    if (dg.ero > 0.02 && ny > y + 1) {
      ctx.fillStyle = 'rgb(112,66,48)'; ctx.beginPath(); ctx.moveTo(x - w * 0.9, y); ctx.lineTo(x + w * 0.9, y); ctx.lineTo(x + w * 1.5, ny); ctx.lineTo(x - w * 1.5, ny); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(40,22,14,0.7)'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x - w * 0.6, y + 1); ctx.quadraticCurveTo(x - w * 1.6, (y + ny) / 2, x - w * 2.4, ny + 2); ctx.moveTo(x + w * 0.6, y + 1); ctx.quadraticCurveTo(x + w * 1.7, (y + ny) / 2, x + w * 2.5, ny + 2); ctx.stroke();
      ctx.strokeStyle = '#ead8b4'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    var body = s.cac ? mix([96, 128, 88], [36, 30, 24], ch) : mix([122, 100, 76], [36, 30, 24], ch), top = s.cac ? mix([168, 196, 150], [50, 42, 34], ch) : mix([222, 198, 158], [60, 50, 40], ch);
    ctx.fillStyle = rgb(body); ctx.strokeStyle = 'rgba(30,20,14,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - w * 0.95, y + 1); ctx.lineTo(x - w * 0.55, y - h); ctx.lineTo(x + w * 0.55, y - h + 1.5); ctx.lineTo(x + w * 0.95, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgb(top); ctx.beginPath(); ctx.ellipse(x, y - h + 0.7, w * 0.55, 2.2, 0.06, 0, TAU); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}
/* fogo: chamas tremulando sobre os galhos, brasa no chão, fumaça e CO2 subindo */
function drawFire() {
  var i;
  if (fireA > 0.01) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,120,40,' + (0.55 * fireA) + ')'; ctx.lineWidth = 3; ctx.beginPath();
    for (i = 0; i < GX.length; i++) { if (i) ctx.lineTo(GX[i], GY[i] - 1); else ctx.moveTo(GX[i], GY[i] - 1); }
    ctx.stroke();
    FLM.forEach(function (f, k) {
      var y = groundY(f.x), h = f.h * fireA * (0.75 + 0.25 * Math.sin(T * 11 + f.ph)), sw = Math.sin(T * 7 + f.ph) * 3;
      ctx.fillStyle = 'rgba(232,108,36,0.92)'; ctx.beginPath(); ctx.moveTo(f.x - 6, y); ctx.quadraticCurveTo(f.x - 6, y - h * 0.55, f.x + sw, y - h); ctx.quadraticCurveTo(f.x + 6, y - h * 0.55, f.x + 6, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(248,200,80,0.95)'; ctx.beginPath(); ctx.moveTo(f.x - 3, y); ctx.quadraticCurveTo(f.x - 3, y - h * 0.35, f.x + sw * 0.6, y - h * 0.6); ctx.quadraticCurveTo(f.x + 3, y - h * 0.35, f.x + 3, y); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  if (smoke.length) {
    ctx.save();
    smoke.forEach(function (s) { ctx.fillStyle = 'rgba(112,106,100,' + Math.max(0, s.a) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  if (dco2.length) {
    var fs = Math.max(10, 7.5 * W / cssW);
    ctx.save(); ctx.lineCap = 'round';
    dco2.forEach(function (c) {
      var a = smooth(0, 0.12, c.u) * (1 - smooth(0.6, 1, c.u)), x = c.x + Math.sin(T * 2 + c.ph) * 3;
      if (a < 0.03) return;
      ctx.globalAlpha = a * 0.55; ctx.strokeStyle = CO2OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, c.y + 11); ctx.lineTo(x, c.y); ctx.stroke();
      ctx.globalAlpha = a; ctx.fillStyle = CO2OUT; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, c.y, 3.7, 0, TAU); ctx.fill(); ctx.stroke();
      if (c.tag) txt('CO₂', x + 7, c.y + fs * 0.35, { c: CO2OUT, halo: 'rgba(255,255,255,0.85)', sz: fs, w: 700 });
    });
    ctx.restore();
  }
}
/* rótulos na cena: caixa branca com linha até o ponto indicado */
function degLabel(s, tx, ty, ax, ay, fs) {
  ctx.save(); ctx.globalAlpha = clamp(dha); ctx.font = '600 ' + fs + 'px ' + FONT;
  var w = ctx.measureText(s).width + fs * 0.9, px = Math.max(8, Math.min(W - 8 - w, tx - w / 2));
  ctx.strokeStyle = 'rgba(22,34,42,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(clamp(ax, px + 6, px + w - 6), ty + fs * 0.5); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.fillStyle = '#16222a'; ctx.beginPath(); ctx.arc(ax, ay, 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; rrect(px, ty - fs * 1.0, w, fs * 1.5, fs * 0.35); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, px + fs * 0.45, ty + fs * 0.05);
  ctx.restore();
}
function drawDegLabels() {
  var fs = Math.max(12.5, 5.6 * W / cssW);
  if (dm === 2) { degLabel('toco', 395, 262, 395, groundY(395) - 10, fs); degLabel('lenha empilhada', 640, 230, 600, groundY(600) - 24, fs); degLabel('galhos finos no chão', 860, 262, 880, groundY(880) - 3, fs); }
  else if (dm === 4) { degLabel('a água escorre e infiltra pouco', 700, 240, 760, groundY(760) - 2, fs); }
  else if (dm === 5) { degLabel('sulco', 500, 250, 500, surfAt(500) - 4, fs); degLabel('raízes de fora', 300, 214, 260, surfAt(260) - 4, fs); degLabel('enxurrada leva o solo', 800, 240, 790, surfAt(790) - 2, fs); }
}
function herbScale() { return (1 - dg.char) * (1 - 0.75 * dg.bare) * (1 - dg.ero); }
function wrapLines(s, maxW) {
  var w = s.split(' '), lines = [], cur = '', t, i;
  for (i = 0; i < w.length; i++) { t = cur ? cur + ' ' + w[i] : w[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
/* painel: carbono no ecossistema por compartimento (barra empilhada, mesma escala e cores da animação 2) */
function drawDegPanel(x0) {
  var fs = Math.max(12.5, 5.6 * W / cssW), pad = fs * 0.75, bw = fs * 15, bh = fs * 1.1, i, tot = 0;
  for (i = 0; i < 6; i++) tot += Math.max(0, cNow[i]);
  ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; var lw = 0; for (i = 0; i < 6; i++) lw = Math.max(lw, ctx.measureText(KN[i]).width);
  ctx.font = '500 ' + fs * 0.75 + 'px ' + FONT; var nw = ctx.measureText('linha tracejada: Caatinga densa; etapas: ilustração').width;
  var colW = fs * 1.2 + lw + fs * 0.8, pw = pad * 2 + Math.max(bw, colW * 2, nw), ph = pad * 2 + fs * 1.0 + fs * 2.0 + bh + fs * 0.9 + fs * 1.45 * 3 + fs * 1.3, px = W - x0 - pw, py = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.84)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('carbono no ecossistema (por hectare)', px + pad, py + pad + fs * 0.7);
  var tl = DM[dm].tot; ctx.font = '700 ' + fs * 1.5 + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(tl || ' ', px + pad, py + pad + fs * 2.6);
  var by = py + pad + fs * 3.2, bx = px + pad, full = bw, xx = bx;
  ctx.fillStyle = 'rgba(22,34,42,0.10)'; rrect(bx, by, full, bh, fs * 0.25); ctx.fill();
  for (i = 0; i < 6; i++) { var w = full * Math.max(0, cNow[i]) / 125; if (w < 0.3) continue; ctx.fillStyle = KC[i]; ctx.fillRect(xx, by, w, bh); xx += w; }
  ctx.strokeStyle = 'rgba(22,34,42,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx + full, by - fs * 0.3); ctx.lineTo(bx + full, by + bh + fs * 0.3); ctx.stroke(); ctx.setLineDash([]);
  var ly = by + bh + fs * 1.5;
  ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT;
  for (i = 0; i < 6; i++) {
    var cx = bx + (i % 2) * colW, cy = ly + Math.floor(i / 2) * fs * 1.45;
    ctx.fillStyle = KC[i]; ctx.strokeStyle = 'rgba(22,34,42,0.6)'; rrect(cx, cy - fs * 0.7, fs * 0.8, fs * 0.8, fs * 0.18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#16222a'; ctx.fillText(KN[i], cx + fs * 1.15, cy);
  }
  ctx.font = '500 ' + fs * 0.75 + 'px ' + FONT; ctx.fillStyle = '#4a5258';
  ctx.fillText('linha tracejada: Caatinga densa; etapas: ilustração', px + pad, py + ph - pad * 0.8);
}
function drawDegHUD() {
  var x0 = Math.max(12, 10 * W / cssW), fs, pad, y, i, m = DM[dm];
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  fs = Math.max(15, 7 * W / cssW); pad = fs * 0.6;
  ctx.font = '700 ' + fs + 'px ' + FONT; var s = 'Caatinga degradada';
  ctx.fillStyle = 'rgba(255,255,255,0.72)'; rrect(x0, x0, ctx.measureText(s).width + pad * 2, fs * 1.9, fs * 0.4); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(s, x0 + pad, x0 + fs * 1.27);
  drawDegPanel(x0);
  fs = Math.max(12.5, 5.8 * W / cssW); pad = fs * 0.8;
  var cwid = Math.min(W - 2 * x0, fs * 46), lh2 = fs * 1.38, lines;
  ctx.font = '500 ' + fs + 'px ' + FONT; lines = wrapLines(m.txt, cwid - pad * 2);
  var ch = pad * 1.7 + fs * 1.5 + lines.length * lh2, cyy = H - x0 - ch;
  ctx.globalAlpha = 0.4 + 0.6 * dha;
  ctx.fillStyle = 'rgba(24,18,14,0.84)'; rrect(x0, cyy, cwid, ch, fs * 0.5); ctx.fill();
  y = cyy + pad + fs * 0.95;
  ctx.font = '700 ' + fs * 1.1 + 'px ' + FONT; ctx.fillStyle = '#fbf3e2'; ctx.fillText((dm + 1) + '. ' + m.tit, x0 + pad, y);
  y += fs * 0.55; ctx.font = '500 ' + fs + 'px ' + FONT; ctx.fillStyle = '#f1e8d4';
  for (i = 0; i < lines.length; i++) { y += lh2; ctx.fillText(lines[i], x0 + pad, y); }
  ctx.restore();
}
dgSelect(0, false);
var cena = {
  semTempo: true,
  planoFrente: function (bark, pan) {
    var i;
    drawSoil();
    drawSoilDeg();
    drawLitter(litFg, st.lit * (1 - dg.char) * (1 - dg.bare), 0.9);
    drawSlash();
    if (dg.cut < 0.99) {
      ctx.save(); ctx.globalAlpha = 1 - dg.cut;
      for (i = 0; i < near.length; i++) if (!near[i].hidden) drawPlant(near[i], bark, false);
      for (i = 0; i < fill.length; i++) drawPlant(fill[i], bark, false);
      drawSpecies();
      drawSucc(0.94 + 0.06 * st.S);
      ctx.restore();
    }
    drawStumps();
    if (herbScale() > 0.02) drawHerbs(herbsFg, false, pan, herbScale());
    drawRunoff();
    drawFire();
    drawDegLabels();
  },
  substituirInterface: function () { drawRain(); drawDegHUD(); },
  antes: function (dt) { if (!reduce) degUpdate(dt); },
  ajustarEstado: function (dt) {
    if (dm >= 4) { st.rainI = Math.max(st.rainI, dm === 5 ? 0.85 : 0.35); st.cloud = Math.max(st.cloud, 0.55); if (dt) updateRain(dt); }
    else { st.rainI = 0; st.cloud = Math.min(st.cloud, 0.15); }
  },
  etapas: DM.map(function (m, k) { return { nome: (k + 1) + '. ' + m.nome, cor: null }; }),
  selecionarEtapa: function (i) { dgSelect(i, true); },
  etapaAtual: function () { return dm; },
  textoEtapa: function () { return DM[dm].tit + '. ' + DM[dm].txt; }
};
