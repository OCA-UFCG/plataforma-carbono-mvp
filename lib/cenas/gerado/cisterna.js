/* Gerado por scripts/montar-cenas.mjs a partir de lib/cenas/fonte; não editar. */
/* eslint-disable */
export function criarCena(cv, opcoes) {
'use strict';
opcoes = opcoes || {};
/* Motor da paisagem da Caatinga: céu, chuva, solo raso sobre rocha com fraturas e água,
   seis espécies, raízes, fauna e torre. Corpo da função criada por scripts/montar-cenas.mjs,
   que recebe `cv` (o canvas) e `opcoes`, e insere a cena no marcador abaixo.
   Origem: animations/pacote_animacoes_caatinga/fonte/paisagem-caatinga.html (19/10/2026).

   Ganchos que a cena declara num objeto `cena`, no mesmo escopo:
     torre          false para esconder a torre de fluxo
     aposTorre      desenho logo depois da torre, atrás das plantas (troncos caídos)
     serapilheiraMin  mínimo da serapilheira do primeiro plano, para mantê-la visível
     semTempo       true numa cena só de etapas: a página esconde os controles de tempo
     planoFrente(bark, pan)  desenha no lugar do primeiro plano padrão (solo, plantas, capim)
     semPan         true para a câmera não oscilar ao longo do ano
     alfaMeio(p), aposMeio  transparência de cada planta do plano médio e desenho depois dele
     infiltracao(x) fator da umidade do solo por posição (0 a 1)
     primeiroPlano  desenho sobre a paisagem, com a transformação da cena
     interface      desenho por cima de tudo (painéis, quadros)
     substituirInterface  desenha no lugar da chuva e do nome do mês
     antes(dt)      a cada quadro, antes da simulação
     ajustarEstado  depois de computeState, para corrigir o estado do quadro
     atualizar(dt)  a cada quadro, depois da simulação
     reiniciar      quando a página muda a posição no ano
     etapas, selecionarEtapa(i), etapaAtual(), textoEtapa()
                    animações por etapas: a página mostra um botão por etapa
     valor, definirValor(v), valorAtual(), textoValor(), descricaoValor()
                    um valor que o leitor ajusta (a CUE): `valor` descreve a régua e os
                    valores predefinidos, que a página mostra abaixo das etapas;
                    descricaoValor, opcional, é o que o leitor de tela ouve no lugar
                    de textoValor
     ajustarEstado(dt) recebe o passo do quadro.
   Os controles ficam todos na página. A cena que mostra texto próprio (a legenda e os
   textos das etapas do manejo agroecológico) o escreve em opcoes.painel, um elemento
   que a página reserva abaixo do painel de controle. */

var W = 960, H = 540, TAU = Math.PI * 2;

/*SIM-START*/
var NS = 1200;
var MONTHS = ['nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out'];
var MDAYS = [30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31];
var RM = [0.04, 0.08, 0.35, 0.60, 1.00, 0.85, 0.40, 0.15, 0.06, 0.02, 0.01, 0.02];
function clamp(x, a, b) { if (a === undefined) a = 0; if (b === undefined) b = 1; return Math.min(b, Math.max(a, x)); }
function smooth(a, b, x) { var u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); }
function rain(t) {
  var p = t * 12 - 0.5, i0 = Math.floor(p), f = p - i0;
  var a = RM[((i0 % 12) + 12) % 12], b = RM[(((i0 + 1) % 12) + 12) % 12];
  var u = (1 - Math.cos(Math.PI * f)) / 2;
  var r = a + (b - a) * u;
  var d = (((t - 0.19 + 0.5) % 1) + 1) % 1 - 0.5;
  return r + 0.32 * Math.exp(-(d * d) / (0.014 * 0.014));
}
function samp(arr, t) {
  t = ((t % 1) + 1) % 1;
  var f = t * NS, i = Math.floor(f), j = (i + 1) % NS, u = f - i;
  return arr[i] * (1 - u) + arr[j] * u;
}
function buildSim() {
  var dt = 1 / NS, A = 18, B = 13, KUP = 34, KDN = 12, KHU = 40, KHD = 26, KL0 = 0.8, KL1 = 7, KP = 36;
  var Wst = 0, L = 0, Hh = 0, Lit = 0, Pu = 0, Sp = 0, rs = 0;
  var names = ['S', 'L', 'H', 'Lit', 'loss', 'cloud', 'r', 'Pu'], o = {}, i, c, n;
  for (n = 0; n < names.length; n++) o[names[n]] = new Float32Array(NS);
  for (c = 0; c < 7; c++) {
    for (i = 0; i < NS; i++) {
      var t = i / NS, r = rain(t);
      Wst += (A * r - B * Wst) * dt;
      var S = 1 - Math.exp(-Wst);
      var T = smooth(0.22, 0.62, S);
      var dL = (T - L) * (T > L ? KUP : KDN) * dt; L += dL;
      var TH = smooth(0.30, 0.60, S);
      Hh += (TH - Hh) * (TH > Hh ? KHU : KHD) * dt;
      var loss = Math.max(0, -dL) / dt;
      Lit += 0.9 * loss * dt - (KL0 + KL1 * S) * Lit * dt;
      var dS = (S - Sp) / dt; Sp = S;
      Pu += (Math.max(0, dS) * (1 - S) * (1 - S) - KP * Pu) * dt;
      rs += (r - rs) * 40 * dt;
      if (c === 6) {
        o.S[i] = S; o.L[i] = L; o.H[i] = Hh; o.Lit[i] = Lit; o.loss[i] = loss;
        o.cloud[i] = clamp(rs * 1.5); o.r[i] = r; o.Pu[i] = Pu;
      }
    }
  }
  var litMax = 1e-9, gMax = 1e-9, pMax = 1e-9;
  var GPP = new Float32Array(NS), Reco = new Float32Array(NS), NEE = new Float32Array(NS), G = new Float32Array(NS);
  for (i = 0; i < NS; i++) {
    litMax = Math.max(litMax, o.Lit[i]);
    pMax = Math.max(pMax, o.Pu[i]);
    GPP[i] = 0.06 + 0.94 * (0.82 * o.L[i] + 0.18 * o.H[i]) * Math.sqrt(clamp(o.S[i] / 0.55)); /* 0,06: piso das perenes e dos cactos na seca */
    gMax = Math.max(gMax, GPP[i]);
  }
  var neeMax = 1e-9;
  for (i = 0; i < NS; i++) {
    o.Lit[i] /= litMax; GPP[i] /= gMax;
    var Rh = 0.03 + 0.19 * o.S[i] * (0.45 + 0.55 * o.Lit[i]); /* calibrado para Reco/GPP anual ≈ 0,6, como no Seridó (Mendes et al., 2020) */
    var P = PULSE * o.Pu[i] / pMax;
    Reco[i] = 0.40 * GPP[i] + Rh + P;
    NEE[i] = Reco[i] - GPP[i];
    G[i] = 0.1 + 0.9 * (0.8 * o.L[i] + 0.2 * o.H[i]);
    neeMax = Math.max(neeMax, Math.abs(NEE[i]));
  }
  o.GPP = GPP; o.Reco = Reco; o.NEE = NEE; o.G = G; o.neeMax = neeMax;
  return o;
}
var PULSE = 0.14;
/*SIM-END*/

var sim = buildSim();
/* água na fratura da rocha cristalina: reservatório que recarrega só quando o solo raso satura até a rocha e esvazia devagar na seca.
   Esquema qualitativo (sugestão de representação, sem calibração); a ideia de água armazenada em fraturas do cristalino segue a
   hidrogeologia do semiárido sobre embasamento cristalino. */
(function () {
  var FW = new Float32Array(NS), v = 0, mx = 1e-9, c, i;
  for (c = 0; c < 6; c++) for (i = 0; i < NS; i++) {
    var rec = Math.max(0, sim.S[i] - 0.45) * 40;
    v += (rec * (1 - v) - 1.4 * v) / NS;
    if (c === 5) { FW[i] = v; mx = Math.max(mx, v); }
  }
  for (i = 0; i < NS; i++) FW[i] /= mx;
  sim.FW = FW;
})();

/* ---------- limites de fase derivados do modelo ---------- */
var bounds = (function () {
  var L = sim.L, pk = 0, pkI = 0, i, tF = 0.14, tP = 0.3, tS = 0.5, tD = 0.7;
  for (i = 0; i < NS; i++) if (L[i] > pk) { pk = L[i]; pkI = i; }
  for (i = 0; i < NS; i++) if (L[i] > 0.9 * pk) { tP = i / NS; break; }
  for (i = pkI; i < pkI + NS; i++) if (L[i % NS] < 0.9 * pk) { tS = i / NS; break; }
  for (i = Math.floor(tS * NS); i < Math.floor(tS * NS) + NS; i++) if (L[i % NS] < 0.05 * pk) { tD = i / NS; break; }
  tS = Math.min(tS, 0.97); tD = Math.min(Math.max(tD, tS + 0.02), 0.99);
  return [['Seca tardia', 0, tF], ['Primeiras chuvas', tF, tP], ['Pico chuvoso', tP, tS], ['Senescência', tS, tD], ['Seca', tD, 1]];
})();
function phaseAt(t) { for (var i = 0; i < bounds.length; i++) if (t < bounds[i][2]) return i; return bounds.length - 1; }

/* ---------- utilidades ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function lerp(a, b, t) { return a + (b - a) * t; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function rgb(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')'; }
var FONT = opcoes.fonte || "'IBM Plex Sans','Segoe UI',system-ui,sans-serif";
var HAZE = [196, 210, 206];

/* ---------- mundo ---------- */
function groundY(x) { return 322 + 0.055 * x + 9 * Math.sin(x * 0.013 + 1.0) + 4 * Math.sin(x * 0.041 + 0.5); }
function midY(x) { return groundY(x) - 30 + 5 * Math.sin(x * 0.02 + 2); }

/* ---------- solo raso sobre rocha (corte esquemático) ---------- */
/* Na realidade o solo tem dezenas de centímetros (40 a 60 cm); no corte a espessura é exagerada para caber as raízes. */
var OUT = [[178, 22, 17], [612, 26, 14], [836, 30, 11]]; /* afloramentos: [x, meia-largura, altura acima da superfície] */
function outcropH(x) {
  var h = 0;
  for (var k = 0; k < OUT.length; k++) { var d = Math.abs(x - OUT[k][0]) / OUT[k][1]; if (d < 1) h = Math.max(h, OUT[k][2] * (1 - d * d)); }
  return h;
}
function thinF(x) {
  var f = 1;
  for (var k = 0; k < OUT.length; k++) { var u = Math.abs(x - OUT[k][0]) / (OUT[k][1] * 1.9); if (u < 1) f = Math.min(f, 0.3 + 0.7 * u * u); }
  return f;
}
function soilD(x) { return Math.max(5, (54 + 8 * Math.sin(x * 0.021 + 0.7) + 4 * Math.sin(x * 0.057 + 2.1)) * thinF(x)); }
function sapD(x) { return Math.max(4, (28 + 6 * Math.sin(x * 0.033 + 1.9) + 3 * Math.sin(x * 0.09 + 0.4) + 2.2 * Math.sin(x * 0.19 + 1.3) + 1.3 * Math.sin(x * 0.33)) * (0.5 + 0.5 * thinF(x))); }
function soilBase(x) { return groundY(x) + soilD(x); }
function rockTop(x) { return soilBase(x) + sapD(x); }
var GX = [], GY = [], GA = [], GS = [], GR = [], GH = [];
(function () {
  for (var x = -96; x <= W + 96; x += 8) { GX.push(x); GY.push(groundY(x)); GA.push(groundY(x) + 0.3 * soilD(x)); GS.push(soilBase(x)); GR.push(rockTop(x)); GH.push(H + 12); }
})();
var rng = mulberry32(20261001);
function mkRidge(base, a, seed) {
  var r = mulberry32(seed), pts = [], p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
  for (var x = -90; x <= W + 90; x += 6) pts.push(x, base + a * Math.sin(x * 0.006 + p1) + a * 0.55 * Math.sin(x * 0.017 + p2) + a * 0.25 * Math.sin(x * 0.043 + p3) + (r() - 0.5) * 3);
  return new Float32Array(pts);
}
var ridges = [mkRidge(228, 16, 11), mkRidge(258, 12, 23)];

function genPlant(r, hPx, maxD) {
  var segs = [], tips = [], nst = 2 + Math.floor(r() * 3);
  function br(x, y, ang, len, d) {
    var a = ang + (r() - 0.5) * 0.3, x1 = x + Math.sin(a) * len, y1 = y - Math.cos(a) * len;
    segs.push([x, y, x1, y1, d]);
    if (d >= maxD) { tips.push({ x: x1, y: y1, r: r(), ph: r() * TAU, s: 0.75 + 0.5 * r(), o: [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1] }); return; }
    var nc = 2 + (r() < 0.4 ? 1 : 0);
    for (var k = 0; k < nc; k++) {
      var sp = (k / (nc - 1) - 0.5) * 1.7 + (r() - 0.5) * 0.35;
      br(x1, y1, a * 0.55 + sp, len * (0.62 + 0.12 * r()), d + 1);
    }
  }
  for (var s = 0; s < nst; s++) {
    var a0 = (s / (nst - 1) - 0.5) * 0.8 + (r() - 0.5) * 0.2;
    br((s - (nst - 1) / 2) * 0.06, 0, a0, 0.55 + 0.2 * r(), 0);
  }
  var minY = 0;
  segs.forEach(function (s) { minY = Math.min(minY, s[1], s[3]); });
  var k = hPx / (-minY), byD = [[], [], [], []];
  segs.forEach(function (s) { byD[s[4]].push(s[0] * k * 1.1, s[1] * k, s[2] * k * 1.1, s[3] * k); });
  tips.forEach(function (t) { t.x *= k * 1.1; t.y *= k; });
  return { byD: byD.map(function (a) { return new Float32Array(a); }), tips: tips, h: hPx };
}
function genRoots(r, avail) {
  var main = new Path2D(), fine = new Path2D(), rp = null, i, j;
  var n = 6;
  for (i = 0; i < n; i++) {
    var tap = i === 0, th = tap ? 0 : (i % 2 ? 1 : -1) * (0.6 + r() * 0.7);
    var len = tap ? avail * (0.6 + r() * 0.25) : 60 + r() * 90, steps = 14, sl = len / steps, x = 0, y = 2;
    main.moveTo(0, 0);
    for (j = 0; j < steps; j++) {
      th += (r() - 0.5) * 0.35 - th * 0.06;
      x += Math.sin(th) * sl; y += Math.cos(th) * sl;
      if (y > avail) break;
      main.lineTo(x, y);
      if (i === 1 && j === 7) rp = [x, y];
      if (j % 3 === 2) {
        var fx = x, fy = y, fa = th + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.5);
        fine.moveTo(fx, fy);
        for (var q = 0; q < 5; q++) { fa += (r() - 0.5) * 0.4; fx += Math.sin(fa) * sl * 0.5; fy += Math.cos(fa) * sl * 0.5 + 0.3; if (fy > avail) break; fine.lineTo(fx, fy); }
      }
    }
  }
  return { main: main, fine: fine, rp: rp || [30, 40] };
}
function mkPlant(r, x, y, hPx, layer) {
  var g = genPlant(r, hPx, 3), n = g.tips.length;
  return { x: x, y: y, layer: layer, byD: g.byD, tips: g.tips, h: g.h, shift: r() * 0.07 - 0.015, amp: 0.78 + 0.22 * r(),
    lv: 0, rise: 0, tx: new Float32Array(n), ty: new Float32Array(n), rr: new Float32Array(n), roots: null };
}
var near = [], mid = [], i;
for (i = 0; i < 15; i++) {
  var nx = 72 + i * (840 / 14) + (rng() - 0.5) * 30;
  var np = mkPlant(rng, nx, groundY(nx) + rng() * 6 - 2, (3 + 5 * Math.pow(rng(), 1.3)) * 15, 1);
  np.roots = genRoots(rng, Math.max(80, H - np.y - 26));
  near.push(np);
}
for (i = 0; i < 26; i++) {
  var mx = -10 + i * (980 / 26) + (rng() - 0.5) * 24;
  mid.push(mkPlant(rng, mx, midY(mx) + rng() * 14, (3 + 5 * Math.pow(rng(), 1.3)) * 9.5, 0));
}
near.sort(function (a, b) { return a.y - b.y; });
mid.sort(function (a, b) { return a.y - b.y; });
var allPlants = near.concat(mid);
var tall = near[0];
near.forEach(function (p) { if (p.h > tall.h) tall = p; });
var rootRef = near[3];

function genHerbs(r, n, x0, x1, yFn, hmin, hr) {
  var a = [];
  for (var k = 0; k < n; k++) { var x = x0 + r() * (x1 - x0); a.push({ x: x, y: yFn(x) + r() * 2.5, rk: r(), hm: hmin + r() * hr, nb: 4 + Math.floor(r() * 4), lean: (r() - 0.5) * 0.9, fl: r() < 0.14, c: k % 2 }); }
  return a;
}
var herbsFg = genHerbs(rng, 230, 30, 930, groundY, 9, 18);
var herbsMid = genHerbs(rng, 170, -20, 980, function (x) { return midY(x) + rng() * 16; }, 5, 10);
function genLitter(r, n, yFn) {
  var a = [];
  for (var k = 0; k < n; k++) { var x = -60 + r() * (W + 120); a.push({ x: x, y: yFn(x) + r() * 3.5 - 1, rk: r(), s: 1.2 + r() * 2.6, c: k % 3, a: r() * 3 }); }
  return a;
}
var litFg = genLitter(rng, 520, groundY);
var litMid = genLitter(rng, 280, function (x) { return midY(x) + rng() * 16; });
var succ = [[148, 26], [338, 22], [512, 29], [700, 24], [872, 27]];
var cacti = [[262, 36], [786, 44]];
/* detalhes do solo: pedras, fragmentos, textura do saprólito, fraturas da rocha (gerador próprio; não altera o resto da paisagem) */
var rngSoil = mulberry32(5150);
function stonePoly(r, rad, nv) {
  var p = [], a0 = r() * TAU;
  for (var v = 0; v < nv; v++) { var an = a0 + v / nv * TAU, rv = rad * (0.62 + r() * 0.5); p.push(Math.cos(an) * rv, Math.sin(an) * rv * 0.72); }
  return p;
}
var surfSt = [], embSt = [], dotsA = [], dotsB = [], foli = [], veins = [], dotsR = [], fracs = [], sheets = [];
(function () {
  var r = rngSoil, k, x, y, n;
  for (k = 0; k < 120; k++) {
    x = k < 84 ? -60 + r() * (W + 120) : OUT[k % 3][0] + (r() - 0.5) * OUT[k % 3][1] * 3.4;
    if (outcropH(x) > 0.6) continue;
    surfSt.push({ x: x, y: groundY(x) + 0.5 + r() * 2.2, p: stonePoly(r, 1.3 + r() * 2.8, 5), c: k % 3 });
  }
  for (k = 0; k < 130; k++) {
    x = -60 + r() * (W + 120);
    if (soilD(x) < 14) continue;
    y = groundY(x) + soilD(x) * (0.1 + 0.85 * r());
    embSt.push({ x: x, y: y, p: stonePoly(r, 1.6 + r() * 3.6, 5 + Math.floor(r() * 2)), c: k % 3 });
  }
  for (k = 0; k < 300; k++) { x = -60 + r() * (W + 120); dotsA.push(x, groundY(x) + 1 + r() * 0.3 * soilD(x), 0.6 + r() * 1.0); }
  for (k = 0; k < 170; k++) { x = -60 + r() * (W + 120); dotsB.push(x, groundY(x) + 0.3 * soilD(x) + r() * 0.7 * soilD(x), 0.6 + r() * 1.0); }
  for (x = -70; x < W + 70; x += 9) {
    for (n = 0; n < 3; n++) {
      var xx = x + r() * 8, yy = soilBase(xx) + 3 + r() * Math.max(2, sapD(xx) - 6);
      foli.push(xx, yy, 6 + r() * 9, n % 2);
    }
  }
    for (k = 0; k < 210; k++) { x = -60 + r() * (W + 120); y = rockTop(x) + 4 + r() * (H - rockTop(x)); dotsR.push(x, y, 0.6 + r() * 1.1, r() < 0.5 ? 0 : 1); }
  for (k = 0; k < 11; k++) {
    x = -50 + r() * (W + 100); var pts = [x, rockTop(x) - 2], ang = (r() - 0.5) * 0.5, yc = rockTop(x), xc = x, bw = 0.7 + r() * 0.5;
    while (yc < H + 10) { var sl = 14 + r() * 14; ang += (r() - 0.5) * 0.5 - ang * 0.25; xc += Math.sin(ang) * sl; yc += Math.cos(ang) * sl; pts.push(xc, yc); }
    fracs.push({ p: pts, w: bw });
  }
  for (k = 0; k < 2; k++) sheets.push({ off: 34 + k * 46 + r() * 8, ph: r() * 6, a: 3 + r() * 3 });
})();
/* rede de fraturas na rocha cristalina (padrão do esboço do usuário): uma fratura longa quase horizontal cortada por
   fraturas oblíquas, algumas atravessando-a e outras terminando nela; uma delas chega ao topo da rocha (caminho de recarga).
   Aberturas exageradas para leitura. */
var FRW = (function () {
  /* segmentos no espaço do esboço (290 x 75), convertidos para a cena: x' = 690 + 0,64 x ; y' = 452 + 1,05 y */
  var S = [[55, 40, 255, 58, 3.6], [12, 47, 52, 24, 2.6], [106, -40, 92, 74, 3.0], [122, 8, 156, 42, 2.6], [160, 18, 250, 66, 2.8], [205, 46, 228, 80, 2.4]];
  var segs = S.map(function (q) { return [690 + 0.64 * q[0], 452 + 1.05 * q[1], 690 + 0.64 * q[2], 452 + 1.05 * q[3], q[4]]; });
  var top = 1e9, bot = -1e9;
  segs.forEach(function (g) { top = Math.min(top, g[1], g[3]); bot = Math.max(bot, g[1], g[3]); });
  return { segs: segs, top: Math.max(top, 446), bot: Math.min(bot, H + 4) };
})();
function fracStroke(extra, col) {
  ctx.strokeStyle = col;
  FRW.segs.forEach(function (g) { ctx.lineWidth = g[4] + extra; ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(g[2], g[3]); ctx.stroke(); });
}
function drawFracWater() {
  var f = FRW, lvl = f.bot - (f.bot - f.top) * clamp(0.1 + 0.9 * st.FW);
  ctx.save(); band(GR, GH); ctx.clip();
  ctx.lineCap = 'round';
  fracStroke(1.8, 'rgba(24,24,30,0.85)');
  fracStroke(0, 'rgba(56,54,58,0.97)');
  ctx.beginPath(); ctx.rect(600, lvl, 360, H); ctx.clip();
  fracStroke(0, '#4b93c6');
  ctx.restore();
}
var clouds = [];
for (i = 0; i < 8; i++) clouds.push({ x0: rng() * (W + 400), y: 30 + rng() * 110, sc: 0.8 + rng() * 0.9, sp: 3 + rng() * 5, th: i / 8 * 0.7, a: 0.7 + rng() * 0.3, e: [rng(), rng(), rng(), rng(), rng()] });
var drops = [];
for (i = 0; i < 260; i++) drops.push({ x: rng() * W, y: rng() * 380, v: 520 + rng() * 220, l: 9 + rng() * 9, gy: 0.82 + rng() * 0.16 });

/* ---------- espécies típicas: dados de fenologia, esqueletos e desenho ---------- */
/* Valores por mês (jan a dez), de 0 a 1: L = cobertura de folhas, F = flores, R = frutos, M = maturação do fruto.
   NA = sem dado na fonte. A escala 0 a 1 é uma leitura qualitativa do texto das fontes, não uma contagem. */
var NA = null, CALM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var SP = [
  { id: 'umbu', nome: 'Umbuzeiro', sci: 'Spondias tuberosa Arruda', fam: 'Anacardiaceae', x: 112, kind: 'tree',
    L: [0.3, 0.85, 1, 1, 1, 0.9, 0.75, 0.4, 0.1, 0, 0, 0.03],
    F: [0.8, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 1],
    R: [0.55, 1, 1, 0.6, 0.3, 0, 0, 0, 0, 0, 0.15, 0.3],
    M: [0.1, 0.6, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    porte: 'Árvore baixa (4 a 6 m) com copa em guarda-chuva de 10 a 15 m de diâmetro. As raízes têm xilopódios (as "batatas"), que guardam água.',
    folhas: 'Decídua. Perde todas as folhas cerca de 1 a 2 meses depois da última chuva e floresce sem folhas, antes das primeiras chuvas. A rebrota com a chuva é uma leitura minha.',
    flores: 'Novembro a fevereiro, com pico em dezembro. Flores brancas.',
    frutos: 'Novembro a maio, com pico em fevereiro e março. Fruto verde a amarelado, de 2 a 4 cm.',
    local: 'Flores e frutos: Cabaceiras e Boa Vista, PB (Nadia et al., 2007). Porte e queda de folhas: Lima Filho (2011).',
    ev: 'Resultado de estudo de um local. Cobertura de folhas reconstruída por regra de tempo após a chuva.',
    nota: 'Em Petrolina, PE, a floração foi de agosto a outubro e os frutos amadureceram em janeiro e fevereiro (Cavalcanti et al., s.d.). No Sertão pernambucano a floração é de outubro a dezembro e no Agreste, de janeiro a março (Lima Filho, 2011). O calendário mostrado segue o Cariri paraibano.' },
  { id: 'facheiro', nome: 'Facheiro', sci: 'Pilosocereus pachycladus subsp. pernambucensis', fam: 'Cactaceae', x: 265, kind: 'cactus2',
    L: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    F: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0.5],
    R: [0.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1],
    M: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    porte: 'Cacto colunar ramificado, com tronco lenhoso curto e muitas colunas verdes em forma de candelabro (foto enviada pelo usuário). A descrição anterior, de caule azulado, vinha de site de cultivo (fonte de menor qualidade).',
    folhas: 'Não tem folhas; o caule verde faz a fotossíntese. Verde um pouco amarelado na chuva e verde-escuro, quase preto, na seca (descrição do usuário, não verificada na literatura).',
    flores: 'Pico em outubro e novembro. Flores noturnas de até 10 cm, esverdeadas a vináceas por fora e brancas por dentro (descrição do gênero).',
    frutos: 'A fonte registra botões, flores e frutos de outubro a maio, com pico nos meses menos chuvosos (Costa et al., 2020). O desenho mostra flores de outubro a dezembro e frutos de novembro a fevereiro (simplificação; os meses dos frutos são sugestão minha). Fruto globoso, de polpa branca, magenta ou vermelha (descrição do gênero).',
    local: 'Bananeiras, PB (Agreste), de outubro de 2018 a maio de 2019 (Costa, 2019; Costa et al., 2020). Descrição: Correa (2022b); porte: Orquídeas no Apê (2019).',
    ev: 'Evidência preliminar: um local, uma estação de observação.',
    nota: 'Junho a setembro sem dado; o desenho não mostra flores nem frutos nesses meses. A forma e a cor vêm de descrições gerais e da foto do usuário, não do estudo de fenologia.' },
  { id: 'aroeira', nome: 'Aroeira', sci: 'Myracrodruon urundeuva Allemão', fam: 'Anacardiaceae', x: 395, kind: 'tree',
    L: [0.55, 0.85, 1, 1, 1, 1, 0.98, 0.95, 0.9, 0.65, 0.35, 0.2],
    F: [0, 0, 0, 0, 0, 0, 0, 0.6, 1, 0.7, 0, 0],
    R: [0, 0, 0, 0, 0, 0, 0, 0, 0.45, 1, 0.8, 0],
    M: [0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.8, 1, 0],
    porte: 'Árvore de 10 a 20 m, com tronco curto e tortuoso na Caatinga, casca marrom-escura e sulcada, e copa ampla e irregular.',
    folhas: 'Decídua. Queda de folhas de outubro a dezembro; brotação de dezembro a julho.',
    flores: 'Agosto a outubro, na estação seca. Flores cor de creme, em panículas.',
    frutos: 'Setembro a novembro. Drupas arredondadas, verdes e depois vinho, quando maduras.',
    local: 'Pombal, PB (Japiassú et al., 2016). Descrição: CNIP (s.d.).',
    ev: 'Resultado de estudo de um local. Cobertura de folhas reconstruída a partir das fases de queda e brotação.',
    nota: 'A literatura registra floração em meses diferentes conforme a região. O calendário mostrado segue o semiárido paraibano.' },
  { id: 'juazeiro', nome: 'Juazeiro', sci: 'Ziziphus joazeiro Mart.', fam: 'Rhamnaceae', x: 540, kind: 'tree',
    L: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    F: [0.35, 0.25, 0.2, 0.15, 0.1, 0.1, 0, 0, 0, 0, 0.5, 1],
    R: [0.5, 1, 1, 1, 0.8, 0.3, 0, 0, 0, 0, 0, 0.2],
    M: [0.3, 0.8, 1, 1, 1, 0.5, 0, 0, 0, 0, 0, 0],
    porte: 'Árvore de até 10 m (16 m em outra fonte), com copa globosa, densa e verde-escura, tronco curto e ramos com espinhos.',
    folhas: 'Perenifólia: mantém as folhas o ano todo, graças ao sistema radicular profundo. Só perde todas em seca extrema.',
    flores: 'Começa em novembro, com pico em dezembro, e segue com pouca intensidade até junho. Flores minúsculas (cerca de 5 mm), verde-amareladas.',
    frutos: 'Começam a se formar em meados de dezembro; maduros de fevereiro a maio. Fruto amarelado de 1,5 a 2 cm.',
    local: 'Cabaceiras e Boa Vista, PB (Nadia, 2005). Porte e folhagem: Carvalho (2007) e Projeto Caatinga (s.d.).',
    ev: 'Resultado de estudo de um local. Folhagem perene documentada.',
    nota: 'A época de floração do juazeiro varia muito entre estados na literatura (de setembro a abril, conforme o local; Carvalho, 2007).' },
  { id: 'ipe', nome: 'Ipê-rosa', sci: 'Handroanthus impetiginosus (Mart. ex DC.) Mattos', fam: 'Bignoniaceae', x: 690, kind: 'tree',
    L: [0.35, 0.9, 1, 0.6, 0.1, 0, 0, 0, 0, 0, 0, 0],
    F: [0, 0, 0, 0, 0.3, 1, 1, 0.6, 0, 0, 0, 0],
    R: [0, 0, 0, 0, 0, 0, 0, 0.2, 0.7, 1, 0.3, 0],
    M: [0, 0, 0, 0, 0, 0, 0, 0, 0.4, 1, 1, 0],
    porte: 'Árvore de 8 a 30 m, com tronco geralmente reto, copa arredondada e irregular e casca pardo-escura. Na literatura aparece também como ipê-roxo.',
    folhas: 'Decídua. A queda antecede a floração; no Seridó, RN, a árvore ficou sem folhas por mais de 5 meses, de julho a janeiro.',
    flores: 'Maio a agosto, com a árvore totalmente sem folhas. Flores róseo-violáceas.',
    frutos: 'Cápsulas lineares de 25 a 30 cm. Amadurecem de meados de setembro a outubro.',
    local: 'Rio Grande do Norte (Projeto Caatinga, s.d.; Amorim et al., 2009). Descrição: Salomão e Camillo (2016).',
    ev: 'Resultado de estudos regionais. Cobertura de folhas reconstruída: a queda é anterior à floração e a rebrota ocorre com as chuvas (leitura minha).',
    nota: 'Em anos secos a floração pode falhar: no Seridó, florescendo apenas uma vez em dois anos e só em parte dos indivíduos. Em outras regiões a floração ocorre em meses bem diferentes (fevereiro a maio na Bahia, julho no Ceará, setembro e outubro em Pernambuco). A identificação de "ipê-rosa" com esta espécie é uma suposição minha.' },
  { id: 'mandacaru', nome: 'Mandacaru', sci: 'Cereus jamacaru DC.', fam: 'Cactaceae', x: 836, kind: 'cactus1',
    L: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    F: [0, 0.8, 1, 0.8, 0, 0, 0, 0, 0, 0, 0, 0],
    R: [0, 0.6, 1, 1, 0.3, 0, 0, 0, 0, 0, 0, 0],
    M: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    porte: 'Cacto de 5 a 14 m. Começa colunar e vira arborescente, com ramos de 4 a 6 quinas.',
    folhas: 'Não tem folhas; o caule verde faz a fotossíntese.',
    flores: 'Pico de fevereiro a abril, na época das chuvas. Flores brancas, grandes, que abrem à noite e duram uma ou duas noites.',
    frutos: 'Pico de fevereiro a abril. Fruto de cor vinho, com sementes pequenas e pretas.',
    local: 'Bananeiras, PB (Agreste), de outubro de 2018 a maio de 2019 (Costa, 2019; Costa et al., 2020). Descrição: Correa (2022a).',
    ev: 'Evidência preliminar: um local, uma estação de observação.',
    nota: 'Junho a setembro sem dado; o desenho não mostra flores nem frutos nesses meses, nem fora da época das chuvas. Um estudo feito no Pará, fora da Caatinga, registrou floração em quase todos os meses e não foi usado.' }
];
function fillGaps(a) {
  var out = a.slice(), n = 12, i, p, q, dp, dq;
  for (i = 0; i < n; i++) if (a[i] === null) {
    p = i; q = i; dp = 0; dq = 0;
    while (a[((p % n) + n) % n] === null) { p--; dp++; }
    while (a[q % n] === null) { q++; dq++; }
    out[i] = a[((p % n) + n) % n] + (a[q % n] - a[((p % n) + n) % n]) * dp / (dp + dq);
  }
  return out;
}
function calPos(ph) {
  var d = (ph * 365 + 304) % 365, m = 0;
  while (m < 11 && d >= CALM[m]) { d -= CALM[m]; m++; }
  return m + d / CALM[m];
}
function sampM(arr, pos) {
  var x = pos - 0.5, i0 = Math.floor(x), u = x - i0, a = arr[((i0 % 12) + 12) % 12], b = arr[(((i0 + 1) % 12) + 12) % 12];
  u = u * u * (3 - 2 * u); return a + (b - a) * u;
}
var CFG = {
  umbu: { stems: [{ a: -1.0, len: 0.5, x: -0.05 }, { a: -0.4, len: 0.55, x: -0.017 }, { a: 0.45, len: 0.55, x: 0.017 }, { a: 1.05, len: 0.5, x: 0.05 }],
    lv: [{ k: 3, sp: 1.3, keep: 1.0, len: 0.85 }, { k: 3, sp: 1.4, keep: 0.8, len: 0.75 }], jit: 0.22, amax: 1.3, h: 80, w: 84,
    widths: [7, 3.8, 1.9], bark: '#8b8468', barkDark: '#6e6850', R0: 7.6, nb: 4,
    leaf: [112, 158, 66], young: [176, 204, 98], old: [190, 160, 70], shade: [60, 100, 50] },
  aroeira: { stems: [{ a: 0.02, len: 0.4, x: 0 }], lv: [{ k: 3, sp: 1.3, keep: 0.35, len: 0.72, p: 0.3 }, { k: 3, sp: 1.4, keep: 0.5, len: 0.7 }, { k: 3, sp: 1.5, keep: 0.5, len: 0.7 }], jit: 0.2, amax: 1.35, h: 138, w: 62,
    widths: [8.5, 4.8, 2.6, 1.4], bark: '#4b3a2c', barkDark: '#2e2218', furrow: true, R0: 8, nb: 3,
    leaf: [88, 138, 58], young: [166, 200, 92], old: [186, 150, 66], shade: [46, 84, 42] },
  juazeiro: { stems: [{ a: -0.14, len: 0.3, x: -0.02 }, { a: 0.16, len: 0.3, x: 0.02 }], lv: [{ k: 4, sp: 1.9, keep: 0.5, len: 0.72 }, { k: 4, sp: 1.9, keep: 0.5, len: 0.7 }], jit: 0.25, amax: 1.3, h: 108, w: 58,
    widths: [9.5, 4.6, 2.2], bark: '#5f564a', barkDark: '#403a31', R0: 9.6, nb: 4,
    leaf: [36, 92, 52], young: [90, 140, 70], old: [120, 120, 60], shade: [22, 58, 38] },
  ipe: { stems: [{ a: 0.0, len: 0.46, x: 0 }], lv: [{ k: 3, sp: 1.0, keep: 0.3, len: 0.62 }, { k: 3, sp: 1.2, keep: 0.5, len: 0.66 }, { k: 3, sp: 1.2, keep: 0.5, len: 0.7 }], jit: 0.2, amax: 1.3, h: 142, w: 60,
    widths: [7.5, 4.2, 2.3, 1.2], bark: '#54463a', barkDark: '#352a20', furrow: true, R0: 7.4, nb: 3,
    leaf: [62, 112, 56], young: [150, 192, 90], old: [182, 146, 64], shade: [34, 70, 40] }
};
function growTree(r, cfg) {
  var segs = [], tips = [];
  function br(x, y, ang, len, d) {
    var a = Math.max(-cfg.amax, Math.min(cfg.amax, ang + (r() - 0.5) * cfg.jit)), x1 = x + Math.sin(a) * len, y1 = y - Math.cos(a) * len;
    segs.push([x, y, x1, y1, d]);
    if (d >= cfg.lv.length) { tips.push({ x: x1, y: y1, r: r(), q: r(), z: r(), s: 0.75 + 0.5 * r(), ph: r() * TAU, o: [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1] }); return; }
    var l = cfg.lv[d], nc = l.k + (r() < (l.p || 0) ? 1 : 0), k;
    for (k = 0; k < nc; k++) {
      var sp = (nc > 1 ? (k / (nc - 1) - 0.5) : 0) * l.sp + (r() - 0.5) * 0.3;
      br(x1, y1, a * l.keep + sp, len * l.len * (0.88 + 0.24 * r()), d + 1);
    }
  }
  cfg.stems.forEach(function (s) { br(s.x || 0, 0, s.a, s.len, 0); });
  var minY = 0, maxX = 1e-6; segs.forEach(function (s) { minY = Math.min(minY, s[1], s[3]); maxX = Math.max(maxX, Math.abs(s[0]), Math.abs(s[2])); });
  var ky = cfg.h / -minY, kx = cfg.w / maxX, byD = [], i;
  for (i = 0; i <= cfg.lv.length; i++) byD.push([]);
  segs.forEach(function (s) { byD[s[4]].push(s[0] * kx, s[1] * ky, s[2] * kx, s[3] * ky); });
  tips.forEach(function (t) { t.x *= kx; t.y *= ky; });
  return { byD: byD.map(function (a) { return new Float32Array(a); }), tips: tips };
}
var rngS = mulberry32(7731);
SP.forEach(function (sp) {
  sp.Lf = fillGaps(sp.L); sp.Ff = fillGaps(sp.F); sp.Rf = fillGaps(sp.R); sp.Mf = sp.M;
  sp.y = groundY(sp.x) - outcropH(sp.x) + 1;
  sp.st = { lv: 0, fl: 0, fr: 0, ma: 0, rise: 0 };
  if (sp.kind === 'tree') {
    sp.cfg = CFG[sp.id]; var g = growTree(rngS, sp.cfg); sp.byD = g.byD; sp.tips = g.tips; sp.h = sp.cfg.h;
    sp.roots = genRoots(rngS, Math.max(90, H - sp.y - 10));
  } else {
    sp.h = sp.kind === 'cactus1' ? 124 : 96;
    sp.q = []; for (var qi = 0; qi < 8; qi++) sp.q.push(rngS());
  }
});
/* ---------- umbuzeiro: copa em guarda-chuva, tronco curto e grosso e base alargada ----------
   Referência de forma enviada pelo usuário (logo). O esqueleto antigo continua sendo gerado acima só para manter
   a sequência aleatória das outras espécies; aqui ele é substituído por um esqueleto próprio, de outra semente. */
var DOME = { trunkH: 26, a: 92, b: 64, nL: 7, span: 1.0, thMax: 1.24 };
function growDome(r, c) {
  var byD = [[], [], []], tips = [], i, j, k;
  function P(th, rho) { th = Math.max(-c.thMax, Math.min(c.thMax, th)); return [c.a * rho * Math.sin(th), -c.trunkH - c.b * rho * Math.cos(th)]; }
  function tip(p, s) { tips.push({ x: p[0], y: p[1], r: r(), q: r(), z: r(), s: s * (0.75 + 0.5 * r()), ph: r() * TAU, o: [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 2 - 1] }); }
  function seg(d, a, b, bend) {
    var mx = (a[0] + b[0]) / 2 + bend, my = (a[1] + b[1]) / 2 - Math.abs(bend) * 0.3;
    byD[d].push(a[0], a[1], mx, my, mx, my, b[0], b[1]);
  }
  for (i = 0; i < c.nL; i++) {
    var th0 = (i / (c.nL - 1) - 0.5) * 2 * c.span + (r() - 0.5) * 0.12, p1 = P(th0, 0.5 + 0.1 * r());
    seg(0, [0, -c.trunkH], p1, (r() - 0.5) * 5);
    tip(p1, 0.9);
    for (j = 0; j < 3; j++) {
      var th1 = th0 + (j - 1) * 0.3 + (r() - 0.5) * 0.1, p2 = P(th1, 0.76 + 0.1 * r());
      seg(1, p1, p2, (r() - 0.5) * 4);
      tip(p2, 1.0);
      for (k = 0; k < 3; k++) {
        var th2 = th1 + (k - 1) * 0.13 + (r() - 0.5) * 0.06, p3 = P(th2, 0.97 + 0.08 * r());
        seg(2, p2, p3, (r() - 0.5) * 2.5);
        tip(p3, 1.0);
      }
    }
  }
  return { byD: byD.map(function (a) { return new Float32Array(a); }), tips: tips };
}
(function () {
  var u = SP[0], g = growDome(mulberry32(31337), DOME);
  u.cfg = { widths: [7, 3.6, 1.8], bark: '#8b8468', barkDark: '#6e6850', R0: 8.2, nb: 4, leaf: [112, 158, 66], young: [176, 204, 98], old: [190, 160, 70], shade: [60, 100, 50] };
  u.byD = g.byD; u.tips = g.tips; u.h = DOME.trunkH + DOME.b; u.trunkH = DOME.trunkH;
})();
function drawTrunkSp(sp) {
  var x = sp.x, y = sp.y, th = sp.trunkH, c = sp.cfg;
  ctx.fillStyle = c.bark; ctx.strokeStyle = c.barkDark; ctx.lineWidth = 1; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 17, y + 1.5);
  ctx.quadraticCurveTo(x - 10, y - 2, x - 8.8, y - th * 0.5);
  ctx.lineTo(x - 8.2, y - th - 1); ctx.lineTo(x + 8.2, y - th - 1); ctx.lineTo(x + 8.8, y - th * 0.5);
  ctx.quadraticCurveTo(x + 10, y - 2, x + 17, y + 1.5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 3.4, y - 3); ctx.lineTo(x - 2.8, y - th); ctx.moveTo(x + 3.6, y - 3); ctx.lineTo(x + 3.2, y - th); ctx.stroke();
}
var SPX = SP.map(function (s) { return s.x; });
near.forEach(function (p) { p.hidden = SPX.some(function (sx) { return Math.abs(p.x - sx) < 64; }) || soilD(p.x) < 30; });
var vis = near.filter(function (p) { return !p.hidden; });
rootRef = vis[Math.min(3, vis.length - 1)];
succ[0][0] = 222; succ[1][0] = 338; succ[2][0] = 470; succ[3][0] = 655; succ[4][0] = 772;
cacti.length = 0;

/* ---------- raízes ajustadas ao solo raso ---------- */
/* Base na literatura: raízes concentradas nos primeiros 20 a 40 cm e espalhadas na horizontal (Wright et al., 2021; Cavalcanti et al., 2006);
   cactos com raízes muito rasas (Nobel, 2009, cactos do deserto de Sonora, evidência indireta); só o juazeiro, perenifólio, recebe raízes
   dentro de fraturas da rocha (Carvalho, 2007; Wright et al., 2021, hipótese dos autores). */
function genRoots2(r, x0, y0, o) {
  var res = { thick: new Path2D(), main: new Path2D(), fine: new Path2D(), tub: [], fr: [], w: o.w || [2.6, 1.5, 0.85] };
  var i, j, k, s, x, y;
  if (o.onRock) {
    for (i = 0; i < 6; i++) {
      s = i % 2 ? 1 : -1; var len = 14 + r() * 24; x = x0 + s * (2 + r() * 4); y = y0 + 1.2;
      res.main.moveTo(x, y);
      for (j = 1; j <= 5; j++) { x += s * len / 5; y = groundY(x) - outcropH(x) + 1.4 + (r() - 0.3) * 1.4; res.main.lineTo(x, y); }
      res.main.lineTo(x + s * 2, y + 5 + r() * 4);
    }
    for (k = 0; k < o.rock.length; k++) {
      var sx = x0 + (k - 1) * 7 + (r() - 0.5) * 3, pts = [sx, y0 + 1.5], yy = y0 + 1.5, xx = sx, th = (r() - 0.5) * 0.4;
      while (yy < y0 + o.rock[k]) { th += (r() - 0.5) * 0.5 - th * 0.2; xx += Math.sin(th) * 3.2; yy += Math.cos(th) * 3.2; pts.push(xx, yy); }
      res.fr.push(pts);
      res.main.moveTo(pts[0], pts[1]); for (j = 2; j < pts.length; j += 2) res.main.lineTo(pts[j], pts[j + 1]);
    }
    return res;
  }
  for (i = 0; i < o.lat; i++) {
    s = i % 2 ? 1 : -1;
    var f = o.df[0] + (o.df[1] - o.df[0]) * r(), reach = o.reach * (0.55 + 0.45 * r()), steps = 16, sl = reach / steps, pts2 = [];
    x = x0 + s * (1 + r() * 3); y = y0 + 2; res.main.moveTo(x, y); res.thick.moveTo(x, y);
    for (j = 1; j <= steps; j++) {
      var px = x, py = y;
      x += s * sl * (0.92 + 0.16 * r());
      if (soilD(x) < 14 || x < -60 || x > W + 60) break;
      y += (groundY(x) + f * soilD(x) + (r() - 0.5) * 3 - y) * 0.33 + (r() - 0.5) * 1.2;
      y = Math.max(groundY(x) + 2, Math.min(soilBase(x) - 2, y));
      res.main.lineTo(x, y); pts2.push([x, y]);
      if (j <= 4) res.thick.lineTo(x, y);
      if (j % 2 === 0 && j < steps - 1 && r() < o.fine) {
        var up = r() < 0.4, fa = (up ? -1 : 1) * (0.5 + r() * 0.6), fx = x, fy = y, nb = 3 + Math.floor(r() * 3);
        res.fine.moveTo(fx, fy);
        for (k = 0; k < nb; k++) {
          fa += (r() - 0.5) * 0.5; fx += s * Math.cos(fa) * sl * 0.5; fy += Math.sin(fa) * sl * 0.5;
          fy = Math.max(groundY(fx) + 1.5, Math.min(soilBase(fx) - 1.5, fy)); res.fine.lineTo(fx, fy);
        }
      }
    }
    if (o.tub && i < o.tub && pts2.length > 6) { var tp = pts2[3 + Math.floor(r() * 4)]; res.tub.push([tp[0], tp[1], 4.2 + r() * 2.4, 3 + r() * 1.6]); }
    if (o.tubEnd && pts2.length > 5) {
      /* bulbo na ponta da raiz (ou no ponto mais distante que ainda tenha espaço no solo) e, em parte das raízes, outro menor no meio */
      var want = [[pts2.length - 1, 6.6 + r() * 3.6]];
      if (pts2.length > 9) want.push([4 + Math.floor(r() * 3), 4.4 + r() * 2.0]);
      for (var wi = 0; wi < want.length; wi++) {
        for (var ix = want[wi][0]; ix >= 3; ix--) {
          var pq = pts2[ix], dq = soilBase(pq[0]) - pq[1] - 2, rq = want[wi][1], ryq = Math.min(rq * (0.78 + r() * 0.18), (dq - 2) / 2.2), near = false, tq;
          if (ryq < 3.2) continue;
          var rxq = Math.min(rq, ryq * 1.35);
          for (tq = 0; tq < res.tub.length; tq++) if (Math.abs(res.tub[tq][0] - pq[0]) < rxq + res.tub[tq][2] + 3 && Math.abs(res.tub[tq][1] - (pq[1] + 2 + ryq)) < ryq + res.tub[tq][3] + 3) near = true;
          if (near) continue;
          res.tub.push([pq[0], pq[1] + 2 + ryq, rxq, ryq, pq[0], pq[1]]);
          break;
        }
      }
    }
  }
  if (o.tub) {
    for (i = res.tub.length; i < o.tub; i++) {
      s = i % 2 ? 1 : -1; var tx = x0 + s * (24 + r() * 56), ty = groundY(tx) + soilD(tx) * (0.34 + 0.24 * r());
      if (soilD(tx) > 18) res.tub.push([tx, ty, 4.2 + r() * 2.4, 3 + r() * 1.6]);
    }
  }
  for (i = 0; i < (o.sink || 0); i++) {
    var sx2 = x0 + (i - (o.sink - 1) / 2) * 9 + (r() - 0.5) * 3, yy2 = y0 + 2, xx2 = sx2, th2 = (r() - 0.5) * 0.3;
    var pts3 = [sx2, yy2], target = o.rock ? rockTop(sx2) + o.rock[i % o.rock.length] : soilBase(sx2) + (o.sap || 0.5) * sapD(sx2), rockPts = null;
    res.main.moveTo(sx2, yy2); res.thick.moveTo(sx2, yy2);
    while (yy2 < target) {
      th2 += (r() - 0.5) * 0.45 - th2 * 0.25; xx2 += Math.sin(th2) * 3.4; yy2 += Math.cos(th2) * 3.4;
      res.main.lineTo(xx2, yy2); if (yy2 < y0 + 14) res.thick.lineTo(xx2, yy2);
      if (o.rock && yy2 > rockTop(xx2)) { if (!rockPts) rockPts = [xx2, yy2]; else rockPts.push(xx2, yy2); }
      else if (r() < 0.22) { res.fine.moveTo(xx2, yy2); var sg = r() < 0.5 ? -1 : 1; res.fine.lineTo(xx2 + sg * (7 + r() * 8), Math.min(yy2 + 2 + r() * 4, rockTop(xx2) - 1)); }
    }
    if (rockPts) res.fr.push(rockPts);
  }
  return res;
}
var ROOTP = {
  umbu: { lat: 6, reach: 125, df: [0.18, 0.55], fine: 0.5, tub: 7 },
  facheiro: { lat: 8, reach: 92, df: [0.06, 0.28], fine: 0.85, w: [1.6, 1.1, 0.7] },
  aroeira: { lat: 5, reach: 108, df: [0.2, 0.7], fine: 0.5, sink: 1, sap: 0.55 },
  juazeiro: { lat: 6, reach: 132, df: [0.2, 0.8], fine: 0.5, sink: 2, rock: [64, 40] },
  ipe: { lat: 5, reach: 104, df: [0.2, 0.7], fine: 0.5, sink: 1, sap: 0.8 },
  mandacaru: { onRock: true, rock: [11, 15, 9], w: [1.6, 1.1, 0.7] }
};
var rngR = mulberry32(9090);
SP.forEach(function (sp) { sp.rt = genRoots2(rngR, sp.x, sp.y, ROOTP[sp.id]); });
/* umbuzeiro: raízes longas e horizontais, com xilopódios ("batatas") nas pontas (Lima Filho, 2011); forma geral conforme a logo enviada.
   Gerador próprio (outra semente), para não mexer nas raízes das outras plantas. */
var ROOTP_UMBU = { lat: 8, reach: 128, df: [0.2, 0.58], fine: 0.4, tubEnd: true, w: [3.8, 2.1, 1.0] };
SP[0].rt = genRoots2(mulberry32(4242), SP[0].x, SP[0].y, ROOTP_UMBU);
near.forEach(function (p) {
  if (p.hidden) return;
  p.rt = genRoots2(rngR, p.x, p.y, { lat: 4, reach: 40 + p.h * 0.55, df: [0.2, 0.65], fine: 0.45, sink: p.h > 70 ? 1 : 0, sap: 0.4, w: [1.9, 1.1, 0.7] });
});
/* vegetação de preenchimento no plano das espécies: árvores e arbustos entre elas (e parcialmente atrás delas), com raízes no solo.
   Sementes próprias, para não alterar a sequência aleatória das demais plantas. As plantas "near" originais ficam ocultas perto das espécies. */
var fill = (function () {
  var r = mulberry32(60606), rr = mulberry32(9191), out = [];
  /* [x, altura do tronco/ramos em px]: alturas até ~100 são árvores pequenas; abaixo disso, arbustos */
  [[14, 46], [222, 54], [330, 96], [372, 44], [440, 40], [500, 38], [592, 50], [632, 90], [752, 58], [796, 86], [880, 56], [922, 98], [951, 42]].forEach(function (d) {
    var x = d[0], q, off = [0, 14, -14, 28, -28, 42, -42];
    for (q = 0; q < off.length; q++) { if (outcropH(x + off[q]) < 0.5 && soilD(x + off[q]) > 26) { x += off[q]; break; } }
    var p = mkPlant(r, x, groundY(x) + 1 + r() * 3, d[1] * (0.92 + 0.16 * r()), 1);
    p.hidden = false; p.cheap = true;
    if (d[1] < 70) { var g = genPlant(r, d[1], 2), n = g.tips.length; p.byD = g.byD; p.tips = g.tips; p.h = g.h; p.tx = new Float32Array(n); p.ty = new Float32Array(n); p.rr = new Float32Array(n); }
    p.rt = genRoots2(rr, p.x, p.y, { lat: 3, reach: 30 + p.h * 0.5, df: [0.2, 0.62], fine: 0.4, sink: p.h > 80 ? 1 : 0, sap: 0.4, w: [1.8, 1.0, 0.6] });
    out.push(p);
  });
  out.sort(function (a, b) { return a.y - b.y; });
  return out;
})();
allPlants = allPlants.concat(fill);
herbsFg = herbsFg.filter(function (h) { return outcropH(h.x) < 0.5 && soilD(h.x) > 22; });
litFg = litFg.filter(function (f) { return outcropH(f.x) < 0.5 && soilD(f.x) > 18; });

function updateSpecies() {
  var pos = calPos(phase);
  SP.forEach(function (sp) {
    var s = sp.st;
    s.lv = sampM(sp.Lf, pos); s.fl = sampM(sp.Ff, pos); s.fr = sampM(sp.Rf, pos); s.ma = sampM(sp.Mf, pos);
    s.rise = sampM(sp.Lf, pos + 0.04) - sampM(sp.Lf, pos - 0.04);
  });
}
function drawDots(cx, cy, n, rad, spread, off, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (var j = 0; j < n; j++) { var bx = cx + off[(2 * j) % 6] * spread, by = cy + off[(2 * j + 1) % 6] * spread * 0.8; ctx.moveTo(bx + rad, by); ctx.arc(bx, by, rad, 0, TAU); }
  ctx.fill();
}
function drawTreeSp(sp) {
  var s = sp.st, x = sp.x, y = sp.y, cfg = sp.cfg, k, d, arr, j, t;
  ctx.lineCap = 'round';
  if (sp.trunkH) drawTrunkSp(sp);
  for (d = 0; d < sp.byD.length; d++) {
    arr = sp.byD[d]; if (!arr.length) continue;
    ctx.strokeStyle = cfg.bark; ctx.lineWidth = cfg.widths[d]; ctx.beginPath();
    for (k = 0; k < arr.length; k += 4) { ctx.moveTo(x + arr[k], y + arr[k + 1]); ctx.lineTo(x + arr[k + 2], y + arr[k + 3]); }
    ctx.stroke();
    if (cfg.furrow && d < 2) {
      ctx.strokeStyle = cfg.barkDark; ctx.lineWidth = 0.9; ctx.beginPath();
      for (k = 0; k < arr.length; k += 4) { var w = cfg.widths[d] * 0.22; ctx.moveTo(x + arr[k] - w, y + arr[k + 1]); ctx.lineTo(x + arr[k + 2] - w, y + arr[k + 3]); ctx.moveTo(x + arr[k] + w, y + arr[k + 1]); ctx.lineTo(x + arr[k + 2] + w, y + arr[k + 3]); }
      ctx.stroke();
    }
  }
  var lv = s.lv, n = sp.tips.length, R0 = cfg.R0, col;
  if (lv > 0.02) {
    if (s.rise > 0.004) col = mix(cfg.young, cfg.leaf, clamp(lv)); else if (s.rise < -0.004) col = mix(cfg.old, cfg.leaf, clamp(lv * 1.3)); else col = cfg.leaf;
    var col2 = mix(col, cfg.shade, 0.25), col3 = mix(col, cfg.shade, 0.7), amp = 1.2 * (0.6 + 0.4 * Math.sin(T * 0.45 + x * 0.01));
    var tx = [], ty = [], rr = [];
    for (k = 0; k < n; k++) {
      t = sp.tips[k]; var lt = clamp((lv - t.r * 0.55) / 0.45);
      rr[k] = lt < 0.03 ? 0 : R0 * t.s * (0.35 + 0.65 * lt);
      tx[k] = x + t.x + Math.sin(T * 1.2 + t.ph) * amp * clamp(-t.y / sp.h); ty[k] = y + t.y;
    }
    ctx.fillStyle = rgb(col3, 0.55); ctx.beginPath();
    for (k = 0; k < n; k++) { if (!rr[k]) continue; ctx.moveTo(tx[k] + rr[k] * 1.05, ty[k] + 2.4); ctx.arc(tx[k], ty[k] + 2.4, rr[k] * 1.05, 0, TAU); }
    ctx.fill();
    for (var par = 0; par < 2; par++) {
      ctx.fillStyle = rgb(par ? col2 : col); ctx.beginPath();
      for (k = par; k < n; k += 2) {
        if (!rr[k]) continue; t = sp.tips[k];
        for (j = 0; j < cfg.nb; j++) { var bx = tx[k] + t.o[2 * j] * R0 * 0.85, by = ty[k] + t.o[2 * j + 1] * R0 * 0.7, rad = rr[k] * (1 - 0.12 * j); ctx.moveTo(bx + rad, by); ctx.arc(bx, by, rad, 0, TAU); }
      }
      ctx.fill();
    }
  }
  var posx = function (k2) { var tt = sp.tips[k2]; return x + tt.x + Math.sin(T * 1.2 + tt.ph) * 1.2 * clamp(-tt.y / sp.h); };
  if (s.fl > 0.02) {
    for (k = 0; k < n; k++) {
      t = sp.tips[k]; if (t.q > s.fl * 1.05) continue;
      var fx = posx(k), fy = y + t.y;
      if (sp.id === 'ipe') drawDots(fx, fy, 7, 2.7, 6.5, t.o, 'rgba(228,96,160,0.95)');
      else if (sp.id === 'aroeira') drawDots(fx, fy, 6, 1.6, 5.5, t.o, 'rgba(246,234,196,0.95)');
      else if (sp.id === 'umbu') drawDots(fx, fy, 6, 1.7, 6, t.o, 'rgba(252,252,246,0.95)');
      else drawDots(fx, fy, 5, 1.3, 5, t.o, 'rgba(206,214,104,0.9)');
    }
  }
  if (s.fr > 0.02) {
    for (k = 0; k < n; k++) {
      t = sp.tips[k]; if (t.z > s.fr * 1.05) continue;
      var gx = posx(k) + t.o[0] * 4, gy = y + t.y + 5 + t.o[1] * 2;
      if (sp.id === 'ipe') {
        ctx.strokeStyle = rgb(mix([120, 132, 80], [98, 76, 52], clamp(s.ma)), 0.95); ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath();
        for (j = 0; j < 3; j++) { ctx.moveTo(gx + (j - 1) * 2.6, gy - 2); ctx.lineTo(gx + (j - 1) * 2.6 + (j - 1) * 0.8, gy + 8 + t.o[j] * 1.5); }
        ctx.stroke();
      } else if (sp.id === 'aroeira') drawDots(gx, gy, 5, 1.9, 4, t.o, rgb(mix([120, 150, 70], [132, 34, 54], clamp(s.ma))));
      else if (sp.id === 'umbu') drawDots(gx, gy, 3, 3.6, 4.5, t.o, rgb(mix([108, 150, 58], [200, 192, 84], clamp(s.ma))));
      else drawDots(gx, gy, 3, 2.7, 4, t.o, rgb(mix([150, 172, 74], [236, 198, 72], clamp(s.ma))));
    }
  }
}
/* cactos: um só verde no corpo inteiro (tronco, colunas e braços): um pouco amarelado na chuva e verde-escuro quase preto na seca (descrição do usuário) */
var CACW = { stem: [136, 164, 68], rib: [98, 126, 48] };
var CACD = { stem: [30, 44, 31], rib: [17, 27, 20] };
function cactusCols() {
  var u = smooth(0.1, 0.42, st.S);
  return { stem: rgb(mix(CACD.stem, CACW.stem, u)), rib: rgb(mix(CACD.rib, CACW.rib, u)) };
}
function drawCactusTrunk(x, y, th, w, c) {
  ctx.lineCap = 'round'; ctx.strokeStyle = c.stem; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - th); ctx.stroke();
  ctx.strokeStyle = c.rib; ctx.lineWidth = 0.9; ctx.beginPath();
  ctx.moveTo(x - w * 0.24, y - 2); ctx.lineTo(x - w * 0.24, y - th + 2); ctx.moveTo(x + w * 0.24, y - 2); ctx.lineTo(x + w * 0.24, y - th + 2); ctx.stroke();
}
function cactusTips1(sp) {
  var x = sp.x, y = sp.y, h = sp.h, arms = [[-1, 0.30, 0.66, 15], [1, 0.36, 0.74, 17], [-1, 0.44, 0.84, 24], [1, 0.5, 0.9, 27], [1, 0.26, 0.54, 31]], out = [{ x: x, y: y - h }], i;
  for (i = 0; i < arms.length; i++) { var a = arms[i]; out.push({ x: x + a[0] * a[3], y: y - h * a[2] }); }
  return out;
}
function drawMandacaru(sp) {
  var x = sp.x, y = sp.y, h = sp.h, s = sp.st, i, a, c = cactusCols();
  var arms = [[-1, 0.30, 0.66, 15], [1, 0.36, 0.74, 17], [-1, 0.44, 0.84, 24], [1, 0.5, 0.9, 27], [1, 0.26, 0.54, 31]];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  drawCactusTrunk(x, y, h * 0.3, 12, c);
  ctx.strokeStyle = c.stem; ctx.lineWidth = 9.5; ctx.beginPath(); ctx.moveTo(x, y - h * 0.28); ctx.lineTo(x, y - h); ctx.stroke();
  for (i = 0; i < arms.length; i++) {
    a = arms[i]; var yb = y - h * a[1], xe = x + a[0] * a[3], ye = y - h * a[2];
    ctx.strokeStyle = c.stem; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, yb); ctx.quadraticCurveTo(xe, yb, xe, ye); ctx.stroke();
    ctx.strokeStyle = c.rib; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + a[0] * 2, yb - 1); ctx.quadraticCurveTo(xe + a[0] * 1.5, yb - 1, xe + a[0] * 1.5, ye + 2); ctx.stroke();
  }
  ctx.strokeStyle = c.rib; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - 2.2, y - h * 0.3); ctx.lineTo(x - 2.2, y - h + 2); ctx.moveTo(x + 2.2, y - h * 0.3); ctx.lineTo(x + 2.2, y - h + 2); ctx.stroke();
  var tp = cactusTips1(sp), k, t;
  for (k = 0; k < tp.length; k++) {
    t = tp[k];
    if (s.fr > 0.02 && sp.q[k] < s.fr * 1.05) { ctx.fillStyle = '#86254a'; ctx.beginPath(); ctx.ellipse(t.x + 4.6, t.y + 9, 3.6, 5, 0.25, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(t.x + 3.8, t.y + 7.5, 1, 1.6, 0.25, 0, TAU); ctx.fill(); }
    if (s.fl > 0.02 && sp.q[(k + 3) % 8] < s.fl * 1.05) {
      ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = 'rgba(120,120,100,0.5)'; ctx.lineWidth = 0.6;
      for (var pt = 0; pt < 9; pt++) { var an = pt / 9 * TAU; ctx.beginPath(); ctx.ellipse(t.x + Math.cos(an) * 4.6, t.y - 3 + Math.sin(an) * 3.6, 4.2, 1.8, an, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#f2d472'; ctx.beginPath(); ctx.arc(t.x, t.y - 3, 2.2, 0, TAU); ctx.fill();
    }
  }
}
/* facheiro: tronco lenhoso curto; acima dele, ramos que se abrem em leque e se ramificam de novo em alturas diferentes,
   cada coluna curvando-se para a vertical; topos desiguais e copa assimétrica (foto enviada pelo usuário). Semente própria. */
var FACH = null;
function genFacheiro(h) {
  var r = mulberry32(48151), cols = [], tips = [], yT = -h * 0.33;
  function col(x, y, a, len, w, depth) {
    var pts = [x, y], n = Math.max(4, Math.round(len / 6)), sl = len / n, k, kids = [];
    var lean = a * (depth ? 0.15 : 0.28) + (r() - 0.5) * 0.08;
    for (k = 0; k < n; k++) {
      a += (lean - a) * (depth ? 0.32 : (k < 3 ? 0.16 : 0.24)) + (r() - 0.5) * 0.07;
      x += Math.sin(a) * sl; y -= Math.cos(a) * sl; pts.push(x, y);
      if (depth < 2 && k >= 1 && k < n - 2 && r() < (depth ? 0.12 : 0.34)) kids.push([x, y, a]);
    }
    cols.push({ p: pts, w: w });
    tips.push({ x: x, y: y, dir: a < 0 ? -1 : 1 });
    kids.forEach(function (c) {
      var s = r() < 0.5 ? -1 : 1, rem = Math.max(14, (-h * (0.6 + r() * 0.42)) - c[1]);
      col(c[0], c[1], c[2] + s * (0.3 + r() * 0.25), Math.abs(rem) * 1.1, w * 0.88, depth + 1);
    });
  }
  /* ramos primários: [desvio x no topo do tronco, ângulo inicial, topo alvo em fração de h] */
  var P = [[-2.5, -1.0, 0.68], [-1.5, -0.62, 0.9], [0, -0.1, 1.02], [1.5, 0.45, 0.84], [3, 1.05, 0.95]];
  for (var i = 0; i < P.length; i++) {
    var y0 = yT + (r() - 0.5) * 5, top = -h * (P[i][2] + (r() - 0.5) * 0.08);
    col(P[i][0], y0, P[i][1] + (r() - 0.5) * 0.15, (y0 - top) * (1 + 0.32 * Math.abs(P[i][1])), 5.4, 0);
  }
  return { cols: cols, tips: tips, yT: yT };
}
function drawFacheiro(sp) {
  var x = sp.x, y = sp.y, h = sp.h, s = sp.st, i, k, q, t, c = cactusCols();
  if (!FACH) FACH = genFacheiro(h);
  var yT = FACH.yT;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* tronco lenhoso castanho-acinzentado, mais grosso na base */
  ctx.fillStyle = '#6e5e4f'; ctx.strokeStyle = 'rgba(40,30,24,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath();
  ctx.moveTo(x - 6.5, y + 1); ctx.quadraticCurveTo(x - 4, y + yT * 0.5, x - 3.6, y + yT - 1);
  ctx.lineTo(x + 4, y + yT - 1); ctx.quadraticCurveTo(x + 4.6, y + yT * 0.5, x + 7, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(40,30,24,0.45)'; ctx.lineWidth = 0.7; ctx.beginPath();
  ctx.moveTo(x - 1.5, y - 2); ctx.lineTo(x - 1, y + yT * 0.85); ctx.moveTo(x + 2.4, y - 4); ctx.lineTo(x + 2, y + yT * 0.6); ctx.stroke();
  for (i = 0; i < FACH.cols.length; i++) {
    var p = FACH.cols[i].p;
    ctx.strokeStyle = c.stem; ctx.lineWidth = FACH.cols[i].w; ctx.beginPath(); ctx.moveTo(x + p[0], y + p[1]);
    for (q = 2; q < p.length; q += 2) ctx.lineTo(x + p[q], y + p[q + 1]);
    ctx.stroke();
  }
  ctx.strokeStyle = c.rib; ctx.lineWidth = 0.7; ctx.beginPath();
  for (i = 0; i < FACH.cols.length; i++) {
    var pr = FACH.cols[i].p, o = FACH.cols[i].w * 0.28;
    for (var sg = -1; sg <= 1; sg += 2) {
      for (q = 2; q < pr.length - 2; q += 2) {
        var dx = pr[q + 2] - pr[q - 2], dy = pr[q + 3] - pr[q - 1], d = Math.hypot(dx, dy) || 1, nx = -dy / d * o * sg, ny = dx / d * o * sg;
        if (q === 2) ctx.moveTo(x + pr[q] + nx, y + pr[q + 1] + ny); else ctx.lineTo(x + pr[q] + nx, y + pr[q + 1] + ny);
      }
    }
  }
  ctx.stroke();
  for (k = 0; k < FACH.tips.length; k++) {
    t = { x: x + FACH.tips[k].x, y: y + FACH.tips[k].y, dir: FACH.tips[k].dir };
    if (s.fr > 0.02 && sp.q[k % 8] < s.fr * 1.05 && k % 2 === 0) { ctx.fillStyle = '#b02a62'; ctx.beginPath(); ctx.arc(t.x + t.dir * 4, t.y + 8, 3, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(t.x + t.dir * 3.2, t.y + 7, 1, 0, TAU); ctx.fill(); }
    if (s.fl > 0.02 && sp.q[(k + 2) % 8] < s.fl * 1.05 && k % 2 === 1) {
      ctx.fillStyle = '#b0687e'; ctx.beginPath(); ctx.ellipse(t.x + t.dir * 3.3, t.y + 2, 3.3, 4.8, t.dir * 0.8, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,250,0.95)'; ctx.beginPath(); ctx.ellipse(t.x + t.dir * 5.2, t.y + 0.4, 2.2, 3, t.dir * 0.8, 0, TAU); ctx.fill();
    }
  }
}
/* ---------- fauna: carcarás (Caracara plancus) e tatu-bola (Tolypeutes tricinctus) ----------
   Ilustração: tamanhos exagerados para leitura (na escala da cena, ~18 px por metro, o tatu teria ~8 px e o carcará pousado ~10 px).
   Aparência conforme as fotos enviadas pelo usuário: carcará com boné preto, face nua alaranjada, bico azulado, pescoço creme,
   corpo castanho-escuro, cauda clara com faixa terminal escura e pernas amarelas; tatu-bola amarelado com escudos e três cintas,
   que se enrola em bola. Comportamento em tempo real, independente do ciclo do ano. */
var FAUNA = true;
var fT = 0, fLast = 0, tatu = { x: -20, dir: 1, roll: 0, state: 'walk', wait: 0, rollAt: 300, ph: 0 };
function faunaTick() {
  var now = performance.now() / 1000, dt = fLast ? Math.min(0.1, now - fLast) : 0; fLast = now;
  if (!reduce) fT += dt;
  return dt;
}
/* carcará em voo, de perfil; f: abertura das asas (-1 a 1); d: direção (+1 direita) */
function drawCaracaraFly(x, y, d, s, f) {
  ctx.save(); ctx.translate(x, y); ctx.scale(d * s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  function wing(ox, L, col) {
    var ty = -1 - L * f, tx = -4 + ox - Math.abs(f) * 1.5;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(3.5 + ox, -1);
    ctx.quadraticCurveTo(2 + ox, ty * 0.6, tx + 1.2, ty);
    ctx.lineTo(tx - 1.4, ty + (f > 0 ? 1.4 : -1.4)); ctx.lineTo(tx - 2.6, ty + (f > 0 ? 2.8 : -2.8));
    ctx.quadraticCurveTo(-5 + ox, ty * 0.35, -5.5 + ox, -0.2); ctx.closePath(); ctx.fill();
    /* janela clara nas primárias */
    ctx.fillStyle = 'rgba(236,226,204,0.9)'; ctx.beginPath(); ctx.ellipse(tx - 0.2, ty * 0.78, 1.5, 1.9, 0.2, 0, TAU); ctx.fill();
  }
  wing(2, 12, '#2a1f18');
  /* cauda em leque: clara com barras e faixa terminal escura */
  ctx.fillStyle = '#eadcc0'; ctx.beginPath(); ctx.moveTo(-7, -1.6); ctx.lineTo(-15, -3); ctx.lineTo(-15.5, 2.2); ctx.lineTo(-7, 1.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(80,60,44,0.55)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-10, -2.1); ctx.lineTo(-10.2, 1.8); ctx.moveTo(-12, -2.5); ctx.lineTo(-12.2, 2); ctx.stroke();
  ctx.fillStyle = '#2a1e17'; ctx.beginPath(); ctx.moveTo(-13.4, -2.7); ctx.lineTo(-15.8, -3.1); ctx.lineTo(-16.2, 2.3); ctx.lineTo(-13.6, 2); ctx.closePath(); ctx.fill();
  /* corpo, peito barrado, cabeça */
  ctx.fillStyle = '#3b2a1e'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3, -0.04, 0, TAU); ctx.fill();
  ctx.fillStyle = '#efe4cc'; ctx.beginPath(); ctx.ellipse(-6.6, 1.1, 2, 1.3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#cdb68e'; ctx.beginPath(); ctx.ellipse(5.4, 0.2, 2.6, 2.3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#efe4cc'; ctx.beginPath(); ctx.ellipse(7.6, -0.9, 2.6, 2.4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(9.6, -1.7, 2.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b1512'; ctx.beginPath(); ctx.arc(9.4, -2.2, 2.45, Math.PI * 0.98, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8622c'; ctx.beginPath(); ctx.ellipse(11, -1.4, 1.4, 1.1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#a9bccb'; ctx.beginPath(); ctx.moveTo(11.9, -2.1); ctx.quadraticCurveTo(14.2, -1.9, 13.8, -0.1); ctx.lineTo(11.9, -0.7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e7b52a'; ctx.beginPath(); ctx.ellipse(-3.4, 2.8, 1.8, 0.8, 0.25, 0, TAU); ctx.fill();
  wing(0, 14, '#45321f');
  ctx.restore();
}
/* carcará pousado, ereto como na foto; d: para onde olha */
function drawCaracaraPerch(x, y, d, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(d * s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  /* cauda longa para baixo e para trás: clara com barras, ponta escura */
  ctx.fillStyle = '#eadcc0'; ctx.beginPath(); ctx.moveTo(-2.4, -8); ctx.lineTo(-6.6, 0.8); ctx.lineTo(-4.4, 1.6); ctx.lineTo(-0.6, -7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a1e17'; ctx.beginPath(); ctx.moveTo(-6, -0.6); ctx.lineTo(-7.2, 2); ctx.lineTo(-4.6, 3); ctx.lineTo(-3.8, 0.4); ctx.closePath(); ctx.fill();
  /* corpo e asa dobrada */
  ctx.fillStyle = '#3b2a1e'; ctx.beginPath(); ctx.ellipse(0.6, -11.4, 3.4, 6.2, -0.38, 0, TAU); ctx.fill();
  ctx.fillStyle = '#efe4cc'; ctx.beginPath(); ctx.ellipse(1.6, -6.6, 1.8, 1.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a1f18'; ctx.beginPath(); ctx.moveTo(1.6, -16); ctx.quadraticCurveTo(-3.6, -14, -4.6, -4.2); ctx.lineTo(-2.4, -5.4); ctx.quadraticCurveTo(0, -10, 2.4, -12.6); ctx.closePath(); ctx.fill();
  /* pernas amarelas */
  ctx.strokeStyle = '#e7b52a'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(0.8, 0); ctx.moveTo(2.6, -6); ctx.lineTo(2.8, 0); ctx.stroke();
  ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.lineTo(2.2, 0); ctx.moveTo(1.6, 0); ctx.lineTo(4.4, 0); ctx.stroke();
  /* peito barrado, pescoço creme, cabeça */
  ctx.fillStyle = '#cdb68e'; ctx.beginPath(); ctx.ellipse(3, -13.8, 2, 3.2, -0.25, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(70,50,34,0.55)'; ctx.lineWidth = 0.4; ctx.beginPath(); for (var k = 0; k < 4; k++) { ctx.moveTo(1.6, -15 + k * 1.3); ctx.lineTo(4.6, -15.4 + k * 1.3); } ctx.stroke();
  ctx.fillStyle = '#efe4cc'; ctx.beginPath(); ctx.ellipse(3.4, -17.4, 2.1, 2.3, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3.6, -19.6, 2.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b1512'; ctx.beginPath(); ctx.arc(3.4, -20.1, 2.45, Math.PI * 0.98, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8622c'; ctx.beginPath(); ctx.ellipse(5.2, -19.4, 1.4, 1.1, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#a9bccb'; ctx.beginPath(); ctx.moveTo(6.1, -20.1); ctx.quadraticCurveTo(8.3, -19.9, 7.9, -18.1); ctx.lineTo(6.1, -18.7); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/* trajetórias (tempo t em s dentro de um ciclo de 70 s) */
function caracaras() {
  var t = fT % 70, out = [], sp = SP[5], px = sp.x + 27, py = sp.y - sp.h * 0.9 - 3.4; /* pousa na ponta do braço mais alto à direita */
  function cross(t0, dur, x0, x1, y0, amp, s) {
    var u = (t - t0) / dur; if (u < 0 || u > 1) return;
    var x = x0 + (x1 - x0) * u, flap = (Math.sin(t * 3.1 + x0) > 0.55) ? Math.sin(t * 15) : 0.35;
    out.push({ x: x, y: y0 + amp * Math.sin(u * 5 + x0), d: x1 > x0 ? 1 : -1, s: s, f: flap, perch: false });
  }
  cross(2, 16, -60, W + 60, 30, 5, 1.5);
  cross(3.2, 17, -90, W + 40, 44, 5, 1.25);
  cross(46, 14, W + 60, -60, 36, 6, 1.4);
  /* o carcará que pousa no mandacaru */
  var a0 = 20, a1 = 31, p1 = 41, e1 = 46;
  if (t >= a0 && t < a1) {
    var u = (t - a0) / (a1 - a0), e = u * u * (3 - 2 * u), x = -60 + (px - 4 + 60) * e, y = 60 + (py - 7 - 60) * Math.pow(u, 1.6) - 30 * Math.sin(u * Math.PI) * (1 - u);
    out.push({ x: x, y: y, d: 1, s: 1.4, f: u > 0.85 ? Math.sin(t * 22) : (Math.sin(t * 2.4) > 0.6 ? Math.sin(t * 14) : 0.3), perch: false });
  } else if (t >= a1 && t < p1) {
    out.push({ x: px, y: py, d: (t - a1) % 6 < 3.5 ? -1 : 1, s: 1.15, perch: true });
  } else if (t >= p1 && t < e1) {
    var v = (t - p1) / (e1 - p1);
    out.push({ x: px + 6 + (W + 80 - px) * v * v, y: py - 8 - 120 * v, d: 1, s: 1.4, f: Math.sin(t * 18), perch: false });
  }
  return out;
}
function drawBirds() {
  var b = caracaras(), i;
  if (reduce) { drawCaracaraPerch(SP[5].x + 27, SP[5].y - SP[5].h * 0.9 - 3.4, -1, 1.15); return; }
  for (i = 0; i < b.length; i++) { if (b[i].perch) drawCaracaraPerch(b[i].x, b[i].y, b[i].d, b[i].s); else drawCaracaraFly(b[i].x, b[i].y, b[i].d, b[i].s, b[i].f); }
}
/* tatu-bola: anda pelo chão, para, enrola-se em bola por alguns segundos, desenrola e segue; ao sair da cena espera e volta */
function updateTatu(dt) {
  var T = tatu;
  if (T.state === 'out') { T.wait -= dt; if (T.wait <= 0) { T.state = 'walk'; T.dir = -T.dir; T.x = T.dir > 0 ? -40 : W + 40; T.rollAt = 160 + Math.random() * 640; } return; }
  if (T.state === 'walk') {
    T.x += T.dir * 16 * dt; T.ph += dt * 9;
    if (T.rollAt && Math.abs(T.x - T.rollAt) < 2) { T.state = 'roll'; T.wait = 5; T.rollAt = 0; }
    if (T.x > W + 40 || T.x < -40) { T.state = 'out'; T.wait = 10; }
  } else if (T.state === 'roll') {
    T.wait -= dt; T.roll = Math.min(1, T.roll + dt * 2.5);
    if (T.wait <= 0) T.state = 'unroll';
  } else if (T.state === 'unroll') { T.roll = Math.max(0, T.roll - dt * 2); if (T.roll <= 0) T.state = 'walk'; }
}
function drawTatu() {
  var T = tatu, x = T.x, y = groundY(T.x) - outcropH(T.x) + 1.2, s = 1.7, r = T.roll;
  if (reduce) { x = 600; y = groundY(600) + 1.2; r = 0; }
  if (x < -30 || x > W + 30) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(T.dir * s, s);
  var shell = '#cfa45a', dark = 'rgba(92,64,30,0.75)';
  if (r > 0.5) {
    var R = 6.2; ctx.fillStyle = shell; ctx.strokeStyle = dark; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, -R, R, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-R * 0.25, -2 * R + 0.5); ctx.lineTo(-R * 0.15, -0.5); ctx.moveTo(R * 0.15, -2 * R + 0.4); ctx.lineTo(R * 0.25, -0.5); ctx.moveTo(R * 0.5, -2 * R + 1.4); ctx.lineTo(R * 0.6, -1.4); ctx.stroke();
    ctx.fillStyle = '#c29548'; ctx.beginPath(); ctx.moveTo(R * 0.15, -R * 0.55); ctx.lineTo(R * 0.85, -R * 0.95); ctx.lineTo(R * 0.55, -R * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    var lg = Math.sin(T.ph) * 1.2;
    ctx.strokeStyle = '#6b5236'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(-4.5, -1.6); ctx.lineTo(-4.5 + lg, 0); ctx.moveTo(4, -1.6); ctx.lineTo(4 - lg, 0); ctx.stroke();
    ctx.fillStyle = '#b48c4a'; ctx.beginPath(); ctx.moveTo(7, -4.8); ctx.lineTo(12, -2.2); ctx.lineTo(11.5, -1.2); ctx.lineTo(6.4, -1.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9c7a44'; ctx.beginPath(); ctx.ellipse(7.4, -6.2, 1, 1.6, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b1512'; ctx.beginPath(); ctx.arc(9.4, -3.4, 0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = shell; ctx.strokeStyle = dark; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-8, -1.4); ctx.quadraticCurveTo(-8.4, -10.5, 0, -10.6); ctx.quadraticCurveTo(8.2, -10.4, 7.6, -1.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1.4, -10.5); ctx.lineTo(-1.6, -1.6); ctx.moveTo(0.6, -10.6); ctx.lineTo(0.6, -1.6); ctx.moveTo(2.6, -10.4); ctx.lineTo(2.8, -1.6); ctx.stroke();
    ctx.fillStyle = 'rgba(92,64,30,0.35)';
    for (var k = 0; k < 14; k++) { var a = -2.8 + k * 0.19, rr = k % 2 ? 5.2 : 7.4; ctx.beginPath(); ctx.arc(Math.cos(a) * rr * 0.95, -1.4 + Math.sin(a) * rr * 1.05, 0.6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#b48c4a'; ctx.beginPath(); ctx.moveTo(-8, -2.4); ctx.lineTo(-10, -1.2); ctx.lineTo(-8, -1.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,225,205,0.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-6, -1.4); ctx.lineTo(-6.4, 0.2); ctx.moveTo(5.5, -1.4); ctx.lineTo(5.8, 0.2); ctx.stroke();
  }
  ctx.restore();
}
function drawSpecies() {
  for (var i = 0; i < SP.length; i++) {
    var sp = SP[i];
    if (sp.kind === 'tree') drawTreeSp(sp); else if (sp.kind === 'cactus1') drawMandacaru(sp); else drawFacheiro(sp);
  }
  if (FAUNA) { var fdt = faunaTick(); if (!reduce) updateTatu(fdt); drawBirds(); }
}
/* ---------- estado ---------- */
var ctx = cv.getContext('2d');
var playing = true, speed = 1, phase = 0, CYCLE = 54, T = 0;
var leaves = [], accLeaf = 0;
var st = { S: 0, L: 0, H: 0, G: 0, GPP: 0, Reco: 0, NEE: 0, r: 0, cloud: 0, lit: 0, loss: 0, herbRise: 0, rainI: 0 };
var reduce = false;
try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
if (reduce) { playing = false; phase = 0.36; }

var cssW = 960;
function resize() {
  needDraw = true;
  var r = cv.getBoundingClientRect(), w = Math.max(280, r.width || 960), d = Math.min(2, window.devicePixelRatio || 1);
  cssW = w;
  cv.width = Math.round(w * d); cv.height = Math.round(w * d * H / W);
}
function computeState() {
  st.S = samp(sim.S, phase); st.L = samp(sim.L, phase); st.H = samp(sim.H, phase); st.G = samp(sim.G, phase);
  st.GPP = samp(sim.GPP, phase); st.Reco = samp(sim.Reco, phase); st.NEE = samp(sim.NEE, phase);
  st.r = samp(sim.r, phase); st.cloud = samp(sim.cloud, phase); st.lit = samp(sim.Lit, phase); st.loss = samp(sim.loss, phase);
  st.FW = samp(sim.FW, phase);
  st.herbRise = samp(sim.H, phase) - samp(sim.H, phase - 0.008);
  var gate = 0.5 + 0.5 * Math.sin(phase * TAU * 26 + 1.3);
  st.rainI = clamp(st.r * 1.2) * (0.25 + 0.75 * smooth(0.1, 0.7, gate)) * smooth(0.08, 0.3, st.r);
}
function plantLevel(p) {
  var ph = phase - p.shift;
  p.lv = samp(sim.L, ph) * p.amp;
  p.rise = p.lv - samp(sim.L, ph - 0.008) * p.amp;
}

/* ---------- partículas ---------- */
var LEAFC = [[150, 150, 56], [176, 134, 58], [160, 120, 50]];
function spawnLeaf() {
  for (var tries = 0; tries < 8; tries++) {
    var p = allPlants[(Math.random() * allPlants.length) | 0];
    if (p.hidden || p.lv < 0.05 || p.rise > -0.0005) continue;
    var t = p.tips[(Math.random() * p.tips.length) | 0];
    if (t.r > p.lv * 1.1) continue;
    leaves.push({ x: p.x + t.x, y: p.y + t.y, vy: 26 + Math.random() * 18, ph: Math.random() * TAU, a: Math.random() * TAU, gy: p.y + Math.random() * 5, f: p.layer ? 1 : 0.55, c: LEAFC[(Math.random() * 3) | 0], life: 1 });
    return;
  }
}
function update(dt, dph) {
  T += dt * speed;
  accLeaf += st.loss * dph * 380;
  while (accLeaf >= 1) { accLeaf -= 1; if (leaves.length < 280) spawnLeaf(); }
  for (var j = leaves.length - 1; j >= 0; j--) {
    var q = leaves[j]; q.y += q.vy * dt; q.x += Math.sin(T * 2 + q.ph) * 14 * dt; q.a += dt * 2;
    if (q.y >= q.gy) leaves.splice(j, 1);
  }
}

/* ---------- desenho ---------- */
function txt(s, x, y, o) {
  o = o || {};
  ctx.font = (o.w || 500) + ' ' + (o.sz || 12) + 'px ' + FONT;
  ctx.textAlign = o.al || 'left'; ctx.textBaseline = 'alphabetic';
  if (o.halo) { ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.c || '#16222a'; ctx.fillText(s, x, y);
}
var SKY_TXT = { c: '#16222a', halo: 'rgba(255,255,255,0.78)', sz: 12 };
var SOIL_TXT = { c: '#f6efe0', halo: 'rgba(30,20,14,0.7)', sz: 11.5 };
function leader(x0, y0, x1, y1, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x1, y1, 2.2, 0, TAU); ctx.fill();
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

function drawSky(pan) {
  var c = st.cloud, top = mix([186, 214, 232], [140, 164, 180], c), bot = mix([240, 232, 210], [200, 212, 212], c);
  var g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  var sa = 1 - clamp(c * 1.3);
  if (sa > 0.02) {
    var sx = 790 + pan * 0.08, sy = 74;
    var rg = ctx.createRadialGradient(sx, sy, 8, sx, sy, 130);
    rg.addColorStop(0, 'rgba(255,244,214,' + (0.55 * sa) + ')'); rg.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = rg; ctx.fillRect(sx - 140, sy - 140, 280, 280);
    ctx.fillStyle = 'rgba(255,250,232,' + sa + ')'; ctx.beginPath(); ctx.arc(sx, sy, 22, 0, TAU); ctx.fill();
  }
  var cc = mix([246, 248, 248], [150, 162, 170], c);
  for (var i = 0; i < clouds.length; i++) {
    var cl = clouds[i], al = clamp((c - cl.th) * 3) * cl.a;
    if (al < 0.02) continue;
    var x = ((cl.x0 + T * cl.sp) % (W + 400)) - 200 + pan * 0.08, y = cl.y;
    ctx.fillStyle = rgb(mix(cc, [90, 100, 110], 0.25), al * 0.55);
    for (var k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 2) * 34 * cl.sc, y + 8 * cl.sc + cl.e[k] * 4, 44 * cl.sc, 14 * cl.sc, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = rgb(cc, al);
    for (k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 2) * 34 * cl.sc, y - cl.e[k] * 12 * cl.sc, 42 * cl.sc, 17 * cl.sc + cl.e[k] * 8, 0, 0, TAU); ctx.fill(); }
  }
}
function drawRidge(pts, col, off) {
  ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.moveTo(-90 + off, H);
  for (var i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i] + off, pts[i + 1]);
  ctx.lineTo(W + 90 + off, H); ctx.closePath(); ctx.fill();
}
function drawHerbs(list, layerScale, pan, sc) {
  var colA = st.herbRise < -0.0004 ? [170, 150, 78] : [96, 150, 62], colB = mix(colA, [30, 60, 30], 0.22);
  if (layerScale) { colA = mix(colA, HAZE, 0.25); colB = mix(colB, HAZE, 0.25); }
  var hv = st.H, i, hh, lt, a, k;
  for (var pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = rgb(pass ? colB : colA); ctx.lineWidth = layerScale ? 0.9 : 1.3; ctx.lineCap = 'round'; ctx.beginPath();
    for (i = 0; i < list.length; i++) {
      var h = list[i]; if (h.c !== pass) continue;
      lt = clamp((hv - h.rk * 0.5) / 0.5); if (lt < 0.04) continue;
      hh = h.hm * lt * sc;
      for (k = 0; k < h.nb; k++) {
        a = (k / (h.nb - 1) - 0.5) * 1.1 + h.lean;
        ctx.moveTo(h.x, h.y); ctx.quadraticCurveTo(h.x + Math.sin(a) * hh * 0.15, h.y - hh * 0.6, h.x + Math.sin(a) * hh * 0.6, h.y - Math.cos(a) * hh);
      }
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(240,232,160,0.95)'; ctx.beginPath();
  for (i = 0; i < list.length; i++) {
    var f = list[i]; if (!f.fl) continue;
    lt = clamp((hv - f.rk * 0.5) / 0.5); if (lt < 0.7) continue;
    var fx = f.x + Math.sin(f.lean) * f.hm * lt * sc * 0.6, fy = f.y - Math.cos(f.lean) * f.hm * lt * sc;
    ctx.moveTo(fx + 1.6, fy); ctx.arc(fx, fy, layerScale ? 1.1 : 1.6, 0, TAU);
  }
  ctx.fill();
  if (FAUNA && list === herbsFg) drawTatu();
}
function drawLitter(list, n, dark) {
  if (n < 0.02) return;
  var cols = [[138, 106, 58], [108, 81, 48], [166, 132, 80]];
  for (var c = 0; c < 3; c++) {
    ctx.strokeStyle = rgb(cols[c], dark); ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath();
    for (var i = 0; i < list.length; i++) {
      var f = list[i]; if (f.c !== c || f.rk > n) continue;
      var dx = Math.cos(f.a) * f.s, dy = Math.sin(f.a) * f.s * 0.35;
      ctx.moveTo(f.x - dx, f.y - dy); ctx.lineTo(f.x + dx, f.y + dy);
    }
    ctx.stroke();
  }
}
function drawPlant(p, bark, haze) {
  plantLevel(p);
  var k, d, arr, lv = p.lv, R0 = p.layer ? 7 : 4.4;
  ctx.strokeStyle = rgb(bark); ctx.lineCap = 'round';
  var widths = p.layer ? [5.2, 3.1, 1.8, 1] : [2.6, 1.6, 0.95, 0.6];
  for (d = 0; d < 4; d++) {
    arr = p.byD[d]; if (!arr.length) continue;
    ctx.lineWidth = widths[d]; ctx.beginPath();
    for (k = 0; k < arr.length; k += 4) { ctx.moveTo(p.x + arr[k], p.y + arr[k + 1]); ctx.lineTo(p.x + arr[k + 2], p.y + arr[k + 3]); }
    ctx.stroke();
  }
  if (lv < 0.02) return;
  var col;
  if (p.rise > 0.0008) col = mix([168, 198, 84], [58, 112, 52], Math.pow(clamp(lv), 0.8));
  else if (p.rise < -0.0008) col = mix([176, 134, 58], [58, 112, 52], clamp(lv * 1.2));
  else col = [58, 112, 52];
  if (haze) col = mix(col, HAZE, 0.3);
  var col2 = mix(col, [20, 50, 30], 0.2), col3 = mix(col, [14, 36, 22], 0.5);
  var n = p.tips.length, amp = (p.layer ? 1.3 : 0.8) * (0.6 + 0.4 * Math.sin(T * 0.45 + p.x * 0.01));
  for (k = 0; k < n; k++) {
    var t = p.tips[k], lt = clamp((lv - t.r * 0.55) / 0.45);
    if (lt < 0.03) { p.rr[k] = 0; continue; }
    p.rr[k] = R0 * t.s * (0.35 + 0.65 * lt);
    p.tx[k] = p.x + t.x + Math.sin(T * 1.2 + t.ph) * amp * clamp(-t.y / p.h);
    p.ty[k] = p.y + t.y;
  }
  var nb = p.cheap ? 2 : p.layer ? 3 : 2, j, bx, by, rad;
  if (p.layer && !p.cheap) {
    ctx.fillStyle = rgb(col3, 0.55); ctx.beginPath();
    for (k = 0; k < n; k++) { if (!p.rr[k]) continue; ctx.moveTo(p.tx[k] + p.rr[k] * 1.05, p.ty[k] + 2.4); ctx.arc(p.tx[k], p.ty[k] + 2.4, p.rr[k] * 1.05, 0, TAU); }
    ctx.fill();
  }
  for (var par = 0; par < 2; par++) {
    ctx.fillStyle = rgb(par ? col2 : col); ctx.beginPath();
    for (k = par; k < n; k += 2) {
      if (!p.rr[k]) continue;
      var tt = p.tips[k];
      for (j = 0; j < nb; j++) {
        bx = p.tx[k] + tt.o[2 * j] * R0 * 0.85; by = p.ty[k] + tt.o[2 * j + 1] * R0 * 0.7; rad = p.rr[k] * (1 - 0.12 * j);
        ctx.moveTo(bx + rad, by); ctx.arc(bx, by, rad, 0, TAU);
      }
    }
    ctx.fill();
  }
}
function drawSucc(sc) {
  var i, k, x, y, len, a, n = 11;
  for (i = 0; i < succ.length; i++) {
    x = succ[i][0]; y = groundY(x) + 1; len = succ[i][1] * sc;
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? '#5a7b5c' : '#6d8b69'; ctx.beginPath();
      for (k = pass; k < n; k += 2) {
        a = -Math.PI / 2 + (k / (n - 1) - 0.5) * 2.5; var l = len * (0.8 + 0.2 * Math.sin(k * 2.1));
        var tx = x + Math.cos(a) * l, ty = y + Math.sin(a) * l, mx = x + Math.cos(a) * l * 0.5, my = y + Math.sin(a) * l * 0.5;
        ctx.moveTo(x - 2, y); ctx.quadraticCurveTo(mx - 2.5, my, tx, ty); ctx.quadraticCurveTo(mx + 2.5, my, x + 2, y);
      }
      ctx.fill();
    }
  }
  for (i = 0; i < cacti.length; i++) {
    x = cacti[i][0]; y = groundY(x) + 2; var h = cacti[i][1] * sc;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#5d7f61'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
    ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(x, y - h * 0.5); ctx.lineTo(x + 11, y - h * 0.5); ctx.lineTo(x + 11, y - h * 0.82); ctx.stroke();
    ctx.strokeStyle = '#48684d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x - 2, y - h + 2); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x + 2, y - h + 2); ctx.stroke();
  }
}
var SC = { A: [[112, 66, 48], [82, 48, 34]], B: [[158, 84, 54], [118, 60, 40]], C: [[202, 172, 142], [172, 140, 114]] };
var STC = [[188, 184, 176], [158, 150, 142], [226, 222, 212]];
var OUTP = OUT.map(function (o, n) {
  var cx = o[0], hw = o[1], pts = [cx - hw * 1.2, groundY(cx - hw * 1.2) + 5], k, x;
  for (k = -8; k <= 8; k++) { x = cx + k / 8 * hw; pts.push(x, groundY(x) - outcropH(x) * (0.88 + 0.2 * Math.sin(k * 2.3 + n))); }
  pts.push(cx + hw * 1.2, groundY(cx + hw * 1.2) + 5);
  return { cx: cx, hw: hw, h: o[2], p: pts };
});
function band(top, bot) {
  var n = GX.length, i; ctx.beginPath(); ctx.moveTo(GX[0], top[0]);
  for (i = 1; i < n; i++) ctx.lineTo(GX[i], top[i]);
  for (i = n - 1; i >= 0; i--) ctx.lineTo(GX[i], bot[i]);
  ctx.closePath();
}
function polyAt(x, y, p) { ctx.moveTo(x + p[0], y + p[1]); for (var q = 2; q < p.length; q += 2) ctx.lineTo(x + p[q], y + p[q + 1]); ctx.closePath(); }
function dotsPath(a, step) { ctx.beginPath(); for (var q = 0; q < a.length; q += step) { ctx.moveTo(a[q] + a[q + 2], a[q + 1]); ctx.arc(a[q], a[q + 1], a[q + 2], 0, TAU); } ctx.fill(); }
function rootSets() {
  var sets = [], i;
  for (i = 0; i < near.length; i++) if (!near[i].hidden && near[i].rt) sets.push(near[i].rt);
  for (i = 0; i < fill.length; i++) sets.push(fill[i].rt);
  for (i = 0; i < SP.length; i++) sets.push(SP[i].rt);
  return sets;
}

/* ---------- texturas estáticas do corte do solo ----------
   T1 (sob a película de umidade): pedras, fragmentos, foliação do saprólito, minerais, juntas e fraturas da rocha.
   T2 (sobre a película): afloramentos, raízes, xilopódios, linha da superfície e pedras soltas.
   Pintadas uma vez (e de novo se a escala do canvas mudar); por quadro só entram as faixas coloridas e a umidade. */
var TY0 = 280, T1 = null, T2 = null, texK = 0;
function mkTex(k) {
  var c = document.createElement('canvas');
  c.width = Math.round((W + 192) * k); c.height = Math.round((H + 12 - TY0) * k);
  return c;
}
function paintT1() {
  var c, q, x;
  /* A e B: grãos e fragmentos */
  ctx.fillStyle = 'rgba(40,20,12,0.42)'; dotsPath(dotsA, 3);
  ctx.fillStyle = 'rgba(226,162,122,0.22)'; dotsPath(dotsB, 3);
  ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(50,30,22,0.55)';
  for (c = 0; c < 3; c++) {
    ctx.fillStyle = rgb(STC[c], 0.9); ctx.beginPath();
    for (q = 0; q < embSt.length; q++) if (embSt[q].c === c) polyAt(embSt[q].x, embSt[q].y, embSt[q].p);
    ctx.fill(); ctx.stroke();
  }
  /* saprólito: foliação relicta */
  ctx.save(); band(GS, GR); ctx.clip();
  for (c = 0; c < 2; c++) {
    ctx.strokeStyle = c ? 'rgba(255,240,218,0.34)' : 'rgba(120,76,56,0.32)'; ctx.lineWidth = 1.1; ctx.beginPath();
    for (q = 0; q < foli.length; q += 4) { if (foli[q + 3] !== c) continue; ctx.moveTo(foli[q], foli[q + 1]); ctx.lineTo(foli[q] + foli[q + 2] * 0.92, foli[q + 1] - foli[q + 2] * 0.38); }
    ctx.stroke();
  }
  ctx.restore();
  /* rocha: minerais, bandamento, juntas de alívio, fraturas (com preenchimento onde há raízes) */
  ctx.save(); band(GR, GH); ctx.clip();
  ctx.fillStyle = 'rgba(214,214,218,0.38)'; ctx.beginPath();
  for (q = 0; q < dotsR.length; q += 4) if (dotsR[q + 3] === 0) { ctx.moveTo(dotsR[q] + dotsR[q + 2], dotsR[q + 1]); ctx.arc(dotsR[q], dotsR[q + 1], dotsR[q + 2], 0, TAU); }
  ctx.fill();
  ctx.fillStyle = 'rgba(40,42,48,0.42)'; ctx.beginPath();
  for (q = 0; q < dotsR.length; q += 4) if (dotsR[q + 3] === 1) { ctx.moveTo(dotsR[q] + dotsR[q + 2], dotsR[q + 1]); ctx.arc(dotsR[q], dotsR[q + 1], dotsR[q + 2], 0, TAU); }
  ctx.fill();
  for (c = 0; c < 6; c++) {
    ctx.strokeStyle = c % 2 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.07)'; ctx.lineWidth = 9 + (c % 3) * 4; ctx.beginPath();
    for (x = -96; x <= W + 96; x += 16) { var yb = groundY(x) + 96 + c * 30 + 8 * Math.sin(x * 0.011 + c) - x * 0.07; if (x === -96) ctx.moveTo(x, yb); else ctx.lineTo(x, yb); }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(36,38,44,0.32)'; ctx.lineWidth = 1; ctx.beginPath();
  sheets.forEach(function (sh) { for (var xs = -96; xs <= W + 96; xs += 12) { var ys = groundY(xs) + 100 + sh.off + sh.a * Math.sin(xs * 0.012 + sh.ph); if (xs === -96) ctx.moveTo(xs, ys); else ctx.lineTo(xs, ys); } });
  ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(36,38,44,0.42)';
  fracs.forEach(function (f) { ctx.lineWidth = f.w; ctx.beginPath(); ctx.moveTo(f.p[0], f.p[1]); for (var k = 2; k < f.p.length; k += 2) ctx.lineTo(f.p[k], f.p[k + 1]); ctx.stroke(); });
  rootSets().forEach(function (r) {
    r.fr.forEach(function (p) {
      ctx.strokeStyle = 'rgba(150,84,56,0.88)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(30,26,28,0.7)'; ctx.lineWidth = 0.9; ctx.stroke();
    });
  });
  ctx.restore();
}
function paintT2() {
  var c, q, i, sets = rootSets();
  /* afloramentos de rocha */
  OUTP.forEach(function (o) {
    var g = ctx.createLinearGradient(0, o.p[1] - o.h - 6, 0, o.p[1] + 6); g.addColorStop(0, '#b3b2ae'); g.addColorStop(1, '#7c7d82');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(40,36,34,0.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); polyAt(0, 0, o.p); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,38,40,0.5)'; ctx.lineWidth = 0.9; ctx.beginPath();
    ctx.moveTo(o.cx - o.hw * 0.25, groundY(o.cx) - o.h * 0.85); ctx.lineTo(o.cx - o.hw * 0.18, groundY(o.cx) - o.h * 0.35); ctx.lineTo(o.cx - o.hw * 0.3, groundY(o.cx) + 2);
    ctx.moveTo(o.cx + o.hw * 0.3, groundY(o.cx) - o.h * 0.6); ctx.lineTo(o.cx + o.hw * 0.4, groundY(o.cx) - o.h * 0.1);
    ctx.stroke();
  });
  /* raízes: contorno escuro e núcleo claro, para ler sobre o horizonte A escuro */
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(40,22,14,0.55)';
  sets.forEach(function (r) { ctx.lineWidth = r.w[0] + 2; ctx.stroke(r.thick); ctx.lineWidth = r.w[1] + 2; ctx.stroke(r.main); ctx.lineWidth = r.w[2] + 1.6; ctx.stroke(r.fine); });
  ctx.strokeStyle = '#ead8b4';
  sets.forEach(function (r) { ctx.lineWidth = r.w[0]; ctx.stroke(r.thick); ctx.lineWidth = r.w[1]; ctx.stroke(r.main); });
  ctx.strokeStyle = '#d8c096';
  sets.forEach(function (r) { ctx.lineWidth = r.w[2]; ctx.stroke(r.fine); });
  /* xilopódios do umbuzeiro: bulbos presos às raízes por um pedúnculo curto */
  var um = SP[0].rt.tub;
  for (i = 0; i < um.length; i++) {
    var tb = um[i];
    ctx.strokeStyle = 'rgba(40,22,14,0.55)'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(tb[4], tb[5]); ctx.lineTo(tb[0], tb[1] - tb[3] * 0.8); ctx.stroke();
    ctx.strokeStyle = '#ead8b4'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#c3a279'; ctx.strokeStyle = 'rgba(60,38,26,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(tb[0], tb[1], tb[2], tb[3], 0.12, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(244,226,190,0.5)'; ctx.beginPath(); ctx.ellipse(tb[0] - tb[2] * 0.32, tb[1] - tb[3] * 0.32, tb[2] * 0.36, tb[3] * 0.3, -0.5, 0, TAU); ctx.fill();
  }
  /* linha da superfície e pedras soltas (pedregosidade) */
  ctx.strokeStyle = 'rgba(52,30,20,0.85)'; ctx.lineWidth = 1.4; ctx.beginPath();
  for (i = 0; i < GX.length; i++) { if (i) ctx.lineTo(GX[i], GY[i]); else ctx.moveTo(GX[i], GY[i]); }
  ctx.stroke();
  ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(50,34,26,0.6)';
  for (c = 0; c < 3; c++) {
    ctx.fillStyle = rgb(STC[c]); ctx.beginPath();
    for (q = 0; q < surfSt.length; q++) if (surfSt[q].c === c) polyAt(surfSt[q].x, surfSt[q].y, surfSt[q].p);
    ctx.fill(); ctx.stroke();
  }
}
function buildSoilTex(k) {
  var keep = ctx;
  T1 = mkTex(k); T2 = mkTex(k); texK = k;
  ctx = T1.getContext('2d'); ctx.setTransform(k, 0, 0, k, 96 * k, -TY0 * k); paintT1();
  ctx = T2.getContext('2d'); ctx.setTransform(k, 0, 0, k, 96 * k, -TY0 * k); paintT2();
  ctx = keep;
}
function drawSoil() {
  var S = st.S, wet = 0.75 * clamp(S), i, k = cv.width / W;
  if (texK !== k) buildSoilTex(k);
  ctx.fillStyle = rgb(mix(SC.A[0], SC.A[1], wet)); band(GY, GA); ctx.fill();
  ctx.fillStyle = rgb(mix(SC.B[0], SC.B[1], wet)); band(GA, GS); ctx.fill();
  ctx.fillStyle = rgb(mix(SC.C[0], SC.C[1], wet * 0.7)); band(GS, GR); ctx.fill();
  var rg = ctx.createLinearGradient(0, 400, 0, H); rg.addColorStop(0, '#93938f'); rg.addColorStop(1, '#5f6167');
  ctx.fillStyle = rg; band(GR, GH); ctx.fill();
  ctx.drawImage(T1, -96, TY0, W + 192, H + 12 - TY0);
  drawFracWater();
  /* umidade: o solo raso enche até a rocha; o saprólito só umedece um pouco */
  if (S > 0.01) {
    var fa = clamp(S / 0.72), fs = smooth(0.75, 0.95, S), fy = [];
    for (i = 0; i < GX.length; i++) fy.push(GY[i] + ((GS[i] - GY[i]) * fa + (GR[i] - GS[i]) * 0.35 * fs) * (cena.infiltracao ? cena.infiltracao(GX[i]) : 1));
    ctx.fillStyle = 'rgba(40,20,12,' + (0.10 + 0.20 * S) + ')'; band(GY, fy); ctx.fill();
    ctx.strokeStyle = 'rgba(244,226,196,0.6)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (i = 0; i < GX.length; i++) { if (i) ctx.lineTo(GX[i], fy[i]); else ctx.moveTo(GX[i], fy[i]); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.drawImage(T2, -96, TY0, W + 192, H + 12 - TY0);
}
function drawParticles(pan) {
  for (var j = 0; j < leaves.length; j++) {
    var l = leaves[j], lx = l.x + pan * l.f, c = Math.cos(l.a) * 2.4, s = Math.sin(l.a) * 2.4;
    ctx.strokeStyle = rgb(l.c, 0.9); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lx - c, l.y - s); ctx.lineTo(lx + c, l.y + s); ctx.stroke();
  }
}
function drawRain() {
  var n = Math.floor(260 * st.rainI); if (n < 2) return;
  ctx.strokeStyle = 'rgba(232,242,248,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
  for (var i = 0; i < n; i++) { var d = drops[i]; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2.4, d.y - d.l); }
  ctx.stroke();
}
function updateRain(dt) {
  if (st.rainI < 0.02) return;
  for (var i = 0; i < drops.length; i++) {
    var d = drops[i]; d.y += d.v * dt; d.x -= 80 * dt;
    if (d.x < -10) d.x += W + 20;
    if (d.y > groundY(d.x) * d.gy) { d.y = -10 - Math.random() * 60; d.x = Math.random() * W; }
  }
}
function draw() {
  var k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, H);
  var pan = cena.semPan ? 0 : Math.sin(phase * TAU) * 12, Gh = clamp(st.L);
  drawSky(pan);
  ctx.save(); ctx.translate(pan * 0.2, 0); drawRidge(ridges[0], mix([176, 178, 166], [132, 156, 128], Gh), 0); ctx.restore();
  ctx.save(); ctx.translate(pan * 0.35, 0); drawRidge(ridges[1], mix([152, 146, 128], [104, 134, 92], Gh), 0); ctx.restore();
  ctx.save(); ctx.translate(pan * 0.55, 0);
  ctx.fillStyle = rgb(mix([170, 146, 112], [140, 118, 88], clamp(st.S))); ctx.beginPath(); ctx.moveTo(-90, H);
  for (var x = -90; x <= W + 90; x += 12) ctx.lineTo(x, midY(x));
  ctx.lineTo(W + 90, H); ctx.closePath(); ctx.fill();
  drawLitter(litMid, st.lit, 0.8);
  drawHerbs(herbsMid, true, pan, 1);
  var bark = mix([128, 121, 108], [86, 76, 66], Gh), barkM = mix(bark, HAZE, 0.35);
  for (var i = 0; i < mid.length; i++) {
    var ma = cena.alfaMeio ? cena.alfaMeio(mid[i]) : 1;
    if (ma < 0.01) continue;
    if (ma < 0.99) { ctx.save(); ctx.globalAlpha = ma; drawPlant(mid[i], barkM, true); ctx.restore(); } else drawPlant(mid[i], barkM, true);
  }
  if (cena.aposMeio) cena.aposMeio();
  ctx.restore();
  ctx.save(); ctx.translate(pan, 0);
  if (cena.planoFrente) cena.planoFrente(bark, pan);
  else {
  drawSoil();
  drawLitter(litFg, cena.serapilheiraMin ? Math.max(st.lit, cena.serapilheiraMin) : st.lit, 0.9);
  if (cena.torre !== false) drawTower();
  if (cena.aposTorre) cena.aposTorre();
  for (i = 0; i < near.length; i++) if (!near[i].hidden) drawPlant(near[i], bark, false);
  for (i = 0; i < fill.length; i++) drawPlant(fill[i], bark, false);
  drawSpecies();
  drawSucc(0.94 + 0.06 * st.S);
  drawHerbs(herbsFg, false, pan, 1);
  }
  if (cena.primeiroPlano) cena.primeiroPlano(pan, bark);
  ctx.restore();
  drawParticles(pan);
  if (cena.substituirInterface) cena.substituirInterface();
  else { drawRain(); drawMonth(); if (cena.interface) cena.interface(); }
}
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

/* nome do mês no canto superior esquerdo (tamanho ajustado à largura na tela, para continuar legível no celular) */
var MESES = ['Novembro', 'Dezembro', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro'];
function drawMonth() {
  var d = Math.floor(phase * 365), m = 0;
  while (m < 11 && d >= MDAYS[m]) { d -= MDAYS[m]; m++; }
  var fs = Math.max(22, 15 * W / cssW), pad = fs * 0.6, hh = fs * 1.7, x0 = Math.max(12, 10 * W / cssW), tw;
  ctx.save();
  ctx.font = '600 ' + fs + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  tw = ctx.measureText(MESES[m]).width;
  ctx.fillStyle = 'rgba(255,255,255,0.66)'; rrect(x0, x0, tw + pad * 2, hh, fs * 0.36); ctx.fill();
  ctx.fillStyle = '#16222a'; ctx.fillText(MESES[m], x0 + pad, x0 + hh * 0.68);
  ctx.restore();
}
/* ---------- torre de fluxo ----------
   Treliça quadrada em cinco seções, laranja e branca alternadas (a de cima é laranja), com plataformas nas emendas (foto enviada pelo usuário).
   No topo: mastro com anemômetro sônico e analisador de gás de caminho aberto (sistema eddy covariance) e, num braço para a esquerda, um saldo-radiômetro
   (um sensor voltado para cima e outro para baixo). Desenho esquemático e fora de escala: a torre real é bem mais esbelta.
   TOWER.deck, TOWER.eddy e TOWER.rad guardam a plataforma do topo, o ponto de medida do eddy e o saldo-radiômetro, em coordenadas da cena,
   para as animações que forem ligar fluxos aos sensores. */
var TOWER = { x: 468, h: 235, wb: 28, wt: 23, nSec: 5, bays: 2, dx: 5, dy: -2.5, back: true };
var TWR = null;
function buildTower() {
  var o = TOWER, hs = o.h / o.nSec, hb = hs / o.bays, nb = o.nSec * o.bays, b, j, i, t0, t1, hh;
  var yb = Math.min(groundY(o.x - o.wb / 2), groundY(o.x + o.wb / 2)) + 1.5;
  function hw(t) { return (o.wb + (o.wt - o.wb) * t / o.h) / 2; }
  var P = { legO: new Path2D(), legW: new Path2D(), brO: new Path2D(), brW: new Path2D(), plat: new Path2D(), lip: new Path2D(), rail: new Path2D(), mast: new Path2D(), cap: new Path2D(), pad: new Path2D() };
  /* pernas, uma por seção (a cor muda a cada seção) */
  for (j = 0; j < o.nSec; j++) {
    var lg = j % 2 ? P.legW : P.legO, br = j % 2 ? P.brW : P.brO;
    t0 = j * hs; t1 = t0 + hs;
    lg.moveTo(-hw(t0), -t0); lg.lineTo(-hw(t1), -t1); lg.moveTo(hw(t0), -t0); lg.lineTo(hw(t1), -t1);
    if (o.back) { lg.moveTo(hw(t0) + o.dx, -t0 + o.dy); lg.lineTo(hw(t1) + o.dx, -t1 + o.dy); br.moveTo(-hw(t0) + o.dx, -t0 + o.dy); br.lineTo(-hw(t1) + o.dx, -t1 + o.dy); }
  }
  /* travessas horizontais e diagonais, uma por vão, em zigue-zague */
  for (b = 0; b < nb; b++) {
    var bb = Math.floor(b / o.bays) % 2 ? P.brW : P.brO;
    t0 = b * hb; t1 = t0 + hb;
    bb.moveTo(-hw(t0), -t0); bb.lineTo(hw(t0), -t0);
    if (o.back) { bb.moveTo(hw(t0), -t0); bb.lineTo(hw(t0) + o.dx, -t0 + o.dy); }
    if (b % 2 === 0) { bb.moveTo(-hw(t0), -t0); bb.lineTo(hw(t1), -t1); } else { bb.moveTo(hw(t0), -t0); bb.lineTo(-hw(t1), -t1); }
  }
  /* plataformas nas emendas das seções e no topo */
  for (j = 1; j <= o.nSec; j++) {
    t0 = j * hs; hh = hw(t0) + 2.8;
    P.plat.moveTo(-hh, -t0); P.plat.lineTo(hh, -t0); P.plat.lineTo(hh + o.dx, -t0 + o.dy); P.plat.lineTo(-hh + o.dx, -t0 + o.dy); P.plat.closePath();
    P.lip.rect(-hh, -t0, 2 * hh, 2.2);
  }
  /* guarda-corpo do topo e hastes */
  hh = hw(o.h) + 1.6;
  for (i = 0; i < 5; i++) { var px = -hh + i * 2 * hh / 4; P.rail.moveTo(px, -o.h); P.rail.lineTo(px, -o.h - 8); }
  P.rail.moveTo(-hh, -o.h - 8); P.rail.lineTo(hh, -o.h - 8); P.rail.moveTo(-hh, -o.h - 4); P.rail.lineTo(hh, -o.h - 4);
  /* sapatas de concreto: acompanham o desnível do terreno sob cada perna */
  [-hw(0), hw(0)].forEach(function (lx) {
    var gy = groundY(o.x + lx) + 3.5;
    P.pad.rect(lx - 4.5, -3, 9, gy - yb + 3);
  });
  TOWER.yb = yb; TOWER.deck = { x: o.x, y: yb - o.h }; TOWER.eddy = { x: o.x, y: yb - o.h - 34 }; TOWER.rad = { x: o.x - hw(o.h) - 42, y: yb - o.h + 17 };
  return P;
}
function drawTower() {
  if (!TWR) TWR = buildTower();
  var o = TOWER, P = TWR, k = Math.max(1, Math.min(1.7, 0.55 * W / cssW));
  ctx.save(); ctx.translate(o.x, o.yb); ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  ctx.fillStyle = '#aaa8a0'; ctx.strokeStyle = 'rgba(72,74,70,0.85)'; ctx.lineWidth = 0.9; ctx.fill(P.pad); ctx.stroke(P.pad);
  /* contornos (o branco precisa de um fio escuro para aparecer contra o céu) */
  ctx.strokeStyle = 'rgba(54,62,68,0.82)'; ctx.lineWidth = 2.6 * k + 1.6; ctx.stroke(P.legW); ctx.lineWidth = 1.4 * k + 1.4; ctx.stroke(P.brW);
  ctx.strokeStyle = 'rgba(112,36,10,0.6)'; ctx.lineWidth = 2.6 * k + 1; ctx.stroke(P.legO); ctx.lineWidth = 1.4 * k + 0.9; ctx.stroke(P.brO);
  /* cores */
  ctx.strokeStyle = '#f8f5ee'; ctx.lineWidth = 2.6 * k; ctx.stroke(P.legW); ctx.lineWidth = 1.4 * k; ctx.stroke(P.brW);
  ctx.strokeStyle = '#e4561f'; ctx.lineWidth = 2.6 * k; ctx.stroke(P.legO); ctx.lineWidth = 1.4 * k; ctx.stroke(P.brO);
  /* plataformas */
  ctx.fillStyle = '#7b858a'; ctx.fill(P.plat); ctx.strokeStyle = 'rgba(40,46,50,0.7)'; ctx.lineWidth = 0.7; ctx.stroke(P.plat);
  ctx.fillStyle = '#3d454a'; ctx.fill(P.lip);
  ctx.strokeStyle = '#3d454a'; ctx.lineWidth = 1 * k; ctx.stroke(P.rail);
  drawSensors(o, k);
  ctx.restore();
}
/* sensores no topo; coordenadas relativas à base da torre (y negativo para cima) */
function drawSensors(o, k) {
  var h = o.h, hwT = o.wt / 2, DK = '#2f373b', GR = '#d9dee0', OL = 'rgba(40,46,50,0.85)', i, ax, ay;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* braço do saldo-radiômetro: viga horizontal com escora; o corpo fica longe da torre para ela não sombrear o sensor */
  ay = -h + 17; ax = -hwT - 42;
  ctx.strokeStyle = DK; ctx.lineWidth = 2.2 * k; ctx.beginPath(); ctx.moveTo(-hwT, ay); ctx.lineTo(ax + 12, ay); ctx.stroke();
  ctx.lineWidth = 1.2 * k; ctx.beginPath(); ctx.moveTo(-hwT, ay + 16); ctx.lineTo(ax + 14, ay + 1); ctx.stroke();
  ctx.fillStyle = '#eceff0'; ctx.strokeStyle = OL; ctx.lineWidth = 0.8;
  rrect(ax - 12, ay - 2.6, 26, 5.2, 1.6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(205,226,236,0.95)';
  ctx.beginPath(); ctx.ellipse(ax - 1, ay - 2.6, 6.5, 4.4, 0, Math.PI, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(ax - 1, ay + 2.6, 6.5, 4.4, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
  /* mastro, anemômetro sônico (cubo com três transdutores) e analisador de gás de caminho aberto (corpo em C) */
  ctx.strokeStyle = DK; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, -h - 26); ctx.stroke();
  ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.moveTo(0, -h - 14); ctx.lineTo(15, -h - 14); ctx.stroke();
  ctx.fillStyle = DK; ctx.lineWidth = 1.5 * k;
  ctx.beginPath(); ctx.moveTo(0, -h - 28); ctx.lineTo(-7, -h - 35); ctx.moveTo(0, -h - 28); ctx.lineTo(7, -h - 35); ctx.moveTo(0, -h - 28); ctx.lineTo(0, -h - 38); ctx.stroke();
  for (i = 0; i < 3; i++) { var tx = [-7, 7, 0][i], ty = [-35, -35, -38][i]; ctx.beginPath(); ctx.arc(tx, -h + ty, 2, 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, -h - 28, 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = GR; ctx.strokeStyle = OL; ctx.lineWidth = 0.8;
  rrect(13.5, -h - 26, 3.6, 24, 1.2); ctx.fill(); ctx.stroke();
  rrect(7, -h - 26, 8, 4, 1.2); ctx.fill(); ctx.stroke();
  rrect(7, -h - 6, 8, 4, 1.2); ctx.fill(); ctx.stroke();
}

/* ---------- leitura de data ---------- */
function dataAtual() {
  var d = Math.floor(phase * 365), m = 0;
  while (m < 11 && d >= MDAYS[m]) { d -= MDAYS[m]; m++; }
  return (d + 1) + ' ' + MONTHS[m];
}

/* ---------- laço e comandos ----------
   Os controles ficam fora do canvas, na página; ela comanda a cena por estas funções
   e é avisada (opcoes.aoMudar) quando a data ou o estado de reprodução mudam. */
var last = performance.now(), lastDraw = 0, raf = 0, ativo = true;
var offscreen = false, needDraw = true, avisado = '';
var FRAME_MIN = 1000 / 30;
function estadoAtual() {
  return {
    tocando: playing, velocidade: speed, posicao: phase, data: dataAtual(), movimentoReduzido: reduce,
    etapa: cena.etapaAtual ? cena.etapaAtual() : null,
    textoEtapa: cena.textoEtapa ? cena.textoEtapa() : null,
    valor: cena.valorAtual ? cena.valorAtual() : null,
    textoValor: cena.textoValor ? cena.textoValor() : null,
    descricaoValor: cena.descricaoValor ? cena.descricaoValor() : null
  };
}
/* a chave é o estado inteiro menos a posição exata, que `data` já cobre dia a dia:
   um campo novo de estadoAtual() avisa a página sem precisar entrar aqui */
function avisar() {
  if (!opcoes.aoMudar) return;
  var s = estadoAtual(), e = JSON.stringify(s, function (k, v) { return k === 'posicao' ? undefined : v; });
  if (e === avisado) return;
  avisado = e;
  opcoes.aoMudar(s);
}
function frame(now) {
  if (!ativo) return;
  raf = requestAnimationFrame(frame);
  if (offscreen && !needDraw) { last = now; return; }
  if (!needDraw && now - lastDraw < FRAME_MIN) return;
  lastDraw = now;
  var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  needDraw = false;
  var dph = 0;
  if (playing) { dph = dt * speed / CYCLE; phase = (phase + dph) % 1; }
  if (cena.antes) cena.antes(dt);
  computeState(); if (cena.ajustarEstado) cena.ajustarEstado(dt); updateSpecies();
  if (playing) { update(dt, dph); updateRain(dt); }
  if (cena.atualizar) cena.atualizar(dt);
  draw(); avisar();
}
var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
if (ro) ro.observe(cv); else resize();
computeState(); updateSpecies();
raf = requestAnimationFrame(frame);

return {
  tocar: function (v) { playing = !!v; needDraw = true; avisar(); },
  velocidade: function (v) { speed = v; avisar(); },
  posicao: function (p) {
    phase = Math.min(0.999, Math.max(0, p)); leaves.length = 0;
    if (cena.reiniciar) cena.reiniciar();
    needDraw = true; avisar();
  },
  visivel: function (v) { offscreen = !v; if (v) needDraw = true; },
  etapas: function () { return cena.etapas || null; },
  tempo: function () { return !cena.semTempo; },
  etapa: function (i) { if (cena.selecionarEtapa) { cena.selecionarEtapa(i); needDraw = true; avisar(); } },
  valor: function () { return cena.valor || null; },
  definirValor: function (v) { if (cena.definirValor) { cena.definirValor(v); needDraw = true; avisar(); } },
  estado: estadoAtual,
  encerrar: function () { ativo = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); }
};

}
