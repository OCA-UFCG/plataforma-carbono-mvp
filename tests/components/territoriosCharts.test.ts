import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ComparisonBar, { type ComparisonBarProps } from '@/components/territorios/charts/ComparisonBar'
import LevelsBar, { type Level, type LevelsBarProps } from '@/components/territorios/charts/LevelsBar'
import { rainClassPct } from '@/components/territorios/charts/RainClassBar'
import StepFigure from '@/components/territorios/charts/StepFigure'
import YearBars, { type YearBarsProps } from '@/components/territorios/charts/YearBars'
import YearLines, { labelTops, linePath, type YearLinesProps } from '@/components/territorios/charts/YearLines'
import YearStrip, { type YearStripProps } from '@/components/territorios/charts/YearStrip'
import { inkOn } from '@/components/territorios/charts/ChartFigure'
import { FIRE_COLORS, LAND_USE_COLORS, REFERENCE_COLOR, STEP_COLORS } from '@/config/territorios/palette'
import { contrast } from '@/lib/color'
import type { RainChartData, RainYearKind } from '@/types/territorios'

// Values of Campina Grande (PB) and of the whole Caatinga as the API returned
// them on 2026-09-27, fire on 2026-10-05 (municipios|campina-grande and
// bioma|bioma-caatinga).

const html = <P extends object>(component: ComponentType<P>, props: P) =>
  renderToStaticMarkup(createElement(component, props))

/** Every percentage the markup positions or sizes something with. */
function placedPercents(markup: string): number[] {
  return [...markup.matchAll(/(?:width|left|padding-left|padding-right|--at):\s*(-?[\d.]+)%/g)].map((m) => Number(m[1]))
}

function expectSound(markup: string) {
  expect(markup).not.toMatch(/NaN|undefined|Infinity/)
  expect(markup).not.toMatch(/width:\s*-/)
  for (const pct of placedPercents(markup)) {
    expect(pct).toBeGreaterThanOrEqual(0)
    expect(pct).toBeLessThanOrEqual(100)
  }
}

const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const tPerHa = (n: number) => `${nf0.format(n)} t`

const FIRE_LEVELS: Level[] = [
  { key: 'never', name: 'Nunca queimou', color: FIRE_COLORS.never },
  { key: 'once', name: '1 vez', color: FIRE_COLORS.once },
  { key: 'twoToFour', name: '2 a 4 vezes', color: FIRE_COLORS.twoToFour },
  { key: 'fivePlus', name: '5 vezes ou mais', color: FIRE_COLORS.fivePlus },
]

const CG_REGION_HA = 59_298.68
const CG_RECURRENCE = {
  once: (1_455.74 / CG_REGION_HA) * 100,
  twoToFour: (357.68 / CG_REGION_HA) * 100,
  fivePlus: (49.75 / CG_REGION_HA) * 100,
  never: 100 - (1_863.17 / CG_REGION_HA) * 100,
}
const BIOME_RECURRENCE = { never: 87.96, once: 7.37, twoToFour: 4.11, fivePlus: 0.55 }

const CG_FIRE_YEARS = [
  20, 3, 85, 64, 16, 50, 166, 9, 60, 49, 70, 162, 47, 27, 330, 97, 174, 51, 31, 232,
  136, 47, 11, 307, 135, 20, 7, 57, 9, 4, 16, 15, 11, 5, 0, 6, 22, 78, 48,
].map((ha, i) => ({ year: 1985 + i, sharePct: (ha / CG_REGION_HA) * 100 }))

const CG_RAIN_MM = [
  883.8, 731.0, 493.4, 686.5, 618.7, 383.9, 479.5, 492.9, 258.9, 533.9,
  443.9, 510.1, 506.0, 275.6, 459.6, 837.3, 532.6, 594.5, 498.3, 807.8,
  553.6, 502.7, 578.8, 689.7, 699.4, 584.7, 912.5, 433.1, 611.4, 609.6,
  499.2, 496.6, 433.8, 582.8, 568.7, 666.7, 379.6, 793.8, 610.5, 750.8,
]

function rainData(values: (number | null)[], highlightYear = 2024): RainChartData {
  const known = values.filter((v): v is number => v !== null)
  const meanMm = known.reduce((a, b) => a + b, 0) / known.length
  const sorted = [...known].sort((a, b) => a - b)
  const terciles = { lowMm: sorted[Math.floor(sorted.length / 3)], highMm: sorted[Math.floor((2 * sorted.length) / 3)] }
  const kindOf = (v: number | null): RainYearKind | null =>
    v === null ? null : v < terciles.lowMm ? 'seco' : v > terciles.highMm ? 'chuvoso' : 'normal'
  return {
    years: values.map((valueMm, i) => ({ year: 1985 + i, valueMm, kind: kindOf(valueMm) })),
    meanMm,
    terciles,
    highlightYear,
    mean: { here: meanMm, reference: 701 },
  }
}

const stock = (over: Partial<ComparisonBarProps> = {}): ComparisonBarProps => ({
  here: 46.0, reference: 55.1, max: 60, format: tPerHa, color: STEP_COLORS.estoque,
  description: 'Carbono por hectare: aqui 46 t, na Caatinga 55 t.', ...over,
})

describe('StepFigure', () => {
  it('writes the number and its unit', () => {
    const markup = html(StepFigure, { value: '2,7', unit: 'milhões de t', color: STEP_COLORS.estoque })
    expect(markup).toContain('>2,7</span>')
    expect(markup).toContain('>milhões de t</span>')
    expect(markup).toContain(`color:${STEP_COLORS.estoque}`)
    expectSound(markup)
  })
})

describe('ComparisonBar', () => {
  it('draws Campina Grande against the Caatinga, with the description as the figure caption', () => {
    const markup = html(ComparisonBar, stock())
    expect(markup).toMatch(/^<figure class="tg-chart tg-cmp"><figcaption class="tg-sr">Carbono por hectare: aqui 46 t, na Caatinga 55 t.<\/figcaption><div class="tg-graphic" aria-hidden="true">/)
    expect(markup).toContain('Aqui <b class="tg-num">46 t</b>')
    expect(markup).toContain('Caatinga <b class="tg-num">55 t</b>')
    expect(markup).toContain('width:76.67%')
    expect(markup).toContain('--at:91.83%')
    expectSound(markup)
  })

  it('leaves the marker and its label out when the biome has no value', () => {
    const markup = html(ComparisonBar, stock({ reference: null, description: 'Carbono por hectare: 46 t.' }))
    expect(markup).not.toContain('Caatinga')
    expect(markup).not.toContain('tg-cmp-marker')
    expectSound(markup)
  })

  it('draws no fill for a territory at 0 and keeps both labels inside the row', () => {
    const markup = html(ComparisonBar, stock({ here: 0, reference: 60 }))
    expect(markup).not.toContain('tg-cmp-fill')
    expect(markup).toContain('padding-left:0%')
    expect(markup).toContain('padding-right:0%;text-align:right')
    expectSound(markup)
  })

  it('stops a value past the maximum at the end of the bar and still prints it', () => {
    const markup = html(ComparisonBar, stock({ here: 80, reference: 0 }))
    expect(markup).toContain('width:100%')
    expect(markup).toContain('Aqui <b class="tg-num">80 t</b>')
    expect(markup).toContain('--at:0%')
    expectSound(markup)
  })

  it('survives a scale without a maximum', () => {
    expectSound(html(ComparisonBar, stock({ max: 0 })))
  })
})

describe('LevelsBar', () => {
  const props: LevelsBarProps = {
    levels: FIRE_LEVELS,
    rows: [
      { label: 'Aqui', shares: CG_RECURRENCE },
      { label: 'Caatinga', shares: BIOME_RECURRENCE },
    ],
    description: 'Parte da área por número de anos com fogo.',
  }

  it('stacks the fire classes in order and lists every class with its share', () => {
    const markup = html(LevelsBar, props)
    const at = FIRE_LEVELS.map((l) => markup.indexOf(`</span>${l.name}</span>`))
    expect(at.every((i) => i > 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    // Campina Grande: 96,9% never burned, 2,5% once, 0,6% two to four times, 0,08% five or more.
    for (const share of ['97%', '2,5%', '0,6%', '&lt; 0,1%', '88%', '7,4%', '4,1%']) expect(markup).toContain(`>${share}<`)
    expect(markup.match(/class="tg-seg"/g)).toHaveLength(4 + 4)
    expectSound(markup)
  })

  it('outlines the light classes and writes on every class at 4.5:1', () => {
    const markup = html(LevelsBar, props)
    expect(markup).toContain(`background:${FIRE_COLORS.never};box-shadow:inset 0 0 0 1px`)
    for (const l of FIRE_LEVELS) expect(contrast(inkOn(l.color), l.color), l.key).toBeGreaterThanOrEqual(4.5)
  })

  it('draws no segment for a class without area, and an empty bar for a row without shares', () => {
    const markup = html(LevelsBar, {
      ...props,
      rows: [{ label: 'Aqui', shares: { never: 100, once: 0, twoToFour: 0, fivePlus: 0 } }, { label: 'Caatinga', shares: {} }],
    })
    expect(markup.match(/class="tg-seg"/g)).toHaveLength(1)
    expect(markup).toContain('tg-levels-bar--empty')
    expectSound(markup)
  })
})

describe('YearBars', () => {
  const props: YearBarsProps = {
    years: CG_FIRE_YEARS,
    peakYear: 1999,
    reference: 0.559,
    color: STEP_COLORS.fogo,
    axisLabel: 'Área queimada (%)',
    description: 'Parte da área queimada em cada ano, de 1985 a 2023.',
  }

  it('draws one bar per burned year of Campina Grande on a percent axis, every fifth year named', () => {
    const markup = html(YearBars, props)
    expect(markup.match(/class="tg-yearbars-col"/g)).toHaveLength(39)
    // 2019 burned nothing: no bar in its column.
    expect(markup.match(/class="tg-yearbars-bar"/g)).toHaveLength(38)
    expect(markup).toContain('1999: <b class="tg-num">0,6%</b>')
    const named = [...markup.matchAll(/<span style="left:[\d.]+%">(\d{4})<\/span>/g)].map((m) => m[1])
    // 2020 would touch 2023, the last year, and stays unnamed.
    expect(named).toEqual(['1985', '1990', '1995', '2000', '2005', '2010', '2015', '2023'])
    // The 0,8 scale in quarters, and the axis named along its edge.
    expect([...markup.matchAll(/<span style="bottom:[\d.]+%">([\d,]+)<\/span>/g)].map((m) => m[1]))
      .toEqual(['0,0', '0,2', '0,4', '0,6', '0,8'])
    expect(markup).toContain('>Área queimada (%)</span>')
    expect(markup).toContain('>Caatinga</span>')
    // The peak (0,56%) and the Caatinga mean (0,56%) end a 0,8 scale.
    expect(markup).toContain('--at:69.88%')
    expectSound(markup)
  })

  it('draws a territory where nothing burned with no bar, no callout and no NaN', () => {
    const markup = html(YearBars, { ...props, years: CG_FIRE_YEARS.map((y) => ({ ...y, sharePct: 0 })), peakYear: null })
    expect(markup).not.toContain('tg-yearbars-bar"')
    expect(markup).not.toContain('<b class="tg-num">')
    expectSound(markup)
  })

  it('leaves the Caatinga line out on the biome itself', () => {
    const markup = html(YearBars, { ...props, reference: null })
    expect(markup).not.toContain('Caatinga')
    expectSound(markup)
  })
})

describe('YearLines', () => {
  // Native vegetation of Campina Grande and of the Caatinga, 1985-2025, as the
  // API returned it on 2026-11-22, the step's figures at both ends.
  const yearly = (values: number[]) => values.map((sharePct, i) => ({ year: 1985 + i, sharePct }))
  const CG = yearly([
    34.04, 34.32, 34.33, 32.65, 29.44, 28.42, 28.03, 27.08, 26.43, 26.47, 26.03, 25.1, 24.54, 24.26, 24.36, 25.8,
    28.71, 29.54, 30.36, 31.26, 31.84, 32.19, 32.34, 32.27, 31.38, 32.07, 32.54, 32.62, 32.51, 32.74, 32.94, 33.24,
    33.42, 33.46, 33.22, 33.03, 32.62, 31.87, 32.08, 31.81, 32.25,
  ])
  const BIOME = yearly([
    74.06, 74.07, 73.89, 73.4, 72.8, 72.17, 71.64, 71.12, 70.62, 70.11, 69.79, 69.57, 69.45, 69.12, 69.14, 69.06,
    68.81, 68.63, 68.39, 68.09, 68.01, 67.93, 67.84, 67.66, 67.52, 67.35, 67.12, 66.72, 66.44, 66.32, 66.13, 66.08,
    66.06, 66.03, 65.92, 65.74, 65.38, 64.75, 63.97, 63.39, 62.6,
  ])
  const props: YearLinesProps = {
    lines: [
      { label: 'Território', color: LAND_USE_COLORS.nativa, points: CG },
      { label: 'Caatinga', color: REFERENCE_COLOR, points: BIOME, dashed: true },
    ],
    axisLabel: 'Vegetação nativa (%)',
    description: 'Parte da área com vegetação nativa em cada ano, de 1985 a 2025.',
  }

  it('draws 41 years of Campina Grande against the Caatinga, each line ending in its value', () => {
    const markup = html(YearLines, props)
    expect(markup).toContain('d="M0 65.96 L2.5 65.68 L5 65.67')
    expect(markup).toMatch(/L100 67\.75" stroke="#47651b"/)
    expect(markup.match(/tg-lines-path--dashed/g)).toHaveLength(1)
    expect(markup).toContain('>32%</b>')
    expect(markup).toContain('>63%</b>')
    const years = [...markup.matchAll(/left:[\d.]+%">(\d{4})</g)].map((m) => Number(m[1]))
    expect(years).toEqual([1985, 1995, 2005, 2015, 2025])
    expect(markup).toContain('>Vegetação nativa (%)<')
    expectSound(markup)
  })

  it('breaks a line at a year without data and keeps it on the axis past either end', () => {
    expect(linePath([
      { year: 2000, sharePct: 40 }, { year: 2001, sharePct: null }, { year: 2002, sharePct: 120 }, { year: 2003, sharePct: -5 },
    ], 2000, 3)).toBe('M0 60 M66.67 0 L100 100')
  })

  it('pushes apart end labels that would touch, without leaving the plot', () => {
    expect(labelTops([62.6, 32.25])).toEqual([37.4, 67.75])
    expect(labelTops([50, 48])).toEqual([50, 63])
    expect(labelTops([1, 0.5, null])).toEqual([87, 100, null])
  })
})

describe('YearStrip', () => {
  it('colors 40 years of Campina Grande and labels 2024 with its rainfall', () => {
    const data = rainData(CG_RAIN_MM)
    const markup = html(YearStrip, { data, description: '2024 foi chuvoso: 751 mm.' } satisfies YearStripProps)
    expect(markup.match(/class="tg-cell[ "]/g)).toHaveLength(40)
    expect(markup.match(/tg-cell--highlight/g)).toHaveLength(1)
    expect(markup).toContain('2024: <b class="tg-num">751 mm</b>')
    expect(markup).toContain('>1985</span><span>2024<')
    // The 10% rule is in "Sobre os dados", not on the step.
    expect(markup).not.toContain('10%')
    expect(markup).toContain('<span>Seco</span>')
    expect(markup).not.toContain('Sem dado')
    // 2024 is the last cell: its label ends at the right edge.
    expect(markup).toContain('padding-right:0%;text-align:right')
    expectSound(markup)
  })

  it('draws a series with a single year of data', () => {
    const values: (number | null)[] = CG_RAIN_MM.map(() => null)
    values[5] = 383.9
    const markup = html(YearStrip, { data: rainData(values), description: 'Sem dado de chuva em 2024.' })
    expect(markup.match(/tg-cell--empty/g)).toHaveLength(39)
    expect(markup).toContain('2024: <b class="tg-num">sem dado</b>')
    expect(markup).toContain('Sem dado')
    expectSound(markup)
  })

  it('places the label from the left for an early year', () => {
    const markup = html(YearStrip, { data: rainData(CG_RAIN_MM, 1993), description: '1993 foi seco.' })
    expect(markup).toContain('style="padding-left:20%"')
    expect(markup).toContain('1993: <b class="tg-num">259 mm</b>')
    expectSound(markup)
  })
})

describe('rainClassPct', () => {
  // Bands of 735 and 899 mm around an 817 mm mean, years from 500 to 1.200 mm.
  const at = (mm: number) => rainClassPct(mm, 735, 899, 500, 1_200)

  it('puts each class in its own third, the limits on the band edges', () => {
    expect(at(817)).toBe(50)
    expect(at(735)).toBeCloseTo(100 / 3, 1)
    expect(at(899)).toBeCloseTo(200 / 3, 1)
    expect(at(600)).toBeGreaterThan(0)
    expect(at(600)).toBeLessThan(100 / 3)
    expect(at(1_000)).toBeGreaterThan(200 / 3)
  })

  it('keeps the driest and rainiest years on the ends, and a value past them too', () => {
    expect(at(500)).toBe(0)
    expect(at(1_200)).toBe(100)
    expect(rainClassPct(400, 735, 899, 500, 1_200)).toBe(0)
  })
})
