import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import FigureCard, { FigureList, type FigureCardProps } from '@/components/marketing/sobre/FigureCard'

const card = (props: FigureCardProps) => renderToStaticMarkup(createElement(FigureCard, props))
const count = (markup: string, pattern: RegExp) => (markup.match(pattern) ?? []).length

// The Sobre figure card, Figma "Cards sobre" (19406:47719, 19407:47762,
// 19408:47968).
describe('FigureCard', () => {
  const removal = card({ label: 'Remoção de GEE', value: '410 Mt CO₂eq', description: 'removidos em 2022' })

  it('sets the unit apart from the number', () => {
    expect(removal).toMatch(/>410<\/span><span[^>]*>Mt CO₂eq<\/span>/)
  })

  it('reads the figure as typed, with its description, to assistive tech', () => {
    expect(removal).toContain('<span class="sr-only">410 Mt CO₂eq removidos em 2022</span>')
  })

  // The law cards (19408:47968) hold a label and a figure, nothing else.
  it('draws no unit, description or bar it was not given', () => {
    const law = card({ label: 'Créditos de remoção', value: 'mín. 50%' })
    expect(count(law, /<span/g)).toBe(2)
    expect(count(law, /<p/g)).toBe(2)
    expect(law).not.toContain('barra-seta.svg')
  })

  it('fills the bar to the given share, ending on the arrowhead', () => {
    const efficiency = card({ label: 'Eficiência de carbono', value: 'Até 58%', bar: 58 })
    expect(efficiency).toContain('--fill:0.58')
    expect(efficiency).toContain('/icons/sobre/barra-seta.svg')
  })
})

describe('FigureList', () => {
  it('lists each card in its own item', () => {
    const markup = renderToStaticMarkup(
      createElement(
        FigureList,
        null,
        createElement(FigureCard, { key: 'a', label: 'Armazenamento', value: '125 tC/ha' }),
        createElement(FigureCard, { key: 'b', label: 'Capacidade de remoção', value: '1,5 a 5 tCO₂/ha/ano' }),
      ),
    )
    expect(markup).toMatch(/^<ul [^>]*role="list"/)
    expect(count(markup, /<li role="listitem"/g)).toBe(2)
  })
})
