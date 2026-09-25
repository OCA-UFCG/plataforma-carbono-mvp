import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrast } from '@/lib/color'

// Reads the tokens straight out of the stylesheet, so the test fails if someone
// edits a value in CSS without checking it. Mirrors what scripts/check-contrast.mts
// does for the map's monthly accents.
function tokens(): Record<string, string> {
  const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
  const root = css.match(/:root\s*\{([^}]*)\}/)
  if (!root) throw new Error('no :root block in app/globals.css')
  const found: Record<string, string> = {}
  for (const [, name, value] of root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    found[name] = value.trim()
  }
  return found
}

// Text-on-background pairs the design actually uses, from the Figma home frame.
const PAIRS: [string, string][] = [
  ['--bg-texto-primario', '--bg-fundo'],
  ['--bg-texto-secundario', '--bg-fundo'],
  ['--bg-texto-sobre-inverso', '--bg-fundo-inverso'],
  ['--role-marca-ancora-texto-sobre', '--role-marca-ancora-padrao'],
  ['--role-primario-texto-sobre', '--role-categorica1-padrao'],
  // The tightest pair the page actually renders: --role-marca-ancora-padrao
  // as foreground (the Comunicação h2, the active tab, the active nav link,
  // the global focus ring) on the page background. The hero's primary button
  // rests on --role-marca-ancora-hover instead (Hero.module.css, deliberate,
  // matching Figma node 18862:8529), so that pair is covered here too;
  // Ferramenta's button rests on -categorica1-padrao, the pair above.
  ['--role-marca-ancora-padrao', '--bg-fundo'],
  ['--role-marca-ancora-texto-sobre', '--role-marca-ancora-hover'],
  // Hover states (Figma "Hover" frames on the home section, 18916:*):
  // Ferramenta's button darkens to -categorica1-hover (18916:9764); the nav
  // link and the "Entrar" button put their text on an --am-100 fill
  // (18916:9717, 18916:9741); an inactive tab darkens to the primary text
  // colour (18916:9468), already covered by the first pair above.
  // The nav link deliberately departs from Figma: the design keeps
  // -marca-ancora-padrao text on --am-100, which is 4.01:1 and fails AA for
  // its 14px label, so SiteHeader.module.css steps the text to -hover.
  // The inactive tab rests on --am-400 (Plataforma.module.css).
  ['--am-400', '--bg-fundo'],
  ['--role-primario-texto-sobre', '--role-categorica1-hover'],
  ['--role-marca-ancora-hover', '--am-100'],
  ['--role-categorica1-padrao', '--am-100'],
  // Internal pages' frame (issue #45): the intro band's eyebrow and paragraph
  // on --am-100, the sub-navigation at rest, active and hovered, and the photo
  // bands' text over the solid stop of their gradients.
  ['--bg-texto-secundario', '--am-100'],
  ['--bg-texto-primario', '--am-100'],
  ['--bg-texto-secundario', '--am-050'],
  ['--role-primario-container', '--bg-fundo-inverso'],
  ['--bg-texto-sobre-inverso', '--role-alerta-risco-hover'],
  // Shared Sobre blocks (issue #46): the 'alert' Section heading, and the
  // 'outlined' IndicatorCard's value, unit and description on its cream fill.
  ['--ctx-negativo-padrao', '--bg-fundo'],
  ['--bg-texto-secundario', '--bg-superficie-variante'],
  ['--am-400', '--bg-superficie-variante'],
  ['--bg-texto-primario', '--bg-superficie-variante'],
  // Comunicação page (issue #49): the PDF badge and the type chip.
  ['--role-categorica2-texto-sobre', '--role-categorica2-padrao'],
  ['--ctx-positivo-texto-sobre-container', '--bg-fundo'],
]

// Pairs only ever set as large text (WCAG: 24px, or 18.66px bold, and up),
// where AA asks for 3:1 instead of 4.5:1.
const LARGE_TEXT_PAIRS: [string, string][] = [
  // The internal pages' h1, 30px semibold, on the intro band (Figma node
  // 18988:8616). 4.01:1: short of the normal-text bar, clear of this one.
  ['--role-marca-ancora-padrao', '--am-100'],
]

describe('landing palette', () => {
  it('defines every token the pairs reference', () => {
    const t = tokens()
    for (const [fg, bg] of PAIRS) {
      expect(t[fg], `${fg} missing`).toBeDefined()
      expect(t[bg], `${bg} missing`).toBeDefined()
    }
  })

  it('clears WCAG AA for normal text on every pair', () => {
    const t = tokens()
    for (const [fg, bg] of PAIRS) {
      expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('clears WCAG AA for large text on every large-text pair', () => {
    const t = tokens()
    for (const [fg, bg] of LARGE_TEXT_PAIRS) {
      expect(t[fg], `${fg} missing`).toBeDefined()
      expect(t[bg], `${bg} missing`).toBeDefined()
      expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3)
    }
  })
})
