import { describe, expect, it } from 'vitest'
import {
  CONTENT_TYPES,
  toCmaEntry,
  toCmaField,
  toEditorControl,
} from '@/lib/content/site/provision'
import { COMUNICACAO_QUERY } from '@/lib/content/comunicacao'
import { EVENTOS_QUERY } from '@/lib/content/eventos'
import { copyQuery } from '@/lib/content/site/fetch'
import { copyDefaults, copyFromEntry } from '@/lib/content/site/model'
import { SITE_COPY_TYPES } from '@/lib/content/site/types'

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

  it('carries every field the eventos query selects', () => {
    const selected = selectedFields(EVENTOS_QUERY, 'eventoCollection')

    expect(selected.length).toBeGreaterThan(0)
    expect(fieldIds('evento')).toEqual(expect.arrayContaining(selected))
  })

  // The query sorts by it, and an event without one has no place in the list.
  it('requires the date of an event', () => {
    const date = CONTENT_TYPES.find((c) => c.id === 'evento')?.fields.find((f) => f.id === 'date')

    expect(date).toMatchObject({ type: 'Date', required: true })
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
      expect(toCmaField(slug!).validations).toContainEqual({ unique: true })
    }
  })

  // The address is typed by hand in Contentful and pasted into /comunicacao/<slug>:
  // a space, an accent, "#" or "?" would give a broken or ugly link.
  it('only accepts an address made of lowercase words joined by hyphens', () => {
    for (const contentTypeId of ['cartilha', 'caderno']) {
      const slug = CONTENT_TYPES.find((c) => c.id === contentTypeId)?.fields.find((f) => f.id === 'slug')
      const regexp = toCmaField(slug!).validations.find((v) => 'regexp' in v)
      const pattern = new RegExp(regexp?.regexp?.pattern ?? '(?!)')

      for (const good of ['cartilha-5-certificacao', 'caderno-2027', 'a1']) expect(pattern.test(good), good).toBe(true)
      for (const bad of ['Cartilha 5', 'certificação', 'a#b', 'a?b', '-a', 'a-', 'a--b', '']) expect(pattern.test(bad), bad).toBe(false)
      expect(regexp?.message).toBeTruthy()
    }
  })
})

describe('the provisioned institutional copy', () => {
  it('carries every field the copy queries select', () => {
    for (const type of SITE_COPY_TYPES) {
      const query = copyQuery({ [type.id]: type })
      const selected = selectedFields(query, `${type.id}Collection`)

      expect(selected.length, type.id).toBe(Object.keys(type.fields).length)
      expect(fieldIds(type.id)).toEqual(selected)
    }
  })

  it('stores a line as a Symbol and everything longer as a Text, required unless optional', () => {
    for (const type of SITE_COPY_TYPES) {
      const provisioned = CONTENT_TYPES.find((c) => c.id === type.id)

      for (const field of provisioned?.fields ?? []) {
        expect(field.type, `${type.id}.${field.id}`).toBe(field.copy === 'line' ? 'Symbol' : 'Text')
        expect(field.required, `${type.id}.${field.id}`).toBe(!type.fields[field.id].optional)
      }
    }
  })

  // Contentful opens a Text field in its Markdown editor unless told
  // otherwise, and the pages render none of its formatting.
  it('edits every copy field in a plain box with a hint of how it is read', () => {
    for (const type of SITE_COPY_TYPES) {
      for (const field of CONTENT_TYPES.find((c) => c.id === type.id)?.fields ?? []) {
        const control = toEditorControl(field)

        expect(control?.widgetId, `${type.id}.${field.id}`).toBe(field.type === 'Symbol' ? 'singleLine' : 'multipleLine')
        expect(control?.settings.helpText, `${type.id}.${field.id}`).toBeTruthy()
      }
    }
  })

  it('leaves the publication types to their default editors', () => {
    for (const id of ['cartilha', 'caderno', 'fotoFormacao', 'evento']) {
      expect(CONTENT_TYPES.find((c) => c.id === id)?.fields.map(toEditorControl).filter(Boolean)).toEqual([])
    }
  })

  // The seed must not change a page: what it writes reads back as the copy
  // the page ships with.
  it('seeds each type with an entry that reads back as the shipped copy', () => {
    for (const type of SITE_COPY_TYPES) {
      const { fields } = toCmaEntry(type, 'en-US')
      const entry = Object.fromEntries(Object.entries(fields).map(([id, value]) => [id, value['en-US']]))

      expect(copyFromEntry(type, entry), type.id).toEqual(copyDefaults(type))
    }
  })
})
