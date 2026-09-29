import { describe, expect, it } from 'vitest'
import { shouldStepBack } from '@/lib/marketing/backNavigation'

const PAGE = 'https://caativar.test/comunicacao/cartilha-1-o-que-e-credito-de-carbono'

describe('shouldStepBack', () => {
  it('steps back after a navigation within the site', () => {
    expect(shouldStepBack({ initialUrl: 'https://caativar.test/', currentUrl: PAGE, referrer: '', historyLength: 3 })).toBe(true)
  })

  it('steps back to a page of this site that loaded this one', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: 'https://caativar.test/mapa', historyLength: 2 })).toBe(true)
  })

  it('stays on the link for a direct visit', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: '', historyLength: 1 })).toBe(false)
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: '', historyLength: 4 })).toBe(false)
  })

  it('stays on the link when an external page sent the visitor', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: 'https://www.google.com/', historyLength: 2 })).toBe(false)
  })

  it('stays on the link after the login redirect, which replaced its own entry', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: 'https://caativar.test/login?next=%2F', historyLength: 2 })).toBe(false)
    expect(shouldStepBack({ initialUrl: 'https://caativar.test/login', currentUrl: PAGE, referrer: '', historyLength: 2 })).toBe(false)
  })

  it('stays on the link when the referrer cannot be read', () => {
    expect(shouldStepBack({ initialUrl: PAGE, currentUrl: PAGE, referrer: 'not a url', historyLength: 2 })).toBe(false)
  })
})
