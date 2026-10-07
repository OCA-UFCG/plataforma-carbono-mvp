import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import EventoCard from '@/components/marketing/EventoCard'
import Eventos from '@/components/marketing/Eventos'
import { DEFAULT_EVENTOS, type Evento } from '@/lib/content/eventos'

const html = <P extends object>(component: ComponentType<P>, props: P) =>
  renderToStaticMarkup(createElement(component, props))

describe('EventoCard', () => {
  const [evento] = DEFAULT_EVENTOS

  it('renders the badge, the title, the date and place, the text and the caption', () => {
    const markup = html(EventoCard, { evento, data: '17 set 2026' })

    expect(markup).toContain('>Internacional</span>')
    expect(markup).toMatch(/<h3[^>]*>Encontro Brasil e Tunísia<\/h3>/)
    expect(markup).toContain('<time dateTime="2026-09-17">17 set 2026</time> · Museu Interativo do Semiárido, UFCG')
    expect(markup).toContain('Em encontro com a delegação tunisiana do Projeto ReGnR')
    expect(markup).toContain('Fonte: peasa.ufcg.edu.br, 2026')
    expect(markup).toContain('alt="Plateia sentada em um auditório')
  })

  it('starts closed, with a button that opens the text it controls', () => {
    const markup = html(EventoCard, { evento, data: '17 set 2026' })
    const button = markup.match(/<button [^>]*>Mostrar mais<\/button>/)?.[0]
    const controls = button?.match(/aria-controls="([^"]+)"/)?.[1]

    expect(button).toContain('aria-expanded="false"')
    expect(markup).toContain(`<p id="${controls}"`)
  })

  it('leaves out the place and the caption an entry does not have', () => {
    const semLocal: Evento = { ...evento, local: undefined, caption: undefined }
    const markup = html(EventoCard, { evento: semLocal, data: '17 set 2026' })

    expect(markup).toContain('17 set 2026</time></p>')
    expect(markup).not.toContain(' · ')
    expect(markup).not.toContain('Fonte:')
  })
})

describe('Eventos', () => {
  it('lists one card per event under the panel heading', () => {
    const markup = html(Eventos, { eventos: DEFAULT_EVENTOS })

    expect(markup).toMatch(/<h2 id="eventos-heading"[^>]*>Eventos e articulações<\/h2>/)
    expect(markup.match(/<article/g)).toHaveLength(DEFAULT_EVENTOS.length)
    expect(markup).toContain('15 set 2026</time> · Online')
  })
})
