import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useUrlTabs } from '@/components/marketing/useUrlTabs'

// The tests run without a DOM: the hook is rendered once on the server, its
// refs are filled by hand, and window carries only what the hook touches.
const IDS = ['a', 'b', 'c'] as const

function setup() {
  let tabs!: ReturnType<typeof useUrlTabs<(typeof IDS)[number]>>
  const Probe = () => {
    tabs = useUrlTabs(IDS, (current, id) => `${current.pathname}?aba=${id}`)
    return null
  }
  renderToStaticMarkup(createElement(Probe))

  const el = Object.fromEntries(IDS.map((id) => [id, { focus: vi.fn() }])) as Record<
    (typeof IDS)[number],
    { focus: ReturnType<typeof vi.fn> }
  >
  for (const id of IDS) tabs.tabRef(id)(el[id] as unknown as HTMLButtonElement)

  const replaceState = vi.fn()
  vi.stubGlobal('window', { location: { href: 'https://caativar.example/pagina' }, history: { replaceState } })

  const press = (key: string, on: (typeof IDS)[number]) => {
    const preventDefault = vi.fn()
    tabs.handleKeyDown({ key, currentTarget: el[on], preventDefault } as never)
    return preventDefault
  }
  return { tabs, el, replaceState, press }
}

afterEach(() => vi.unstubAllGlobals())

describe('useUrlTabs', () => {
  it('writes the tab into the address with a null history state', () => {
    const { tabs, replaceState } = setup()

    tabs.select('b')
    expect(replaceState).toHaveBeenCalledWith(null, '', '/pagina?aba=b')
  })

  it('moves from the tab that got the key, not from the open one', () => {
    // Two quick presses: the second lands on "b", already focused, before the
    // address the first one wrote has reached the page.
    const { el, replaceState, press } = setup()

    press('ArrowRight', 'a')
    press('ArrowRight', 'b')
    expect(replaceState.mock.calls.map(([, , url]) => url)).toEqual(['/pagina?aba=b', '/pagina?aba=c'])
    expect(el.c.focus).toHaveBeenCalled()
  })

  it('wraps around with the arrows and jumps with Home and End', () => {
    const { replaceState, press } = setup()
    const last = () => replaceState.mock.lastCall?.[2]

    press('ArrowRight', 'c')
    expect(last()).toBe('/pagina?aba=a')
    press('ArrowLeft', 'a')
    expect(last()).toBe('/pagina?aba=c')
    press('Home', 'b')
    expect(last()).toBe('/pagina?aba=a')
    press('End', 'b')
    expect(last()).toBe('/pagina?aba=c')
  })

  it('leaves every other key alone', () => {
    const { replaceState, press } = setup()

    expect(press('Tab', 'a')).not.toHaveBeenCalled()
    expect(replaceState).not.toHaveBeenCalled()
  })
})
