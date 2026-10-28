'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useStore } from '@/lib/mapa/store'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { LAYER_INFO } from '@/config/mapa/layerInfo'
import { THEMES } from '@/config/mapa/groups'
import { IcArrowUpRight, IcX } from './icons'
import { COLUMN_WIDTH } from '@/lib/mapa/layout'
import type { LayerConfig, PlatformTheme } from '@/types/mapa'

const LABEL: CSSProperties = {
  fontSize: 11.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', margin: '22px 0 8px',
}

const LEARN_MORE: CSSProperties = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  borderRadius: 999, fontSize: 14.5, fontWeight: 700,
}

/**
 * The layer sheet: a column of its own between the layer panel and the map
 * (Figma 19451:60959), not a popover over the panel. It renders from Mapa.tsx
 * rather than from inside Sidebar, so it takes its place in the row and the map
 * gives up the width.
 *
 * Below 768px there is no room for a second column, so it stays an overlay over
 * the drawer -- which already covers the map on its own.
 *
 * The legend lives on the map (FloatingLegend), so the sheet is only about the
 * data: what it shows, what changes its reading, where it comes from.
 */
export default function LayerInfoCard({
  theme, layerId, narrow, onClose,
}: {
  theme: PlatformTheme
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
  const c = theme.colors
  if (!layer) return null

  const meta = LAYER_META[layerId]
  const info = LAYER_INFO[layerId]
  const group = THEMES.find((t) => t.id === layer.theme)
  const subtheme = group?.subthemes.find((s) => s.id === layer.subtheme)
  const unit = 'unit' in layer ? layer.unit : undefined
  const summary = info?.summary ?? (meta ? meta.description[0].toUpperCase() + meta.description.slice(1) + '.' : '')
  const citation = info?.citation?.replace('{acesso}', new Date().toLocaleDateString('pt-BR'))
  const chips = [info?.period, info?.resolution, unit, info?.license?.label].filter(Boolean) as string[]
  const sheet: [string, ReactNode][] = []
  if (info) {
    sheet.push(['Fonte', info.source])
    if (info.method) sheet.push(['Método', info.method])
    if (info.period) sheet.push(['Período', info.period])
    if (info.resolution) sheet.push(['Resolução', info.resolution])
    if (unit) sheet.push(['Unidade', unit])
    if (info.license) {
      sheet.push(['Licença', (
        <a key="licenca" href={info.license.url} target="_blank" rel="noopener noreferrer" style={{ color: c.text, fontWeight: 600, textDecorationColor: c.border, textUnderlineOffset: 3 }}>
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
      className="ficha-in"
      role="complementary"
      aria-labelledby="ficha-titulo"
      style={{
        ...(narrow
          ? {
              position: 'absolute', top: 16, zIndex: 16, left: 8, width: 'calc(100vw - 16px)',
              maxHeight: 'calc(100% - 32px)',
              border: `1px solid ${c.border}`, borderRadius: 16, boxShadow: 'var(--sh-pop)',
            }
          : { position: 'relative', flex: 'none', width: COLUMN_WIDTH, height: '100%', borderRight: `1px solid ${c.border}` }),
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: c.bgCard,
        fontFamily: 'var(--font-app), sans-serif',
      }}
    >
      <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${c.border}`, flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: c.dim }}>
          {group && <span style={{ width: 9, height: 9, borderRadius: '50%', background: group.color, flex: 'none' }} />}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[group?.label, subtheme?.label].filter(Boolean).join(' / ')}
          </span>
          <button onClick={onClose} aria-label="Fechar ficha" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: c.textDim, padding: 2, display: 'flex' }}><IcX size={15} /></button>
        </div>
        <div id="ficha-titulo" style={{ fontSize: 21, fontWeight: 800, color: c.text, lineHeight: 1.2, margin: '8px 0 10px' }}>{layer.name}</div>
        {chips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chips.map((chip) => (
              <span key={chip} style={{ fontSize: 12.5, fontWeight: 600, color: c.body, background: c.chip, border: `1px solid ${c.border}`, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>{chip}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px 20px', overflowY: 'auto', minHeight: 0 }}>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: c.text, margin: 0 }}>{summary}</p>

        {info?.coverage != null && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, borderRadius: 999, background: c.mist, overflow: 'hidden' }}>
              <div style={{ width: `${info.coverage}%`, height: '100%', borderRadius: 999, background: group?.color ?? c.accent }} />
            </div>
            <div style={{ fontSize: 13, color: c.textDim, marginTop: 5 }}>
              <b style={{ color: c.text, fontWeight: 800 }}>{info.coverage}%</b> da Caatinga com dado
            </div>
          </div>
        )}

        {info?.cautions && info.cautions.length > 0 && (
          <>
            <div style={{ ...LABEL, color: c.caption }}>Cuidados de leitura</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {info.cautions.map((caution) => (
                <li key={caution} style={{
                  fontSize: 14, lineHeight: 1.5, color: c.body, borderRadius: 10, padding: '9px 12px',
                  background: `color-mix(in srgb, ${c.terracota} 9%, ${c.bgCard})`,
                  border: `1px solid color-mix(in srgb, ${c.terracota} 28%, ${c.bgCard})`,
                  borderLeft: `3px solid ${c.terracota}`,
                }}>{caution}</li>
              ))}
            </ul>
          </>
        )}

        {sheet.length > 0 && (
          <>
            <div style={{ ...LABEL, color: c.caption }}>Ficha técnica</div>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', borderTop: `1px solid ${c.border}` }}>
              {sheet.map(([term, value]) => (
                <div key={term} style={{ display: 'contents' }}>
                  <dt style={{ padding: '9px 10px 9px 0', borderBottom: `1px solid ${c.border}`, fontSize: 13, fontWeight: 700, color: c.dim }}>{term}</dt>
                  <dd style={{ margin: 0, padding: '9px 0', borderBottom: `1px solid ${c.border}`, fontSize: 13.5, lineHeight: 1.5, color: c.body }}>{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {citation && (
          <>
            <div style={{ ...LABEL, color: c.caption }}>Como citar</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: c.chip, borderRadius: 10, padding: '10px 10px 10px 12px' }}>
              <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.5, color: c.body, overflowWrap: 'anywhere' }}>{citation}</p>
              <button
                onClick={() => { void copyCitation() }}
                className="ui-press"
                style={{ flex: 'none', border: `1px solid ${copyNotice === 'copied' ? c.accent : c.border}`, background: c.bgCard, color: copyNotice === 'copied' ? c.accentInk : c.text, borderRadius: 8, padding: '5px 10px', font: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                {copyNotice === 'copied' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div role="status" style={{ fontSize: 12.5, color: c.terracota, marginTop: copyNotice === 'failed' ? 6 : 0 }}>
              {copyNotice === 'failed' ? 'Não foi possível copiar. Selecione o texto e copie.' : ''}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: `1px solid ${c.border}`, flex: 'none' }}>
        <button
          onClick={() => toggleLayer(layer.id)}
          className="ui-press"
          style={{ flex: 1, background: layer.visible ? c.mist : c.accent, color: layer.visible ? c.text : c.onAccent, border: 'none', borderRadius: 999, padding: '10px 0', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}
        >
          {layer.visible ? 'Desativar camada' : 'Ativar camada'}
        </button>
        {info?.learnMore ? (
          // The Comunicação pages live in the marketing layout: a plain link,
          // in a new tab so the map keeps its state.
          <a
            href={info.learnMore.href}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-press"
            style={{ ...LEARN_MORE, border: `1.5px solid ${c.text}`, color: c.text, textDecoration: 'none' }}
          >
            {info.learnMore.label}
            <IcArrowUpRight size={13} />
          </a>
        ) : (
          // Every layer will get a Comunicação page; until its own exists, the
          // place is held so the sheet does not change shape when it arrives.
          <button disabled style={{ ...LEARN_MORE, background: 'transparent', border: `1.5px dashed ${c.border}`, color: c.dim, font: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'default' }}>
            Saiba mais
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: c.caption }}>em breve</span>
          </button>
        )}
      </div>
    </div>
  )
}
