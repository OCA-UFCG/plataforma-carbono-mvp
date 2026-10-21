import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reduce: vi.fn(),
  initGee: vi.fn(async () => {}),
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: 'test-user' })),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: mocks.initGee, getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/choroplethCompute', () => ({ reduceChoropleth: mocks.reduce }))
vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))

import { POST } from '@/app/api/gee/choropleth/route'

function request(body: unknown) {
  return new Request('http://localhost/api/gee/choropleth', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/gee/choropleth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const response = await POST(request({ layerId: 'estoque_carbono', recorteId: 'municipios' }))

    expect(response.status).toBe(401)
    expect(mocks.reduce).not.toHaveBeenCalled()
  })

  it.each([
    ['a categorical layer', { layerId: 'lulc_mapbiomas', recorteId: 'municipios' }],
    ['a relief layer', { layerId: 'sombreado_terreno', recorteId: 'municipios' }],
    ['a rendering-only layer', { layerId: 'hillshade_fabdem', recorteId: 'municipios' }],
    ['an unknown layer', { layerId: 'nao-existe', recorteId: 'municipios' }],
    ['the biome', { layerId: 'estoque_carbono', recorteId: 'bioma' }],
    ['a territory', { layerId: 'estoque_carbono', recorteId: 'terras_indigenas' }],
    ['a recorte id that is not text', { layerId: 'estoque_carbono', recorteId: 7 }],
  ])('rejects %s with 400', async (_, body) => {
    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect(mocks.reduce).not.toHaveBeenCalled()
  })

  it('answers the values, then serves them again from the cache without Earth Engine', async () => {
    mocks.reduce.mockResolvedValueOnce([[10, 40]])
    const body = { layerId: 'estoque_carbono', recorteId: 'municipios' }

    const first = await POST(request(body))
    const second = await POST(request(body))

    expect(first.status).toBe(200)
    await expect(first.json()).resolves.toEqual({ keys: ['static'], values: [[10, 40]], range: { min: 10, max: 40 } })
    expect(second.status).toBe(200)
    expect(mocks.reduce).toHaveBeenCalledOnce()
    expect(mocks.initGee).toHaveBeenCalledOnce()
  })

  it('answers 503 when Earth Engine cannot be reached', async () => {
    mocks.initGee.mockRejectedValueOnce(new Error('no credentials'))

    const response = await POST(request({ layerId: 'gpp_modis', recorteId: 'municipios' }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Earth Engine unavailable' })
  })

  it('answers a generic 500 when the reduction fails', async () => {
    mocks.reduce.mockRejectedValueOnce(new Error('ee.evaluate timed out after 65000ms'))

    const response = await POST(request({ layerId: 'gfw_netflux', recorteId: 'municipios' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to process Earth Engine request' })
  })
})
