// Translation plumbing of the map module's data and pure-logic layer.
//
// `config/mapa/layers.json` stays the source of truth for structure and for the
// Portuguese values; the English text lives in translations/<locale>/Mapa*.json,
// keyed by layer id, and is looked up through a `MapaText`. Every lookup falls
// back to the Portuguese value the config carries, so a missing key degrades to
// the original text instead of an empty label.
//
// `MapaText` is what every text-producing function of lib/ and config/ takes as
// its (optional) last parameter: the current locale plus a translator bound to
// the ROOT of the messages, so keys are written with their namespace
// ("MapaLayers.layers.bioma.name"). One translator can therefore reach every
// Mapa* namespace, which the pure functions need (a result headline reads
// MapaResults, a layer name reads MapaLayers, a unit reads MapaLayers again...).
//
// - React client/server component: `useMapaText()` (lib/mapa/useMapaText.ts).
// - Server route/service:          `await getMapaText()` (lib/mapa/textServer.ts).
// - Tests / anything else:         `createMapaText(locale, messages)`.
// - Omitted:                       `PT_TEXT`, the current Portuguese behaviour.
//
// `PT_TEXT` holds no messages: lib/mapa/textPt.ts brings the Portuguese ones,
// and only the server and the tests load it. The browser always passes the
// MapaText of useMapaText(), whose text the provider already delivered, so no
// client bundle carries the Mapa* messages a second time.

import { createTranslator } from 'next-intl'
import type { Locale } from '@/translations/config'
import type { LayerConfig, PixelValueResult, RasterClass, StoredText } from '@/types/mapa'

export type TranslationValues = Record<string, string | number>

/** The slice of a next-intl translator this module needs. */
export interface Translator {
  (key: string, values?: TranslationValues): string
  has(key: string): boolean
}

export interface MapaText {
  locale: Locale
  /** Bound to the messages root: keys carry their namespace, "MapaResults.format.source". */
  t: Translator
}

export { intlLocale, formatNumber } from '@/lib/mapa/locale'

/** Wraps a next-intl translator (or anything shaped like one) as a `Translator`. */
export function toTranslator(base: {
  (key: never, values?: never): string
  has(key: never): boolean
}): Translator {
  const t = ((key: string, values?: TranslationValues) =>
    (base as unknown as (k: string, v?: TranslationValues) => string)(key, values)) as Translator
  t.has = (key) => (base as unknown as { has(k: string): boolean }).has(key)
  return t
}

/** A `MapaText` over a plain messages object (server, tests, the Portuguese default). */
export function createMapaText(locale: Locale, messages: Record<string, unknown>): MapaText {
  const base = createTranslator({
    locale,
    // The messages are validated by tests/i18n/messages.test.ts; a missing key
    // is handled by the callers through `has`, so nothing to report here.
    messages: messages as never,
    onError: () => {},
  }) as unknown as Parameters<typeof toTranslator>[0]
  return { locale, t: toTranslator(base) }
}

let portuguese: MapaText | undefined

/** Called by lib/mapa/textPt.ts, with the Portuguese messages. */
export function registerPortugueseText(tx: MapaText): void {
  portuguese = tx
}

function portugueseText(): MapaText {
  if (!portuguese) {
    throw new Error(
      'No MapaText was given and the Portuguese default is not loaded: pass the ' +
      'MapaText of useMapaText() (or getMapaText() on the server), or import lib/mapa/textPt.ts.',
    )
  }
  return portuguese
}

/**
 * What every function does when it is given no `MapaText`: the Portuguese text.
 * It is resolved when a key is read, not on import, so a module can name it as
 * a default without bundling the messages.
 */
export const PT_TEXT: MapaText = {
  locale: 'pt',
  t: Object.assign(
    (key: string, values?: TranslationValues) => portugueseText().t(key, values),
    { has: (key: string) => portugueseText().t.has(key) },
  ),
}

/** `t(key)` when the key exists, else `fallback`. */
export function lookup(
  tx: MapaText | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues,
): string {
  return tx && tx.t.has(key) ? tx.t(key, values) : fallback
}

/** A message the store kept, written in the language of `tx`. */
export function storedText(message: StoredText, tx: MapaText): string {
  return 'key' in message ? tx.t(message.key, message.values) : message.text
}

// Layers

/** Units that carry Portuguese words, by the pt string. Any other unit (`t C/ha`, `Mg/ha`) is universal. */
const UNIT_KEYS: Record<string, string> = {
  'kg C/m²/ano': 'kgCPerM2Year',
  'g C/m²/ano': 'gCPerM2Year',
  't C/ano': 'tCPerYear',
  'mm/ano': 'mmPerYear',
  'anos com fogo': 'yearsWithFire',
}

/** A unit as written in the config, in the user's language. */
export function unitLabel(unit: string, tx?: MapaText): string {
  const key = UNIT_KEYS[unit]
  return key ? lookup(tx, `MapaLayers.units.${key}`, unit) : unit
}

/** Layer id and Portuguese name: all a lookup needs. */
type Named = { id: string; name: string }

export function layerName(layer: Named, tx?: MapaText): string {
  return lookup(tx, `MapaLayers.layers.${layer.id}.name`, layer.name)
}

/** What ONE feature of a vector layer is called ("Município"); the layer name when the config declares none. */
export function layerUnitName(layer: Named & { unitName?: string }, tx?: MapaText): string {
  return lookup(tx, `MapaLayers.layers.${layer.id}.unitName`, layer.unitName ?? layerName(layer, tx))
}

/** Unit of a raster layer, translated where it carries Portuguese words. */
export function layerUnit(layer: { unit?: string }, tx?: MapaText): string | undefined {
  return layer.unit === undefined ? undefined : unitLabel(layer.unit, tx)
}

export function classLabel(layerId: string, cls: Pick<RasterClass, 'value' | 'label'>, tx?: MapaText): string {
  return lookup(tx, `MapaLayers.layers.${layerId}.classes.${cls.value}`, cls.label)
}

/** Name of the class a sampled pixel falls in; undefined when the pixel has none. */
export function pixelClassLabel(
  layer: { id: string; classes?: RasterClass[] },
  pixel: Pick<PixelValueResult, 'classValue'>,
  tx?: MapaText,
): string | undefined {
  const cls = pixel.classValue === undefined ? undefined : layer.classes?.find((c) => c.value === pixel.classValue)
  return cls && classLabel(layer.id, cls, tx)
}

export function layerClasses(layer: { id: string; classes?: RasterClass[] }, tx?: MapaText): RasterClass[] | undefined {
  return layer.classes?.map((cls) => ({ ...cls, label: classLabel(layer.id, cls, tx) }))
}

/** One-line description of a layer (chips, layer sheet, report form). Empty when the layer has none. */
export function layerDescription(layerId: string, fallback = '', tx?: MapaText): string {
  return lookup(tx, `MapaLayers.layers.${layerId}.description`, fallback)
}

/** Source line of a layer ("MODIS, 500 m"). */
export function layerSource(layerId: string, fallback = '', tx?: MapaText): string {
  return lookup(tx, `MapaLayers.layers.${layerId}.source`, fallback)
}

const KIND_KEYS: Record<string, string> = {
  'Raster contínuo': 'continuousRaster',
  'Raster categórico': 'categoricalRaster',
  'Vetorial': 'vector',
}

/** "Raster contínuo" | "Raster categórico" | "Vetorial", translated. */
export function layerKind(kind: string, tx?: MapaText): string {
  const key = KIND_KEYS[kind]
  return key ? lookup(tx, `MapaLayers.kinds.${key}`, kind) : kind
}

/**
 * Label of a carbon pool of the stock report, by its band ("b2"): the band is
 * the pool's id (gee.stocks.pools, one stocks layer), and the Portuguese label
 * the server sends along is only the fallback.
 */
export function poolLabel(band: string, fallback: string, tx?: MapaText): string {
  return lookup(tx, `MapaLayers.stockPools.${band}`, fallback)
}

/**
 * A copy of the layer with `name`, `unitName`, `unit` and the class labels in
 * the user's language. Everything downstream that reads those fields
 * (`classShares`, the CSV snapshot, the legend) then needs no translation of
 * its own. Idempotent: lookups are by id, never by the text.
 */
export function localizeLayer<L extends LayerConfig>(layer: L, tx?: MapaText): L {
  const out = { ...layer, name: layerName(layer, tx) } as L
  if (layer.type === 'vector') {
    const v = layer as LayerConfig & { type: 'vector' }
    if (v.unitName !== undefined) (out as typeof v).unitName = layerUnitName(v, tx)
  } else {
    const r = layer as LayerConfig & { type: 'raster' }
    if (r.unit !== undefined) (out as typeof r).unit = unitLabel(r.unit, tx)
    if (r.classes) (out as typeof r).classes = layerClasses(r, tx)
  }
  return out
}

export function localizeLayers<L extends LayerConfig>(layers: L[], tx?: MapaText): L[] {
  return layers.map((layer) => localizeLayer(layer, tx))
}
