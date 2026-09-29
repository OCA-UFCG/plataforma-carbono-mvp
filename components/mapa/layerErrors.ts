import { localizeAnalysisError } from '@/lib/mapa/analysisRunner'
import type { MapaText } from '@/lib/mapa/text'

/**
 * Start of the error MapView stores when a WFS viewport request fails. The store
 * keeps Portuguese text (a message outlives a language switch), so the panels
 * recognise this prefix and rebuild the message in the current language.
 */
export const WFS_ERROR_PREFIX = 'Falha ao carregar WFS: '

/**
 * A stored layer or card error in the current language. The errors this app
 * writes itself are translated; anything else (a message that came back from an
 * API route, a network error) is shown as it is.
 */
export function localizeLayerError(message: string, tx: MapaText): string {
  if (message.startsWith(WFS_ERROR_PREFIX)) {
    return tx.t('MapaUiLayerErrors.wfs', { message: message.slice(WFS_ERROR_PREFIX.length) })
  }
  return localizeAnalysisError(message, tx) ?? message
}
