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
})
