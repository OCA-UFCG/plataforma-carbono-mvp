import type { Locale } from './config'

// Messages live in translations/<locale>/<Namespace>.json, one file per
// namespace, where the file name equals the file's single top-level key. They
// are loaded with static import()s rather than fs reads: the app ships as
// output:'standalone', where files outside the traced bundle are not on disk.
//
// Registering a namespace means adding it to NAMESPACES; the import path is
// derived from it. tests/i18n/messages.test.ts fails if a JSON file exists
// that is not listed here, or the locales drift apart.
export const NAMESPACES = [
  'Comunicacao',
  'ComunicacaoPage',
  'ComunicacaoPageMetadata',
  'ComunicacaoPagePublicacoes',
  'ComunicacaoPagePublicationCard',
  'Destaques',
  'Ferramenta',
  'Hero',
  'Login',
  'LoginMetadata',
  'MapaAnalysis',
  'MapaBasemaps',
  'MapaCoordinates',
  'MapaExport',
  'MapaGroups',
  'MapaLayers',
  'MapaOvCoordinateForm',
  'MapaOvDrawToolbar',
  'MapaOvFloatingLegend',
  'MapaOvMapControls',
  'MapaOvReportForm',
  'MapaOvResults',
  'MapaOvSearchBar',
  'MapaOvTemporalSlider',
  'MapaPhenology',
  'MapaReport',
  'MapaResults',
  'MapaUiHeader',
  'MapaUiInfoCard',
  'MapaUiLayerErrors',
  'MapaUiLayerResultCard',
  'MapaUiMapView',
  'MapaUiMapa',
  'MapaUiMetadata',
  'MapaUiPage',
  'MapaUiResultsSidebar',
  'MapaUiSidebar',
  'MapaUiStatsCards',
  'MapaUiStatsChart',
  'MapaUiStockReport',
  'MapaUiWelcome',
  'Metadata',
  'MoreLink',
  'Plataforma',
  'RelatorioClient',
  'RelatorioDocument',
  'RelatorioMapPreview',
  'RelatorioMetadata',
  'RelatorioSection',
  'SiteFooter',
  'SiteHeader',
  'SobreCaatingaPage',
  'SobreCarbonoComunidadesPage',
  'SobreComoFuncionaPage',
  'SobreIntro',
  'SobreMetadata',
  'SobrePlataformaPage',
  'SobreSubnav',
  'TerritoriosCharts',
  'TerritoriosChooser',
  'TerritoriosIntro',
  'TerritoriosMap',
  'TerritoriosMetadata',
  'TerritoriosRail',
  'TerritoriosStory',
  'TerritoriosTypes',
  'TerritoriosUi',
] as const

async function loadNamespace(locale: Locale, namespace: string): Promise<Record<string, unknown>> {
  return (await import(`./${locale}/${namespace}.json`)).default
}

export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  const files = await Promise.all(NAMESPACES.map((ns) => loadNamespace(locale, ns)))
  return Object.assign({}, ...files)
}
