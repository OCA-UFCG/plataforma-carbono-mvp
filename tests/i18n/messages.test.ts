import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_LOCALE, LOCALES } from '@/translations/config'
import { NAMESPACES, loadMessages } from '@/translations/messages'

const TRANSLATIONS_DIR = path.resolve(import.meta.dirname, '../../translations')

function namespaceFiles(locale: string): string[] {
  return fs
    .readdirSync(path.join(TRANSLATIONS_DIR, locale))
    .filter((file) => file.endsWith('.json'))
    .sort()
}

function read(locale: string, file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, locale, file), 'utf-8'))
}

function flatten(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  )
}

// ICU placeholders of a message: "Foto {number}" -> ["number"].
function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

function leaves(value: unknown, prefix = ''): [string, string][] {
  if (typeof value === 'string') return [[prefix, value]]
  if (value === null || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  )
}

// Every locale mirrors the default one: same files, same keys, same
// placeholders. A file is named after its single top-level key, so merging the
// files (Object.assign in loadMessages) never overwrites one another.
describe('translations/', () => {
  it('has a directory for every locale', () => {
    for (const locale of LOCALES) {
      expect(fs.existsSync(path.join(TRANSLATIONS_DIR, locale)), locale).toBe(true)
    }
  })

  it('registers every namespace file in NAMESPACES, and only those', () => {
    const expected = [...NAMESPACES].map((ns) => `${ns}.json`).sort()
    for (const locale of LOCALES) {
      expect(namespaceFiles(locale), locale).toEqual(expected)
    }
  })

  for (const locale of LOCALES) {
    describe(locale, () => {
      it('names each file after its single top-level key', () => {
        for (const file of namespaceFiles(locale)) {
          expect(Object.keys(read(locale, file)), `${locale}/${file}`).toEqual([
            file.replace(/\.json$/, ''),
          ])
        }
      })

      it('has the same keys as the default locale', () => {
        for (const file of namespaceFiles(DEFAULT_LOCALE)) {
          expect(flatten(read(locale, file)).sort(), `${locale}/${file}`).toEqual(
            flatten(read(DEFAULT_LOCALE, file)).sort(),
          )
        }
      })

      it('uses the same placeholders as the default locale, and no empty strings', () => {
        for (const file of namespaceFiles(DEFAULT_LOCALE)) {
          const reference = new Map(leaves(read(DEFAULT_LOCALE, file)))
          for (const [key, message] of leaves(read(locale, file))) {
            expect(message.trim(), `${locale}/${file} ${key}`).not.toBe('')
            expect(placeholders(message), `${locale}/${file} ${key}`).toEqual(
              placeholders(reference.get(key) ?? ''),
            )
          }
        }
      })

      it('loads every namespace into the merged messages', async () => {
        const messages = await loadMessages(locale)
        expect(Object.keys(messages).sort()).toEqual([...NAMESPACES].sort())
      })
    })
  }
})
