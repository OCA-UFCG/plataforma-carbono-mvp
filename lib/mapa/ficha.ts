import { LAYER_META } from '@/config/mapa/layerMeta'
import { LAYER_INFO } from '@/config/mapa/layerInfo'

/**
 * The top of a layer's ficha: the summary paragraph and the period and
 * resolution chips. The ficha (LayerInfoCard) and the platform tour's preview
 * of it both read it here, so the preview never says something the ficha
 * does not.
 */
export function fichaHeadline(layerId: string): { summary: string; chips: string[] } {
  const info = LAYER_INFO[layerId]
  const meta = LAYER_META[layerId]
  const summary = info?.summary ?? (meta ? meta.description[0].toUpperCase() + meta.description.slice(1) + '.' : '')
  const chips = [info?.period, info?.resolution].filter(Boolean) as string[]
  return { summary, chips }
}
