import { describe, expect, it } from 'vitest'
import appConfig from '@/config/mapa/layers.json'
import { LAYER_META } from '@/config/mapa/layerMeta'
import { MAX_REPORT_LAYERS, REPORT_LAYERS, getReportLayer } from '@/config/mapa/reportLayers'
import { buildReportTheme } from '@/config/mapa/platforms'
import { contrast } from '@/lib/color'

const MIN_CONTRAST = 4.5

describe('REPORT_LAYERS', () => {
  it('only names raster layers that exist in layers.json', () => {
    const rasters = new Set(
      appConfig.layers.filter((l) => l.type === 'raster').map((l) => l.id),
    )

    for (const entry of REPORT_LAYERS) {
      expect(rasters.has(entry.layerId)).toBe(true)
    }
  })

  it('has a LAYER_META entry for every eligible layer, since source comes from there', () => {
    for (const entry of REPORT_LAYERS) {
      expect(LAYER_META[entry.layerId]?.source).toBeTruthy()
    }
  })

  it('puts the decomposed stock layer first', () => {
    // estoque_carbono is the only layer whose result is the stock report, and
    // it is the centerpiece of a carbon document.
    const ordered = [...REPORT_LAYERS].sort((a, b) => a.order - b.order)
    expect(ordered[0].layerId).toBe('estoque_carbono')
  })

  it('has unique ids and unique order values', () => {
    const ids = REPORT_LAYERS.map((e) => e.layerId)
    const orders = REPORT_LAYERS.map((e) => e.order)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('carries white-legible section colors', () => {
    // Each section heading is white text on sectionColor.
    for (const entry of REPORT_LAYERS) {
      expect(contrast(entry.sectionColor, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
    }
  })

  it('offers at least as many layers as one generation may select', () => {
    expect(REPORT_LAYERS.length).toBeGreaterThanOrEqual(MAX_REPORT_LAYERS)
  })

  it('declares no zonal-mean series for a layer whose pixels are class codes', () => {
    // Averaging MapBiomas codes 3 and 15 yields 9, which is Silvicultura.
    expect(getReportLayer('lulc_mapbiomas')?.seriesKind).toBe('none')
    // gpp_modis holds raw GPP and is classified downstream, so its mean is real.
    expect(getReportLayer('gpp_modis')?.seriesKind ?? 'mean').toBe('mean')
  })

  it('gives a trend block to every layer that can have a series', () => {
    const rasters = new Map(appConfig.layers.map((l) => [l.id, l]))

    for (const entry of REPORT_LAYERS) {
      const temporal = Boolean(
        (rasters.get(entry.layerId) as { gee?: { temporal?: unknown } } | undefined)?.gee?.temporal,
      )
      const canHaveSeries = temporal && entry.seriesKind !== 'none'
      // A trend sentence with nothing to compare against is dead config.
      expect(Boolean(entry.trend)).toBe(canHaveSeries)
    }
  })
})

describe('getReportLayer', () => {
  it('resolves an eligible layer and rejects anything else', () => {
    expect(getReportLayer('estoque_carbono')).toMatchObject({ layerId: 'estoque_carbono' })
    // A layer that exists but is not curated must not be reportable.
    expect(getReportLayer('estoque_c_agb')).toBeUndefined()
    expect(getReportLayer('nao-existe')).toBeUndefined()
  })
})

describe('buildReportTheme', () => {
  it('is the fixed OCA identity, in light mode, independent of the month', () => {
    const theme = buildReportTheme()

    expect(theme.colors.accent).toBe('#5f7030')
    // Light neutrals: a printed document is on white paper.
    expect(theme.colors.bgCard).toBe('#ffffff')
  })

  it('keeps its inks legible on the document surfaces', () => {
    const { colors } = buildReportTheme()

    expect(contrast(colors.accentInk, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(contrast(colors.emissionInk, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
    expect(contrast(colors.removalInk, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST)
  })
})
