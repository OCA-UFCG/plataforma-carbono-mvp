import { describe, expect, it } from 'vitest'
import emissoesJson from '@/config/emissoes/emissoes.json'
import { formatarCo2e, linhasPorSetor, SERIES_SETOR, unidadeDaSelecao, valorDaMedida } from '@/lib/emissoes/painel'
import { posicoesUsoDaTerra, unidadeDe, unidadeEmissoes } from '@/lib/emissoes/unidade'
import type { EmissoesFile } from '@/types/emissoes'

const data = emissoesJson as unknown as EmissoesFile
const posicoes = { seeg: posicoesUsoDaTerra(data, 'seeg'), ct: posicoesUsoDaTerra(data, 'ct') }
const campinaGrande = unidadeEmissoes(data, 'municipios', '2504009', posicoes)!

describe('unidadeDaSelecao', () => {
  it('reads the IBGE code, the state or the biome off the selected feature', () => {
    expect(unidadeDaSelecao({ recorteId: 'municipios', properties: { code_muni: 2504009 } }))
      .toEqual({ nivel: 'municipios', chave: '2504009' })
    expect(unidadeDaSelecao({ recorteId: 'estados', properties: { abbrev_state: 'PB' } }))
      .toEqual({ nivel: 'estados', chave: 'PB' })
    expect(unidadeDaSelecao({ recorteId: 'bioma', properties: {} })).toEqual({ nivel: 'bioma', chave: 'bioma' })
  })

  it('has no unit for a drawing or a recorte without emissions', () => {
    expect(unidadeDaSelecao(undefined)).toBeNull()
    expect(unidadeDaSelecao({ recorteId: 'terras_indigenas', properties: { code_muni: 2504009 } })).toBeNull()
  })
})

describe('the unit payload', () => {
  it('resolves every level and nothing outside the file', () => {
    expect(unidadeDe(data, 'bioma', 'bioma')).toBe(data.bioma)
    expect(unidadeDe(data, 'estados', 'PB')).toBe(data.estados.PB)
    expect(unidadeDe(data, 'municipios', '9999999')).toBeNull()
    expect(unidadeDe(data, 'municipios', 'constructor')).toBeNull()
    expect(unidadeEmissoes(data, 'estados', 'PB', posicoes)?.posicao).toBeNull()
    expect(campinaGrande.fontes).toEqual({ seeg: data.fontes.seeg.colecao, ct: data.fontes.ct.versao, gwp: data.fontes.gwp })
  })

  it('ranks every municipality from 1, the largest, to at most 1,095', () => {
    const total = Object.keys(data.municipios).length
    const i = campinaGrande.anos.seeg.indexOf(2024)
    const ranks2024 = [...posicoes.seeg.values()].map((r) => r[i])
    expect(Math.min(...ranks2024)).toBe(1)
    expect(Math.max(...ranks2024)).toBeLessThanOrEqual(total)
    // The municipality ranked first holds the largest land-use gross emission of the year.
    const first = [...posicoes.seeg.entries()].find(([, r]) => r[i] === 1)![0]
    const top = valorDaMedida(unidadeEmissoes(data, 'municipios', first, posicoes)!, { inventario: 'seeg', medida: 'brutas', escopo: 'usoDaTerra' }, 2024)!
    for (const code of Object.keys(data.municipios).slice(0, 50)) {
      const v = valorDaMedida(unidadeEmissoes(data, 'municipios', code, posicoes)!, { inventario: 'seeg', medida: 'brutas', escopo: 'usoDaTerra' }, 2024)!
      expect(v).toBeLessThanOrEqual(top)
    }
  })
})

describe('valorDaMedida', () => {
  it('gives the layer measure in tonnes, null outside the inventory years', () => {
    const outros = valorDaMedida(campinaGrande, { inventario: 'ct', medida: 'brutas', escopo: 'total' }, 2025)!
    const flu = campinaGrande.ct.usoDaTerra
    const i = campinaGrande.anos.ct.indexOf(2025)
    // climatetrace.org shows 810,798 t for all sectors but land use.
    expect(outros - flu.brutas[i] - flu.reservatorios[i]).toBe(810_798)
    expect(valorDaMedida(campinaGrande, { inventario: 'ct', medida: 'brutas', escopo: 'total' }, 2003)).toBeNull()
  })
})

describe('linhasPorSetor', () => {
  it('splits land use so its two parts add up to the net value', () => {
    for (const inventario of ['seeg', 'ct'] as const) {
      for (const linha of linhasPorSetor(campinaGrande, inventario)) {
        const liquido = valorDaMedida(campinaGrande, { inventario, medida: 'liquidas', escopo: 'usoDaTerra' }, linha.ano)!
        expect(linha.usoEmissao + linha.usoRemocao).toBeCloseTo(liquido, 6)
      }
    }
  })

  it('keeps removals below zero and emissions above it, for every municipality and state', () => {
    const unidades = [
      ...Object.keys(data.municipios).map((k) => unidadeEmissoes(data, 'municipios', k, null)!),
      ...Object.keys(data.estados).map((k) => unidadeEmissoes(data, 'estados', k, null)!),
    ]
    for (const u of unidades) {
      for (const linha of linhasPorSetor(u, 'ct')) {
        expect(linha.usoRemocao, u.chave).toBeLessThanOrEqual(0)
        expect(linha.usoEmissao, u.chave).toBeGreaterThanOrEqual(0)
      }
      for (const linha of linhasPorSetor(u, 'seeg')) expect(linha.usoRemocao, u.chave).toBeLessThanOrEqual(0)
    }
  })

  it('stacks to the inventory total of the net measure', () => {
    const bioma = unidadeEmissoes(data, 'bioma', 'bioma', null)!
    for (const inventario of ['seeg', 'ct'] as const) {
      for (const linha of linhasPorSetor(bioma, inventario)) {
        const soma = SERIES_SETOR[inventario].reduce((a, s) => a + linha[s.key], 0)
        const total = valorDaMedida(bioma, { inventario, medida: 'liquidas', escopo: 'total' }, linha.ano)!
        expect(soma).toBeCloseTo(total, 3)
      }
    }
  })
})

describe('formatarCo2e', () => {
  it('scales tonnes to mil t and Mt in Brazilian format', () => {
    expect(formatarCo2e(512)).toEqual({ valor: '512', unidade: 't CO2e' })
    expect(formatarCo2e(-45_678)).toEqual({ valor: '-45,7', unidade: 'mil t CO2e' })
    expect(formatarCo2e(128_595_565)).toEqual({ valor: '128,6', unidade: 'Mt CO2e' })
    // Scaled on the rounded value, never "1.000,0 mil t".
    expect(formatarCo2e(999_960)).toEqual({ valor: '1,0', unidade: 'Mt CO2e' })
    expect(formatarCo2e(999.7)).toEqual({ valor: '1,0', unidade: 'mil t CO2e' })
  })
})
