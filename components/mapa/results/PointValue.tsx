'use client'

// The value under a clicked or drawn point of a layer without a yearly series:
// the class name, or the number with the layer's unit, or a signed flux with its
// direction in words.

import { describeFlux, fluxInk } from '@/lib/mapa/carbonFlux'
import { adaptive } from '@/lib/mapa/results/format'
import type { PixelValueResult, PlatformTheme, RasterLayerConfig } from '@/types/mapa'
import { Footnote, Hero, Stack } from './blocks'
import { sourceOf } from './LayerResultView'

export default function PointValue({ theme, layer, pixel }: {
  theme: PlatformTheme; layer: RasterLayerConfig; pixel: PixelValueResult
}) {
  const c = theme.colors
  let hero: React.ReactNode
  if (layer.signedFlux) {
    const flux = describeFlux(pixel.value)
    hero = (
      <Hero
        theme={theme}
        value={adaptive(flux.magnitude)}
        unit={layer.unit}
        ink={fluxInk(flux.direction, c)}
        caption={flux.direction === 'removal' ? 'de sequestro neste ponto'
          : flux.direction === 'emission' ? 'de emissão neste ponto'
            : 'em equilíbrio neste ponto'}
      />
    )
  } else if (pixel.label) {
    hero = (
      <Hero theme={theme} caption="classe neste ponto">
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 32, fontWeight: 800, lineHeight: 1.1, color: c.text }}>
          {pixel.color && <span style={{ width: 18, height: 18, borderRadius: 4, background: pixel.color, flexShrink: 0 }} />}
          {pixel.label}
        </span>
      </Hero>
    )
  } else {
    hero = <Hero theme={theme} value={adaptive(pixel.value)} unit={layer.unit} caption="neste ponto" />
  }
  return (
    <Stack>
      {hero}
      <Footnote theme={theme} notes={[sourceOf(layer)]} />
    </Stack>
  )
}
