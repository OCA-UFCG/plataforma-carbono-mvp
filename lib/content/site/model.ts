// The copy of the institutional pages, as editors keep it in Contentful. Each
// section or page is one content type holding a single entry; every field is a
// piece of text, and the values written here are both what the page ships with
// and what scripts/contentful-provision.mts seeds a new space with.
//
// What stays out of Contentful, on purpose: images and the text that describes
// them (alt text, photo credits), icons, link targets, and interface labels
// such as "Ver mais" or "Sair". The structure of each page — how many cards,
// which photo goes where — is code; Contentful owns the words.
//
// No 'server-only' here: the provisioning script imports these definitions
// under tsx, outside Next.js. The read path is lib/content/site/fetch.ts.

// How a field is typed in Contentful and read back:
// - line: a Symbol, one line of up to 256 characters.
// - paragraph: a Text read as one paragraph. A line break the editor types is
//   kept as a line break (components/marketing/Linhas.tsx renders it).
// - text: a Text, paragraphs separated by a blank line, each read as a
//   paragraph field is.
// - list: a Text, one item per line.
export type CopyKind = 'line' | 'paragraph' | 'text' | 'list'

// What each placeholder of a field becomes, in Portuguese, by name. A field
// the page fills in names them between braces, as in "Eram {percentual} em
// {anoInicial}.", and the help text under it in Contentful lists them.
export type Placeholders = Record<string, string>

export type CopyField<K extends CopyKind = CopyKind> = {
  kind: K
  // The label the editor reads in Contentful, in Portuguese.
  name: string
  // The value as Contentful stores it.
  default: string
  // An optional field may be left empty, and the page then leaves its element
  // out; every other field is required.
  optional?: boolean
  // Set on a line or paragraph the page fills in. An entry whose text names
  // any other placeholder, or leaves a brace unpaired, gets the shipped value
  // for this field.
  placeholders?: Placeholders
}

export type CopyFields = Record<string, CopyField>

export type CopyType<F extends CopyFields = CopyFields> = {
  id: string
  name: string
  description: string
  fields: F
}

export type CopyValue<K extends CopyKind> = K extends 'line' | 'paragraph' ? string : string[]

export type CopyValues<F extends CopyFields> = {
  [Id in keyof F]: CopyValue<F[Id]['kind']>
}

// The values a page reads for one content type.
export type Copy<T extends CopyType> = CopyValues<T['fields']>

// Contentful's limit for a Symbol field.
export const LINE_MAX_LENGTH = 256

export function line(name: string, value: string, placeholders?: Placeholders): CopyField<'line'> {
  return { kind: 'line', name, default: value, ...(placeholders && { placeholders }) }
}

// A line the page shows only when it has one: an empty one is empty on the
// page too, not the shipped value.
export function optionalLine(name: string, value = ''): CopyField<'line'> {
  return { kind: 'line', name, default: value, optional: true }
}

export function paragraph(name: string, value: string, placeholders?: Placeholders): CopyField<'paragraph'> {
  return { kind: 'paragraph', name, default: value, ...(placeholders && { placeholders }) }
}

// One string per paragraph; a "\n" inside one is a line break the design asks
// for.
export function text(name: string, paragraphs: string | string[]): CopyField<'text'> {
  return { kind: 'text', name, default: [paragraphs].flat().join('\n\n') }
}

export function list(name: string, items: string[]): CopyField<'list'> {
  return { kind: 'list', name, default: items.join('\n') }
}

export function defineCopy<F extends CopyFields>(type: CopyType<F>): CopyType<F> {
  return type
}

// The field the Contentful entry list shows as the entry's title: its first
// title (an id of "titulo" or ending in "Titulo"), else its first one-line
// field.
export function displayField(type: CopyType): string {
  const lines = Object.keys(type.fields).filter((fieldId) => type.fields[fieldId].kind === 'line')
  const id = lines.find((fieldId) => /(^t|T)itulo$/.test(fieldId)) ?? lines[0]

  if (!id) throw new Error(`${type.id} has no one-line field to title its entry`)

  return id
}

function splitLines(value: string): string[] {
  return value.split('\n').map((l) => l.trim())
}

// A blank line has no place inside one paragraph: it reads as a line break.
function toParagraph(value: string): string {
  return splitLines(value).filter(Boolean).join('\n')
}

// Editors type into a plain textarea: Windows line breaks, trailing spaces and
// runs of blank lines are noise, not content.
export function parseCopy<K extends CopyKind>(kind: K, raw: string): CopyValue<K> {
  const value = raw.replace(/\r\n?/g, '\n')

  if (kind === 'line') return value.trim() as CopyValue<K>

  if (kind === 'paragraph') return toParagraph(value) as CopyValue<K>

  if (kind === 'list') return splitLines(value).filter(Boolean) as CopyValue<K>

  return value.split(/\n[^\S\n]*\n/).map(toParagraph).filter(Boolean) as CopyValue<K>
}

const PLACEHOLDER = /\{(\w+)\}/g

// The placeholder names a text uses, each once, in the order they first appear.
export function placeholdersIn(value: string): string[] {
  return [...new Set(Array.from(value.matchAll(PLACEHOLDER), (match) => match[1]))]
}

// Whether every brace in the text belongs to a placeholder the field
// declares. Leaving a declared one out is fine.
export function fitsPlaceholders(value: string, placeholders: Placeholders = {}): boolean {
  const rest = value.replace(PLACEHOLDER, (match, name: string) => (Object.hasOwn(placeholders, name) ? '' : match))

  return !/[{}]/.test(rest)
}

// Fills a text's placeholders. copyFromEntry has already refused a text naming
// one its field does not declare.
export function fillPlaceholders(value: string, values: Record<string, string | number>): string {
  return value.replace(PLACEHOLDER, (match, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : match))
}

function fitsField(field: CopyField, value: string | string[]): boolean {
  return !field.placeholders || [value].flat().every((part) => fitsPlaceholders(part, field.placeholders))
}

function isEmpty(value: string | string[]): boolean {
  return value.length === 0
}

// The entry as the GraphQL API answers it, field by field. A required field
// that is missing, empty or not a string falls back to the shipped value on
// its own: one field cleared by mistake must not blank its neighbours. An
// optional one left empty in an entry is empty on purpose (the API answers it
// with null); without an entry, it too takes the shipped value. A text naming
// a placeholder its field does not declare falls back the same way.
export function copyFromEntry<F extends CopyFields>(
  type: CopyType<F>,
  entry: Record<string, unknown> | null | undefined,
): CopyValues<F> {
  const values = {} as Record<string, string | string[]>

  for (const [id, field] of Object.entries(type.fields)) {
    const raw = entry?.[id]
    const parsed = typeof raw === 'string' ? parseCopy(field.kind, raw) : null

    if (parsed !== null && !fitsField(field, parsed)) {
      values[id] = parseCopy(field.kind, field.default)
    } else if (field.optional && entry) {
      values[id] = parsed ?? parseCopy(field.kind, '')
    } else {
      values[id] = parsed === null || isEmpty(parsed) ? parseCopy(field.kind, field.default) : parsed
    }
  }

  return values as CopyValues<F>
}

export function copyDefaults<F extends CopyFields>(type: CopyType<F>): CopyValues<F> {
  return copyFromEntry(type, null)
}

// The fields of an entry whose text the page refuses for naming a placeholder
// the field does not fill; tests/lib/contentfulSpace.test.ts lists them.
export function rejectedFields(type: CopyType, entry: Record<string, unknown>): string[] {
  return Object.entries(type.fields)
    .filter(([id, field]) => {
      const raw = entry[id]

      return typeof raw === 'string' && !fitsField(field, parseCopy(field.kind, raw))
    })
    .map(([id]) => id)
}
