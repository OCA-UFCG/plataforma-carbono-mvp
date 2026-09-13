import { describe, expect, it } from 'vitest'
import { isoDate, numero, numeroCsv, slug } from '@/lib/mapa/format'

describe('numeroCsv', () => {
  it('uses a decimal comma and no thousands separator', () => {
    // No grouping on purpose: the dot would be ambiguous for a script importer.
    expect(numeroCsv(4760.1234)).toBe('4760,1234')
    expect(numeroCsv(1234567)).toBe('1234567')
  })

  it('caps at four decimal digits', () => {
    expect(numeroCsv(0.123456)).toBe('0,1235')
  })
})

describe('numero', () => {
  it('groups thousands and defaults to one decimal digit', () => {
    expect(numero(4760123.45)).toBe('4.760.123,5')
  })

  it('honours an explicit digit count', () => {
    expect(numero(4760123.45, 0)).toBe('4.760.123')
    expect(numero(0.12345, 3)).toBe('0,123')
  })
})

describe('slug', () => {
  it('strips accents and collapses separators', () => {
    expect(slug('São Domingos')).toBe('sao-domingos')
    expect(slug('PA ESTRELA DO NORTE')).toBe('pa-estrela-do-norte')
    expect(slug('Carbono Orgânico do Solo (0-30 cm)')).toBe('carbono-organico-do-solo-0-30-cm')
  })
})

describe('isoDate', () => {
  it('pads month and day', () => {
    expect(isoDate(new Date(2026, 8, 7))).toBe('2026-09-07')
  })
})
