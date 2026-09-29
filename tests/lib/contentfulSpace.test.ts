import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getContentfulClient, isContentfulConfigured } from '@/lib/contentful'
import {
  DEFAULT_CADERNO,
  DEFAULT_CARTILHAS,
  getComunicacaoContent,
  listPublicacoes,
} from '@/lib/content/comunicacao'

// Smoke test against the real space: it is the only check that catches the
// content model drifting away from the query, which the GraphQL API only reports
// against live data. Next.js loads .env.local by itself; vitest does not.
function loadEnvLocal(): void {
  let text: string

  try {
    text = readFileSync('.env.local', 'utf-8')
  } catch {
    return
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (match) process.env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, '')
  }
}

loadEnvLocal()

// The publications as the space serves them. The shipped fallback already has
// addresses, so a failed read would pass the address checks without testing
// anything: remote covers prove the list came from Contentful.
async function livePublicacoes() {
  const lista = listPublicacoes(await getComunicacaoContent(getContentfulClient()))

  expect(lista.map((p) => p.cover).filter((cover) => !cover.startsWith('https://images.ctfassets.net/')), 'not from Contentful').toEqual([])

  return lista
}

// Skipped wherever there are no credentials, which is how the CI build runs.
describe.skipIf(!isContentfulConfigured(process.env))('the configured Contentful space', () => {
  it('serves the comunicacao content through the application code', async () => {
    const content = await getComunicacaoContent(getContentfulClient())

    expect(content.cartilhas.map((cartilha) => cartilha.volume)).toEqual([
      'Volume 1',
      'Volume 2',
      'Volume 3',
      'Volume 4',
    ])
    expect(content.caderno.title).toContain('A aproximação do mercado de carbono florestal')
    expect(content.fotosFormacao).toHaveLength(6)
    expect(content.fotosFormacao[0].caption).toBe('Encontro em assentamento da reforma agrária')

    // Remote urls, not the /images/... defaults: proof this is not the fallback.
    for (const cartilha of content.cartilhas) {
      expect(cartilha.cover).toMatch(/^https:\/\/images\.ctfassets\.net\//)
    }
  })

  it('gives every publication an address, unique across cartilha and caderno', async () => {
    const lista = await livePublicacoes()
    const semEndereco = lista.filter((p) => !p.slug).map((p) => p.title)

    expect(semEndereco, 'publications without an address').toEqual([])
    expect(new Set(lista.map((p) => p.slug)).size).toBe(lista.length)
  })

  // During a Contentful outage the pages fall back to the shipped content; a
  // link shared from the CMS's address must still resolve then.
  it('keeps the shipped addresses, so a link survives the fallback', async () => {
    const lista = await livePublicacoes()
    const enderecos = new Set(lista.map((p) => p.slug))
    const shipped = [DEFAULT_CADERNO.slug, ...DEFAULT_CARTILHAS.map((c) => c.slug)]

    expect(shipped.filter((slug) => !enderecos.has(slug)), 'shipped addresses missing from the CMS').toEqual([])
  })
})
