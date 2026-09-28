'use client'

// Area per class in the results panel: land use and cover as native vegetation
// against the rest, land degradation as a scale from conserved to Nível 5.

import type { CompositionProfile } from '@/config/mapa/resultProfiles'
import { nominalSummary, ordinalSummary } from '@/lib/mapa/results/composition'
import { coverageNote, hectaresShort, percentShort } from '@/lib/mapa/results/format'
import { BarList, Empty, Footnote, Hero, Pair, type Figure } from './blocks'
import { sourceOf, type LayerResultViewProps } from './LayerResultView'

/** Classes listed by name before the rest are grouped. */
const MAX_CLASSES = 7

export default function CompositionResult({
  theme, layer, profile, areas, polygonHa,
}: LayerResultViewProps & { profile: CompositionProfile; areas: Record<string, number> }) {
  const classes = layer.classes ?? []

  if (profile.ordinal) {
    const { degraded, severe, severeLabel } = profile.ordinal
    const s = ordinalSummary(areas, classes, profile.ordinal)
    if (s.validHa <= 0) return <Empty theme={theme} text="Sem classe mapeada nesta área." />
    // `order` runs from conserved to the worst level, so these read mildest first.
    const levels = s.levels.filter((l) => degraded.includes(l.value))
    const degradedHa = levels.reduce((a, l) => a + l.areaHa, 0)
    if (degradedHa <= 0) return <Empty theme={theme} text="Toda a área com dado está conservada." />
    const severeLevels = levels.filter((l) => severe.includes(l.value))
    const severeHa = severeLevels.reduce((a, l) => a + l.areaHa, 0)
    const conserved = s.levels.filter((l) => !degraded.includes(l.value))
    const conservedHa = conserved.reduce((a, l) => a + l.areaHa, 0)

    // With only one severe level present, the severe figure is that level's bar again.
    const pair: Figure[] = []
    if (severeLevels.filter((l) => l.areaHa > 0).length > 1) {
      pair.push({ label: severeLabel, value: percentShort(s.severeShare), aside: hectaresShort(severeHa) })
    }
    pair.push({
      label: conserved[0]?.label ?? 'Conservado',
      value: percentShort((conservedHa / s.validHa) * 100),
      aside: hectaresShort(conservedHa),
    })

    return (
      <>
        <Hero
          theme={theme}
          value={percentShort(s.degradedShare)}
          aside={hectaresShort(degradedHa)}
          caption="da área com algum nível de degradação"
        />
        <Pair theme={theme} items={pair} />
        <BarList
          theme={theme}
          title="Área degradada por nível"
          hint="1 leve, 5 grave"
          labelWidth={64}
          rows={levels.map((l) => ({
            key: l.value,
            label: l.label,
            value: l.areaHa,
            color: l.color,
            amount: hectaresShort(l.areaHa),
            share: percentShort(l.share),
          }))}
        />
        <Footnote theme={theme} notes={[profile.note, coverageNote(s.validHa, polygonHa), sourceOf(layer)]} />
      </>
    )
  }

  if (!profile.nominal) return null
  const s = nominalSummary(areas, classes, profile.nominal)
  if (s.validHa <= 0) return <Empty theme={theme} text="Sem classe mapeada nesta área." />

  const real = s.classes
  const head = real.slice(0, real.length > MAX_CLASSES ? MAX_CLASSES - 1 : MAX_CLASSES)
  const tail = real.slice(head.length)
  const tailHa = tail.reduce((a, c) => a + c.areaHa, 0)
  const farming = s.groups.find((g) => g.label === 'Agropecuária')

  return (
    <>
      <Hero
        theme={theme}
        value={percentShort(s.nativeShare)}
        aside={hectaresShort(s.nativeHa)}
        caption="da área com vegetação nativa"
      />
      <Pair theme={theme} items={farming ? [{ label: 'Agropecuária', value: percentShort(farming.share), aside: hectaresShort(farming.areaHa) }] : []} />
      <BarList
        theme={theme}
        title="Área por classe"
        rows={[
          ...head.map((k) => ({
            key: k.value,
            label: k.label,
            value: k.areaHa,
            color: k.color,
            amount: hectaresShort(k.areaHa),
            share: percentShort(k.share),
          })),
          ...(tail.length
            ? [{
                key: 'outras',
                label: `${tail.length} outras`,
                value: tailHa,
                color: theme.colors.textDim,
                amount: hectaresShort(tailHa),
                share: percentShort((tailHa / s.validHa) * 100),
              }]
            : []),
        ]}
      />
      <Footnote theme={theme} notes={[profile.note, coverageNote(s.validHa, polygonHa), sourceOf(layer)]} />
    </>
  )
}
