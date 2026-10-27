import { describe, expect, it } from 'vitest'
import { abaHref, glossarioAntigoHref, parseAba } from '@/lib/marketing/comunicacaoAbas'

describe('parseAba', () => {
  it('opens the events tab only for ?aba=eventos', () => {
    expect(parseAba('eventos')).toBe('eventos')
    expect(parseAba('conteudo')).toBe('conteudo')
  })

  it('opens the first tab for anything else', () => {
    for (const value of [undefined, '', 'Eventos', 'outra', ['eventos', 'eventos']]) {
      expect(parseAba(value), JSON.stringify(value)).toBe('conteudo')
    }
  })
})

describe('abaHref', () => {
  const base = 'https://caativar.example/comunicacao'

  it('writes the events tab into the address and leaves the first one bare', () => {
    expect(abaHref(new URL(base), 'eventos')).toBe('/comunicacao?aba=eventos')
    expect(abaHref(new URL(`${base}?aba=eventos`), 'conteudo')).toBe('/comunicacao')
  })

  it('keeps the rest of the address', () => {
    expect(abaHref(new URL(`${base}?utm_source=x#topo`), 'eventos')).toBe(
      '/comunicacao?utm_source=x&aba=eventos#topo',
    )
    expect(abaHref(new URL(`${base}?aba=eventos&utm_source=x`), 'conteudo')).toBe(
      '/comunicacao?utm_source=x',
    )
  })
})

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
