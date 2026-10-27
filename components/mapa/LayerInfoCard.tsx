'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '@/lib/mapa/store'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { LAYER_INFO } from '@/config/mapa/layerInfo'
import { THEMES } from '@/config/mapa/groups'
import { COLUMN_WIDTH } from '@/lib/mapa/layout'
import type { LayerConfig } from '@/types/mapa'
import styles from './LayerInfoCard.module.css'

/**
 * The layer sheet (Figma 19451:60761): a column of its own between the layer
 * panel and the map (19451:60959), not a popover over the panel. It renders
 * from Mapa.tsx rather than from inside Sidebar, so it takes its place in the
 * row and the map gives up the width.
 *
 * Below 768px there is no room for a second column, so it stays an overlay over
 * the drawer -- which already covers the map on its own.
 *
 * The legend lives on the map (FloatingLegend), so the sheet is only about the
 * data: what it shows, what changes its reading, where it comes from. Like the
 * design, it names the period and the resolution twice, as chips and in the
 * sheet; the unit is left to the panel and the legend, which show it.
 */
export default function LayerInfoCard({
  layerId, narrow, onClose,
}: {
  layerId: string
  narrow: boolean
  onClose: () => void
}) {
  const layers = useStore((s) => s.layers)
  const toggleLayer = useStore((s) => s.toggleLayer)
  const [copyNotice, setCopyNotice] = useState<'copied' | 'failed' | null>(null)

  useEffect(() => {
    // A failure stays until the sheet changes, so there is time to read it.
    if (copyNotice !== 'copied') return
    const timer = setTimeout(() => setCopyNotice(null), 2000)
    return () => clearTimeout(timer)
  }, [copyNotice])
  const layer = layers.find((l: LayerConfig) => l.id === layerId)
  if (!layer) return null

  const meta = LAYER_META[layerId]
  const info = LAYER_INFO[layerId]
  const group = THEMES.find((t) => t.id === layer.theme)
  const summary = info?.summary ?? (meta ? meta.description[0].toUpperCase() + meta.description.slice(1) + '.' : '')
  const citation = info?.citation?.replace('{acesso}', new Date().toLocaleDateString('pt-BR'))
  const chips = [info?.period, info?.resolution].filter(Boolean) as string[]
  // The design's order (19451:60915); an entry the layer lacks is left out,
  // label and all.
  const sheet: [string, ReactNode][] = []
  if (info) {
    sheet.push(['Fonte', info.source])
    if (info.method) sheet.push(['Método', info.method])
    if (info.period) sheet.push(['Período', info.period])
    if (info.resolution) sheet.push(['Resolução', info.resolution])
    if (info.license) {
      sheet.push(['Licença', (
        <a key="licenca" href={info.license.url} target="_blank" rel="noopener noreferrer">
          {info.license.label}
        </a>
      )])
    }
  } else if (meta) {
    sheet.push(['Fonte', meta.source])
  }

  async function copyCitation() {
    if (!citation) return
    try {
      await navigator.clipboard.writeText(citation)
      setCopyNotice('copied')
    } catch {
      // navigator.clipboard is undefined outside a secure context.
      setCopyNotice('failed')
    }
  }

  return (
    <div
      className={`ficha-in ${styles.sheet} ${narrow ? styles.overlay : styles.docked}`}
      role="complementary"
      aria-labelledby="ficha-titulo"
      style={narrow ? undefined : { width: COLUMN_WIDTH }}
    >
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h2 id="ficha-titulo" className={`${styles.title} text-h4`}>{layer.name}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar ficha" title="Fechar ficha">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
            <img src="/icons/mapa/close.svg" alt="" width={24} height={24} />
          </button>
        </div>
        {chips.length > 0 && (
          <div className={styles.chips}>
            {chips.map((chip) => (
              <span key={chip} className={`${styles.chip} text-ui-badge`} data-chip={chip}>{chip}</span>
            ))}
          </div>
        )}
        <div className={styles.rule} />
      </div>

      <div className={styles.body}>
        <p className="text-body">{summary}</p>

        {info?.coverage != null && (
          <div className={styles.section}>
            <div className={styles.coverageTrack}>
              <div
                className={styles.coverageFill}
                style={{ width: `${info.coverage}%`, background: group?.color ?? 'var(--role-marca-ancora-padrao)' }}
              />
            </div>
            <p className="text-subtle">
              <b>{info.coverage}%</b> da Caatinga com dado
            </p>
          </div>
        )}

        {info?.cautions && info.cautions.length > 0 && (
          <div className={styles.section}>
            <h3 className={`${styles.heading} text-p-ui`}>Cuidados de leitura</h3>
            <ul className={styles.cautions}>
              {info.cautions.map((caution) => (
                <li key={caution} className={`${styles.caution} text-body`}>{caution}</li>
              ))}
            </ul>
          </div>
        )}

        {sheet.length > 0 && (
          <div className={styles.section}>
            <h3 className={`${styles.heading} text-p-ui`}>Ficha técnica</h3>
            <dl className={styles.fields}>
              {sheet.map(([term, value]) => (
                <div key={term} className={styles.field}>
                  <dt className={`${styles.term} text-body`}>{term}</dt>
                  <dd className={`${styles.value} text-body`}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {citation && (
          <>
            <h3 className={`${styles.heading} text-p-ui`}>Como citar</h3>
            <div>
              <div className={styles.citation}>
                <p className={`${styles.citationText} text-body`}>{citation}</p>
                <button
                  type="button"
                  className={styles.copy}
                  onClick={() => { void copyCitation() }}
                  aria-label="Copiar citação"
                  title="Copiar citação"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
                  <img src="/icons/mapa/content-copy.svg" alt="" width={16} height={16} />
                </button>
              </div>
              <p
                role="status"
                className={`${styles.copyStatus} ${copyNotice === 'failed' ? styles.copyFailed : styles.copied} text-subtle`}
              >
                {copyNotice === 'copied' && 'Citação copiada.'}
                {copyNotice === 'failed' && 'Não foi possível copiar. Selecione o texto e copie.'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className={styles.foot}>
        <button type="button" className={`${styles.action} ${styles.primary} text-ui-medium`} onClick={() => toggleLayer(layer.id)}>
          {layer.visible ? 'Desativar camada' : 'Ativar camada'}
        </button>
        {info?.learnMore ? (
          // The Comunicação pages live in the marketing layout: a plain link,
          // in a new tab so the map keeps its state.
          <a
            href={info.learnMore.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.action} ${styles.secondary} text-ui-medium`}
          >
            {info.learnMore.label}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        ) : (
          // Every layer will get a Comunicação page; until its own exists, the
          // button is there but inert, like the header's "En".
          <button
            type="button"
            disabled
            className={`${styles.action} ${styles.secondary} text-ui-medium`}
            title="Disponível em breve"
          >
            Saiba mais
            <span className="sr-only"> (disponível em breve)</span>
          </button>
        )}
      </div>
    </div>
  )
}
