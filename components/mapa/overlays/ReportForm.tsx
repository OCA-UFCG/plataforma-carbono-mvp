'use client'

import { useEffect, useMemo, useState } from 'react'
import appConfig from '@/config/mapa/layers.json'
import { MAX_REPORT_LAYERS, REPORT_LAYERS } from '@/config/mapa/reportLayers'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import { ano, paradas } from '@/lib/mapa/temporal'
import type { PlatformTheme, RasterLayerConfig, VectorLayerConfig } from '@/types/mapa'

export interface ReportFormProps {
  theme:   PlatformTheme
  open:    boolean
  onClose: () => void
}

interface Feicao { id: string; name: string }

/** How many matches the search list shows: 1210 municipalities do not fit. */
const MAX_SUGGESTIONS = 40

function recorteOptions(): VectorLayerConfig[] {
  return (appConfig.layers as VectorLayerConfig[]).filter((l) => l.type === 'vector')
}

/**
 * Years any curated layer can be asked for, newest first.
 *
 * The union rather than the intersection: the intersection of ten series is
 * often empty, and a layer that lacks the chosen year says so in its own
 * section instead of removing the year from the form.
 */
function yearOptions(): string[] {
  const years = new Set<string>()
  for (const entry of REPORT_LAYERS) {
    const layer = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === entry.layerId)
    for (const stop of layer?.gee?.temporal ? paradas(layer.gee.temporal) : []) {
      years.add(ano(stop))
    }
  }
  return [...years].sort().reverse()
}

export default function ReportForm({ theme, open, onClose }: ReportFormProps) {
  const c = theme.colors
  const recortes = useMemo(() => recorteOptions(), [])
  const years = useMemo(() => yearOptions(), [])
  const [recorteId, setRecorteId] = useState('municipios')
  const [feicoes, setFeicoes] = useState<Feicao[]>([])
  // Starts true: the first time the dialog opens, the effect below fetches
  // for the default recorte without any onChange to set it — see OVERRIDE 1.
  const [loadingFeicoes, setLoadingFeicoes] = useState(true)
  const [feicoesError, setFeicoesError] = useState(false)
  const [query, setQuery] = useState('')
  const [feicaoId, setFeicaoId] = useState('')
  const [year, setYear] = useState(() => years[0] ?? '')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(REPORT_LAYERS.slice(0, 4).map((entry) => entry.layerId)),
  )

  // Only fetches and, after the request settles, writes its result. The reset
  // of feicaoId/query/loadingFeicoes on a recorte change belongs to the
  // select's own onChange handler below, not here: `react-hooks/set-state-in-effect`
  // forbids a synchronous setState in an effect body, and the reset is a
  // consequence of the user's action rather than a side effect of a dependency change.
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()

    fetch(`/api/mapa/relatorio/feicoes?recorte=${encodeURIComponent(recorteId)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ feicoes?: Feicao[] }>
      })
      .then((body) => {
        setFeicoes(body.feicoes ?? [])
        // Only cleared on a successful fetch settling after the await, not
        // synchronously at the top of the effect body
        // (react-hooks/set-state-in-effect): the recorte select's own
        // onChange handler below already resets it for the case that starts
        // a fresh attempt.
        setFeicoesError(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        // A failed fetch must not look like "nothing typed yet": the ordinary
        // empty state and a broken request need different placeholders.
        setFeicoes([])
        setFeicoesError(true)
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingFeicoes(false) })

    return () => controller.abort()
  }, [open, recorteId])

  // Escape closes the dialog, matching every other overlay in this module
  // (DrawToolbar, FloatingSearchBar, the month picker in Header).
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  const matches = useMemo(() => {
    if (!query.trim()) return feicoes.slice(0, MAX_SUGGESTIONS)
    const needle = normalizeSearch(query)
    return feicoes.filter((f) => normalizeSearch(f.name).includes(needle)).slice(0, MAX_SUGGESTIONS)
  }, [feicoes, query])

  const chosen = feicoes.find((f) => f.id === feicaoId)
  const canGenerate = Boolean(feicaoId) && Boolean(year) && selected.size > 0

  function toggle(layerId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) next.delete(layerId)
      else if (next.size < MAX_REPORT_LAYERS) next.add(layerId)
      return next
    })
  }

  function generate() {
    const camadas = REPORT_LAYERS
      .filter((entry) => selected.has(entry.layerId))
      .map((entry) => entry.layerId)
      .join(',')
    const params = new URLSearchParams({ recorte: recorteId, feicao: feicaoId, ano: year, camadas })
    // A full page load, not next/link: /relatorio is another route group with
    // its own root layout, so a client navigation would not apply it.
    window.open(`/relatorio?${params}`, '_blank', 'noopener')
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Gerar relatório territorial"
      style={{
        position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center',
        background: 'rgba(20,19,14,.45)', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 100%)', maxHeight: '90dvh', overflowY: 'auto',
          padding: 20, borderRadius: 10,
          background: c.bgCard, color: c.text, border: `1px solid ${c.border}`,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Gerar relatório territorial</h2>

        <label style={{ display: 'block', marginTop: 16, fontSize: 13, fontWeight: 600, color: c.textDim }}>
          Recorte
          <select
            value={recorteId}
            onChange={(e) => {
              setRecorteId(e.target.value)
              setLoadingFeicoes(true)
              setFeicoesError(false)
              setFeicaoId('')
              setQuery('')
            }}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8, font: 'inherit' }}
          >
            {recortes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>

        {/* "Área", not "feição": the latter is the codebase's term for a vector
            feature and reads correctly in DOCUMENTACAO.md and in the identifiers,
            but it is GIS jargon above a box where someone types "Campina Grande".
            Generic on purpose — the value is a município, a state, a terra
            indígena, a settlement or the biome, depending on the recorte above. */}
        <label style={{ display: 'block', marginTop: 14, fontSize: 13, fontWeight: 600, color: c.textDim }}>
          Área
          <input
            value={chosen ? chosen.name : query}
            onChange={(e) => { setQuery(e.target.value); setFeicaoId('') }}
            placeholder={loadingFeicoes ? 'Carregando…' : 'Buscar por nome'}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8, font: 'inherit' }}
          />
        </label>

        {feicoesError && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: c.dim }}>
            Não foi possível carregar a lista de feições. Tente novamente.
          </p>
        )}

        {!chosen && matches.length > 0 && (
          <ul
            style={{
              margin: '6px 0 0', padding: 0, listStyle: 'none',
              maxHeight: 180, overflowY: 'auto', border: `1px solid ${c.border}`,
            }}
          >
            {matches.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => { setFeicaoId(f.id); setQuery('') }}
                  style={{
                    display: 'block', width: '100%', padding: '7px 10px', textAlign: 'left',
                    font: 'inherit', background: 'none', border: 'none', cursor: 'pointer', color: c.text,
                  }}
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <label style={{ display: 'block', marginTop: 14, fontSize: 13, fontWeight: 600, color: c.textDim }}>
          Ano de referência
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 8, font: 'inherit' }}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>

        <fieldset style={{ marginTop: 16, padding: 0, border: 'none' }}>
          <legend style={{ padding: 0, fontSize: 13, fontWeight: 600, color: c.textDim }}>
            Variáveis ({selected.size} de até {MAX_REPORT_LAYERS})
          </legend>
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            {REPORT_LAYERS.map((entry) => {
              const layer = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === entry.layerId)
              const checked = selected.has(entry.layerId)
              const full = !checked && selected.size >= MAX_REPORT_LAYERS
              // The form offers the union of every curated layer's years, so
              // a layer whose own series stops earlier than the chosen year
              // is a legitimate, common selection — it just says so in its
              // own section instead of producing a number. Surfacing the
              // mismatch here, before Gerar, beats discovering it in the
              // document.
              const stops = layer?.gee?.temporal ? paradas(layer.gee.temporal).map(ano) : []
              const missesYear = checked && stops.length > 0 && !stops.includes(year)
              return (
                <label
                  key={entry.layerId}
                  style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    fontSize: 13, opacity: full ? 0.45 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={full}
                    onChange={() => toggle(entry.layerId)}
                  />
                  <span>
                    <strong style={{ fontWeight: 600 }}>{layer?.name ?? entry.layerId}</strong>
                    <span style={{ color: c.dim }}> — {LAYER_META[entry.layerId]?.description ?? ''}</span>
                    {missesYear && (
                      <span style={{ display: 'block', marginTop: 2, color: c.dim, fontSize: 11.5 }}>
                        Sem dado para {year} — anos disponíveis: {stops.join(', ')}.
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <p style={{ marginTop: 14, fontSize: 12, color: c.dim }}>
          Cada variável é calculada ao vivo no Earth Engine, então um relatório com
          muitas variáveis leva mais tempo para ficar pronto.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 14px', font: 'inherit', background: 'none', border: `1px solid ${c.border}`, borderRadius: 5, cursor: 'pointer', color: c.text }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            style={{
              padding: '8px 16px', font: 'inherit', border: 'none', borderRadius: 5,
              cursor: canGenerate ? 'pointer' : 'default',
              color: c.onAccent, background: c.accent, opacity: canGenerate ? 1 : 0.5,
            }}
          >
            Gerar relatório
          </button>
        </div>
      </div>
    </div>
  )
}
