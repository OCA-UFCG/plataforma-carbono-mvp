import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ComparisonBar, { type ComparisonBarProps } from '@/components/territorios/charts/ComparisonBar'
import Dumbbell, { type DumbbellProps } from '@/components/territorios/charts/Dumbbell'
import LevelsBar, { type Level, type LevelsBarProps } from '@/components/territorios/charts/LevelsBar'
import StepFigure from '@/components/territorios/charts/StepFigure'
import YearBars, { type YearBarsProps } from '@/components/territorios/charts/YearBars'
import YearStrip, { type YearStripProps } from '@/components/territorios/charts/YearStrip'
import { inkOn } from '@/components/territorios/charts/ChartFigure'
import { FIRE_COLORS, LAND_USE_COLORS, STEP_COLORS } from '@/config/territorios/palette'
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
const pct0 = (n: number) => `${nf0.format(n)}%`

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
  const kindOf = (v: number | null): RainYearKind | null =>
    v === null ? null : v < meanMm * 0.9 ? 'seco' : v > meanMm * 1.1 ? 'chuvoso' : 'normal'
  return {
    years: values.map((valueMm, i) => ({ year: 1985 + i, valueMm, kind: kindOf(valueMm) })),
    meanMm,
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

  it('compares the forest share, 13% against 27%, in the compact form', () => {
    const markup = html(ComparisonBar, stock({
      here: 13.4, reference: 27, max: 100, format: pct0, compact: true, color: STEP_COLORS.fluxo,
      description: 'Área com árvores: aqui 13%, na Caatinga 27%.',
    }))
    expect(markup).toContain('tg-cmp--compact')
    expect(markup).toContain('Aqui <b class="tg-num">13%</b>')
    expect(markup).toContain('Caatinga <b class="tg-num">27%</b>')
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
    description: 'Parte da área queimada em cada ano, de 1985 a 2023.',
  }

  it('draws one bar per burned year of Campina Grande and labels 1999, 1985 and 2023', () => {
    const markup = html(YearBars, props)
    expect(markup.match(/class="tg-yearbars-col"/g)).toHaveLength(39)
    // 2019 burned nothing: no bar in its column.
    expect(markup.match(/class="tg-yearbars-bar"/g)).toHaveLength(38)
    expect(markup).toContain('1999: <b class="tg-num">0,6%</b>')
    expect(markup).toContain('>1985</span><span>2023<')
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

describe('Dumbbell', () => {
  const props: DumbbellProps = {
    rows: [
      { label: 'Aqui', from: 34.0, to: 27.3 },
      { label: 'Caatinga', from: 70.7, to: 60.1 },
    ],
    fromLabel: '1985',
    toLabel: '2024',
    color: LAND_USE_COLORS.nativa,
    format: pct0,
    description: 'Vegetação nativa: aqui de 34% em 1985 para 27% em 2024; na Caatinga, de 71% para 60%.',
  }

  it('draws native vegetation in 1985 and 2024, here and in the Caatinga', () => {
    const markup = html(Dumbbell, props)
    for (const value of ['34%', '27%', '71%', '60%']) expect(markup).toContain(`>${value}<`)
    expect(markup).toContain('left:27.3%;width:6.7%')
    expect(markup).toContain('>0%</span><span>100%<')
    expectSound(markup)
  })

  it('keeps an unchanged value and a value past the maximum on the scale', () => {
    const markup = html(Dumbbell, { ...props, rows: [{ label: 'Aqui', from: 50, to: 50 }, { label: 'Caatinga', from: 0, to: 140 }] })
    expect(markup).toContain('left:50%;width:0%')
    expect(markup).toContain('left:0%;width:100%')
    expectSound(markup)
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
