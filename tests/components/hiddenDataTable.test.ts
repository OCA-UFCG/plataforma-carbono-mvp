import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HiddenDataTable, type HiddenDataTableProps } from '@/components/a11y/HiddenDataTable'

const props: HiddenDataTableProps = {
  caption: 'Precipitação anual',
  rowHeader: 'Ano',
  columns: ['Chuva (mm)', 'Classe'],
  rows: [
    { label: '2019', values: ['812', 'normal'] },
    { label: '2020', values: ['540'] },
  ],
}

function render(p: HiddenDataTableProps = props) {
  return renderToStaticMarkup(createElement(HiddenDataTable, p))
}

describe('HiddenDataTable', () => {
  it('names the table and its columns', () => {
    const markup = render()
    expect(markup).toContain('<caption>Precipitação anual</caption>')
    expect(markup).toContain('<th scope="col">Ano</th><th scope="col">Chuva (mm)</th><th scope="col">Classe</th>')
  })

  it('heads each row with its label', () => {
    const markup = render()
    expect(markup).toContain('<th scope="row">2019</th>')
    expect(markup).toContain('<th scope="row">2020</th>')
  })

  it('fills missing values with "sem dado"', () => {
    const markup = render()
    expect(markup).toContain('<th scope="row">2020</th><td>540</td><td>sem dado</td></tr>')
  })

  it('hides the table visually, not from assistive tech', () => {
    const markup = render()
    const outer = markup.match(/^<div[^>]*>/)?.[0] ?? ''
    expect(outer).toContain('width:1px')
    expect(outer).toContain('overflow:hidden')
    expect(markup).not.toContain('aria-hidden')
  })

  it('renders nothing without rows', () => {
    expect(render({ ...props, rows: [] })).toBe('')
  })
})
