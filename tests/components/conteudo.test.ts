import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ConteudoHeader from '@/components/marketing/conteudo/ConteudoHeader'
import ConteudoSemPdf from '@/components/marketing/conteudo/ConteudoSemPdf'
import type { Publicacao } from '@/lib/content/comunicacao'

const html = <P extends object>(component: ComponentType<P>, props: P) =>
  renderToStaticMarkup(createElement(component, props))

const PUBLICACAO: Publicacao = {
  key: 'cartilha-0',
  slug: 'cartilha-1-o-que-e-credito-de-carbono',
  tipo: 'Cartilha',
  title: 'O que é crédito de carbono?',
  description: 'Uma cartilha introdutória.',
  publicationDate: '2025-05-14T00:00:00.000Z',
  cover: '/images/cartilhas/vol1.jpg',
}

describe('ConteudoHeader', () => {
  it('renders the title as the page heading, the description and Voltar', () => {
    const markup = html(ConteudoHeader, { publicacao: PUBLICACAO })

    expect(markup).toMatch(/<h1[^>]*>O que é crédito de carbono\?<\/h1>/)
    expect(markup).toContain('Uma cartilha introdutória.')
    expect(markup).toMatch(/<a[^>]*href="\/comunicacao"[^>]*>.*Voltar<\/a>/)
  })

  it('shows the publication date only when there is one', () => {
    // Case-insensitive: whether React prints the attribute as dateTime or
    // datetime is its business, and HTML does not care.
    expect(html(ConteudoHeader, { publicacao: PUBLICACAO })).toMatch(
      /Publicado em: <time datetime="2025-05-14">14\/05\/25<\/time>/i,
    )
    expect(html(ConteudoHeader, { publicacao: { ...PUBLICACAO, publicationDate: undefined } })).not.toContain(
      'Publicado em',
    )
  })

  it('offers the mobile download only when there is a PDF', () => {
    expect(html(ConteudoHeader, { publicacao: PUBLICACAO })).not.toContain('Baixar PDF')
    expect(html(ConteudoHeader, { publicacao: { ...PUBLICACAO, pdf: 'https://assets.ctfassets.net/v1.pdf' } })).toMatch(
      /<a[^>]*href="https:\/\/assets\.ctfassets\.net\/v1\.pdf"[^>]*>.*Baixar PDF<\/a>/,
    )
  })
})

describe('ConteudoSemPdf', () => {
  it('shows the title and the cover, with nothing to download', () => {
    const markup = html(ConteudoSemPdf, { publicacao: PUBLICACAO })

    expect(markup).toContain('O que é crédito de carbono?')
    expect(markup).toContain('src="/images/cartilhas/vol1.jpg"')
    expect(markup).not.toContain('Baixar PDF')
  })
})
