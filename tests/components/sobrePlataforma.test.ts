import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AudienceBand from '@/components/marketing/sobre/AudienceBand'
import LimitList from '@/components/marketing/sobre/LimitList'
import Quote, { type QuoteProps } from '@/components/marketing/sobre/Quote'
import MediaText, { type MediaTextProps } from '@/components/marketing/sobre/MediaText'
import Linhas from '@/components/marketing/Linhas'

const count = (markup: string, pattern: RegExp) => (markup.match(pattern) ?? []).length

const PERFIS = ['Comunidades', 'Gestores públicos', 'Pesquisadores', 'Investidores']

// "Para quem é a plataforma?", Figma 19538:11415.
describe('AudienceBand', () => {
  const band = (perfis: string[]) =>
    renderToStaticMarkup(
      createElement(AudienceBand, { titulo: 'Para quem é a plataforma?', perfis, textos: ['Um.', 'Dois.'] }),
    )

  it('renders each audience as a chip in a list', () => {
    const markup = band(PERFIS)
    expect(markup).toMatch(/<ul[^>]*role="list"/)
    expect(count(markup, /<li[^>]*role="listitem"/g)).toBe(4)
    for (const perfil of PERFIS) expect(markup).toContain(`>${perfil}</li>`)
  })

  it('labels the band by its heading', () => {
    const markup = band(PERFIS)
    const labelledBy = markup.match(/<section[^>]*aria-labelledby="([^"]+)"/)?.[1]
    expect(labelledBy).toBeTruthy()
    expect(markup).toContain(`<h2 id="${labelledBy}"`)
  })

  it('draws no list without audiences', () => {
    const markup = band([])
    expect(markup).not.toContain('<ul')
    expect(markup).toContain('<p>Um.</p><p>Dois.</p>')
  })
})

// "O que a plataforma não faz", Figma 19551:11429.
describe('LimitList', () => {
  it('lists each limit with a decorative ✕', () => {
    const markup = renderToStaticMarkup(
      createElement(LimitList, {
        titulo: 'O que a plataforma não faz',
        itens: ['Não vende créditos de carbono', 'Não certifica nem aprova projetos', 'Não substitui reguladores e certificadoras'],
      }),
    )
    expect(markup).toMatch(/<h2[^>]*>O que a plataforma não faz<\/h2>/)
    expect(count(markup, /<li[^>]*role="listitem"/g)).toBe(3)
    expect(count(markup, /<img src="\/icons\/sobre\/close-negativo-24\.svg" alt=""/g)).toBe(3)
  })
})

describe('Quote', () => {
  const quote = (props: Omit<QuoteProps, 'children'>, children: React.ReactNode) =>
    renderToStaticMarkup(createElement(Quote, props as QuoteProps, children))

  it('keeps the body size by default', () => {
    expect(quote({}, 'Destaque')).toContain('text-body')
  })

  // The mission, Figma 19538:11413: one paragraph, an editor's line break
  // kept as a <br>.
  it('sets the large size on request', () => {
    const markup = quote({ size: 'large' }, createElement(Linhas, { texto: 'a\nb' }))
    expect(markup).not.toContain('text-body')
    expect(markup).toMatch(/_large_/)
    expect(count(markup, /<p/g)).toBe(1)
    expect(count(markup, /<br\/>/g)).toBe(1)
  })
})

describe('MediaText', () => {
  const media = (props: Partial<MediaTextProps>) =>
    renderToStaticMarkup(
      createElement(
        MediaText,
        { image: '/x.webp', imageAlt: 'x', imageSide: 'left', ...props } as MediaTextProps,
        createElement('p', null, 'Texto'),
      ),
    )

  // The limits photo, Figma 19551:11428.
  it('draws the wide photo at 464×200', () => {
    expect(media({ imageSize: 'wide' })).toMatch(/<img[^>]*width="464"[^>]*height="200"/)
  })

  // The rebuilt /sobre frame rounds its photos at 8px (19538:11076); the other
  // Sobre frames keep 12px (18988:8817).
  it('rounds at 8px on request', () => {
    expect(media({ imageRadius: 8 })).toMatch(/_radius8_/)
    expect(media({})).not.toMatch(/_radius8_/)
  })
})
