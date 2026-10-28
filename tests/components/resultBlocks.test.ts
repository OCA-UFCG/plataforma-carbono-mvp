import { describe, expect, it } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildSiteTheme } from '@/config/mapa/platforms'
import { BarList, Empty, Hero, LayerHeading } from '@/components/mapa/results/blocks'
import Donut from '@/components/mapa/results/Donut'

const theme = buildSiteTheme()
const heading = createElement('span', null, 'Estoque Total')
const withHeading = (child: ReactNode) => renderToStaticMarkup(createElement(LayerHeading.Provider, { value: heading }, child))
const cards = (markup: string) => markup.match(/data-card="[^"]+"/g) ?? []

describe('result blocks', () => {
  it('puts the layer heading, the headline and its figures in one card (Figma 19432:60313)', () => {
    const markup = withHeading(createElement(Hero, {
      theme, value: '2,7', unit: 'Mt C', caption: 'de carbono estocado na área',
      figures: [{ label: 'Por hectare', value: '46,0', aside: 't C/ha' }],
    }))
    expect(cards(markup)).toEqual(['data-card="lead"'])
    const order = ['Estoque Total', '2,7', 'Mt C', 'de carbono estocado na área', 'Por hectare', '46,0', 't C/ha'].map((s) => markup.indexOf(s))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('gives an empty result the heading too, in a card', () => {
    const markup = withHeading(createElement(Empty, { theme, text: 'Sem estoque mapeado nesta área.' }))
    expect(cards(markup)).toEqual(['data-card="lead"'])
    expect(markup).toContain('Estoque Total')
  })

  it('leaves a bare note when there is no layer heading', () => {
    const markup = renderToStaticMarkup(createElement(Empty, { theme, text: 'Clique num município.' }))
    expect(cards(markup)).toEqual([])
    expect(markup).toContain('Clique num município.')
  })

  it('draws a list of bars as its own titled card (Figma 19433:60433)', () => {
    const markup = renderToStaticMarkup(createElement(BarList, {
      theme, title: 'Estoque por fitofisionomia', labelWidth: 24,
      rows: [{ key: 'Ta', label: 'Ta', value: 2.2, color: '#597636', amount: '2,2 Mt C', share: '82,3%' }],
    }))
    expect(cards(markup)).toEqual(['data-card="list"'])
    expect(markup).toContain('Estoque por fitofisionomia')
  })
})

describe('Donut', () => {
  const slices = [
    { nome: 'Biomassa aérea', tc: 27.3, cor: '#4f7a2b' },
    { nome: 'Carbono orgânico do solo', tc: 51.2, cor: '#a8692e' },
  ]

  it('draws one arc per slice and lists them largest first with their share', () => {
    const markup = renderToStaticMarkup(createElement(Donut, { title: 'Estoque por compartimento', slices, total: 78.5 }))
    expect(cards(markup)).toEqual(['data-card="list"'])
    expect(markup.match(/<circle /g)).toHaveLength(2)
    expect(markup.indexOf('Carbono orgânico do solo')).toBeLessThan(markup.indexOf('Biomassa aérea'))
    expect(markup).toContain('65,2%')
    expect(markup).toContain('34,8%')
  })

  it('draws nothing without slices', () => {
    expect(renderToStaticMarkup(createElement(Donut, { title: 'x', slices: [], total: 0 }))).toBe('')
  })
})
