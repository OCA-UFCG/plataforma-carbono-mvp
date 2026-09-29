import { describe, expect, it } from 'vitest'
import { CONTENT_TYPES, toCmaField } from '@/scripts/contentful-provision.mjs'
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

  it('gives both publication types an address, a date and a description', () => {
    for (const contentTypeId of ['cartilha', 'caderno']) {
      expect(fieldIds(contentTypeId)).toEqual(
        expect.arrayContaining(['slug', 'publicationDate', 'description']),
      )
    }
  })

  it('makes the address required and unique', () => {
    for (const contentTypeId of ['cartilha', 'caderno']) {
      const slug = CONTENT_TYPES.find((c) => c.id === contentTypeId)?.fields.find((f) => f.id === 'slug')

      expect(slug).toMatchObject({ type: 'Symbol', required: true, unique: true })
      expect(toCmaField(slug).validations).toContainEqual({ unique: true })
    }
  })

  // The address is typed by hand in Contentful and pasted into /comunicacao/<slug>:
  // a space, an accent, "#" or "?" would give a broken or ugly link.
  it('only accepts an address made of lowercase words joined by hyphens', () => {
    for (const contentTypeId of ['cartilha', 'caderno']) {
      const slug = CONTENT_TYPES.find((c) => c.id === contentTypeId)?.fields.find((f) => f.id === 'slug')
      const regexp = toCmaField(slug).validations.find((v) => 'regexp' in v)
      const pattern = new RegExp(regexp?.regexp?.pattern ?? '(?!)')

      for (const good of ['cartilha-5-certificacao', 'caderno-2027', 'a1']) expect(pattern.test(good), good).toBe(true)
      for (const bad of ['Cartilha 5', 'certificação', 'a#b', 'a?b', '-a', 'a-', 'a--b', '']) expect(pattern.test(bad), bad).toBe(false)
      expect(regexp?.message).toBeTruthy()
    }
  })
})
