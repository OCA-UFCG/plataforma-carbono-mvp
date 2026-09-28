// Every string of the screens around the Territórios story: the opening with
// the type cards, the chooser where one territory of a type is picked on the
// map, by location or by name, and the step rail. The story's own strings live
// in storyScript.ts.

import { numero } from '@/lib/mapa/format'
import type { TerritoryTypeId } from '@/types/territorios'

/** "a", "a e b", "a, b e c". */
function listPt(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

export const INTRO = {
  eyebrow: 'Territórios',
  title:   'Que território você quer conhecer?',
  /** Receives the labels of the types not enabled yet, as the cards name them. */
  soon:    (labels: readonly string[]) => `Em breve: ${listPt(labels.map((l) => l.toLowerCase()))}`,
  homeLabel: 'Página inicial da Caativar',
}

export const CHOOSER = {
  backToTypes: 'Voltar',
  mapLabel:    (plural: string) => `Mapa de ${plural}`,
  loading:     'Carregando o mapa',
  loadError:   'Não foi possível carregar o mapa.',
  retry:       'Tentar novamente',

  locate:      'Usar minha localização',
  locating:    'Buscando sua localização',
  locateNote:  'Sua localização não é enviada nem guardada.',
  locateUnsupported: 'Este navegador não oferece localização. Busque pelo nome ou escolha no mapa.',
  locateDenied:      'Sem permissão para usar a localização. Busque pelo nome ou escolha no mapa.',
  locateTimeout:     'A localização demorou a responder. Tente de novo ou escolha no mapa.',
  locateUnavailable: 'Não foi possível obter sua localização. Busque pelo nome ou escolha no mapa.',
  locateImprecise:   'A localização veio imprecisa demais. Busque pelo nome ou escolha no mapa.',
  locateOutside:     'Sua localização fica fora da Caatinga. Busque pelo nome ou escolha no mapa.',
  locateNotCovered:  'Não há território deste tipo na sua localização. Busque pelo nome ou escolha no mapa.',

  /** Lead of the nearest options, per type, for the gender and number of each. */
  nearestLead: {
    terra_indigena:        'Sua localização não fica em nenhuma terra indígena. Estas são as mais próximas:',
    territorio_quilombola: 'Sua localização não fica em nenhum território quilombola. Estes são os mais próximos:',
    assentamento:          'Sua localização não fica em nenhum assentamento. Estes são os mais próximos:',
  } as Partial<Record<TerritoryTypeId, string>>,
  /** Lead of the list when more than one territory contains the location. */
  overlapLead: {
    estado:                'Sua localização fica na divisa entre estes estados:',
    municipio:             'Sua localização fica na divisa entre estes municípios:',
    terra_indigena:        'Sua localização fica em mais de uma terra indígena:',
    territorio_quilombola: 'Sua localização fica em mais de um território quilombola:',
    assentamento:          'Sua localização fica em mais de um assentamento:',
  } as Partial<Record<TerritoryTypeId, string>>,
  distance: (km: number) => km < 0.1
    ? `a menos de ${numero(0.1)} km`
    : `a ${numero(km, km < 10 ? 1 : 0)} km`,

  searchLabel: 'Buscar pelo nome',
  searchCount: (n: number, plural: string) => `${numero(n, 0)} ${plural} com área na Caatinga.`,
  searchEmpty: (q: string) => `Nenhum resultado para "${q}".`,
  searchResults: (n: number) => `${numero(n, 0)} ${n === 1 ? 'resultado' : 'resultados'}`,
  searchToMap: 'Não achou? Escolha no mapa',

  confirmTitle:  'É este território?',
  // The recorte files are clipped to the biome, so the area is only the part
  // inside it; without "na Caatinga" a state's figure would read as its whole
  // area. The biome's own detail leaves it out.
  confirmDetail: (unitLabel: string, context: string | undefined, area: string, biome = false) =>
    [unitLabel, context, biome ? area : `${area} na Caatinga`].filter(Boolean).join(', '),
  confirm:       'Sim, conhecer',
  chooseAnother: 'Escolher outro',
}

export const RAIL = {
  homeLabel: INTRO.homeLabel,
  /** Position among the six theme steps; the summary shows its name alone. */
  position:  (n: number, total: number) => `${n} de ${total}`,
}
