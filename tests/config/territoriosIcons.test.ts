import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { STEP_ICONS, UI_ICONS } from '@/config/territorios/icons'
import { STEP_COLORS } from '@/config/territorios/palette'
import type { StepId } from '@/types/territorios'

const read = (src: string) => readFileSync(path.join(process.cwd(), 'public', src), 'utf8')

/** The root <svg> element's own width and height attributes. */
function rootSize(svg: string): [number, number] {
  const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? ''
  return [Number(root.match(/\swidth="([\d.]+)"/)?.[1]), Number(root.match(/\sheight="([\d.]+)"/)?.[1])]
}

describe('tab icons', () => {
  it('draws each file at its own size, inside the 24 px box at its inset', () => {
    for (const [step, icon] of Object.entries(STEP_ICONS)) {
      expect(rootSize(read(icon.src)), step).toEqual([icon.width, icon.height])
      expect(icon.left + icon.width, step).toBeLessThanOrEqual(24)
      expect(icon.top + icon.height, step).toBeLessThanOrEqual(24)
    }
  })

  it('paints each in its tab color, so icon and title agree', () => {
    for (const [step, icon] of Object.entries(STEP_ICONS)) {
      expect(read(icon.src).toLowerCase(), step).toContain(`fill="${STEP_COLORS[step as StepId]}"`)
    }
  })

  it('ships every interface icon', () => {
    for (const src of Object.values(UI_ICONS)) expect(read(src).startsWith('<svg'), src).toBe(true)
  })
})
