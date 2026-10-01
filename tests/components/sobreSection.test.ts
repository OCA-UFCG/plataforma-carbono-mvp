import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Section, { type SectionProps } from '@/components/marketing/sobre/Section'
import Quote from '@/components/marketing/sobre/Quote'

// createElement takes children as its trailing arguments; the casts tell
// TypeScript that the required `children` prop arrives that way.
const p = (text: string) => createElement('p', { key: text }, text)
const quote = (text: string) =>
  createElement(Quote, { key: text } as { key: string; children: React.ReactNode }, text)
const section = (children: React.ReactNode[]) =>
  renderToStaticMarkup(createElement(Section, { title: 'Título' } as SectionProps, ...children))

describe('Section', () => {
  // Figma 18988:8700 and 18988:8799: the quote is a sibling of the heading
  // and the text in the 8px column, not one of the body's 24px blocks.
  it('sets a closing Quote after the body, in the heading column', () => {
    expect(section([p('Um'), p('Dois'), quote('Destaque')])).toMatch(
      /<div[^>]*><p>Um<\/p><p>Dois<\/p><\/div><p[^>]*>Destaque<\/p><\/section>$/,
    )
  })

  it('keeps every block in the body when nothing closes it', () => {
    expect(section([p('Um'), p('Dois')])).toMatch(/<div[^>]*><p>Um<\/p><p>Dois<\/p><\/div><\/section>$/)
  })

  it('leaves a Quote that does not close the section in the body', () => {
    expect(section([quote('Destaque'), p('Depois')])).toMatch(
      /<div[^>]*><p[^>]*>Destaque<\/p><p>Depois<\/p><\/div><\/section>$/,
    )
  })
})
