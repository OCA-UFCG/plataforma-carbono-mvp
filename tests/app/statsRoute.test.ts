import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildEeImage: vi.fn(() => ({})),
  buildStockReport: vi.fn(async () => ({ totalTc: 12, areaHa: 1, unit: 't C', pools: [], classes: [] })),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({
  initGee: vi.fn(async () => {}),
  getEe: vi.fn(() => ({ Image: vi.fn(() => ({})), Geometry: vi.fn(() => ({})) })),
}))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(), buildEeImage: mocks.buildEeImage,
}))
vi.mock('@/lib/mapa/stockReport', () => ({ buildStockReport: mocks.buildStockReport }))

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

  it('returns a stock report only for the matching configured asset', async () => {
    const response = await POST(request({ asset, geometry, layerId: 'estoque_carbono' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ kind: 'stocks', report: { totalTc: 12 } })
    expect(mocks.buildStockReport).toHaveBeenCalledOnce()
  })

  it('rejects a stock layer id paired with a different allowed asset band', async () => {
    const response = await POST(request({
      asset: { ...asset, band: 'b2' }, geometry, layerId: 'estoque_carbono',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'layerId does not match the asset' })
    expect(mocks.buildStockReport).not.toHaveBeenCalled()
  })
})
