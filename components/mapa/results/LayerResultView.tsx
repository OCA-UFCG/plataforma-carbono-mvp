'use client'

// The result of one layer in the "Resultados" panel, chosen by the layer's
// archetype in config/mapa/resultProfiles.ts. The territorial report does not
// render this; it keeps StatsChartView.

import { LAYER_META } from '@/config/mapa/layerMeta'
import type {
  AmountProfile,
  AnnualProfile,
  DistributionProfile,
  FluxProfile,
  RecurrenceProfile,
  ResultProfile,
} from '@/config/mapa/resultProfiles'
import { adaptive, coverageNote, edge, hectaresShort, percentShort, quantity, sourceNote } from '@/lib/mapa/results/format'
import { recurrenceSummary } from '@/lib/mapa/results/recurrence'
import { describeFlux, fluxInk } from '@/lib/mapa/carbonFlux'
import type { AreaBin, PanelResult, PlatformTheme, ProfiledResult, RasterLayerConfig } from '@/types/mapa'
import { BarList, Empty, Footnote, Hero, Pair, Stack, type Figure } from './blocks'
import StocksResult from './StocksResult'
import CompositionResult from './CompositionResult'

export interface LayerResultViewProps {
  theme:        PlatformTheme
  layer:        RasterLayerConfig
  profile:      ResultProfile
  result:       PanelResult
  temporalDate?: string
  /** Area of the analysed polygon in hectares, for the coverage note. */
  polygonHa:    number | null
}

/** The footnote of every result ends on the data's source. */
export function sourceOf(layer: RasterLayerConfig): string | null {
  return sourceNote(LAYER_META[layer.id]?.source)
}

export default function LayerResultView(props: LayerResultViewProps) {
  const { profile, result } = props

  let body: React.ReactNode = null
  switch (profile.archetype) {
    case 'stocks':
      if (result.kind === 'stocks') body = <StocksResult {...props} report={result.report} />
      break
    case 'composition':
      if (result.kind === 'categorical') body = <CompositionResult {...props} profile={profile} areas={result.areas} />
      break
    case 'amount':
      if (result.kind === 'amount') body = <AmountResult {...props} profile={profile} r={result} />
      break
    case 'distribution':
      if (result.kind === 'distribution') body = <DistributionResult {...props} profile={profile} r={result} />
      break
    case 'flux':
      if (result.kind === 'flux') body = <FluxResult {...props} profile={profile} r={result} />
      break
    case 'annual':
      if (result.kind === 'annual') body = <AnnualResult {...props} profile={profile} r={result} />
      break
    case 'recurrence':
      if (result.kind === 'recurrence') body = <RecurrenceResult {...props} profile={profile} r={result} />
      break
  }

  return (
    <Stack>{body}</Stack>
  )
}

type Of<K extends ProfiledResult['kind']> = Extract<ProfiledResult, { kind: K }>

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** "20 a 30", "acima de 60": the unit goes in the list's title, not on every row. */
function binLabel(b: AreaBin): string {
  return b.to === null ? `acima de ${edge(b.from)}` : `${edge(b.from)} a ${edge(b.to)}`
}

function Bands({ theme, bins, validHa, unit, color }: {
  theme: PlatformTheme; bins: AreaBin[]; validHa: number; unit?: string; color: string
}) {
  return (
    <BarList
      theme={theme}
      title="Área por faixa"
      hint={unit}
      rows={bins.map((b) => ({
        key: b.from,
        label: binLabel(b),
        value: b.areaHa,
        color,
        amount: hectaresShort(b.areaHa),
        share: percentShort(validHa > 0 ? (b.areaHa / validHa) * 100 : 0),
      }))}
    />
  )
}

const DENSITY_LABEL: Record<AmountProfile['densityBasis'], string> = {
  valid:     'Por hectare',
  woody:     'Por hectare de vegetação lenhosa',
  territory: 'Por hectare de território',
}

function AmountResult({ theme, profile, layer, r, polygonHa }: LayerResultViewProps & { profile: AmountProfile; r: Of<'amount'> }) {
  if (r.validHa <= 0) return <Empty theme={theme} text="Sem dado desta camada nesta área." />
  const total = quantity(r.total, profile.totalUnit)
  // One result speaks one unit: the density in t/ha beside a total in t.
  const perHaUnit = `${profile.totalUnit}/ha`
  const coverage = profile.densityBasis === 'territory'
    ? null
    : coverageNote(r.validHa, polygonHa, profile.densityBasis === 'woody' ? 'Vegetação lenhosa' : 'Dado')
  const pair: Figure[] = [{ label: DENSITY_LABEL[profile.densityBasis], value: adaptive(r.total / r.validHa), aside: perHaUnit }]
  if (profile.carbonFraction) {
    const carbon = quantity(r.total * profile.carbonFraction, 't C')
    pair.push({ label: 'Carbono', value: carbon.value, aside: carbon.unit })
  }
  // Where the layer has gaps the total covers only the part with data.
  const where = coverage && profile.densityBasis === 'valid' ? 'na parte com dado' : 'na área analisada'
  return (
    <>
      <Hero theme={theme} value={total.value} unit={total.unit} caption={`de ${lowerFirst(profile.totalLabel)} ${where}`} />
      <Pair theme={theme} items={pair} />
      <Bands theme={theme} bins={r.bins} validHa={r.validHa} unit={perHaUnit} color={theme.colors.accent} />
      <Footnote theme={theme} notes={[profile.note, coverage, sourceOf(layer)]} />
    </>
  )
}

function DistributionResult({ theme, layer, profile, r, polygonHa }: LayerResultViewProps & { profile: DistributionProfile; r: Of<'distribution'> }) {
  if (r.validHa <= 0 || !Number.isFinite(r.p50)) return <Empty theme={theme} text="Sem dado desta camada nesta área." />
  const pair: Figure[] = [{ label: 'Faixa de 80% da área', value: `${adaptive(r.p10)} a ${adaptive(r.p90)}`, aside: layer.unit }]
  if (profile.threshold) {
    const aboveHa = r.bins.filter((b) => b.from >= profile.threshold!.value).reduce((s, b) => s + b.areaHa, 0)
    pair.push({ label: profile.threshold.label, value: percentShort((aboveHa / r.validHa) * 100), aside: hectaresShort(aboveHa) })
  } else {
    pair.push({ label: 'Média', value: adaptive(r.mean), aside: layer.unit })
  }
  return (
    <>
      <Hero theme={theme} value={adaptive(r.p50)} unit={layer.unit} caption="mediana na área analisada" />
      <Pair theme={theme} items={pair} />
      <Bands theme={theme} bins={r.bins} validHa={r.validHa} unit={layer.unit} color={theme.colors.accent} />
      <Footnote theme={theme} notes={[profile.note, coverageNote(r.validHa, polygonHa), sourceOf(layer)]} />
    </>
  )
}

function FluxResult({ theme, layer, profile, r, polygonHa }: LayerResultViewProps & { profile: FluxProfile; r: Of<'flux'> }) {
  if (r.validHa <= 0) return <Empty theme={theme} text="Área fora da floresta mapeada pelo modelo do GFW." />
  const net = r.positive + r.negative
  const shown = profile.signed ? net : r.positive
  const scaled = quantity(Math.abs(shown), profile.totalUnit)
  const share = (ha: number) => percentShort((ha / r.validHa) * 100)

  // The net flux has no minus sign: its direction is the caption, in words, and
  // the number carries the emission or removal ink as a second cue.
  const direction = describeFlux(net).direction
  const hero = profile.signed ? (
    <Hero
      theme={theme}
      value={scaled.value}
      unit={scaled.unit}
      ink={fluxInk(direction, theme.colors)}
      caption={
        direction === 'removal' ? 'de sequestro líquido no período'
          : direction === 'emission' ? 'de emissão líquida no período'
            : 'em equilíbrio entre emissões e remoções no período'
      }
    />
  ) : (
    <Hero theme={theme} value={scaled.value} unit={scaled.unit} caption={`de ${lowerFirst(profile.totalLabel)} no período`} />
  )

  const pair: Figure[] = profile.signed
    ? [
        { label: 'Área de sumidouro', value: share(r.negativeHa), aside: hectaresShort(r.negativeHa) },
        { label: 'Área de fonte', value: share(r.positiveHa), aside: hectaresShort(r.positiveHa) },
      ]
    : [
        { label: 'Por hectare', value: adaptive(Math.abs(shown) / r.validHa), aside: `${profile.totalUnit}/ha` },
        { label: profile.totalUnit === 't CO2' ? 'Área com remoção' : 'Área com emissão', value: share(r.positiveHa), aside: hectaresShort(r.positiveHa) },
      ]

  return (
    <>
      {hero}
      <Pair theme={theme} items={pair} />
      <Footnote theme={theme} notes={[
        profile.note,
        coverageNote(r.validHa, polygonHa, 'Floresta do modelo do GFW'),
        sourceOf(layer),
      ]} />
    </>
  )
}

function AnnualResult({ theme, layer, profile, r, polygonHa }: LayerResultViewProps & { profile: AnnualProfile; r: Of<'annual'> }) {
  if (r.validHa <= 0 || !Number.isFinite(r.mean)) return <Empty theme={theme} text="Sem dado desta camada nesta área." />
  const pair: Figure[] = []
  if (r.total !== null && profile.total) {
    const total = quantity(r.total, profile.total.unit)
    pair.push({ label: profile.total.label, value: total.value, aside: total.unit })
  }
  return (
    <>
      <Hero theme={theme} value={adaptive(r.mean)} unit={profile.unit || undefined} caption={`${profile.meanLabel} na área analisada`} />
      <Pair theme={theme} items={pair} />
      <Footnote theme={theme} notes={[profile.note, coverageNote(r.validHa, polygonHa), sourceOf(layer)]} />
    </>
  )
}

function RecurrenceResult({ theme, layer, profile, r }: LayerResultViewProps & { profile: RecurrenceProfile; r: Of<'recurrence'> }) {
  if (r.regionHa <= 0) return <Empty theme={theme} text="Sem dado desta camada nesta área." />
  const s = recurrenceSummary(r, profile)
  if (s.everHa <= 0) {
    return <Empty theme={theme} text={`Nenhuma queimada mapeada desde ${profile.firstYear}.`} />
  }
  return (
    <>
      <Hero
        theme={theme}
        value={percentShort(s.everShare)}
        aside={hectaresShort(s.everHa)}
        caption={`da área queimou ao menos uma vez desde ${profile.firstYear}`}
      />
      <Pair theme={theme} items={[
        { label: 'Queimou no ano', value: percentShort((s.yearHa / r.regionHa) * 100), aside: hectaresShort(s.yearHa) },
        { label: `${profile.recurrentFrom} anos ou mais com fogo`, value: percentShort(s.recurrentShare), aside: hectaresShort(s.recurrentHa) },
      ]} />
      <BarList
        theme={theme}
        title="Área por anos com fogo"
        rows={s.bands.map((b) => ({
          key: b.label,
          label: b.label,
          value: b.areaHa,
          color: theme.colors.terracota,
          amount: hectaresShort(b.areaHa),
          share: percentShort(b.share),
        }))}
      />
      <Footnote theme={theme} notes={[profile.note, sourceOf(layer)]} />
    </>
  )
}
