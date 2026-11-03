import { describe, expect, it } from 'vitest'
import { TERMOS, abaFocavel, filtrarTermos, glossarioAntigoHref } from '@/lib/glossario/termos'

const titulos = (busca: string) => filtrarTermos(TERMOS, busca).map((t) => t.titulo)

describe('filtrarTermos', () => {
  it('keeps every term, in order, while the search box is empty or blank', () => {
    expect(filtrarTermos(TERMOS, '')).toEqual(TERMOS)
    expect(filtrarTermos(TERMOS, '   ')).toEqual(TERMOS)
  })

  it('matches a piece of the title anywhere in it', () => {
    expect(titulos('fluxo')).toEqual(['Torre de fluxo', 'Fluxos de carbono'])
  })

  it('ignores case and accents, in the title and in what the reader types', () => {
    expect(titulos('fotossintese')).toEqual(['Fotossíntese'])
    expect(titulos('DEGRADAÇÃO')).toEqual(['Degradação'])
    expect(titulos('agroecológico')).toEqual(['Manejo agroecológico'])
  })

  it('ignores the spaces around what the reader types', () => {
    expect(titulos('  torre ')).toEqual(['Torre de fluxo'])
  })

  it('finds nothing when no title holds the text', () => {
    expect(filtrarTermos(TERMOS, 'mandacaru')).toEqual([])
  })
})

describe('abaFocavel', () => {
  it('lets Tab reach the open term while the search shows it', () => {
    expect(abaFocavel(['torre-de-fluxo', 'fluxos-de-carbono'], 'fluxos-de-carbono')).toBe('fluxos-de-carbono')
  })

  it('lets Tab reach the first term shown once the search hides the open one', () => {
    expect(abaFocavel(['torre-de-fluxo', 'fluxos-de-carbono'], 'degradacao')).toBe('torre-de-fluxo')
  })

  it('names no term when the search shows none', () => {
    expect(abaFocavel([], 'degradacao')).toBeUndefined()
  })
})

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
