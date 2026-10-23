import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prewarm: vi.fn(async () => ({ ok: 0, failed: 0 })),
}))

vi.mock('@/lib/mapa/choroplethPrewarm', () => ({
  prewarmChoropleths: mocks.prewarm,
}))

import { register } from '@/instrumentation'

describe('register', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('warms the map by feature when the production Node server starts', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('NODE_ENV', 'production')

    await register()

    expect(mocks.prewarm).toHaveBeenCalledOnce()
  })

  it('stays out of development, the edge runtime, and a server that opts out', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('NODE_ENV', 'development')
    await register()

    vi.stubEnv('NEXT_RUNTIME', 'edge')
    vi.stubEnv('NODE_ENV', 'production')
    await register()

    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.stubEnv('CHOROPLETH_PREWARM', 'false')
    await register()

    expect(mocks.prewarm).not.toHaveBeenCalled()
  })
})
