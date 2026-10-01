import type { NAMESPACES } from './messages'

export type Namespace = (typeof NAMESPACES)[number]
export type RouteGroup = 'auth' | 'mapa' | 'marketing' | 'relatorio' | 'territorios'

// The namespaces each route group's client components read: the only part of the
// messages its root layout hands to NextIntlClientProvider. Server components
// read the whole set through the request config (translations/request.ts) and
// need none of it in the provider.
//
// Two reasons to keep the lists tight. Every namespace listed is inlined into
// the HTML and RSC payload of every page of the group. And /login is served
// without a session: whatever its list holds, a signed-out visitor can read,
// so it must not carry the copy of the pages behind the login.
//
// tests/i18n/clientNamespaces.test.ts derives each list from the code (the
// modules each group runs in the browser and the namespaces they name) and
// fails when one drifts.
export const CLIENT_NAMESPACES: Record<RouteGroup, readonly Namespace[]> = {
  auth: ['Login'],
  // The whole map runs in the browser (MapLibre needs window), so it reads
  // nearly every Mapa* namespace: the panel, the overlays, and the layer, unit
  // and result text the pure functions of lib/mapa look up through a MapaText.
  mapa: [
    'MapaAnalysis', 'MapaBasemaps', 'MapaCoordinates', 'MapaExport', 'MapaGroups', 'MapaLayers',
    'MapaOvCoordinateForm', 'MapaOvDrawToolbar', 'MapaOvFloatingLegend', 'MapaOvMapControls',
    'MapaOvReportForm', 'MapaOvResults', 'MapaOvSearchBar', 'MapaOvTemporalSlider', 'MapaPhenology',
    'MapaReport', 'MapaResults', 'MapaUiHeader', 'MapaUiInfoCard', 'MapaUiLayerErrors',
    'MapaUiLayerResultCard', 'MapaUiMapView', 'MapaUiMapa', 'MapaUiPage', 'MapaUiResultsSidebar',
    'MapaUiSidebar', 'MapaUiStatsCards', 'MapaUiStatsChart', 'MapaUiStockReport', 'MapaUiWelcome',
  ],
  // The header, the Sobre sub-navigation, Hero, Plataforma and the publication
  // reader; the rest of the marketing pages render on the server.
  marketing: [
    'ComunicacaoConteudoLeitorCarregando', 'ComunicacaoConteudoPdfViewer', 'Hero', 'MoreLink',
    'Plataforma', 'SiteHeader', 'SobreSubnav',
  ],
  relatorio: [
    'MapaBasemaps', 'MapaLayers', 'MapaPhenology', 'MapaResults', 'MapaUiStatsCards',
    'MapaUiStatsChart', 'MapaUiStockReport', 'RelatorioClient', 'RelatorioDocument',
    'RelatorioMapPreview', 'RelatorioSection',
  ],
  territorios: [
    'MapaLayers', 'MapaResults', 'SiteHeader', 'TerritoriosCharts', 'TerritoriosChooser',
    'TerritoriosIntro', 'TerritoriosMap', 'TerritoriosRail', 'TerritoriosStory', 'TerritoriosTypes',
    'TerritoriosUi',
  ],
}

/** The listed namespaces of `messages`, whole. */
export function pickMessages(
  messages: Record<string, unknown>,
  namespaces: readonly Namespace[],
): Record<string, unknown> {
  return Object.fromEntries(namespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]))
}
