'use client'

import { useState, type Ref } from 'react'
import { useStore } from '@/lib/mapa/store'
import { EmissionsLegendItem, VectorLegendItem, RasterLegendItem } from './LegendItems'
import TemporalSlider from './TemporalSlider'
import type { PlatformTheme } from '@/types/mapa'
import styles from './FloatingLegend.module.css'

interface Props {
  theme: PlatformTheme
  /** Distance from the map's right edge (lib/mapa/layout.ts, MAP_INSET). */
  rightOffset: number
  /** Root box, open or collapsed; MapView measures it to keep a fit clear of it. */
  ref?: Ref<HTMLDivElement>
}

/**
 * The "Legendas" card (Figma 19428:58419), bottom right of the map, under the
 * control stack. It lists only what is on, and is gone when nothing is.
 *
 * Above it, in the same corner column, sits the year control of a temporal
 * layer (Figma 19481:12692, which no frame places). The column is the only
 * place it fits: at 1436px the map is 672px wide, too narrow for the 397px
 * slider beside the 302px legend, and with the ficha open it is 290px. Folding
 * the legend leaves the slider out.
 */
export default function FloatingLegend({ theme, rightOffset, ref }: Props) {
  const layers = useStore((s) => s.layers)
  const temporalDate = useStore((s) => s.temporalDate)
  const emissoes = useStore((s) => s.emissoes)
  const layerErrors = useStore((s) => s.layerErrors)
  const [open, setOpen] = useState(true)

  const visible = layers.filter((l) => l.visible)
  if (visible.length === 0) return null

  return (
    <div ref={ref} className={styles.stack} style={{ right: rightOffset, maxWidth: `calc(100% - ${rightOffset + 16}px)` }}>
      <TemporalSlider />

      <div className={styles.legend}>
        <button
          type="button"
          className={styles.header}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="legenda-conteudo"
        >
          <span className={`${styles.title} text-ui-tab`}>Legendas</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          <img className={styles.arrow} src="/icons/mapa/keyboard-arrow-up.svg" alt="" width={24} height={24} />
        </button>

        {open && (
          <div id="legenda-conteudo" className={styles.content}>
            {visible.map((layer) => {
              if (layer.type === 'vector') {
                return <VectorLegendItem key={layer.id} layer={layer} theme={theme} />
              }
              if (layer.type === 'emissions') {
                return (
                  <EmissionsLegendItem
                    key={layer.id}
                    layer={layer}
                    theme={theme}
                    temporalDate={temporalDate[layer.id]}
                    layers={layers}
                    emissoes={emissoes}
                    layerErrors={layerErrors}
                  />
                )
              }
              return (
                <RasterLegendItem
                  key={layer.id}
                  layer={layer}
                  theme={theme}
                  temporalDate={temporalDate[layer.id]}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
