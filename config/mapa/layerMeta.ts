// Metadados de UI por camada (descrição de uma linha + rótulo de fonte + tipo),
// consumidos pelo painel de temas (chips) e pela ficha da camada (ⓘ).
// Separado de layers.json (dados/GEE) para não misturar apresentação com config.

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

  solo_carbono:     { description: 'carbono orgânico do solo (0-30 cm)', source: 'MapBiomas Solo, 30 m', kind: 'Raster contínuo' },
  gpp_modis:        { description: 'produtividade primária bruta',   source: 'MODIS, 500 m',        kind: 'Raster categórico' },
  npp_modis:        { description: 'produtividade primária líquida', source: 'MODIS, 500 m',        kind: 'Raster categórico' },
  // Segunda estimativa de GPP, para medir a divergência entre bases. Sai
  // contínua e anual de propósito: a versão classificada do MOD17 devolve
  // percentual por classe na estatística zonal, e não um valor comparável.
  gpp_pml:          { description: 'produtividade primária bruta anual, estimativa independente da do MODIS', source: 'PML-V2 v018, 500 m', kind: 'Raster contínuo' },
  biomassa_gedi:    { description: 'biomassa aérea',                 source: 'GEDI L4B, 1 km',      kind: 'Raster contínuo' },
  biomassa_spawn:   { description: 'carbono da biomassa aérea',      source: 'Spawn & Gibbs, 300 m', kind: 'Raster contínuo' },
  // O par abaixo sai do mesmo asset e difere só no tratamento dos pixels sem
  // lenhosa. Sobre a Caatinga a diferença é grande (média de 40,9 contra
  // 26,5 Mg/ha em 2022), então as duas leituras aparecem separadas no painel.
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
