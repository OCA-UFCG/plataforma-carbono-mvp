import { describe, expect, it } from 'vitest'
import { createElement, type ComponentProps, type ComponentType } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import ComparisonBar, { type ComparisonBarProps } from '@/components/territorios/charts/ComparisonBar'
import Dumbbell, { type DumbbellProps } from '@/components/territorios/charts/Dumbbell'
import LevelsBar, { type LevelsBarProps } from '@/components/territorios/charts/LevelsBar'
import StepFigure from '@/components/territorios/charts/StepFigure'
import YearStrip, { type YearStripProps } from '@/components/territorios/charts/YearStrip'
import { inkOn } from '@/components/territorios/charts/ChartFigure'
import { DEGRADATION_COLORS, LAND_USE_COLORS, STEP_COLORS } from '@/config/territorios/palette'
import { contrast } from '@/lib/color'
import { territoriosMessages, type TestLocale } from '../helpers/territoriosI18n'
import type { DegradationShare, RainChartData, RainYearKind } from '@/types/territorios'

// Values of Campina Grande (PB) and of the whole Caatinga as the API returned
// them on 2026-09-27 (municipios|campina-grande and bioma|bioma-caatinga).

// The charts read their labels from the messages, so they render inside the
// provider the root layout gives the app.
const html = <P extends object>(component: ComponentType<P>, props: P, locale: TestLocale = 'pt') =>
  renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale, messages: territoriosMessages(locale) } as ComponentProps<typeof NextIntlClientProvider>,
      createElement(component, props),
    ),
  )

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

/** Shares of the region per class code, the masked rest as code 0. */
function sharesOf(areasM2: Record<string, number>, regionM2: number): DegradationShare[] {
  const shares = Object.entries(areasM2).map(([code, m2]) => ({ code: Number(code), pct: (m2 / regionM2) * 100 }))
  const covered = shares.reduce((sum, s) => sum + s.pct, 0)
  return [...shares, { code: 0, pct: 100 - covered }]
}

const CG_DEGRADATION = sharesOf(
  { 2: 217621921.51403198, 3: 53567726.09822305, 4: 3298705.0007965686, 6: 234524137.29264715 },
  592948094.8050854,
)
const BIOME_DEGRADATION = sharesOf(
  { 1: 3708480652.195833, 2: 95067873708.24529, 3: 68222873527.83427, 4: 13305861068.718937, 5: 288955052.6450368, 6: 665444875749.839 },
  862619797029.1545,
)

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
    rows: [
      { label: 'Aqui', shares: CG_DEGRADATION },
      { label: 'Caatinga', shares: BIOME_DEGRADATION },
    ],
    description: 'Terra degradada: aqui 46%, na Caatinga 21%.',
  }

  it('stacks the levels in order and lists every level with its share', () => {
    const markup = html(LevelsBar, props)
    const names = ['Conservado', 'Nível 1 (leve)', 'Nível 2', 'Nível 3', 'Nível 4', 'Nível 5 (grave)', 'Sem dado']
    const at = names.map((name) => markup.indexOf(`</span>${name}</span>`))
    expect(at.every((i) => i > 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    // Campina Grande: 39,6% conserved, 36,7% at Nível 4, 14,2% without data.
    // Rounded as the sentence beside the chart: 37%, never 36,7%.
    expect(markup).toContain('>40%<')
    expect(markup).toContain('>37%<')
    expect(markup).toContain('>14%<')
    expect(markup).toContain('>9,0%<')
    // Nível 1 and Nível 5 are absent there: no segment, a zero in the legend.
    expect(markup.match(/class="tg-seg"/g)).toHaveLength(5 + 7)
    expect(markup).toContain('>0%<')
    expect(markup).toContain('repeating-linear-gradient(45deg')
    expectSound(markup)
  })

  it('leaves the no-data line out of the legend when no row has any', () => {
    const markup = html(LevelsBar, {
      rows: [{ label: 'Aqui', shares: [{ code: 6, pct: 60 }, { code: 2, pct: 40 }] }],
      description: 'Terra degradada: 40%.',
    })
    expect(markup).not.toContain('Sem dado')
    expectSound(markup)
  })

  it('draws an empty bar for a row without shares', () => {
    const markup = html(LevelsBar, { rows: [{ label: 'Aqui', shares: [] }], description: 'Sem dado.' })
    expect(markup).toContain('tg-levels-bar--empty')
    expect(markup).not.toContain('class="tg-seg"')
    expectSound(markup)
  })

  it('writes on every level color at 4.5:1', () => {
    for (const code of [1, 2, 3, 4, 5, 6]) {
      expect(contrast(inkOn(DEGRADATION_COLORS[code]), DEGRADATION_COLORS[code]), `code ${code}`).toBeGreaterThanOrEqual(4.5)
    }
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

describe('in English', () => {
  it('labels the comparison bar "Here" and "Caatinga" by default', () => {
    const markup = html(ComparisonBar, stock({ hereLabel: undefined, referenceLabel: undefined }), 'en')
    expect(markup).toContain('Here <b class="tg-num">46 t</b>')
    expect(markup).toContain('Caatinga <b class="tg-num">55 t</b>')
    expect(markup).not.toContain('Aqui')
    expectSound(markup)
  })

  it('names the degradation levels and writes shares with the English decimal point', () => {
    const markup = html(LevelsBar, {
      rows: [{ label: 'Here', shares: CG_DEGRADATION }, { label: 'Caatinga', shares: BIOME_DEGRADATION }],
      description: 'Degraded land: here 46%, in the Caatinga 21%.',
    }, 'en')
    const names = ['Conserved', 'Level 1 (light)', 'Level 2', 'Level 3', 'Level 4', 'Level 5 (severe)', 'No data']
    const at = names.map((name) => markup.indexOf(`</span>${name}</span>`))
    expect(at.every((i) => i > 0)).toBe(true)
    expect(markup).toContain('>9.0%<')
    expectSound(markup)
  })

  it('names the rain classes and writes the callout in English', () => {
    const markup = html(YearStrip, { data: rainData(CG_RAIN_MM), description: '2024 was wet: 751 mm.' }, 'en')
    expect(markup).toContain('2024: <b class="tg-num">751 mm</b>')
    expect(markup).toContain('<span>Dry</span>')
    expect(markup).toContain('<span>Wet</span>')
    expect(markup).not.toContain('Seco')
    expectSound(markup)
  })
})
