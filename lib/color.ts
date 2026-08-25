// Color utilities to derive the set of accents from a single base color. There
// are twelve month colors (see phenology.ts) and each one needs a soft
// background, a border, readable ink and a text color over the solid; writing
// 12 x 2 sets by hand would come out inconsistent, so here they come out
// computed, with the contrast checked against WCAG instead of eyeballed.

export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: Rgb): string {
  const q = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${q(r)}${q(g)}${q(b)}`
}

/** Linear interpolation in sRGB. `t` = 0 returns `a`, `t` = 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t])
}

/** WCAG 2.1 relative luminance (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio between two colors (1 to 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Moves `base` toward `target` (black or white) just enough to reach the
 * requested contrast ratio against `bg`. Returns the base itself when it
 * already passes. 4% step, 25-iteration cap: it stops at 100% of the mix in the
 * worst case.
 */
export function adjustContrast(base: string, bg: string, target: string, min: number): string {
  let color = base
  for (let i = 0; i <= 25 && contrast(color, bg) < min; i++) {
    color = mix(base, target, i * 0.04)
  }
  return color
}

/**
 * Readable text color over a solid background. The month colors go from dark
 * olive green to light orange, so neither of the two options works for all of
 * them: the choice comes from the measured contrast.
 *
 * There are mid-tones where NEITHER candidate reaches the minimum (January's
 * olive green, #778100, stops at 4.29:1 against the theme's dark ink). In that
 * case the best candidate is pushed to the extreme, pure black or white, until
 * it passes.
 */
export function readableOn(bg: string, light = '#ffffff', dark = '#16150f', min = 4.5): string {
  const useLight = contrast(bg, light) >= contrast(bg, dark)
  const chosen = useLight ? light : dark
  if (contrast(bg, chosen) >= min) return chosen
  return adjustContrast(chosen, bg, useLight ? '#ffffff' : '#000000', min)
}
