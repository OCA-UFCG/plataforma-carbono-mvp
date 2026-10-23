import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  reduce: vi.fn(),
  initGee: vi.fn(async () => {}),
}))

vi.mock('@/lib/mapa/geeAuth', () => ({ initGee: mocks.initGee, getEe: vi.fn(() => ({})) }))
vi.mock('@/lib/mapa/choroplethCompute', () => ({ reduceChoropleth: mocks.reduce }))

import { choroplethPrewarmJobs, prewarmChoropleths } from '@/lib/mapa/choroplethPrewarm'
import { cachedChoropleth } from '@/lib/mapa/choroplethService'
import { choroplethKey } from '@/lib/mapa/choropleth'

const quiet = { info: vi.fn(), error: vi.fn() }

describe('choroplethPrewarmJobs', () => {
  it('lists every continuous layer of the panel by every recorte, Municípios first', () => {
    const jobs = choroplethPrewarmJobs()
    const ids = jobs.map((j) => `${j.layer.id}|${j.recorteId}`)

    expect(ids).toContain('estoque_carbono|municipios')
    expect(ids).toContain('estoque_carbono|estados')
    expect(ids).toContain('chirps_precip|municipios')
    // Municípios, the slow and the finest one, is warmed before any state.
    expect(jobs.findIndex((j) => j.recorteId === 'estados'))
      .toBeGreaterThan(jobs.map((j) => j.recorteId).lastIndexOf('municipios'))
  })

  it('leaves out what the panel cannot draw by feature', () => {
    const layers = new Set(choroplethPrewarmJobs().map((j) => j.layer.id))

    expect(layers.has('lulc_mapbiomas')).toBe(false)     // categorical
    expect(layers.has('sombreado_terreno')).toBe(false)  // relief, no GEE
    expect(layers.has('hillshade_fabdem')).toBe(false)   // a rendering
    expect(layers.has('biomassa_spawn')).toBe(false)     // hidden from the panel
  })
})

describe('prewarmChoropleths', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fills the cache the route reads, one job at a time', async () => {
    let running = 0
    let overlapped = false
    mocks.reduce.mockImplementation(async () => {
      running++
      if (running > 1) overlapped = true
      await new Promise((r) => setTimeout(r, 1))
      running--
      return [[1, 2]]
    })
    const jobs = choroplethPrewarmJobs().slice(0, 3)

    const outcome = await prewarmChoropleths(jobs, quiet)

    expect(outcome).toEqual({ ok: 3, failed: 0 })
    expect(overlapped).toBe(false)
    for (const job of jobs) {
      expect(cachedChoropleth(choroplethKey(job.layer.id, job.recorteId))).toMatchObject({ range: { min: 1, max: 2 } })
    }
  })

  it('goes on after a failed layer', async () => {
    const jobs = choroplethPrewarmJobs().slice(3, 5)
    mocks.reduce.mockRejectedValueOnce(new Error('timed out')).mockResolvedValueOnce([[1, 2]])

    await expect(prewarmChoropleths(jobs, quiet)).resolves.toEqual({ ok: 1, failed: 1 })
    expect(quiet.error).toHaveBeenCalled()
  })

  it('does nothing when Earth Engine cannot be reached', async () => {
    mocks.initGee.mockRejectedValueOnce(new Error('no credentials'))

    await expect(prewarmChoropleths(choroplethPrewarmJobs().slice(5, 7), quiet)).resolves.toEqual({ ok: 0, failed: 0 })
    expect(mocks.reduce).not.toHaveBeenCalled()
  })
})
