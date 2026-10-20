/* Começa parada, sem fauna; os botões e o ajuste da CUE vão no painel que a página reserva. */
FAUNA = false; playing = false; phase = 0.45;
var PAINEL = opcoes.painel; PAINEL.innerHTML = "<div class=\"chips\" id=\"chips\" role=\"group\" aria-label=\"Explicação\"></div><div class=\"cuectl\" id=\"cuectl\"><span>Valor medido:</span><span class=\"chips\" id=\"sites\" role=\"group\" aria-label=\"Sítio medido\"></span><label for=\"cue\">ou ajuste <input id=\"cue\" type=\"range\" min=\"31\" max=\"58\" step=\"1\" value=\"58\"><output id=\"cue-out\" for=\"cue\">0,58</output></label></div><p id=\"sr\" class=\"sr\" aria-live=\"polite\"></p>";
function $id(id) { return PAINEL.querySelector('#' + id); }
/* ---------- animação 6: eficiência de uso do carbono (CUE) ----------
   CUE = NEP/GPP = (GPP - Reco) / GPP: fração do carbono fixado na fotossíntese que fica no ecossistema.
   Faixa medida em torres da Caatinga: 0,31 (área cristalina) a 0,58 (ecótono do Agreste); no conjunto, maior que a de outras florestas secas
   e de ecossistemas sul-americanos, incluindo a Amazônia (Mendes et al., 2025, AFM 369, 110573).
   As três razões seguem a discussão desse artigo: (1) folhas que brotam logo após as primeiras chuvas, plantas que maximizam o uso da água
   e GPP maior que Reco na estação chuvosa; (2) na seca, queda das folhas (tolerância à seca), respiração das plantas em nível basal
   (inferida pelos autores, sem medição em câmaras) e respiração do solo reduzida pelo solo seco e quente e por menos exsudatos das raízes;
   (3) sítios com mais chuva e solo mais profundo retêm mais água e têm CUE maior (interpretação dos autores para Agreste x cristalino).
   O estoque menor de carbono orgânico aparece no artigo só como fator complementar e ficou fora da ilustração.
   Modos 1 a 3 usam o modelo conceitual do ciclo anual, com a respiração reescalada (QSC = ΣGPP/ΣReco do modelo) para que o ano inteiro resulte na CUE escolhida.
   Comparação com outras florestas (poucos por cento a cerca de um terço): síntese de torres de fluxo em Fernández-Martínez et al. (2014), Nat. Clim. Change 4:471. */
var CO2IN = '#0b7a97', REC_C = '#d2661a', NPP_C = '#3f9a3a', SOIL_C = '#d9803a', WAT_C = 'rgba(105,186,250,', QSC = 1.627;
var QM = [
  { nome: 'O que é a CUE', ph: 0.45, tit: 'O que é a CUE' },
  { nome: 'Por quê? Chuva', ph: 0.35, tit: 'Por quê? 1. As plantas respondem rápido à chuva',
    txt: 'Com as primeiras chuvas, as folhas brotam em poucos dias e a fotossíntese dispara. Adaptadas à falta de água, as plantas aproveitam bem cada chuva: nos meses chuvosos, entra mais carbono do que sai pela respiração.' },
  { nome: 'Por quê? Seca', ph: 0.9, tit: 'Por quê? 2. Na seca, as plantas economizam',
    txt: 'Na seca, as plantas perdem as folhas para poupar água e respiram só o mínimo para se manterem vivas. No solo seco e quente, com menos alimento vindo das raízes, os microrganismos também quase param. Entra pouco carbono, mas sai pouco.' },
  { nome: 'Por quê? Água no solo', ph: 0.45, tit: 'Por quê? 3. Solo que guarda água',
    txt: 'No ecótono do Agreste, a chuva é maior e mais bem distribuída, e o solo, mais profundo, guarda mais água: a vegetação fica mais densa e a CUE chega a 0,58. Na área cristalina, o solo raso e pedregoso guarda pouca água e a CUE fica em 0,31.' }
];
var QTOUR = [[0, 0.58], [0, 0.31], [1], [2], [3]];
var co2 = [], acc = [0, 0, 0, 0], qm = 0, cueT = 0.58, cueV = 0.58, phTarget = 0.45, touring = !reduce, tourT = 0, tix = 0, qva = 0, qha = 1, qclk = 0;
var modeChips = [], siteChips = [], srEl = $id('sr'), sl = $id('cue'), slOut = $id('cue-out'), ctlBox = $id('cuectl');
function f2(v) { return v.toFixed(2).replace('.', ','); }
function siteName(v) { return Math.abs(v - 0.31) < 0.005 ? 'Área cristalina' : Math.abs(v - 0.58) < 0.005 ? 'Ecótono do Agreste' : ''; }
function cueLine(v) { var n = Math.round(v * 100), s = siteName(v); return (s ? s + ', CUE de ' : 'CUE de ') + f2(v) + ': de cada 100 unidades fixadas, ' + n + ' ficam e ' + (100 - n) + ' voltam à atmosfera.'; }
function refresh() {
  var k;
  for (k = 0; k < modeChips.length; k++) modeChips[k].setAttribute('aria-pressed', k === qm ? 'true' : 'false');
  siteChips[0].setAttribute('aria-pressed', Math.abs(cueT - 0.31) < 0.005 ? 'true' : 'false'); siteChips[1].setAttribute('aria-pressed', Math.abs(cueT - 0.58) < 0.005 ? 'true' : 'false');
  ctlBox.style.display = qm === 0 ? '' : 'none';
  srEl.textContent = qm === 0 ? 'O que é a CUE: fração do carbono fixado que fica no ecossistema, descontada a respiração das plantas e do solo. ' + cueLine(cueT) : QM[qm].tit + '. ' + QM[qm].txt;
}
/* movimento reduzido: sem transições; a cena salta direto para o estado do modo */
function snap() { if (!reduce) return; phase = phTarget; cueV = cueT; qva = qm === 3 ? 1 : 0; qha = 1; }
function setCue(v, user) {
  if (user) touring = false;
  cueT = v; tourT = 0; sl.value = Math.round(v * 100); slOut.textContent = f2(v); refresh(); snap();
}
function setMode(m, user) {
  if (user) touring = false;
  qm = m; phTarget = QM[m].ph; qha = 0; tourT = 0; refresh(); snap();
}
(function () {
  var box = $id('chips'), sbox = $id('sites');
  function mk(parent, label, fn, arr) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'false');
    b.appendChild(document.createTextNode(label)); b.addEventListener('click', fn); parent.appendChild(b); arr.push(b);
  }
  QM.forEach(function (m, k) { mk(box, m.nome, function () { setMode(k, true); }, modeChips); });
  [['Área cristalina: 0,31', 0.31], ['Ecótono do Agreste: 0,58', 0.58]].forEach(function (m) { mk(sbox, m[0], function () { setCue(m[1], true); }, siteChips); });
  sl.addEventListener('input', function () { setCue(parseInt(sl.value, 10) / 100, true); });
})();
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
/* k: 0 entra (GPP), 1 sai das plantas, 2 sai do solo e serapilheira, 3 carbono que fica (vai para tronco e raízes) */
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
/* respiração do modelo, reescalada para que o ano inteiro resulte na CUE escolhida */
function recoNow() { return (1 - cueV) * QSC * st.Reco; }
function updateFx(dt) {
  var i, inn, outT, stay;
  T += dt; qclk += dt; qha = Math.min(1, qha + dt * 3);
  cueV += (cueT - cueV) * Math.min(1, dt * 3);
  var dph = ((phTarget - phase + 0.5) % 1 + 1) % 1 - 0.5; phase = (phase + dph * Math.min(1, dt * 2.5) + 1) % 1;
  qva += ((qm === 3 ? 1 : 0) - qva) * Math.min(1, dt * 6);
  if (qm === 0) { inn = st.GPP * 30; stay = inn * cueV; outT = inn * (1 - cueV); }
  else { inn = st.GPP * 30; outT = recoNow() * 30; stay = Math.max(0, inn - outT); }
  var r = [inn, outT * 0.5, outT * 0.5, stay];
  for (i = 0; i < 4; i++) { acc[i] += r[i] * dt; while (acc[i] >= 1) { acc[i] -= 1; if (co2.length < 330) spawnFx(i); } }
  for (i = co2.length - 1; i >= 0; i--) { co2[i].u += co2[i].v * dt; if (co2[i].u >= 1) co2.splice(i, 1); }
  if (touring) { tourT += dt; if (tourT > 8.5) { tix = (tix + 1) % QTOUR.length; var s = QTOUR[tix]; if (s.length > 1) { cueT = s[1]; sl.value = Math.round(s[1] * 100); slOut.textContent = f2(s[1]); } setMode(s[0], false); } }
}
var FXCOL = [CO2IN, REC_C, REC_C, NPP_C];
function drawFx() {
  var i, p, a, r, x, y, dx, dy, dl, col, s = Math.max(10, 7.5 * W / cssW), u, fa = 1 - 0.65 * qva;
  ctx.lineCap = 'round';
  for (i = 0; i < co2.length; i++) {
    p = co2[i]; col = FXCOL[p.k];
    if (p.k === 3) {
      u = p.u;
      if (u < 0.5) { var f = u / 0.5; x = p.x0 + (p.x1 - p.x0) * f; y = p.y0 + (p.y1 - p.y0) * f; dx = p.x1 - p.x0; dy = p.y1 - p.y0; }
      else { var g = (u - 0.5) / 0.5; x = p.x1 + (p.x2 - p.x1) * g; y = p.y1 + (p.y2 - p.y1) * g; dx = p.x2 - p.x1; dy = p.y2 - p.y1; }
      a = smooth(0, 0.1, u) * (1 - smooth(0.88, 1, u)) * fa; if (a < 0.03) continue;
      dl = Math.sqrt(dx * dx + dy * dy) || 1;
      ctx.globalAlpha = a * 0.5; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - dx / dl * 10, y - dy / dl * 10); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = a; ctx.fillStyle = col; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(x - 3.6, y - 3.6, 7.2, 7.2); ctx.fill(); ctx.stroke();
      continue;
    }
    x = p.x0 + (p.x1 - p.x0) * p.u + Math.sin(T * 2 + p.ph) * 3 * (1 - p.u); y = p.y0 + (p.y1 - p.y0) * p.u;
    if (p.k === 0) { a = smooth(0, 0.12, p.u) * (1 - smooth(0.86, 1, p.u)); r = 3.7 * (1 - 0.5 * smooth(0.8, 1, p.u)); }
    else { a = smooth(0, 0.1, p.u) * (1 - smooth(0.55, 1, p.u)); r = 3.7; }
    a *= fa; if (a < 0.03) continue;
    dx = p.x1 - p.x0; dy = p.y1 - p.y0; dl = Math.sqrt(dx * dx + dy * dy) || 1;
    ctx.globalAlpha = a * 0.55; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - dx / dl * 11, y - dy / dl * 11); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    if (p.tag) { ctx.globalAlpha = a; txt('CO₂', x + r + 3, y + s * 0.35, { c: col, halo: 'rgba(255,255,255,0.85)', sz: s, w: 700 }); }
  }
  ctx.globalAlpha = 1;
}
/* gotas de água guardada no solo (modo 3): o número em cada coluna acompanha a profundidade do solo */
var SDROP = (function () {
  var r = mulberry32(606), a = [], x, d, n, k;
  for (x = -90; x <= W + 90; x += 14) {
    d = soilD(x); n = Math.floor(d / 14);
    for (k = 0; k < n; k++) a.push(x + (r() - 0.5) * 6, groundY(x) + d * (k + 0.5) / n + (r() - 0.5) * 4, 1.8 + r() * 0.8, r() * TAU);
  }
  return a;
})();
/* modo 3: véu sobre a cena; o solo (horizontes A e B) é redesenhado por cima, com a água guardada em gotas azuis */
function drawCueOverlay() {
  if (qva < 0.01) return;
  var wet = 0.75 * clamp(st.S), i;
  ctx.fillStyle = 'rgba(24,18,14,' + (0.6 * qva) + ')'; ctx.fillRect(-120, -20, W + 240, H + 40);
  ctx.save(); ctx.globalAlpha = qva; band(GY, GS); ctx.clip();
  ctx.fillStyle = rgb(mix(SC.A[0], SC.A[1], wet)); band(GY, GA); ctx.fill();
  ctx.fillStyle = rgb(mix(SC.B[0], SC.B[1], wet)); band(GA, GS); ctx.fill();
  ctx.drawImage(T1, -96, TY0, W + 192, H + 12 - TY0);
  ctx.fillStyle = WAT_C + '0.92)'; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (i = 0; i < SDROP.length; i += 4) { var rr = SDROP[i + 2] * (0.85 + 0.15 * Math.sin(qclk * 2 + SDROP[i + 3])); ctx.moveTo(SDROP[i] + rr, SDROP[i + 1]); ctx.arc(SDROP[i], SDROP[i + 1], rr, 0, TAU); }
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = qva; ctx.strokeStyle = 'rgba(255,244,214,' + (0.7 + 0.3 * Math.sin(qclk * 4)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -qclk * 12;
  ctx.beginPath(); for (i = 0; i < GX.length; i++) { if (i) ctx.lineTo(GX[i], GS[i]); else ctx.moveTo(GX[i], GS[i]); } ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}
/* lt: linha e ponto claros, para ler sobre o véu escuro do modo 3 */
function cueLabel(s, tx, ty, ax, ay, fs, ar, lt) {
  ctx.save(); ctx.globalAlpha = clamp(qha); ctx.font = '600 ' + fs + 'px ' + FONT;
  var w = ctx.measureText(s).width + fs * 0.9, px = ar === 'r' ? tx - w : tx;
  px = Math.max(8, Math.min(W - 8 - w, px));
  ctx.strokeStyle = lt ? 'rgba(255,248,232,0.9)' : 'rgba(22,34,42,0.75)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(clamp(ax, px + 6, px + w - 6), ay < ty ? ty - fs * 1.0 : ty + fs * 0.5); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.fillStyle = lt ? '#fff8e8' : '#16222a'; ctx.beginPath(); ctx.arc(ax, ay, 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; rrect(px, ty - fs * 1.0, w, fs * 1.5, fs * 0.35); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, px + fs * 0.45, ty + fs * 0.05);
  ctx.restore();
}
/* rótulos no solo, à direita: [texto, x da borda direita, y]. Modo 3: solo raso junto ao afloramento (x 812) e solo profundo (x 920). */
var SOILTXT = 'solo seco: pouca atividade', TAG3 = [['solo raso: pouca água', 880, 430], ['solo profundo: mais água', W - 10, 500]], GAUX = [812, 920];
/* régua de profundidade do solo: da superfície até a rocha, cheia de água */
function drawGauge(x) {
  var t = groundY(x), b = soilBase(x);
  ctx.save(); ctx.globalAlpha = clamp(qha);
  ctx.fillStyle = WAT_C + '0.95)'; ctx.strokeStyle = '#fff8e8'; ctx.lineWidth = 1.6; rrect(x - 4, t, 8, b - t, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 8, t); ctx.lineTo(x + 8, t); ctx.moveTo(x - 8, b); ctx.lineTo(x + 8, b); ctx.stroke();
  ctx.restore();
}
/* borda esquerda dos rótulos de solo do modo atual (para o quadro de texto não cobri-los) */
function soilTagLeft(fs) {
  ctx.save(); ctx.font = '600 ' + fs + 'px ' + FONT;
  var l = qm === 2 ? W - 10 - ctx.measureText(SOILTXT).width - fs * 0.9 : Math.min(TAG3[0][1] - ctx.measureText(TAG3[0][0]).width, TAG3[1][1] - ctx.measureText(TAG3[1][0]).width) - fs * 0.9;
  ctx.restore(); return l;
}
function drawCueLabels() {
  if (qm === 0) return;
  var fs = Math.max(12.5, 5.6 * W / cssW), a = SP[2], j = SP[3], k;
  if (qm === 1) cueLabel('chuva: folhas novas e fotossíntese acelerada', 440, 190, a.x, a.y - a.h - 6, fs, 'r');
  else if (qm === 2) { var u = SP[0]; cueLabel('sem folhas: as plantas respiram o mínimo', 440, 190, u.x + 14, u.y - u.h * 0.72, fs, 'r'); cueLabel(SOILTXT, W - 10, 468, j.x + 30, groundY(j.x) + 30, fs, 'r'); }
  else for (k = 0; k < 2; k++) { drawGauge(GAUX[k]); cueLabel(TAG3[k][0], TAG3[k][1], TAG3[k][2], GAUX[k], soilBase(GAUX[k]) + 3, fs, 'r', true); }
}
function wrapLines(s, maxW) {
  var w = s.split(' '), lines = [], cur = '', t, i;
  for (i = 0; i < w.length; i++) { t = cur ? cur + ' ' + w[i] : w[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function panelGrid(x0, fs) {
  var i, pad = fs * 0.75, n = Math.round(cueV * 100), cell = fs * 0.95, gap = fs * 0.12, gs = 10 * (cell + gap) - gap;
  ctx.font = '700 ' + fs + 'px ' + FONT; var rw = Math.max(fs * 1.1 + ctx.measureText('100 voltam à atmosfera').width, (ctx.font = '500 ' + fs * 0.85 + 'px ' + FONT, ctx.measureText('CUE = (GPP − Reco) ÷ GPP').width));
  var pw = pad * 2 + gs + fs * 0.9 + rw, ph = pad * 2 + fs * 1.3 + gs, px = W - x0 - pw, py = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.82)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('de cada 100 unidades de C fixadas (GPP)', px + pad, py + pad + fs * 0.7);
  var gx = px + pad, gy = py + pad + fs * 1.3;
  for (i = 0; i < 100; i++) {
    var c = i % 10, r = 9 - Math.floor(i / 10);
    ctx.fillStyle = i < n ? NPP_C : REC_C; rrect(gx + c * (cell + gap), gy + r * (cell + gap), cell, cell, cell * 0.2); ctx.fill();
  }
  var rx = gx + gs + fs * 0.9;
  ctx.font = '500 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('CUE = (GPP − Reco) ÷ GPP', rx, gy + fs * 0.9);
  ctx.font = '700 ' + fs * 2.4 + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(f2(cueV), rx, gy + fs * 3.5);
  ctx.font = '700 ' + fs + 'px ' + FONT;
  ctx.fillStyle = NPP_C; rrect(rx, gy + fs * 4.9, fs * 0.8, fs * 0.8, fs * 0.2); ctx.fill(); ctx.fillStyle = '#16222a'; ctx.fillText(n + ' ficam', rx + fs * 1.1, gy + fs * 5.65);
  ctx.fillStyle = REC_C; rrect(rx, gy + fs * 6.4, fs * 0.8, fs * 0.8, fs * 0.2); ctx.fill(); ctx.fillStyle = '#16222a'; ctx.fillText((100 - n) + ' voltam à atmosfera', rx + fs * 1.1, gy + fs * 7.15);
}
/* modos 1 e 2: o que entra e o que sai neste momento do ano */
function panelMeter(x0, fs) {
  var i, pad = fs * 0.75, lh = fs * 1.7, bw = fs * 4.4, g = clamp(st.GPP), r = clamp(recoNow()), net = g - r;
  var sal = net > 0.04 ? ['Saldo: absorve CO₂', CO2IN] : net < -0.04 ? ['Saldo: libera CO₂', REC_C] : ['Saldo: perto do equilíbrio', '#4a5258'];
  var rows = [['entra: fotossíntese', CO2IN, g], ['sai: respiração', REC_C, r]];
  ctx.font = '600 ' + fs + 'px ' + FONT; var nw = 0; for (i = 0; i < 2; i++) nw = Math.max(nw, ctx.measureText(rows[i][0]).width);
  ctx.font = '700 ' + fs + 'px ' + FONT; var sw = ctx.measureText('Saldo: perto do equilíbrio').width;
  var pw = pad * 2 + Math.max(fs * 1.1 + nw + fs * 0.7 + bw, sw), ph = pad * 2 + lh * 2 + fs * 1.5, px = W - x0 - pw, py = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.82)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  for (i = 0; i < 2; i++) {
    var cy = py + pad + lh * i + lh * 0.55, bx = px + pw - pad - bw;
    ctx.fillStyle = rows[i][1]; rrect(px + pad, cy - fs * 0.4, fs * 0.8, fs * 0.8, fs * 0.2); ctx.fill();
    ctx.font = '600 ' + fs + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(rows[i][0], px + pad + fs * 1.1, cy + fs * 0.35);
    ctx.fillStyle = 'rgba(22,34,42,0.13)'; rrect(bx, cy - fs * 0.27, bw, fs * 0.54, fs * 0.27); ctx.fill();
    ctx.fillStyle = rows[i][1]; rrect(bx, cy - fs * 0.27, Math.max(fs * 0.3, bw * rows[i][2]), fs * 0.54, fs * 0.27); ctx.fill();
  }
  ctx.font = '700 ' + fs + 'px ' + FONT; ctx.fillStyle = sal[1]; ctx.fillText(sal[0], px + pad, py + pad + lh * 2 + fs * 0.95);
}
/* modo 3: os dois sítios extremos lado a lado (ilustração): solo raso sobre rocha x solo profundo; azul = água guardada; gotas = chuva */
function panelWater(x0, fs) {
  var i, j, pad = fs * 0.75, pw = fs * 19.5, ph = fs * 14.2, px = W - x0 - pw, py = x0, cw = fs * 4.6, chh = fs * 6, top = py + fs * 4.6, base = top + chh;
  ctx.fillStyle = 'rgba(255,255,255,0.86)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('água guardada no solo (ilustração)', px + pad, py + pad + fs * 0.7);
  var cols = [['Área cristalina', 0.22, 2, '0,31'], ['Ecótono do Agreste', 0.8, 4, '0,58']];
  for (i = 0; i < 2; i++) {
    var cx = px + pw * (0.26 + 0.48 * i), sh = chh * cols[i][1], lx = cx - cw / 2, n = cols[i][2];
    ctx.save(); rrect(lx, top, cw, chh, fs * 0.3); ctx.clip();
    ctx.fillStyle = '#8b8d92'; ctx.fillRect(lx, top, cw, chh);
    ctx.fillStyle = rgb(SC.B[1]); ctx.fillRect(lx, top, cw, sh);
    var rows = Math.max(1, Math.floor(sh / (fs * 1.05))), q, rr;
    ctx.fillStyle = WAT_C + '0.95)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (j = 0; j < rows; j++) for (q = 0; q < 3; q++) {
      rr = fs * 0.2 * (0.85 + 0.15 * Math.sin(qclk * 2 + j * 1.7 + q * 2.3));
      ctx.moveTo(lx + cw * (0.22 + 0.28 * q + (j % 2) * 0.1) + rr, top + sh * (j + 0.5) / rows); ctx.arc(lx + cw * (0.22 + 0.28 * q + (j % 2) * 0.1), top + sh * (j + 0.5) / rows, rr, 0, TAU);
    }
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,22,14,0.7)'; ctx.lineWidth = 1; rrect(lx, top, cw, chh, fs * 0.3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(lx + 2, top + sh); ctx.lineTo(lx + cw - 2, top + sh); ctx.stroke(); ctx.setLineDash([]);
    for (j = 0; j < n; j++) {
      var t = (qclk * 0.8 + j / n + i * 0.17) % 1, dx = lx + cw * (0.15 + 0.7 * (n > 1 ? j / (n - 1) : 0.5)), dy = top - fs * 2.6 + t * fs * 2.3;
      ctx.globalAlpha = Math.sin(Math.PI * t); ctx.strokeStyle = CO2IN; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(dx, dy - fs * 0.5); ctx.lineTo(dx - fs * 0.12, dy); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#16222a';
    ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; ctx.fillText(cols[i][0], cx, base + fs * 1.3);
    ctx.font = '700 ' + fs + 'px ' + FONT; ctx.fillText('CUE ' + cols[i][3], cx, base + fs * 2.6);
    ctx.textAlign = 'left';
  }
}
function drawCueHUD() {
  var x0 = Math.max(12, 10 * W / cssW), i, fs = Math.max(12.5, 5.6 * W / cssW), pad, y, n = Math.round(cueV * 100);
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  var tf = Math.max(15, 7 * W / cssW), tp = tf * 0.6, ts = 'Eficiência de uso do carbono (CUE)';
  ctx.font = '700 ' + tf + 'px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.72)'; rrect(x0, x0, ctx.measureText(ts).width + tp * 2, tf * 1.9, tf * 0.4); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(ts, x0 + tp, x0 + tf * 1.27);
  if (qm === 0) panelGrid(x0, fs); else if (qm === 3) panelWater(x0, fs); else panelMeter(x0, fs);
  /* quadro de texto */
  fs = Math.max(12.5, 5.8 * W / cssW); pad = fs * 0.8;
  var cwid = Math.min(W - 2 * x0, fs * (qm === 0 ? 50 : 46)), lines = [], ch, cx = x0, cyy, lh2 = fs * 1.38, k, paras, np = [];
  if (qm === 0) paras = ['É a fração do carbono fixado pelas plantas (GPP) que fica no ecossistema. O resto volta à atmosfera pela respiração das plantas e do solo (Reco).',
    'Nas torres da Caatinga, a CUE variou de 0,31 a 0,58 conforme o sítio e, no conjunto, foi maior que a de outras florestas secas e a de ecossistemas sul-americanos, como a Amazônia. Em florestas de outras regiões, medidas do mesmo tipo costumam ficar entre poucos por cento e cerca de um terço.', cueLine(cueV)];
  else paras = [QM[qm].txt];
  if (qm >= 2) cwid = Math.min(cwid, soilTagLeft(Math.max(12.5, 5.6 * W / cssW)) - x0 - 14);
  ctx.font = '500 ' + fs + 'px ' + FONT;
  for (k = 0; k < paras.length; k++) { var ls = wrapLines(paras[k], cwid - pad * 2); np.push(ls.length); lines = lines.concat(ls); }
  ch = pad * 1.7 + fs * 1.5 + lines.length * lh2 + (paras.length - 1) * fs * 0.5; cyy = H - x0 - ch;
  ctx.fillStyle = 'rgba(24,18,14,0.84)'; rrect(cx, cyy, cwid, ch, fs * 0.5); ctx.fill();
  y = cyy + pad + fs * 0.95;
  ctx.font = '700 ' + fs * 1.1 + 'px ' + FONT; ctx.fillStyle = '#fbf3e2'; ctx.fillText(QM[qm].tit, cx + pad, y);
  y += fs * 0.55; ctx.font = '500 ' + fs + 'px ' + FONT; ctx.fillStyle = '#f1e8d4';
  var bnd = [], acum = 0; for (k = 0; k < np.length; k++) { acum += np[k]; bnd.push(acum); }
  for (i = 0; i < lines.length; i++) { y += lh2 + (bnd.indexOf(i) >= 0 ? fs * 0.5 : 0); ctx.fillText(lines[i], cx + pad, y); }
  ctx.restore();
}
setCue(0.58, false); setMode(0, false);
var cena = {
  semTempo: true,
  primeiroPlano: function () { drawCueOverlay(); drawFx(); drawCueLabels(); },
  substituirInterface: function () { drawRain(); drawCueHUD(); },
  ajustarEstado: function (dt) { if (qm === 1) { if (dt) updateRain(dt); } else { st.rainI = 0; st.cloud = Math.min(st.cloud, 0.15); } },
  atualizar: function (dt) { if (!reduce) updateFx(dt); }
};
