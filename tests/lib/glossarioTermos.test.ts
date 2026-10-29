import { describe, expect, it } from 'vitest'
import { glossarioAntigoHref } from '@/lib/glossario/termos'

describe('glossarioAntigoHref', () => {
  it('sends the former Glossário tab to its own page, keeping the term', () => {
    expect(glossarioAntigoHref({ aba: 'glossario', termo: 'degradacao' })).toBe('/glossario?termo=degradacao')
    expect(glossarioAntigoHref({ aba: 'glossario' })).toBe('/glossario')
  })

  it('escapes the term and keeps a repeated one, whose first value the page opens', () => {
    expect(glossarioAntigoHref({ aba: 'glossario', termo: 'a&b=c' })).toBe('/glossario?termo=a%26b%3Dc')
    expect(glossarioAntigoHref({ aba: 'glossario', termo: ['cue', 'degradacao'] })).toBe(
      '/glossario?termo=cue&termo=degradacao',
    )
  })

  it('keeps everything else the old link carried', () => {
    expect(glossarioAntigoHref({ aba: 'glossario', termo: 'cue', utm_source: 'zap', utm_campaign: undefined })).toBe(
      '/glossario?termo=cue&utm_source=zap',
    )
    expect(glossarioAntigoHref({ utm_source: 'zap', aba: 'glossario' })).toBe('/glossario?utm_source=zap')
  })

  it('reads a repeated aba by its first value, as the Comunicação tabs do', () => {
    expect(glossarioAntigoHref({ aba: ['glossario', 'eventos'], termo: 'cue' })).toBe('/glossario?termo=cue')
    expect(glossarioAntigoHref({ aba: ['eventos', 'glossario'] })).toBeNull()
  })

  it('leaves every other address on the Comunicação page', () => {
    for (const params of [{}, { aba: 'eventos' }, { aba: 'Glossario' }, { termo: 'degradacao' }]) {
      expect(glossarioAntigoHref(params), JSON.stringify(params)).toBeNull()
    }
  })
})
