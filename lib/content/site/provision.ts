// The content model the marketing pages read, as scripts/contentful-provision.mts
// provisions it in Contentful: the publication types, typed by hand, and the
// institutional copy types, derived from their definitions in lib/content/.
// The field IDs are the ones the GraphQL queries select; tests/scripts/
// contentfulProvision.test.ts keeps the two in step. The display names are in
// Portuguese because they are what the editor reads in the web interface.
import { displayField, type CopyKind, type CopyType } from './model'
import { SITE_COPY_TYPES } from './types'

// A publication's address, /comunicacao/<slug>: lowercase words joined by
// single hyphens, so an editor cannot type a space, an accent, "#" or "?".
const SLUG_PATTERN = '^[a-z0-9]+(?:-[a-z0-9]+)*$'
const SLUG_MESSAGE =
  'Use só letras minúsculas sem acento, números e hífens entre as palavras, como em cartilha-5-certificacao.'

export type ProvisionedField = {
  id: string
  name: string
  type: 'Symbol' | 'Text' | 'Date' | 'Integer' | 'Link'
  required: boolean
  linkType?: 'Asset'
  image?: boolean
  pdf?: boolean
  unique?: boolean
  slug?: boolean
  // Set on the fields of the institutional copy: how the editor types it.
  copy?: CopyKind
}

export type ProvisionedType = {
  id: string
  name: string
  description: string
  displayField: string
  fields: ProvisionedField[]
}

const PUBLICATION_TYPES: ProvisionedType[] = [
  {
    id: 'cartilha',
    name: 'Cartilha',
    description:
      'Volume da coleção de cartilhas, exibido na seção Comunicação da landing page.',
    displayField: 'title',
    fields: [
      { id: 'volume', name: 'Volume', type: 'Symbol', required: true },
      { id: 'title', name: 'Título', type: 'Symbol', required: true },
      { id: 'slug', name: 'Endereço', type: 'Symbol', required: true, unique: true, slug: true },
      { id: 'description', name: 'Descrição', type: 'Text', required: false },
      { id: 'publicationDate', name: 'Data de publicação', type: 'Date', required: false },
      { id: 'cover', name: 'Capa', type: 'Link', linkType: 'Asset', required: true, image: true },
      { id: 'pdf', name: 'PDF', type: 'Link', linkType: 'Asset', required: false, pdf: true },
      { id: 'order', name: 'Ordem', type: 'Integer', required: true },
    ],
  },
  {
    id: 'caderno',
    name: 'Caderno Temático',
    description: 'Caderno temático em destaque na seção Comunicação. A página usa a entrada mais recente.',
    displayField: 'title',
    fields: [
      { id: 'title', name: 'Título', type: 'Symbol', required: true },
      { id: 'slug', name: 'Endereço', type: 'Symbol', required: true, unique: true, slug: true },
      { id: 'description', name: 'Descrição', type: 'Text', required: true },
      { id: 'publicationDate', name: 'Data de publicação', type: 'Date', required: false },
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
  {
    id: 'evento',
    name: 'Evento',
    description:
      'Evento ou articulação da aba "Eventos e articulações" da página Comunicação. A página lista os eventos do mais recente ao mais antigo, pela data.',
    displayField: 'title',
    fields: [
      { id: 'categoria', name: 'Categoria', type: 'Symbol', required: true },
      { id: 'title', name: 'Título', type: 'Symbol', required: true },
      { id: 'date', name: 'Data', type: 'Date', required: true },
      { id: 'local', name: 'Local', type: 'Symbol', required: false },
      { id: 'description', name: 'Descrição', type: 'Text', required: true },
      { id: 'photo', name: 'Foto', type: 'Link', linkType: 'Asset', required: true, image: true },
      { id: 'photoAlt', name: 'Texto alternativo da foto', type: 'Symbol', required: true },
      { id: 'caption', name: 'Legenda e fonte da foto', type: 'Text', required: false },
    ],
  },
]

// A copy field is required unless declared optional: the page has a place for
// each, and Contentful then refuses to publish an entry with one left empty.
// The page would fall back to the shipped value anyway
// (lib/content/site/model.ts, copyFromEntry).
export function toProvisionedType(copyType: CopyType): ProvisionedType {
  return {
    id: copyType.id,
    name: copyType.name,
    description: copyType.description,
    displayField: displayField(copyType),
    fields: Object.entries(copyType.fields).map(([id, field]) => ({
      id,
      name: field.name,
      type: field.kind === 'line' ? 'Symbol' : 'Text',
      required: !field.optional,
      copy: field.kind,
    })),
  }
}

export const CONTENT_TYPES: ProvisionedType[] = [
  ...PUBLICATION_TYPES,
  ...SITE_COPY_TYPES.map(toProvisionedType),
]

// What the editor reads under each copy field. A Text field opens in
// Contentful's Markdown editor by default, whose bold and links the pages do
// not render; the plain multi-line box says what will happen.
const COPY_HELP: Record<CopyKind, string> = {
  line: 'Uma linha.',
  paragraph: 'Um parágrafo. Uma quebra de linha aqui vira uma quebra de linha na página.',
  text: 'Separe os parágrafos com uma linha em branco. Uma quebra de linha simples vira uma quebra de linha na página.',
  list: 'Um item por linha.',
}

const OPTIONAL_HELP = 'Opcional: deixe em branco para não mostrar.'

export function toEditorControl(field: ProvisionedField) {
  if (!field.copy) return null

  return {
    fieldId: field.id,
    widgetNamespace: 'builtin',
    widgetId: field.copy === 'line' ? 'singleLine' : 'multipleLine',
    settings: { helpText: field.required ? COPY_HELP[field.copy] : OPTIONAL_HELP },
  }
}

type Validation = {
  linkMimetypeGroup?: string[]
  unique?: boolean
  regexp?: { pattern: string }
  message?: string
}

export function toCmaField(field: ProvisionedField) {
  const validations: Validation[] = []
  if (field.image) validations.push({ linkMimetypeGroup: ['image'] })
  if (field.pdf) validations.push({ linkMimetypeGroup: ['pdfdocument'] })
  // A publication's address is its URL. Contentful enforces this per content
  // type only, so a cartilha and the caderno can still clash
  // (lib/content/comunicacao.ts, findPublicacao).
  if (field.unique) validations.push({ unique: true })
  if (field.slug) validations.push({ regexp: { pattern: SLUG_PATTERN }, message: SLUG_MESSAGE })

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

export function toCmaContentType(contentType: ProvisionedType) {
  return {
    name: contentType.name,
    description: contentType.description,
    displayField: contentType.displayField,
    fields: contentType.fields.map(toCmaField),
  }
}

// The seeded entry of a copy type: its shipped values as Contentful stores
// them, in the space's default locale. An optional field shipped empty is left
// out, as Contentful stores an empty field.
export function toCmaEntry(copyType: CopyType, locale: string) {
  return {
    fields: Object.fromEntries(
      Object.entries(copyType.fields)
        .filter(([, field]) => field.default !== '')
        .map(([id, field]) => [id, { [locale]: field.default }]),
    ),
  }
}
