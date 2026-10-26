/* Começa parada no primeiro passo, sem fauna e sem oscilar a câmera; os botões de etapa ficam na página. */
FAUNA = false; playing = false; phase = 0.45;
/* ---------- guardar água, guardar carbono: a cisterna e a Caatinga ----------
   Comparação entre dois estoques: a água da chuva guardada na cisterna ao lado da casa e o carbono guardado na vegetação e
   no solo da Caatinga. Os dois têm o que entra, o que sai e o saldo, podem ser protegidos e podem vazar.
   Casa e cisterna conforme a foto enviada pelo usuário, só a frente da casa: reboco ocre com rodapé escuro, telhado de telha
   cerâmica com calha, cano branco até a cisterna branca de tampa cônica. Cisterna de placas do P1MC (ASA Brasil): capta pela
   calha a chuva do telhado e guarda a água para beber e cozinhar na estiagem.
   Carbono: entra pela fotossíntese, fica na vegetação e chega ao solo pelas raízes e pelas folhas e galhos que caem; sai como
   CO2 pela respiração das plantas, das raízes e dos microrganismos que decompõem a matéria orgânica. Numa vegetação conservada
   as entradas e as saídas ficam próximas, e depois de uma mudança de uso o solo leva décadas para chegar a um novo equilíbrio
   (Post e Kwon, 2000, Glob. Change Biol. 6:317). O corte e o fogo levam de uma vez o carbono da vegetação (a queima consumiu
   de 78% a 95% da biomassa aérea: Kauffman et al., 1993, Ecology 74:140); o solo perde depois, até 40% do carbono em seis anos
   (Tiessen et al., 1992, como citado em Menezes et al., 2012, Braz. J. Biol. 72:643). Matéria orgânica, retenção de água e
   nutrientes: Lal (2004), Science 304:1623. Medidor do carbono: partição da Caatinga densa, cerca de 72% no solo e 28% na
   vegetação, raízes, madeira morta, serapilheira e herbáceas (Menezes et al., 2021, Geoderma 390:114943).
   A fotossíntese depende de luz: na estação chuvosa ela se concentra nas horas de sol entre as chuvas e cai durante a pancada.
   Por isso, no que entra, chuva e sol se alternam, e no saldo a fotossíntese diminui a cada chuva.
   Ilustração: casa e cisterna fora de escala, a cisterna em corte para mostrar a água; níveis dos medidores, ritmos, duração
   da chuva e do sol e quantidades de partículas sem calibração. Textos provisórios, a revisar. */
var AGUA = '#4b93c6', AGUA_SUP = '#a9d3ee', CO2IN = '#0b7a97', CO2OUT = '#d2661a', CFICA = '#3f9a3a', CVEG = '#9ccc5a';
var PSOLO = 0.72, PVEG = 0.28;
/* à esquerda de LADO, a casa e a cisterna; à direita, a Caatinga do lado do carbono */
var LADO = 236;
var CASA = { x0: 12, x1: 132, h: 58, telhado: 22 };
CASA.yt = Math.round(groundY((CASA.x0 + CASA.x1) / 2) - CASA.h);
var CIS = { x: 186, r: 38, h: 40, cone: 12 };
CIS.yb = groundY(CIS.x) + 2; CIS.yt = CIS.yb - CIS.h;
function coneY(x) { return CIS.yt - CIS.cone * (1 - Math.abs(x - CIS.x) / (CIS.r + 2)); }
/* o terreiro da casa fica limpo: sem o umbuzeiro, as plantas, o capim e a serapilheira desse lado; as raízes
   saem antes de a textura do solo ser pintada no primeiro quadro */
SP[0].rt = { thick: new Path2D(), main: new Path2D(), fine: new Path2D(), tub: [], fr: [], w: [1, 1, 1] };
near.forEach(function (p) { if (p.x < LADO) p.hidden = true; });
fill = fill.filter(function (p) { return p.x >= LADO; });
allPlants = near.concat(mid, fill);
succ = succ.filter(function (s) { return s[0] >= LADO; });
herbsFg = herbsFg.filter(function (h) { return h.x >= LADO + 10; });
litFg = litFg.filter(function (f) { return f.x >= LADO + 4; });

/* etapas. w: alvo do nível de água (0 a 1); cs e cv: carbono no solo e na vegetação em relação à Caatinga conservada (1);
   vw, vcs e vcv: velocidade com que chegam lá (por segundo); sem velocidade, chegam de uma vez */
var CS = [
  { nome: 'Dois estoques', tit: 'Dois estoques', ph: 0.45, w: 0.75, cs: 1, cv: 1,
    txt: 'Ao lado da casa, a cisterna guarda a água da chuva para os meses de seca. Na Caatinga, o carbono fica guardado na vegetação, em troncos, galhos, folhas e raízes, e no solo, na matéria orgânica que vem das plantas. Os dois são estoques e funcionam do mesmo jeito: têm o que entra, o que sai e o que fica guardado.' },
  { nome: 'O que entra', tit: 'O que entra', ph: 0.33, chuva: 0.8, entra: 1, w: 0.95, cs: 1.05, cv: 1.06, vw: 0.06, vcs: 0.002, vcv: 0.003,
    txt: 'Na cisterna, entra a chuva que cai no telhado e desce pela calha e pelo cano. Na Caatinga, a chuva molha o solo, e quando o sol volta as folhas fazem fotossíntese: retiram CO₂ do ar, e esse carbono vira tronco, galhos, folhas e raízes. Parte dele chega ao solo pelas raízes e pelas folhas e galhos que caem e se decompõem.' },
  { nome: 'O que sai', tit: 'O que sai', ph: 0.6, sai: 1, w: 0.15, cs: 0.95, cv: 0.97, vw: 0.035, vcs: 0.002, vcv: 0.0015,
    txt: 'Da cisterna, sai a água que a família usa para beber e cozinhar. Da Caatinga, sai o carbono que as plantas, as raízes e os microrganismos do solo devolvem ao ar como CO₂ quando respiram e decompõem a matéria orgânica.' },
  { nome: 'O saldo', tit: 'O saldo', ano: true,
    txt: 'O que fica guardado é o saldo entre o que entra e o que sai. A cisterna enche nas chuvas e baixa na seca. Na Caatinga, o carbono entra e sai o ano todo, e numa área conservada as entradas e as saídas ficam próximas, então o estoque muda pouco de um ano para outro.' },
  { nome: 'Proteger', tit: 'Proteger o estoque', ph: 0.45, protege: 1, w: 0.8, cs: 1, cv: 1,
    txt: 'A tampa protege a água da cisterna da sujeira e do sol. Na Caatinga, a proteção é manter a vegetação em pé e a cobertura de folhas e galhos no chão, que seguram o solo, guardam umidade e alimentam a vida do solo. Sem corte e sem fogo, esse carbono continua guardado.' },
  { nome: 'Vazamento', tit: 'Quando o estoque vaza', ph: 0.9, vaza: 1, w: 0.04, cs: 0.7, cv: 0, vw: 0.1, vcs: 0.025, vcv: 0.35,
    txt: 'Uma rachadura esvazia em poucos dias a cisterna que a chuva levou meses para encher. Na Caatinga é parecido: o desmatamento e o fogo levam de uma vez o carbono da vegetação, e depois o solo descoberto perde, em poucos anos, o carbono que levou décadas para acumular.' },
  { nome: 'Diferenças', tit: 'Onde a comparação para', ph: 0.45, limites: 1, w: 0.75, cs: 1, cv: 1,
    txt: 'A cisterna enche numa estação de chuva. Já a vegetação leva anos para crescer de novo, e o solo, décadas para recuperar o carbono, que só chega a ele pelas plantas: sem vegetação, não há entrada. E, ao contrário da água, que se guarda para usar, o carbono serve mais quando fica guardado: no solo, a matéria orgânica segura água e nutrientes.' }
];
/* água da cisterna ao longo do ano (etapa do saldo): enche com a chuva até transbordar, e o uso é constante */
var WY = (function () {
  var a = new Float32Array(NS), v = 0.3, c, i;
  for (c = 0; c < 5; c++) for (i = 0; i < NS; i++) { v = clamp(v + (7 * sim.r[i] - 1.7) / NS, 0.03, 0.97); if (c === 4) a[i] = v; }
  return a;
})();
var ANO = 24; /* segundos por ano na etapa do saldo, que começa em dezembro, antes das chuvas */
var ce = 0, ag = 0.75, csolo = 1, cveg = 1, agD = 0, ctD = 0, dv = 0, fogo = 0, crk = 0, cha = 1, clk = 0;
/* no que entra: chv é a chuva do momento (1 na pancada, 0 no sol) e escoa, a água que ainda corre pela calha e pelo cano */
var chv = 0, escoa = 0, CHUVA_S = 4, CICLO_S = 10;
var pa = [], pu = [], pv = [], pin = [], pc = [], po = [], acc = { a: 0, u: 0, v: 0, i: 0, c: 0, o: 0 }, molhado = 0;

/* geometria fixa do lado do carbono: pontos de carbono no solo (mais perto da superfície), copas, troncos, tocos, fogo */
var PONTOS = (function () {
  var r = mulberry32(3131), a = [], k, x;
  for (k = 0; k < 420; k++) {
    x = LADO + 4 + r() * (W - LADO);
    if (outcropH(x) > 0.5) continue;
    a.push([x, groundY(x) + 3 + Math.pow(r(), 1.6) * (soilD(x) - 6), 1.5 + r() * 1.2, r()]);
  }
  return a;
})();
var COPAS = [], BASES = [], TOCOS = [], CHAMAS = [];
SP.forEach(function (sp, k) {
  if (k === 0) return;
  if (sp.kind === 'tree') sp.tips.forEach(function (t, j) { if (j % 3 === 0) COPAS.push([sp.x + t.x, sp.y + t.y]); });
  BASES.push(sp.x);
  TOCOS.push({ x: sp.x, w: sp.kind === 'tree' ? 14 : 9, h: 10, cac: sp.kind !== 'tree' });
});
fill.concat(near.filter(function (p) { return !p.hidden; })).forEach(function (p) {
  if (p.h < 60) return;
  p.tips.forEach(function (t, j) { if (j % 4 === 0) COPAS.push([p.x + t.x, p.y + t.y]); });
  BASES.push(p.x);
  TOCOS.push({ x: p.x, w: 7, h: 7 });
});
(function () { var r = mulberry32(7171), x; for (x = LADO + 12; x < W - 8; x += 19) if (outcropH(x) < 0.5) CHAMAS.push({ x: x + (r() - 0.5) * 8, h: 12 + r() * 12, ph: r() * TAU }); })();

function cisSelect(i) {
  ce = i; clk = 0; cha = 0;
  if (!CS[i].vaza) fogo = 0;
  if (CS[i].entra) chv = 1;
  if (reduce) {
    var m = CS[i];
    phase = m.ano ? 0.36 : m.ph;
    if (m.ano) { ag = WY[Math.floor(phase * NS)]; csolo = 1; cveg = 1; } else { ag = m.w; csolo = m.cs; cveg = m.cv; }
    dv = m.vaza ? 1 : 0; crk = dv; fogo = 0; cha = 1; chv = 0.4; escoa = 0.4;
  }
}
/* sem velocidade (null), chega ao alvo de uma vez */
function rumo(v, alvo, vel, dt) {
  if (vel == null) return v + (alvo - v) * Math.min(1, dt * 2.5);
  return v < alvo ? Math.min(alvo, v + vel * dt) : Math.max(alvo, v - vel * dt);
}
function cisPhase(dt) {
  var m = CS[ce];
  if (reduce) return;
  var alvo = m.ano ? 0.1 : m.ph;
  if (m.ano && clk > 1.2) { phase = (phase + dt / ANO) % 1; return; }
  var d = ((alvo - phase + 0.5) % 1 + 1) % 1 - 0.5; phase = (phase + d * Math.min(1, dt * 2.2) + 1) % 1;
}

/* ponto ao longo do caminho da água: calha, queda do cano e cano até a tampa da cisterna */
var CANO = (function () {
  var xe = CIS.x - 20, p = [[CASA.x0 - 8, CASA.yt + 3], [CASA.x1 + 8, CASA.yt + 3], [CASA.x1 + 8, CASA.yt + 9], [xe, coneY(xe) + 1]], L = [0], k;
  for (k = 1; k < p.length; k++) L.push(L[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
  return { p: p, L: L, tot: L[L.length - 1] };
})();
function noCano(s) {
  var p = CANO.p, L = CANO.L, k = 1;
  while (k < L.length - 1 && s > L[k]) k++;
  var u = clamp((s - L[k - 1]) / (L[k] - L[k - 1]));
  return [lerp(p[k - 1][0], p[k][0], u), lerp(p[k - 1][1], p[k][1], u)];
}
var TORNEIRA = { x: CIS.x + CIS.r + 9, y: CIS.yb - 7 }, BALDE = { x: CIS.x + CIS.r + 12 };
BALDE.y = groundY(BALDE.x) + 1;
var RACHA = { x: CIS.x - CIS.r + 1, y: CIS.yb - 12 };

function cisUpdate(dt) {
  var m = CS[ce], k;
  T += dt; clk += dt; cha = Math.min(1, cha + dt * 3);
  if (reduce) { agD = 0; ctD = 0; return; }
  var ag0 = ag, ct0 = PSOLO * csolo + PVEG * cveg;
  if (m.entra) chv += ((clk % CICLO_S < CHUVA_S ? 1 : 0) - chv) * Math.min(1, dt * 1.5);
  escoa += ((m.entra ? chv : 0) - escoa) * Math.min(1, dt * 1.2);
  var sol = m.entra ? 1 - 0.85 * chv : m.ano ? 1 - 0.85 * clamp(st.rainI * 1.5) : 1;
  if (m.ano) { ag += (WY[Math.floor(phase * NS) % NS] - ag) * Math.min(1, dt * 3); csolo = rumo(csolo, 1, null, dt); cveg = rumo(cveg, 1, null, dt); }
  else if (m.entra) { ag = rumo(ag, m.w, m.vw * escoa, dt); csolo = rumo(csolo, m.cs, m.vcs * sol, dt); cveg = rumo(cveg, m.cv, m.vcv * sol, dt); }
  else { ag = rumo(ag, m.w, m.vw, dt); csolo = rumo(csolo, m.cs, m.vcs, dt); cveg = rumo(cveg, m.cv, m.vcv, dt); }
  if (dt > 0) { agD += ((ag - ag0) / dt - agD) * Math.min(1, dt * 4); ctD += ((PSOLO * csolo + PVEG * cveg - ct0) / dt - ctD) * Math.min(1, dt * 4); }
  dv += ((m.vaza ? 1 : 0) - dv) * Math.min(1, dt * 1.6);
  crk += ((m.vaza ? 1 : 0) - crk) * Math.min(1, dt * 3);
  fogo += ((m.vaza && clk < 4 ? 1 : 0) - fogo) * Math.min(1, dt * 1.4);
  molhado += ((m.vaza && ag > 0.05 ? 1 : 0) - molhado) * Math.min(1, dt * 0.8);
  /* quanto entra e sai em cada etapa; no saldo, conforme a estação do modelo da paisagem */
  var chuva = m.ano ? clamp(st.r * 1.5) : m.entra ? escoa : 0, uso = (m.sai || m.ano) && ag > 0.06 ? 1 : 0;
  var cIn = (m.entra ? 1 : m.ano ? clamp(st.GPP) : 0) * sol * (1 - dv), rh = clamp((st.Reco - 0.4 * st.GPP) / 0.3);
  var cOut = (m.sai ? 1.4 : m.ano ? rh : 0) + 2.6 * fogo + 0.8 * dv;
  acc.a += 14 * chuva * dt; acc.u += 3.2 * uso * dt; acc.v += (crk > 0.5 && ag > 0.05 ? 18 : 0) * dt;
  acc.i += 9 * cIn * dt; acc.c += 7 * cIn * dt; acc.o += 10 * cOut * dt;
  while (acc.a >= 1) { acc.a -= 1; if (pa.length < 80) pa.push({ s: Math.random() * 30 }); }
  while (acc.u >= 1) { acc.u -= 1; if (pu.length < 20) pu.push({ x: TORNEIRA.x + 3, y: TORNEIRA.y + 3, vy: 10 }); }
  while (acc.v >= 1) { acc.v -= 1; if (pv.length < 60) pv.push({ x: RACHA.x, y: RACHA.y + Math.random() * 4, vx: -(26 + Math.random() * 22), vy: -(4 + Math.random() * 10) }); }
  while (acc.i >= 1) {
    acc.i -= 1; var cp = COPAS[(Math.random() * COPAS.length) | 0];
    if (cp && pin.length < 60) pin.push({ x0: cp[0] + (Math.random() - 0.5) * 50, y0: cp[1] - 70 - Math.random() * 50, x1: cp[0], y1: cp[1], u: 0, v: 0.55 + Math.random() * 0.2, tag: Math.random() < 0.12 });
  }
  while (acc.c >= 1) {
    acc.c -= 1; var bx = Math.random() < 0.6 ? BASES[(Math.random() * BASES.length) | 0] + (Math.random() - 0.5) * 24 : LADO + Math.random() * (W - LADO);
    if (outcropH(bx) > 0.5 || pc.length >= 60) continue;
    pc.push({ x0: bx, y0: groundY(bx) - 3, x1: bx + (Math.random() - 0.5) * 50, y1: groundY(bx) + 8 + Math.random() * (soilD(bx) - 14), u: 0, v: 0.4 + Math.random() * 0.15 });
  }
  while (acc.o >= 1) {
    /* as plantas também respiram: parte do CO2 que sai vem das copas */
    acc.o -= 1; var ox = LADO + Math.random() * (W - LADO), oy = groundY(ox) + 2 + Math.random() * 10;
    if ((m.sai || m.ano) && dv < 0.5 && Math.random() < 0.3) { var cq = COPAS[(Math.random() * COPAS.length) | 0]; ox = cq[0]; oy = cq[1]; }
    else if (outcropH(ox) > 0.5) continue;
    if (po.length >= 160) continue;
    po.push({ x: ox, y: oy, vy: -(fogo > 0.2 ? 60 + Math.random() * 30 : 26 + Math.random() * 12), u: 0, v: 0.4 + Math.random() * 0.2, ph: Math.random() * TAU, tag: Math.random() < 0.07 });
  }
  for (k = pa.length - 1; k >= 0; k--) { pa[k].s += 70 * dt; if (pa[k].s >= CANO.tot) pa.splice(k, 1); }
  for (k = pu.length - 1; k >= 0; k--) { var q = pu[k]; q.vy += 260 * dt; q.y += q.vy * dt; if (q.y >= BALDE.y - 9) pu.splice(k, 1); }
  for (k = pv.length - 1; k >= 0; k--) { var w = pv[k]; w.vy += 260 * dt; w.x += w.vx * dt; w.y += w.vy * dt; if (w.y >= groundY(w.x)) pv.splice(k, 1); }
  for (k = pin.length - 1; k >= 0; k--) { pin[k].u += pin[k].v * dt; if (pin[k].u >= 1) pin.splice(k, 1); }
  for (k = pc.length - 1; k >= 0; k--) { pc[k].u += pc[k].v * dt; if (pc[k].u >= 1) pc.splice(k, 1); }
  for (k = po.length - 1; k >= 0; k--) { var o = po[k]; o.u += o.v * dt; o.y += o.vy * dt; if (o.u >= 1) po.splice(k, 1); }
}

/* ---------- casa (só a frente) ---------- */
function drawCasa() {
  var x0 = CASA.x0, x1 = CASA.x1, yt = CASA.yt, yr = yt - CASA.telhado, x;
  /* parede de reboco ocre, assentada no chão */
  ctx.fillStyle = '#d18f4a'; ctx.beginPath(); ctx.moveTo(x0, yt); ctx.lineTo(x1, yt);
  for (x = x1; x >= x0; x -= 4) ctx.lineTo(x, groundY(x) + 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(70,34,12,0.2)'; ctx.fillRect(x0, yt, x1 - x0, 6);
  /* rodapé escuro */
  ctx.fillStyle = '#4e3b30'; ctx.beginPath(); ctx.moveTo(x0, groundY(x0) - 7);
  for (x = x0; x <= x1; x += 4) ctx.lineTo(x, groundY(x) - 7);
  for (x = x1; x >= x0; x -= 4) ctx.lineTo(x, groundY(x) + 2);
  ctx.closePath(); ctx.fill();
  /* porta e janela de madeira pintada, com moldura clara */
  var dx = x0 + 22, dw = 20, dyb = groundY(dx + dw / 2) + 1;
  ctx.fillStyle = '#efe6d4'; ctx.fillRect(dx - 2.5, yt + 12, dw + 5, dyb - yt - 12);
  ctx.fillStyle = '#36606b'; ctx.fillRect(dx, yt + 14.5, dw, dyb - yt - 14.5);
  ctx.strokeStyle = 'rgba(20,36,40,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(dx + dw / 2, yt + 15); ctx.lineTo(dx + dw / 2, dyb); ctx.stroke();
  ctx.fillStyle = '#e2c27a'; ctx.beginPath(); ctx.arc(dx + dw / 2 + 3, (yt + dyb) / 2 + 4, 1.1, 0, TAU); ctx.fill();
  var wx = x0 + 66, ww = 30, wy = yt + 13, wh = 20;
  ctx.fillStyle = '#efe6d4'; ctx.fillRect(wx - 2.5, wy - 2.5, ww + 5, wh + 5);
  ctx.fillStyle = '#36606b'; ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = 'rgba(20,36,40,0.55)'; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
  ctx.fillStyle = '#efe6d4'; ctx.fillRect(wx - 4, wy + wh + 2, ww + 8, 2.5);
  /* telhado de telha cerâmica: canais verticais, pontas das telhas no beiral e cumeeira */
  var rx0 = x0 - 10, rx1 = x1 + 10;
  ctx.fillStyle = '#b0532f'; ctx.fillRect(rx0, yr, rx1 - rx0, CASA.telhado);
  ctx.fillStyle = '#c66c40';
  for (x = rx0 + 2; x < rx1 - 2; x += 7) ctx.fillRect(x, yr + 3, 3, CASA.telhado - 3);
  ctx.strokeStyle = 'rgba(110,44,20,0.7)'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (x = rx0 + 6.5; x < rx1 - 2; x += 7) { ctx.moveTo(x, yr + 3); ctx.lineTo(x, yt); }
  ctx.stroke();
  ctx.fillStyle = '#8a3d22'; ctx.beginPath();
  for (x = rx0 + 3.5; x < rx1 - 1; x += 7) { ctx.moveTo(x + 3, yt); ctx.arc(x, yt, 3, 0, Math.PI, true); }
  ctx.fill();
  ctx.fillStyle = '#93401f'; ctx.fillRect(rx0 - 1, yr - 1, rx1 - rx0 + 2, 4);
  /* calha sob o beiral */
  ctx.fillStyle = '#e6e8e5'; ctx.strokeStyle = 'rgba(40,44,46,0.6)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.rect(CASA.x0 - 10, yt + 1, CASA.x1 - CASA.x0 + 19, 4.2); ctx.fill(); ctx.stroke();
}
/* cano branco da calha até a tampa da cisterna */
function drawCano() {
  var p = CANO.p, k;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p[1][0], p[1][1]); for (k = 2; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]);
  ctx.strokeStyle = 'rgba(40,44,46,0.65)'; ctx.lineWidth = 5.4; ctx.stroke();
  ctx.strokeStyle = '#eef0ed'; ctx.lineWidth = 3.4; ctx.stroke();
  ctx.restore();
}

/* ---------- cisterna de placas, em corte ---------- */
function drawCisterna() {
  var x = CIS.x, r = CIS.r, yb = CIS.yb, yt = CIS.yt, ry = 5, k;
  ctx.fillStyle = '#b8b2a6'; ctx.fillRect(x - r - 6, yb - 1, 2 * r + 12, 5);
  var g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, '#c4c8c4'); g.addColorStop(0.35, '#f4f5f2'); g.addColorStop(1, '#d3d6d2');
  ctx.fillStyle = g; ctx.strokeStyle = 'rgba(60,64,62,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - r, yt); ctx.lineTo(x - r, yb); ctx.ellipse(x, yb, r, ry, 0, Math.PI, 0, true); ctx.lineTo(x + r, yt); ctx.closePath(); ctx.fill(); ctx.stroke();
  /* corte: a parede da frente aberta mostra a água por dentro */
  var wx0 = x - r + 6, wx1 = x + r - 6, wy0 = yt + 4, wy1 = yb - 2, lv = wy1 - (wy1 - wy0) * clamp(ag);
  ctx.save(); ctx.beginPath(); ctx.rect(wx0, wy0, wx1 - wx0, wy1 - wy0); ctx.clip();
  var gi = ctx.createLinearGradient(wx0, 0, wx1, 0); gi.addColorStop(0, '#8d9496'); gi.addColorStop(0.5, '#b5bbbc'); gi.addColorStop(1, '#8d9496');
  ctx.fillStyle = gi; ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  ctx.fillStyle = AGUA; ctx.fillRect(wx0, lv, wx1 - wx0, wy1 - lv + 1);
  ctx.fillStyle = AGUA_SUP; ctx.fillRect(wx0, lv - 1, wx1 - wx0, 2.4);
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,64,62,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  /* hachura da parede cortada */
  ctx.save(); ctx.beginPath(); ctx.rect(x - r, wy0, 6, wy1 - wy0); ctx.rect(wx1, wy0, 6, wy1 - wy0); ctx.clip();
  ctx.strokeStyle = 'rgba(90,94,92,0.75)'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (k = wy0 - 8; k < wy1 + 8; k += 4) { ctx.moveTo(x - r, k + 6); ctx.lineTo(x - r + 6, k); ctx.moveTo(wx1, k + 6); ctx.lineTo(wx1 + 6, k); }
  ctx.stroke(); ctx.restore();
  /* tampa cônica com a portinhola */
  var gc = ctx.createLinearGradient(x - r, 0, x + r, 0);
  gc.addColorStop(0, '#cdd0cc'); gc.addColorStop(0.4, '#f6f7f4'); gc.addColorStop(1, '#d9dcd8');
  ctx.fillStyle = gc; ctx.strokeStyle = 'rgba(60,64,62,0.75)';
  ctx.beginPath(); ctx.moveTo(x - r - 2, yt + 1); ctx.lineTo(x, yt - CIS.cone); ctx.lineTo(x + r + 2, yt + 1); ctx.ellipse(x, yt + 1, r + 2, 3, 0, 0, Math.PI, false); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dfe1dd'; ctx.strokeStyle = 'rgba(60,64,62,0.8)'; ctx.beginPath(); ctx.rect(x + 4, yt - CIS.cone + 3.5, 11, 4.5); ctx.fill(); ctx.stroke();
  /* torneira e balde */
  ctx.fillStyle = '#8f979b'; ctx.fillRect(x + r, TORNEIRA.y - 1.5, 9, 3); ctx.fillRect(TORNEIRA.x, TORNEIRA.y - 1.5, 2.5, 5.5);
  ctx.fillStyle = '#5f676b'; ctx.fillRect(x + r + 4, TORNEIRA.y - 5, 2, 4);
  var bx = BALDE.x, by = BALDE.y;
  ctx.fillStyle = '#a7adb0'; ctx.strokeStyle = 'rgba(50,54,56,0.8)';
  ctx.beginPath(); ctx.moveTo(bx - 7, by - 10); ctx.lineTo(bx + 7, by - 10); ctx.lineTo(bx + 5, by); ctx.lineTo(bx - 5, by); ctx.closePath(); ctx.fill(); ctx.stroke();
  /* rachadura e mancha de água no chão */
  if (crk > 0.02) {
    ctx.save(); ctx.globalAlpha = crk;
    ctx.lineJoin = 'round'; ctx.beginPath();
    ctx.moveTo(x - r + 5, yb - 30); ctx.lineTo(x - r + 2, yb - 24); ctx.lineTo(x - r + 5, yb - 19); ctx.lineTo(x - r + 1, yb - 13); ctx.lineTo(x - r + 4, yb - 8); ctx.lineTo(x - r + 1, yb - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3.6; ctx.stroke();
    ctx.strokeStyle = '#2e2a26'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  if (molhado > 0.02) {
    ctx.fillStyle = 'rgba(40,24,16,' + (0.35 * molhado) + ')'; ctx.beginPath(); ctx.ellipse(x - r - 16, groundY(x - r - 16) + 1, 6 + 12 * molhado, 2.4, 0, 0, TAU); ctx.fill();
  }
}

/* ---------- lado do carbono ---------- */
function drawCarbonoSolo() {
  ctx.save(); ctx.fillStyle = CFICA; ctx.strokeStyle = 'rgba(236,246,226,0.75)'; ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (var k = 0; k < PONTOS.length; k++) { var p = PONTOS[k]; if (p[3] > 0.8 * csolo) continue; ctx.moveTo(p[0] + p[2], p[1]); ctx.arc(p[0], p[1], p[2], 0, TAU); }
  ctx.fill(); ctx.stroke(); ctx.restore();
}
function drawTocos() {
  if (dv < 0.02) return;
  ctx.save(); ctx.globalAlpha = dv; ctx.lineJoin = 'round';
  TOCOS.forEach(function (s) {
    var x = s.x, y = groundY(x) - outcropH(x) + 1, w = s.w, h = s.h;
    ctx.fillStyle = s.cac ? '#3a3a2c' : '#4a3e32'; ctx.strokeStyle = 'rgba(30,20,14,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - w * 0.95, y + 1); ctx.lineTo(x - w * 0.55, y - h); ctx.lineTo(x + w * 0.55, y - h + 1.5); ctx.lineTo(x + w * 0.95, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5c5044'; ctx.beginPath(); ctx.ellipse(x, y - h + 0.7, w * 0.55, 2.2, 0.06, 0, TAU); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}
function drawCarvao() {
  var i, n = GX.length;
  if (dv > 0.02) {
    ctx.save(); ctx.beginPath(); ctx.rect(LADO - 6, 0, W, H); ctx.clip();
    ctx.fillStyle = 'rgba(30,22,16,' + (0.7 * dv) + ')'; ctx.beginPath();
    for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], GY[i] - 0.5); else ctx.moveTo(GX[i], GY[i] - 0.5); }
    for (i = n - 1; i >= 0; i--) ctx.lineTo(GX[i], GY[i] + 3 + 3 * dv);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
function drawChamas() {
  if (fogo > 0.01) {
    ctx.save();
    CHAMAS.forEach(function (f) {
      var y = groundY(f.x), h = f.h * fogo * (0.75 + 0.25 * Math.sin(T * 11 + f.ph)), sw = Math.sin(T * 7 + f.ph) * 3;
      ctx.fillStyle = 'rgba(232,108,36,0.92)'; ctx.beginPath(); ctx.moveTo(f.x - 6, y); ctx.quadraticCurveTo(f.x - 6, y - h * 0.55, f.x + sw, y - h); ctx.quadraticCurveTo(f.x + 6, y - h * 0.55, f.x + 6, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(248,200,80,0.95)'; ctx.beginPath(); ctx.moveTo(f.x - 3, y); ctx.quadraticCurveTo(f.x - 3, y - h * 0.35, f.x + sw * 0.6, y - h * 0.6); ctx.quadraticCurveTo(f.x + 3, y - h * 0.35, f.x + 3, y); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
}

/* ---------- partículas ---------- */
function gota(x, y, r) {
  ctx.moveTo(x, y - r * 1.8); ctx.quadraticCurveTo(x + r, y - r * 0.2, x, y + r); ctx.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.8);
}
function drawParticulas() {
  var k, fs = Math.max(10, 7.5 * W / cssW);
  ctx.save();
  ctx.fillStyle = AGUA; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (k = 0; k < pa.length; k++) { var q = noCano(pa[k].s); gota(q[0], q[1] - 1, 2.4); }
  for (k = 0; k < pu.length; k++) gota(pu[k].x, pu[k].y, 2.4);
  for (k = 0; k < pv.length; k++) gota(pv[k].x, pv[k].y, 2.2);
  ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round';
  pin.forEach(function (c) {
    var a = smooth(0, 0.15, c.u) * (1 - smooth(0.85, 1, c.u)), x = lerp(c.x0, c.x1, c.u), y = lerp(c.y0, c.y1, c.u);
    if (a < 0.03) return;
    ctx.globalAlpha = a; ctx.fillStyle = CO2IN; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 3.7, 0, TAU); ctx.fill(); ctx.stroke();
    if (c.tag) txt('CO₂', x + 7, y + fs * 0.35, { c: CO2IN, halo: 'rgba(255,255,255,0.85)', sz: fs, w: 700 });
  });
  pc.forEach(function (c) {
    var a = smooth(0, 0.12, c.u) * (1 - smooth(0.8, 1, c.u)), x = lerp(c.x0, c.x1, c.u), y = lerp(c.y0, c.y1, c.u);
    if (a < 0.03) return;
    ctx.globalAlpha = a; ctx.fillStyle = CFICA; ctx.strokeStyle = 'rgba(236,246,226,0.95)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); ctx.stroke();
  });
  po.forEach(function (c) {
    var a = smooth(0, 0.12, c.u) * (1 - smooth(0.6, 1, c.u)), x = c.x + Math.sin(T * 2 + c.ph) * 3;
    if (a < 0.03) return;
    ctx.globalAlpha = a; ctx.fillStyle = CO2OUT; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, c.y, 3.7, 0, TAU); ctx.fill(); ctx.stroke();
    if (c.tag) txt('CO₂', x + 7, c.y + fs * 0.35, { c: CO2OUT, halo: 'rgba(255,255,255,0.85)', sz: fs, w: 700 });
  });
  ctx.restore();
}

/* ---------- rótulos, medidores e quadro de texto ---------- */
function rotulo(s, tx, ty, ax, ay, fs, al) {
  var a = clamp(cha) * (al == null ? 1 : al);
  if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = '600 ' + fs + 'px ' + FONT;
  var w = ctx.measureText(s).width + fs * 0.9, px = Math.max(8, Math.min(W - 8 - w, tx - w / 2));
  ctx.strokeStyle = 'rgba(22,34,42,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(clamp(ax, px + 6, px + w - 6), ty + fs * 0.5); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.fillStyle = '#16222a'; ctx.beginPath(); ctx.arc(ax, ay, 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; rrect(px, ty - fs * 1.0, w, fs * 1.5, fs * 0.35); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, px + fs * 0.45, ty + fs * 0.05);
  ctx.restore();
}
function drawRotulos() {
  var m = CS[ce], fs = Math.max(12.5, 5.6 * W / cssW);
  if (ce === 0) { rotulo('cisterna: guarda água', CIS.x, 232, CIS.x, CIS.yb - 16, fs); rotulo('vegetação: guarda carbono', 560, 175, 545, 250, fs); rotulo('solo: guarda carbono', 700, 300, 700, groundY(700) + 22, fs); }
  else if (m.entra) {
    var aw = reduce ? 1 : smooth(0.2, 0.6, escoa), af = reduce ? 1 : smooth(0.3, 0.8, 1 - chv);
    rotulo('chuva no telhado, calha e cano', 110, 232, 96, CASA.yt + 3, fs, aw);
    rotulo('com sol, fotossíntese: CO₂ entra', 560, 150, 545, 205, fs, af); rotulo('carbono chega ao solo', 760, 300, 760, groundY(760) + 18, fs, af);
  }
  else if (m.sai) { rotulo('uso da água', BALDE.x + 20, 262, BALDE.x, BALDE.y - 10, fs); rotulo('CO₂ sai das plantas e do solo', 640, 300, 640, groundY(640) + 4, fs); }
  else if (m.protege) { rotulo('tampa', CIS.x, 246, CIS.x - 12, CIS.yt - 5, fs); rotulo('folhas e galhos cobrem o solo', 600, 300, 600, groundY(600) - 1, fs); rotulo('vegetação em pé', 700, 160, 690, 215, fs); }
  else if (m.vaza) { rotulo('rachadura', CIS.x - 60, 250, RACHA.x - 5, CIS.yb - 22, fs); rotulo('desmatamento e fogo', 640, 290, 640, groundY(640) - 6, fs); }
}
/* com movimento reduzido os níveis ficam parados, e a tendência vem do que a etapa mostra */
function tendencia(d, nivel, agua) {
  var m = CS[ce];
  var lim = agua ? 0.004 : 0.001;
  if (reduce) d = m.entra ? 1 : m.sai || m.vaza ? -1 : m.ano && agua ? WY[(Math.floor(phase * NS) + 5) % NS] - WY[Math.floor(phase * NS)] : 0;
  if (agua && nivel > 0.94 && d > -lim) return 'cheia';
  return d > lim ? 'subindo' : d < -lim ? 'descendo' : 'estável';
}
/* água: a barra cheia é a cisterna cheia. Carbono: uma barra só, em solo e vegetação; a Caatinga conservada ocupa 85% dela */
function drawMedidores(x0) {
  var m = CS[ce], fs = Math.max(12.5, 5.6 * W / cssW), pad = fs * 0.75, lh = fs * 2.3, bw = fs * 6.5, i, k;
  var rows = [['água na cisterna', [[ag, AGUA]], m.limites ? 'enche em meses' : tendencia(agD, ag, true)],
    ['carbono no ecossistema', [[0.85 * PSOLO * csolo, CFICA], [0.85 * PVEG * cveg, CVEG]], m.limites ? 'acumula em décadas' : tendencia(ctD, 0, false)]];
  ctx.font = '600 ' + fs + 'px ' + FONT; var w1 = Math.max(ctx.measureText(rows[0][0]).width, ctx.measureText(rows[1][0]).width);
  ctx.font = '500 ' + fs * 0.85 + 'px ' + FONT; var w2 = Math.max(ctx.measureText(rows[0][2]).width, ctx.measureText(rows[1][2]).width);
  var pw = pad * 2 + Math.max(w1, bw + fs * 0.6 + w2), ph = pad * 2 + fs * 1.1 + lh * 2 + fs * 1.1, px = W - x0 - pw, py = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.84)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('estoques', px + pad, py + pad + fs * 0.7);
  for (i = 0; i < 2; i++) {
    var ry = py + pad + fs * 1.1 + lh * i + fs * 0.9, r = rows[i];
    ctx.font = '600 ' + fs + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(r[0], px + pad, ry);
    var by = ry + fs * 0.45;
    ctx.fillStyle = 'rgba(22,34,42,0.12)'; rrect(px + pad, by, bw, fs * 0.6, fs * 0.3); ctx.fill();
    ctx.save(); rrect(px + pad, by, bw, fs * 0.6, fs * 0.3); ctx.clip();
    for (var bx = px + pad, k = 0; k < r[1].length; k++) { var sw = bw * clamp(r[1][k][0]); ctx.fillStyle = r[1][k][1]; ctx.fillRect(bx, by, sw, fs * 0.6); bx += sw; }
    ctx.restore();
    ctx.font = '500 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText(r[2], px + pad + bw + fs * 0.6, by + fs * 0.6);
  }
  /* legenda das duas partes do carbono */
  var ly = py + ph - pad - fs * 0.15, lx = px + pad;
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT;
  [['solo', CFICA], ['vegetação', CVEG]].forEach(function (l) {
    ctx.fillStyle = l[1]; rrect(lx, ly - fs * 0.62, fs * 0.7, fs * 0.7, fs * 0.15); ctx.fill();
    ctx.fillStyle = '#4a5258'; ctx.fillText(l[0], lx + fs * 0.95, ly); lx += fs * 0.95 + ctx.measureText(l[0]).width + fs * 0.9;
  });
}
function wrapLines(s, maxW) {
  var w = s.split(' '), lines = [], cur = '', t, i;
  for (i = 0; i < w.length; i++) { t = cur ? cur + ' ' + w[i] : w[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function drawCisHUD() {
  var x0 = Math.max(12, 10 * W / cssW), m = CS[ce], fs, pad, y, i, s;
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  fs = Math.max(15, 7 * W / cssW); pad = fs * 0.6;
  ctx.font = '700 ' + fs + 'px ' + FONT; s = 'Guardar água, guardar carbono';
  ctx.fillStyle = 'rgba(255,255,255,0.72)'; rrect(x0, x0, ctx.measureText(s).width + pad * 2, fs * 1.9, fs * 0.4); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(s, x0 + pad, x0 + fs * 1.27);
  if (m.ano) {
    var d = Math.floor(phase * 365), mm = 0;
    while (mm < 11 && d >= MDAYS[mm]) { d -= MDAYS[mm]; mm++; }
    var my = x0 + fs * 2.3; ctx.font = '600 ' + fs * 0.9 + 'px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.72)'; rrect(x0, my, ctx.measureText(MESES[mm]).width + pad * 2, fs * 1.6, fs * 0.4); ctx.fill();
    ctx.fillStyle = '#16222a'; ctx.fillText(MESES[mm], x0 + pad, my + fs * 1.1);
  }
  drawMedidores(x0);
  fs = Math.max(12.5, 5.8 * W / cssW); pad = fs * 0.8;
  var cwid = Math.min(W - 2 * x0, fs * 46), lh2 = fs * 1.38, lines;
  ctx.font = '500 ' + fs + 'px ' + FONT; lines = wrapLines(m.txt, cwid - pad * 2);
  var ch = pad * 1.7 + fs * 1.5 + lines.length * lh2, cyy = H - x0 - ch;
  ctx.globalAlpha = 0.4 + 0.6 * cha;
  ctx.fillStyle = 'rgba(24,18,14,0.84)'; rrect(x0, cyy, cwid, ch, fs * 0.5); ctx.fill();
  y = cyy + pad + fs * 0.95;
  ctx.font = '700 ' + fs * 1.1 + 'px ' + FONT; ctx.fillStyle = '#fbf3e2'; ctx.fillText(m.tit, x0 + pad, y);
  y += fs * 0.55; ctx.font = '500 ' + fs + 'px ' + FONT; ctx.fillStyle = '#f1e8d4';
  for (i = 0; i < lines.length; i++) { y += lh2; ctx.fillText(lines[i], x0 + pad, y); }
  ctx.restore();
}
cisSelect(0);
var cena = {
  semTempo: true,
  semPan: true,
  planoFrente: function (bark) {
    var i;
    drawSoil();
    drawCarbonoSolo();
    drawCarvao();
    drawLitter(litFg, Math.max(st.lit, CS[ce].protege ? 0.9 : 0.35) * (1 - dv), 0.9);
    drawCasa();
    drawCano();
    drawCisterna();
    if (dv < 0.99) {
      ctx.save(); ctx.globalAlpha = 1 - dv;
      for (i = 0; i < near.length; i++) if (!near[i].hidden) drawPlant(near[i], bark, false);
      for (i = 0; i < fill.length; i++) drawPlant(fill[i], bark, false);
      for (i = 1; i < SP.length; i++) { var sp = SP[i]; if (sp.kind === 'tree') drawTreeSp(sp); else if (sp.kind === 'cactus1') drawMandacaru(sp); else drawFacheiro(sp); }
      drawSucc(0.94 + 0.06 * st.S);
      ctx.restore();
    }
    drawTocos();
    if (dv < 0.98) drawHerbs(herbsFg, false, 0, 1 - dv);
    drawChamas();
  },
  primeiroPlano: function () { drawParticulas(); },
  substituirInterface: function () { drawRain(); drawRotulos(); drawCisHUD(); },
  antes: cisPhase,
  ajustarEstado: function (dt) {
    var m = CS[ce];
    if (m.ano) { if (dt && !reduce) updateRain(dt); return; }
    if (m.chuva) { st.rainI = m.chuva * chv; st.cloud = 0.15 + 0.55 * chv; if (dt && !reduce) updateRain(dt); }
    else { st.rainI = 0; st.cloud = Math.min(st.cloud, 0.15); }
  },
  atualizar: cisUpdate,
  etapas: CS.map(function (m) { return { nome: m.nome, cor: null }; }),
  selecionarEtapa: function (i) { cisSelect(i); },
  etapaAtual: function () { return ce; },
  textoEtapa: function () { return CS[ce].tit + '. ' + CS[ce].txt; }
};
