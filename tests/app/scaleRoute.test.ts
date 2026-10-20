import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reduce: vi.fn(),
  initGee: vi.fn(async () => {}),
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: 'test-user' })),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: mocks.initGee, getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/recorteScaleCompute', () => ({ reduceRecorteStats: mocks.reduce }))
vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))

import { POST } from '@/app/api/gee/scale/route'

function request(body: unknown) {
  return new Request('http://localhost/api/gee/scale', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

const yearStats = { min: 1, max: 9, p2: 2, p98: 8 }

describe('POST /api/gee/scale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const response = await POST(request({ layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 174 }))

    expect(response.status).toBe(401)
    expect(mocks.reduce).not.toHaveBeenCalled()
  })

  it.each([
    ['a categorical layer', { layerId: 'lulc_mapbiomas', recorteId: 'municipios', feicaoIndex: 174 }],
    ['a dem layer', { layerId: 'sombreado_terreno', recorteId: 'municipios', feicaoIndex: 174 }],
    ['an unknown layer', { layerId: 'nao-existe', recorteId: 'municipios', feicaoIndex: 174 }],
    ['the biome recorte', { layerId: 'estoque_carbono', recorteId: 'bioma', feicaoIndex: 0 }],
    ['a recorte that is not a Território', { layerId: 'estoque_carbono', recorteId: 'areas_monitoramento', feicaoIndex: 0 }],
    ['a position with no feature', { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 99999 }],
    ['a negative position', { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: -1 }],
    ['a fractional position', { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 1.5 }],
    ['a position sent as text', { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: '174' }],
  ])('rejects %s with 400', async (_, body) => {
    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect(mocks.reduce).not.toHaveBeenCalled()
  })

  it('answers the scale, then serves it again from the cache without Earth Engine', async () => {
    mocks.reduce.mockResolvedValueOnce({ static: yearStats })
    const body = { layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 174 }

    const first = await POST(request(body))
    const second = await POST(request(body))

    expect(first.status).toBe(200)
    await expect(first.json()).resolves.toEqual({ stretch: { min: 2, max: 8 }, range: { min: 1, max: 9 } })
    expect(second.status).toBe(200)
    expect(mocks.reduce).toHaveBeenCalledOnce()
    expect(mocks.initGee).toHaveBeenCalledOnce()
  })

  it('answers 503 when Earth Engine cannot be reached', async () => {
    mocks.initGee.mockRejectedValueOnce(new Error('no credentials'))

    const response = await POST(request({ layerId: 'estoque_carbono', recorteId: 'municipios', feicaoIndex: 691 }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Earth Engine unavailable' })
  })

  it('answers a generic 500 when the reduction fails', async () => {
    mocks.reduce.mockRejectedValueOnce(new Error('ee.evaluate timed out after 65000ms'))

    const response = await POST(request({ layerId: 'gfw_netflux', recorteId: 'municipios', feicaoIndex: 174 }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to process Earth Engine request' })
  })
})
