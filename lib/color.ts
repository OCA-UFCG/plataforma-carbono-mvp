// Utilidades de cor para derivar o conjunto de acentos a partir de uma unica
// cor-base. Sao doze cores de mes (ver phenology.ts) e cada uma precisa de fundo
// suave, borda, tinta legivel e cor de texto sobre o solido; escrever 12 x 2
// conjuntos a mao sairia inconsistente, entao aqui eles saem calculados, com o
// contraste conferido contra a WCAG em vez de estimado no olho.

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

/** Interpolacao linear em sRGB. `t` = 0 devolve `a`, `t` = 1 devolve `b`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t])
}

/** Luminancia relativa da WCAG 2.1 (0 = preto, 1 = branco). */
export function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Razao de contraste da WCAG entre duas cores (1 a 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Aproxima `base` de `target` (preto ou branco) o suficiente para atingir a
 * razao de contraste pedida contra `bg`. Devolve a propria base quando ela ja
 * passa. Passo de 4%, teto de 25 iteracoes: para em 100% da mistura no pior caso.
 */
export function adjustContrast(base: string, bg: string, target: string, min: number): string {
  let color = base
  for (let i = 0; i <= 25 && contrast(color, bg) < min; i++) {
    color = mix(base, target, i * 0.04)
  }
  return color
}

/**
 * Cor de texto legivel sobre um fundo solido. As cores de mes vao do verde-oliva
 * escuro ao laranja claro, entao nenhuma das duas opcoes serve para todas: a
 * escolha sai do contraste medido.
 *
 * Ha meio-tons em que NENHUMA das duas candidatas chega ao minimo (o verde-oliva
 * de janeiro, #778100, para em 4,29:1 contra a tinta escura do tema). Nesse caso
 * a melhor candidata e empurrada ate o extremo, preto ou branco puro, ate passar.
 */
export function readableOn(bg: string, light = '#ffffff', dark = '#16150f', min = 4.5): string {
  const useLight = contrast(bg, light) >= contrast(bg, dark)
  const chosen = useLight ? light : dark
  if (contrast(bg, chosen) >= min) return chosen
  return adjustContrast(chosen, bg, useLight ? '#ffffff' : '#000000', min)
}
