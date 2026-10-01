import { describe, expect, it } from 'vitest'
import { slotBefore } from '@/lib/mapa/dropSlot'

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
