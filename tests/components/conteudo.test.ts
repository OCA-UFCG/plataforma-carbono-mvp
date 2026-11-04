import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ConteudoHeader from '@/components/marketing/conteudo/ConteudoHeader'
import ConteudoSemPdf from '@/components/marketing/conteudo/ConteudoSemPdf'
import type { Publicacao } from '@/lib/content/comunicacao'
import PublicationCard from '@/components/marketing/PublicationCard'
import Publicacoes from '@/components/marketing/Publicacoes'
import Comunicacao from '@/components/marketing/Comunicacao'
import RelatedContent from '@/components/marketing/conteudo/RelatedContent'
import LeitorCarregando from '@/components/marketing/conteudo/LeitorCarregando'
import PdfViewer from '@/components/marketing/conteudo/PdfViewer'
import { getComunicacaoContent } from '@/lib/content/comunicacao'
import type { SiteLocale } from '@/lib/locale'
import { MESSAGES, withIntl } from '@/tests/helpers/intl'

const html = <P extends object>(component: ComponentType<P>, props: P, locale: SiteLocale = 'pt') =>
  renderToStaticMarkup(withIntl(createElement(component, props), locale))

const PUBLICACAO: Publicacao = {
  key: 'cartilha-0',
  slug: 'cartilha-1-o-que-e-credito-de-carbono',
  tipo: 'cartilha',
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

describe('ConteudoHeader in English', () => {
  it('labels the way back, the date and the download in English', () => {
    const markup = html(ConteudoHeader, { publicacao: { ...PUBLICACAO, pdf: 'https://x/v1.pdf' } }, 'en')

    expect(markup).toMatch(/<a[^>]*href="\/comunicacao"[^>]*>.*Back<\/a>/)
    expect(markup).toMatch(/Published: <time datetime="2025-05-14">14 May 2025<\/time>/i)
    expect(markup).toMatch(/>.*Download PDF<\/a>/)
    expect(markup).not.toMatch(/Voltar|Publicado em|Baixar PDF/)
  })

  // The series copy, in the reader's language, as on the landing's card.
  it('describes a cartilha without a description of its own in the reader’s language', () => {
    const semDescricao = { ...PUBLICACAO, description: undefined }

    expect(html(ConteudoHeader, { publicacao: semDescricao })).toContain(MESSAGES.pt.Comunicacao.cartilhaDescription)
    expect(html(ConteudoHeader, { publicacao: semDescricao }, 'en')).toContain(MESSAGES.en.Comunicacao.cartilhaDescription)
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

describe('Publicacoes', () => {
  it('closes the grid on an "Em breve" slot that leads nowhere', () => {
    const markup = html(Publicacoes, { publicacoes: [PUBLICACAO] })
    const items = markup.match(/<li /g) ?? []

    expect(items).toHaveLength(2)
    expect(markup).toMatch(/Em breve<\/p><\/div><\/li><\/ul>/)
    expect(markup.match(/<a /g)).toHaveLength(1)
  })
})

describe('the publication grid in English', () => {
  it('names the type, the heading and the empty slot in English', () => {
    const markup = html(Publicacoes, { publicacoes: [PUBLICACAO, { ...PUBLICACAO, key: 'caderno', tipo: 'caderno' }] }, 'en')

    expect(markup).toMatch(/<h2[^>]*>Content<\/h2>/)
    expect(markup).toContain('>Booklet</span>')
    expect(markup).toContain('>Thematic report</span>')
    expect(markup).toContain('Coming soon</p>')
    expect(markup).not.toMatch(/Cartilha<|Caderno temático|Em breve/)
  })

  it('names the type in Portuguese for a Portuguese reader', () => {
    const markup = html(Publicacoes, { publicacoes: [PUBLICACAO, { ...PUBLICACAO, key: 'caderno', tipo: 'caderno' }] })

    expect(markup).toContain('>Cartilha</span>')
    expect(markup).toContain('>Caderno temático</span>')
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

  // The publications' own titles stay as Contentful has them; the section's
  // labels follow the visitor's language.
  it('labels the section in English for an English visitor', async () => {
    const markup = html(Comunicacao, { conteudo: await getComunicacaoContent(null) }, 'en')

    expect(markup).toMatch(/<h2 [^>]*>Communication<\/h2>/)
    expect(markup).toContain('BOOKLET')
    expect(markup).toContain('THEMATIC REPORT')
    expect(markup).toContain('View material')
    expect(markup).toMatch(/See more<span class="sr-only"> communication materials<\/span>/)
    expect(markup).not.toContain('Ver material')
  })

  // The series copy stands in for a cartilha with no description of its own.
  it('describes a cartilha without a description in the visitor’s language', async () => {
    const conteudo = await getComunicacaoContent(null)
    const semDescricao = { ...conteudo, cartilhas: conteudo.cartilhas.map((c) => ({ ...c, description: undefined })) }

    expect(html(Comunicacao, { conteudo: semDescricao })).toContain(MESSAGES.pt.Comunicacao.cartilhaDescription)
    expect(html(Comunicacao, { conteudo: semDescricao }, 'en')).toContain(MESSAGES.en.Comunicacao.cartilhaDescription)
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

  it('names the heading in English for an English reader', () => {
    expect(html(RelatedContent, { publicacoes: [PUBLICACAO] }, 'en')).toMatch(/<h2[^>]*>Related content<\/h2>/)
  })

  it('renders nothing when there is nothing related', () => {
    expect(html(RelatedContent, { publicacoes: [] })).toBe('')
  })
})

describe('the PDF reader in English', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Rendered on the server only to read its first paint: the reader asks
  // `document` whether it can go fullscreen as it mounts.
  it('labels its controls in English for an English reader', () => {
    vi.stubGlobal('document', { fullscreenEnabled: true })
    const markup = html(PdfViewer, { url: 'https://x/v1.pdf', title: 'T', fileName: 'v1.pdf', cover: '/c.jpg' }, 'en')

    for (const label of ['Page', 'Zoom in', 'Zoom', 'Zoom out', 'Full screen', 'PDF document']) {
      expect(markup, label).toContain(`aria-label="${label}"`)
    }
    expect(markup).toContain('<span class="sr-only">of</span>')
    expect(markup).toMatch(/>.*Download PDF<\/a>/)
    expect(markup).toContain('Loading document…')
    expect(markup).not.toMatch(/Página|Aumentar|Diminuir|Tela cheia|Baixar|Documento PDF|Carregando|>de</)
  })

  it('says it is loading in English while the reader downloads', () => {
    expect(html(LeitorCarregando, {}, 'en')).toContain('Loading document…')
  })
})
