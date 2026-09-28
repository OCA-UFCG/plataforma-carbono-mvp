import { describe, expect, it } from 'vitest'
import { pickActiveIndex, triggerLineY, wantedThemes } from '@/lib/territorios/activeSection'

describe('pickActiveIndex', () => {
  it('picks the last section whose top reached the trigger line', () => {
    expect(pickActiveIndex([-900, -200, 300, 1100], 365)).toBe(2)
  })

  it('counts a top exactly on the line as reached', () => {
    expect(pickActiveIndex([-400, 365, 900], 365)).toBe(1)
  })

  it('stays on the first section while none has reached the line', () => {
    expect(pickActiveIndex([500, 1200, 1900], 365)).toBe(0)
    expect(pickActiveIndex([], 365)).toBe(0)
  })

  it('skips a section that is not rendered', () => {
    expect(pickActiveIndex([-300, Number.POSITIVE_INFINITY, 100], 365)).toBe(2)
  })
})

describe('triggerLineY', () => {
  it('sits at 45% of the viewport when nothing covers its top', () => {
    expect(triggerLineY(800, 0)).toBe(360)
  })

  it('falls inside the text left visible below a sticky map', () => {
    // A 812 px phone: 44 px rail plus a 308 px map leave the text from 352 px down.
    expect(triggerLineY(812, 352)).toBeCloseTo(352 + 460 * 0.45)
  })

  it('stays inside the viewport when the cover is off screen or taller than it', () => {
    expect(triggerLineY(800, -50)).toBe(360)
    expect(triggerLineY(400, 520)).toBe(400)
  })
})

describe('wantedThemes', () => {
  it('asks for the next theme from the territory section, which has none of its own', () => {
    expect(wantedThemes('territorio')).toEqual(['estoque'])
  })

  it('asks for a theme section and the one after it, in reading order', () => {
    expect(wantedThemes('uso')).toEqual(['uso', 'degradacao'])
  })

  it('asks only for the rain theme before the summary', () => {
    expect(wantedThemes('chuva')).toEqual(['chuva'])
  })

  it('asks for every theme on the summary', () => {
    expect(wantedThemes('resumo')).toEqual(['estoque', 'fluxo', 'uso', 'degradacao', 'chuva'])
  })
})
