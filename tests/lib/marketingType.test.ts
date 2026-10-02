import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Reads the type utilities straight out of the stylesheet, as
// marketingPalette.test.ts does for the colour tokens: the values are Figma
// text styles measured off the nodes, and this fails if one drifts.
function rule(selector: string): Record<string, string> {
  const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))
  if (!match) throw new Error(`no ${selector} rule in app/globals.css`)
  const props: Record<string, string> = {}
  for (const [, name, value] of match[1].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)) {
    props[name] = value.trim()
  }
  return props
}

describe('marketing type utilities', () => {
  // The Figma h2 style tracks at -0.75%, i.e. -0.225px at 30px; -0.75px was
  // the percentage read as pixels.
  it('tracks the h2 at -0.225px', () => {
    expect(rule('.text-h2')['letter-spacing']).toBe('-0.225px')
  })

  it.each([
    ['.text-ui-medium', '500', '14px', '24px'],
    ['.text-ui-bold', '700', '14px', '24px'],
    ['.text-ui-tab', '500', '14px', '20px'],
    ['.text-ui-badge', '600', '12px', '16px'],
  ])('sets %s in Inter %s %s/%s', (selector, weight, size, lineHeight) => {
    const props = rule(selector)
    expect(props['font-family']).toBe('var(--font-ui, var(--font-fallback))')
    expect(props['font-weight']).toBe(weight)
    expect(props['font-size']).toBe(size)
    expect(props['line-height']).toBe(lineHeight)
  })
})

describe('marketing fonts', () => {
  const source = readFileSync(path.join(process.cwd(), 'app/fonts/marketing.ts'), 'utf8')

  it('declares Rubik up to 800, the weight of the question tile numbers', () => {
    expect(source).toMatch(/Rubik-Variable-latin\.woff2',\s*weight: '400 800'/)
  })

  it('loads Inter as --font-ui', () => {
    expect(source).toMatch(/Inter-Variable-latin\.woff2',\s*weight: '400 700',\s*variable: '--font-ui'/)
  })

  it('loads Archivo SemiBold as --font-archivo', () => {
    expect(source).toMatch(/Archivo-SemiBold-latin\.woff2',\s*weight: '600',\s*variable: '--font-archivo'/)
  })

  // Only the landing's Plataforma tabs use Archivo; preloaded from the layout,
  // every /sobre and /comunicacao page would fetch 14 KB it never draws.
  it('does not preload Archivo on every page', () => {
    const call = source.slice(source.indexOf('export const archivo ='))
    expect(call.slice(0, call.indexOf('})'))).toMatch(/preload: false/)
  })
})
