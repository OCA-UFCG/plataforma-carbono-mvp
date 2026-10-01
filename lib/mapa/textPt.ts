// The Portuguese messages behind `PT_TEXT` (lib/mapa/text.ts), the default of
// every text-producing function that is given no MapaText. Loaded by the server
// (lib/mapa/reportService.ts, lib/mapa/textServer.ts) and by the tests
// (tests/setup/portugueseText.ts), never by the browser: a client component
// passes the MapaText of useMapaText(), and the provider already carries this
// text there.

import 'server-only'

import { createMapaText, registerPortugueseText } from '@/lib/mapa/text'

import MapaAnalysisPt from '@/translations/pt/MapaAnalysis.json'
import MapaBasemapsPt from '@/translations/pt/MapaBasemaps.json'
import MapaCoordinatesPt from '@/translations/pt/MapaCoordinates.json'
import MapaExportPt from '@/translations/pt/MapaExport.json'
import MapaGroupsPt from '@/translations/pt/MapaGroups.json'
import MapaLayersPt from '@/translations/pt/MapaLayers.json'
import MapaPhenologyPt from '@/translations/pt/MapaPhenology.json'
import MapaReportPt from '@/translations/pt/MapaReport.json'
import MapaResultsPt from '@/translations/pt/MapaResults.json'

registerPortugueseText(createMapaText('pt', Object.assign(
  {},
  MapaAnalysisPt,
  MapaBasemapsPt,
  MapaCoordinatesPt,
  MapaExportPt,
  MapaGroupsPt,
  MapaLayersPt,
  MapaPhenologyPt,
  MapaReportPt,
  MapaResultsPt,
)))
