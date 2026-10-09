import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_EVENTOS, EVENTOS_QUERY, formatEventoDate, getEventos } from '@/lib/content/eventos'

function clientReturning(payload: unknown, queries: string[] = []) {
  return (async (query: string) => {
    queries.push(query)
    return payload
  }) as <T>(query: string) => Promise<T>
}

const PUBLISHED = {
  eventoCollection: {
    items: [
      {
        categoria: 'Comunidade',
        title: 'Oficina em Sumé',
        date: '2026-10-02T00:00:00.000Z',
        local: null,
        description: 'Oficina sobre o mercado de carbono com a associação local.',
        photo: { url: 'https://images.ctfassets.net/sume.jpg' },
        photoAlt: 'Participantes em roda durante a oficina',
        caption: null,
      },
    ],
  },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getEventos', () => {
  it('serves the design events without Contentful, newest first', async () => {
    const eventos = await getEventos(null)

    expect(eventos).toBe(DEFAULT_EVENTOS)
    expect(eventos.map((e) => e.title)).toEqual([
      'Encontro Brasil e Tunísia',
      'Reunião com o Ministério dos Povos Indígenas',
    ])
    expect(eventos.map((e) => e.date)).toEqual([...eventos.map((e) => e.date)].sort().reverse())
    for (const evento of eventos) expect(evento.photo).toMatch(/^\/images\/eventos\/.+\.jpg$/)
  })

  it('maps the published entries, with unset fields as undefined', async () => {
    const queries: string[] = []

    expect(await getEventos(clientReturning(PUBLISHED, queries))).toEqual([
      {
        categoria: 'Comunidade',
        title: 'Oficina em Sumé',
        date: '2026-10-02T00:00:00.000Z',
        local: undefined,
        description: 'Oficina sobre o mercado de carbono com a associação local.',
        photo: 'https://images.ctfassets.net/sume.jpg',
        photoAlt: 'Participantes em roda durante a oficina',
        caption: undefined,
      },
    ])
    expect(queries).toEqual([EVENTOS_QUERY])
    expect(EVENTOS_QUERY).toContain('eventoCollection(order: date_DESC')
  })

  it('drops an entry missing what the card cannot do without', async () => {
    const [completo] = PUBLISHED.eventoCollection.items
    const incompletos = ['categoria', 'title', 'date', 'description', 'photo', 'photoAlt'].map(
      (campo) => ({ ...completo, [campo]: null }),
    )

    const eventos = await getEventos(
      clientReturning({ eventoCollection: { items: [...incompletos, null, completo] } }),
    )

    expect(eventos.map((e) => e.title)).toEqual(['Oficina em Sumé'])
  })

  it('falls back to the design events when none is published', async () => {
    expect(await getEventos(clientReturning({ eventoCollection: { items: [] } }))).toBe(DEFAULT_EVENTOS)
    expect(await getEventos(clientReturning({}))).toBe(DEFAULT_EVENTOS)
  })

  // A space not yet provisioned with `evento` answers this query with an
  // error; only this tab falls back.
  it('falls back to the design events when the request fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = (async () => {
      throw new Error('Unknown type "EventoCollection"')
    }) as <T>(query: string) => Promise<T>

    expect(await getEventos(failing)).toBe(DEFAULT_EVENTOS)
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('formatEventoDate', () => {
  it('writes the day, the month abbreviated in Portuguese and the year, as the design does', () => {
    expect(formatEventoDate('2026-09-17')).toBe('17 set 2026')
    expect(formatEventoDate('2026-03-05T00:00:00.000Z')).toBe('5 mar 2026')
    expect(formatEventoDate('2026-12-31T21:00:00.000-03:00')).toBe('31 dez 2026')
  })

  it('keeps the calendar day of a UTC midnight', () => {
    expect(formatEventoDate('2026-01-01T00:00:00.000Z')).toBe('1 jan 2026')
  })

  it('answers null for a missing or malformed date', () => {
    for (const value of [undefined, null, '', 'ontem', '2026-13-01', '2026-00-10', '2026-02-00']) {
      expect(formatEventoDate(value), String(value)).toBeNull()
    }
  })
})
