// Provisions in Contentful the content types the landing page reads. Talks to
// the Content Management API over plain REST, so it needs no dependency beyond
// Node. Dry run by default; --apply creates or updates the content types and
// publishes them.
//
// Usage: CONTENTFUL_MANAGEMENT_TOKEN=... node scripts/contentful-provision.mjs [--apply]
//
// The token comes from Contentful under Settings > API keys > Content
// management tokens, and is not the delivery token the application uses. The
// field IDs below are the ones the GraphQL queries select; tests/scripts/
// contentfulProvision.test.ts keeps the two in step. The display names are in
// Portuguese because they are what the editor reads in the web interface.
import { readFileSync } from 'node:fs'

export const CONTENT_TYPES = [
  {
    id: 'cartilha',
    name: 'Cartilha',
    description:
      'Volume da coleção de cartilhas, exibido na seção Comunicação da landing page.',
    displayField: 'title',
    fields: [
      { id: 'volume', name: 'Volume', type: 'Symbol', required: true },
      { id: 'title', name: 'Título', type: 'Symbol', required: true },
      { id: 'cover', name: 'Capa', type: 'Link', linkType: 'Asset', required: true, image: true },
      { id: 'pdf', name: 'PDF', type: 'Link', linkType: 'Asset', required: false, pdf: true },
      { id: 'order', name: 'Ordem', type: 'Integer', required: true },
    ],
  },
  {
    id: 'boletim',
    name: 'Boletim temático',
    description: 'Boletim em destaque na seção Comunicação. A página usa a entrada mais recente.',
    displayField: 'title',
    fields: [
      { id: 'title', name: 'Título', type: 'Symbol', required: true },
      { id: 'description', name: 'Descrição', type: 'Text', required: true },
      { id: 'cover', name: 'Capa', type: 'Link', linkType: 'Asset', required: true, image: true },
      { id: 'pdf', name: 'PDF', type: 'Link', linkType: 'Asset', required: false, pdf: true },
    ],
  },
  {
    id: 'fotoFormacao',
    name: 'Foto de formação',
    description: 'Foto do carrossel da seção Formação cidadã.',
    displayField: 'caption',
    fields: [
      { id: 'caption', name: 'Legenda', type: 'Symbol', required: true },
      {
        id: 'alt',
        name: 'Texto alternativo',
        type: 'Symbol',
        required: true,
      },
      { id: 'photo', name: 'Foto', type: 'Link', linkType: 'Asset', required: true, image: true },
      { id: 'order', name: 'Ordem', type: 'Integer', required: true },
    ],
  },
]

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

function toCmaField(field) {
  const validations = []
  if (field.image) validations.push({ linkMimetypeGroup: ['image'] })
  if (field.pdf) validations.push({ linkMimetypeGroup: ['pdfdocument'] })

  return {
    id: field.id,
    name: field.name,
    type: field.type,
    ...(field.linkType ? { linkType: field.linkType } : {}),
    required: field.required,
    localized: false,
    disabled: false,
    omitted: false,
    validations,
  }
}

function toCmaContentType(contentType) {
  return {
    name: contentType.name,
    description: contentType.description,
    displayField: contentType.displayField,
    fields: contentType.fields.map(toCmaField),
  }
}

async function cma(path, { token, method = 'GET', body, version }) {
  const response = await fetch(`https://api.contentful.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      ...(version === undefined ? {} : { 'X-Contentful-Version': String(version) }),
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

  const base = `/spaces/${space}/environments/${environment}/content_types`

  for (const contentType of CONTENT_TYPES) {
    const existing = await cma(`${base}/${contentType.id}`, { token })
    const action = existing ? 'update' : 'create'

    if (!apply) {
      console.log(`\nWould ${action} ${contentType.id} in ${space}/${environment}.`)
      continue
    }

    const saved = await cma(`${base}/${contentType.id}`, {
      token,
      method: 'PUT',
      body: toCmaContentType(contentType),
      version: existing?.sys.version,
    })

    await cma(`${base}/${contentType.id}/published`, {
      token,
      method: 'PUT',
      version: saved.sys.version,
    })

    console.log(`\n${action}d and published ${contentType.id} in ${space}/${environment}.`)
  }
}

// Only runs when invoked directly, so the tests can import CONTENT_TYPES.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
