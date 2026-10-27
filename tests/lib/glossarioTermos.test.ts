import { describe, expect, it } from 'vitest'
import { glossarioAntigoHref } from '@/lib/glossario/termos'

describe('glossarioAntigoHref', () => {
  it('sends the former Glossário tab to its own page, keeping the term', () => {
    expect(glossarioAntigoHref({ aba: 'glossario', termo: 'degradacao' })).toBe('/glossario?termo=degradacao')
    expect(glossarioAntigoHref({ aba: 'glossario' })).toBe('/glossario')
  })

  it('escapes the term and drops a repeated one', () => {
    expect(glossarioAntigoHref({ aba: 'glossario', termo: 'a&b=c' })).toBe('/glossario?termo=a%26b%3Dc')
    expect(glossarioAntigoHref({ aba: 'glossario', termo: ['a', 'b'] })).toBe('/glossario')
  })

  it('leaves every other address on the Comunicação page', () => {
    for (const params of [{}, { aba: 'eventos' }, { aba: 'Glossario' }, { termo: 'degradacao' }]) {
      expect(glossarioAntigoHref(params), JSON.stringify(params)).toBeNull()
    }
  })
})
