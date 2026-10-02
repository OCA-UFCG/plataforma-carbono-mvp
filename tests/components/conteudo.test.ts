import { describe, expect, it } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ConteudoHeader from '@/components/marketing/conteudo/ConteudoHeader'
import ConteudoSemPdf from '@/components/marketing/conteudo/ConteudoSemPdf'
import type { Publicacao } from '@/lib/content/comunicacao'
import PublicationCard from '@/components/marketing/PublicationCard'
import Comunicacao from '@/components/marketing/Comunicacao'
import RelatedContent from '@/components/marketing/conteudo/RelatedContent'
import { getComunicacaoContent } from '@/lib/content/comunicacao'

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

describe('ConteudoHeader type', () => {
  // Figma 19015:13063 ("Voltar") and I19015:13089;1:95 ("Baixar PDF") set
  // Inter Medium 14/24, which .text-ui-medium carries.
  it('sets Voltar and the mobile Baixar PDF in the UI face', () => {
    const markup = html(ConteudoHeader, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } })

    expect(markup).toMatch(/<a class="[^"]*\btext-ui-medium\b[^"]*" href="\/comunicacao">/)
    expect(markup).not.toMatch(/<a class="[^"]*\btext-body\b[^"]*" href="\/comunicacao">/)
    expect(markup).toMatch(/<a href="https:\/\/x\/v1\.pdf"[^>]*class="[^"]*\btext-ui-medium\b[^"]*">/)
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

describe('PublicationCard', () => {
  it('leads to the publication page, in the same tab', () => {
    const markup = html(PublicationCard, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } })

    expect(markup).toContain('href="/comunicacao/cartilha-1-o-que-e-credito-de-carbono"')
    expect(markup).not.toContain('target="_blank"')
    expect(markup).not.toContain('https://x/v1.pdf')
  })

  it('is a link even without a PDF, and badges only a PDF', () => {
    const markup = html(PublicationCard, { publicacao: PUBLICACAO })

    expect(markup).toContain('href="/comunicacao/cartilha-1-o-que-e-credito-de-carbono"')
    expect(markup).not.toContain('>PDF<')
    expect(html(PublicationCard, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } })).toContain('>PDF<')
  })

  it('is not a link without an address', () => {
    expect(html(PublicationCard, { publicacao: { ...PUBLICACAO, slug: undefined } })).not.toContain('<a')
  })
})

describe('PublicationCard type', () => {
  // Figma 18953:6454 ("PDF") and 18953:6457 (the type chip) set Inter Semi Bold
  // 12/16, which .text-ui-badge carries.
  it('sets the PDF badge and the type chip in the badge face', () => {
    const markup = html(PublicationCard, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } })

    expect(markup).toMatch(/<span id="publicacao-cartilha-0-pdf" class="[^"]*\btext-ui-badge\b[^"]*">PDF<\/span>/)
    expect(markup).toMatch(/<span id="publicacao-cartilha-0-tipo" class="[^"]*\btext-ui-badge\b[^"]*">Cartilha<\/span>/)
  })
})

describe('the landing Comunicação cards', () => {
  it('lead to the publication pages', async () => {
    const markup = html(Comunicacao, { conteudo: await getComunicacaoContent(null) })

    expect(markup).toContain('href="/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga"')
    expect(markup).toContain('href="/comunicacao/cartilha-1-o-que-e-credito-de-carbono"')
    expect(markup).toContain('Ver material')
  })

  // Figma 18862:8580: the cartilha on the left, the caderno on the right.
  it('sets the cartilha before the caderno, as the design orders them', async () => {
    const markup = html(Comunicacao, { conteudo: await getComunicacaoContent(null) })

    expect(markup.indexOf('href="/comunicacao/cartilha-1-o-que-e-credito-de-carbono"')).toBeLessThan(
      markup.indexOf('href="/comunicacao/caderno-mercado-de-carbono-florestal-na-caatinga"'),
    )
  })
})

describe('RelatedContent', () => {
  it('lists one card per related publication under its heading', () => {
    const markup = html(RelatedContent, {
      publicacoes: [PUBLICACAO, { ...PUBLICACAO, key: 'cartilha-1', slug: 'dois', title: 'Dois' }],
    })

    expect(markup).toMatch(/<h2[^>]*>Conteúdos Relacionados<\/h2>/)
    expect(markup.match(/<li/g)).toHaveLength(2)
  })

  it('renders nothing when there is nothing related', () => {
    expect(html(RelatedContent, { publicacoes: [] })).toBe('')
  })
})
