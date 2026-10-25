import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequest: vi.fn<() => Promise<{ uid: string } | null>>(async () => ({ uid: 'u' })),
  rateLimit: vi.fn(() => ({ ok: true, retryAfter: 0 })),
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

import { GET } from '@/app/api/mapa/emissoes/route'
import emissoesJson from '@/config/emissoes/emissoes.json'
import { anosDe } from '@/lib/emissoes/series'
import type { EmissoesCamadaPayload, EmissoesFile } from '@/types/emissoes'

const data = emissoesJson as unknown as EmissoesFile

const req = (camada: string) => new Request(`http://localhost/api/mapa/emissoes?camada=${encodeURIComponent(camada)}`)

describe('GET /api/mapa/emissoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  })

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)
    expect((await GET(req('emissoes_uso_brutas_seeg'))).status).toBe(401)
  })

  it('returns 429 when the rate limit is spent', async () => {
    mocks.rateLimit.mockReturnValueOnce({ ok: false, retryAfter: 30 })
    const res = await GET(req('emissoes_uso_brutas_seeg'))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('rejects a malformed id and answers 404 for a layer that is not an emissions one', async () => {
    expect((await GET(req('../emissoes'))).status).toBe(400)
    expect((await GET(req('estoque_carbono'))).status).toBe(404)
  })

  it('answers a layer with its years, classes and the three levels', async () => {
    const res = await GET(req('emissoes_total_brutas_seeg'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('private, no-cache')
    const body = await res.json() as EmissoesCamadaPayload
    expect(body.anos).toEqual(anosDe(data.fontes.seeg.anos))
    expect(body.unidade).toBe('t CO2e/ha')
    expect(Object.keys(body.valores.municipios)).toHaveLength(1095)
    expect(body.valores.bioma.bioma).toHaveLength(body.anos.length)
  })
})
