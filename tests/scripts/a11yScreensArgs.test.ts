import { describe, expect, it } from 'vitest'
import { parseScreensArgs } from '@/scripts/a11y/screensArgs'

describe('parseScreensArgs', () => {
  it('reads a capture with a directory only', () => {
    expect(parseScreensArgs(['capture', 'out'])).toEqual({ command: 'capture', dir: 'out', paths: [], print: false })
  })

  it('reads --print before and after the paths', () => {
    expect(parseScreensArgs(['capture', 'out', '--print', '/login'])).toEqual({
      command: 'capture',
      dir: 'out',
      paths: ['/login'],
      print: true,
    })
    expect(parseScreensArgs(['capture', 'out', '/login', '--print'])).toEqual({
      command: 'capture',
      dir: 'out',
      paths: ['/login'],
      print: true,
    })
  })

  it('reads the paths of a partial capture', () => {
    expect(parseScreensArgs(['capture', 'out', '/login', '/glossario'])).toEqual({
      command: 'capture',
      dir: 'out',
      paths: ['/login', '/glossario'],
      print: false,
    })
  })

  it('rejects an unknown flag and names it', () => {
    const result = parseScreensArgs(['capture', 'before', '--prnt'])
    expect(result).toEqual({ error: expect.stringContaining('--prnt') })
  })

  it('rejects a capture with no directory', () => {
    expect(parseScreensArgs(['capture'])).toEqual({ error: expect.any(String) })
    expect(parseScreensArgs(['capture', '--print'])).toEqual({ error: expect.any(String) })
  })

  it('reads a compare with three directories', () => {
    expect(parseScreensArgs(['compare', 'a', 'b', 'c'])).toEqual({
      command: 'compare',
      beforeDir: 'a',
      afterDir: 'b',
      diffDir: 'c',
    })
  })

  it('rejects a compare with the wrong count of directories', () => {
    expect(parseScreensArgs(['compare', 'a', 'b'])).toEqual({ error: expect.any(String) })
  })

  it('rejects --print on a compare and says it belongs to capture', () => {
    expect(parseScreensArgs(['compare', 'a', 'b', 'c', '--print'])).toEqual({
      error: expect.stringContaining('capture'),
    })
  })

  it('rejects an unknown command', () => {
    expect(parseScreensArgs(['verify', 'a'])).toEqual({ error: expect.stringContaining('verify') })
  })

  it('rejects an empty argv', () => {
    expect(parseScreensArgs([])).toEqual({ error: expect.any(String) })
  })
})
