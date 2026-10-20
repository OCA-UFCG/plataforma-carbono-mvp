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
     ajustarEstado(dt) recebe o passo do quadro.
   A cena que precisa de controles além dos botões de etapa os monta em opcoes.painel,
   um elemento que a página reserva abaixo da animação. */

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
    textoEtapa: cena.textoEtapa ? cena.textoEtapa() : null
  };
}
function avisar() {
  var e = dataAtual() + '|' + playing + '|' + speed + '|' + (cena.etapaAtual ? cena.etapaAtual() : '');
  if (e === avisado || !opcoes.aoMudar) return;
  avisado = e;
  opcoes.aoMudar(estadoAtual());
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
  estado: estadoAtual,
  encerrar: function () { ativo = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); }
};

}
