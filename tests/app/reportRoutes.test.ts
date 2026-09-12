import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: 'u' })),
  rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  buildReportAnalysis: vi.fn(async () => ({ layerId: 'solo_carbono', status: 'available' })),
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))
vi.mock('@/lib/mapa/rateLimit', () => ({
  rateLimit: mocks.rateLimit,
  clientIp: () => '127.0.0.1',
}))
vi.mock('@/lib/mapa/reportService', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/reportService')>(),
  buildReportAnalysis: mocks.buildReportAnalysis,
}))

import { GET as getBase } from '@/app/api/mapa/relatorio/base/route'
import { GET as getAnalise } from '@/app/api/mapa/relatorio/analise/route'
import { GET as getFeicoes } from '@/app/api/mapa/relatorio/feicoes/route'

function req(path: string, query: Record<string, string>) {
  const url = new URL(`http://localhost${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return new Request(url)
}

const baseQuery = {
  recorte: 'municipios', feicao: 'campina-grande', ano: '2023',
  // Sent reversed relative to curated order (estoque_carbono: 10, solo_carbono: 20),
  // so the assertion below actually proves the route/service sorts them.
  camadas: 'solo_carbono,estoque_carbono',
}
const analiseQuery = {
  recorte: 'municipios', feicao: 'campina-grande', ano: '2023', camada: 'solo_carbono',
}

describe('GET /api/mapa/relatorio/base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  })

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const res = await getBase(req('/api/mapa/relatorio/base', baseQuery))

    expect(res.status).toBe(401)
  })

  it('returns 429 when the rate limit is spent', async () => {
    mocks.rateLimit.mockReturnValueOnce({ ok: false, retryAfter: 30 })

    const res = await getBase(req('/api/mapa/relatorio/base', baseQuery))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('returns the shell for a valid request', async () => {
    const res = await getBase(req('/api/mapa/relatorio/base', baseQuery))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      schemaVersion: 1,
      recorte: { featureName: 'Campina Grande' },
      analyses: [{ layerId: 'estoque_carbono' }, { layerId: 'solo_carbono' }],
    })
  })

  it('rejects malformed parameters with 400', async () => {
    const cases: Record<string, string>[] = [
      { ...baseQuery, ano: '23' },
      { ...baseQuery, ano: 'dois-mil' },
      { ...baseQuery, recorte: 'muni cipios' },
      { ...baseQuery, camadas: '' },
      { ...baseQuery, camadas: Array.from({ length: 9 }, (_, i) => `c${i}`).join(',') },
    ]

    for (const query of cases) {
      const res = await getBase(req('/api/mapa/relatorio/base', query))
      expect(res.status).toBe(400)
    }
  })

  it('rejects a layer outside the curated set with 400', async () => {
    const res = await getBase(req('/api/mapa/relatorio/base', {
      ...baseQuery, camadas: 'estoque_c_agb',
    }))

    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown recorte or feature', async () => {
    for (const query of [
      { ...baseQuery, recorte: 'nao-existe' },
      { ...baseQuery, feicao: 'nao-existe' },
    ]) {
      const res = await getBase(req('/api/mapa/relatorio/base', query))
      expect(res.status).toBe(404)
    }
  })
})

describe('GET /api/mapa/relatorio/analise', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  })

  it('requires an authenticated session before doing any work', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const res = await getAnalise(req('/api/mapa/relatorio/analise', analiseQuery))

    expect(res.status).toBe(401)
    expect(mocks.buildReportAnalysis).not.toHaveBeenCalled()
  })

  it('returns the measured analysis', async () => {
    const res = await getAnalise(req('/api/mapa/relatorio/analise', analiseQuery))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ layerId: 'solo_carbono' })
  })

  it('answers 200 for an unavailable analysis, so one failure does not sink the document', async () => {
    mocks.buildReportAnalysis.mockResolvedValueOnce({
      layerId: 'solo_carbono', status: 'unavailable',
    } as never)

    const res = await getAnalise(req('/api/mapa/relatorio/analise', analiseQuery))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: 'unavailable' })
  })

  it('rejects a missing or malformed camada with 400', async () => {
    for (const query of [
      { recorte: 'municipios', feicao: 'campina-grande', ano: '2023' },
      { ...analiseQuery, camada: 'solo carbono' },
    ]) {
      const res = await getAnalise(req('/api/mapa/relatorio/analise', query))
      expect(res.status).toBe(400)
      expect(mocks.buildReportAnalysis).not.toHaveBeenCalled()
    }
  })
})

describe('GET /api/mapa/relatorio/feicoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  })

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const res = await getFeicoes(req('/api/mapa/relatorio/feicoes', { recorte: 'estados' }))

    expect(res.status).toBe(401)
  })

  it('lists the features of a recorte', async () => {
    const res = await getFeicoes(req('/api/mapa/relatorio/feicoes', { recorte: 'estados' }))

    expect(res.status).toBe(200)
    const body = await res.json() as { feicoes: { id: string; name: string }[] }
    expect(body.feicoes).toEqual(expect.arrayContaining([{ id: 'pb', name: 'PB' }]))
  })

  it('returns 404 for an unknown recorte', async () => {
    const res = await getFeicoes(req('/api/mapa/relatorio/feicoes', { recorte: 'nao-existe' }))

    expect(res.status).toBe(404)
  })
})
