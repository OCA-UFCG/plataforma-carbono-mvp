import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  LINE_MAX_LENGTH,
  copyDefaults,
  copyFromEntry,
  defineCopy,
  line,
  list,
  optionalLine,
  paragraph,
  parseCopy,
  text,
} from '@/lib/content/site/model'
import { copyQuery, loadSiteCopy } from '@/lib/content/site/fetch'
import { SITE_COPY_TYPES } from '@/lib/content/site/types'

const TIPO = defineCopy({
  id: 'teste',
  name: 'Teste',
  description: 'Tipo de teste.',
  fields: {
    titulo: line('Título', 'Título padrão'),
    texto: paragraph('Texto', 'Texto padrão'),
    corpo: text('Corpo', ['Primeiro parágrafo', 'Segundo, linha 1\nlinha 2']),
    itens: list('Itens', ['um', 'dois']),
    chamada: optionalLine('Chamada'),
  },
})

describe('parseCopy', () => {
  it('reads a text as paragraphs split on blank lines, keeping single line breaks', () => {
    expect(parseCopy('text', 'Um\n\nDois, linha 1\nlinha 2')).toEqual(['Um', 'Dois, linha 1\nlinha 2'])
  })

  it('ignores Windows line breaks, stray spaces and runs of blank lines', () => {
    expect(parseCopy('text', '  Um  \r\n \r\n\r\n\r\nDois\r\n')).toEqual(['Um', 'Dois'])
  })

  it('reads a paragraph as one string, a blank line counting as a line break', () => {
    expect(parseCopy('paragraph', 'Linha 1\n\nLinha 2 ')).toBe('Linha 1\nLinha 2')
  })

  it('reads a list as one item per line, dropping empty lines', () => {
    expect(parseCopy('list', 'um\n\n dois \n')).toEqual(['um', 'dois'])
  })

  it('trims a line', () => {
    expect(parseCopy('line', '  Título ')).toBe('Título')
  })

  it('keeps a no-break space inside a line', () => {
    expect(parseCopy('line', 'os riscos?')).toBe('os riscos?')
  })
})

describe('copyFromEntry', () => {
  it('serves the shipped copy when there is no entry', () => {
    expect(copyDefaults(TIPO)).toEqual({
      titulo: 'Título padrão',
      texto: 'Texto padrão',
      corpo: ['Primeiro parágrafo', 'Segundo, linha 1\nlinha 2'],
      itens: ['um', 'dois'],
      chamada: '',
    })
  })

  it('takes every field the entry has', () => {
    expect(
      copyFromEntry(TIPO, { titulo: 'Novo', texto: 'Outro', corpo: 'A\n\nB', itens: 'x\ny\nz' }),
    ).toEqual({ titulo: 'Novo', texto: 'Outro', corpo: ['A', 'B'], itens: ['x', 'y', 'z'], chamada: '' })
  })

  // An editor clears an optional field to take its element off the page; the
  // API answers the cleared field with null.
  it('keeps an optional field empty when the entry leaves it empty', () => {
    const comChamada = defineCopy({ ...TIPO, fields: { chamada: optionalLine('Chamada', 'Padrão') } })

    expect(copyFromEntry(comChamada, { chamada: null }).chamada).toBe('')
    expect(copyFromEntry(comChamada, { chamada: 'Nova' }).chamada).toBe('Nova')
    expect(copyFromEntry(comChamada, null).chamada).toBe('Padrão')
  })

  // One field cleared by mistake must not blank its neighbours, nor itself.
  it('falls back field by field on a missing, empty or blank value', () => {
    expect(copyFromEntry(TIPO, { titulo: '  ', texto: null, corpo: '\n\n', itens: 7 })).toEqual(
      copyDefaults(TIPO),
    )
    expect(copyFromEntry(TIPO, { titulo: 'Novo' }).titulo).toBe('Novo')
    expect(copyFromEntry(TIPO, { titulo: 'Novo' }).corpo).toEqual(copyDefaults(TIPO).corpo)
  })
})

describe('copyQuery', () => {
  it('selects every field of every type, the oldest entry of each', () => {
    const query = copyQuery({ a: TIPO })

    expect(query).toContain('a: testeCollection(limit: 1, order: sys_firstPublishedAt_ASC, preview: $preview)')
    for (const id of Object.keys(TIPO.fields)) expect(query).toMatch(new RegExp(`^\\s+${id}$`, 'm'))
  })
})

describe('loadSiteCopy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('serves the shipped copy without Contentful and never touches the network', async () => {
    expect(await loadSiteCopy({ a: TIPO }, null)).toEqual({ a: copyDefaults(TIPO) })
  })

  it('serves what Contentful answers, and the shipped copy for a type with no entry yet', async () => {
    const getContent = vi.fn().mockResolvedValue({
      a: { items: [{ titulo: 'Do Contentful' }] },
      b: { items: [] },
    })

    const copy = await loadSiteCopy({ a: TIPO, b: TIPO }, getContent)

    expect(getContent).toHaveBeenCalledOnce()
    expect(copy.a.titulo).toBe('Do Contentful')
    expect(copy.a.itens).toEqual(['um', 'dois'])
    expect(copy.b).toEqual(copyDefaults(TIPO))
  })

  // Deploying before the content types exist in the space makes the GraphQL
  // API reject the query: the page must still render.
  it('serves the shipped copy and logs when the request fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const getContent = vi.fn().mockRejectedValue(new Error('Cannot query field "testeCollection"'))

    expect(await loadSiteCopy({ a: TIPO }, getContent)).toEqual({ a: copyDefaults(TIPO) })
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('the institutional copy', () => {
  it('names every type and field once', () => {
    const ids = SITE_COPY_TYPES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const type of SITE_COPY_TYPES) {
      expect(type.id, type.id).toMatch(/^[a-z][a-zA-Z0-9]*$/)
      expect(type.name, type.id).toBeTruthy()
      expect(type.description, type.id).toBeTruthy()
      // Contentful's limit per content type.
      expect(Object.keys(type.fields).length, type.id).toBeLessThanOrEqual(50)

      const names = Object.values(type.fields).map((f) => f.name)
      expect(new Set(names).size, `${type.id}: repeated field labels`).toBe(names.length)
    }
  })

  // A Symbol holds 256 characters on one line: a longer shipped value could not
  // be seeded into the space.
  it('fits every one-line value in a Contentful Symbol', () => {
    for (const type of SITE_COPY_TYPES) {
      for (const [id, field] of Object.entries(type.fields)) {
        if (field.kind !== 'line') continue
        expect(field.default.length, `${type.id}.${id}`).toBeLessThanOrEqual(LINE_MAX_LENGTH)
        expect(field.default, `${type.id}.${id}`).not.toContain('\n')
      }
    }
  })

  // What the seed writes into the space must read back as what the page ships
  // with, or seeding would change the pages.
  it('reads back the shipped values unchanged', () => {
    for (const type of SITE_COPY_TYPES) {
      for (const [id, field] of Object.entries(type.fields)) {
        const parsed = parseCopy(field.kind, field.default)
        const again = Array.isArray(parsed) ? parsed.join(field.kind === 'list' ? '\n' : '\n\n') : parsed

        expect(again, `${type.id}.${id}`).toBe(field.default)
        if (!field.optional) expect(parsed.length, `${type.id}.${id} is empty`).toBeGreaterThan(0)
      }
    }
  })
})
