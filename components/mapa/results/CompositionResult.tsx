'use client'

// Area per class in the results panel: land use and cover as native vegetation
// against the rest, land degradation as a scale from conserved to Nível 5.

import { useTranslations } from 'next-intl'
import { useMapaText } from '@/lib/mapa/useMapaText'
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
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  const classes = layer.classes ?? []

  if (profile.ordinal) {
    const { degraded, severe, severeLabel } = profile.ordinal
    const s = ordinalSummary(areas, classes, profile.ordinal)
    if (s.validHa <= 0) return <Empty theme={theme} text={t('empty.noClass')} />
    // `order` runs from conserved to the worst level, so these read mildest first.
    const levels = s.levels.filter((l) => degraded.includes(l.value))
    const degradedHa = levels.reduce((a, l) => a + l.areaHa, 0)
    if (degradedHa <= 0) return <Empty theme={theme} text={t('empty.allConserved')} />
    const severeLevels = levels.filter((l) => severe.includes(l.value))
    const severeHa = severeLevels.reduce((a, l) => a + l.areaHa, 0)
    const conserved = s.levels.filter((l) => !degraded.includes(l.value))
    const conservedHa = conserved.reduce((a, l) => a + l.areaHa, 0)

    // With only one severe level present, the severe figure is that level's bar again.
    const pair: Figure[] = []
    if (severeLevels.filter((l) => l.areaHa > 0).length > 1) {
      pair.push({ label: severeLabel, value: percentShort(s.severeShare, tx), aside: hectaresShort(severeHa, tx) })
    }
    pair.push({
      label: conserved[0]?.label ?? t('composition.conserved'),
      value: percentShort((conservedHa / s.validHa) * 100, tx),
      aside: hectaresShort(conservedHa, tx),
    })

    return (
      <>
        <Hero
          theme={theme}
          value={percentShort(s.degradedShare, tx)}
          aside={hectaresShort(degradedHa, tx)}
          caption={t('composition.degradedCaption')}
        />
        <Pair theme={theme} items={pair} />
        <BarList
          theme={theme}
          title={t('composition.degradedTitle')}
          hint={t('composition.degradedHint')}
          labelWidth={64}
          rows={levels.map((l) => ({
            key: l.value,
            label: l.label,
            value: l.areaHa,
            color: l.color,
            amount: hectaresShort(l.areaHa, tx),
            share: percentShort(l.share, tx),
          }))}
        />
        <Footnote theme={theme} notes={[profile.note, coverageNote(s.validHa, polygonHa, undefined, tx), sourceOf(layer, tx)]} />
      </>
    )
  }

  if (!profile.nominal) return null
  const s = nominalSummary(areas, classes, profile.nominal, tx)
  if (s.validHa <= 0) return <Empty theme={theme} text={t('empty.noClass')} />

  const real = s.classes
  const head = real.slice(0, real.length > MAX_CLASSES ? MAX_CLASSES - 1 : MAX_CLASSES)
  const tail = real.slice(head.length)
  const tailHa = tail.reduce((a, c) => a + c.areaHa, 0)
  // `groups` follow the profile's order, and the label is translated, so the
  // farming group is found by its id rather than by its Portuguese name.
  const farmingIndex = profile.nominal.groups.findIndex((g) => g.id === 'farming')
  const farming = farmingIndex >= 0 ? s.groups[farmingIndex] : undefined

  return (
    <>
      <Hero
        theme={theme}
        value={percentShort(s.nativeShare, tx)}
        aside={hectaresShort(s.nativeHa, tx)}
        caption={t('composition.nativeCaption')}
      />
      <Pair theme={theme} items={farming ? [{ label: farming.label, value: percentShort(farming.share, tx), aside: hectaresShort(farming.areaHa, tx) }] : []} />
      <BarList
        theme={theme}
        title={t('composition.classesTitle')}
        rows={[
          ...head.map((k) => ({
            key: k.value,
            label: k.label,
            value: k.areaHa,
            color: k.color,
            amount: hectaresShort(k.areaHa, tx),
            share: percentShort(k.share, tx),
          })),
          ...(tail.length
            ? [{
                key: 'outras',
                label: t('composition.others', { count: tail.length }),
                value: tailHa,
                color: theme.colors.textDim,
                amount: hectaresShort(tailHa, tx),
                share: percentShort((tailHa / s.validHa) * 100, tx),
              }]
            : []),
        ]}
      />
      <Footnote theme={theme} notes={[profile.note, coverageNote(s.validHa, polygonHa, undefined, tx), sourceOf(layer, tx)]} />
    </>
  )
}
