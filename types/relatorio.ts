// Contract of the automatic territorial report.
//
// The snapshot of an analysis is a `RasterStatsResult`, the very union the
// zonal statistics already return, instead of a parallel shape. That is what
// lets StatsChart, StockReportView and exportAnalysis serve the document
// unchanged, including the `estoque_carbono` breakdown by pool and by
// fitofisionomia.

import type { RasterStatsResult, TimeSeriesPoint } from '@/types/mapa'

export type ReportAnalysisStatus = 'available' | 'unavailable' | 'year_not_found'

export interface ReportRecorte {
  layerId:     string   // 'municipios'
  layerName:   string   // 'Municípios'
  featureId:   string   // 'campina-grande'
  featureName: string   // 'Campina Grande'
  areaHa:      number
  bbox:        [number, number, number, number]
  /** 'simplified' when the boundary came from a `_clip` file. */
  boundary:    'full' | 'simplified'
}

/** Everything known about an analysis before touching Earth Engine. */
export interface ReportAnalysisDescriptor {
  layerId:        string
  name:           string
  unit?:          string
  signedFlux?:    boolean
  /** From LAYER_META, not duplicated in the report config. */
  source:         string
  /** The longer paragraph, from the report config. */
  methodology:    string
  sectionColor:   string
  /** Years of `gee.temporal`, as 4-digit strings. Empty when the layer is static. */
  availableYears: string[]
  /** null on the layers with no series. */
  requestedYear:  string | null
  effectiveYear:  string | null
  /**
   * Whether the analysis is expected to carry a yearly series once available:
   * temporal, more than one stop, and `seriesKind !== 'none'`. Lets the
   * section tell "this layer never has a series" (`false`) apart from "the
   * series failed to compute" (`true` with an empty `series`).
   */
  seriesExpected: boolean
}

export interface ReportShell {
  schemaVersion: 1
  generatedAt:   string
  recorte:       ReportRecorte
  requestedYear: string
  analyses:      ReportAnalysisDescriptor[]
}

export interface ReportNarrative {
  situation: string | null
  trend:     string | null
  context:   string | null
}

export interface ReportAnalysis extends ReportAnalysisDescriptor {
  status:    ReportAnalysisStatus
  snapshot:  RasterStatsResult | null
  /** Zonal mean per year. Empty for a static layer or a failed series. */
  series:    TimeSeriesPoint[]
  narrative: ReportNarrative
}

/** The assembled document: the shell joined with its N analyses. */
export interface ReportData {
  schemaVersion: 1
  generatedAt:   string
  recorte:       ReportRecorte
  requestedYear: string
  analyses:      ReportAnalysis[]
}
