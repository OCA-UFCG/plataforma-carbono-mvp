import 'server-only'

// The "Eventos e articulações" tab of the Comunicação page (Figma 19254:16041):
// the meetings, visits and partnerships the observatory takes part in, newest
// first. Editors publish them in Contentful as `evento` entries; the two below
// are the design's own and stay the fallback, so the tab renders complete
// without any Contentful credential, which is also how the CI build runs.
//
// They are read by a query of their own rather than as part of
// COMUNICACAO_QUERY: the GraphQL API rejects a whole query that names a content
// type the space lacks, so a space not yet provisioned with `evento` would
// otherwise also lose its published cartilhas to the fallback.

// `date` is Contentful's ISO string for a Date field. `local` is where it took
// place, "Online" included; `caption` credits and describes the photo, under
// the text.
export type Evento = {
  categoria: string
  title: string
  date: string
  local?: string
  description: string
  photo: string
  photoAlt: string
  caption?: string
}

// Figma 19254:16515 and 19254:16536, the two events the design repeats down
// the tab. The alt texts describe what each photo shows, since the design has
// none.
export const DEFAULT_EVENTOS: Evento[] = [
  {
    categoria: 'Internacional',
    title: 'Encontro Brasil e Tunísia',
    date: '2026-09-17',
    local: 'Museu Interativo do Semiárido, UFCG',
    description:
      'Em encontro com a delegação tunisiana do Projeto ReGnR – Fortalecimento da Resiliência Climática por meio da Governança dos Recursos Naturais, a Caativar foi apresentada como uma iniciativa voltada à valorização da Caatinga, ao fortalecimento dos territórios e à geração de oportunidades de renda associadas à conservação do bioma. O encontro também promoveu o diálogo sobre experiências e desafios comuns às regiões semiáridas, além de possibilidades de cooperação institucional entre os dois países.',
    photo: '/images/eventos/encontro-brasil-tunisia.jpg',
    photoAlt: 'Plateia sentada em um auditório, com pessoas em pé ao fundo da sala',
    caption: 'Pesquisadores da UFCG com a comissão tunisiana. Fonte: peasa.ufcg.edu.br, 2026',
  },
  {
    categoria: 'Governo',
    title: 'Reunião com o Ministério dos Povos Indígenas',
    date: '2026-09-15',
    local: 'Online',
    description:
      'Como parte das articulações da Caativar, pesquisadores do Observatório da Caatinga e Desertificação da Universidade Federal de Campina Grande (OCA/UFCG) se reuniram com representantes do Ministério dos Povos Indígenas (MPI), por videoconferência, para discutir possibilidades de cooperação. Na agenda foram abordados temas estratégicos para a Caatinga, como mercado de carbono, desertificação, adaptação climática e proteção dos territórios indígenas.',
    photo: '/images/eventos/reuniao-mpi.jpg',
    photoAlt: 'Captura de tela de uma videoconferência com os participantes em mosaico',
    caption:
      'Da esquerda para direita, de cima para baixo: Rute Morais Souza, Diogo Tinoco Castro, Adga Marques/Victor Herbert, Claudionor Vital, Elis do Nascimento Silva, Maria da Conceição Alves Feitosa. Fonte: MPI, 2026.',
  },
]

type GetContent = <T>(query: string) => Promise<T>

type ContentfulAsset = { url?: string | null } | null

type ContentfulEventos = {
  eventoCollection?: {
    items: Array<{
      categoria?: string | null
      title?: string | null
      date?: string | null
      local?: string | null
      description?: string | null
      photo?: ContentfulAsset
      photoAlt?: string | null
      caption?: string | null
    } | null>
  } | null
}

// Sorted by the event's own date, so the newest one leads without the editor
// keeping an order field in step.
export const EVENTOS_QUERY = `
  query($preview: Boolean) {
    eventoCollection(order: date_DESC, preview: $preview) {
      items {
        categoria
        title
        date
        local
        description
        photo { url }
        photoAlt
        caption
      }
    }
  }
`

// Contentful answers an unset field with null; the page types use undefined.
function optional(value?: string | null): string | undefined {
  return value || undefined
}

function mapEventos(entries: ContentfulEventos): Evento[] {
  return (entries.eventoCollection?.items ?? []).flatMap((item) => {
    const photo = item?.photo?.url

    if (
      !item?.categoria ||
      !item.title ||
      !item.date ||
      !item.description ||
      !photo ||
      !item.photoAlt
    ) {
      return []
    }

    return [
      {
        categoria: item.categoria,
        title: item.title,
        date: item.date,
        local: optional(item.local),
        description: item.description,
        photo,
        photoAlt: item.photoAlt,
        caption: optional(item.caption),
      },
    ]
  })
}

export async function getEventos(getContent: GetContent | null): Promise<Evento[]> {
  if (!getContent) return DEFAULT_EVENTOS

  try {
    const eventos = mapEventos(await getContent<ContentfulEventos>(EVENTOS_QUERY))

    // A space with no event published yet still shows the design's two, as
    // the cartilhas fall back when none is published.
    return eventos.length > 0 ? eventos : DEFAULT_EVENTOS
  } catch (error) {
    // A CMS outage cannot take the page down: log it and render what the page
    // ships with.
    console.error('Failed to read the eventos from Contentful:', error)

    return DEFAULT_EVENTOS
  }
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// "17 set 2026" (Figma I19254:16515;19254:16466). The calendar date is read
// off the ISO string rather than through Date, for the reason
// formatPublicationDate (lib/content/comunicacao.ts) gives: midnight UTC
// formatted in the Northeast's UTC-3 would print the day before.
export function formatEventoDate(value?: string | null): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const [, year, month, day] = match
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null

  return `${Number(day)} ${MESES[Number(month) - 1]} ${year}`
}
