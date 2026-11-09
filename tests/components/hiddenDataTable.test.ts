import { describe, expect, it } from 'vitest'
import { createElement, isValidElement, type ReactNode } from 'react'
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

/** Keys that more than one sibling of the same list carries, anywhere in the tree. */
function repeatedKeys(node: ReactNode): string[] {
  if (Array.isArray(node)) {
    const keys = node.flatMap((child) => (isValidElement(child) && child.key !== null ? [String(child.key)] : []))
    return [...keys.filter((key, i) => keys.indexOf(key) !== i), ...node.flatMap(repeatedKeys)]
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return typeof node.type === 'function' ? repeatedKeys((node.type as (p: unknown) => ReactNode)(node.props)) : repeatedKeys(node.props.children)
  }
  return []
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

  it('reads an empty or blank value as missing, not as an empty cell', () => {
    const markup = render({ ...props, rows: [{ label: '2021', values: ['', '  '] }] })
    expect(markup).toContain('<th scope="row">2021</th><td>sem dado</td><td>sem dado</td></tr>')
  })

  it('keeps rows and columns apart when their labels repeat', () => {
    const repeated: HiddenDataTableProps = {
      caption: 'Chuva por mês',
      rowHeader: 'Mês',
      columns: ['mm', 'mm'],
      rows: [
        { label: 'Janeiro', values: ['10', '11'] },
        { label: 'Janeiro', values: ['20', '21'] },
      ],
    }
    expect(repeatedKeys(HiddenDataTable(repeated))).toEqual([])
    const markup = render(repeated)
    for (const value of ['10', '11', '20', '21']) expect(markup).toContain(`<td>${value}</td>`)
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
