/* Começa parada no primeiro passo, sem fauna, sem torre e sem oscilar a câmera; os botões de etapa e a régua ficam na página. */
FAUNA = false; playing = false; phase = 0.45;
/* ---------- medir o carbono de uma área: o inventário em campo ----------
   O método tradicional de estimar o estoque de carbono de uma área, em sete etapas: estratificar, instalar parcelas, medir as
   plantas, converter diâmetro em biomassa pela equação alométrica, amostrar os outros compartimentos, converter biomassa em
   carbono e extrapolar das parcelas para a área.
   Parcela de 20 x 20 m com vértices fixos e limites de arame, circunferência a 1,30 m do solo (CAP) e altura em cada caule com
   CAP maior que 6 cm, nova medição a cada três anos depois da estação chuvosa: Comitê Técnico Científico da Rede de Manejo
   Florestal da Caatinga (2005), Protocolo de medições de parcelas permanentes, Recife, Associação Plantas do Nordeste, itens 1
   a 5. O protocolo também mede a circunferência na base (CNB), omitida aqui. Equações de biomassa para plantas da Caatinga, ajustadas com plantas cortadas, secas e pesadas: Sampaio e
   Silva (2005), Acta Bot. Bras. 19:935. A fórmula aparece sem os coeficientes. Fração de carbono da biomassa seca de 0,47:
   IPCC (2006), vol. 4, cap. 4, tabela 4.3, o mesmo valor usado pelo inventário que a plataforma adota. 44/12 é a razão entre as
   massas molares do CO2 e do carbono. Raízes por razão raiz/parte aérea: IPCC (2006), vol. 4, cap. 4, tabela 4.4.
   A incerteza da média de uma amostra cai com a raiz do número de parcelas (erro padrão); a faixa da última etapa segue essa
   forma, sem valores.
   Ilustração: parcela, pessoas e plantas fora de escala; posição das parcelas no mapa, largura da faixa de incerteza e
   ritmo das medições sem calibração. A ficha de campo mostra traços no lugar de números. Textos provisórios, a revisar. */
var BIOM = '#8a6a42', CFICA = '#3f9a3a', CO2E = '#5f7f8d', TINTA = '#2f4a7a', FITA = '#e8c13a';
var ESTR = [
  { nome: 'caatinga densa', x0: -20, x1: 330, cor: '#3f6e48' },
  { nome: 'caatinga aberta', x0: 330, x1: 640, cor: '#a8973c' },
  { nome: 'área degradada', x0: 640, x1: 980, cor: '#b06a3a' }
];
function estrato(x) { return x < 330 ? 0 : x < 640 ? 1 : 2; }
/* uma parcela por estrato no corte da paisagem; no mapa, cada estrato recebe o mesmo número de parcelas */
var PARC = [{ x0: 92, x1: 246 }, { x0: 418, x1: 568 }, { x0: 700, x1: 852 }];

/* a vegetação muda com o estrato: a densa fica inteira, a aberta perde parte das plantas e a degradada só guarda arbustos
   baixos, o mandacaru e os tocos das árvores cortadas. A arvoreta de um caule e o arbusto de vários caules da parcela densa,
   que a equipe mede, são desenhados aqui. */
var ARB = { x: 196 }, ARV = { x: 240, h: 50, w: 3.4 };
ARB.y = groundY(ARB.x); ARV.y = groundY(ARV.x);
var TOCOS = [{ x: SP[4].x, w: 13, h: 10 }];
near.forEach(function (p, k) {
  var e = estrato(p.x);
  if (e === 2 || (e === 1 && k % 2) || Math.abs(p.x - ARB.x - 20) < 42) p.hidden = true;
});
fill.forEach(function (p, k) {
  var e = estrato(p.x);
  if (Math.abs(p.x - ARB.x - 20) < 42 || (e === 1 && k % 2 && p.x < 640)) p.hidden = true;
  if (e === 2 && p.h > 40) { p.hidden = true; TOCOS.push({ x: p.x, w: 7, h: 7 }); }
});
fill = fill.filter(function (p) { return !p.hidden; });
allPlants = near.concat(mid, fill);
herbsFg = herbsFg.filter(function (h) { return estrato(h.x) < 2 || h.rk < 0.3; });
litFg = litFg.filter(function (f) { return estrato(f.x) === 0 || (estrato(f.x) === 1 && f.rk < 0.6) || f.rk < 0.2; });

/* caules medidos na parcela densa: o tronco da arvoreta e os três caules do arbusto. Cada caule do arbusto é uma curva da
   base ao topo; a fita fica a 30 px do chão, a altura do peito da pessoa desenhada (1,30 m na escala dela) */
var ALT_PEITO = 30;
var CAULES = [[-7, -16, 62], [0, 2, 74], [7, 15, 58]].map(function (c) {
  var x0 = ARB.x + c[0] * 0.4, xc = ARB.x + c[0], x2 = ARB.x + c[0] + c[1], h = c[2], t = ALT_PEITO / h;
  return { x0: x0, xc: xc, x2: x2, h: h, xf: (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * xc + t * t * x2 };
});
/* lado: de que lado do caule a pessoa fica (-1, à esquerda; 1, à direita) */
var MED = [{ x: ARV.x, w: ARV.w, lado: 1 }].concat(CAULES.map(function (c) { return { x: c.xf, w: 2.4, lado: -1 }; }));
MED.forEach(function (m) { m.y = groundY(m.x) - ALT_PEITO; });

/* amostras dos outros compartimentos, na parcela aberta */
var TRADO = { x: 470 }, GAB = { x: 440 }, TORA = { x: 512 };

/* etapas */
var MS = [
  { nome: 'Estratos', tit: 'Dividir a área em estratos', mapa: 1,
    txt: 'O primeiro passo é mapear a área e dividi-la em estratos, partes com vegetação parecida, como caatinga densa, caatinga aberta e área degradada. Cada estrato guarda uma quantidade diferente de carbono e é amostrado separadamente, o que deixa a estimativa mais precisa com o mesmo esforço de campo.' },
  { nome: 'Parcelas', tit: 'Instalar as parcelas', mapa: 1, parcelas: 1,
    txt: 'Como não dá para medir todas as plantas, a equipe mede amostras. Em cada estrato são distribuídas parcelas, quadrados de 20 × 20 m com os cantos fixados e os lados marcados com arame, como no protocolo da Rede de Manejo Florestal da Caatinga. As parcelas são permanentes e voltam a ser medidas a cada três anos, depois da estação chuvosa.' },
  { nome: 'Medir as plantas', tit: 'Medir as plantas', mede: 1,
    txt: 'Dentro da parcela, a equipe mede com uma fita a circunferência de cada caule a 1,30 m do solo, a CAP, e anota também a altura de cada caule. Entram os caules com CAP maior que 6 cm. Muitas plantas da Caatinga têm vários caules saindo da base, e cada um é medido e anotado na ficha.' },
  { nome: 'Equação alométrica', tit: 'Do diâmetro à biomassa', equacao: 1,
    txt: 'Pesar as plantas exigiria cortá-las. Por isso se usa uma equação alométrica, que dá a biomassa seca de uma planta a partir do diâmetro do caule, a circunferência dividida por π. A equação foi ajustada com plantas da Caatinga cortadas, secas e pesadas (Sampaio e Silva, 2005), e a soma das plantas dá a biomassa da parcela.' },
  { nome: 'Outros compartimentos', tit: 'Os outros compartimentos', comp: 1,
    txt: 'A equação dá a parte aérea, mas o carbono também está em outros lugares. As raízes são estimadas por uma proporção em relação à parte aérea. A serapilheira, recolhida dentro de um gabarito no chão, e a madeira morta são secas e pesadas. O solo é coletado com trado, camada por camada, e o laboratório mede o carbono e a densidade de cada uma.' },
  { nome: 'Biomassa em carbono', tit: 'Da biomassa ao carbono', conv: 1,
    txt: 'Quase metade da biomassa seca é carbono: multiplicada por 0,47, ela dá a massa de carbono (IPCC, 2006). Para expressar esse carbono como o CO₂ que ele formaria na atmosfera, multiplica-se por 44/12, a razão entre a massa de uma molécula de CO₂ e a de um átomo de carbono.' },
  { nome: 'Da parcela à área', tit: 'Da parcela para a área', mapa: 1, parcelas: 1, estimativa: 1,
    txt: 'A média das parcelas de cada estrato, por hectare, é multiplicada pela área do estrato, e a soma dos estratos dá o estoque da área inteira. Como vem de uma amostra, a estimativa tem uma faixa de incerteza, que fica mais estreita quando se medem mais parcelas.' }
];
var me = 0, clk = 0, cha = 1, nParc = 9, faixa = 1;
var VPARC = { rotulo: 'Número de parcelas', min: 3, max: 30, passo: 3, predefinidos: [] };
function meiaFaixa(n) { return 0.8 * Math.sqrt(3 / n); }
faixa = meiaFaixa(nParc);
function medSelect(i) { me = i; clk = 0; cha = 0; if (reduce) cha = 1; }
function medDefinir(v) {
  if (!isFinite(v)) return;
  var n = clamp(Math.round(v / VPARC.passo) * VPARC.passo, VPARC.min, VPARC.max);
  if (n === nParc && MS[me].estimativa) return;
  nParc = n;
  if (!MS[me].estimativa) medSelect(MS.length - 1);
}
function medUpdate(dt) {
  T += dt; clk += dt; cha = Math.min(1, cha + dt * 3);
  var alvo = meiaFaixa(nParc);
  faixa = reduce ? alvo : faixa + (alvo - faixa) * Math.min(1, dt * 4);
}
/* tempo da etapa; com movimento reduzido, tudo já aparece no estado final */
function tempo() { return reduce ? 99 : clk; }

/* ---------- parcelas, estratos e vegetação ---------- */
function drawFaixasEstrato(a) {
  if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 4; ctx.lineCap = 'butt';
  ESTR.forEach(function (e) {
    ctx.strokeStyle = e.cor; ctx.beginPath();
    for (var x = Math.max(-20, e.x0); x <= Math.min(980, e.x1); x += 6) { if (x === Math.max(-20, e.x0)) ctx.moveTo(x, groundY(x) + 2); else ctx.lineTo(x, groundY(x) + 2); }
    ctx.stroke();
  });
  ctx.restore();
}
/* a parcela no chão, em perspectiva: a borda da frente no corte do solo e a de trás recuada para cima e para a direita */
var RECUO = { dx: 24, dy: -17 };
function cantos(p) {
  var fl = [p.x0, groundY(p.x0)], fr = [p.x1, groundY(p.x1)];
  return [fl, fr, [fr[0] + RECUO.dx, fr[1] + RECUO.dy], [fl[0] + RECUO.dx, fl[1] + RECUO.dy]];
}
function drawParcela(p, cor, a, tras) {
  var c = cantos(p), k;
  ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round';
  if (tras) {
    ctx.fillStyle = cor; ctx.globalAlpha = a * 0.35; ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]);
    for (k = 1; k < 4; k++) ctx.lineTo(c[k][0], c[k][1]);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); ctx.lineTo(c[3][0], c[3][1]); ctx.lineTo(c[2][0], c[2][1]); ctx.lineTo(c[1][0], c[1][1]);
    corda(1.6);
    estaca(c[3][0], c[3][1], 12); estaca(c[2][0], c[2][1], 12);
  } else {
    ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1] - 1); ctx.lineTo(c[1][0], c[1][1] - 1); corda(2);
    estaca(c[0][0], c[0][1], 18); estaca(c[1][0], c[1][1], 18);
  }
  ctx.restore();
}
/* corda clara com contorno escuro, para aparecer sobre o solo e o capim */
function corda(w) { ctx.strokeStyle = 'rgba(40,30,20,0.75)'; ctx.lineWidth = w + 1.6; ctx.stroke(); ctx.strokeStyle = '#fff6e2'; ctx.lineWidth = w; ctx.stroke(); }
function estaca(x, y, h) {
  ctx.fillStyle = '#d8c9a6'; ctx.strokeStyle = 'rgba(60,44,26,0.8)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.rect(x - 1.7, y - h, 3.4, h + 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d2661a'; ctx.fillRect(x - 1.7, y - h, 3.4, h * 0.35);
}
var CASCA = '#5e4c3c';
function folhagem(x, y, n, sx, sy, seed) {
  var r = mulberry32(seed);
  for (var j = 0; j < n; j++) {
    ctx.fillStyle = j % 3 ? 'rgba(112,152,70,0.94)' : 'rgba(80,120,50,0.94)';
    ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * sx, y + (r() - 0.5) * sy, 5.5 + r() * 3, 4 + r() * 2, r() * 3, 0, TAU); ctx.fill();
  }
}
function drawArbusto() {
  var gy = ARB.y + 1;
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = CASCA;
  CAULES.forEach(function (c, k) {
    ctx.lineWidth = 4.6 - k * 0.4; ctx.beginPath(); ctx.moveTo(c.x0, gy); ctx.quadraticCurveTo(c.xc, gy - c.h / 2, c.x2, gy - c.h); ctx.stroke();
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(c.x2 - (c.x2 - c.xc) * 0.3, gy - c.h * 0.78); ctx.lineTo(c.x2 + (k - 1) * 9 - 5, gy - c.h * 0.95); ctx.stroke();
  });
  CAULES.forEach(function (c, k) { folhagem(c.x2 + (k - 1) * 3, gy - c.h, 9, 24, 14, 5150 + k); });
  /* arvoreta de um caule só */
  var ay = ARV.y + 1;
  ctx.fillStyle = CASCA; ctx.beginPath(); ctx.moveTo(ARV.x - ARV.w - 1.5, ay); ctx.lineTo(ARV.x - ARV.w + 0.6, ay - ARV.h); ctx.lineTo(ARV.x + ARV.w - 0.6, ay - ARV.h); ctx.lineTo(ARV.x + ARV.w + 1.5, ay); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ARV.x, ay - ARV.h + 2); ctx.lineTo(ARV.x - 14, ay - ARV.h - 14); ctx.moveTo(ARV.x, ay - ARV.h + 2); ctx.lineTo(ARV.x + 13, ay - ARV.h - 16); ctx.stroke();
  folhagem(ARV.x, ay - ARV.h - 16, 16, 44, 20, 6262);
  ctx.restore();
}
function drawTocos() {
  ctx.save(); ctx.lineJoin = 'round';
  TOCOS.forEach(function (s) {
    var x = s.x, y = groundY(x) - outcropH(x) + 1, w = s.w, h = s.h;
    ctx.fillStyle = '#5a4a3a'; ctx.strokeStyle = 'rgba(30,20,14,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - w * 0.95, y + 1); ctx.lineTo(x - w * 0.55, y - h); ctx.lineTo(x + w * 0.55, y - h + 1.5); ctx.lineTo(x + w * 0.95, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9a77a'; ctx.beginPath(); ctx.ellipse(x, y - h + 0.7, w * 0.55, 2.2, 0.06, 0, TAU); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}

/* ---------- pessoa da equipe de campo (traço das pessoas do manejo agroecológico) ---------- */
function membro(x0, y0, x1, y1, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
/* mao: ponto da cena onde fica a mão da frente; o braço não passa do comprimento dele */
function drawPessoa(x, dir, mao, cor) {
  var s = 1.15, y = groundY(x) + 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  membro(-1.6, -15, -3.2, -0.8, '#3b4552', 3.8); membro(1.6, -15, 3.4, -0.8, '#3b4552', 3.8);
  membro(-3.8, -0.6, -1, -0.6, '#2b2622', 2.6); membro(3, -0.6, 5.8, -0.6, '#2b2622', 2.6);
  ctx.translate(0, -15);
  var hf = [3, 0];
  if (mao) {
    var hx = (mao[0] - x) / (dir * s), hy = (mao[1] - y) / s + 15, dx = hx - 0.6, dy = hy + 11, d = Math.hypot(dx, dy);
    if (d > 13) { hx = 0.6 + dx * 13 / d; hy = -11 + dy * 13 / d; }
    hf = [hx, hy];
  }
  membro(0.6, -11, hf[0] - 1.5, hf[1] + 1, '#3a5a7c', 2.8);
  ctx.fillStyle = '#7a4f34'; ctx.beginPath(); ctx.arc(hf[0] - 1.5, hf[1] + 1, 1.5, 0, TAU); ctx.fill();
  ctx.fillStyle = cor; rrect(-4.4, -13, 8.8, 13, 3); ctx.fill();
  ctx.fillStyle = '#3b4552'; ctx.fillRect(-4.2, -1.6, 8.4, 1.8);
  ctx.fillStyle = '#7a4f34'; ctx.fillRect(-0.4, -14.6, 2.8, 2);
  ctx.beginPath(); ctx.arc(1, -17.4, 3.7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d9bb72'; ctx.beginPath(); ctx.ellipse(1, -19.8, 6.8, 1.6, 0, 0, TAU); ctx.fill();
  rrect(-2.2, -24.4, 6.4, 4.8, 2); ctx.fill();
  membro(0.6, -11, hf[0], hf[1], cor, 2.8);
  ctx.fillStyle = '#7a4f34'; ctx.beginPath(); ctx.arc(hf[0], hf[1], 1.5, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ---------- medir: fita no caule e a marca de 1,30 m ---------- */
var PASSO_MED = 1.6;
function medidos() { return Math.min(MED.length, Math.floor(tempo() / PASSO_MED) + 1); }
function drawMedicao() {
  var k = medidos() - 1, m = MED[k], px = m.x + m.lado * (m.w + 11);
  drawPessoa(px, -m.lado, [m.x + m.lado * m.w, m.y + 1], '#4f78a3');
  ctx.save();
  for (var j = 0; j <= k; j++) {
    var q = MED[j];
    ctx.fillStyle = FITA; ctx.strokeStyle = 'rgba(90,70,10,0.8)'; ctx.lineWidth = 0.7;
    rrect(q.x - q.w - 1, q.y - 1.6, 2 * q.w + 2, 3.2, 1); ctx.fill(); ctx.stroke();
  }
  /* cota de 1,30 m ao lado do caule medido agora */
  var cx = m.x - m.lado * (m.w + 6), gy = groundY(m.x), fs = Math.max(11, 5 * W / cssW), tw;
  ctx.strokeStyle = 'rgba(22,34,42,0.85)'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(cx, gy); ctx.lineTo(cx, m.y); ctx.moveTo(cx - 3, gy); ctx.lineTo(cx + 3, gy); ctx.moveTo(cx - 3, m.y); ctx.lineTo(cx + 3, m.y); ctx.stroke();
  ctx.font = '700 ' + fs + 'px ' + FONT; tw = ctx.measureText('1,30 m').width;
  txt('1,30 m', m.lado > 0 ? cx - 4 - tw : cx + 4, (gy + m.y) / 2 + fs * 0.35, { c: '#16222a', halo: 'rgba(255,255,255,0.9)', sz: fs, w: 700 });
  ctx.restore();
}

/* ---------- outros compartimentos: gabarito de serapilheira, madeira morta e trado ---------- */
function drawCompartimentos() {
  var gy = groundY(GAB.x), r = mulberry32(808), k;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  /* gabarito quadrado no chão, em perspectiva, com folhas dentro */
  var q = [[GAB.x - 12, gy], [GAB.x + 12, gy], [GAB.x + 19, gy - 8], [GAB.x - 5, gy - 8]];
  ctx.fillStyle = 'rgba(150,112,62,0.75)';
  for (k = 0; k < 14; k++) { ctx.beginPath(); ctx.ellipse(GAB.x - 7 + r() * 20, gy - 1.5 - r() * 6, 2.4, 1, r() * 3, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = '#e6dcc0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
  for (k = 1; k < 4; k++) ctx.lineTo(q[k][0], q[k][1]);
  ctx.closePath(); ctx.stroke();
  /* saco de coleta */
  ctx.fillStyle = '#efe7d2'; ctx.strokeStyle = 'rgba(80,64,40,0.8)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(GAB.x - 26, gy + 1); ctx.lineTo(GAB.x - 25, gy - 11); ctx.lineTo(GAB.x - 17, gy - 11); ctx.lineTo(GAB.x - 16, gy + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  /* madeira morta caída */
  var ty = groundY(TORA.x);
  ctx.fillStyle = '#7a6148'; ctx.strokeStyle = 'rgba(40,28,18,0.85)'; ctx.lineWidth = 0.9;
  ctx.save(); ctx.translate(TORA.x, ty - 2.5); ctx.rotate(0.06); rrect(-17, -2.6, 34, 5.2, 2.4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b39472'; ctx.beginPath(); ctx.ellipse(17, 0, 1.6, 2.6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  /* trado no solo, com as camadas da amostra ao lado */
  var tx = TRADO.x, tgy = groundY(tx), fundo = tgy + 36;
  for (k = 0; k < 3; k++) {
    ctx.fillStyle = ['#5a4130', '#7a5a40', '#9a7a58'][k]; ctx.fillRect(tx + 4, tgy + k * 12, 6, 12);
  }
  ctx.strokeStyle = 'rgba(30,24,18,0.8)'; ctx.lineWidth = 0.8; ctx.strokeRect(tx + 4, tgy, 6, 36);
  ctx.strokeStyle = '#4c5458'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(tx, tgy - 34); ctx.lineTo(tx, fundo); ctx.stroke();
  ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(tx - 9, tgy - 34); ctx.lineTo(tx + 9, tgy - 34); ctx.stroke();
  ctx.restore();
  drawPessoa(tx - 13, 1, [tx - 1, tgy - 33], '#b0644a');
}

/* ---------- rótulos ---------- */
function rotulo(s, tx, ty, ax, ay, fs) {
  var a = clamp(cha);
  if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = '600 ' + fs + 'px ' + FONT;
  var w = ctx.measureText(s).width + fs * 0.9, px = Math.max(8, Math.min(W - 8 - w, tx - w / 2));
  if (ax != null) {
    ctx.strokeStyle = 'rgba(22,34,42,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(clamp(ax, px + 6, px + w - 6), ty + fs * 0.5); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.fillStyle = '#16222a'; ctx.beginPath(); ctx.arc(ax, ay, 2.6, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; rrect(px, ty - fs * 1.0, w, fs * 1.5, fs * 0.35); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, px + fs * 0.45, ty + fs * 0.05);
  ctx.restore();
}
function drawRotulos() {
  var m = MS[me], fs = Math.max(12.5, 5.6 * W / cssW);
  if (me === 0) ESTR.forEach(function (e, k) { var x = [170, 485, 800][k]; rotulo(e.nome, x, 262, x, groundY(x) + 2, fs); });
  else if (m.parcelas && !m.estimativa) { var c = cantos(PARC[0]); rotulo('parcela de 20 × 20 m', 300, 262, c[2][0] - 20, c[2][1] + 4, fs); }
  else if (m.mede) rotulo('vários caules: cada um é medido', 330, 236, CAULES[2].x2, ARB.y - 40, fs);
  else if (m.comp) {
    rotulo('serapilheira: recolher, secar e pesar', 300, 236, GAB.x, groundY(GAB.x) - 3, fs);
    rotulo('madeira morta', 610, 236, TORA.x + 6, groundY(TORA.x) - 4, fs);
    rotulo('solo: amostras por camada', 300, 300, TRADO.x + 7, groundY(TRADO.x) + 20, fs);
    rotulo('raízes: proporção da parte aérea', 720, 300, SP[3].x + 10, groundY(SP[3].x) + 26, fs);
  }
}

/* ---------- painel do canto direito: mapa, ficha de campo, equação ou conversão ---------- */
/* mapa da área visto de cima, em coordenadas de 0 a 1: contorno, divisão dos estratos e posição das parcelas */
var CONTORNO = [[0.04, 0.3], [0.18, 0.08], [0.42, 0.13], [0.62, 0.04], [0.86, 0.14], [0.97, 0.42], [0.9, 0.78], [0.66, 0.95], [0.38, 0.87], [0.14, 0.96], [0.02, 0.66]];
function divisa(k, v) { return k === 0 ? 0.36 + 0.04 * Math.sin(v * 6) : 0.66 + 0.04 * Math.sin(v * 5 + 1); }
function dentro(u, v) {
  var c = false, i, j, n = CONTORNO.length;
  for (i = 0, j = n - 1; i < n; j = i++) {
    var a = CONTORNO[i], b = CONTORNO[j];
    if ((a[1] > v) !== (b[1] > v) && u < (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function zona(u, v) { return u < divisa(0, v) ? 0 : u < divisa(1, v) ? 1 : 2; }
var PONTOS_MAPA = (function () {
  var r = mulberry32(2024), out = [[], [], []], t, u, v, z, ok, k;
  for (t = 0; t < 6000 && (out[0].length < 10 || out[1].length < 10 || out[2].length < 10); t++) {
    u = 0.05 + r() * 0.9; v = 0.06 + r() * 0.88; z = zona(u, v);
    if (out[z].length >= 10 || !dentro(u, v) || !dentro(u - 0.035, v - 0.05) || !dentro(u + 0.035, v + 0.05)) continue;
    if (Math.abs(u - divisa(0, v)) < 0.035 || Math.abs(u - divisa(1, v)) < 0.035) continue;
    ok = true;
    for (k = 0; k < 3 && ok; k++) out[k].forEach(function (p) { if (Math.hypot(p[0] - u, (p[1] - v) * 0.55) < 0.06) ok = false; });
    if (ok) out[z].push([u, v]);
  }
  return out;
})();
function caixaPainel(x0, pw, ph) {
  var px = W - x0 - pw, py = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.86)'; rrect(px, py, pw, ph, 8); ctx.fill();
  return [px, py];
}
function drawMapa(x0, fs) {
  var m = MS[me], pad = fs * 0.75, mw = fs * 15, mh = fs * 8.2, i, k;
  var ph = pad * 2 + fs * 1.2 + mh + fs * 2.9 + (m.estimativa ? fs * 5.5 : 0), pw = mw + pad * 2, o = caixaPainel(x0, pw, ph), px = o[0], py = o[1];
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('mapa da área', px + pad, py + pad + fs * 0.7);
  var mx = px + pad, my = py + pad + fs * 1.2;
  function P(u, v) { return [mx + u * mw, my + v * mh]; }
  function contorno() { ctx.beginPath(); CONTORNO.forEach(function (c, j) { var q = P(c[0], c[1]); if (j) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }
  ctx.save(); contorno(); ctx.clip();
  ctx.fillStyle = ESTR[2].cor; ctx.fillRect(mx, my, mw, mh);
  for (k = 1; k >= 0; k--) {
    ctx.fillStyle = ESTR[k].cor; ctx.beginPath(); ctx.moveTo(mx, my);
    for (i = 0; i <= 20; i++) { var q = P(divisa(k, i / 20), i / 20); ctx.lineTo(q[0], q[1]); }
    ctx.lineTo(mx, my + mh); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  contorno(); ctx.strokeStyle = 'rgba(22,34,42,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
  /* parcelas: o mesmo número em cada estrato */
  if (m.parcelas) {
    var n = nParc / 3, sz = fs * 0.62;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#16222a'; ctx.lineWidth = 1;
    for (k = 0; k < 3; k++) for (i = 0; i < n && i < PONTOS_MAPA[k].length; i++) {
      var pt = P(PONTOS_MAPA[k][i][0], PONTOS_MAPA[k][i][1]); ctx.beginPath(); ctx.rect(pt[0] - sz / 2, pt[1] - sz / 2, sz, sz); ctx.fill(); ctx.stroke();
    }
  }
  /* legenda dos estratos, quebrando a linha quando não cabe */
  var ly = my + mh + fs * 1.15, lx = mx;
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT;
  ESTR.forEach(function (e) {
    var w = fs * 0.95 + ctx.measureText(e.nome).width;
    if (lx > mx && lx + w > mx + mw) { lx = mx; ly += fs * 1.3; }
    ctx.fillStyle = e.cor; rrect(lx, ly - fs * 0.62, fs * 0.7, fs * 0.7, fs * 0.15); ctx.fill();
    ctx.fillStyle = '#4a5258'; ctx.fillText(e.nome, lx + fs * 0.95, ly); lx += w + fs * 0.75;
  });
  if (m.estimativa) {
    /* estimativa do estoque da área com a faixa de incerteza, que encolhe com a raiz do número de parcelas */
    var by = ly + fs * 1.6, bx = mx, bw = mw, cxm = bx + bw / 2, hw = bw / 2 * faixa;
    ctx.font = '600 ' + fs * 0.9 + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText('estoque de carbono da área', bx, by);
    var yb = by + fs * 0.9;
    ctx.fillStyle = 'rgba(22,34,42,0.12)'; rrect(bx, yb, bw, fs * 0.8, fs * 0.4); ctx.fill();
    ctx.fillStyle = 'rgba(63,154,58,0.45)'; ctx.fillRect(cxm - hw, yb, 2 * hw, fs * 0.8);
    ctx.strokeStyle = CFICA; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(cxm - hw, yb - 2); ctx.lineTo(cxm - hw, yb + fs * 0.8 + 2); ctx.moveTo(cxm + hw, yb - 2); ctx.lineTo(cxm + hw, yb + fs * 0.8 + 2); ctx.stroke();
    ctx.fillStyle = '#16222a'; ctx.beginPath(); ctx.arc(cxm, yb + fs * 0.4, fs * 0.28, 0, TAU); ctx.fill();
    ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258';
    ctx.fillText('faixa de incerteza com ' + nParc + ' parcelas', bx, yb + fs * 2.1);
    ctx.fillText(nParc / 3 + ' em cada estrato', bx, yb + fs * 3.2);
  }
}
/* ficha de campo: uma linha por caule medido, com traços no lugar dos números */
function drawFicha(x0, fs) {
  var pad = fs * 0.75, cols = ['planta', 'caule', 'CAP', 'altura'], cw = fs * 4.2, rh = fs * 1.5, i, j;
  var pw = pad * 2 + cw * 4, ph = pad * 2 + fs * 1.2 + rh * (MED.length + 1), o = caixaPainel(x0, pw, ph), px = o[0], py = o[1];
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('ficha de campo', px + pad, py + pad + fs * 0.7);
  var ty = py + pad + fs * 1.2;
  ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#16222a';
  for (j = 0; j < 4; j++) ctx.fillText(cols[j], px + pad + cw * j, ty + rh * 0.7);
  ctx.strokeStyle = 'rgba(22,34,42,0.25)'; ctx.lineWidth = 1;
  for (i = 0; i <= MED.length; i++) { ctx.beginPath(); ctx.moveTo(px + pad, ty + rh * (i + 1)); ctx.lineTo(px + pw - pad, ty + rh * (i + 1)); ctx.stroke(); }
  var n = medidos(), r = mulberry32(77);
  ctx.font = '500 ' + fs * 0.85 + 'px ' + FONT;
  for (i = 0; i < MED.length; i++) {
    var yy = ty + rh * (i + 1) + rh * 0.68;
    if (i >= n) continue;
    ctx.fillStyle = TINTA; ctx.fillText(i === 0 ? '1' : '2', px + pad, yy); ctx.fillText(String(i === 0 ? 1 : i), px + pad + cw, yy);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    for (j = 2; j < 4; j++) {
      var x = px + pad + cw * j, w = fs * (1.6 + r() * 1.2); ctx.beginPath(); ctx.moveTo(x, yy - fs * 0.25);
      for (var s = 1; s <= 6; s++) ctx.lineTo(x + w * s / 6, yy - fs * 0.25 + (s % 2 ? -fs * 0.22 : fs * 0.18));
      ctx.stroke();
    }
  }
}
/* curva diâmetro x biomassa, sem escala: forma de potência com expoente maior que 2, como nas equações de biomassa */
var DIAM = [0.78, 0.38, 0.3, 0.22];
function curva(d) { return Math.pow(d, 2.4); }
function drawEquacao(x0, fs) {
  var pad = fs * 0.75, gw = fs * 13, gh = fs * 7.2, i, t = tempo();
  var pw = pad * 2 + gw + fs * 1.4, ph = pad * 2 + fs * 2.6 + gh + fs * 4.6, o = caixaPainel(x0, pw, ph), px = o[0], py = o[1];
  /* biomassa = a × D elevado a b, com o b em sobrescrito */
  ctx.font = '700 ' + fs + 'px ' + FONT; ctx.fillStyle = '#16222a';
  var fx = px + pad, fy = py + pad + fs * 0.95, s1 = 'biomassa = a × D';
  ctx.fillText(s1, fx, fy); ctx.font = '700 ' + fs * 0.7 + 'px ' + FONT; ctx.fillText('b', fx + (function () { ctx.font = '700 ' + fs + 'px ' + FONT; var w = ctx.measureText(s1).width; ctx.font = '700 ' + fs * 0.7 + 'px ' + FONT; return w + 1; })(), fy - fs * 0.4);
  ctx.font = '500 ' + fs * 0.75 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('a e b: Sampaio e Silva (2005)', fx, fy + fs * 1.25);
  var gx = px + pad + fs * 1.4, gy0 = py + pad + fs * 2.6 + gh;
  ctx.strokeStyle = 'rgba(22,34,42,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(gx, gy0 - gh); ctx.lineTo(gx, gy0); ctx.lineTo(gx + gw, gy0); ctx.stroke();
  ctx.font = '500 ' + fs * 0.75 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('diâmetro (D)', gx + gw - ctx.measureText('diâmetro (D)').width, gy0 + fs * 1.05);
  ctx.save(); ctx.translate(gx - fs * 0.45, gy0); ctx.rotate(-Math.PI / 2); ctx.fillText('biomassa seca', 0, 0); ctx.restore();
  ctx.strokeStyle = BIOM; ctx.lineWidth = 2; ctx.beginPath();
  for (i = 0; i <= 40; i++) { var d = i / 40, X = gx + d * gw, Y = gy0 - curva(d) * gh * 0.95; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
  ctx.stroke();
  /* cada caule medido sobe do seu diâmetro até a curva; depois as biomassas se somam na barra da parcela */
  var tot = 0; for (i = 0; i < DIAM.length; i++) tot += curva(DIAM[i]);
  var bw = gw, by = gy0 + fs * 2.4, acc = 0;
  for (i = 0; i < DIAM.length; i++) {
    var u = smooth(0.4 + i * 0.7, 1.0 + i * 0.7, t), dx = gx + DIAM[i] * gw, dy = gy0 - curva(DIAM[i]) * gh * 0.95;
    if (u <= 0) continue;
    ctx.strokeStyle = 'rgba(138,106,66,0.5)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(dx, gy0); ctx.lineTo(dx, lerp(gy0, dy, u)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = FITA; ctx.strokeStyle = 'rgba(90,70,10,0.9)'; ctx.beginPath(); ctx.arc(dx, lerp(gy0, dy, u), fs * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
    var sw = bw * 0.9 * curva(DIAM[i]) / tot * smooth(3.4 + i * 0.35, 3.8 + i * 0.35, t);
    ctx.fillStyle = i % 2 ? '#a5835a' : BIOM; ctx.fillRect(gx + acc, by, sw, fs * 0.8); acc += sw;
  }
  ctx.strokeStyle = 'rgba(22,34,42,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(gx, by, bw * 0.9, fs * 0.8);
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('biomassa da parcela (soma)', gx, by - fs * 0.35);
}
/* conversão: as áreas dos quadrados são proporcionais às massas */
function drawConversao(x0, fs) {
  var pad = fs * 0.75, base = fs * 4.2, t = tempo(), i;
  var M = [[1, BIOM, '1 t de', 'biomassa seca'], [0.47, CFICA, '0,47 t de', 'carbono'], [0.47 * 44 / 12, CO2E, '1,72 t de', 'CO₂']];
  var lados = M.map(function (q) { return base * Math.sqrt(q[0]); }), gap = fs * 4;
  var pw = pad * 2 + lados[0] + lados[1] + lados[2] + gap * 2, ph = pad * 2 + fs * 1.2 + lados[2] + fs * 3.2, o = caixaPainel(x0, pw, ph), px = o[0], py = o[1];
  ctx.font = '500 ' + fs * 0.8 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText('da biomassa ao carbono', px + pad, py + pad + fs * 0.7);
  var yb = py + pad + fs * 1.2 + lados[2], x = px + pad;
  for (i = 0; i < 3; i++) {
    var a = smooth(0.2 + i * 1.1, 0.7 + i * 1.1, t), l = lados[i];
    if (i > 0) {
      ctx.globalAlpha = a; ctx.font = '700 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#16222a';
      var op = i === 1 ? '× 0,47' : '× 44/12', ow = ctx.measureText(op).width;
      ctx.fillText(op, x - gap / 2 - ow / 2, yb - fs * 1.4);
      ctx.strokeStyle = '#16222a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - gap + fs * 0.4, yb - fs * 0.6); ctx.lineTo(x - fs * 0.4, yb - fs * 0.6);
      ctx.moveTo(x - fs * 0.85, yb - fs * 0.95); ctx.lineTo(x - fs * 0.4, yb - fs * 0.6); ctx.lineTo(x - fs * 0.85, yb - fs * 0.25); ctx.stroke();
    }
    ctx.globalAlpha = a; ctx.fillStyle = M[i][1]; rrect(x, yb - l, l, l, fs * 0.2); ctx.fill();
    ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(M[i][2], x, yb + fs * 1.15); ctx.fillText(M[i][3], x, yb + fs * 2.2);
    ctx.globalAlpha = 1; x += l + gap;
  }
}
function wrapLines(s, maxW) {
  var w = s.split(' '), lines = [], cur = '', t, i;
  for (i = 0; i < w.length; i++) { t = cur ? cur + ' ' + w[i] : w[i]; if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function drawMedHUD() {
  var x0 = Math.max(12, 10 * W / cssW), m = MS[me], fs, pad, y, i, s;
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  fs = Math.max(15, 7 * W / cssW); pad = fs * 0.6;
  ctx.font = '700 ' + fs + 'px ' + FONT; s = 'Medir o carbono de uma área';
  ctx.fillStyle = 'rgba(255,255,255,0.72)'; rrect(x0, x0, ctx.measureText(s).width + pad * 2, fs * 1.9, fs * 0.4); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(s, x0 + pad, x0 + fs * 1.27);
  var fp = Math.max(12.5, 5.6 * W / cssW);
  ctx.globalAlpha = 0.4 + 0.6 * cha;
  if (m.mapa) drawMapa(x0, fp); else if (m.mede) drawFicha(x0, fp); else if (m.equacao) drawEquacao(x0, fp); else if (m.conv) drawConversao(x0, fp);
  ctx.globalAlpha = 1;
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
medSelect(0);
var cena = {
  semTempo: true,
  semPan: true,
  torre: false,
  alfaMeio: function (p) { return p.x > 650 ? 0.3 : p.x > 340 ? 0.75 : 1; },
  planoFrente: function (bark) {
    var i, m = MS[me];
    drawSoil();
    drawLitter(litFg, Math.max(st.lit, 0.8), 0.9);
    drawFaixasEstrato(me === 0 ? 1 : 0.45);
    if (m.parcelas || m.mede || m.comp) PARC.forEach(function (p, k) { if (m.parcelas || k === (m.comp ? 1 : 0)) drawParcela(p, ESTR[k].cor, 1, true); });
    for (i = 0; i < near.length; i++) if (!near[i].hidden) drawPlant(near[i], bark, false);
    for (i = 0; i < fill.length; i++) drawPlant(fill[i], bark, false);
    for (i = 0; i < SP.length; i++) { var sp = SP[i]; if (i === 4) continue; if (sp.kind === 'tree') drawTreeSp(sp); else if (sp.kind === 'cactus1') drawMandacaru(sp); else drawFacheiro(sp); }
    drawSucc(0.94 + 0.06 * st.S);
    drawTocos();
    drawHerbs(herbsFg, false, 0, 1);
    drawArbusto();
    if (m.parcelas || m.mede || m.comp) PARC.forEach(function (p, k) { if (m.parcelas || k === (m.comp ? 1 : 0)) drawParcela(p, ESTR[k].cor, 1, false); });
    if (m.parcelas && !m.estimativa) drawPessoa(PARC[0].x0 + 9, -1, [PARC[0].x0 + 1, groundY(PARC[0].x0) - 12], '#4f78a3');
    if (m.mede) drawMedicao();
    if (m.comp) drawCompartimentos();
  },
  substituirInterface: function () { drawRotulos(); drawMedHUD(); },
  ajustarEstado: function () { st.rainI = 0; st.cloud = Math.min(st.cloud, 0.15); },
  atualizar: medUpdate,
  etapas: MS.map(function (m) { return { nome: m.nome, cor: null }; }),
  selecionarEtapa: function (i) { medSelect(i); },
  etapaAtual: function () { return me; },
  textoEtapa: function () { return MS[me].tit + '. ' + MS[me].txt; },
  valor: VPARC,
  definirValor: medDefinir,
  valorAtual: function () { return nParc; },
  textoValor: function () { return String(nParc); },
  descricaoValor: function () { return nParc + ' parcelas, ' + nParc / 3 + ' por estrato'; }
};
