import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CADERNO,
  DEFAULT_CARTILHAS,
  DEFAULT_FOTOS_FORMACAO,
  getComunicacaoContent,
  listPublicacoes,
} from '@/lib/content/comunicacao'

describe('getComunicacaoContent without Contentful', () => {
  it('serves the content the landing page ships with and never touches the network', async () => {
    const content = await getComunicacaoContent(null)

    expect(content.cartilhas).toHaveLength(4)
    expect(content.cartilhas[0]).toEqual({
      volume: 'Volume 1',
      title: 'O que é crédito de carbono?',
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
