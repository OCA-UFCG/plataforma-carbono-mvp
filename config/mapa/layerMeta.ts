// Per-layer UI metadata (one-line description + source label + type), consumed
// by the themes panel (chips) and by the layer info card (ⓘ). Kept separate
// from layers.json (data/GEE) so presentation is not mixed with config.

export type LayerKind = 'Raster contínuo' | 'Raster categórico' | 'Vetorial'

export interface LayerMeta {
  description: string
  source: string
  kind: LayerKind
}

export const LAYER_META: Record<string, LayerMeta> = {
  bioma:            { description: 'limite oficial do bioma',        source: 'IBGE 2019',            kind: 'Vetorial' },
  estados:          { description: 'divisas estaduais',              source: 'IBGE',                 kind: 'Vetorial' },
  municipios:       { description: 'malha municipal',                source: 'IBGE',                 kind: 'Vetorial' },
  terras_indigenas: { description: 'terras indígenas',              source: 'Funai',                kind: 'Vetorial' },
  quilombolas:      { description: 'territórios quilombolas',        source: 'Incra',                kind: 'Vetorial' },
  assentamentos:    { description: 'assentamentos rurais',           source: 'Incra',                kind: 'Vetorial' },

  // The only layer whose click opens a report, not the band statistics: the
  // displayed total breaks down into five pools and into phytophysiognomy.
  estoque_carbono:  { description: 'estoque de carbono dos cinco reservatórios, decomposto por reservatório e por fitofisionomia ao clicar numa área', source: 'Quarto Inventário Nacional, 100 m', kind: 'Raster contínuo' },
  // The five pools that add up to the layer above, each one in its own band.
  estoque_c_agb:    { description: 'carbono na biomassa acima do solo',  source: 'Quarto Inventário Nacional, 100 m', kind: 'Raster contínuo' },
  estoque_c_bgb:    { description: 'carbono na biomassa abaixo do solo, raízes', source: 'Quarto Inventário Nacional, 100 m', kind: 'Raster contínuo' },
  estoque_c_dw:     { description: 'carbono na madeira morta',           source: 'Quarto Inventário Nacional, 100 m', kind: 'Raster contínuo' },
  estoque_c_litter: { description: 'carbono na serrapilheira',           source: 'Quarto Inventário Nacional, 100 m', kind: 'Raster contínuo' },
  estoque_c_solo:   { description: 'carbono orgânico do solo, segunda estimativa ao lado da do MapBiomas', source: 'Quarto Inventário Nacional, 100 m', kind: 'Raster contínuo' },
  solo_carbono:     { description: 'carbono orgânico do solo (0-30 cm)', source: 'MapBiomas Solo, 30 m', kind: 'Raster contínuo' },
  gpp_modis:        { description: 'produtividade primária bruta',   source: 'MODIS, 500 m',        kind: 'Raster categórico' },
  npp_modis:        { description: 'produtividade primária líquida', source: 'MODIS, 500 m',        kind: 'Raster categórico' },
  // A second GPP estimate, to measure the divergence between sources. It comes
  // out continuous and yearly on purpose: the classified version of MOD17
  // returns a percentage per class in the zonal statistics, not a comparable value.
  gpp_pml:          { description: 'produtividade primária bruta anual, estimativa independente da do MODIS', source: 'PML-V2 v018, 500 m', kind: 'Raster contínuo' },
  biomassa_gedi:    { description: 'biomassa aérea',                 source: 'GEDI L4B, 1 km',      kind: 'Raster contínuo' },
  biomassa_spawn:   { description: 'carbono da biomassa aérea',      source: 'Spawn & Gibbs, 300 m', kind: 'Raster contínuo' },
  // The pair below comes from the same asset and differs only in how pixels
  // without woody cover are handled. Over the Caatinga the difference is large
  // (mean of 40.9 against 26.5 Mg/ha in 2022), so the two readings appear
  // separately in the panel.
  biomassa_esa_lenhosa:     { description: 'biomassa aérea medida apenas onde há vegetação lenhosa, com solo exposto e estrato herbáceo fora da conta', source: 'ESA CCI Biomass v6, 100 m', kind: 'Raster contínuo' },
  biomassa_esa_territorial: { description: 'a mesma biomassa distribuída por todo o território, contando como zero o que não é lenhoso', source: 'ESA CCI Biomass v6, 100 m', kind: 'Raster contínuo' },
  altura_dossel:    { description: 'altura da vegetação acima do solo, estimada por rede neural sobre imagem aérea', source: 'Meta e WRI, 1 m', kind: 'Raster contínuo' },
  gfw_netflux:      { description: 'fluxo líquido de carbono florestal', source: 'GFW, 30 m',       kind: 'Raster contínuo' },
  gfw_emissions:    { description: 'emissões brutas de carbono',     source: 'GFW, 30 m',           kind: 'Raster contínuo' },
  gfw_removals:     { description: 'remoções brutas de carbono',     source: 'GFW, 30 m',           kind: 'Raster contínuo' },
  lulc_mapbiomas:   { description: 'uso e cobertura da terra',       source: 'MapBiomas col. 10, 30 m', kind: 'Raster categórico' },
  fogo_frequencia:  { description: 'frequência de fogo (1985-2023)', source: 'MapBiomas Fogo, 30 m', kind: 'Raster contínuo' },
  ndvi_modis:       { description: 'índice de vegetação NDVI',       source: 'MODIS, 250 m',        kind: 'Raster contínuo' },
  evi_modis:        { description: 'índice de vegetação EVI',        source: 'MODIS, 250 m',        kind: 'Raster contínuo' },
  chirps_precip:    { description: 'precipitação anual',             source: 'CHIRPS, 5 km',        kind: 'Raster contínuo' },
  lst_modis:        { description: 'temperatura de superfície',      source: 'MODIS, 1 km',         kind: 'Raster contínuo' },
}
