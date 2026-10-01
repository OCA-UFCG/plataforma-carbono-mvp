import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAMESPACES } from '@/translations/messages'
import { CLIENT_NAMESPACES, pickMessages, type RouteGroup } from '@/translations/clientNamespaces'

// Each root layout hands NextIntlClientProvider only CLIENT_NAMESPACES[group].
// A namespace a client component reads but the list misses does not fail loudly:
// useTranslations reports the missing key and the map's `lookup` quietly falls
// back to Portuguese. So the lists are derived here from the code itself: the
// modules each route group runs in the browser, and the namespaces they name.

const ROOT = path.resolve(import.meta.dirname, '../..')
const SOURCE_EXT = ['.tsx', '.ts']

function resolveImport(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else return null // a package

  for (const candidate of [base, ...SOURCE_EXT.map((ext) => base + ext), ...SOURCE_EXT.map((ext) => path.join(base, 'index' + ext))]) {
    if (SOURCE_EXT.includes(path.extname(candidate)) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
  return null // JSON, CSS and other assets
}

const sourceCache = new Map<string, string>()
const read = (file: string) => {
  if (!sourceCache.has(file)) sourceCache.set(file, fs.readFileSync(file, 'utf-8'))
  return sourceCache.get(file)!
}

function importsOf(file: string): string[] {
  const source = read(file)
  // Static imports and re-exports, and dynamic import() (next/dynamic).
  const specs = [
    ...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1])
  return specs.map((spec) => resolveImport(file, spec)).filter((f): f is string => f !== null)
}

const isClientEntry = (file: string) => /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(read(file))

/** Every module of a route group that runs in the browser: 'use client' files and all they import. */
function clientModules(group: RouteGroup): Set<string> {
  const groupDir = path.join(ROOT, 'app', `(${group})`)
  const entries = (fs.readdirSync(groupDir, { recursive: true }) as string[])
    .map((rel) => path.join(groupDir, rel))
    .filter((file) => SOURCE_EXT.includes(path.extname(file)))

  const seen = new Set<string>()
  const client = new Set<string>()
  const walk = (file: string, inClient: boolean) => {
    const nowClient = inClient || isClientEntry(file)
    const key = `${nowClient}:${file}`
    if (seen.has(key)) return
    seen.add(key)
    if (nowClient) client.add(file)
    for (const dep of importsOf(file)) walk(dep, nowClient)
  }
  entries.forEach((file) => walk(file, false))
  return client
}

/** The namespaces a module names: in useTranslations('X'), in a root key 'X.y', in a template `X.${id}`. */
function namespacesIn(file: string): string[] {
  // Comments quote names too ("the `Hero` of blocks.tsx"); only code counts.
  const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  return NAMESPACES.filter((ns) => new RegExp(`['"\`]${ns}(?=[.'"\`])`).test(code))
}

const GROUPS = Object.keys(CLIENT_NAMESPACES) as RouteGroup[]

describe('the messages each route group sends to the browser', () => {
  it.each(GROUPS)('%s lists exactly the namespaces its client modules read', (group) => {
    const used = new Set([...clientModules(group)].flatMap(namespacesIn))

    expect([...CLIENT_NAMESPACES[group]].sort()).toEqual([...used].sort())
  })

  it('covers every route group with a root layout', () => {
    const withLayout = fs.readdirSync(path.join(ROOT, 'app'))
      .filter((dir) => /^\(.+\)$/.test(dir) && fs.existsSync(path.join(ROOT, 'app', dir, 'layout.tsx')))
      .map((dir) => dir.slice(1, -1))

    expect(GROUPS.sort()).toEqual(withLayout.sort())
  })

  it('every root layout picks its own group\'s namespaces for the provider', () => {
    for (const group of GROUPS) {
      const layout = read(path.join(ROOT, 'app', `(${group})`, 'layout.tsx'))
      expect(layout, group).toContain(`pickMessages(messages, CLIENT_NAMESPACES.${group})`)
      expect(layout, group).not.toMatch(/NextIntlClientProvider messages=\{messages\}/)
    }
  })

  it('serves the signed-out login page nothing but its own text', () => {
    expect(CLIENT_NAMESPACES.auth).toEqual(['Login'])
  })

})

describe('pickMessages', () => {
  it('keeps the listed namespaces whole and nothing else', () => {
    const messages = { Login: { title: 'Entrar' }, MapaLayers: { layers: {} }, SobreIntro: { a: 'b' } }

    expect(pickMessages(messages, ['Login'])).toEqual({ Login: { title: 'Entrar' } })
  })
})
