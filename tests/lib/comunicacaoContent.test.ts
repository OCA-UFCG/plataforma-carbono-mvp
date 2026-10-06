import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CADERNO,
  DEFAULT_CARTILHAS,
  DEFAULT_FOTOS_FORMACAO,
  DESCRICAO_CARTILHA,
  findPublicacao,
  formatPublicationDate,
  getComunicacaoContent,
  listPublicacoes,
  relatedPublicacoes,
} from '@/lib/content/comunicacao'

describe('getComunicacaoContent without Contentful', () => {
  it('serves the content the landing page ships with and never touches the network', async () => {
    const content = await getComunicacaoContent(null)

    expect(content.cartilhas).toHaveLength(1)
    expect(content.cartilhas[0]).toEqual({
      slug: 'cartilha-1-o-que-e-credito-de-carbono',
      volume: 'Volume 1',
      title: 'Mercado de carbono: o que isso tem a ver com a Caatinga?',
      cover: '/images/cartilhas/vol1.jpg',
    })
    expect(content.caderno.title).toContain('A aproximação do mercado de carbono florestal')
    expect(content.caderno.cover).toBe('/images/cartilhas/caderno.jpg')
    expect(content.fotosFormacao).toHaveLength(6)
    expect(content.fotosFormacao[0]).toEqual({
      src: '/images/formacao/f1.jpg',
      caption: 'Encontro em assentamento da reforma agrária',
      alt: 'Grupo de participantes reunido diante da sede de um assentamento',
    })
  })
})

const PUBLISHED = {
  cartilhaCollection: {
    items: [
      {
        volume: 'Volume 5',
        title: 'Certificação participativa',
        cover: { url: 'https://images.ctfassets.net/vol5.jpg' },
        pdf: { url: 'https://assets.ctfassets.net/vol5.pdf' },
      },
    ],
  },
  cadernoCollection: {
    items: [
      {
        title: 'Caderno 2027',
        description: 'Segunda edição do caderno temático.',
        cover: { url: 'https://images.ctfassets.net/caderno2027.jpg' },
        pdf: null,
      },
    ],
  },
  fotoFormacaoCollection: {
    items: [
      {
        caption: 'Oficina em Sumé',
        alt: 'Participantes em roda durante oficina',
        photo: { url: 'https://images.ctfassets.net/sume.jpg' },
      },
    ],
  },
}

function clientReturning(payload: unknown, queries: string[] = []) {
  return (async (query: string) => {
    queries.push(query)
    return payload
  }) as <T>(query: string) => Promise<T>
}

describe('getComunicacaoContent with published entries', () => {
  it('maps the entries onto the shape the page renders', async () => {
    const content = await getComunicacaoContent(clientReturning(PUBLISHED))

    expect(content.cartilhas).toEqual([
      {
        volume: 'Volume 5',
        title: 'Certificação participativa',
        cover: 'https://images.ctfassets.net/vol5.jpg',
        pdf: 'https://assets.ctfassets.net/vol5.pdf',
      },
    ])
    expect(content.caderno).toEqual({
      title: 'Caderno 2027',
      description: 'Segunda edição do caderno temático.',
      cover: 'https://images.ctfassets.net/caderno2027.jpg',
    })
    expect(content.fotosFormacao).toEqual([
      {
        src: 'https://images.ctfassets.net/sume.jpg',
        caption: 'Oficina em Sumé',
        alt: 'Participantes em roda durante oficina',
      },
    ])
  })

  it('asks for the collections in the order the editor arranged', async () => {
    const queries: string[] = []
    await getComunicacaoContent(clientReturning(PUBLISHED, queries))

    expect(queries).toHaveLength(1)
    expect(queries[0]).toContain('cartilhaCollection(order: order_ASC')
    expect(queries[0]).toContain('fotoFormacaoCollection(order: order_ASC')
  })
})

describe('getComunicacaoContent when Contentful disappoints', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to the shipped content when the request fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = (async () => {
      throw new Error('Contentful request failed with status 500')
    }) as <T>(query: string) => Promise<T>

    const content = await getComunicacaoContent(failing)

    expect(content.cartilhas).toEqual(DEFAULT_CARTILHAS)
    expect(content.caderno).toEqual(DEFAULT_CADERNO)
    expect(content.fotosFormacao).toEqual(DEFAULT_FOTOS_FORMACAO)
    expect(error).toHaveBeenCalledOnce()
  })

  it('falls back per section while a section has nothing published', async () => {
    const content = await getComunicacaoContent(
      clientReturning({
        cartilhaCollection: { items: [] },
        cadernoCollection: { items: [] },
        fotoFormacaoCollection: PUBLISHED.fotoFormacaoCollection,
      }),
    )

    expect(content.cartilhas).toEqual(DEFAULT_CARTILHAS)
    expect(content.caderno).toEqual(DEFAULT_CADERNO)
    expect(content.fotosFormacao).toHaveLength(1)
  })

  it('skips an entry missing its image instead of rendering it broken', async () => {
    const content = await getComunicacaoContent(
      clientReturning({
        cartilhaCollection: {
          items: [
            { volume: 'Volume 5', title: 'Sem capa', cover: null, pdf: null },
            ...PUBLISHED.cartilhaCollection.items,
          ],
        },
        cadernoCollection: PUBLISHED.cadernoCollection,
        fotoFormacaoCollection: {
          items: [
            { caption: 'Sem foto', alt: 'Sem foto', photo: { url: null } },
            ...PUBLISHED.fotoFormacaoCollection.items,
          ],
        },
      }),
    )

    expect(content.cartilhas.map((c) => c.volume)).toEqual(['Volume 5'])
    expect(content.cartilhas[0].cover).toBe('https://images.ctfassets.net/vol5.jpg')
    expect(content.fotosFormacao.map((f) => f.caption)).toEqual(['Oficina em Sumé'])
  })
})

describe('listPublicacoes', () => {
  const caderno = { title: 'Caderno', description: 'Resumo', cover: '/c.jpg', pdf: 'https://x/c.pdf' }
  const cartilhas = [
    { volume: 'Volume 1', title: 'Um', cover: '/1.jpg', pdf: 'https://x/1.pdf' },
    { volume: 'Volume 2', title: 'Dois', cover: '/2.jpg' },
  ]

  it('lists the caderno first, then every cartilha in the order the editor set', () => {
    const lista = listPublicacoes({ caderno, cartilhas, fotosFormacao: [] })
    expect(lista.map((p) => [p.tipo, p.title])).toEqual([
      ['Caderno temático', 'Caderno'],
      ['Cartilha', 'Um'],
      ['Cartilha', 'Dois'],
    ])
  })

  it('carries the PDF only when the entry has one', () => {
    const lista = listPublicacoes({ caderno, cartilhas, fotosFormacao: [] })
    expect(lista.map((p) => p.pdf)).toEqual(['https://x/c.pdf', 'https://x/1.pdf', undefined])
  })

  it('gives every publication a distinct key', () => {
    const lista = listPublicacoes({ caderno, cartilhas, fotosFormacao: [] })
    expect(new Set(lista.map((p) => p.key)).size).toBe(lista.length)
  })

  it('lists the shipped publications when Contentful is not configured', async () => {
    const lista = listPublicacoes(await getComunicacaoContent(null))
    expect(lista).toHaveLength(1 + DEFAULT_CARTILHAS.length)
    expect(lista.every((p) => p.pdf === undefined)).toBe(true)
  })
})

const WITH_PUBLICATION_FIELDS = {
  cartilhaCollection: {
    items: [
      {
        slug: 'cartilha-5-certificacao',
        volume: 'Volume 5',
        title: 'Certificação participativa',
        description: 'Uma cartilha sobre certificação.',
        publicationDate: '2025-05-14T00:00:00.000Z',
        cover: { url: 'https://images.ctfassets.net/vol5.jpg' },
        pdf: { url: 'https://assets.ctfassets.net/vol5.pdf', fileName: 'cartilha-5.pdf' },
      },
      {
        slug: null,
        volume: 'Volume 6',
        title: 'Sem endereço ainda',
        description: null,
        publicationDate: null,
        cover: { url: 'https://images.ctfassets.net/vol6.jpg' },
        pdf: null,
      },
    ],
  },
  cadernoCollection: {
    items: [
      {
        slug: 'caderno-2027',
        title: 'Caderno 2027',
        description: 'Segunda edição do caderno temático.',
        publicationDate: null,
        cover: { url: 'https://images.ctfassets.net/caderno2027.jpg' },
        pdf: null,
      },
    ],
  },
  fotoFormacaoCollection: PUBLISHED.fotoFormacaoCollection,
}

describe('publication fields', () => {
  it('maps the address, the date, the description and the file name', async () => {
    const content = await getComunicacaoContent(clientReturning(WITH_PUBLICATION_FIELDS))

    expect(content.cartilhas[0]).toEqual({
      slug: 'cartilha-5-certificacao',
      volume: 'Volume 5',
      title: 'Certificação participativa',
      description: 'Uma cartilha sobre certificação.',
      publicationDate: '2025-05-14T00:00:00.000Z',
      cover: 'https://images.ctfassets.net/vol5.jpg',
      pdf: 'https://assets.ctfassets.net/vol5.pdf',
      pdfFileName: 'cartilha-5.pdf',
    })
    expect(content.caderno.slug).toBe('caderno-2027')
    expect(content.caderno.publicationDate).toBeUndefined()
  })

  it('keeps an entry without an address listed, with no slug', async () => {
    const content = await getComunicacaoContent(clientReturning(WITH_PUBLICATION_FIELDS))

    expect(content.cartilhas.map((c) => c.volume)).toEqual(['Volume 5', 'Volume 6'])
    expect(content.cartilhas[1].slug).toBeUndefined()
  })

  it('selects the new fields in the query', async () => {
    const queries: string[] = []
    await getComunicacaoContent(clientReturning(WITH_PUBLICATION_FIELDS, queries))

    expect(queries[0]).toContain('slug')
    expect(queries[0]).toContain('publicationDate')
    expect(queries[0]).toContain('pdf { url fileName }')
  })
})

describe('listPublicacoes publication fields', () => {
  it('gives a cartilha without a description the series copy', () => {
    const lista = listPublicacoes({
      caderno: { title: 'Caderno', description: 'Resumo', cover: '/c.jpg' },
      cartilhas: [{ volume: 'Volume 1', title: 'Um', cover: '/1.jpg' }],
      fotosFormacao: [],
    })

    expect(lista.map((p) => p.description)).toEqual(['Resumo', DESCRICAO_CARTILHA])
  })

  it('ships a unique address for every default publication', async () => {
    const lista = listPublicacoes(await getComunicacaoContent(null))
    const slugs = lista.map((p) => p.slug)

    expect(slugs.every(Boolean)).toBe(true)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('ships addresses an editor could type under the provisioned rule', async () => {
    const lista = listPublicacoes(await getComunicacaoContent(null))

    for (const p of lista) expect(p.slug, p.title).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })
})

describe('findPublicacao', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const conteudo = {
    caderno: { slug: 'caderno', title: 'Caderno', description: 'Resumo', cover: '/c.jpg' },
    cartilhas: [
      { slug: 'um', volume: 'Volume 1', title: 'Um', cover: '/1.jpg' },
      { slug: 'dois', volume: 'Volume 2', title: 'Dois', cover: '/2.jpg' },
    ],
    fotosFormacao: [],
  }

  it('finds a publication by its address', () => {
    expect(findPublicacao(conteudo, 'dois')?.title).toBe('Dois')
  })

  it('returns null for an unknown address', () => {
    expect(findPublicacao(conteudo, 'tres')).toBeNull()
  })

  it('takes the first of two publications sharing an address, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clash = { ...conteudo, cartilhas: [{ ...conteudo.cartilhas[0], slug: 'caderno' }] }

    expect(findPublicacao(clash, 'caderno')?.tipo).toBe('Caderno temático')
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('relatedPublicacoes', () => {
  const cartilhas = Array.from({ length: 6 }, (_, i) => ({
    slug: `c${i + 1}`,
    volume: `Volume ${i + 1}`,
    title: `Cartilha ${i + 1}`,
    cover: `/${i + 1}.jpg`,
  }))
  const conteudo = {
    caderno: { slug: 'caderno', title: 'Caderno', description: 'Resumo', cover: '/c.jpg' },
    cartilhas,
    fotosFormacao: [],
  }

  it('lists the other publications in list order', () => {
    const small = { ...conteudo, cartilhas: cartilhas.slice(0, 2) }
    expect(relatedPublicacoes(small, 'c1').map((p) => p.slug)).toEqual(['caderno', 'c2'])
  })

  it('stops at five', () => {
    expect(relatedPublicacoes(conteudo, 'caderno').map((p) => p.slug)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5'])
  })
})

describe('formatPublicationDate', () => {
  it('prints a date as the design does', () => {
    expect(formatPublicationDate('2025-05-14')).toBe('14/05/25')
  })

  it('keeps the calendar day of a midnight-UTC value', () => {
    expect(formatPublicationDate('2025-05-14T00:00:00.000Z')).toBe('14/05/25')
  })

  it('keeps the day an editor wrote with an offset', () => {
    expect(formatPublicationDate('2025-05-14T23:00:00-03:00')).toBe('14/05/25')
  })

  it('omits a missing or malformed value', () => {
    expect(formatPublicationDate(undefined)).toBeNull()
    expect(formatPublicationDate('')).toBeNull()
    expect(formatPublicationDate('banana')).toBeNull()
    expect(formatPublicationDate('2025-13-40')).toBeNull()
  })
})
