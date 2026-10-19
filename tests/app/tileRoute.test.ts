import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getMap: vi.fn((_vis: unknown, done: (result: unknown, err?: unknown) => void) =>
    done({ urlFormat: 'https://earthengine.googleapis.com/v1/tiles/{z}/{x}/{y}' })),
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => null),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: vi.fn(async () => {}), getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: vi.fn(() => ({ getMap: mocks.getMap })),
}))
// Every case reaches Earth Engine: a cached URL would skip the part under test.
vi.mock('@/lib/mapa/tileCache', () => ({ getTileCache: () => null, setTileCache: () => {} }))
vi.mock('@/lib/mapa/rateLimit', () => ({ rateLimit: () => ({ ok: true, retryAfter: 0 }), clientIp: () => '127.0.0.1' }))
vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))

import { POST } from '@/app/api/gee/tile/route'
import appConfig from '@/config/mapa/layers.json'
import { themeRaster } from '@/lib/territorios/mapStyle'
import type { RasterLayerConfig } from '@/types/mapa'

function request(body: unknown) {
  return new Request('http://localhost/api/gee/tile', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

// A layer of the platform that the story does not draw.
const agb = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === 'estoque_c_agb')!
const platformRequest = { asset: agb.gee!.asset, visParams: agb.gee!.visParams }

describe('POST /api/gee/tile session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue(null)
  })

  it('serves the story map to a visitor without a session, without checking for one', async () => {
    const response = await POST(request(themeRaster('chuva').request))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toHaveProperty('tileUrl')
    expect(mocks.getAuthenticatedRequest).not.toHaveBeenCalled()
  })

  it('refuses any other raster to a visitor without a session', async () => {
    for (const body of [platformRequest, { ...themeRaster('chuva').request, clipId: 'bioma' }]) {
      const response = await POST(request(body))
      expect(response.status).toBe(401)
    }
    expect(mocks.getMap).not.toHaveBeenCalled()
  })

  it('serves any allowed raster with a session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })

    const response = await POST(request(platformRequest))

    expect(response.status).toBe(200)
    expect(mocks.getMap).toHaveBeenCalledOnce()
  })
})
