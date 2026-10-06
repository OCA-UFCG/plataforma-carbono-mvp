import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ThemeResponse } from '@/types/territorios'

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getTheme: vi.fn<() => Promise<ThemeResponse>>(),
}))

vi.mock('@/lib/mapa/rateLimit', () => ({
  rateLimit: mocks.rateLimit,
  clientIp: () => '127.0.0.1',
}))
vi.mock('@/lib/territorios/themeService', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/territorios/themeService')>(),
  getTheme: mocks.getTheme,
}))

import { GET as getTema } from '@/app/api/territorios/tema/route'
import { GET as getTerritorio } from '@/app/api/territorios/territorio/route'
import { TerritoryNotFoundError } from '@/lib/territorios/themeService'
import { listFeicoes } from '@/lib/mapa/recorteRegistry'

function req(path: string, query: Record<string, string>) {
  const url = new URL(`http://localhost${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return new Request(url)
}

const territorioQuery = { recorte: 'municipios', feicao: 'campina-grande' }
const temaQuery = { ...territorioQuery, tema: 'chuva' }

function themeResponse(status: ThemeResponse['status']): ThemeResponse {
  return {
    recorteId: 'municipios', featureId: 'campina-grande', theme: 'chuva',
    status, origin: status === 'unavailable' ? null : 'zonal', coarseScaleM: null, data: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  mocks.getTheme.mockResolvedValue(themeResponse('available'))
})

describe('GET /api/territorios/territorio', () => {
  // The story is public. No request here carries a session cookie, so every
  // case below is also a visitor's.
  it('answers a visitor without a session, under the rate limit', async () => {
    const res = await getTerritorio(req('/api/territorios/territorio', territorioQuery))

    expect(res.status).toBe(200)
    expect(mocks.rateLimit).toHaveBeenCalledOnce()
  })

  it('returns 429 with Retry-After when the rate limit is spent', async () => {
    mocks.rateLimit.mockReturnValueOnce({ ok: false, retryAfter: 30 })

    const res = await getTerritorio(req('/api/territorios/territorio', territorioQuery))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('resolves the territory with the biome area and the precomputed biome references', async () => {
    const res = await getTerritorio(req('/api/territorios/territorio', territorioQuery))

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=86400')
    const body = await res.json()
    expect(body).toMatchObject({
      recorteId: 'municipios', recorteName: 'Municípios',
      featureId: 'campina-grande', featureName: 'Campina Grande', context: 'PB',
    })
    expect(body.biomaAreaHa).toBeGreaterThan(body.areaHa)
    expect(body.biome.stockTotalTc).toBeGreaterThan(0)
    expect(body.biome.fireBurnedSharePct).toBeGreaterThan(0)
    expect(body.biome.fireBurnedSharePct).toBeLessThan(100)
    // Every comparison of the story has its Caatinga value in the payload.
    for (const key of ['stockDensityTcHa', 'forestSharePct', 'rainMeanMm']) expect(body.biome[key], key).toBeGreaterThan(0)
    expect(body.biome.fluxPerForestHaMg).toBeLessThan(0)
    expect(Object.keys(body.biome.nativeSharePct)).toEqual(['1985', '2024'])
    expect(Object.keys(body.biome.fireRecurrenceSharesPct)).toEqual(['never', 'once', 'twoToFour', 'fivePlus'])
    expect(body.biome.fireAnnualMeanSharePct).toBeGreaterThan(0)
    // Its place by area among the municipalities, as the territory tab prints it.
    expect(body.areaRank.total).toBe(listFeicoes('municipios').length)
    expect(body.areaRank.position).toBeGreaterThanOrEqual(1)
    expect(body.areaRank.position).toBeLessThanOrEqual(body.areaRank.total)
  })

  it('rejects malformed parameters with 400', async () => {
    for (const query of [
      { ...territorioQuery, recorte: 'muni cipios' },
      { ...territorioQuery, feicao: 'Campina_Grande' },
      { recorte: 'municipios' },
    ]) {
      const res = await getTerritorio(req('/api/territorios/territorio', query))
      expect(res.status).toBe(400)
    }
  })

  it('returns 404 for an unknown feature and for a recorte outside the enabled types', async () => {
    for (const query of [
      { ...territorioQuery, feicao: 'nao-existe' },
      { recorte: 'estoque_carbono', feicao: 'campina-grande' },
    ]) {
      const res = await getTerritorio(req('/api/territorios/territorio', query))
      expect(res.status).toBe(404)
    }
  })
})

describe('GET /api/territorios/tema', () => {
  it('answers a visitor without a session, under the rate limit', async () => {
    const res = await getTema(req('/api/territorios/tema', temaQuery))

    expect(res.status).toBe(200)
    expect(mocks.rateLimit).toHaveBeenCalledOnce()
    expect(mocks.getTheme).toHaveBeenCalledOnce()
  })

  it('returns 429 with Retry-After when the rate limit is spent', async () => {
    mocks.rateLimit.mockReturnValueOnce({ ok: false, retryAfter: 12 })

    const res = await getTema(req('/api/territorios/tema', temaQuery))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('12')
    expect(mocks.getTheme).not.toHaveBeenCalled()
  })

  it('rejects a bad tema or a malformed recorte or feature with 400', async () => {
    for (const query of [
      { ...temaQuery, tema: 'precipitacao' },
      { ...territorioQuery },
      { ...temaQuery, recorte: '../bioma' },
      { ...temaQuery, feicao: 'campina grande' },
    ]) {
      const res = await getTema(req('/api/territorios/tema', query))
      expect(res.status).toBe(400)
    }
    expect(mocks.getTheme).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown feature', async () => {
    mocks.getTheme.mockRejectedValueOnce(new TerritoryNotFoundError('Feature not found.'))

    const res = await getTema(req('/api/territorios/tema', { ...temaQuery, feicao: 'nao-existe' }))

    expect(res.status).toBe(404)
  })

  it('lets the browser keep available and no_pixels answers but never an unavailable one', async () => {
    const available = await getTema(req('/api/territorios/tema', temaQuery))
    expect(available.headers.get('Cache-Control')).toBe('private, max-age=1800')

    mocks.getTheme.mockResolvedValueOnce(themeResponse('no_pixels'))
    const noPixels = await getTema(req('/api/territorios/tema', temaQuery))
    expect(noPixels.status).toBe(200)
    expect(noPixels.headers.get('Cache-Control')).toBe('private, max-age=1800')

    mocks.getTheme.mockResolvedValueOnce(themeResponse('unavailable'))
    const unavailable = await getTema(req('/api/territorios/tema', temaQuery))
    expect(unavailable.status).toBe(200)
    expect(unavailable.headers.get('Cache-Control')).toBe('no-store')
    await expect(unavailable.json()).resolves.toMatchObject({ status: 'unavailable', data: null })
  })

  it('answers a generic 500 without the internal message', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getTheme.mockRejectedValueOnce(new Error('ENOENT C:/secrets/key.json'))

    const res = await getTema(req('/api/territorios/tema', temaQuery))

    expect(res.status).toBe(500)
    expect(await res.text()).not.toContain('key.json')
    spy.mockRestore()
  })
})
