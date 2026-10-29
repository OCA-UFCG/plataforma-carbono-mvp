/* Começa parada, sem fauna e sem oscilar a câmera; os botões de etapa ficam no painel da página,
   e a legenda e os textos de cada etapa vão no elemento que a página reserva abaixo dele.
   Sem a nota e as fontes do pacote, que a equipe vai reescrever. */
FAUNA = false; playing = false; phase = 0.45;
var PAINEL = opcoes.painel; PAINEL.innerHTML = "<div class=\"legend\" aria-label=\"Legenda do painel de carbono\">\n    <span><span class=\"sw\" style=\"background:#d9803a\"></span>Solo</span>\n    <span><span class=\"sw\" style=\"background:#5fae45\"></span>Parte aérea</span>\n    <span><span class=\"sw\" style=\"background:#f3e2b0\"></span>Raízes</span>\n    <span><span class=\"sw\" style=\"background:#a3714a\"></span>Madeira morta</span>\n    <span><span class=\"sw\" style=\"background:#e0b43c\"></span>Serapilheira e cobertura</span>\n    <span><span class=\"sw\" style=\"background:#a6d04f\"></span>Herbáceas e lavoura</span>\n    <span><span class=\"sw hatch\"></span>Carbono a menos no tradicional</span>\n  </div>\n  <section class=\"stage\" id=\"stage\">\n    <h3 id=\"stTit\">1. Mesma área, dois manejos</h3>\n    <p class=\"both\" id=\"stBoth\">As duas áreas começam iguais: mesma vegetação, mesmo solo e mesma chuva. A cerca marca onde muda o jeito de produzir.</p>\n    <div class=\"cols\" id=\"stCols\" hidden>\n      <div class=\"col ag\"><h4>Agroecológico</h4><p id=\"stA\"></p></div>\n      <div class=\"col tr\"><h4>Tradicional exploratório</h4><p id=\"stB\"></p></div>\n    </div>\n  </section>";
function $id(id) { return PAINEL.querySelector('#' + id); }
/* ---------- animação 7: agroecológico e tradicional exploratório ----------
   Tela dividida por uma cerca (x = 480). Esquerda: manejo agroecológico (raleamento seletivo com faixas de Caatinga, consórcio,
   cobertura morta, abelhas e agricultores). Direita: modelo tradicional exploratório (corte raso, queima, roça em solo nu, pousio
   e abertura de área nova), sem pessoas, como na animação 6. A comparação é entre os dois manejos; não há Caatinga conservada
   como referência no painel.
   Textos: Kauffman et al. (1993), Ecology 74:140 (queima de 78% a 95% da biomassa aérea; até 96% do C e do N aéreos; cinza levada
   pelo vento; pousios de até 15 anos contra um século ou mais para repor nutrientes). Campanha et al. (2009), Circular Técnica 42,
   Embrapa Caprinos e Ovinos (0 a 5 cm, cerca de 10 anos: agrossilvipastoril -10%, tradicionais -27% e -39%, todos em relação à
   mesma Caatinga; 0,90/0,73 e 0,90/0,61 dão 23% e 48% a mais: cálculo meu). Sacramento et al. (2013), RBCS 37:784 (corte e queima
   com 2 a 3 anos de cultivo). Aguiar et al. (2010), Agrofor. Syst. 79:277 (2 anos de milho e 8 a 10 de pousio; maior perda de água
   no tradicional e no cultivo intensivo em 2004). Sales & Souza (s.d.), manuscrito sem revisão por pares (35,1 contra 26,4 Mg C/ha).
   Degradação no sistema exploratório: fertilidade dependente da matéria orgânica do solo (Tiessen et al., 2001, Nutr. Cycl. Agroecosyst.
   61:99); perda de até 40% do C do solo seis anos após a derrubada (Tiessen et al., 1992) e quase metade do C perdido levado pela
   erosão em áreas desmatadas havia 35 anos (Fraga & Salcedo, 2004), ambos como citados em Menezes et al. (2012), Braz. J. Biol.
   72:643, que também lista corte e queima, sobrepastoreio e lenha entre as causas humanas da desertificação.
   Barras: ilustração; partida com a partição da animação 6; diferenças na direção e na ordem de grandeza dos estudos.
   "5 a 6 vezes a área da roça": (2 + 8 a 10) / 2. Desenho sem escala. */
var FX = 480;
var KC = ['#d9803a', '#5fae45', '#f3e2b0', '#a3714a', '#e0b43c', '#a6d04f'];
var CO2OUT = '#d2661a', AGC = '#2e6b57', TRC = '#8a4b2a';
var C0 = [90.1, 19.9, 9.1, 3.6, 1.6, 0.6];
function A_(thin, mulch, crop, stub, bees) { return { thin: thin, mulch: mulch, crop: crop, stub: stub, bees: bees }; }
function B_(o) { var d = { cut: 0, fire: 0, char: 0, bare: 0, crop: 0, stub: 0, ash: 0, aband: 0, ero: 0, newA: 0, newF: 0, poor: 0 }; for (var k in o) d[k] = o[k]; return d; }
var AGS = [
  { nome: 'Mesma área', tit: 'Mesma área, dois manejos', ph: 0.45, rain: 0, land: 0,
    a: A_(0, 0, 0, 0, 0), b: B_({}), CA: C0, CB: C0,
    both: 'As duas áreas começam iguais: mesma vegetação, mesmo solo e mesma chuva. A cerca marca onde muda o jeito de produzir.' },
  { nome: 'Preparo', tit: 'Preparo da área', ph: 0.95, rain: 0, land: 0,
    a: A_(1, 1, 0, 0, 0), b: B_({ cut: 1, fire: 1, char: 1, bare: 0.3 }),
    CA: [90.1, 9.5, 8.0, 5.0, 4.0, 0.4], CB: [89.6, 0, 8.4, 0.5, 0, 0],
    txtA: 'Raleamento seletivo: ficam faixas de Caatinga e as árvores úteis, como o umbuzeiro. Os galhos cortados são picados e cobrem o chão. Sem fogo.',
    txtB: 'Corte raso e queima. Em queimadas experimentais na Caatinga, o fogo consumiu de 78% a 95% da biomassa acima do solo, e até 96% do carbono dessa biomassa foi para o ar (Kauffman et al., 1993).' },
  { nome: 'Chuva e plantio', tit: 'Chuva e plantio', ph: 0.28, rain: 0.75, land: 0,
    a: A_(1, 0.85, 1, 0, 1), b: B_({ cut: 1, char: 0.25, bare: 1, crop: 1, poor: 0.2 }),
    CA: [90.0, 9.8, 8.1, 4.4, 3.4, 1.4], CB: [88.8, 0, 7.4, 0.4, 0.1, 1.0],
    txtA: 'Milho, feijão, guandu e palma crescem entre as faixas de árvores, sobre a cobertura de folhas e galhos. Com o solo coberto, mais água da chuva infiltra e fica no solo.',
    txtB: 'Milho e feijão em solo nu. Sem cobertura, mais água escorre pela superfície. Em Sobral (CE), num dos dois anos medidos, o sistema tradicional ficou entre os de maior perda de água por escoamento (Aguiar et al., 2010).' },
  { nome: 'Seca', tit: 'Seca', ph: 0.80, rain: 0, land: 0,
    a: A_(1, 1, 0, 0.8, 1), b: B_({ cut: 1, char: 0.1, bare: 1, stub: 0.8, ash: 1, poor: 0.4 }),
    CA: [90.2, 9.8, 8.1, 4.0, 4.4, 0.4], CB: [87.8, 0, 6.8, 0.4, 0.1, 0.2],
    txtA: 'As árvores perdem as folhas, o que é normal na Caatinga. Folhas e galhos picados continuam protegendo o solo, e a palma segue verde como reserva de forragem.',
    txtB: 'Depois da colheita, o solo fica exposto ao sol e ao vento. A cinza da queima, onde ficou parte dos nutrientes, é levada pelo vento (Kauffman et al., 1993).' },
  { nome: 'Anos depois', tit: 'Anos depois', ph: 0.45, rain: 0, land: 1,
    a: A_(1, 0.9, 1, 0, 1), b: B_({ cut: 1, bare: 1, aband: 1, ero: 1, newA: 1, newF: 1, poor: 1 }),
    CA: [86.0, 11.5, 8.4, 3.4, 3.6, 1.0], CB: [68.0, 0.8, 3.2, 0.4, 0.2, 0.3],
    txtA: 'A produção continua no mesmo lugar, ano após ano. Folhas, galhos e raízes alimentam o solo, que perde pouco carbono: em Sobral (CE), cerca de 10 anos depois do preparo, o sistema agrossilvipastoril tinha perdido 10% do carbono dos primeiros 5 cm do solo, e os sistemas tradicionais, de 27% a 39% (Campanha et al., 2009).',
    txtB: 'Depois de poucos anos de roça o solo se esgota: a área degradada perde produtividade, é abandonada, e a roça passa para outra área. Nesse sistema a fertilidade depende da matéria orgânica do solo (Tiessen et al., 2001), e o solo chegou a perder até 40% do carbono seis anos depois da derrubada (Tiessen et al., 1992, como citado em Menezes et al., 2012). Com 2 anos de roça e 8 a 10 de abandono antes de nova derrubada, o rodízio ocupa de 5 a 6 vezes a área da roça (conta feita com o ciclo descrito por Aguiar et al., 2010).' },
  { nome: 'Balanço', tit: 'Balanço', ph: 0.40, rain: 0.5, land: 1,
    a: A_(1, 0.9, 1, 0, 1), b: B_({ cut: 1, bare: 1, aband: 1, ero: 1, newA: 1, poor: 1 }),
    CA: [86.0, 11.5, 8.4, 3.4, 3.6, 1.0], CB: [68.0, 0.8, 3.2, 0.4, 0.2, 0.3],
    txtA: 'Árvores em pé, solo coberto e produção variada (umbu, mel, feijão, milho, forragem) na mesma área. Em áreas da BA, de PE e da PB, a transição agroecológica tinha cerca de um terço a mais de carbono que o manejo convencional (Sales & Souza, s.d.; resultado preliminar). A lavoura absorve CO₂ na safra, mas esse carbono dura meses; o que guarda carbono por anos são as árvores, as raízes e o solo.',
    txtB: 'O fogo devolveu ao ar o carbono da vegetação. Sem cobertura, o solo perde carbono, nutrientes e a camada de cima: em áreas da PB e de PE desmatadas havia 35 anos para lavoura ou pasto, quase metade do carbono perdido saiu com a erosão (Fraga & Salcedo, 2004, como citado em Menezes et al., 2012). Corte e queima, sobrepastoreio e extração intensa de lenha estão entre as causas humanas da desertificação na Caatinga (Menezes et al., 2012).' }
];
/* agricultores (só no lado agroecológico) por etapa */
var PPL = [
  [],
  [{ x: 236, pose: 'bend', dir: 1, who: 0, prop: 'galhos' }, { x: 330, pose: 'carry', dir: -1, who: 1, prop: 'galhos' }],
  [{ x: 316, pose: 'hoe', dir: -1, who: 0 }, { x: 212, pose: 'bend', dir: 1, who: 1 }],
  [{ x: 300, pose: 'carry', dir: 1, who: 1, prop: 'palma' }],
  [{ x: 82, pose: 'reach', dir: 1, who: 0, prop: 'cesto' }, { x: 418, pose: 'stand', dir: 1, who: 1 }],
  [{ x: 226, pose: 'basket', dir: 1, who: 1, prop: 'cesto' }, { x: 300, pose: 'rest', dir: -1, who: 0 }]
];
var WHO = [{ skin: '#8a5a3c', shirt: '#4f78a3', pants: '#3b4552', hat: '#d9bb72', band: '#7b5a2c' },
  { skin: '#6e452e', shirt: '#b0644a', pants: '#4a4050', hat: '#e0c27e', band: '#6c4a24' }];
/* rótulos: lado (0 esquerda, 1 direita), texto, posição da caixa e ponto indicado */
function Lb(side, s, tx, ty, ax, ay) { return { side: side, s: s, tx: tx, ty: ty, ax: ax, ay: ay }; }
var LBL = [
  [],
  [Lb(0, 'galhos picados cobrem o chão', 250, 228, 240, groundY(240) - 2), Lb(0, 'faixa de Caatinga mantida', 400, 176, 418, 228),
   Lb(1, 'corte raso e queima', 720, 214, 706, groundY(706) - 16)],
  [Lb(0, 'milho, feijão, guandu e palma', 250, 214, 300, groundY(300) - 26), Lb(0, 'a água infiltra', 232, 412, 232, groundY(232) + 16),
   Lb(1, 'mais água escorre', 740, 412, 760, groundY(760) - 2)],
  [Lb(0, 'palma: forragem na seca', 150, 214, 142, groundY(142) - 20), Lb(0, 'folhas e galhos protegem o solo', 250, 412, 244, groundY(244) - 1),
   Lb(1, 'o vento leva a cinza', 800, 214, 790, groundY(790) - 12), Lb(1, 'solo exposto', 700, 412, 704, groundY(704))],
  [Lb(0, 'a roça fica no mesmo lugar', 250, 214, 304, groundY(304) - 30), Lb(1, 'área degradada e abandonada', 590, 250, 536, groundY(536) + 2),
   Lb(1, 'área nova aberta', 800, 182, 664, midY(664) - 10), Lb(1, 'o solo perde carbono', 850, 412, 872, groundY(872) + 9)],
  [Lb(0, 'a água infiltra', 110, 412, 140, groundY(140) + 16), Lb(1, 'a enxurrada leva solo', 850, 412, 872, groundY(872) + 2)]
];
var am = 0, phT = 0.45, aha = 1, aclk = 0, aTour = 0, aTouring = !reduce, rainL = 0, landA = 0;
var agS = A_(0, 0, 0, 0, 0), trS = B_({});
var cA = C0.slice(), cB = C0.slice(), pplA = [0, 0, 0, 0, 0, 0];
var smk = [], co2p = [], bgSm = [], ashP = [], accSm = 0, accC = 0, accB = 0, accA = 0;
var stTit, stBoth, stCols, stA, stB;

/* ---------- geometria fixa ---------- */
var MUL = null, SLR = null, FLR = null, STR = null, STL = null, FAL = null, CRL = null, CRR = null;
var PAL = [142, 364], BOX = [436, 460], INFL = [36, 84, 140, 214, 246, 300, 332, 380, 420, 452], INFR = [530, 700, 900];
var hLs = [], hLa = [], hR = [], litL = [], litR = [];
function inAlley(x) { return x > 150 && x < 362; }
function vegA(x) { return x < FX ? (inAlley(x) ? 1 - agS.thin : 1) : 1 - trS.cut; }
function infK(x) { var u = clamp((x - FX + 10) / 20); return 1 - u * 0.5 * trS.bare; }
function midAlpha(p) { return p.x > 572 && p.x < 748 ? 1 - trS.newA : 1; }
/* erosão do lado tradicional: parte da camada de cima levada e sulcos rasos */
var RIL = [[560, 13, 11], [702, 15, 13], [890, 13, 10]];
function rill(x) { var d = 0; for (var k = 0; k < RIL.length; k++) { var u = (x - RIL[k][0]) / RIL[k][1]; if (Math.abs(u) < 1) d = Math.max(d, RIL[k][2] * (1 - u * u)); } return d; }
function lowerR(x) { return clamp((x - FX - 6) / 16) * (0.09 * soilD(x) + rill(x)); }
function surfR(x) { return groundY(x) + trS.ero * lowerR(x); }
function smallPlant(r, x, h) {
  var p = mkPlant(r, x, groundY(x) + 1, h, 0), g = genPlant(r, h, 2), n = g.tips.length;
  p.byD = g.byD; p.tips = g.tips; p.h = g.h; p.tx = new Float32Array(n); p.ty = new Float32Array(n); p.rr = new Float32Array(n); p.hidden = false;
  return p;
}
function buildAg() {
  var r = mulberry32(7007), i, x, k;
  MUL = [];
  for (i = 0; i < 320; i++) { x = 150 + r() * 214; if (outcropH(x) > 0.3) continue; MUL.push({ x: x, y: groundY(x) - 0.6 + r() * 2.4, a: (r() - 0.5) * 0.9, l: 2.5 + r() * 5, c: (r() * 3) | 0 }); }
  SLR = [];
  for (i = 0; i < 64; i++) { x = FX + 14 + r() * (W - FX - 24); if (outcropH(x) > 0.5) continue; SLR.push({ x: x, a: (r() - 0.5) * 0.5, l: 10 + r() * 14, b: r() < 0.5 }); }
  FLR = [];
  for (x = FX + 16; x < W - 8; x += 19) { if (outcropH(x) > 0.5) continue; FLR.push({ x: x + (r() - 0.5) * 8, h: 12 + r() * 12, ph: r() * TAU }); }
  STR = []; STL = [];
  SP.forEach(function (s) { if (s.x > FX) STR.push({ x: s.x, w: s.kind === 'tree' ? 15 : 10, h: 9 + r() * 4, cac: s.kind !== 'tree' }); });
  near.forEach(function (q) { if (q.hidden) return; var o = { x: q.x, w: 8, h: 6 + r() * 4 }; if (q.x > FX && q.h > 40) STR.push(o); else if (q.x < FX && inAlley(q.x)) STL.push(o); });
  fill.forEach(function (q) { if (q.h < 40) return; var o = { x: q.x, w: q.h > 70 ? 8 : 6.5, h: 5 + r() * 3 }; if (q.x > FX) STR.push(o); else if (inAlley(q.x)) STL.push(o); });
  /* rebrota no pousio: brotos nos tocos e algumas plântulas */
  var fr = mulberry32(8118);
  FAL = [];
  [536, 662, 760, 928].forEach(function (xx) { if (outcropH(xx) > 0.3) return; var q = smallPlant(fr, xx, 11 + fr() * 9); q.y += lowerR(xx); q.amp = 0.5; FAL.push(q); });
  CRL = [];
  [[204, 'M'], [212, 'F'], [220, 'M'], [228, 'F'], [236, 'M'], [244, 'F'], [252, 'M'], [280, 'G'], [288, 'M'], [296, 'F'], [304, 'M'], [312, 'F'], [320, 'M'], [328, 'F'], [336, 'M'], [344, 'F'], [354, 'G']].forEach(function (c) { CRL.push({ x: c[0], t: c[1], s: 0.95 + r() * 0.2, ph: r() * TAU }); });
  CRR = []; k = 0;
  for (x = FX + 20; x < W - 6; x += 13) { if (outcropH(x) > 0.2 || Math.abs(x - 836) < 34) continue; CRR.push({ x: x, t: k % 2 ? 'F' : 'M', s: 0.9 + r() * 0.2, ph: r() * TAU }); k++; }
  herbsFg.forEach(function (h) { if (h.x >= FX) hR.push(h); else if (inAlley(h.x)) hLa.push(h); else hLs.push(h); });
  litFg.forEach(function (f) { if (f.x >= FX) litR.push(f); else litL.push(f); });
}

/* ---------- etapas: seleção, estado e partículas ---------- */
function agSnap() {
  if (!reduce) return;
  var s = AGS[am], k;
  for (k in agS) agS[k] = s.a[k];
  for (k in trS) trS[k] = s.b[k];
  cA = s.CA.slice(); cB = s.CB.slice(); landA = s.land; rainL = s.rain; phase = phT; aha = 1;
  for (k = 0; k < 6; k++) pplA[k] = k === am ? 1 : 0;
}
function agSelect(i, user) {
  if (user) aTouring = false;
  am = i; aTour = 0; phT = AGS[i].ph; aha = 0;
  var s = AGS[i];
  stTit.textContent = (i + 1) + '. ' + s.tit;
  if (s.both) { stBoth.textContent = s.both; stBoth.hidden = false; stCols.hidden = true; }
  else { stA.textContent = s.txtA; stB.textContent = s.txtB; stBoth.hidden = true; stCols.hidden = false; }
  agSnap();
}
stTit = $id('stTit'); stBoth = $id('stBoth'); stCols = $id('stCols'); stA = $id('stA'); stB = $id('stB');
/* texto da etapa aberta, que a página lê para o leitor de tela */
function textoAg() {
  var s = AGS[am];
  return (am + 1) + '. ' + s.tit + '. ' + (s.both || 'Agroecológico: ' + s.txtA + ' Tradicional exploratório: ' + s.txtB);
}
function agUpdate(dt) {
  if (!FLR) buildAg();
  T += dt; aclk += dt; aha = Math.min(1, aha + dt * 3);
  var dph = ((phT - phase + 0.5) % 1 + 1) % 1 - 0.5; phase = (phase + dph * Math.min(1, dt * 2.2) + 1) % 1;
  var s = AGS[am], f = Math.min(1, dt * 1.6), k, i, p;
  for (k in agS) agS[k] += (s.a[k] - agS[k]) * f;
  for (k in trS) trS[k] += (s.b[k] - trS[k]) * (k === 'fire' ? Math.min(1, dt * 1.2) : f);
  for (k = 0; k < 6; k++) {
    cA[k] += (s.CA[k] - cA[k]) * Math.min(1, dt * 2); cB[k] += (s.CB[k] - cB[k]) * Math.min(1, dt * 2);
    pplA[k] += ((k === am ? 1 : 0) - pplA[k]) * Math.min(1, dt * 2.4);
  }
  landA += (s.land - landA) * f;
  rainL += (s.rain - rainL) * Math.min(1, dt * 1.5);
  /* fumaça e CO2 da queima; fumaça da área nova ao fundo; cinza levada pelo vento */
  var fg = Math.max(0, trS.fire - 0.1) / 0.9; accSm += fg * 14 * dt; accC += fg * 24 * dt; accB += trS.newF * 11 * dt; accA += trS.ash * 30 * dt;
  while (accSm >= 1) { accSm -= 1; var fl = FLR[(Math.random() * FLR.length) | 0]; if (smk.length < 120) smk.push({ x: fl.x, y: groundY(fl.x) - 14, vx: 6 + Math.random() * 8, vy: -(22 + Math.random() * 16), r: 5, a: 0.36 }); }
  while (accC >= 1) { accC -= 1; var fx = FLR[(Math.random() * FLR.length) | 0].x; if (co2p.length < 140) co2p.push({ x: fx, y: groundY(fx) - 16, vy: -(60 + Math.random() * 30), u: 0, v: 0.45 + Math.random() * 0.2, ph: Math.random() * TAU, tag: Math.random() < 0.08 }); }
  while (accB >= 1) { accB -= 1; var bx = 610 + Math.random() * 100; if (bgSm.length < 90) bgSm.push({ x: bx, y: midY(bx) - 4, vx: 5 + Math.random() * 6, vy: -(12 + Math.random() * 9), r: 4, a: 0.46 }); }
  while (accA >= 1) { accA -= 1; var ax = FX + 12 + Math.random() * (W - FX - 20); if (outcropH(ax) > 0.5) continue; if (ashP.length < 120) ashP.push({ x: ax, y: groundY(ax) - 1, vx: 40 + Math.random() * 40, vy: -(6 + Math.random() * 12), l: 0, L: 1.6 + Math.random() * 1.4, ph: Math.random() * TAU }); }
  for (i = smk.length - 1; i >= 0; i--) { p = smk[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 14 * dt; p.a -= (0.09 + 0.5 * (1 - trS.fire)) * dt; if (p.a <= 0) smk.splice(i, 1); }
  for (i = co2p.length - 1; i >= 0; i--) { p = co2p[i]; p.u += p.v * dt; p.y += p.vy * dt; if (p.u >= 1) co2p.splice(i, 1); }
  for (i = bgSm.length - 1; i >= 0; i--) { p = bgSm[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 7 * dt; p.a -= (0.07 + 0.4 * (1 - trS.newF)) * dt; if (p.a <= 0) bgSm.splice(i, 1); }
  for (i = ashP.length - 1; i >= 0; i--) { p = ashP[i]; p.l += dt; p.x += p.vx * dt; p.y += p.vy * dt + Math.sin(T * 5 + p.ph) * 0.3; p.vy += 4 * dt; if (p.l > p.L || p.x > W + 10) ashP.splice(i, 1); }
  if (aTouring) { aTour += dt; if (aTour > 12) agSelect((am + 1) % AGS.length, false); }
}

/* ---------- solo: chão queimado, crosta, camada de cima mais pobre, divisória, infiltração e enxurrada ---------- */
function clipRight() { ctx.save(); ctx.beginPath(); ctx.rect(FX, -20, W - FX + 120, H + 40); ctx.clip(); }
function surfLine(dy) { ctx.beginPath(); for (var i = 0; i < GX.length; i++) { if (i) ctx.lineTo(GX[i], GY[i] + dy); else ctx.moveTo(GX[i], GY[i] + dy); } }
function drawSoilAg() {
  var i, n = GX.length;
  if (trS.poor > 0.01) { clipRight(); ctx.fillStyle = 'rgba(226,184,140,' + (0.28 * trS.poor) + ')'; band(GY, GA); ctx.fill(); ctx.restore(); }
  if (trS.char > 0.01) {
    clipRight();
    ctx.fillStyle = 'rgba(30,22,16,' + (0.78 * trS.char) + ')'; ctx.beginPath();
    for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], GY[i] - 0.5); else ctx.moveTo(GX[i], GY[i] - 0.5); }
    for (i = n - 1; i >= 0; i--) ctx.lineTo(GX[i], GY[i] + 3 + 3 * trS.char);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(214,208,200,' + (0.7 * trS.char) + ')'; ctx.beginPath();
    for (i = 0; i < SLR.length; i++) { var ax = SLR[i].x + 4; ctx.moveTo(ax + 1.6, groundY(ax) - 1); ctx.arc(ax, groundY(ax) - 1, 1.6, 0, TAU); }
    ctx.fill(); ctx.restore();
  }
  if (trS.ero > 0.01) {
    var bg = rgb(mix([170, 146, 112], [140, 118, 88], clamp(st.S)));
    clipRight(); ctx.fillStyle = bg; ctx.beginPath();
    for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], GY[i] - 1.5); else ctx.moveTo(GX[i], GY[i] - 1.5); }
    for (i = n - 1; i >= 0; i--) ctx.lineTo(GX[i], GY[i] + trS.ero * lowerR(GX[i]));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,64,40,' + (0.7 * trS.ero) + ')'; ctx.lineWidth = 1;
    RIL.forEach(function (g) { for (var k = -1; k <= 1; k += 2) { ctx.beginPath(); ctx.moveTo(g[0] + k * g[1], groundY(g[0] + k * g[1])); ctx.lineTo(g[0] + k * g[1] * 0.25, surfR(g[0]) - 2); ctx.stroke(); } });
    ctx.strokeStyle = 'rgba(52,30,20,0.85)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (i = 0; i < n; i++) { if (i) ctx.lineTo(GX[i], GY[i] + trS.ero * lowerR(GX[i])); else ctx.moveTo(GX[i], GY[i] + trS.ero * lowerR(GX[i])); }
    ctx.stroke(); ctx.restore();
  }
  if (trS.bare > 0.01) {
    clipRight(); ctx.strokeStyle = 'rgba(222,176,124,' + (0.85 * trS.bare) + ')'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (i = 0; i < n; i++) { var cy = GY[i] + trS.ero * lowerR(GX[i]) + 1.2; if (i) ctx.lineTo(GX[i], cy); else ctx.moveTo(GX[i], cy); }
    ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.strokeStyle = 'rgba(255,248,236,0.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(FX, groundY(FX) + 4); ctx.lineTo(FX, H); ctx.stroke(); ctx.restore();
}
function drawInfil() {
  var a = clamp(rainL * 1.6); if (a < 0.03) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  function arrow(x, depth, al) {
    var y0 = (x > FX ? surfR(x) : groundY(x)) + 3, cyc = (aclk * 0.8 + x * 0.0137) % 1, y = y0 + 9 + cyc * depth, ah = al * (1 - 0.6 * cyc);
    ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y); ctx.moveTo(x - 3.4, y - 3.8); ctx.lineTo(x, y); ctx.lineTo(x + 3.4, y - 3.8);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * ah) + ')'; ctx.lineWidth = 4.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(36,124,212,' + ah + ')'; ctx.lineWidth = 2; ctx.stroke();
  }
  INFL.forEach(function (x) { if (outcropH(x) < 0.3) arrow(x, soilD(x) * 0.6, a); });
  INFR.forEach(function (x) { if (outcropH(x) < 0.3) arrow(x, soilD(x) * 0.18, a * (1 - 0.4 * trS.bare)); });
  ctx.restore();
}
function drawRunoffR() {
  var a = trS.bare * clamp(rainL * 2); if (a < 0.03) return;
  clipRight();
  var i, mud = rgb(mix([96, 170, 232], [196, 150, 100], trS.ero), 0.95 * a);
  ctx.strokeStyle = 'rgba(150,110,70,' + (0.5 * a) + ')'; ctx.lineWidth = 2.2 + 1.2 * trS.ero; ctx.beginPath();
  for (i = 0; i < GX.length; i++) { var sy = GY[i] + trS.ero * lowerR(GX[i]) - 1.2; if (i) ctx.lineTo(GX[i], sy); else ctx.moveTo(GX[i], sy); }
  ctx.stroke();
  ctx.strokeStyle = mud; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath();
  for (i = 0; i < 26; i++) { var xx = FX + 8 + ((i * 19 + aclk * 34) % (W - FX + 10)); if (outcropH(xx) > 0.5 || xx > W) continue; ctx.moveTo(xx, surfR(xx) - 1.5); ctx.lineTo(xx + 10, surfR(xx + 10) - 1.5); }
  ctx.stroke(); ctx.restore();
}

/* ---------- cobertura morta, galhos no chão, tocos ---------- */
var MULC = [[214, 184, 120], [160, 120, 70], [240, 220, 168]];
function drawMulch() {
  var a = agS.mulch, x, y, on = false, i, c, m; if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(190,152,94,0.95)'; ctx.lineWidth = 4; ctx.beginPath();
  for (x = 150; x <= 362; x += 4) { if (outcropH(x) > 0.3) { on = false; continue; } y = groundY(x) - 1.4; if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y); }
  ctx.stroke();
  for (c = 0; c < 3; c++) {
    ctx.strokeStyle = rgb(MULC[c]); ctx.lineWidth = c === 1 ? 2.4 : 2; ctx.beginPath();
    for (i = 0; i < MUL.length; i++) { m = MUL[i]; if (m.c !== c) continue; var dx = Math.cos(m.a) * m.l, dy = Math.sin(m.a) * m.l * 0.35; ctx.moveTo(m.x - dx, m.y - 2.4 - dy); ctx.lineTo(m.x + dx, m.y - 2.4 + dy); }
    ctx.stroke();
  }
  ctx.restore();
}
function drawSlashR() {
  var a = trS.cut * (1 - trS.char); if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#6e6450'; ctx.lineCap = 'round';
  SLR.forEach(function (s) {
    var y = groundY(s.x) - 1.5, dx = Math.cos(s.a) * s.l / 2, dy = Math.sin(s.a) * s.l / 2;
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(s.x - dx, y - dy); ctx.lineTo(s.x + dx, y + dy);
    if (s.b) { ctx.moveTo(s.x + dx * 0.3, y + dy * 0.3); ctx.lineTo(s.x + dx * 0.3 + 5, y - 5); }
    ctx.stroke();
  });
  ctx.restore();
}
function stump(s, ch) {
  var x = s.x, y = groundY(x), w = s.w, h = s.h;
  if (x > FX && trS.ero > 0.02) {
    var ny = surfR(x);
    if (ny > y + 1) {
      ctx.fillStyle = 'rgb(112,66,48)'; ctx.beginPath(); ctx.moveTo(x - w * 0.9, y); ctx.lineTo(x + w * 0.9, y); ctx.lineTo(x + w * 1.4, ny); ctx.lineTo(x - w * 1.4, ny); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(40,22,14,0.7)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - w * 0.6, y + 1); ctx.quadraticCurveTo(x - w * 1.4, (y + ny) / 2, x - w * 2, ny + 1); ctx.moveTo(x + w * 0.6, y + 1); ctx.quadraticCurveTo(x + w * 1.5, (y + ny) / 2, x + w * 2.1, ny + 1); ctx.stroke();
      ctx.strokeStyle = '#ead8b4'; ctx.lineWidth = 1.1; ctx.stroke();
    }
  }
  var body = s.cac ? mix([96, 128, 88], [36, 30, 24], ch) : mix([122, 100, 76], [36, 30, 24], ch), top = s.cac ? mix([168, 196, 150], [50, 42, 34], ch) : mix([222, 198, 158], [60, 50, 40], ch);
  ctx.fillStyle = rgb(body); ctx.strokeStyle = 'rgba(30,20,14,0.85)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - w * 0.95, y + 1); ctx.lineTo(x - w * 0.55, y - h); ctx.lineTo(x + w * 0.55, y - h + 1.5); ctx.lineTo(x + w * 0.95, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgb(top); ctx.beginPath(); ctx.ellipse(x, y - h + 0.7, w * 0.55, 2.2, 0.06, 0, TAU); ctx.fill(); ctx.stroke();
}
function drawStumpsAg() {
  ctx.save(); ctx.lineJoin = 'round';
  if (trS.cut > 0.02) { ctx.globalAlpha = trS.cut; var ch = Math.min(0.75, 0.75 * trS.char + 0.35 * trS.aband); STR.forEach(function (s) { stump(s, ch); }); }
  if (agS.thin > 0.02) { ctx.globalAlpha = agS.thin; STL.forEach(function (s) { stump(s, 0.15); }); }
  ctx.restore();
}

/* ---------- vegetação com corte por lado ---------- */
function vegDraw(p, bark) {
  var a = vegA(p.x); if (a < 0.01) return;
  if (a > 0.99) { drawPlant(p, bark, false); return; }
  ctx.save(); ctx.globalAlpha = a; drawPlant(p, bark, false); ctx.restore();
}
function drawSpeciesAg() {
  for (var i = 0; i < SP.length; i++) {
    var sp = SP[i], a = sp.x < FX ? 1 : 1 - trS.cut; if (a < 0.01) continue;
    ctx.save(); ctx.globalAlpha = a;
    if (sp.kind === 'tree') drawTreeSp(sp); else if (sp.kind === 'cactus1') drawMandacaru(sp); else drawFacheiro(sp);
    ctx.restore();
  }
}
function drawSuccAg(sc) {
  var i, k, x, y, len, a, n = 11, al, pass, l;
  for (i = 0; i < succ.length; i++) {
    x = succ[i][0]; al = vegA(x); if (al < 0.01) continue;
    y = groundY(x) + 1; len = succ[i][1] * sc;
    ctx.save(); ctx.globalAlpha = al;
    for (pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? '#5a7b5c' : '#6d8b69'; ctx.beginPath();
      for (k = pass; k < n; k += 2) {
        a = -Math.PI / 2 + (k / (n - 1) - 0.5) * 2.5; l = len * (0.8 + 0.2 * Math.sin(k * 2.1));
        var tx = x + Math.cos(a) * l, ty = y + Math.sin(a) * l, mx = x + Math.cos(a) * l * 0.5, my = y + Math.sin(a) * l * 0.5;
        ctx.moveTo(x - 2, y); ctx.quadraticCurveTo(mx - 2.5, my, tx, ty); ctx.quadraticCurveTo(mx + 2.5, my, x + 2, y);
      }
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- lavouras: milho, feijão, guandu e palma ---------- */
function drawMilho(x, y, g, s, ph) {
  var h = 38 * s * g; if (h < 3) return;
  var sw = Math.sin(T * 1.5 + ph) * 1.6 * g, k;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#4f8a34'; ctx.lineWidth = 2.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.3, y - h * 0.5, x + sw, y - h); ctx.stroke();
  ctx.strokeStyle = '#64a243'; ctx.lineWidth = 2.2;
  for (k = 0; k < 5; k++) {
    var f = 0.18 + k * 0.16, ly = y - h * f, lx = x + sw * f, sd = k % 2 ? 1 : -1, L = (14 - k * 1.6) * s * Math.min(1, g * 1.3);
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + sd * L * 0.55, ly - L * 0.55, lx + sd * L, ly + L * 0.08); ctx.stroke();
  }
  if (g > 0.75) {
    ctx.fillStyle = '#b9cf72'; ctx.strokeStyle = 'rgba(60,70,30,0.6)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(x + sw * 0.5 + 2.6, y - h * 0.5, 2.1, 4.6, 0.35, 0, TAU); ctx.fill(); ctx.stroke();
  }
  if (g > 0.85) {
    ctx.strokeStyle = '#cdb46a'; ctx.lineWidth = 1.1; ctx.beginPath();
    for (k = -1; k <= 1; k++) { ctx.moveTo(x + sw, y - h); ctx.lineTo(x + sw + k * 3.2, y - h - 5 + Math.abs(k) * 1.5); }
    ctx.stroke();
  }
}
function drawStubble(x, y, s) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6f5328'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.6, y - 14 * s); ctx.stroke();
  ctx.strokeStyle = '#e4d29a'; ctx.lineWidth = 1.8; ctx.beginPath();
  ctx.moveTo(x, y - 7 * s); ctx.quadraticCurveTo(x + 5, y - 9 * s, x + 9, y - 2); ctx.moveTo(x, y - 11 * s); ctx.quadraticCurveTo(x - 5, y - 13 * s, x - 8, y - 4); ctx.stroke();
}
function drawFeijao(x, y, g, s, ph) {
  var h = 13 * s * g; if (h < 2) return;
  var sw = Math.sin(T * 1.3 + ph) * 0.8, k, j, pass;
  ctx.strokeStyle = '#4c7f34'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath();
  for (k = -1; k <= 1; k++) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + k * 3, y - h * 0.6, x + k * 6 * s * g + sw, y - h); }
  ctx.stroke();
  for (pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? '#4d8838' : '#5f9a45'; ctx.beginPath();
    for (k = -1; k <= 1; k++) {
      var lx = x + k * 6 * s * g + sw, ly = y - h + pass * 4;
      for (j = 0; j < 3; j++) { var a = j * 2.1 + k + ph, bx = lx + Math.cos(a) * 3.2 * g, by = ly + Math.sin(a) * 2.2 * g, rr = 2.6 * s * g; ctx.moveTo(bx + rr, by); ctx.arc(bx, by, rr, 0, TAU); }
    }
    ctx.fill();
  }
  if (g > 0.8) { ctx.strokeStyle = '#8fae58'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 3, y - h * 0.5); ctx.lineTo(x + 6, y - h * 0.15); ctx.moveTo(x - 2, y - h * 0.55); ctx.lineTo(x - 5, y - h * 0.2); ctx.stroke(); }
}
function drawGuandu(x, y, g, s, ph) {
  var h = 30 * s * g; if (h < 3) return;
  var sw = Math.sin(T * 1.2 + ph) * 1.2, k;
  ctx.strokeStyle = '#6d6a3e'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sw, y - h);
  for (k = 0; k < 3; k++) { var f = 0.4 + k * 0.2, bx = x + sw * f, by = y - h * f, sd = k % 2 ? 1 : -1; ctx.moveTo(bx, by); ctx.lineTo(bx + sd * 8 * s * g, by - 6 * s * g); }
  ctx.stroke();
  ctx.fillStyle = '#5c8f45'; ctx.beginPath();
  for (k = 0; k < 10; k++) { var a = k * 2.4 + ph, rr = (0.3 + 0.07 * ((k * 37) % 10)) * 9 * s * g, lx = x + sw + Math.cos(a) * rr, ly = y - h * 0.72 + Math.sin(a) * rr * 0.6; ctx.moveTo(lx + 3.2 * g, ly); ctx.ellipse(lx, ly, 3.2 * g, 1.9 * g, a, 0, TAU); }
  ctx.fill();
  if (g > 0.8) { ctx.fillStyle = '#e6c446'; ctx.beginPath(); for (k = 0; k < 5; k++) { var a2 = k * 1.9 + ph, fx = x + sw + Math.cos(a2) * 7 * s, fy = y - h * 0.82 + Math.sin(a2) * 4; ctx.moveTo(fx + 1.4, fy); ctx.arc(fx, fy, 1.4, 0, TAU); } ctx.fill(); }
}
var PADS = [[0, -9, 5.5, 9, 0], [-6, -23, 5, 8, -0.45], [6, -24, 5, 8.4, 0.4], [-1, -35, 4.4, 7.4, -0.1], [11, -35, 4, 6.8, 0.6]];
function drawPalma(x, y, a, sc) {
  if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = '#7aa36a'; ctx.strokeStyle = '#4e7546'; ctx.lineWidth = 1 / sc;
  PADS.forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0], p[1], p[2], p[3], p[4], 0, TAU); ctx.fill(); ctx.stroke(); });
  ctx.fillStyle = 'rgba(236,240,210,0.85)'; ctx.beginPath();
  PADS.forEach(function (p) { for (var k = 0; k < 4; k++) { var ax = p[0] + ((k % 2) - 0.5) * p[2] * 0.8, ay = p[1] + (Math.floor(k / 2) - 0.5) * p[3] * 0.8; ctx.moveTo(ax + 0.9, ay); ctx.arc(ax, ay, 0.9, 0, TAU); } });
  ctx.fill(); ctx.restore();
}
function drawCrops() {
  var i, c, y, g, gl = agS.crop, sl = agS.stub, gr = trS.crop, st2 = trS.stub;
  ctx.save();
  for (i = 0; i < PAL.length; i++) drawPalma(PAL[i], groundY(PAL[i]) + 1, clamp(gl + sl) * agS.thin, 0.78);
  for (i = 0; i < CRL.length; i++) {
    c = CRL[i]; y = groundY(c.x) + 1;
    if (c.t === 'G') { g = Math.max(gl, 0.65 * sl); if (g > 0.02) drawGuandu(c.x, y, g, c.s, c.ph); continue; }
    if (gl > 0.02) { if (c.t === 'M') drawMilho(c.x, y, gl, c.s, c.ph); else drawFeijao(c.x, y, gl, c.s, c.ph); }
    if (sl > 0.02 && c.t === 'M') { ctx.globalAlpha = sl; drawStubble(c.x, y, c.s); ctx.globalAlpha = 1; }
  }
  for (i = 0; i < CRR.length; i++) {
    c = CRR[i]; y = groundY(c.x) + 1;
    if (gr > 0.02) { if (c.t === 'M') drawMilho(c.x, y, gr, c.s, c.ph); else drawFeijao(c.x, y, gr, c.s, c.ph); }
    if (st2 > 0.02 && c.t === 'M') { ctx.globalAlpha = st2; drawStubble(c.x, y, c.s); ctx.globalAlpha = 1; }
  }
  ctx.restore();
}

/* ---------- abelhas, agricultores e cerca ---------- */
function drawBees() {
  var a = agS.bees; if (a < 0.02) return;
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
  BOX.forEach(function (x, n) {
    var y = groundY(x) + 1, k;
    ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 5, y - 7); ctx.moveTo(x + 5, y); ctx.lineTo(x + 5, y - 7); ctx.stroke();
    ctx.fillStyle = '#c9a56b'; ctx.lineWidth = 1; rrect(x - 8, y - 17, 16, 10, 1.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a6a42'; ctx.fillRect(x - 9, y - 19.5, 18, 2.8); ctx.strokeRect(x - 9, y - 19.5, 18, 2.8);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 2, y - 9.5, 4, 1.6);
    ctx.fillStyle = '#d2a52a'; ctx.strokeStyle = 'rgba(40,30,10,0.8)'; ctx.lineWidth = 0.7;
    for (k = 0; k < 6; k++) { var t = T * (1.4 + k * 0.23) + k * 1.7 + n, rr = 9 + (k % 3) * 5, bx = x + Math.cos(t) * rr * 1.3, by = y - 22 + Math.sin(t * 1.3) * rr * 0.55; ctx.beginPath(); ctx.arc(bx, by, 1.4, 0, TAU); ctx.fill(); ctx.stroke(); }
  });
  ctx.restore();
}
function limb(x0, y0, x1, y1, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
function basket(x, y, items) {
  ctx.fillStyle = '#c9a25e'; ctx.strokeStyle = '#6e5230'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(x - 6, y - 5); ctx.lineTo(x + 6, y - 5); ctx.lineTo(x + 4.5, y + 2); ctx.lineTo(x - 4.5, y + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5.2, y - 2); ctx.lineTo(x + 5.2, y - 2); ctx.stroke();
  if (items === 'umbu') { ctx.fillStyle = '#c8c25a'; ctx.beginPath(); [[-3, -6], [0, -7], [3, -6], [-1.5, -8.5], [1.8, -8.6]].forEach(function (q) { ctx.moveTo(x + q[0] + 2, y + q[1]); ctx.arc(x + q[0], y + q[1], 2, 0, TAU); }); ctx.fill(); }
  else if (items === 'mix') {
    ctx.fillStyle = '#c8c25a'; ctx.beginPath(); [[-3.4, -6.2], [-0.6, -7.2]].forEach(function (q) { ctx.moveTo(x + q[0] + 2, y + q[1]); ctx.arc(x + q[0], y + q[1], 2, 0, TAU); }); ctx.fill();
    ctx.fillStyle = '#e2bf4a'; ctx.beginPath(); ctx.ellipse(x + 2.6, y - 8, 1.8, 4, 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); [[-1.6, -5.4], [0.6, -5.2], [1.2, -6.4]].forEach(function (q) { ctx.moveTo(x + q[0] + 1, y + q[1]); ctx.arc(x + q[0], y + q[1], 1, 0, TAU); }); ctx.fill();
  } else if (items === 'palma') {
    ctx.fillStyle = '#7aa36a'; ctx.strokeStyle = '#4e7546';
    [[-2.5, -8, -0.4], [2.5, -8.5, 0.35]].forEach(function (q) { ctx.beginPath(); ctx.ellipse(x + q[0], y + q[1], 2.8, 4.6, q[2], 0, TAU); ctx.fill(); ctx.stroke(); });
  }
}
function drawPerson(o, al) {
  var c = WHO[o.who], y = groundY(o.x) + 1, tilt = 0, sw = Math.sin(T * 2.6 + o.x * 0.1), bend = o.pose === 'bend';
  if (o.pose === 'hoe') tilt = 0.28; else if (bend) tilt = 1.15; else if (o.pose === 'carry') tilt = 0.06; else if (o.pose === 'reach') tilt = -0.06;
  ctx.save(); ctx.globalAlpha = al; ctx.translate(o.x, y); ctx.scale(o.dir * 1.02, 1.02); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* pernas e pés */
  limb(-1.6, -15, -3.2, -0.8, c.pants, 3.8); limb(1.6, -15, bend ? 6.5 : 3.4, -0.8, c.pants, 3.8);
  limb(-3.8, -0.6, -1, -0.6, '#2b2622', 2.6); limb(bend ? 6.2 : 3, -0.6, bend ? 9 : 5.8, -0.6, '#2b2622', 2.6);
  ctx.translate(0, -15); ctx.rotate(tilt);
  /* mãos: [trás, frente] no referencial do tronco */
  var hb = [-1, -1], hf = [3, 0];
  if (o.pose === 'hoe') { var be = 0.9 + 0.25 * sw, hx0 = 2, hy0 = -13, ex = hx0 + 30 * Math.cos(be), ey = hy0 + 30 * Math.sin(be); hb = [hx0 + (ex - hx0) * 0.22, hy0 + (ey - hy0) * 0.22]; hf = [hx0 + (ex - hx0) * 0.45, hy0 + (ey - hy0) * 0.45]; }
  else if (bend) { hb = [9, -6]; hf = [12.5, -3.5 + sw * 0.8]; }
  else if (o.pose === 'carry') { hb = [6.5, -8]; hf = [8, -6.5]; }
  else if (o.pose === 'reach') { hb = [2, -1]; hf = [5, -27]; }
  else if (o.pose === 'basket') { hb = [-1, -1]; hf = [7, -4]; }
  else if (o.pose === 'rest') { hb = [-1, -1]; hf = [6.5, -8]; }
  var shd = mix(hexRgb(c.shirt), [20, 24, 30], 0.3);
  limb(0.6, -11, hb[0], hb[1], rgb(shd), 2.8);
  ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(hb[0], hb[1], 1.5, 0, TAU); ctx.fill();
  /* tronco, pescoço, cabeça e chapéu */
  ctx.fillStyle = c.shirt; rrect(-4.4, -13, 8.8, 13, 3); ctx.fill();
  ctx.fillStyle = c.pants; ctx.fillRect(-4.2, -1.6, 8.4, 1.8);
  ctx.fillStyle = c.skin; ctx.fillRect(-0.4, -14.6, 2.8, 2);
  ctx.beginPath(); ctx.arc(1, -17.4, 3.7, 0, TAU); ctx.fill();
  ctx.fillStyle = c.hat; ctx.beginPath(); ctx.ellipse(1, -19.8, 6.8, 1.6, 0, 0, TAU); ctx.fill();
  rrect(-2.2, -24.4, 6.4, 4.8, 2); ctx.fill();
  ctx.strokeStyle = c.band; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2.1, -20.6); ctx.lineTo(4.1, -20.6); ctx.stroke();
  /* ferramentas e objetos */
  if (o.pose === 'hoe') {
    var be2 = 0.9 + 0.25 * sw, x1 = 2 + 30 * Math.cos(be2), y1 = -13 + 30 * Math.sin(be2);
    limb(2, -13, x1, y1, '#8a6a42', 1.8);
    ctx.save(); ctx.translate(x1, y1); ctx.rotate(be2); ctx.fillStyle = '#6d7276'; ctx.fillRect(-1.2, -1, 2.4, 6.5); ctx.restore();
  } else if (o.pose === 'rest') {
    limb(7.5, 15, 7, -22, '#8a6a42', 1.8); ctx.fillStyle = '#6d7276'; ctx.fillRect(7.2, 12.6, 6, 2.4);
  }
  if (o.prop === 'galhos') { ctx.strokeStyle = '#7a5e3c'; ctx.lineWidth = 1.5; ctx.beginPath(); for (var k = 0; k < 4; k++) { ctx.moveTo(hf[0] - 9, hf[1] - 2 + k * 1.3); ctx.lineTo(hf[0] + 9, hf[1] - 4 + k * 1.6); } ctx.stroke(); }
  else if (o.prop === 'palma') basket(hf[0] + 1, hf[1] + 1, 'palma');
  else if (o.prop === 'cesto') basket(o.pose === 'reach' ? hb[0] + 1 : hf[0] + 1, o.pose === 'reach' ? hb[1] + 4 : hf[1] + 2, o.pose === 'reach' ? 'umbu' : 'mix');
  /* braço da frente por cima */
  limb(1.4, -11, hf[0], hf[1], c.shirt, 2.8);
  ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(hf[0], hf[1], 1.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function drawPeople() {
  for (var s = 0; s < PPL.length; s++) {
    if (pplA[s] < 0.01) continue;
    for (var i = 0; i < PPL[s].length; i++) drawPerson(PPL[s][i], pplA[s]);
  }
}
function drawFence() {
  var g0 = groundY(FX) + 1, P = [[0, 0, 1], [9, -6, 0.84], [17, -11, 0.7], [24, -15.4, 0.58], [30, -19.2, 0.48]], k, j, hg = 46;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(52,54,60,0.9)'; ctx.lineWidth = 1.2;
  for (j = 0; j < 3; j++) { ctx.beginPath(); for (k = 0; k < P.length; k++) { var px = FX + P[k][0], py = g0 + P[k][1] - hg * P[k][2] * (0.3 + j * 0.3); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); }
  for (k = P.length - 1; k >= 0; k--) {
    var s = P[k][2], qx = FX + P[k][0], qy = g0 + P[k][1], w = 6.5 * s, h = hg * s;
    ctx.fillStyle = rgb(mix([96, 70, 44], [160, 150, 134], 1 - s)); ctx.strokeStyle = 'rgba(40,28,18,' + (0.5 + 0.4 * s) + ')'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(qx - w / 2, qy); ctx.lineTo(qx - w / 2, qy - h + w * 0.3); ctx.lineTo(qx, qy - h - w * 0.2); ctx.lineTo(qx + w / 2, qy - h + w * 0.3); ctx.lineTo(qx + w / 2, qy); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- fogo, fumaça, CO2 e cinza (lado direito) ---------- */
function drawFireR() {
  var fa = trS.fire;
  if (fa > 0.01) {
    clipRight(); ctx.strokeStyle = 'rgba(255,120,40,' + (0.55 * fa) + ')'; ctx.lineWidth = 3; surfLine(-1); ctx.stroke(); ctx.restore();
    ctx.save();
    FLR.forEach(function (f) {
      var y = groundY(f.x), h = f.h * fa * (0.75 + 0.25 * Math.sin(T * 11 + f.ph)), sw = Math.sin(T * 7 + f.ph) * 3;
      ctx.fillStyle = 'rgba(232,108,36,0.92)'; ctx.beginPath(); ctx.moveTo(f.x - 6, y); ctx.quadraticCurveTo(f.x - 6, y - h * 0.55, f.x + sw, y - h); ctx.quadraticCurveTo(f.x + 6, y - h * 0.55, f.x + 6, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(248,200,80,0.95)'; ctx.beginPath(); ctx.moveTo(f.x - 3, y); ctx.quadraticCurveTo(f.x - 3, y - h * 0.35, f.x + sw * 0.6, y - h * 0.6); ctx.quadraticCurveTo(f.x + 3, y - h * 0.35, f.x + 3, y); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  if (smk.length) { ctx.save(); smk.forEach(function (s) { ctx.fillStyle = 'rgba(112,106,100,' + Math.max(0, s.a) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }); ctx.restore(); }
  if (reduce && fa > 0.5) {
    ctx.save(); ctx.fillStyle = 'rgba(112,106,100,0.22)';
    for (var k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(560 + k * 44, 300 - (k % 3) * 26, 14 + (k % 4) * 5, 0, TAU); ctx.fill(); }
    var fs0 = Math.max(10, 7.5 * W / cssW);
    for (k = 0; k < 10; k++) {
      var cx = 520 + k * 42, cy = 250 + ((k * 37) % 5) * 14;
      ctx.fillStyle = CO2OUT; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 3.7, 0, TAU); ctx.fill(); ctx.stroke();
      if (k % 4 === 1) txt('CO₂', cx + 7, cy + fs0 * 0.35, { c: CO2OUT, halo: 'rgba(255,255,255,0.85)', sz: fs0, w: 700 });
    }
    ctx.restore();
  }
  if (co2p.length) {
    var fs = Math.max(10, 7.5 * W / cssW);
    ctx.save(); ctx.lineCap = 'round';
    co2p.forEach(function (c) {
      var a = smooth(0, 0.12, c.u) * (1 - smooth(0.6, 1, c.u)), x = c.x + Math.sin(T * 2 + c.ph) * 3;
      if (a < 0.03) return;
      ctx.globalAlpha = a * 0.55; ctx.strokeStyle = CO2OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, c.y + 11); ctx.lineTo(x, c.y); ctx.stroke();
      ctx.globalAlpha = a; ctx.fillStyle = CO2OUT; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, c.y, 3.7, 0, TAU); ctx.fill(); ctx.stroke();
      if (c.tag) txt('CO₂', x + 7, c.y + fs * 0.35, { c: CO2OUT, halo: 'rgba(255,255,255,0.85)', sz: fs, w: 700 });
    });
    ctx.restore();
  }
}
function drawAsh() {
  var i;
  if (trS.ash > 0.05) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * trS.ash) + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    for (i = 0; i < 9; i++) { var wx = FX + 10 + ((i * 61 + aclk * 130) % (W - FX)), wy = groundY(Math.min(W, wx)) - 14 - (i % 3) * 11; ctx.moveTo(wx, wy); ctx.lineTo(wx + 26, wy - 1.5); }
    ctx.stroke(); ctx.restore();
  }
  if (ashP.length) {
    ctx.save(); ctx.lineCap = 'round';
    for (i = 0; i < ashP.length; i++) {
      var p = ashP[i], al = 0.9 * (1 - p.l / p.L);
      ctx.globalAlpha = al * 0.55; ctx.strokeStyle = 'rgb(96,94,92)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.1, p.y - p.vy * 0.1); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.globalAlpha = al; ctx.fillStyle = 'rgb(74,72,70)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  } else if (reduce && trS.ash > 0.5) {
    ctx.save(); ctx.fillStyle = 'rgba(138,134,126,0.7)';
    for (i = 0; i < 40; i++) { var x = FX + 20 + ((i * 53) % (W - FX - 30)), y = groundY(x) - 4 - (i % 5) * 4; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}
/* área nova aberta ao fundo, à direita (o roçado muda de lugar) */
function drawNewArea() {
  if (!FLR) buildAg();
  var x;
  if (trS.newA > 0.01) {
    ctx.fillStyle = 'rgba(178,136,94,' + (0.8 * trS.newA) + ')'; ctx.beginPath();
    for (x = 576; x <= 744; x += 6) { if (x === 576) ctx.moveTo(x, midY(x) - 2); else ctx.lineTo(x, midY(x) - 2); }
    for (x = 744; x >= 576; x -= 6) ctx.lineTo(x, midY(x) + 12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(70,52,36,' + (0.7 * trS.newA) + ')'; ctx.lineWidth = 2; ctx.beginPath();
    for (x = 590; x < 740; x += 17) { ctx.moveTo(x, midY(x) + 1); ctx.lineTo(x, midY(x) - 3); }
    ctx.stroke();
  }
  if (trS.newF > 0.05) {
    ctx.strokeStyle = 'rgba(255,128,48,' + (0.6 * trS.newF) + ')'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (x = 592; x <= 730; x += 6) { if (x === 592) ctx.moveTo(x, midY(x) - 1); else ctx.lineTo(x, midY(x) - 1); }
    ctx.stroke();
    for (x = 598; x <= 724; x += 14) {
      var yb = midY(x) - 1, fh = (6 + 4 * Math.sin(x * 1.7)) * trS.newF * (0.75 + 0.25 * Math.sin(T * 10 + x)), fw = Math.sin(T * 6 + x) * 1.5;
      ctx.fillStyle = 'rgba(232,108,36,0.85)'; ctx.beginPath(); ctx.moveTo(x - 3.5, yb); ctx.quadraticCurveTo(x - 3.5, yb - fh * 0.55, x + fw, yb - fh); ctx.quadraticCurveTo(x + 3.5, yb - fh * 0.55, x + 3.5, yb); ctx.closePath(); ctx.fill();
    }
    if (reduce) { ctx.fillStyle = 'rgba(120,114,108,0.25)'; for (var k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(640 + k * 9, midY(640) - 10 - k * 14, 6 + k * 2.4, 0, TAU); ctx.fill(); } }
  }
  for (var i = 0; i < bgSm.length; i++) { var p = bgSm[i]; ctx.fillStyle = 'rgba(104,98,94,' + Math.max(0, p.a) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
}

/* ---------- primeiro plano completo ---------- */
function drawAgForeground(bark, pan) {
  if (!FLR) buildAg();
  var i;
  drawSoilAg();
  drawInfil();
  drawLitter(litL, st.lit, 0.9);
  ctx.save(); ctx.translate(0, 4.5 * trS.ero); drawLitter(litR, st.lit * ((1 - trS.char) * (1 - 0.85 * trS.bare) + 0.08 * trS.aband), 0.9); ctx.restore();
  drawMulch();
  drawSlashR();
  for (i = 0; i < near.length; i++) if (!near[i].hidden) vegDraw(near[i], bark);
  for (i = 0; i < fill.length; i++) vegDraw(fill[i], bark);
  drawSpeciesAg();
  drawSuccAg(0.94 + 0.06 * st.S);
  drawStumpsAg();
  if (trS.aband > 0.01) { ctx.save(); ctx.globalAlpha = trS.aband; for (i = 0; i < FAL.length; i++) drawPlant(FAL[i], bark, false); ctx.restore(); }
  drawCrops();
  drawHerbs(hLs, false, pan, 1);
  var sa = 1 - 0.75 * agS.mulch; if (sa > 0.05) drawHerbs(hLa, false, pan, sa);
  var sr = clamp((1 - trS.char) * (1 - 0.85 * trS.bare) + 0.12 * trS.aband); if (sr > 0.05) { ctx.save(); ctx.translate(0, 4.5 * trS.ero); drawHerbs(hR, false, pan, sr); ctx.restore(); }
  drawBees();
  drawPeople();
  drawFence();
  drawRunoffR();
  drawFireR();
  drawAsh();
  drawAgLabels();
}

/* ---------- rótulos, títulos dos lados, painel de carbono e quadro de área ---------- */
function agLabel(L, fs) {
  ctx.font = '600 ' + fs + 'px ' + FONT;
  var w = ctx.measureText(L.s).width + fs * 0.9, lo = L.side ? FX + 6 : 6, hi = L.side ? W - 6 : FX - 6;
  var px = Math.max(lo, Math.min(hi - w, L.tx - w / 2)), below = L.ay < L.ty - fs, ly = below ? L.ty - fs * 1.0 : L.ty + fs * 0.5;
  ctx.beginPath(); ctx.moveTo(clamp(L.ax, px + 6, px + w - 6), ly); ctx.lineTo(L.ax, L.ay);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(22,34,42,0.85)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(L.ax, L.ay, 3.6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.beginPath(); ctx.arc(L.ax, L.ay, 2.4, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.93)'; rrect(px, L.ty - fs * 1.0, w, fs * 1.5, fs * 0.35); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(L.s, px + fs * 0.45, L.ty + fs * 0.05);
}
function drawAgLabels() {
  var fs = Math.max(12.5, 6.2 * W / cssW), L = LBL[am];
  ctx.save(); ctx.globalAlpha = clamp(aha);
  for (var i = 0; i < L.length; i++) agLabel(L[i], fs);
  ctx.restore();
}
function hdr(s, side, col, x0) {
  var fs = Math.max(13, 6 * W / cssW), pad = fs * 0.6;
  ctx.font = '700 ' + fs + 'px ' + FONT;
  var w = ctx.measureText(s).width + pad * 2 + fs * 0.62, h = fs * 1.9, x = side ? W - x0 - w : x0, y = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.84)'; rrect(x, y, w, h, fs * 0.4); ctx.fill();
  ctx.fillStyle = col; rrect(x + pad * 0.75, y + h * 0.24, fs * 0.3, h * 0.52, fs * 0.15); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(s, x + pad * 0.75 + fs * 0.62, y + fs * 1.27);
}
function barRow(arr, bx, by, bw, bh, fs) {
  var sc = bw / 125, xx = bx, i, w;
  ctx.fillStyle = 'rgba(22,34,42,0.09)'; rrect(bx, by, bw, bh, fs * 0.22); ctx.fill();
  for (i = 0; i < 6; i++) { w = Math.max(0, arr[i]) * sc; if (w < 0.3) continue; ctx.fillStyle = KC[i]; ctx.fillRect(xx, by, w, bh); xx += w; }
  return xx;
}
function drawAgPanel(x0) {
  var fs = Math.max(12, 5.6 * W / cssW), pad = fs * 0.7, bw = fs * 17, bh = fs * 0.95, title = 'carbono no sistema, por hectare (ilustração)';
  ctx.font = '500 ' + fs * 0.78 + 'px ' + FONT; var tw = ctx.measureText(title).width;
  var pw = Math.max(bw, tw) + pad * 2, ph = pad * 2 + fs * 0.85 + 2 * (fs * 1.3 + bh), px = W / 2 - pw / 2, py = x0;
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  ctx.fillStyle = '#4a5258'; ctx.fillText(title, px + pad, py + pad + fs * 0.6);
  var bx = px + pad, y = py + pad + fs * 0.85;
  ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText('Agroecológico', bx, y + fs * 0.95);
  var yA = y + fs * 1.3, xA = barRow(cA, bx, yA, bw, bh, fs);
  y = yA + bh;
  ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText('Tradicional exploratório', bx, y + fs * 0.95);
  var yB = y + fs * 1.3, xB = barRow(cB, bx, yB, bw, bh, fs);
  if (xA - xB > 1) {
    ctx.save(); ctx.beginPath(); ctx.rect(xB, yB, xA - xB, bh); ctx.clip();
    ctx.strokeStyle = 'rgba(22,34,42,0.6)'; ctx.lineWidth = 1.1; ctx.beginPath();
    for (var hx = xB - bh; hx < xA + bh; hx += 4) { ctx.moveTo(hx, yB + bh); ctx.lineTo(hx + bh, yB); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(22,34,42,0.75)'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]); ctx.strokeRect(xB, yB, xA - xB, bh); ctx.setLineDash([]);
  }
}
function landSq(x, y, s, kind) {
  ctx.fillStyle = kind === 4 ? '#4f7d3f' : kind === 2 ? 'rgba(205,180,140,0.45)' : kind === 1 ? '#cdb48c' : '#d6b45a';
  ctx.fillRect(x, y, s, s);
  if (kind === 3) { ctx.fillStyle = '#4f7d3f'; ctx.fillRect(x + s * 0.18, y, s * 0.16, s); ctx.fillRect(x + s * 0.62, y, s * 0.16, s); }
  ctx.strokeStyle = 'rgba(22,34,42,0.6)'; ctx.lineWidth = 1; if (kind === 2) ctx.setLineDash([2, 2]);
  ctx.strokeRect(x, y, s, s); ctx.setLineDash([]);
}
function drawLandBox(x0) {
  if (landA < 0.01) return;
  var fs = Math.max(12, 5.6 * W / cssW), pad = fs * 0.7, sq = fs * 1.0, gp = fs * 0.32, i, k;
  var tl = 'área usada para manter a roça', labs = ['Agroecológico', 'Tradicional exploratório'], vals = ['a mesma área, todo ano', '5 a 6 vezes a área da roça'];
  var leg = [['roça', 0], ['área degradada e abandonada', 1], ['faixa de árvores', 4]];
  ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; var lw = Math.max(ctx.measureText(labs[0]).width, ctx.measureText(labs[1]).width);
  ctx.font = '500 ' + fs * 0.85 + 'px ' + FONT; var vw = Math.max(ctx.measureText(vals[0]).width, ctx.measureText(vals[1]).width);
  var sw = 6 * sq + 5 * gp, pw = pad * 2 + lw + fs * 0.8 + sw + fs * 0.8 + vw, rowH = sq + fs * 0.45;
  var ph = pad * 2 + fs * 1.05 + rowH * 2 + fs * 1.15, px = W / 2 - pw / 2, py = H - x0 - ph;
  ctx.save(); ctx.globalAlpha = landA; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; rrect(px, py, pw, ph, fs * 0.5); ctx.fill();
  ctx.font = '500 ' + fs * 0.78 + 'px ' + FONT; ctx.fillStyle = '#4a5258'; ctx.fillText(tl, px + pad, py + pad + fs * 0.6);
  var sx = px + pad + lw + fs * 0.8;
  for (i = 0; i < 2; i++) {
    var ry = py + pad + fs * 1.05 + i * rowH;
    ctx.font = '600 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(labs[i], px + pad, ry + sq * 0.8);
    if (i === 0) landSq(sx, ry, sq, 3);
    else for (k = 0; k < 6; k++) landSq(sx + k * (sq + gp), ry, sq, k === 0 ? 0 : k === 5 ? 2 : 1);
    ctx.font = '500 ' + fs * 0.85 + 'px ' + FONT; ctx.fillStyle = '#16222a'; ctx.fillText(vals[i], sx + sw + fs * 0.8, ry + sq * 0.8);
  }
  var ly = py + pad + fs * 1.05 + rowH * 2 + fs * 0.35, lx = px + pad, ls = fs * 0.7;
  ctx.font = '500 ' + fs * 0.75 + 'px ' + FONT;
  for (i = 0; i < leg.length; i++) {
    landSq(lx, ly, ls, leg[i][1]); ctx.fillStyle = '#4a5258'; ctx.fillText(leg[i][0], lx + ls + fs * 0.35, ly + ls * 0.9);
    lx += ls + fs * 0.35 + ctx.measureText(leg[i][0]).width + fs * 1.0;
  }
  ctx.restore();
}
function drawAgHUD() {
  var x0 = Math.max(12, 10 * W / cssW);
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  hdr('Agroecológico', 0, AGC, x0); hdr('Tradicional exploratório', 1, TRC, x0);
  drawAgPanel(x0); drawLandBox(x0);
  ctx.restore();
}
buildAg();
agSelect(0, false);
var cena = {
  torre: false,
  semTempo: true,
  semPan: true,
  alfaMeio: midAlpha,
  aposMeio: drawNewArea,
  infiltracao: infK,
  planoFrente: function (bark, pan) { drawSoil(); drawAgForeground(bark, pan); },
  substituirInterface: function () { drawRain(); drawAgHUD(); },
  antes: function (dt) { if (!reduce) agUpdate(dt); },
  ajustarEstado: function (dt) {
    st.rainI = rainL; st.cloud = lerp(Math.min(st.cloud, 0.15), Math.max(st.cloud, 0.62), clamp(rainL * 2));
    if (rainL > 0.02 && !reduce && dt) updateRain(dt);
  },
  etapas: AGS.map(function (m, k) { return { nome: (k + 1) + '. ' + m.nome, cor: null }; }),
  selecionarEtapa: function (i) { agSelect(i, true); },
  etapaAtual: function () { return am; },
  textoEtapa: textoAg
};
