'use client'

import { useState } from 'react'
import {
  buildCoordinatePoint,
  buildCoordinatePolygon,
  buildCoordinateRectangle,
  caatingaCoverage,
  parseDegrees,
  parseVertexList,
} from '@/lib/mapa/parseCoordinates'
import type { PlatformTheme } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  /** Installs the geometry on the map. See `commitCoordinatesRef` in MapView. */
  onApply: (feature: GeoJSON.Feature) => void
}

type Tab = 'ponto' | 'retangulo' | 'poligono'

const TABS: { id: Tab; name: string }[] = [
  { id: 'ponto',     name: 'Ponto'     },
  { id: 'retangulo', name: 'Retângulo' },
  { id: 'poligono',  name: 'Polígono'  },
]

const EMPTY_FIELDS = {
  lat: '', lon: '',
  lat1: '', lon1: '',
  lat2: '', lon2: '',
  vertices: '',
}

type FieldKey = keyof typeof EMPTY_FIELDS

const FIELD_LABELS: Record<FieldKey, string> = {
  lat:      'latitude',
  lon:      'longitude',
  lat1:     'latitude do canto 1',
  lon1:     'longitude do canto 1',
  lat2:     'latitude do canto 2',
  lon2:     'longitude do canto 2',
  vertices: 'lista de vértices',
}

// Every layer is clipped to the biome, so a geometry outside it comes back
// with no data. Saying so beats leaving an empty result unexplained.
const COVERAGE_WARNING = {
  partial: 'Parte da área está fora da Caatinga: as camadas não cobrem o trecho externo.',
  outside: 'Fora da Caatinga: as camadas não cobrem esse local.',
}

// The example is the module's own default map centre (`map.center` in
// config/mapa/layers.json), in the interior of the biome. It used to be urban
// Campina Grande, which reads badly here: layers masked outside vegetation --
// gfw_netflux among them -- have no value over a city, and an analysis that
// comes back empty is indistinguishable from one that never ran. The
// placeholder only teaches the format, so it should at least not point at a
// spot where the usual layers are blank.
const LAT_PLACEHOLDER = '-9.00  ou  9°00\'00"S'
const LON_PLACEHOLDER = '-40.00  ou  40°00\'00"O'

/**
 * Typing a geometry instead of drawing it. Three tabs -- a point, a rectangle
 * from two opposite corners, a polygon from a list of vertices -- all reading
 * decimal degrees or DMS in WGS84.
 *
 * Latitude comes before longitude in every field, which is how a coordinate is
 * read and copied; the `[lon, lat]` order GeoJSON wants stays inside
 * `lib/mapa/parseCoordinates`.
 */
export default function CoordinateForm({ theme, onApply }: Props) {
  const c = theme.colors

  const [tab, setTab] = useState<Tab>('ponto')
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [error, setError] = useState<string | null>(null)
  const [badFields, setBadFields] = useState<FieldKey[]>([])
  const [warning, setWarning] = useState<string | null>(null)

  const setField = (key: FieldKey, value: string) => {
    setFields((f) => ({ ...f, [key]: value }))
    // Both messages describe the values as they were when Aplicar ran, so
    // editing any of them makes both stale.
    setError(null)
    setBadFields([])
    setWarning(null)
  }

  const selectTab = (next: Tab) => {
    setTab(next)
    setError(null)
    setBadFields([])
    setWarning(null)
  }

  const fail = (keys: FieldKey[], message?: string) => {
    setBadFields(keys)
    setError(message ?? invalidFieldsMessage(keys))
    setWarning(null)
  }

  const commit = (feature: GeoJSON.Feature) => {
    setError(null)
    setBadFields([])
    const coverage = caatingaCoverage(feature.geometry)
    setWarning(coverage === 'inside' ? null : COVERAGE_WARNING[coverage])
    onApply(feature)
  }

  const applyPoint = () => {
    const lat = parseDegrees(fields.lat, 'lat')
    const lon = parseDegrees(fields.lon, 'lon')
    const bad = badAxisFields([['lat', lat], ['lon', lon]])
    if (bad.length > 0) return fail(bad)
    commit(buildCoordinatePoint([lon!, lat!]))
  }

  const applyRectangle = () => {
    const lat1 = parseDegrees(fields.lat1, 'lat')
    const lon1 = parseDegrees(fields.lon1, 'lon')
    const lat2 = parseDegrees(fields.lat2, 'lat')
    const lon2 = parseDegrees(fields.lon2, 'lon')
    const bad = badAxisFields([
      ['lat1', lat1], ['lon1', lon1], ['lat2', lat2], ['lon2', lon2],
    ])
    if (bad.length > 0) return fail(bad)

    const feature = buildCoordinateRectangle([lon1!, lat1!], [lon2!, lat2!])
    if (!feature) {
      return fail(
        ['lat1', 'lon1', 'lat2', 'lon2'],
        'Os cantos precisam ser opostos: nenhuma latitude ou longitude repetida.',
      )
    }
    commit(feature)
  }

  const applyPolygon = () => {
    const parsed = parseVertexList(fields.vertices)
    if (!parsed.ok) return fail(['vertices'], parsed.error)

    const feature = buildCoordinatePolygon(parsed.vertices)
    if (!feature) {
      return fail(['vertices'], 'Os vértices estão alinhados e não formam uma área.')
    }
    commit(feature)
  }

  const apply = () => {
    if (tab === 'ponto') applyPoint()
    else if (tab === 'retangulo') applyRectangle()
    else applyPolygon()
  }

  // Shared styles

  const inputStyle = (key: FieldKey): React.CSSProperties => ({
    width: '100%',
    height: 30,
    padding: '0 8px',
    borderRadius: 7,
    border: `1px solid ${badFields.includes(key) ? c.terracota : c.border}`,
    background: c.bgCard,
    color: c.text,
    fontSize: 12,
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    outlineColor: c.accent,
  })

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 3,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '.02em',
    textTransform: 'uppercase',
    color: c.caption,
  }

  const axisField = (key: FieldKey, label: string, placeholder: string) => (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <input
        value={fields[key]}
        onChange={(e) => setField(key, e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') apply() }}
        placeholder={placeholder}
        inputMode="text"
        style={inputStyle(key)}
      />
    </label>
  )

  return (
    <div
      style={{
        width: 296,
        maxWidth: '100%',
        padding: 12,
        background: c.glassBg,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${c.glassBd}`,
        borderRadius: 14,
        boxShadow: '0 8px 24px -8px rgba(30,28,18,.4)',
        fontFamily: 'var(--font-app), sans-serif',
      }}
    >
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Tipo de geometria por coordenadas"
        style={{ display: 'flex', gap: 2, marginBottom: 10 }}
      >
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.id)}
              style={{
                flex: 1, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: active ? c.accentBg : 'transparent',
                color: active ? c.accentInk : c.dim,
                fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              {t.name}
            </button>
          )
        })}
      </div>

      {tab === 'ponto' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {axisField('lat', 'Latitude', LAT_PLACEHOLDER)}
          {axisField('lon', 'Longitude', LON_PLACEHOLDER)}
        </div>
      )}

      {tab === 'retangulo' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <span style={{ ...labelStyle, marginBottom: -2, color: c.textDim }}>Canto 1</span>
          {axisField('lat1', 'Latitude', LAT_PLACEHOLDER)}
          {axisField('lon1', 'Longitude', LON_PLACEHOLDER)}
          <span style={{ ...labelStyle, marginBottom: -2, marginTop: 2, color: c.textDim }}>
            Canto 2 (oposto)
          </span>
          {axisField('lat2', 'Latitude', LAT_PLACEHOLDER)}
          {axisField('lon2', 'Longitude', LON_PLACEHOLDER)}
        </div>
      )}

      {tab === 'poligono' && (
        <label style={{ display: 'block' }}>
          <span style={labelStyle}>Vértices — um par por linha</span>
          <textarea
            value={fields.vertices}
            onChange={(e) => setField('vertices', e.target.value)}
            placeholder={'-9.00, -40.00\n-9.00, -39.80\n-9.20, -39.90'}
            rows={6}
            style={{
              ...inputStyle('vertices'),
              height: 'auto',
              padding: 8,
              resize: 'vertical',
              lineHeight: 1.5,
            }}
          />
        </label>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 10.5, lineHeight: 1.45, color: c.caption }}>
        Latitude e depois longitude, em graus decimais (-9.25) ou em graus, minutos e
        segundos (9°15&apos;00&quot;S). Sul e oeste são negativos.
      </p>

      {error && (
        <p
          role="alert"
          style={{
            margin: '8px 0 0', fontSize: 11.5, fontWeight: 600,
            lineHeight: 1.4, color: c.terracota,
          }}
        >
          {error}
        </p>
      )}

      {warning && (
        <p
          role="status"
          style={{
            margin: '8px 0 0', padding: '6px 8px', borderRadius: 7,
            background: c.mist, fontSize: 11, lineHeight: 1.4, color: c.textDim,
          }}
        >
          {warning}
        </p>
      )}

      <button
        onClick={apply}
        style={{
          width: '100%', height: 32, marginTop: 10, borderRadius: 999, border: 'none',
          cursor: 'pointer', background: c.accent, color: c.onAccent,
          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
        }}
      >
        Aplicar
      </button>
    </div>
  )
}

// Helpers

/** Field keys whose parse came back null, in the order they were listed. */
function badAxisFields(parsed: [FieldKey, number | null][]): FieldKey[] {
  return parsed.filter(([, value]) => value === null).map(([key]) => key)
}

function invalidFieldsMessage(keys: FieldKey[]): string {
  const labels = keys.map((k) => FIELD_LABELS[k])
  if (labels.length === 1) {
    const [label] = labels
    return `${label[0].toUpperCase()}${label.slice(1)} inválida.`
  }
  return `Verifique: ${labels.join(', ')}.`
}
