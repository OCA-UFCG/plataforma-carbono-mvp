import { afterEach, describe, expect, it, vi } from 'vitest'
import { BANNERS_QUERY, DEFAULT_BANNERS, getBanners } from '@/lib/content/banners'
import type { ContentfulVariables } from '@/lib/contentful'
import { MAPA_LINK, TERRITORIOS_LINK } from '@/lib/marketing/nav'

type Call = { query: string; variables?: unknown }

function clientReturning(payload: unknown, calls: Call[] = []) {
  return (async (query: string, variables?: unknown) => {
    calls.push({ query, variables })
    return payload
  }) as <T>(query: string, variables?: ContentfulVariables) => Promise<T>
}

const COMPLETE = {
  title: 'T',
  text: 'X',
  buttonLabel: 'Ver',
  buttonLink: '/sobre',
  photo: { url: 'https://images.ctfassets.net/s/a/b/foto.jpg' },
  credit: null,
}

function published(...items: unknown[]) {
  return { bannerInicioCollection: { items } }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getBanners', () => {
  it('serves the four shipped banners without Contentful', async () => {
    const banners = await getBanners(null)

    expect(banners).toBe(DEFAULT_BANNERS)
    expect(banners.map((b) => b.photo)).toEqual([
      '/images/hero/hero2.jpg',
      '/images/hero/hero3.jpg',
      '/images/hero/hero1.jpg',
      '/images/hero/hero4.jpg',
    ])
    expect(banners.map((b) => b.action?.href)).toEqual(['/sobre', '/comunicacao', TERRITORIOS_LINK.href, MAPA_LINK.href])
    expect(banners.map((b) => b.credit)).toEqual(Array(4).fill('Artur Lourenço'))
    expect(banners[0].title).toBe('Dados abertos e mapas para entender o carbono na Caatinga')
  })

  it('maps a published banner, sizing its photo', async () => {
    const calls: Call[] = []

    expect(await getBanners(clientReturning(published(COMPLETE), calls))).toEqual([
      {
        title: 'T',
        text: 'X',
        photo: 'https://images.ctfassets.net/s/a/b/foto.jpg?w=1920&q=75&fm=jpg&fl=progressive',
        credit: undefined,
        action: { href: '/sobre', label: 'Ver' },
      },
    ])
    expect(calls.map((c) => c.query)).toEqual([BANNERS_QUERY])
    expect(BANNERS_QUERY).toContain('bannerInicioCollection(order: order_ASC')
  })

  it('shows a banner without a button when the button is half filled or its link is refused', async () => {
    const halves = [
      { ...COMPLETE, buttonLink: null },
      { ...COMPLETE, buttonLabel: '  ' },
      { ...COMPLETE, buttonLink: 'www.site.org' },
    ]

    const banners = await getBanners(clientReturning(published(...halves)))

    expect(banners).toHaveLength(3)
    expect(banners.map((b) => b.action)).toEqual([undefined, undefined, undefined])
  })

  // An unpublished photo comes back as null, with an UNRESOLVABLE_LINK error
  // that lib/contentful.ts logs and lets through.
  it('drops a banner missing its title, text or photo', async () => {
    const incomplete = ['title', 'text', 'photo'].map((field) => ({ ...COMPLETE, [field]: null }))

    const banners = await getBanners(clientReturning(published(...incomplete, null, { ...COMPLETE, title: 'Inteiro' })))

    expect(banners.map((b) => b.title)).toEqual(['Inteiro'])
  })

  it('falls back to the shipped four when nothing usable is published', async () => {
    expect(await getBanners(clientReturning(published()))).toBe(DEFAULT_BANNERS)
    expect(await getBanners(clientReturning({}))).toBe(DEFAULT_BANNERS)
    expect(await getBanners(clientReturning(published({ ...COMPLETE, photo: null })))).toBe(DEFAULT_BANNERS)
  })

  // A space not yet provisioned with `bannerInicio` answers with an error;
  // only the hero falls back.
  it('falls back to the shipped four when the request fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = (async () => {
      throw new Error('Unknown type "BannerInicioCollection"')
    }) as <T>(query: string) => Promise<T>

    expect(await getBanners(failing)).toBe(DEFAULT_BANNERS)
    expect(error).toHaveBeenCalled()
  })

  // Portuguese is the space's default locale, so only English names one.
  it('asks Contentful for the page’s language', async () => {
    const calls: Call[] = []
    const client = clientReturning(published(COMPLETE), calls)

    await getBanners(client, 'pt')
    await getBanners(client, 'en')

    expect(calls.map((c) => c.variables)).toEqual([undefined, { locale: 'en-US' }])
  })
})
