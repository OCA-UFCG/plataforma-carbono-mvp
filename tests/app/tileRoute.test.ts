import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const getMap = vi.fn((_vis: unknown, done: (result: unknown, err?: unknown) => void) =>
    done({ urlFormat: 'https://earthengine.googleapis.com/v1/tiles/{z}/{x}/{y}' }))
  // Each clip hands back the same image, so getMap is reached whichever runs.
  const image: { getMap: typeof getMap; clip: ReturnType<typeof vi.fn>; clipToCollection: ReturnType<typeof vi.fn> } = {
    getMap,
    clip:             vi.fn(() => image),
    clipToCollection: vi.fn(() => image),
  }
  const ee = {
    FeatureCollection: vi.fn((id: string) => ({ id, geometry: vi.fn(() => ({ dissolved: id })) })),
  }
  return {
    getMap, image, ee,
    getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => null),
  }
})

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: vi.fn(async () => {}), getEe: vi.fn(() => mocks.ee) }))
vi.mock('@/lib/mapa/geeImage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mapa/geeImage')>(),
  buildEeImage: vi.fn(() => mocks.image),
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

describe('POST /api/gee/tile clip to the biome', () => {
  const fogo = (appConfig.layers as RasterLayerConfig[]).find((l) => l.id === 'fogo_frequencia')!
  const bioma = appConfig.layers.find((l) => l.id === 'bioma') as { clipAsset: string }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
  })

  // clip(fc.geometry()) draws the same pixels, byte for byte, but a year step of
  // the fire layer took 14.7 s against 1.7 s (medians, docs/tile-clip-performance.md).
  it('clips to the GEE asset with clipToCollection, never through its dissolved geometry', async () => {
    const response = await POST(request({
      asset: fogo.gee!.asset, clipId: 'bioma', temporalDate: '2010-01-01', visParams: fogo.gee!.visParams,
    }))

    expect(response.status).toBe(200)
    expect(mocks.image.clipToCollection).toHaveBeenCalledOnce()
    expect(mocks.image.clipToCollection.mock.calls[0][0]).toMatchObject({ id: bioma.clipAsset })
    expect(mocks.image.clip).not.toHaveBeenCalled()
    expect(mocks.getMap).toHaveBeenCalledOnce()
  })
})
