import { describe, expect, it } from 'vitest'
import { FOOTER_LINKS, HEADER_LINKS } from '@/lib/marketing/nav'
import { MESSAGES } from '@/tests/helpers/intl'

// The interface labels kept in code, one file per language (messages/). The
// copy editors write is in Contentful and translated there.
type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === 'string' ? [[`${prefix}${key}`, value]] : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  )
}

const pt = flatten(MESSAGES.pt)
const en = flatten(MESSAGES.en)

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
}

describe('the interface messages', () => {
  it('give English exactly the keys Portuguese has', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort())
  })

  it('keep the placeholders of each Portuguese message in English', () => {
    for (const [key, message] of Object.entries(pt)) {
      expect(placeholders(en[key] ?? ''), key).toEqual(placeholders(message))
    }
  })

  it('leave no message empty', () => {
    for (const [key, message] of [...Object.entries(pt), ...Object.entries(en)]) {
      expect(message.trim(), key).not.toBe('')
    }
  })

  it('name every link of the header and the footer in both languages', () => {
    for (const link of [...HEADER_LINKS, ...FOOTER_LINKS]) {
      expect(pt[`Nav.${link.key}`], link.href).toBeTruthy()
      expect(en[`Nav.${link.key}`], link.href).toBeTruthy()
    }
  })
})
