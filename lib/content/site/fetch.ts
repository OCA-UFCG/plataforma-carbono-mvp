import 'server-only'

import { getContentfulClient } from '@/lib/contentful'
import { copyDefaults, copyFromEntry, type CopyType, type CopyValues } from './model'

// Reads the copy of the institutional pages from Contentful, one query per page
// for every section it shows. The fallback mirrors lib/content/comunicacao.ts:
// no credentials, a failed request or a missing entry all render the shipped
// copy, so the page never comes out blank.

type GetContent = <T>(query: string) => Promise<T>

type CopyTypes = Record<string, CopyType>

export type SiteCopy<T extends CopyTypes> = { [Key in keyof T]: CopyValues<T[Key]['fields']> }

type CopyResponse = Record<string, { items: Array<Record<string, unknown> | null> } | null>

// Each type holds a single entry. Should an editor create a second one anyway,
// the oldest stays in charge, so the page does not flip between the two.
export function copyQuery(types: CopyTypes): string {
  const selections = Object.entries(types).map(
    ([alias, type]) => `
    ${alias}: ${type.id}Collection(limit: 1, order: sys_firstPublishedAt_ASC, preview: $preview) {
      items {
        ${Object.keys(type.fields).join('\n        ')}
      }
    }`,
  )

  return `
  query($preview: Boolean) {${selections.join('')}
  }
`
}

function withDefaults<T extends CopyTypes>(types: T, response: CopyResponse | null): SiteCopy<T> {
  const copy = {} as Record<string, unknown>

  for (const [alias, type] of Object.entries(types)) {
    const entry = response?.[alias]?.items[0]

    copy[alias] = entry ? copyFromEntry(type, entry) : copyDefaults(type)
  }

  return copy as SiteCopy<T>
}

export async function loadSiteCopy<T extends CopyTypes>(
  types: T,
  getContent: GetContent | null = getContentfulClient(),
): Promise<SiteCopy<T>> {
  if (!getContent) return withDefaults(types, null)

  try {
    return withDefaults(types, await getContent<CopyResponse>(copyQuery(types)))
  } catch (error) {
    // A CMS outage cannot take the page down: log it and render what the page
    // ships with.
    console.error(
      `Failed to read the copy of ${Object.values(types).map((t) => t.id).join(', ')} from Contentful:`,
      error,
    )

    return withDefaults(types, null)
  }
}
