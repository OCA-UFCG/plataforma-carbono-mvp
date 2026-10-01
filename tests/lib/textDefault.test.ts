import { describe, expect, it, vi } from 'vitest'

// PT_TEXT, the default of every `tx` parameter, holds no messages of its own:
// lib/mapa/textPt.ts brings them, and only the server and the tests load it
// (tests/setup/portugueseText.ts). The browser always passes the MapaText of
// useMapaText(), so its bundles carry no second copy of the Portuguese text.
describe('PT_TEXT', () => {
  it('loads no message on import, and names the fix when used with none loaded', async () => {
    vi.resetModules() // a module graph where nothing loaded textPt.ts
    const { PT_TEXT } = await import('@/lib/mapa/text')

    expect(PT_TEXT.locale).toBe('pt')
    expect(() => PT_TEXT.t('MapaResults.flux.removal.label')).toThrow(/textPt/)
  })

  it('writes Portuguese once lib/mapa/textPt.ts is loaded', async () => {
    vi.resetModules()
    await import('@/lib/mapa/textPt')
    const { PT_TEXT } = await import('@/lib/mapa/text')

    expect(PT_TEXT.t('MapaResults.flux.removal.label')).toBe('sequestrou')
    expect(PT_TEXT.t.has('MapaLayers.layers.bioma.name')).toBe(true)
  })
})
