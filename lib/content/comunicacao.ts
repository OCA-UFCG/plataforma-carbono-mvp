import 'server-only'

// Content of the "Comunicação" and "Formação cidadã" sections of the landing
// page. Editors publish it in Contentful; the values below are what the page
// shipped with and stay the fallback, so the page renders complete without any
// Contentful credential — which is also how the CI build runs.

// `slug` is the publication's address, /comunicacao/<slug>; an entry without
// one is listed but has no page. `publicationDate` is Contentful's ISO string
// for a Date field. `pdfFileName` is the asset's own file name, for the
// reader's download.
export type Cartilha = {
  slug?: string
  volume: string
  title: string
  description?: string
  publicationDate?: string
  cover: string
  pdf?: string
  pdfFileName?: string
}

export type Caderno = {
  slug?: string
  title: string
  description: string
  publicationDate?: string
  cover: string
  pdf?: string
  pdfFileName?: string
}

export type FormacaoPhoto = {
  src: string
  caption: string
  alt: string
}

export type ComunicacaoContent = {
  cartilhas: Cartilha[]
  caderno: Caderno
  fotosFormacao: FormacaoPhoto[]
}

export const DEFAULT_CARTILHAS: Cartilha[] = [
  {
    slug: 'cartilha-1-o-que-e-credito-de-carbono',
    volume: 'Volume 1',
    title: 'O que é crédito de carbono?',
    cover: '/images/cartilhas/vol1.jpg',
  },
  {
    slug: 'cartilha-2-como-funciona-o-mercado-de-carbono',
    volume: 'Volume 2',
    title: 'Como funciona o mercado de carbono?',
    cover: '/images/cartilhas/vol2.jpg',
  },
  {
    slug: 'cartilha-3-a-caatinga-e-o-carbono',
    volume: 'Volume 3',
    title: 'A Caatinga e o carbono: qual a relação?',
    cover: '/images/cartilhas/vol3.jpg',
  },
  {
    slug: 'cartilha-4-desafios-e-caminhos',
    volume: 'Volume 4',
    title: 'Desafios e caminhos para um mercado de carbono que beneficia a todos',
    cover: '/images/cartilhas/vol4.jpg',
  },
]

export const DEFAULT_CADERNO: Caderno = {
  slug: 'caderno-mercado-de-carbono-florestal-na-caatinga',
  title:
    'A aproximação do mercado de carbono florestal no bioma Caatinga: desafios, ameaças e perspectivas',
  description:
    'Reúne o que a ciência revela, o que a legislação estabelece e o que está em jogo para a Caatinga, em cinco seções que norteiam cidadãos, gestores públicos, organizações e investidores antes de se posicionarem no debate.',
  cover: '/images/cartilhas/caderno.jpg',
}

// The cartilha series' own copy, from the landing card's hover state (Figma
// 18916:9437). A cartilha whose entry has no description of its own shows
// this; it describes the series rather than any one volume.
export const DESCRICAO_CARTILHA =
  'Uma cartilha introdutória, em linguagem simples, para comunidades e demais interessados em conhecer o tema.'

// The captions describe what is visible in each photo. IMAGENS.md records that
// they are provisional, to be replaced once the events are identified.
export const DEFAULT_FOTOS_FORMACAO: FormacaoPhoto[] = [
  {
    src: '/images/formacao/f1.jpg',
    caption: 'Encontro em assentamento da reforma agrária',
    alt: 'Grupo de participantes reunido diante da sede de um assentamento',
  },
  {
    src: '/images/formacao/f2.jpg',
    caption: 'Apresentação em evento',
    alt: 'Palestra com plateia e projeção de um mapa da América do Sul',
  },
  {
    src: '/images/formacao/f3.jpg',
    caption: 'Oficina de formação',
    alt: 'Pessoa apresentando ao microfone para uma plateia, com projeção ao fundo',
  },
  {
    src: '/images/formacao/f4.jpg',
    caption: 'Roda de diálogo',
    alt: 'Participantes sentados em círculo durante uma roda de conversa',
  },
  {
    src: '/images/formacao/f6.jpg',
    caption: 'Participantes de um encontro de formação',
    alt: 'Foto de grupo dos participantes de um encontro',
  },
  {
    src: '/images/formacao/f7.jpg',
    caption: 'Oficina com a sociedade civil',
    alt: 'Pessoa em pé conduzindo uma atividade com o grupo sentado à mesa',
  },
]

const DEFAULT_CONTENT: ComunicacaoContent = {
  cartilhas: DEFAULT_CARTILHAS,
  caderno: DEFAULT_CADERNO,
  fotosFormacao: DEFAULT_FOTOS_FORMACAO,
}

type GetContent = <T>(query: string) => Promise<T>

type ContentfulAsset = { url?: string | null; fileName?: string | null } | null

type ContentfulEntries = {
  cartilhaCollection?: {
    items: Array<{
      slug?: string | null
      volume?: string | null
      title?: string | null
      description?: string | null
      publicationDate?: string | null
      cover?: ContentfulAsset
      pdf?: ContentfulAsset
    } | null>
  } | null
  cadernoCollection?: {
    items: Array<{
      slug?: string | null
      title?: string | null
      description?: string | null
      publicationDate?: string | null
      cover?: ContentfulAsset
      pdf?: ContentfulAsset
    } | null>
  } | null
  fotoFormacaoCollection?: {
    items: Array<{
      caption?: string | null
      alt?: string | null
      photo?: ContentfulAsset
    } | null>
  } | null
}

// The `order` field exists so the editorial sequence is a decision of whoever
// publishes, not of the entry creation date.
export const COMUNICACAO_QUERY = `
  query($preview: Boolean) {
    cartilhaCollection(order: order_ASC, preview: $preview) {
      items {
        slug
        volume
        title
        description
        publicationDate
        cover { url }
        pdf { url fileName }
      }
    }
    cadernoCollection(limit: 1, preview: $preview) {
      items {
        slug
        title
        description
        publicationDate
        cover { url }
        pdf { url fileName }
      }
    }
    fotoFormacaoCollection(order: order_ASC, preview: $preview) {
      items {
        caption
        alt
        photo { url }
      }
    }
  }
`

function assetUrl(asset?: ContentfulAsset): string | undefined {
  return asset?.url ?? undefined
}

// Contentful answers an unset field with null; the page types use undefined.
function optional(value?: string | null): string | undefined {
  return value || undefined
}

function mapCartilhas(entries: ContentfulEntries): Cartilha[] {
  return (entries.cartilhaCollection?.items ?? []).flatMap((item) => {
    const cover = assetUrl(item?.cover)

    if (!item?.volume || !item.title || !cover) return []

    return [
      {
        slug: optional(item.slug),
        volume: item.volume,
        title: item.title,
        description: optional(item.description),
        publicationDate: optional(item.publicationDate),
        cover,
        pdf: assetUrl(item.pdf),
        pdfFileName: optional(item.pdf?.fileName),
      },
    ]
  })
}

function mapCaderno(entries: ContentfulEntries): Caderno | null {
  const item = (entries.cadernoCollection?.items ?? [])[0]
  const cover = assetUrl(item?.cover)

  if (!item?.title || !item.description || !cover) return null

  return {
    slug: optional(item.slug),
    title: item.title,
    description: item.description,
    publicationDate: optional(item.publicationDate),
    cover,
    pdf: assetUrl(item.pdf),
    pdfFileName: optional(item.pdf?.fileName),
  }
}

function mapFotosFormacao(entries: ContentfulEntries): FormacaoPhoto[] {
  return (entries.fotoFormacaoCollection?.items ?? []).flatMap((item) => {
    const src = assetUrl(item?.photo)

    if (!item?.caption || !item.alt || !src) return []

    return [{ src, caption: item.caption, alt: item.alt }]
  })
}

// The fallback is per section, not for the whole request: a space where only
// the booklets have been published yet must show the published booklets and the
// shipped photos, never an empty section.
function withDefaults(entries: ContentfulEntries): ComunicacaoContent {
  const cartilhas = mapCartilhas(entries)
  const fotosFormacao = mapFotosFormacao(entries)

  return {
    cartilhas: cartilhas.length > 0 ? cartilhas : DEFAULT_CARTILHAS,
    caderno: mapCaderno(entries) ?? DEFAULT_CADERNO,
    fotosFormacao: fotosFormacao.length > 0 ? fotosFormacao : DEFAULT_FOTOS_FORMACAO,
  }
}

export async function getComunicacaoContent(
  getContent: GetContent | null,
): Promise<ComunicacaoContent> {
  if (!getContent) return DEFAULT_CONTENT

  try {
    return withDefaults(await getContent<ContentfulEntries>(COMUNICACAO_QUERY))
  } catch (error) {
    // A CMS outage cannot take the landing page down: log it and render what the
    // page ships with.
    console.error('Failed to read the comunicacao content from Contentful:', error)

    return DEFAULT_CONTENT
  }
}

// One publication, for the Comunicação page's grid (Figma 18978:2074), the
// landing's cards and the publication page (19015:13056).
export type Publicacao = {
  key: string
  slug?: string
  tipo: 'Caderno temático' | 'Cartilha'
  title: string
  description: string
  publicationDate?: string
  cover: string
  pdf?: string
  pdfFileName?: string
}

// Every publication, for the Comunicação page: the caderno first, as the
// landing's section shows it, then the cartilhas in the order the editor set
// in Contentful (COMUNICACAO_QUERY sorts by `order`). The design's own grid is
// five placeholder cards; the order is still an open question to the content
// owner (issue #44, question 4).
export function listPublicacoes(conteudo: ComunicacaoContent): Publicacao[] {
  const { caderno, cartilhas } = conteudo

  return [
    {
      key: 'caderno',
      slug: caderno.slug,
      tipo: 'Caderno temático',
      title: caderno.title,
      description: caderno.description,
      publicationDate: caderno.publicationDate,
      cover: caderno.cover,
      pdf: caderno.pdf,
      pdfFileName: caderno.pdfFileName,
    },
    ...cartilhas.map(
      (c, i): Publicacao => ({
        key: `cartilha-${i}`,
        slug: c.slug,
        tipo: 'Cartilha',
        title: c.title,
        description: c.description ?? DESCRICAO_CARTILHA,
        publicationDate: c.publicationDate,
        cover: c.cover,
        pdf: c.pdf,
        pdfFileName: c.pdfFileName,
      }),
    ),
  ]
}

// The publication a /comunicacao/<slug> page shows. Contentful keeps an
// address unique within one content type only, so a cartilha and the caderno
// could share one: the first in list order wins, and the clash is logged for
// the editor to fix (tests/lib/contentfulSpace.test.ts fails on it too).
export function findPublicacao(conteudo: ComunicacaoContent, slug: string): Publicacao | null {
  const matches = listPublicacoes(conteudo).filter((p) => p.slug === slug)

  if (matches.length > 1) {
    console.warn(
      JSON.stringify({ event: 'comunicacao_duplicate_slug', slug, keys: matches.map((p) => p.key) }),
    )
  }

  return matches[0] ?? null
}

// "Conteúdos Relacionados" (Figma 19015:13091) holds a row of five cards.
export const MAX_RELACIONADOS = 5

// Every other publication, in list order, up to the row's five.
export function relatedPublicacoes(conteudo: ComunicacaoContent, slug: string): Publicacao[] {
  const lista = listPublicacoes(conteudo)
  const atual = lista.find((p) => p.slug === slug)

  return lista.filter((p) => p !== atual).slice(0, MAX_RELACIONADOS)
}

// "Publicado em: 14/05/25" (Figma 19015:13064). Contentful answers a Date field
// as an ISO string, "2025-05-14T00:00:00.000Z" for a date with no time. The
// calendar date is read off the string rather than through Date: formatted in
// the Northeast's UTC-3, midnight UTC would print the day before (the spec's
// "formatted in UTC" guards the same thing), and a value written with its own
// offset keeps the day the editor chose.
export function formatPublicationDate(value?: string | null): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const [, year, month, day] = match
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null

  return `${day}/${month}/${year.slice(2)}`
}
