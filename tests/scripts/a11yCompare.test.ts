import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'
import { compareScreens } from '@/scripts/a11y/compare'

let root: string | undefined

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

function dirs() {
  root = mkdtempSync(path.join(tmpdir(), 'a11y-compare-'))
  const made = { before: path.join(root, 'before'), after: path.join(root, 'after'), diff: path.join(root, 'diff') }
  mkdirSync(made.before)
  mkdirSync(made.after)
  return made
}

function writePng(dir: string, name: string, fill: [number, number, number, number]) {
  const png = new PNG({ width: 2, height: 2 })
  for (let i = 0; i < png.data.length; i += 4) png.data.set(fill, i)
  writeFileSync(path.join(dir, name), PNG.sync.write(png))
}

function run(d: ReturnType<typeof dirs>) {
  const lines: string[] = []
  const code = compareScreens(d.before, d.after, d.diff, (line) => lines.push(line))
  return { code, out: lines.join('\n') }
}

describe('compareScreens', () => {
  it('passes when every screenshot is identical', () => {
    const d = dirs()
    writePng(d.before, 'home.png', [1, 2, 3, 255])
    writePng(d.after, 'home.png', [1, 2, 3, 255])
    const { code, out } = run(d)
    expect(code).toBe(0)
    expect(out).toContain('screens: 1 route(s) identical.')
  })

  it('fails and writes a diff when pixels differ', () => {
    const d = dirs()
    writePng(d.before, 'home.png', [1, 2, 3, 255])
    writePng(d.after, 'home.png', [1, 2, 4, 255])
    const { code, out } = run(d)
    expect(code).toBe(1)
    expect(out).toContain('home.png: 4 differing pixel(s)')
    expect(existsSync(path.join(d.diff, 'home.png'))).toBe(true)
  })

  it('fails when the after directory lacks a screenshot', () => {
    const d = dirs()
    writePng(d.before, 'home.png', [1, 2, 3, 255])
    const { code, out } = run(d)
    expect(code).toBe(1)
    expect(out).toContain('home.png: missing from')
  })

  it('fails when the before directory holds no screenshots, rather than comparing nothing', () => {
    const d = dirs()
    writePng(d.after, 'home.png', [1, 2, 3, 255])
    const { code, out } = run(d)
    expect(code).toBe(1)
    expect(out).toMatch(/no screenshots/)
    expect(out).not.toContain('identical')
  })

  it('fails with a message, not an exception, when a directory does not exist', () => {
    const d = dirs()
    writePng(d.before, 'home.png', [1, 2, 3, 255])
    rmSync(d.after, { recursive: true })
    const { code, out } = run(d)
    expect(code).toBe(1)
    expect(out).toContain(`${d.after} does not exist`)
  })
})
