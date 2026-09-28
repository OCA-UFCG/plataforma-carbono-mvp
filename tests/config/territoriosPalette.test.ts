import { describe, expect, it } from 'vitest'
import { contrast, hexToRgb, rgbToHex } from '@/lib/color'
import {
  DEGRADATION_COLORS,
  FLUX_COLORS,
  LAND_USE_COLORS,
  MARK_OUTLINE_COLOR,
  RAIN_COLORS,
  REFERENCE_COLOR,
  STEP_COLORS,
  SURFACE_COLOR,
} from '@/config/territorios/palette'

// The Territórios colors are read by people who never open the WebSIG, on a
// phone, sometimes printed. Contrast is WCAG 2.1; distance is CIEDE2000 in
// CIELAB (D65), also after simulating protanopia and deuteranopia with
// Machado, Oliveira & Fernandes (2009) at severity 1.0.
//
// Thresholds, in CIEDE2000 units (about 1 is a just noticeable difference
// side by side, about 2 between separate patches):
// - 15 between classes with no order (rain, land use, flux, Conservado against
//   Nível 1), in every vision: each has to be named from a small patch on the
//   map or in a legend, far from its neighbor.
// - 8 between neighboring degradation levels in normal vision and 7 under
//   color vision deficiency: the levels also step down in lightness, which the
//   simulations keep, and every share is written in the legend.

const WHITE = '#ffffff'

const linear = (v: number) => {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const gamma = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

// CIELAB and CIEDE2000 as written out by Sharma, Wu and Dalal (2005).
function lab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(linear)
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

function deltaE2000(hex1: string, hex2: string): number {
  const [L1, a1, b1] = lab(hex1)
  const [L2, a2, b2] = lab(hex2)
  const rad = Math.PI / 180
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
  const a1p = a1 * (1 + G)
  const a2p = a2 * (1 + G)
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  const h1p = (Math.atan2(b1, a1p) / rad + 360) % 360
  const h2p = (Math.atan2(b2, a2p) / rad + 360) % 360
  const dL = L2 - L1
  const dC = C2p - C1p
  let dh = h2p - h1p
  if (C1p * C2p === 0) dh = 0
  else if (dh > 180) dh -= 360
  else if (dh < -180) dh += 360
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh * rad) / 2)
  const Lb = (L1 + L2) / 2
  const Cbp = (C1p + C2p) / 2
  let hb = h1p + h2p
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hb += h1p + h2p < 360 ? 360 : -360
    hb /= 2
  }
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad)
    + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad)
  const dTheta = 30 * Math.exp(-(((hb - 275) / 25) ** 2))
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2)
  const Sc = 1 + 0.045 * Cbp
  const Sh = 1 + 0.015 * Cbp * T
  const Rt = -Math.sin(2 * dTheta * rad) * Rc
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh))
}

type Vision = 'normal' | 'protanopia' | 'deuteranopia'

const MACHADO: Record<Exclude<Vision, 'normal'>, number[][]> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
}

function seen(hex: string, vision: Vision): string {
  if (vision === 'normal') return hex
  const v = hexToRgb(hex).map(linear)
  const clamp = (c: number) => Math.max(0, Math.min(1, c))
  const [r, g, b] = MACHADO[vision].map((row) => gamma(clamp(row[0] * v[0] + row[1] * v[1] + row[2] * v[2])))
  return rgbToHex([r, g, b])
}

const VISIONS: Vision[] = ['normal', 'protanopia', 'deuteranopia']

/** Every pair whose distance falls below `min` in any vision, for a readable failure. */
function closePairs(pairs: [string, string, string, string][], min: (v: Vision) => number): string[] {
  const out: string[] = []
  for (const [nameA, a, nameB, b] of pairs) {
    for (const v of VISIONS) {
      const d = deltaE2000(seen(a, v), seen(b, v))
      if (d < min(v)) out.push(`${nameA}/${nameB} ${v} ${d.toFixed(1)}`)
    }
  }
  return out
}

function allPairs(set: Record<string, string>): [string, string, string, string][] {
  const keys = Object.keys(set)
  return keys.flatMap((a, i) => keys.slice(i + 1).map((b): [string, string, string, string] => [a, set[a], b, set[b]]))
}

// Degradation codes from Conservado to Nível 5; code 0 (no data) is hatched and
// never sits in the ramp.
const LEVEL_ORDER = [6, 5, 4, 3, 2, 1]

// Fills below 3:1 on the surface, drawn with MARK_OUTLINE_COLOR around them.
// Listed by hand so that a new color falling below 3:1 fails here.
const OUTLINED = new Set([
  DEGRADATION_COLORS[5],
  DEGRADATION_COLORS[0],
  RAIN_COLORS.normal,
  LAND_USE_COLORS.outros,
])

describe('Territórios palette', () => {
  it('carries white text on each step color, and each reads on the surface, at 4.5:1', () => {
    for (const [step, color] of Object.entries(STEP_COLORS)) {
      expect(contrast(WHITE, color), `white on ${step}`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(color, SURFACE_COLOR), `${step} on the surface`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('draws the Caatinga marker at text contrast', () => {
    expect(contrast(REFERENCE_COLOR, SURFACE_COLOR)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps every chart mark at 3:1 on the surface, or outlines it at 3:1', () => {
    const marks = { ...DEGRADATION_COLORS, ...FLUX_COLORS, ...LAND_USE_COLORS, ...RAIN_COLORS }
    for (const [name, color] of Object.entries(marks)) {
      const ratio = contrast(color, SURFACE_COLOR)
      if (OUTLINED.has(color)) expect(ratio, `${name} ${color} is listed as outlined`).toBeLessThan(3)
      else expect(ratio, `${name} ${color} on the surface`).toBeGreaterThanOrEqual(3)
    }
    expect(contrast(MARK_OUTLINE_COLOR, SURFACE_COLOR)).toBeGreaterThanOrEqual(3)
  })

  it('darkens the degradation ramp from Nível 1 to Nível 5', () => {
    const lightness = LEVEL_ORDER.slice(1).map((code) => lab(DEGRADATION_COLORS[code])[0])
    for (let i = 1; i < lightness.length; i++) expect(lightness[i]).toBeLessThan(lightness[i - 1])
  })

  it('separates neighboring degradation levels', () => {
    const neighbors = LEVEL_ORDER.slice(1, -1).map((code, i): [string, string, string, string] => {
      const next = LEVEL_ORDER[i + 2]
      return [`código ${code}`, DEGRADATION_COLORS[code], `código ${next}`, DEGRADATION_COLORS[next]]
    })
    expect(closePairs(neighbors, (v) => (v === 'normal' ? 8 : 7))).toEqual([])
  })

  it('separates Conservado from Nível 1 and the hatched no-data area from Nível 5', () => {
    const pairs: [string, string, string, string][] = [
      ['Conservado', DEGRADATION_COLORS[6], 'Nível 1', DEGRADATION_COLORS[5]],
      ['Nível 5', DEGRADATION_COLORS[1], 'sem dado', DEGRADATION_COLORS[0]],
    ]
    expect(closePairs(pairs, () => 15)).toEqual([])
  })

  it('separates every pair of rain, land use and flux classes', () => {
    const pairs = [...allPairs(RAIN_COLORS), ...allPairs(LAND_USE_COLORS), ...allPairs(FLUX_COLORS)]
    expect(closePairs(pairs, () => 15)).toEqual([])
  })
})
