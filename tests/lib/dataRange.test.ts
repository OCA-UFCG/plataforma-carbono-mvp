import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import ranges from '@/config/mapa/dataRanges.json'
import { dataRangeFor, layerYears, type DataRangesFile } from '@/lib/mapa/dataRange'
import type { LayerConfig } from '@/types/mapa'

const file: DataRangesFile = {
  layers: {
    biomassa_gedi: { min: 0, max: 1622.27 },
    biomassa_esa_lenhosa: { byYear: { '2010': { min: 0, max: 310 }, '2020': { min: 0, max: 298 } } },
  },
}

describe('dataRangeFor', () => {
  it('reads a static layer whatever the date', () => {
    expect(dataRangeFor('biomassa_gedi', undefined, file)).toEqual({ min: 0, max: 1622.27 })
    expect(dataRangeFor('biomassa_gedi', '2020-01-01', file)).toEqual({ min: 0, max: 1622.27 })
  })

  it('reads the year on screen for a temporal layer', () => {
    expect(dataRangeFor('biomassa_esa_lenhosa', '2020-01-01', file)).toEqual({ min: 0, max: 298 })
  })

  it('returns null so the legend keeps its stretch when there is no measurement', () => {
    expect(dataRangeFor('biomassa_esa_lenhosa', '2011-01-01', file)).toBeNull()
    expect(dataRangeFor('biomassa_esa_lenhosa', undefined, file)).toBeNull()
    expect(dataRangeFor('ndvi_modis', '2020-01-01', file)).toBeNull()
  })
})

describe('layerYears', () => {
  it('steps yearly through the range, or follows the explicit stops', () => {
    expect(layerYears({ dateRange: ['2001-01-01', '2004-01-01'] })).toEqual(['2001', '2002', '2003', '2004'])
    expect(layerYears({ dateRange: ['2007-01-01', '2022-01-01'], dates: ['2007-01-01', '2010-01-01'] }))
      .toEqual(['2007', '2010'])
  })
})

describe('dataRanges.json', () => {
  const layers = appConfig.layers as LayerConfig[]
  const measured = (ranges as DataRangesFile).layers

  it('names only continuous raster layers, with min not above max', () => {
    for (const [id, entry] of Object.entries(measured)) {
      const layer = layers.find((l) => l.id === id)
      expect(layer?.type === 'raster' && layer.colorType === 'continuous', id).toBe(true)
      const values = 'byYear' in entry ? Object.values(entry.byYear) : [entry]
      for (const r of values) expect(r.min, id).toBeLessThanOrEqual(r.max)
    }
  })
})
