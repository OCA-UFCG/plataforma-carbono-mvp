// The territory's value as a bar from 0 to `max`, with the Caatinga as a
// marker on the same scale. The territory's label sits above the bar and the
// Caatinga's below it, so the two never collide, however close the values.

import { useTranslations } from 'next-intl'
import { REFERENCE_COLOR } from '@/config/territorios/palette'
import { ChartFigure, anchorAt, cssVars, outlineOf, scalePct } from './ChartFigure'
import '@/app/territorios-graficos.css'

export interface ComparisonBarProps {
  here:      number
  /** null when the biome has no value: no marker and no label. */
  reference: number | null
  max:       number
  format:    (n: number) => string
  color:     string
  /** Short title above the bar. */
  label?:          string
  /** "Aqui" when left out. */
  hereLabel?:      string
  /** "Caatinga" when left out. */
  referenceLabel?: string
  /** Smaller bar and text, for the final sheet. */
  compact?:        boolean
  description:     string
}

export default function ComparisonBar({
  here, reference, max, format, color, label,
  hereLabel: hereLabelProp, referenceLabel: referenceLabelProp, compact = false, description,
}: ComparisonBarProps) {
  const t = useTranslations('TerritoriosCharts')
  const hereLabel = hereLabelProp ?? t('here')
  const referenceLabel = referenceLabelProp ?? t('biome')
  const herePct = scalePct(here, max)
  const refPct = reference === null ? null : scalePct(reference, max)

  return (
    <ChartFigure description={description} className={compact ? 'tg-cmp tg-cmp--compact' : 'tg-cmp'}>
      {label && <p className="tg-chart-title">{label}</p>}
      <p className="tg-tag" style={anchorAt(herePct)}>
        {hereLabel} <b className="tg-num">{format(here)}</b>
      </p>
      <div className="tg-cmp-track">
        {herePct > 0 && (
          <div className="tg-cmp-fill" style={{ width: `${herePct}%`, background: color, boxShadow: outlineOf(color) }} />
        )}
        {refPct !== null && (
          <div className="tg-cmp-marker" style={{ ...cssVars({ '--at': `${refPct}%` }), background: REFERENCE_COLOR }} />
        )}
      </div>
      {reference !== null && refPct !== null && (
        <p className="tg-tag" style={anchorAt(refPct)}>
          {referenceLabel} <b className="tg-num">{format(reference)}</b>
        </p>
      )}
    </ChartFigure>
  )
}
