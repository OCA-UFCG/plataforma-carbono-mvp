// Which layers may enter the report, in what order, and the editorial metadata
// each section needs. The panel listing and the GEE pipeline stay in
// layers.json; this file is presentation and prose only.
//
// `source` is deliberately absent: it lives in LAYER_META, which already has
// it, and a second copy would drift.
//
// Every `sectionColor` carries white heading text, so each one is checked at
// 4.5:1 against white by tests/config/reportLayers.test.ts and by
// `npm run contrast`.

export interface ReportLayerConfig {
  layerId:      string
  order:        number
  sectionColor: string
  /** Fragment completing "…% da área analisada ___". */
  coverageContext: string
  /** Methodological note printed at the end of the document. */
  methodology:  string
  /** Vocabulary of the trend sentence. Absent where a trend reads badly. */
  trend?: {
    phenomenon:   string
    increaseTerm: string
    decreaseTerm: string
  }
  /**
   * Whether a zonal mean is a meaningful series for this layer. Defaults to
   * 'mean'.
   *
   * 'none' for a layer whose pixel values are class codes: the mean of
   * MapBiomas codes 3 and 15 is 9, which is a third class. A share-per-class
   * series would be the real answer there, and costs one grouped reduction per
   * year; it is recorded as a follow-up in the design doc.
   */
  seriesKind?: 'mean' | 'none'
  /**
   * Floor scale in metres for the series. Forty stops reduced over a whole
   * state at native resolution does not return.
   *
   * A floor, never a fixed value: the effective scale is
   * `max(seriesScale ?? 0, asset.scale ?? 500)`, so it can only coarsen. CHIRPS
   * is natively 5566 m, and a literal 300 there would ask Earth Engine to
   * resample finer than the data for no gain.
   */
  seriesScale?: number
}

export const MAX_REPORT_LAYERS = 8

export const REPORT_LAYERS: readonly ReportLayerConfig[] = [
  {
    layerId: 'estoque_carbono', order: 10, sectionColor: '#2F5D2A',
    coverageContext: 'nesta fitofisionomia',
    methodology: 'Estoques do Quarto Inventário Nacional, rasterizados a 100 m e somados sobre os cinco reservatórios. O total é densidade multiplicada pela área geodésica do pixel, e fecha com o vetor original em 0,03%.',
    // No `trend`: the layer has no `gee.temporal`, so there is no previous
    // stop to compare against and a trend sentence would have nothing to say.
  },
  {
    layerId: 'solo_carbono', order: 20, sectionColor: '#5A4632',
    coverageContext: 'nesta faixa de teor',
    methodology: 'Carbono orgânico do solo de 0 a 30 cm, MapBiomas Solo coleção 2, 30 m.',
    trend: { phenomenon: 'carbono do solo', increaseTerm: 'aumento', decreaseTerm: 'redução' },
    seriesScale: 300,
  },
  {
    layerId: 'biomassa_esa_lenhosa', order: 30, sectionColor: '#2E6B4F',
    coverageContext: 'nesta faixa de biomassa',
    methodology: 'Biomassa aérea da vegetação lenhosa, ESA CCI Biomass. A série tem lacuna: 2007, 2010 e de 2015 em diante.',
    trend: { phenomenon: 'biomassa', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
  {
    layerId: 'gfw_netflux', order: 40, sectionColor: '#1F5E73',
    coverageContext: 'nesta faixa de fluxo',
    methodology: 'Fluxo líquido de carbono florestal, Global Forest Watch. Valor negativo é remoção da atmosfera e positivo é emissão; o documento troca o sinal por uma palavra.',
    // No `trend`: the three GFW layers are cumulative in a single band and
    // carry no `gee.temporal`.
  },
  {
    layerId: 'lulc_mapbiomas', order: 50, sectionColor: '#8A5A16',
    coverageContext: 'nesta classe de uso e cobertura',
    methodology: 'Uso e cobertura da terra, MapBiomas coleção 10.1, 30 m, série anual de 1985 em diante.',
    // The pixel values are class codes, so their mean is not a quantity.
    seriesKind: 'none',
  },
  {
    layerId: 'fogo_frequencia', order: 60, sectionColor: '#9B3218',
    coverageContext: 'nesta faixa de recorrência',
    methodology: 'Frequência de fogo acumulada desde 1985, MapBiomas Fogo coleção 3. Áreas nunca queimadas entram como zero.',
    trend: { phenomenon: 'recorrência de fogo', increaseTerm: 'aumento', decreaseTerm: 'redução' },
    seriesScale: 300,
  },
  {
    layerId: 'gpp_modis', order: 70, sectionColor: '#41682A',
    coverageContext: 'nesta classe de produtividade',
    methodology: 'Produtividade primária bruta, MODIS MOD17A2HGF, classificada em cinco classes por Jenks sobre o bioma.',
    trend: { phenomenon: 'produtividade bruta', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
  {
    layerId: 'npp_modis', order: 80, sectionColor: '#37613B',
    coverageContext: 'nesta classe de produtividade',
    methodology: 'Produtividade primária líquida, MODIS MOD17A3HGF, classificada em cinco classes por Jenks sobre o bioma.',
    trend: { phenomenon: 'produtividade líquida', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
  {
    layerId: 'chirps_precip', order: 90, sectionColor: '#2B4C7E',
    coverageContext: 'nesta faixa de precipitação',
    methodology: 'Precipitação anual acumulada, CHIRPS diário somado no ano.',
    trend: { phenomenon: 'precipitação', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
  {
    layerId: 'ndvi_modis', order: 100, sectionColor: '#4A6A1F',
    coverageContext: 'nesta faixa de vigor',
    methodology: 'NDVI, MODIS MOD13Q1, média das composições de 16 dias do ano.',
    trend: { phenomenon: 'vigor da vegetação', increaseTerm: 'aumento', decreaseTerm: 'redução' },
  },
] as const

/** The report config of a layer, or undefined when it is not eligible. */
export function getReportLayer(layerId: string): ReportLayerConfig | undefined {
  return REPORT_LAYERS.find((entry) => entry.layerId === layerId)
}
