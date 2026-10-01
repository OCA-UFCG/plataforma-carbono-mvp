import { describe, expect, it } from 'vitest'
import { keepSlot, slotBefore } from '@/lib/mapa/dropSlot'

const anchors = [
  { id: 'carbono', mid: 100 },
  { id: 'uso_solo', mid: 200 },
  { id: 'ambiente', mid: 300 },
]

describe('slotBefore', () => {
  it('lands in front of the first section whose midpoint is below the pointer', () => {
    expect(slotBefore(150, anchors)).toBe('uso_solo')
    expect(slotBefore(299, anchors)).toBe('ambiente')
  })

  it('reads anything above the first midpoint as the first slot', () => {
    // The search box and Território sit above the first thematic card.
    expect(slotBefore(-40, anchors)).toBe('carbono')
  })

  it('reads anything below the last midpoint as the end', () => {
    expect(slotBefore(301, anchors)).toBeNull()
    expect(slotBefore(10, [])).toBeNull()
  })
})

describe('keepSlot', () => {
  it('keeps the same object while the slot does not change, so React skips the render', () => {
    const slot = { before: 'uso_solo' }
    expect(keepSlot(slot, 'uso_solo')).toBe(slot)
    const end = { before: null }
    expect(keepSlot(end, null)).toBe(end)
  })

  it('gives a new slot when it changes or when there was none', () => {
    expect(keepSlot({ before: 'uso_solo' }, 'ambiente')).toEqual({ before: 'ambiente' })
    expect(keepSlot({ before: 'uso_solo' }, null)).toEqual({ before: null })
    expect(keepSlot(null, 'carbono')).toEqual({ before: 'carbono' })
  })
})
