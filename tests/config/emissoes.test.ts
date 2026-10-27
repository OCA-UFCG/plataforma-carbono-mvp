import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import emissoesJson from '@/config/emissoes/emissoes.json'
import { CT_SETORES, SEEG_SETORES, SETOR_DESTAQUE, anosDe, intensidade, serieEmissoes } from '@/lib/emissoes/series'
import type { EmissoesFile, EmissoesUnidade } from '@/types/emissoes'

// Walks every municipality and state; under the full suite's parallel load
// it can take longer than the 5 s default.
const LONG_TEST_MS = 30_000

const data = emissoesJson as unknown as EmissoesFile
const SEEG_ANOS = anosDe(data.fontes.seeg.anos)
const CT_ANOS = anosDe(data.fontes.ct.anos)

const municipios = (JSON.parse(readFileSync('public/data/vector/municipios.geojson', 'utf8')) as GeoJSON.FeatureCollection)
  .features.map((f) => f.properties as { code_muni: number; name_muni: string; abbrev_state: string })

/** Every series of a unit, keyed by its path, to compare units series by series. */
function series(u: EmissoesUnidade): Map<string, number[]> {
  const out = new Map<string, number[]>()
  for (const [setor, tipos] of Object.entries(u.seeg)) {
    for (const [tipo, s] of Object.entries(tipos ?? {})) out.set(`seeg/${setor}/${tipo}`, s)
  }
  for (const [setor, s] of Object.entries(u.ct.setores)) out.set(`ct/${setor}`, s!)
  for (const [familia, s] of Object.entries(u.ct.usoDaTerra)) out.set(`ct/usoDaTerra/${familia}`, s)
  return out
}

function somaDe(unidades: EmissoesUnidade[]): Map<string, number[]> {
  const out = new Map<string, number[]>()
  for (const u of unidades) {
    for (const [key, s] of series(u)) {
      const acc = out.get(key) ?? new Array<number>(s.length).fill(0)
      out.set(key, acc.map((v, i) => v + s[i]))
    }
  }
  return out
}

const nonZero = (m: Map<string, number[]>) =>
  new Map([...m].filter(([key, s]) => key.startsWith('ct/usoDaTerra/') || s.some((v) => v !== 0)))

describe('config/emissoes/emissoes.json', () => {
  it('holds exactly the municipalities of municipios.geojson, under the same name and state', () => {
    // The map joins values to features by this code; a code missing on either
    // side would leave a municipality blank or a value with nowhere to go.
    expect(Object.keys(data.municipios).sort()).toEqual(municipios.map((p) => String(p.code_muni)).sort())
    for (const p of municipios) {
      const m = data.municipios[String(p.code_muni)]
      expect(m.nome, String(p.code_muni)).toBe(p.name_muni)
      expect(m.uf, String(p.code_muni)).toBe(p.abbrev_state)
    }
  })

  it('gives every series one finite integer per year of its inventory', () => {
    const units = [data.bioma, ...Object.values(data.estados), ...Object.values(data.municipios)]
    for (const u of units) {
      expect(u.areaHa).toBeGreaterThan(0)
      expect(Object.keys(u.ct.usoDaTerra).sort()).toEqual(['brutas', 'reservatorios', 'saldos', 'solo'])
      for (const [key, s] of series(u)) {
        expect(s.length, key).toBe(key.startsWith('seeg/') ? SEEG_ANOS.length : CT_ANOS.length)
        expect(s.every(Number.isInteger), key).toBe(true)
      }
    }
  }, LONG_TEST_MS)

  it('sums each state from its municipalities and the biome from all of them', () => {
    const todos = Object.values(data.municipios)
    expect(Object.keys(data.estados).sort()).toEqual([...new Set(todos.map((m) => m.uf))].sort())
    expect(data.bioma.municipios).toBe(todos.length)
    expect(data.bioma.areaHa).toBe(todos.reduce((a, m) => a + m.areaHa, 0))
    expect(series(data.bioma)).toEqual(nonZero(somaDe(todos)))
    for (const [uf, estado] of Object.entries(data.estados)) {
      const membros = todos.filter((m) => m.uf === uf)
      expect(estado.municipios, uf).toBe(membros.length)
      expect(estado.areaHa, uf).toBe(membros.reduce((a, m) => a + m.areaHa, 0))
      expect(series(estado), uf).toEqual(nonZero(somaDe(membros)))
    }
  })

  it('has a label for every sector it carries', () => {
    for (const u of Object.values(data.municipios)) {
      for (const setor of Object.keys(u.seeg)) expect(SEEG_SETORES, setor).toHaveProperty(setor)
      for (const setor of Object.keys(u.ct.setores)) expect(CT_SETORES, setor).toHaveProperty(setor)
    }
    expect(SEEG_SETORES).toHaveProperty(SETOR_DESTAQUE.seeg)
    expect(CT_SETORES).toHaveProperty(SETOR_DESTAQUE.ct)
  })

  it('keeps "Emissão (NCI)" only in land use, where SEEG puts the fires not tied to clearing', () => {
    for (const [setor, tipos] of Object.entries(data.bioma.seeg)) {
      if (setor !== SETOR_DESTAQUE.seeg) expect(tipos, setor).not.toHaveProperty('emissao_nci')
    }
    expect(data.bioma.seeg.uso_da_terra?.emissao_nci).toBeDefined()
  })
})

describe('series against values checked outside the build', () => {
  const i = (anos: number[], ano: number) => anos.indexOf(ano)

  it('SEEG gross emissions of the 1,095 municipalities in 2024 match one aggregated API query', () => {
    // Reconciliation of 25/10/2026: emissionsSummary over the 1,097 SEEG areas
    // of these municipalities, emissionTypeId [1], gasId 9, gave 128,595,559.64 t.
    // Each municipality is rounded to the tonne, so the sum may drift by up to
    // 0.5 t per municipality.
    const brutas = serieEmissoes(data.bioma, 'seeg', 'brutas', 'total', data.fontes)
    expect(Math.abs(brutas[i(SEEG_ANOS, 2024)] - 128_595_559.64)).toBeLessThanOrEqual(1095 * 0.5)
  })

  it('Climate TRACE all sectors but land use, Campina Grande 2025: 810,798 t (v5.11; the site reads 810.8K)', () => {
    // climatetrace.org, "All Sectors" panel of the municipality, CO2e 100yr.
    const cg = data.municipios['2504009']
    const outros = Object.values(cg.ct.setores).reduce((a, s) => a + s![i(CT_ANOS, 2025)], 0)
    expect(outros).toBe(810_798)
  })

  it('Climate TRACE biomass balance of 2022 matches the comparison script over the same download', () => {
    // A regression check of the aggregation (compara_seeg_ct.py: -395.05 Mt),
    // not an outside source: both read the same v5.11 query.
    expect(data.bioma.ct.usoDaTerra.saldos[i(CT_ANOS, 2022)] / 1e6).toBeCloseTo(-395.05, 2)
  })

  it('leaves out the national oil-and-gas aggregate Climate TRACE places in Pintadas (BA)', () => {
    // About 8 Mt/yr before the exclusion; Pintadas has no oil or gas field.
    const pintadas = data.municipios['2924652']
    for (const v of pintadas.ct.setores['fossil-fuel-operations'] ?? []) expect(v).toBeLessThan(100_000)
  })

  it('leaves out international shipping, which Climate TRACE puts at the port of Pecém', () => {
    // São Gonçalo do Amarante (CE) transport in 2025: 297,274 t domestic, plus
    // 224,620 t of international shipping before the exclusion.
    const sga = data.municipios['2312403']
    expect(sga.ct.setores.transportation![i(CT_ANOS, 2025)]).toBeLessThan(400_000)
  })
})

describe('serieEmissoes and intensidade', () => {
  const u: EmissoesUnidade = {
    areaHa: 200,
    seeg: {
      uso_da_terra: { emissao: [10, 20], emissao_nci: [5, 5], remocao: [-30, -30] },
      residuos: { emissao: [1, 1] },
    },
    ct: {
      setores: { waste: [2, 2] },
      usoDaTerra: { brutas: [40, 4], saldos: [-100, 50], solo: [3, 3], reservatorios: [1, 1] },
    },
  }
  type Fontes = Parameters<typeof serieEmissoes>[4]
  const fontes = { seeg: { anos: [2000, 2001] }, ct: { anos: [2000, 2001] } } as Fontes

  it('builds SEEG gross and net as the SEEG platform does, without NCI', () => {
    expect(serieEmissoes(u, 'seeg', 'brutas', 'total', fontes)).toEqual([11, 21])
    expect(serieEmissoes(u, 'seeg', 'liquidas', 'total', fontes)).toEqual([-19, -9])
    expect(serieEmissoes(u, 'seeg', 'liquidas', 'usoDaTerra', fontes)).toEqual([-20, -10])
  })

  it('never adds the Climate TRACE gross land-use series to the balances', () => {
    expect(serieEmissoes(u, 'ct', 'brutas', 'usoDaTerra', fontes)).toEqual([41, 5])
    expect(serieEmissoes(u, 'ct', 'liquidas', 'usoDaTerra', fontes)).toEqual([-96, 54])
    expect(serieEmissoes(u, 'ct', 'liquidas', 'total', fontes)).toEqual([-94, 56])
  })

  it('reads the year range of the inventory asked for', () => {
    const curto = { seeg: { anos: [2000, 2001] }, ct: { anos: [2000, 2000] } } as Fontes
    expect(serieEmissoes(u, 'ct', 'brutas', 'usoDaTerra', curto)).toEqual([41])
    expect(serieEmissoes(u, 'seeg', 'brutas', 'usoDaTerra', curto)).toEqual([10, 20])
  })

  it('divides by the whole area', () => {
    expect(intensidade([100, -50], u.areaHa)).toEqual([0.5, -0.25])
  })
})
