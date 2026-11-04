import 'server-only'

import type { SiteLocale } from '@/lib/locale'

// Read client for the Contentful GraphQL Content Delivery API, used by the
// landing page content repositories in lib/content/. The credentials are
// server-only, as the Firebase ones are: a NEXT_PUBLIC_ prefix would embed the
// delivery token in the browser bundle.

export type ContentfulEnv = {
  CONTENTFUL_SPACE_ID?: string
  CONTENTFUL_ENVIRONMENT?: string
  CONTENTFUL_ACCESS_TOKEN?: string
  CONTENTFUL_PREVIEW_TOKEN?: string
  CONTENTFUL_PREVIEW?: string
}

export type ContentfulConfig = {
  endpoint: string
  accessToken: string
  preview: boolean
  revalidate: number
}

// Published content changes by editorial decision, so an hour of staleness is
// acceptable; a preview session is someone watching their own draft, and waiting
// an hour for it would defeat the purpose.
const REVALIDATE_SECONDS = 3600
const PREVIEW_REVALIDATE_SECONDS = 60

export function readContentfulConfig(env: ContentfulEnv): ContentfulConfig | null {
  const space = env.CONTENTFUL_SPACE_ID
  const preview = env.CONTENTFUL_PREVIEW === 'true'
  const accessToken = preview ? env.CONTENTFUL_PREVIEW_TOKEN : env.CONTENTFUL_ACCESS_TOKEN

  if (!space || !accessToken) return null

  const environment = env.CONTENTFUL_ENVIRONMENT || 'master'

  return {
    endpoint: `https://graphql.contentful.com/content/v1/spaces/${space}/environments/${environment}`,
    accessToken,
    preview,
    revalidate: preview ? PREVIEW_REVALIDATE_SECONDS : REVALIDATE_SECONDS,
  }
}

export function isContentfulConfigured(env: ContentfulEnv): boolean {
  return readContentfulConfig(env) !== null
}

type ContentfulVariable = string | number | boolean | null | ContentfulVariable[]

export type ContentfulVariables = Record<string, ContentfulVariable>

// The Contentful locale of each language of the site. Portuguese, "pt-BR", is
// the space's default: a Portuguese page names no locale and gets it. The space
// sets "en-US" to fall back to it field by field, so an English page shows the
// Portuguese of a field nobody has translated yet, as it does every field of a
// type that is not localized.
const CONTENTFUL_LOCALES: Record<SiteLocale, string | undefined> = { pt: undefined, en: 'en-US' }

// The variables that ask a query for the page's language.
export function localeVariables(locale: SiteLocale): ContentfulVariables | undefined {
  const contentfulLocale = CONTENTFUL_LOCALES[locale]

  return contentfulLocale ? { locale: contentfulLocale } : undefined
}

type ContentfulError = {
  message: string
  extensions?: {
    contentful?: {
      code?: string
      requestId?: string
      details?: { field?: string; linkId?: string; linkingEntryId?: string }
    }
  }
}

type ContentfulResponse<T> = { data?: T; errors?: ContentfulError[] }

// Contentful answers with valid partial data when an entry references something
// unpublished, reporting the reference as an error of this code. One editorial
// mistake must not take a whole section down, so these are logged and the data
// is kept; anything else is fatal.
const UNRESOLVABLE_LINK = 'UNRESOLVABLE_LINK'

function isUnresolvableLink(error: ContentfulError): boolean {
  return error.extensions?.contentful?.code === UNRESOLVABLE_LINK
}

// The error messages carry the status, the request id and the offending field,
// never the access token: the same rule the /api/gee/* routes follow for the
// credentials path.
function requireContentfulData<T>(body: ContentfulResponse<T>): T {
  const errors = body.errors ?? []
  const fatal = errors.filter((error) => !isUnresolvableLink(error))

  if (fatal.length > 0) {
    throw new Error(`Contentful returned errors: ${JSON.stringify(fatal.map((e) => e.message))}`)
  }

  if (body.data === undefined) {
    throw new Error('Contentful returned no data')
  }

  for (const error of errors) {
    const contentful = error.extensions?.contentful

    console.warn(
      JSON.stringify({
        event: 'contentful_unresolvable_link',
        code: contentful?.code,
        requestId: contentful?.requestId,
        ...contentful?.details,
      }),
    )
  }

  return body.data
}

export function createContentfulClient(config: ContentfulConfig, fetcher: typeof fetch = fetch) {
  return async function getContent<T>(query: string, variables?: ContentfulVariables): Promise<T> {
    const response = await fetcher(config.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: config.revalidate },
      body: JSON.stringify({ query, variables: { ...variables, preview: config.preview } }),
    })

    if (!response.ok) {
      throw new Error(`Contentful request failed with status ${response.status}`)
    }

    return requireContentfulData((await response.json()) as ContentfulResponse<T>)
  }
}

// Single entry point for the content repositories: null means "no credentials
// configured", which is a supported state — every repository falls back to the
// content the pages ship with.
function readProcessEnv(): ContentfulEnv {
  return {
    CONTENTFUL_SPACE_ID: process.env.CONTENTFUL_SPACE_ID,
    CONTENTFUL_ENVIRONMENT: process.env.CONTENTFUL_ENVIRONMENT,
    CONTENTFUL_ACCESS_TOKEN: process.env.CONTENTFUL_ACCESS_TOKEN,
    CONTENTFUL_PREVIEW_TOKEN: process.env.CONTENTFUL_PREVIEW_TOKEN,
    CONTENTFUL_PREVIEW: process.env.CONTENTFUL_PREVIEW,
  }
}

export function getContentfulClient(env: ContentfulEnv = readProcessEnv()) {
  const config = readContentfulConfig(env)

  return config ? createContentfulClient(config) : null
}
