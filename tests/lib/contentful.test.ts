import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createContentfulClient,
  getContentfulClient,
  isContentfulConfigured,
  readContentfulConfig,
} from '@/lib/contentful'

const DELIVERY_ENV = {
  CONTENTFUL_SPACE_ID: 'sp4c3',
  CONTENTFUL_ACCESS_TOKEN: 'delivery-token',
}

describe('readContentfulConfig', () => {
  it('returns null when the space id or the delivery token is missing', () => {
    expect(readContentfulConfig({})).toBeNull()
    expect(readContentfulConfig({ CONTENTFUL_SPACE_ID: 'sp4c3' })).toBeNull()
    expect(readContentfulConfig({ CONTENTFUL_ACCESS_TOKEN: 'delivery-token' })).toBeNull()
  })

  it('targets the master environment of the space by default', () => {
    expect(readContentfulConfig(DELIVERY_ENV)).toEqual({
      endpoint: 'https://graphql.contentful.com/content/v1/spaces/sp4c3/environments/master',
      accessToken: 'delivery-token',
      preview: false,
      revalidate: 3600,
    })
  })

  it('targets the environment named in the configuration', () => {
    const config = readContentfulConfig({ ...DELIVERY_ENV, CONTENTFUL_ENVIRONMENT: 'staging' })

    expect(config?.endpoint).toBe(
      'https://graphql.contentful.com/content/v1/spaces/sp4c3/environments/staging',
    )
  })

  it('uses the preview token and a shorter revalidation when preview is on', () => {
    expect(
      readContentfulConfig({
        ...DELIVERY_ENV,
        CONTENTFUL_PREVIEW: 'true',
        CONTENTFUL_PREVIEW_TOKEN: 'preview-token',
      }),
    ).toMatchObject({ accessToken: 'preview-token', preview: true, revalidate: 60 })
  })

  it('returns null when preview is on without a preview token', () => {
    expect(readContentfulConfig({ ...DELIVERY_ENV, CONTENTFUL_PREVIEW: 'true' })).toBeNull()
  })
})

describe('isContentfulConfigured', () => {
  it('answers whether the environment carries usable credentials', () => {
    expect(isContentfulConfigured(DELIVERY_ENV)).toBe(true)
    expect(isContentfulConfigured({})).toBe(false)
  })
})

describe('createContentfulClient', () => {
  const CONFIG = {
    endpoint: 'https://graphql.contentful.com/content/v1/spaces/sp4c3/environments/master',
    accessToken: 'delivery-token',
    preview: false,
    revalidate: 3600,
  }

  function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
    return {
      ok: init?.ok ?? true,
      status: init?.status ?? 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response
  }

  it('posts the query to the space endpoint and returns the data', async () => {
    const calls: Array<[string, RequestInit]> = []
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push([url, init])
      return jsonResponse({ data: { cartilhaCollection: { items: [] } } })
    }) as unknown as typeof fetch

    const getContent = createContentfulClient(CONFIG, fetcher)
    const data = await getContent('query { cartilhaCollection { items { titulo } } }')

    expect(data).toEqual({ cartilhaCollection: { items: [] } })
    expect(calls).toHaveLength(1)

    const [url, init] = calls[0]
    expect(url).toBe(CONFIG.endpoint)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer delivery-token',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(init.body))).toEqual({
      query: 'query { cartilhaCollection { items { titulo } } }',
      variables: { preview: false },
    })
  })

  it('sends the caller variables along with the preview flag and the revalidation window', async () => {
    let init: RequestInit | undefined
    const fetcher = (async (_url: string, received: RequestInit) => {
      init = received
      return jsonResponse({ data: {} })
    }) as unknown as typeof fetch

    const getContent = createContentfulClient({ ...CONFIG, preview: true, revalidate: 60 }, fetcher)
    await getContent('query { x }', { limit: 4 })

    expect(JSON.parse(String(init?.body)).variables).toEqual({ limit: 4, preview: true })
    expect(init).toMatchObject({ next: { revalidate: 60 } })
  })
})

describe('createContentfulClient error handling', () => {
  const CONFIG = {
    endpoint: 'https://graphql.contentful.com/content/v1/spaces/sp4c3/environments/master',
    accessToken: 'super-secret-token',
    preview: false,
    revalidate: 3600,
  }

  function clientReturning(body: unknown, init?: { ok?: boolean; status?: number }) {
    const fetcher = (async () =>
      ({
        ok: init?.ok ?? true,
        status: init?.status ?? 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      }) as Response) as unknown as typeof fetch

    return createContentfulClient(CONFIG, fetcher)
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects an HTTP failure without repeating the access token', async () => {
    const getContent = clientReturning({ message: 'nope' }, { ok: false, status: 401 })

    await expect(getContent('query { x }')).rejects.toThrow(/401/)
    await expect(getContent('query { x }')).rejects.not.toThrow(/super-secret-token/)
  })

  it('rejects a fatal GraphQL error without repeating the access token', async () => {
    const getContent = clientReturning({
      errors: [{ message: 'Unknown field "titulo"' }],
    })

    await expect(getContent('query { x }')).rejects.toThrow(/Unknown field/)
    await expect(getContent('query { x }')).rejects.not.toThrow(/super-secret-token/)
  })

  it('rejects a response that carries neither data nor errors', async () => {
    const getContent = clientReturning({})

    await expect(getContent('query { x }')).rejects.toThrow()
  })

  it('keeps the partial data when a reference points to an unpublished entry', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const getContent = clientReturning({
      data: { cartilhaCollection: { items: [{ titulo: 'Volume 1' }] } },
      errors: [
        {
          message: 'Cannot resolve link',
          extensions: {
            contentful: {
              code: 'UNRESOLVABLE_LINK',
              requestId: 'req-1',
              details: { field: 'capa', linkId: 'asset-1' },
            },
          },
        },
      ],
    })

    await expect(getContent('query { x }')).resolves.toEqual({
      cartilhaCollection: { items: [{ titulo: 'Volume 1' }] },
    })
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0][0])).toContain('UNRESOLVABLE_LINK')
  })
})

describe('getContentfulClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('has no client to offer when the environment carries no credentials', () => {
    expect(getContentfulClient({})).toBeNull()
  })

  it('reads the process environment by default', () => {
    expect(getContentfulClient()).toBeNull()

    vi.stubEnv('CONTENTFUL_SPACE_ID', 'sp4c3')
    vi.stubEnv('CONTENTFUL_ACCESS_TOKEN', 'delivery-token')

    expect(getContentfulClient()).toBeTypeOf('function')
  })
})
