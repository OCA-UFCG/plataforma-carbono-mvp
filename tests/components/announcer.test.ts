import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Announcer } from '@/components/a11y/Announcer'

function region(markup: string, id: string) {
  const tag = markup.match(new RegExp(`<div[^>]*id="${id}"[^>]*>(.*?)</div>`))
  if (!tag) throw new Error(`no element with id ${id}`)
  return { tag: tag[0], content: tag[1] }
}

describe('Announcer', () => {
  const markup = renderToStaticMarkup(createElement(Announcer))

  it('renders a polite and an assertive live region', () => {
    const polite = region(markup, 'announcer-polite').tag
    const assertive = region(markup, 'announcer-assertive').tag
    expect(polite).toContain('aria-live="polite"')
    expect(polite).toContain('aria-atomic="true"')
    expect(assertive).toContain('aria-live="assertive"')
    expect(assertive).toContain('aria-atomic="true"')
  })

  it('mounts both regions empty', () => {
    expect(region(markup, 'announcer-polite').content).toBe('')
    expect(region(markup, 'announcer-assertive').content).toBe('')
  })

  it('hides both regions visually', () => {
    for (const id of ['announcer-polite', 'announcer-assertive']) {
      const { tag } = region(markup, id)
      expect(tag).toContain('width:1px')
      expect(tag).toContain('overflow:hidden')
    }
  })

  // Plain live regions are the most reliably spoken; role="alert" would also
  // make screen readers prefix every message with "alert".
  it('gives neither region a role', () => {
    expect(region(markup, 'announcer-polite').tag).not.toContain('role=')
    expect(region(markup, 'announcer-assertive').tag).not.toContain('role=')
  })
})
