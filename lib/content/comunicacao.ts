import 'server-only'

// Content of the "Comunicação" and "Formação cidadã" sections of the landing
// page. Editors publish it in Contentful; the values below are what the page
// shipped with and stay the fallback, so the page renders complete without any
// Contentful credential — which is also how the CI build runs.

export type Cartilha = {
  volume: string
  title: string
  cover: string
  pdf?: string
}

export type Caderno = {
  title: string
  description: string
  cover: string
  pdf?: string
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
    volume: 'Volume 1',
    title: 'O que é crédito de carbono?',
    cover: '/images/cartilhas/vol1.jpg',
  },
  {
    volume: 'Volume 2',
    title: 'Como funciona o mercado de carbono?',
    cover: '/images/cartilhas/vol2.jpg',
  },
  {
    volume: 'Volume 3',
    title: 'A Caatinga e o carbono: qual a relação?',
    cover: '/images/cartilhas/vol3.jpg',
  },
  {
    volume: 'Volume 4',
    title: 'Desafios e caminhos para um mercado de carbono que beneficia a todos',
    cover: '/images/cartilhas/vol4.jpg',
  },
]

export const DEFAULT_CADERNO: Caderno = {
  title:
    'A aproximação do mercado de carbono florestal no bioma Caatinga: desafios, ameaças e perspectivas',
  description:
    'Reúne o que a ciência revela, o que a legislação estabelece e o que está em jogo para a Caatinga, em cinco seções que norteiam cidadãos, gestores públicos, organizações e investidores antes de se posicionarem no debate.',
  cover: '/images/cartilhas/caderno.jpg',
}

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

type ContentfulAsset = { url?: string | null } | null

type ContentfulEntries = {
  cartilhaCollection?: {
    items: Array<{
      volume?: string | null
      title?: string | null
      cover?: ContentfulAsset
      pdf?: ContentfulAsset
    } | null>
  } | null
  cadernoCollection?: {
    items: Array<{
      title?: string | null
      description?: string | null
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
        volume
        title
        cover { url }
        pdf { url }
      }
    }
    cadernoCollection(limit: 1, preview: $preview) {
      items {
        title
        description
        cover { url }
        pdf { url }
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

function mapCartilhas(entries: ContentfulEntries): Cartilha[] {
  return (entries.cartilhaCollection?.items ?? []).flatMap((item) => {
    const cover = assetUrl(item?.cover)

    if (!item?.volume || !item.title || !cover) return []

    return [{ volume: item.volume, title: item.title, cover, pdf: assetUrl(item.pdf) }]
  })
}

function mapCaderno(entries: ContentfulEntries): Caderno | null {
  const item = (entries.cadernoCollection?.items ?? [])[0]
  const cover = assetUrl(item?.cover)

  if (!item?.title || !item.description || !cover) return null

  return { title: item.title, description: item.description, cover, pdf: assetUrl(item.pdf) }
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

// One card of the Comunicação page's publication grid (Figma 18978:2074).
export type Publicacao = {
  key: string
  tipo: 'Caderno temático' | 'Cartilha'
  title: string
  cover: string
  pdf?: string
}

// Every publication, for the Comunicação page: the caderno first, as the
// landing's section shows it, then the cartilhas in the order the editor set
// in Contentful (COMUNICACAO_QUERY sorts by `order`). The design's own grid is
// five placeholder cards; the order is still an open question to the content
// owner (issue #44, question 4).
export function listPublicacoes(conteudo: ComunicacaoContent): Publicacao[] {
  const { caderno, cartilhas } = conteudo

  return [
    { key: 'caderno', tipo: 'Caderno temático', title: caderno.title, cover: caderno.cover, pdf: caderno.pdf },
    ...cartilhas.map((c, i): Publicacao => ({
      key: `cartilha-${i}`,
      tipo: 'Cartilha',
      title: c.title,
      cover: c.cover,
      pdf: c.pdf,
    })),
  ]
}
