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
import { GET as getUnidade } from '@/app/api/mapa/emissoes/unidade/route'
import emissoesJson from '@/config/emissoes/emissoes.json'
import { anosDe } from '@/lib/emissoes/series'
import type { EmissoesCamadaPayload, EmissoesFile, EmissoesUnidadePayload } from '@/types/emissoes'

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

describe('GET /api/mapa/emissoes/unidade', () => {
  const reqU = (q: string) => new Request(`http://localhost/api/mapa/emissoes/unidade?${q}`)

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'u' })
    mocks.rateLimit.mockReturnValue({ ok: true, retryAfter: 0 })
  })

  it('requires an authenticated session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)
    expect((await getUnidade(reqU('nivel=municipios&chave=2504009'))).status).toBe(401)
  })

  it('checks the key against its level and answers 404 for a unit outside the file', async () => {
    expect((await getUnidade(reqU('nivel=municipios&chave=PB'))).status).toBe(400)
    expect((await getUnidade(reqU('nivel=estados&chave=2504009'))).status).toBe(400)
    expect((await getUnidade(reqU('nivel=territorios&chave=x'))).status).toBe(400)
    expect((await getUnidade(reqU('nivel=municipios&chave=9999999'))).status).toBe(404)
  })

  it('answers a municipality with its series and its rank', async () => {
    const res = await getUnidade(reqU('nivel=municipios&chave=2504009'))
    expect(res.status).toBe(200)
    const body = await res.json() as EmissoesUnidadePayload
    expect(body.anos.seeg).toEqual(anosDe(data.fontes.seeg.anos))
    expect(body.posicao?.de).toBe(1095)
    expect(body.posicao?.seeg).toHaveLength(body.anos.seeg.length)
    expect(body.ct.usoDaTerra.saldos).toHaveLength(body.anos.ct.length)
  })
})
