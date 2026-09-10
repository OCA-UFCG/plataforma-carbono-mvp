import { describe, expect, it } from 'vitest'
import { CONTENT_TYPES } from '@/scripts/contentful-provision.mjs'
import { COMUNICACAO_QUERY } from '@/lib/content/comunicacao'

// The GraphQL API rejects a query naming a field the content model does not
// have, and the failure only shows up against a real space. These tests keep the
// model and the query from drifting apart.
const COLLECTIONS = {
  cartilhaCollection: 'cartilha',
  cadernoCollection: 'caderno',
  fotoFormacaoCollection: 'fotoFormacao',
}

function itemsBlock(query: string, collection: string): string {
  const opening = query.indexOf('items {', query.indexOf(`${collection}(`))
  let depth = 0

  for (let i = opening + 'items '.length; i < query.length; i += 1) {
    if (query[i] === '{') depth += 1
    if (query[i] === '}') {
      depth -= 1
      if (depth === 0) return query.slice(opening, i)
    }
  }

  throw new Error(`no items block for ${collection}`)
}

function selectedFields(query: string, collection: string): string[] {
  return [...itemsBlock(query, collection).matchAll(/^\s{8}(\w+)/gm)].map((match) => match[1])
}

function fieldIds(contentTypeId: string): string[] {
  const contentType = CONTENT_TYPES.find((candidate) => candidate.id === contentTypeId)

  if (!contentType) throw new Error(`no content type ${contentTypeId}`)

  return contentType.fields.map((field) => field.id)
}

describe('the provisioned content model', () => {
  it('carries every field the comunicacao query selects', () => {
    for (const [collection, contentTypeId] of Object.entries(COLLECTIONS)) {
      const selected = selectedFields(COMUNICACAO_QUERY, collection)

      expect(selected.length).toBeGreaterThan(0)
      expect(fieldIds(contentTypeId)).toEqual(expect.arrayContaining(selected))
    }
  })

  it('gives the editor an order field wherever the query sorts by it', () => {
    for (const collection of Object.keys(COLLECTIONS)) {
      if (!COMUNICACAO_QUERY.includes(`${collection}(order: order_ASC`)) continue

      expect(fieldIds(COLLECTIONS[collection as keyof typeof COLLECTIONS])).toContain('order')
    }
  })
})
