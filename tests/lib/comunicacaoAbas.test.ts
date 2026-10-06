import { describe, expect, it } from 'vitest'
import { abaHref, parseAba } from '@/lib/marketing/comunicacaoAbas'

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
