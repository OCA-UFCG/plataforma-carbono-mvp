// The render-time text of what the map stores as ids (the subject of an
// analysis) and the phase name used inside a sentence.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import layersConfig from '@/config/mapa/layers.json'
import { describeAnalysisSubject } from '@/lib/mapa/analysisSubject'
import { buildCoordinatePoint } from '@/lib/mapa/parseCoordinates'
import { createMapaText, type MapaText } from '@/lib/mapa/text'
import { phaseInSentence } from '@/components/mapa/phaseText'
import type { AnalysisSubject, DrawnShape, LayerConfig } from '@/types/mapa'

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
const drawnKind = (tx: MapaText) => (shape: DrawnShape) => tx.t(`MapaUiResultsSidebar.kinds.${shape}`)

// The store keeps the subject as ids; the panel writes it in the language of
// the moment, so a card that outlives a language switch follows it.
describe('describeAnalysisSubject', () => {
  const describeIn = (tx: MapaText, subject: AnalysisSubject | null, drawing: GeoJSON.Feature | null = null) =>
    describeAnalysisSubject(subject, drawing, layers, tx, drawnKind(tx))

  it('names a drawn shape in the current language, with no label of its own', () => {
    expect(describeIn(EN, { kind: 'drawn', shape: 'area' })).toEqual({ kind: 'Drawn area', label: null })
    expect(describeIn(PT, { kind: 'drawn', shape: 'area' })).toEqual({ kind: 'Área desenhada', label: null })
  })

  it('writes the label of a typed coordinate from the drawing itself', () => {
    const point = buildCoordinatePoint([-38.5, -8.25])
    const pt = describeIn(PT, { kind: 'drawn', shape: 'coordinates' }, point)
    const en = describeIn(EN, { kind: 'drawn', shape: 'coordinates' }, point)

    expect(en.kind).toBe('Coordinates')
    expect(pt.label).toContain('O')
    expect(en.label).toContain('W')
  })

  it('names a recorte by its unit name and keeps the feature name, which is data', () => {
    const subject: AnalysisSubject = { kind: 'recorte', layerId: 'municipios', featureName: 'Petrolina' }

    expect(describeIn(EN, subject)).toEqual({ kind: 'Municipality', label: 'Petrolina' })
    expect(describeIn(PT, subject)).toEqual({ kind: 'Município', label: 'Petrolina' })
  })

  it('falls back to the layer name for a feature with no name of its own', () => {
    const subject: AnalysisSubject = { kind: 'recorte', layerId: 'municipios', featureName: null }

    expect(describeIn(EN, subject).label).toBe('Municipalities')
  })

  it('names nothing when there is no subject', () => {
    expect(describeIn(EN, null)).toEqual({ kind: null, label: null })
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
