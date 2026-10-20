// Content of the layer sheet (LayerInfoCard): what the layer shows, the reading
// cautions and the technical sheet. Kept apart from layerMeta.ts, whose short
// `description` also feeds the report form and the panel search.
//
// A field that has not been checked against the producer is left out rather
// than filled with a guess: the sheet hides what it does not have. The unit
// comes from layers.json, so it is not repeated here.

export interface LayerInfo {
  /** What the layer shows, one or two sentences. */
  summary: string
  /** What changes the reading of the values; shown before the sheet. */
  cautions?: string[]
  /** Time covered, as the chip and the sheet show it ("1985-2023"). */
  period?: string
  resolution?: string
  /** Share of the Caatinga with data, in percent; drawn as a bar, so the
   *  cautions do not repeat it. */
  coverage?: number
  /** Producer and product, longer than layerMeta's `source`. */
  source: string
  method?: string
  license?: { label: string; url: string }
  /** Reference of the data, as the producer asks when it does; `{acesso}`
   *  becomes today's date. */
  citation?: string
  /** Page of the Comunicação area about the layer's subject, once it exists. */
  learnMore?: { href: string; label: string }
}

const INVENTARIO = 'Quarto Inventário Nacional de Emissões e Remoções Antrópicas de Gases de Efeito Estufa, setor LULUCF (MCTI)'
const INVENTARIO_PRETERITA = 'Valores da vegetação natural pretérita, sem desconto do uso atual da terra.'
const INVENTARIO_LACUNA = 'A área sem dado fica no oeste e no sudoeste do bioma.'
const INVENTARIO_POR_CLASSE = 'Valor fixo por fitofisionomia da vegetação natural pretérita.'
const CC_BY_NC_SA = { label: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-br' }
const FABDEM_LICENCA = 'A licença CC BY-NC-SA 4.0 restringe o uso a fins não comerciais e exige a mesma licença para dados derivados.'
const CC_BY = { label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/deed.pt-br' }
// NASA's data use guidance puts the data of its missions under CC0.
const CC0 = { label: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.pt-br' }
const COPERNICUS_DEM = 'produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.'
const INVENTARIO_CITACAO = 'Brasil. Ministério da Ciência, Tecnologia e Inovações (2020). Quarto Inventário Nacional de Emissões e Remoções Antrópicas de Gases de Efeito Estufa, Relatório de Referência, Setor Uso da Terra, Mudança do Uso da Terra e Florestas. Brasília: MCTI.'
const MOD17_CITACAO = 'Running, S., & Zhao, M. (2021). MODIS/Terra Net Primary Production Gap-Filled Yearly L4 Global 500m SIN Grid V061. NASA Land Processes Distributed Active Archive Center. https://doi.org/10.5067/MODIS/MOD17A3HGF.061'
const MOD13_CITACAO = 'Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061. NASA Land Processes Distributed Active Archive Center. https://doi.org/10.5067/MODIS/MOD13Q1.061'
const ESA_CITACAO = 'Santoro, M., & Cartus, O. (2025). ESA Biomass Climate Change Initiative (Biomass_cci): Global datasets of forest above-ground biomass for the years 2007, 2010, 2015, 2016, 2017, 2018, 2019, 2020, 2021 and 2022, v6.0. NERC EDS Centre for Environmental Data Analysis. https://doi.org/10.5285/95913ffb6467447ca72c4e9d8cf30501'
const ESA_LICENCA = { label: 'Termos ESA CCI', url: 'https://artefacts.ceda.ac.uk/licences/specific_licences/esacci_biomass_terms_and_conditions_v2.pdf' }
const GFW_CITACAO = 'Harris, N. L., et al. (2021). Global maps of twenty-first century forest carbon fluxes. Nature Climate Change, 11, 234-240. https://doi.org/10.1038/s41558-020-00976-6. Acessado em {acesso} pelo Global Nature Watch.'
const FABDEM_CITACAO = 'Hawker, L., Uhe, P., Paulo, L., Sosa, J., Savage, J., Sampson, C., & Neal, J. (2022). A 30 m global map of elevation with forests and buildings removed. Environmental Research Letters, 17, 024016. https://doi.org/10.1088/1748-9326/ac4d4f. FABDEM is ' + COPERNICUS_DEM
const MEDIA_ANUAL = 'A média anual esconde a grande variação entre a estação chuvosa e a seca.'
const GFW_FONTE = 'Global Forest Watch, fluxos de carbono florestal, modelo v1.4.2 (Harris et al., 2021; Gibbs et al., 2025)'
const GFW_EXTENSAO = 'Só entram áreas com dossel acima de 30% em 2000, de árvores com mais de 5 m, ou com ganho de cobertura de 2000 a 2020.'

export const LAYER_INFO: Record<string, LayerInfo> = {
  bioma: {
    summary: 'Limite oficial do bioma Caatinga, com 862.640 km², do mapeamento de biomas do IBGE na escala 1:250.000.',
    period: '2019',
    resolution: '1:250.000',
    source: 'IBGE, Biomas e Sistema Costeiro-Marinho do Brasil (2019)',
    citation: 'IBGE (2019). Biomas e sistema costeiro-marinho do Brasil: compatível com a escala 1:250 000. Rio de Janeiro: IBGE. Relatórios Metodológicos, v. 45.',
  },
  estados: {
    summary: 'Estados com municípios de Caatinga predominante (AL, BA, CE, MG, PB, PE, PI, RN e SE), 9 ao todo, recortados no limite do bioma.',
    cautions: ['Cada polígono é a porção do estado inserida na Caatinga.'],
    period: '2022',
    source: 'IBGE, malha territorial de 2022',
  },
  municipios: {
    summary: 'Municípios em que a Caatinga é o bioma predominante, segundo a classificação do IBGE de 2024, 1.095 ao todo, com o território inteiro.',
    cautions: [
      'Nos municípios de borda, os valores incluem a parte fora da Caatinga.',
      'A Caatinga presente em outros 114 municípios, cerca de 3,4% do bioma, fica sem polígono municipal.',
    ],
    period: '2022',
    source: 'IBGE, malha municipal de 2022 e bioma predominante por município (2024)',
  },
  terras_indigenas: {
    summary: 'Terras indígenas com perímetro georreferenciado na base da Funai e mais da metade da área no bioma, 46 ao todo, recortadas no limite dele.',
    cautions: ['Vão da fase delimitada à regularizada, incluindo reservas indígenas em aquisição; nenhuma está em estudo.'],
    period: 'Outubro de 2026',
    source: 'Funai, base de terras indígenas',
  },
  quilombolas: {
    summary: 'Territórios quilombolas com perímetro delimitado no processo de regularização do Incra, do relatório técnico de identificação e delimitação (RTID) ao título, e mais da metade da área no bioma, 84 ao todo, recortados no limite dele.',
    cautions: ['Estar no mapa não significa titulação concluída; só 7 estão titulados por inteiro, e 30 contam apenas com o RTID.'],
    period: 'Outubro de 2026',
    source: 'Incra, acervo fundiário (Áreas de Quilombolas)',
  },
  assentamentos: {
    summary: 'Projetos de assentamento da reforma agrária no cadastro do Incra com mais da metade da área no bioma, recortados no limite dele.',
    period: 'Outubro de 2026',
    source: 'Incra, acervo fundiário (Assentamento Brasil)',
  },
  areas_monitoramento: {
    summary: 'Sítios em área de Caatinga com torre de fluxo, 5 ao todo, que mediram as trocas de CO2, água e energia entre a vegetação e a atmosfera pelo método de covariância de vórtices.',
    cautions: ['As medições foram campanhas entre 2011 e 2020.'],
    period: '2011-2020',
    source: 'Mendes et al. (2025), Agricultural and Forest Meteorology 369, 110573',
    citation: 'Mendes, K. R., et al. (2025). The caatinga dry tropical forest: A highly efficient carbon sink in South America. Agricultural and Forest Meteorology, 369, 110573. https://doi.org/10.1016/j.agrformet.2025.110573',
  },

  estoque_carbono: {
    summary: 'Carbono somado dos cinco reservatórios do Quarto Inventário Nacional: biomassa aérea e subterrânea, madeira morta, serrapilheira e solo a 0-30 cm.',
    cautions: [INVENTARIO_PRETERITA, 'O solo responde por 44% do total.', INVENTARIO_LACUNA],
    period: 'Mapa único',
    resolution: '100 m',
    coverage: 96,
    source: INVENTARIO,
    method: 'Valor fixo por fitofisionomia nos reservatórios da vegetação; no solo, por combinação de tipo de solo e vegetação nativa (Bernoux et al., 2002).',
    citation: INVENTARIO_CITACAO,
  },
  estoque_c_agb: {
    citation: INVENTARIO_CITACAO,
    summary: 'Carbono na biomassa viva acima do solo.',
    cautions: [INVENTARIO_POR_CLASSE, INVENTARIO_PRETERITA, INVENTARIO_LACUNA],
    period: 'Mapa único', resolution: '100 m', coverage: 96, source: INVENTARIO,
  },
  estoque_c_bgb: {
    citation: INVENTARIO_CITACAO,
    summary: 'Carbono nas raízes vivas.',
    cautions: [INVENTARIO_POR_CLASSE, INVENTARIO_PRETERITA, INVENTARIO_LACUNA],
    period: 'Mapa único', resolution: '100 m', coverage: 96, source: INVENTARIO,
  },
  estoque_c_dw: {
    citation: INVENTARIO_CITACAO,
    summary: 'Carbono em troncos e galhos mortos, em pé ou caídos.',
    cautions: [INVENTARIO_POR_CLASSE, INVENTARIO_PRETERITA, INVENTARIO_LACUNA],
    period: 'Mapa único', resolution: '100 m', coverage: 96, source: INVENTARIO,
  },
  estoque_c_litter: {
    citation: INVENTARIO_CITACAO,
    summary: 'Carbono na camada de folhas, galhos finos e outros restos vegetais sobre o solo.',
    cautions: [INVENTARIO_POR_CLASSE, INVENTARIO_PRETERITA, INVENTARIO_LACUNA],
    period: 'Mapa único', resolution: '100 m', coverage: 96, source: INVENTARIO,
  },
  estoque_c_solo: {
    summary: 'Carbono orgânico do solo a 0-30 cm, com valor de referência fixo por combinação de tipo de solo e vegetação nativa.',
    cautions: [
      'Sem desconto do uso atual da terra.',
      'Estima o mesmo reservatório que a camada do MapBiomas, por outro método, e as duas não se somam.',
      INVENTARIO_LACUNA,
    ],
    period: 'Mapa único', resolution: '100 m', coverage: 96, source: INVENTARIO,
    method: 'Medianas de Bernoux et al. (2002) por tipo de solo e vegetação.',
    citation: INVENTARIO_CITACAO,
  },
  solo_carbono: {
    summary: 'Carbono orgânico do solo a 0-30 cm, um mapa por ano de 1985 a 2023.',
    cautions: ['A maioria das amostras foi coletada entre 1995 e 2014, o que pede cautela ao comparar anos.'],
    period: '1985-2023',
    resolution: '30 m',
    source: 'MapBiomas Solo, coleção 2',
    method: 'Aprendizado de máquina a partir de 12,6 mil pontos com estoque medido e de mais de 100 variáveis ambientais.',
  },
  solo_carbono_embrapa: {
    summary: 'Teor de carbono orgânico do solo, em gramas por quilo de solo.',
    cautions: ['Convertê-lo em estoque exigiria a densidade do solo e a espessura da camada, que o produto não traz, por isso o valor não se compara diretamente aos mapas em t C/ha.'],
    resolution: '1 km',
    source: 'Embrapa',
  },

  biomassa_gedi: {
    summary: 'Biomassa aérea seca, média de cada célula incluindo as áreas não florestais, estimada com as medições do lidar GEDI, na Estação Espacial Internacional.',
    cautions: ['O carbono corresponde a 47% da biomassa seca, fração padrão do IPCC.'],
    period: 'Abr. 2019 a ago. 2021',
    resolution: '1 km',
    coverage: 70,
    source: 'NASA GEDI L4B, versão 2',
    license: CC0,
    citation: 'Dubayah, R. O., Armston, J., Healey, S. P., Yang, Z., Patterson, P. L., Saarela, S., Stahl, G., Duncanson, L., & Kellner, J. R. (2022). GEDI L4B Gridded Aboveground Biomass Density, Version 2. ORNL Distributed Active Archive Center. https://doi.org/10.3334/ORNLDAAC/2017',
  },
  biomassa_esa_lenhosa: {
    summary: 'Biomassa aérea seca das partes lenhosas das árvores vivas, sem o estrato herbáceo, um mapa por ano em 2007, 2010 e de 2015 a 2022.',
    cautions: ['Onde o produto estima biomassa zero, o pixel fica sem dado.'],
    period: '2007, 2010, 2015-2022',
    resolution: '100 m',
    coverage: 68,
    source: 'ESA Climate Change Initiative, Biomass v6.0',
    method: 'Radar de satélite calibrado com lidar.',
    license: ESA_LICENCA,
    citation: ESA_CITACAO,
  },
  biomassa_esa_territorial: {
    summary: 'Biomassa aérea seca da camada ESA CCI de vegetação lenhosa, com valor zero onde o produto estima biomassa zero, um mapa por ano em 2007, 2010 e de 2015 a 2022.',
    cautions: ['Expressa a densidade média de todo o território, comparável à do GEDI, que também inclui áreas não florestais.'],
    period: '2007, 2010, 2015-2022',
    resolution: '100 m',
    source: 'ESA Climate Change Initiative, Biomass v6.0',
    license: ESA_LICENCA,
    citation: ESA_CITACAO,
  },
  biomassa_spawn: {
    summary: 'Carbono na biomassa aérea viva, lenhosa e herbácea, em 2010, de um mapa global que harmoniza mapas de biomassa de árvores, campos e lavouras.',
    cautions: ['A parte lenhosa vem do GlobBiomass, convertida em carbono por teores próprios de cada clima e grupo de plantas (Martin et al., 2018).'],
    period: '2010',
    resolution: '300 m',
    source: 'Spawn et al. (2020), Scientific Data 7, 112',
    license: CC0,
    citation: 'Spawn, S. A., & Gibbs, H. K. (2020). Global Aboveground and Belowground Biomass Carbon Density Maps for the Year 2010. ORNL DAAC, Oak Ridge, Tennessee, USA. https://doi.org/10.3334/ORNLDAAC/1763',
  },
  altura_dossel: {
    summary: 'Altura da vegetação acima do solo, estimada por rede neural a partir de imagens de satélite de alta resolução, 80% delas de 2018 a 2020.',
    cautions: ['O erro absoluto médio reportado é de 2,8 m e chega a 5,1 m no teste em São Paulo, o que pesa na vegetação baixa da Caatinga.'],
    period: '2018-2020',
    resolution: '1 m',
    source: 'Meta e World Resources Institute (Tolan et al., 2024), Remote Sensing of Environment 300, 113888',
    method: 'Rede neural calibrada com lidar aerotransportado e com o lidar GEDI.',
    license: CC_BY,
    citation: 'Meta e World Resources Institute (WRI) (2024). High Resolution Canopy Height Maps (CHM). Source imagery for CHM © 2016 Maxar. Acessado em {acesso} em https://registry.opendata.aws/dataforgood-fb-forests',
  },

  gpp_modis: {
    summary: 'Carbono absorvido pela fotossíntese ao longo do ano, antes de descontar a respiração das plantas, um mapa por ano de 2001 a 2025.',
    cautions: ['A comparação com o PML-V2 exige o mesmo ano, até 2023.'],
    period: '2001-2025',
    resolution: '500 m',
    source: 'NASA MODIS, MOD17A3HGF v6.1',
    method: 'Modelo de eficiência no uso da luz (MOD17).',
    license: CC0,
    citation: MOD17_CITACAO,
  },
  gpp_pml: {
    summary: 'Carbono absorvido pela fotossíntese ao longo do ano, antes de descontar a respiração das plantas, um mapa por ano de 2001 a 2023.',
    cautions: ['Usa o mesmo índice de área foliar que alimenta o MOD17, por isso a diferença entre as duas estimativas mede só parte da incerteza.'],
    period: '2001-2023',
    resolution: '500 m',
    source: 'PML-V2, versão 018 (Zhang et al., 2019)',
    method: 'Modelo que acopla fotossíntese e transpiração pela abertura dos estômatos.',
    license: CC_BY,
    citation: 'Zhang, Y., Kong, D., Gan, R., Chiew, F. H. S., McVicar, T. R., Zhang, Q., & Yang, Y. (2019). Coupled estimation of 500 m and 8-day resolution global evapotranspiration and gross primary production in 2002-2017. Remote Sensing of Environment, 222, 165-182. https://doi.org/10.1016/j.rse.2018.12.031',
  },
  npp_modis: {
    summary: 'Carbono que fica na vegetação depois de descontada a respiração das plantas, um mapa por ano de 2001 a 2025.',
    cautions: ['Não desconta a decomposição da matéria orgânica nem as perdas por fogo e corte, então não equivale ao balanço de carbono do ecossistema.'],
    period: '2001-2025',
    resolution: '500 m',
    source: 'NASA MODIS, MOD17A3HGF v6.1',
    method: 'Modelo de eficiência no uso da luz (MOD17).',
    license: CC0,
    citation: MOD17_CITACAO,
  },
  gfw_netflux: {
    summary: 'Saldo entre emissões e remoções de carbono em áreas florestais, acumulado de 2001 a 2024, em que valores positivos indicam emissão líquida e negativos, remoção líquida.',
    cautions: [GFW_EXTENSAO],
    period: '2001-2024',
    resolution: '30 m',
    coverage: 26,
    source: GFW_FONTE,
    license: CC_BY,
    citation: GFW_CITACAO,
  },
  gfw_emissions: {
    summary: 'Emissões de CO2, CH4 e N2O, em CO2 equivalente, da perda de cobertura arbórea por desmatamento, fogo e outras perturbações que eliminam o dossel, acumuladas de 2001 a 2024.',
    cautions: ['Os reservatórios e os gases variam conforme a causa da perda.', 'Só há dado onde houve perda de cobertura arbórea.'],
    period: '2001-2024',
    resolution: '30 m',
    coverage: 4,
    source: GFW_FONTE,
    license: CC_BY,
    citation: GFW_CITACAO,
  },
  gfw_removals: {
    summary: 'Remoções de CO2 da atmosfera pelo crescimento e pela rebrota da vegetação florestal, na biomassa aérea e nas raízes, acumuladas de 2001 a 2024.',
    cautions: [GFW_EXTENSAO, 'A incerteza é maior que a das emissões.'],
    period: '2001-2024',
    resolution: '30 m',
    coverage: 26,
    source: GFW_FONTE,
    method: 'Taxas que dependem do tipo de floresta, em geral padrões do IPCC por zona ecológica.',
    license: CC_BY,
    citation: GFW_CITACAO,
  },

  lulc_mapbiomas: {
    summary: 'Classes de uso e cobertura da terra, mapeadas em imagens Landsat, um mapa por ano de 1985 a 2024.',
    period: '1985-2024',
    resolution: '30 m',
    source: 'MapBiomas, coleção 10.1',
    method: 'Classificação de imagens Landsat por aprendizado de máquina.',
    license: CC_BY,
    citation: 'Projeto MapBiomas, Coleção 10.1 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil, acessado em {acesso} através do link: https://brasil.mapbiomas.org',
  },
  fogo_frequencia: {
    summary: 'Número de anos com fogo em cada pixel, acumulado desde 1985, um mapa por ano de 1985 a 2023.',
    cautions: ['Indica a recorrência do fogo, sem informar área queimada nem intensidade.', 'Áreas que nunca queimaram ficam sem dado.'],
    period: '1985-2023',
    resolution: '30 m',
    source: 'MapBiomas Fogo, coleção 3',
    method: 'Classificação de imagens Landsat por aprendizado de máquina, ano a ano, acumulada desde 1985.',
    license: CC_BY,
  },
  degradacao_terra: {
    summary: 'Classes de degradação da terra em 2021, seis ao todo, de Conservado ao Nível 5, o mais degradado.',
    cautions: ['Na área classificada da Caatinga, 79% está em Conservado e 11% no Nível 4.'],
    period: '2021',
    resolution: '500 m',
    source: 'Bezerra et al. (2026), Remote Sensing 18, 1695',
    license: CC_BY,
    citation: 'Bezerra, U. A., Brito, H. C. de, Oliveira, S. H., Costa, L. D. A., Lourenço, A. M. G., Pérez-Marin, A. M., & Cunha, J. E. (2026). A Gradient-Based Index for Multiscale Mapping of Land Degradation in Brazil. Remote Sensing, 18(11), 1695. https://doi.org/10.3390/rs18111695',
  },

  ndvi_modis: {
    summary: 'Índice de verdor da vegetação, de -0,2 a 1 neste produto, um mapa por ano de 2001 a 2024. Valores mais altos indicam vegetação mais densa e fotossinteticamente ativa.',
    cautions: [MEDIA_ANUAL],
    period: '2001-2024',
    resolution: '250 m',
    source: 'NASA MODIS, MOD13Q1 v6.1',
    method: 'Média anual das composições de 16 dias.',
    license: CC0,
    citation: MOD13_CITACAO,
  },
  evi_modis: {
    summary: 'Índice de verdor semelhante ao NDVI, com correção para a atmosfera e o fundo de solo e menor saturação em vegetação densa, um mapa por ano de 2001 a 2024.',
    cautions: [MEDIA_ANUAL],
    period: '2001-2024',
    resolution: '250 m',
    source: 'NASA MODIS, MOD13Q1 v6.1',
    method: 'Média anual das composições de 16 dias.',
    license: CC0,
    citation: MOD13_CITACAO,
  },
  chirps_precip: {
    summary: 'Chuva acumulada no ano, um mapa por ano de 1985 a 2024.',
    period: '1985-2024',
    resolution: '5,5 km',
    source: 'CHIRPS v2.0, Climate Hazards Center (UCSB)',
    method: 'Estimativas de satélite combinadas com dados de pluviômetros, em grade de 0,05°.',
    license: { label: 'Domínio público', url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.pt-br' },
    citation: 'Funk, C., Peterson, P., Landsfeld, M., Pedreros, D., Verdin, J., Shukla, S., Husak, G., Rowland, J., Harrison, L., Hoell, A., & Michaelsen, J. (2015). The climate hazards infrared precipitation with stations, a new environmental record for monitoring extremes. Scientific Data, 2, 150066. https://doi.org/10.1038/sdata.2015.66',
  },
  lst_modis: {
    summary: 'Temperatura diurna da superfície terrestre, solo e vegetação, estimada pelo MODIS do satélite Terra perto das 10h30, um mapa por ano de 2001 a 2024.',
    cautions: [
      'Não é a temperatura do ar.',
      'Em 2023 e 2024 a passagem adiantou para cerca de 10h e 9h45, o que pede cautela ao comparar anos.',
    ],
    period: '2001-2024',
    resolution: '1 km',
    source: 'NASA MODIS, MOD11A2 v6.1',
    method: 'Média anual das composições de 8 dias.',
    license: CC0,
    citation: 'Wan, Z., Hook, S., & Hulley, G. (2021). MODIS/Terra Land Surface Temperature/Emissivity 8-Day L3 Global 1km SIN Grid V061. NASA Land Processes Distributed Active Archive Center. https://doi.org/10.5067/MODIS/MOD11A2.061',
  },

  altitude_fabdem: {
    summary: 'Altitude do terreno, em metros, do FABDEM, que parte do Copernicus GLO-30 e remove árvores e edificações por aprendizado de máquina, aproximando a superfície do solo.',
    cautions: [FABDEM_LICENCA],
    resolution: '30 m',
    source: 'FABDEM v1.2 (Hawker et al., 2022)',
    license: CC_BY_NC_SA,
    citation: FABDEM_CITACAO,
  },
  declividade_fabdem: {
    summary: 'Inclinação do terreno, em porcentagem, calculada a partir do FABDEM.',
    cautions: [FABDEM_LICENCA],
    resolution: '30 m',
    source: 'FABDEM v1.2 (Hawker et al., 2022)',
    license: CC_BY_NC_SA,
    citation: FABDEM_CITACAO,
  },
  hillshade_fabdem: {
    summary: 'Relevo sombreado do FABDEM, com iluminação simulada vinda do noroeste (azimute de 315°) a 45° de altura, sem exagero vertical e sem valor físico.',
    cautions: [FABDEM_LICENCA],
    resolution: '30 m',
    source: 'FABDEM v1.2 (Hawker et al., 2022)',
    license: CC_BY_NC_SA,
    citation: FABDEM_CITACAO,
  },
  sombreado_terreno: {
    summary: 'Relevo sombreado do Copernicus GLO-30, modelo de superfície obtido pela missão TanDEM-X entre 2011 e 2015, que inclui a altura da vegetação e das edificações, sem valor físico.',
    resolution: '30 m',
    source: 'Copernicus DEM GLO-30, via Mapterhorn',
    license: { label: 'Licença Copernicus', url: 'https://github.com/mapterhorn/mapterhorn/blob/main/source-catalog/glo30/LICENSE.pdf' },
    citation: 'Copernicus DEM GLO-30, ' + COPERNICUS_DEM + ' Acessado via Mapterhorn.',
  },
}
