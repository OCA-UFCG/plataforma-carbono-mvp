// Provisions in Contentful the content types the marketing pages read, and
// seeds the institutional copy. Talks to the Content Management API over plain
// REST, so it needs no dependency beyond Node and tsx. Dry run by default;
// --apply creates or updates the content types, publishes them, sets how their
// fields are edited, and creates the copy entries that do not exist yet.
//
// Usage: CONTENTFUL_MANAGEMENT_TOKEN=... npm run contentful:provision [-- --apply]
//
// The token comes from Contentful under Settings > API keys > Content
// management tokens, and is not the delivery token the application uses. The
// model itself is lib/content/site/provision.ts.
//
// Seeding never overwrites: a copy type that already has an entry, edited or
// not, is left alone. Each copy type holds a single entry.
import { readFileSync } from 'node:fs'
import { SITE_COPY_TYPES } from '@/lib/content/site/types'
import {
  CONTENT_TYPES,
  toCmaContentType,
  toCmaEntry,
  toEditorControl,
} from '@/lib/content/site/provision'

// Loads the credentials from .env.local (without depending on dotenv), as the
// other scripts in this folder do.
function loadEnv() {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
    }
  } catch {}
}

type CmaOptions = {
  token: string
  method?: string
  body?: unknown
  version?: number
  // Names the content type of an entry being created.
  contentType?: string
}

async function cma(path: string, { token, method = 'GET', body, version, contentType }: CmaOptions) {
  const response = await fetch(`https://api.contentful.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      ...(version === undefined ? {} : { 'X-Contentful-Version': String(version) }),
      ...(contentType === undefined ? {} : { 'X-Contentful-Content-Type': contentType }),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (response.status === 404) return null

  if (!response.ok) {
    // The message carries the status and the Contentful request id, never the token.
    throw new Error(
      `CMA ${method} ${path} failed with status ${response.status} (request ${response.headers.get('x-contentful-request-id')})`,
    )
  }

  return response.json()
}

async function main() {
  loadEnv()

  const apply = process.argv.includes('--apply')
  const space = process.env.CONTENTFUL_SPACE_ID
  const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master'
  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN

  console.log(`${apply ? 'Applying' : 'Dry run of'} the content model:`)
  for (const contentType of CONTENT_TYPES) {
    const fields = contentType.fields
      .map((field) => `${field.id}${field.required ? '' : '?'}:${field.type}`)
      .join(', ')
    console.log(`  ${contentType.id} (${contentType.name}) -> ${fields}`)
  }

  if (!space || !token) {
    console.log(
      '\nCONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN are not both set, so nothing was compared against the space.',
    )
    return
  }

  const env = `/spaces/${space}/environments/${environment}`

  for (const contentType of CONTENT_TYPES) {
    const path = `${env}/content_types/${contentType.id}`
    const existing = await cma(path, { token })
    const action = existing ? 'update' : 'create'

    if (!apply) {
      console.log(`\nWould ${action} ${contentType.id} in ${space}/${environment}.`)
      continue
    }

    const saved = await cma(path, {
      token,
      method: 'PUT',
      body: toCmaContentType(contentType),
      version: existing?.sys.version,
    })

    await cma(`${path}/published`, { token, method: 'PUT', version: saved.sys.version })

    const controls = contentType.fields.map(toEditorControl).filter(Boolean)

    if (controls.length > 0) {
      const editorInterface = await cma(`${path}/editor_interface`, { token })

      await cma(`${path}/editor_interface`, {
        token,
        method: 'PUT',
        body: { controls },
        version: editorInterface.sys.version,
      })
    }

    console.log(`\n${action}d and published ${contentType.id} in ${space}/${environment}.`)
  }

  const locales = await cma(`${env}/locales`, { token })
  const locale = locales.items.find((l: { default: boolean }) => l.default).code

  for (const copyType of SITE_COPY_TYPES) {
    // A content type that does not exist yet (a dry run before the first
    // --apply) has no entries either.
    const existing = await cma(`${env}/entries?content_type=${copyType.id}&limit=1`, { token }).catch(
      () => null,
    )

    if (existing?.total > 0) {
      console.log(`\nKept the entry of ${copyType.id} as it is.`)
      continue
    }

    if (!apply) {
      console.log(`\nWould seed an entry of ${copyType.id} with the shipped copy (${locale}).`)
      continue
    }

    const created = await cma(`${env}/entries`, {
      token,
      method: 'POST',
      body: toCmaEntry(copyType, locale),
      contentType: copyType.id,
    })

    await cma(`${env}/entries/${created.sys.id}/published`, {
      token,
      method: 'PUT',
      version: created.sys.version,
    })

    console.log(`\nSeeded and published an entry of ${copyType.id} (${locale}).`)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
