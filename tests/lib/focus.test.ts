import { describe, expect, it } from 'vitest'
import { focusFirst } from '@/lib/a11y/focus'

// Fake elements share a fake document, whose activeElement moves only when an
// element really takes focus: a hidden, inert or display:none element ignores
// focus() without throwing, which `takesFocus: false` stands in for.
function fakeDoc() {
  return { activeElement: null as unknown }
}

function fakeEl(
  doc: { activeElement: unknown },
  o: { connected?: boolean; disabled?: boolean; takesFocus?: boolean; ariaDisabled?: boolean } = {},
) {
  const el = {
    isConnected: o.connected ?? true,
    ownerDocument: doc,
    calls: [] as unknown[],
    matches: (sel: string) => sel === ':disabled' && Boolean(o.disabled),
    getAttribute: (name: string) => (name === 'aria-disabled' && o.ariaDisabled ? 'true' : null),
    focus(options?: FocusOptions) {
      el.calls.push(options)
      if (o.takesFocus ?? true) doc.activeElement = el
    },
  }
  return el as unknown as HTMLElement & { calls: unknown[] }
}

describe('focusFirst', () => {
  it('focuses the first connected, enabled candidate', () => {
    const doc = fakeDoc()
    const first = fakeEl(doc)
    const second = fakeEl(doc)
    expect(focusFirst([first, second])).toBe(first)
    expect(doc.activeElement).toBe(first)
    expect(second.calls).toHaveLength(0)
  })

  it('skips null, undefined and unmounted candidates', () => {
    const doc = fakeDoc()
    const unmounted = fakeEl(doc, { connected: false })
    const target = fakeEl(doc)
    expect(focusFirst([null, undefined, unmounted, target])).toBe(target)
    expect(unmounted.calls).toHaveLength(0)
  })

  it('skips disabled candidates', () => {
    const doc = fakeDoc()
    const disabled = fakeEl(doc, { disabled: true })
    const target = fakeEl(doc)
    expect(focusFirst([disabled, target])).toBe(target)
    expect(disabled.calls).toHaveLength(0)
  })

  // aria-disabled exists to keep a busy control focusable (spec §6 A.2).
  it('keeps aria-disabled candidates eligible', () => {
    const doc = fakeDoc()
    const busy = fakeEl(doc, { ariaDisabled: true })
    expect(focusFirst([busy, fakeEl(doc)])).toBe(busy)
  })

  it('falls through when focus does not land', () => {
    const doc = fakeDoc()
    const hidden = fakeEl(doc, { takesFocus: false })
    const target = fakeEl(doc)
    expect(focusFirst([hidden, target])).toBe(target)
    expect(hidden.calls).toHaveLength(1)
  })

  it('passes the focus options through', () => {
    const doc = fakeDoc()
    const target = fakeEl(doc)
    focusFirst([target], { preventScroll: true })
    expect(target.calls).toEqual([{ preventScroll: true }])
  })

  it('returns null when no candidate takes focus', () => {
    const doc = fakeDoc()
    expect(focusFirst([null, fakeEl(doc, { disabled: true }), fakeEl(doc, { takesFocus: false })])).toBeNull()
    expect(focusFirst([])).toBeNull()
  })
})
