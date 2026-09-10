import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getContentfulClient, isContentfulConfigured } from '@/lib/contentful'
import { getComunicacaoContent } from '@/lib/content/comunicacao'

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
})
