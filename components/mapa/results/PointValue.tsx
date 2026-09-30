'use client'

// The value under a clicked or drawn point of a layer without a yearly series:
// the class name, or the number with the layer's unit, or a signed flux with its
// direction in words.

import { useTranslations } from 'next-intl'
import { describeFlux, fluxInk } from '@/lib/mapa/carbonFlux'
import { adaptive } from '@/lib/mapa/results/format'
import { useMapaText } from '@/lib/mapa/useMapaText'
import { localizeClassLabel } from '@/lib/mapa/text'
import type { PixelValueResult, PlatformTheme, RasterLayerConfig } from '@/types/mapa'
import { Footnote, Hero, Stack } from './blocks'
import { sourceOf } from './LayerResultView'

// `layer` arrives localized from `LayerResultCard`; only the class label of the
// pixel is still Portuguese, since `pixelCache` stores it as the server read it.
export default function PointValue({ theme, layer, pixel }: {
  theme: PlatformTheme; layer: RasterLayerConfig; pixel: PixelValueResult
}) {
  const c = theme.colors
  const t = useTranslations('MapaOvResults')
  const tx = useMapaText()
  const label = localizeClassLabel(layer.id, pixel.label, tx)
  let hero: React.ReactNode
  if (layer.signedFlux) {
    const flux = describeFlux(pixel.value, tx)
    hero = (
      <Hero
        theme={theme}
        value={adaptive(flux.magnitude, tx)}
        unit={layer.unit}
        ink={fluxInk(flux.direction, c)}
        caption={flux.direction === 'removal' ? t('point.removal')
          : flux.direction === 'emission' ? t('point.emission')
            : t('point.balance')}
      />
    )
  } else if (label) {
    hero = (
      <Hero theme={theme} caption={t('point.class')}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 32, fontWeight: 800, lineHeight: 1.1, color: c.text }}>
          {pixel.color && <span style={{ width: 18, height: 18, borderRadius: 4, background: pixel.color, flexShrink: 0 }} />}
          {label}
        </span>
      </Hero>
    )
  } else {
    hero = <Hero theme={theme} value={adaptive(pixel.value, tx)} unit={layer.unit} caption={t('point.value')} />
  }
  return (
    <Stack>
      {hero}
      <Footnote theme={theme} notes={[sourceOf(layer, tx)]} />
    </Stack>
  )
}
