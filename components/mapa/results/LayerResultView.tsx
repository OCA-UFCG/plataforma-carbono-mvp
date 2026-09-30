'use client'

// The result of one layer in the "Resultados" panel, chosen by the layer's
// archetype in config/mapa/resultProfiles.ts. The territorial report does not
// render this; it keeps StatsChartView.

import { useTranslations } from 'next-intl'
import { layerMetaText } from '@/config/mapa/layerMeta'
import type {
  AmountProfile,
  AnnualProfile,
  DistributionProfile,
  FluxProfile,
  RecurrenceProfile,
  ResultProfile,
} from '@/config/mapa/resultProfiles'
import { useMapaText } from '@/lib/mapa/useMapaText'
import type { MapaText } from '@/lib/mapa/text'
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
export function sourceOf(layer: RasterLayerConfig, tx?: MapaText): string | null {
  return sourceNote(layerMetaText(layer.id, tx)?.source, tx)
}

// The layer and the profile arrive localized from `LayerResultCard`, which is
// the one place they are translated; nothing here translates them again.
export default function LayerResultView(props: LayerResultViewProps) {
  const { result, profile } = props

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

const lowerFirst = (s: string, locale: string) => s.charAt(0).toLocaleLowerCase(locale) + s.slice(1)

function Bands({ theme, bins, validHa, unit, color }: {
  theme: PlatformTheme; bins: AreaBin[]; validHa: number; unit?: string; color: string
}) {
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  // "20 a 30", "acima de 60": the unit goes in the list's title, not on every row.
  const binLabel = (b: AreaBin) =>
    b.to === null
      ? t('bands.above', { from: edge(b.from, tx) })
      : t('bands.range', { from: edge(b.from, tx), to: edge(b.to, tx) })
  return (
    <BarList
      theme={theme}
      title={t('bands.title')}
      hint={unit}
      rows={bins.map((b) => ({
        key: b.from,
        label: binLabel(b),
        value: b.areaHa,
        color,
        amount: hectaresShort(b.areaHa, tx),
        share: percentShort(validHa > 0 ? (b.areaHa / validHa) * 100 : 0, tx),
      }))}
    />
  )
}

function AmountResult({ theme, profile, layer, r, polygonHa }: LayerResultViewProps & { profile: AmountProfile; r: Of<'amount'> }) {
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  if (r.validHa <= 0) return <Empty theme={theme} text={t('empty.noData')} />
  const total = quantity(r.total, profile.totalUnit, tx)
  // One result speaks one unit: the density in t/ha beside a total in t.
  const perHaUnit = `${profile.totalUnit}/ha`
  const coverage = profile.densityBasis === 'territory'
    ? null
    : coverageNote(r.validHa, polygonHa, profile.densityBasis === 'woody' ? t('amount.woodySubject') : undefined, tx)
  const pair: Figure[] = [{
    label: t(`amount.perHectare.${profile.densityBasis}`),
    value: adaptive(r.total / r.validHa, tx),
    aside: perHaUnit,
  }]
  if (profile.carbonFraction) {
    const carbon = quantity(r.total * profile.carbonFraction, 't C', tx)
    pair.push({ label: t('amount.carbon'), value: carbon.value, aside: carbon.unit })
  }
  // Where the layer has gaps the total covers only the part with data.
  const where = coverage && profile.densityBasis === 'valid' ? t('amount.whereData') : t('amount.whereArea')
  return (
    <>
      <Hero
        theme={theme}
        value={total.value}
        unit={total.unit}
        caption={t('amount.caption', { label: lowerFirst(profile.totalLabel, tx.locale), where })}
      />
      <Pair theme={theme} items={pair} />
      <Bands theme={theme} bins={r.bins} validHa={r.validHa} unit={perHaUnit} color={theme.colors.accent} />
      <Footnote theme={theme} notes={[profile.note, coverage, sourceOf(layer, tx)]} />
    </>
  )
}

function DistributionResult({ theme, layer, profile, r, polygonHa }: LayerResultViewProps & { profile: DistributionProfile; r: Of<'distribution'> }) {
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  if (r.validHa <= 0 || !Number.isFinite(r.p50)) return <Empty theme={theme} text={t('empty.noData')} />
  const pair: Figure[] = [{
    label: t('distribution.range80'),
    value: t('distribution.range', { min: adaptive(r.p10, tx), max: adaptive(r.p90, tx) }),
    aside: layer.unit,
  }]
  if (profile.threshold) {
    const aboveHa = r.bins.filter((b) => b.from >= profile.threshold!.value).reduce((s, b) => s + b.areaHa, 0)
    pair.push({ label: profile.threshold.label, value: percentShort((aboveHa / r.validHa) * 100, tx), aside: hectaresShort(aboveHa, tx) })
  } else {
    pair.push({ label: t('distribution.mean'), value: adaptive(r.mean, tx), aside: layer.unit })
  }
  return (
    <>
      <Hero theme={theme} value={adaptive(r.p50, tx)} unit={layer.unit} caption={t('distribution.median')} />
      <Pair theme={theme} items={pair} />
      <Bands theme={theme} bins={r.bins} validHa={r.validHa} unit={layer.unit} color={theme.colors.accent} />
      <Footnote theme={theme} notes={[profile.note, coverageNote(r.validHa, polygonHa, undefined, tx), sourceOf(layer, tx)]} />
    </>
  )
}

function FluxResult({ theme, layer, profile, r, polygonHa }: LayerResultViewProps & { profile: FluxProfile; r: Of<'flux'> }) {
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  if (r.validHa <= 0) return <Empty theme={theme} text={t('empty.outsideForest')} />
  const net = r.positive + r.negative
  const shown = profile.signed ? net : r.positive
  const scaled = quantity(Math.abs(shown), profile.totalUnit, tx)
  const share = (ha: number) => percentShort((ha / r.validHa) * 100, tx)

  // The net flux has no minus sign: its direction is the caption, in words, and
  // the number carries the emission or removal ink as a second cue.
  const direction = describeFlux(net, tx).direction
  const hero = profile.signed ? (
    <Hero
      theme={theme}
      value={scaled.value}
      unit={scaled.unit}
      ink={fluxInk(direction, theme.colors)}
      caption={
        direction === 'removal' ? t('flux.netRemoval')
          : direction === 'emission' ? t('flux.netEmission')
            : t('flux.netBalance')
      }
    />
  ) : (
    <Hero
      theme={theme}
      value={scaled.value}
      unit={scaled.unit}
      caption={t('flux.total', { label: lowerFirst(profile.totalLabel, tx.locale) })}
    />
  )

  const pair: Figure[] = profile.signed
    ? [
        { label: t('flux.sinkArea'), value: share(r.negativeHa), aside: hectaresShort(r.negativeHa, tx) },
        { label: t('flux.sourceArea'), value: share(r.positiveHa), aside: hectaresShort(r.positiveHa, tx) },
      ]
    : [
        { label: t('flux.perHectare'), value: adaptive(Math.abs(shown) / r.validHa, tx), aside: `${profile.totalUnit}/ha` },
        {
          label: profile.totalUnit === 't CO2' ? t('flux.removalArea') : t('flux.emissionArea'),
          value: share(r.positiveHa),
          aside: hectaresShort(r.positiveHa, tx),
        },
      ]

  return (
    <>
      {hero}
      <Pair theme={theme} items={pair} />
      <Footnote theme={theme} notes={[
        profile.note,
        coverageNote(r.validHa, polygonHa, t('flux.forestSubject'), tx),
        sourceOf(layer, tx),
      ]} />
    </>
  )
}

function AnnualResult({ theme, layer, profile, r, polygonHa }: LayerResultViewProps & { profile: AnnualProfile; r: Of<'annual'> }) {
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  if (r.validHa <= 0 || !Number.isFinite(r.mean)) return <Empty theme={theme} text={t('empty.noData')} />
  const pair: Figure[] = []
  if (r.total !== null && profile.total) {
    const total = quantity(r.total, profile.total.unit, tx)
    pair.push({ label: profile.total.label, value: total.value, aside: total.unit })
  }
  return (
    <>
      <Hero
        theme={theme}
        value={adaptive(r.mean, tx)}
        unit={profile.unit || undefined}
        caption={t('annual.caption', { label: profile.meanLabel })}
      />
      <Pair theme={theme} items={pair} />
      <Footnote theme={theme} notes={[profile.note, coverageNote(r.validHa, polygonHa, undefined, tx), sourceOf(layer, tx)]} />
    </>
  )
}

function RecurrenceResult({ theme, layer, profile, r }: LayerResultViewProps & { profile: RecurrenceProfile; r: Of<'recurrence'> }) {
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  if (r.regionHa <= 0) return <Empty theme={theme} text={t('empty.noData')} />
  const s = recurrenceSummary(r, profile, tx)
  if (s.everHa <= 0) {
    return <Empty theme={theme} text={t('empty.noFire', { year: profile.firstYear })} />
  }
  return (
    <>
      <Hero
        theme={theme}
        value={percentShort(s.everShare, tx)}
        aside={hectaresShort(s.everHa, tx)}
        caption={t('recurrence.caption', { year: profile.firstYear })}
      />
      <Pair theme={theme} items={[
        { label: t('recurrence.burnedInYear'), value: percentShort((s.yearHa / r.regionHa) * 100, tx), aside: hectaresShort(s.yearHa, tx) },
        { label: t('recurrence.recurrent', { from: profile.recurrentFrom }), value: percentShort(s.recurrentShare, tx), aside: hectaresShort(s.recurrentHa, tx) },
      ]} />
      <BarList
        theme={theme}
        title={t('recurrence.title')}
        rows={s.bands.map((b) => ({
          key: b.label,
          label: b.label,
          value: b.areaHa,
          color: theme.colors.terracota,
          amount: hectaresShort(b.areaHa, tx),
          share: percentShort(b.share, tx),
        }))}
      />
      <Footnote theme={theme} notes={[profile.note, sourceOf(layer, tx)]} />
    </>
  )
}
