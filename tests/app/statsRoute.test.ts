import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildEeImage: vi.fn(() => ({})),
  buildStockReport: vi.fn(async () => ({ totalTc: 12, areaHa: 1, unit: 't C', pools: [], classes: [] })),
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: 'test-user' })),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({
  initGee: vi.fn(async () => {}),
  getEe: vi.fn(() => ({ Image: vi.fn(() => ({})), Geometry: vi.fn(() => ({})) })),
}))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(), buildEeImage: mocks.buildEeImage,
}))
vi.mock('@/lib/mapa/stockReport', () => ({ buildStockReport: mocks.buildStockReport }))
vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))

import { POST } from '@/app/api/gee/stats/route'

const asset = {
  type: 'image' as const,
  id: 'projects/ee-arturlourenco/assets/caatinga_estoques', band: 'b1', scale: 100,
}
const geometry = {
  type: 'Polygon' as const,
  coordinates: [[[-40, -8], [-40, -7], [-39, -7], [-40, -8]]],
}

function request(body: unknown) {
  return new Request('http://localhost/api/gee/stats', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/gee/stats stock branch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)

    const response = await POST(request({ asset, geometry, layerId: 'estoque_carbono' }))

    expect(response.status).toBe(401)
    expect(mocks.buildStockReport).not.toHaveBeenCalled()
  })

  it('returns a stock report only for the matching configured asset', async () => {
    const response = await POST(request({ asset, geometry, layerId: 'estoque_carbono' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ kind: 'stocks', report: { totalTc: 12 } })
    expect(mocks.buildStockReport).toHaveBeenCalledOnce()
  })

  // A layer with a result profile is computed from its id alone. The route
  // used to take the asset block from the body and only check it against the
  // layer; now it never reads it, so a transformed or mismatched asset in the
  // body cannot reach Earth Engine at all.
  it('ignores the asset a client sends for a layer with a result profile', async () => {
    const response = await POST(request({
      asset: { ...asset, band: 'b2', multiplier: 1000 }, geometry, layerId: 'estoque_carbono',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ kind: 'stocks', report: { totalTc: 12 } })
    expect(mocks.buildStockReport).toHaveBeenCalledOnce()
    expect(mocks.buildEeImage).not.toHaveBeenCalled()
  })

  it('computes a pool layer from the stock report of its source layer', async () => {
    const response = await POST(request({ geometry, layerId: 'estoque_c_solo' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ kind: 'stocks' })
    expect(mocks.buildStockReport).toHaveBeenCalledOnce()
  })

  it('rejects a year outside the series of a temporal layer', async () => {
    const response = await POST(request({ geometry, layerId: 'lulc_mapbiomas', temporalDate: '1950-01-01' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid temporalDate' })
  })

  it('rejects a malformed date before it can become a band name', async () => {
    const response = await POST(request({ geometry, layerId: 'lulc_mapbiomas', temporalDate: '2024_x' }))

    expect(response.status).toBe(400)
  })
})
