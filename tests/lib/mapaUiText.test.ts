// The render-time translation of text the map stores in Portuguese (the subject
// of an analysis, a layer error) and the phase name used inside a sentence.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import layersConfig from '@/config/mapa/layers.json'
import {
  ANALYSIS_KINDS,
  localizeAnalysisKind,
  localizeAnalysisLabel,
} from '@/lib/mapa/analysisSubject'
import { ANALYSIS_ERRORS } from '@/lib/mapa/analysisRunner'
import { buildCoordinatePoint } from '@/lib/mapa/parseCoordinates'
import { createMapaText, type MapaText } from '@/lib/mapa/text'
import { WFS_ERROR_PREFIX, localizeLayerError } from '@/components/mapa/layerErrors'
import { phaseInSentence } from '@/components/mapa/phaseText'
import type { LayerConfig } from '@/types/mapa'

const TRANSLATIONS = path.resolve(import.meta.dirname, '../../translations')

function messagesOf(locale: 'pt' | 'en'): Record<string, unknown> {
  const dir = path.join(TRANSLATIONS, locale)
  const files = fs.readdirSync(dir).filter((f) => /^Mapa.*\.json$/.test(f))
  return Object.assign({}, ...files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))))
}

const PT: MapaText = createMapaText('pt', messagesOf('pt'))
const EN: MapaText = createMapaText('en', messagesOf('en'))
const layers = layersConfig.layers as LayerConfig[]

// What ResultsSidebar passes: the kind of a drawn shape read from MapaUiResultsSidebar.
const drawnKind = (tx: MapaText) => (key: keyof typeof ANALYSIS_KINDS) =>
  tx.t(`MapaUiResultsSidebar.kinds.${key}`)

describe('localizeAnalysisKind', () => {
  it('keeps the Portuguese messages equal to the canonical kinds the store holds', () => {
    for (const key of Object.keys(ANALYSIS_KINDS) as (keyof typeof ANALYSIS_KINDS)[]) {
      expect(drawnKind(PT)(key), key).toBe(ANALYSIS_KINDS[key])
    }
  })

  it('turns the stored Portuguese kind of a drawn shape into the current language', () => {
    expect(localizeAnalysisKind(ANALYSIS_KINDS.area, layers, EN, drawnKind(EN))).toBe('Drawn area')
    expect(localizeAnalysisKind(ANALYSIS_KINDS.coordinates, layers, EN, drawnKind(EN))).toBe('Coordinates')
    expect(localizeAnalysisKind(ANALYSIS_KINDS.area, layers, PT, drawnKind(PT))).toBe('Área desenhada')
  })

  it('looks a recorte up by its unit name', () => {
    expect(localizeAnalysisKind('Município', layers, EN, drawnKind(EN))).toBe('Municipality')
    expect(localizeAnalysisKind('Município', layers, PT, drawnKind(PT))).toBe('Município')
  })

  it('leaves an unknown kind and null alone', () => {
    expect(localizeAnalysisKind('algo novo', layers, EN, drawnKind(EN))).toBe('algo novo')
    expect(localizeAnalysisKind(null, layers, EN, drawnKind(EN))).toBeNull()
  })
})

describe('localizeAnalysisLabel', () => {
  it('rebuilds the label of a typed coordinate from the drawing', () => {
    const point = buildCoordinatePoint([-38.5, -8.25])
    const pt = localizeAnalysisLabel('stale', ANALYSIS_KINDS.coordinates, point, layers, PT)
    const en = localizeAnalysisLabel('stale', ANALYSIS_KINDS.coordinates, point, layers, EN)
    expect(pt).toContain('O')
    expect(en).toContain('W')
    expect(en).not.toContain('stale')
  })

  it('translates a label that is a layer name and keeps a feature name', () => {
    expect(localizeAnalysisLabel('Municípios', 'Município', null, layers, EN)).toBe('Municipalities')
    expect(localizeAnalysisLabel('Petrolina', 'Município', null, layers, EN)).toBe('Petrolina')
    expect(localizeAnalysisLabel(null, null, null, layers, EN)).toBeNull()
  })
})

describe('localizeLayerError', () => {
  it('rebuilds the WFS error and the analysis errors', () => {
    expect(localizeLayerError(`${WFS_ERROR_PREFIX}timeout`, EN)).toBe('Failed to load WFS: timeout')
    expect(localizeLayerError(`${WFS_ERROR_PREFIX}timeout`, PT)).toBe(`${WFS_ERROR_PREFIX}timeout`)
    expect(localizeLayerError(ANALYSIS_ERRORS.stats, EN)).toBe(EN.t('MapaAnalysis.errors.stats'))
  })

  it('shows an unrecognised message as it is', () => {
    expect(localizeLayerError('API error 500', EN)).toBe('API error 500')
  })
})

describe('phaseInSentence', () => {
  it('lowercases the Portuguese label whole, as the map always did', () => {
    expect(phaseInSentence('folha', PT)).toBe('caatinga em folha')
    expect(phaseInSentence('chuva', PT)).toBe('primeiras chuvas')
  })

  it('keeps the proper noun in English', () => {
    expect(phaseInSentence('folha', EN)).toBe('Caatinga in leaf')
    expect(phaseInSentence('chuva', EN)).toBe('first rains')
    expect(phaseInSentence('branca', EN)).toBe('mata branca')
  })
})
