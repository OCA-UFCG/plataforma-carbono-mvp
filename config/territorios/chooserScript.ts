// Every string of the screens around the Territórios story: the section's title
// band and the gallery of types, the chooser where one territory of a type is picked on the
// map, by location or by name, and the step rail. The story's own strings live
// in storyScript.ts.

import { numero } from '@/lib/mapa/format'
import type { TerritoryTypeId } from '@/types/territorios'

export const INTRO = {
  eyebrow: 'Territórios',
  title:   'Que território você quer conhecer?',
  explore:   'Explorar',
  changeType: 'Trocar tipo',
  soonBadge: 'Em breve',
  /** One line under the title of each open panel. Counts from public/data/vector/*.geojson. */
  descriptions: {
    bioma:                 'A Caatinga inteira, com 862.626 km² em dez estados.',
    estado:                'Os dez estados com área na Caatinga.',
    municipio:             'Os 1.210 municípios com área na Caatinga.',
    terra_indigena:        'As 50 terras indígenas com área na Caatinga.',
    territorio_quilombola: 'Os 86 territórios quilombolas com área na Caatinga.',
    assentamento:          'Os 1.923 assentamentos da reforma agrária com área na Caatinga.',
    propriedade_rural:     'Imóveis rurais do Cadastro Ambiental Rural.',
    unidade_conservacao:   'Unidades de conservação federais, estaduais e municipais.',
  } satisfies Record<TerritoryTypeId, string>,
}

export const CHOOSER = {
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
  /** Position among the six theme steps; the summary shows its name alone. */
  position:  (n: number, total: number) => `${n} de ${total}`,
}
