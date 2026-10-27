import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import emissoesJson from '@/config/emissoes/emissoes.json'
import { camadaEmissoes } from '@/lib/emissoes/camada'
import { classeDe, classesEmissoes } from '@/lib/emissoes/classes'
import {
  anoEmissoes,
  chaveDaFeicao,
  corEmissoes,
  nivelEmissoes,
  rotulosClasses,
  valoresPorFeicao,
} from '@/lib/emissoes/mapa'
import { pendingEmissoes } from '@/lib/emissoes/runner'
import { anosDe } from '@/lib/emissoes/series'
import { isExclusiveSubtheme } from '@/config/mapa/groups'
import type { EmissoesCamadaPayload, EmissoesFile } from '@/types/emissoes'
import type { EmissionsLayerConfig, LayerConfig, VectorLayerConfig } from '@/types/mapa'

// Walks every municipality and state; under the full suite's parallel load
// it can take longer than the 5 s default.
const LONG_TEST_MS = 30_000

const data = emissoesJson as unknown as EmissoesFile
const config = appConfig.layers as LayerConfig[]
const emissionLayers = config.filter((l): l is EmissionsLayerConfig => l.type === 'emissions')

describe('classesEmissoes', () => {
  it('splits positive values at their quantiles, into six classes', () => {
    const valores = Array.from({ length: 101 }, (_, i) => i + 1)   // 1 to 101
    const c = classesEmissoes(valores)
    expect(c.limites).toEqual([21, 41, 61, 81, 96])
    expect(c.cores).toHaveLength(6)
  })

  it('gives removals one class when rare and three when common', () => {
    const positivos = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(classesEmissoes([-1, ...positivos]).limites[0]).toBe(0)
    expect(classesEmissoes([-1, ...positivos]).cores).toHaveLength(7)
    const comuns = classesEmissoes([...Array.from({ length: 50 }, (_, i) => -(i + 1)), ...positivos])
    expect(comuns.cores).toHaveLength(9)
    expect(comuns.limites.filter((l) => l < 0)).toHaveLength(2)
    expect(comuns.limites).toContain(0)
  })

  it('keeps the breaks strictly increasing after rounding', () => {
    const quase = [0.1001, 0.1002, 0.1003, 0.1004, 0.1005, 0.1006, 0.1007, 0.1008, 0.1009, 0.101]
    const { limites } = classesEmissoes(quase)
    expect(limites.every((v, i) => i === 0 || v > limites[i - 1])).toBe(true)
  })

  it('keeps one color more than breaks when quantiles tie or values are missing', () => {
    const casos = [
      classesEmissoes(Array.from({ length: 40 }, () => 1)),          // every quantile ties
      classesEmissoes([0, 0, 0]),                                     // no positive, no negative
      classesEmissoes([-1, -2, -3]),                                  // only removals
      classesEmissoes([NaN, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    ]
    for (const c of casos) {
      expect(c.cores).toHaveLength(c.limites.length + 1)
      expect(c.limites.every((v, i) => i === 0 || v > c.limites[i - 1])).toBe(true)
    }
  })

  it('puts a value in the class the step expression would', () => {
    const c = { limites: [0, 1, 2], cores: ['a', 'b', 'c', 'd'] }
    expect([-5, 0, 0.5, 1, 3].map((v) => classeDe(v, c))).toEqual([0, 1, 1, 2, 3])
  })
})

describe('emissions layers in layers.json', () => {
  it('cover the four series of both scopes, land use first', () => {
    expect(emissionLayers).toHaveLength(8)
    expect(emissionLayers.slice(0, 4).every((l) => l.emissoes.escopo === 'usoDaTerra')).toBe(true)
    const keys = emissionLayers.map((l) => `${l.emissoes.inventario}/${l.emissoes.medida}/${l.emissoes.escopo}`)
    expect(new Set(keys).size).toBe(8)
  })

  it('sit in one exclusive subtheme, so only one paints the recorte at a time', () => {
    for (const l of emissionLayers) expect(isExclusiveSubtheme(l.theme, l.subtheme), l.id).toBe(true)
    expect(new Set(emissionLayers.map((l) => `${l.theme}:${l.subtheme}`)).size).toBe(1)
  })

  it('offer on the slider exactly the years of their inventory', () => {
    for (const l of emissionLayers) {
      const [primeiro, ultimo] = data.fontes[l.emissoes.inventario].anos
      expect(l.temporal.dateRange.map((d) => Number(d.slice(0, 4))), l.id).toEqual([primeiro, ultimo])
    }
  })

  it('each build into a drawable payload', () => {
    for (const l of emissionLayers) {
      expect(['seeg', 'ct']).toContain(l.emissoes.inventario)
      expect(['brutas', 'liquidas']).toContain(l.emissoes.medida)
      expect(['total', 'usoDaTerra']).toContain(l.emissoes.escopo)
      const p = camadaEmissoes(data, l.emissoes)
      expect(p.anos, l.id).toEqual(anosDe(data.fontes[l.emissoes.inventario].anos))
      expect(p.classes.cores, l.id).toHaveLength(p.classes.limites.length + 1)
      expect(p.classes.limites.every((v, i) => i === 0 || v > p.classes.limites[i - 1]), l.id).toBe(true)
      for (const nivel of ['municipios', 'estados', 'bioma'] as const) {
        for (const s of Object.values(p.valores[nivel])) {
          expect(s, `${l.id}/${nivel}`).toHaveLength(p.anos.length)
          expect(s.every(Number.isFinite), `${l.id}/${nivel}`).toBe(true)
        }
      }
    }
  }, LONG_TEST_MS)
})

describe('nivelEmissoes', () => {
  const recorte = (id: string, pickPriority: number, visible: boolean) =>
    ({ id, name: id, type: 'vector', url: `/${id}.geojson`, visible, opacity: 80, color: '#000', pickPriority }) as VectorLayerConfig

  it('takes the finest of bioma, estados and municipios that is on', () => {
    expect(nivelEmissoes([recorte('bioma', 0, true)])?.nivel).toBe('bioma')
    expect(nivelEmissoes([recorte('bioma', 0, true), recorte('estados', 10, true)])?.nivel).toBe('estados')
    expect(nivelEmissoes([recorte('bioma', 0, true), recorte('municipios', 20, true)])?.nivel).toBe('municipios')
  })

  it('ignores the recortes without data and asks for one when none is on', () => {
    expect(nivelEmissoes([recorte('terras_indigenas', 30, true), recorte('estados', 10, true)])?.nivel).toBe('estados')
    expect(nivelEmissoes([recorte('terras_indigenas', 30, true), recorte('bioma', 0, false)])).toBeNull()
  })
})

describe('the layer payload', () => {
  const layer = emissionLayers.find((l) => l.id === 'emissoes_uso_liquidas_ct')!
  const payload = camadaEmissoes(data, layer.emissoes)

  it('holds every municipality, state and the biome for every year', () => {
    expect(payload.anos).toEqual(anosDe(data.fontes.ct.anos))
    expect(Object.keys(payload.valores.municipios)).toHaveLength(1095)
    expect(Object.keys(payload.valores.estados).sort()).toEqual(Object.keys(data.estados).sort())
    for (const s of Object.values(payload.valores.municipios)) expect(s).toHaveLength(payload.anos.length)
  })

  it('divides the biome total by the whole area', () => {
    const flu = data.bioma.ct.usoDaTerra
    const i = payload.anos.indexOf(2022)
    const esperado = (flu.saldos[i] + flu.solo[i] + flu.reservatorios[i]) / data.bioma.areaHa
    expect(payload.valores.bioma.bioma[i]).toBeCloseTo(esperado, 3)
  })

  it('has removal classes for a net layer where most municipalities remove', () => {
    expect(payload.classes.limites.filter((l) => l < 0).length).toBeGreaterThan(0)
    expect(payload.classes.cores).toHaveLength(payload.classes.limites.length + 1)
  })
})

describe('drawing helpers', () => {
  const payload: EmissoesCamadaPayload = {
    anos: [2024, 2025],
    unidade: 't CO2e/ha',
    classes: { limites: [0, 1], cores: ['#0f0', '#fee', '#f00'] },
    valores: { municipios: { 2504009: [0.5, 1.5] }, estados: { PB: [0.2, 0.3] }, bioma: { bioma: [0.1, 0.4] } },
  }

  it('joins values to features by IBGE code or state, null where there is none', () => {
    const features = [
      { type: 'Feature', properties: { code_muni: 9999999 }, geometry: null },
      { type: 'Feature', properties: { code_muni: 2504009 }, geometry: null },
    ] as unknown as GeoJSON.Feature[]
    expect(valoresPorFeicao(payload, 'municipios', features, 2025)).toEqual([null, 1.5])
    expect(valoresPorFeicao(payload, 'municipios', features, 1999)).toEqual([null, null])
    expect(chaveDaFeicao('estados', { abbrev_state: 'PB' })).toBe('PB')
    expect(chaveDaFeicao('bioma', {})).toBe('bioma')
  })

  it('opens on the last year until one is picked', () => {
    const layer = emissionLayers[0]
    expect(anoEmissoes(layer, undefined)).toBe(Number(layer.temporal.dateRange[1].slice(0, 4)))
    expect(anoEmissoes(layer, '2003-01-01')).toBe(2003)
  })

  it('colors by class and leaves a feature without value transparent', () => {
    const expr = corEmissoes(payload.classes, 'e_x') as unknown[]
    expect(expr[0]).toBe('case')
    expect(expr[2]).toEqual(['step', ['feature-state', 'e_x'], '#0f0', 0, '#fee', 1, '#f00'])
    expect(expr[3]).toBe('rgba(0,0,0,0)')
  })

  it('paints a single-class layer with its one color', () => {
    expect(corEmissoes({ limites: [], cores: ['#abc'] }, 'e_x')).toEqual(
      ['case', ['==', ['typeof', ['feature-state', 'e_x']], 'number'], '#abc', 'rgba(0,0,0,0)'],
    )
    expect(rotulosClasses({ limites: [], cores: ['#abc'] })).toHaveLength(1)
  })

  it('labels each class in Brazilian number format', () => {
    expect(rotulosClasses({ limites: [-0.5, 0, 1.25], cores: [] })).toEqual([
      'abaixo de -0,5', '-0,5 a 0', '0 a 1,25', '1,25 ou mais',
    ])
  })

  it('asks for the values of the visible emissions layers only, once', () => {
    const on = { ...emissionLayers[0], visible: true }
    const off = { ...emissionLayers[1], visible: false }
    expect(pendingEmissoes([on, off], {})).toEqual([on.id])
    expect(pendingEmissoes([on, off], { [on.id]: { status: 'loading' } })).toEqual([])
  })
})
