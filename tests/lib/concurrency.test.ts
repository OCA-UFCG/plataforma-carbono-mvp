import { describe, expect, it } from 'vitest'
import { createLimiter } from '@/lib/mapa/concurrency'

/** A task the test settles by hand, recording when it started. */
function deferred(started: string[], name: string) {
  let resolve!: () => void
  let reject!: (e: Error) => void
  const task = () => {
    started.push(name)
    return new Promise<string>((res, rej) => { resolve = () => res(name); reject = rej })
  }
  return { task, resolve: () => resolve(), reject: (e: Error) => reject(e) }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('createLimiter', () => {
  it('runs at most `max` tasks and starts the next as one settles', async () => {
    const started: string[] = []
    const run = createLimiter(2)
    const [a, b, c] = ['a', 'b', 'c'].map((n) => deferred(started, n))
    const pa = run(a.task)
    run(b.task)
    const pc = run(c.task)
    await tick()
    expect(started).toEqual(['a', 'b'])

    a.resolve()
    expect(await pa).toBe('a')
    await tick()
    expect(started).toEqual(['a', 'b', 'c'])
    c.resolve()
    expect(await pc).toBe('c')
  })

  it('frees the slot of a task that fails', async () => {
    const started: string[] = []
    const run = createLimiter(1)
    const a = deferred(started, 'a')
    const b = deferred(started, 'b')
    const pa = run(a.task)
    const pb = run(b.task)
    await tick()
    a.reject(new Error('boom'))
    await expect(pa).rejects.toThrow('boom')
    await tick()
    expect(started).toEqual(['a', 'b'])
    b.resolve()
    expect(await pb).toBe('b')
  })

  it('frees the slot of a task that throws before returning a promise', async () => {
    const run = createLimiter(1)
    await expect(run(() => { throw new Error('sync') })).rejects.toThrow('sync')
    expect(await run(async () => 'next')).toBe('next')
  })
})
