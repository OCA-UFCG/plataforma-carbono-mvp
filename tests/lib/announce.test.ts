import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANNOUNCER_IDS, ANNOUNCE_CLEAR_MS, ANNOUNCE_DELAY_MS, announce } from '@/lib/a11y/announce'

// Two fake regions stand in for the ones <Announcer /> mounts in every root
// layout; the tests read what a screen reader would be handed.
let regions: Record<string, { textContent: string }>

beforeEach(() => {
  vi.useFakeTimers()
  regions = { [ANNOUNCER_IDS.polite]: { textContent: '' }, [ANNOUNCER_IDS.assertive]: { textContent: '' } }
  vi.stubGlobal('document', { getElementById: (id: string) => regions[id] ?? null })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('announce', () => {
  it('speaks in the polite region by default', () => {
    announce('Camada carregada')
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
    expect(regions[ANNOUNCER_IDS.assertive].textContent).toBe('')
  })

  it('speaks urgent text in the assertive region', () => {
    announce('Não foi possível carregar a camada.', 'assertive')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.assertive].textContent).toBe('Não foi possível carregar a camada.')
  })

  it('repeats identical text', () => {
    regions[ANNOUNCER_IDS.polite].textContent = 'Camada carregada'
    announce('Camada carregada')
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
  })

  it('keeps only the latest of calls made within the delay', () => {
    announce('Carregando')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS / 2)
    announce('Camada carregada')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS / 2)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
  })

  it('empties the region once the text has had time to be spoken', () => {
    announce('Camada carregada')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    vi.advanceTimersByTime(ANNOUNCE_CLEAR_MS - 1)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
    vi.advanceTimersByTime(1)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
  })

  it('does not let an earlier text\'s clearing cut a later one short', () => {
    announce('Carregando')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS + ANNOUNCE_CLEAR_MS - 10)
    announce('Camada carregada')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
    vi.advanceTimersByTime(ANNOUNCE_CLEAR_MS - 1)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
    vi.advanceTimersByTime(1)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
  })

  it('clears each region on its own', () => {
    announce('Camada carregada')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    announce('Não foi possível carregar a camada.', 'assertive')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS + ANNOUNCE_CLEAR_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('')
    expect(regions[ANNOUNCER_IDS.assertive].textContent).toBe('')
  })

  it('ignores blank text', () => {
    regions[ANNOUNCER_IDS.polite].textContent = 'Camada carregada'
    announce('   ')
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    expect(regions[ANNOUNCER_IDS.polite].textContent).toBe('Camada carregada')
  })

  it('does nothing without the regions or without a document', () => {
    vi.stubGlobal('document', { getElementById: () => null })
    expect(() => {
      announce('x')
      vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    }).not.toThrow()
    vi.stubGlobal('document', undefined)
    expect(() => {
      announce('x')
      vi.advanceTimersByTime(ANNOUNCE_DELAY_MS)
    }).not.toThrow()
  })
})
