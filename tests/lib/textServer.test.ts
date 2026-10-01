import { afterEach, describe, expect, it, vi } from 'vitest'

// The request config is next-intl's: outside Next there is no request to read
// the cookie from, so the failure the route would meet is staged here.
vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(async () => {
    throw new Error('Cannot find module ./en/MapaReport.json')
  }),
  getTranslations: vi.fn(),
}))

const { getMapaText } = await import('@/lib/mapa/textServer')
const { PT_TEXT } = await import('@/lib/mapa/text')

describe('getMapaText', () => {
  afterEach(() => vi.restoreAllMocks())

  it('falls back to Portuguese and says why in the log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(getMapaText()).resolves.toBe(PT_TEXT)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0].join(' '))).toContain('Cannot find module ./en/MapaReport.json')
  })
})
