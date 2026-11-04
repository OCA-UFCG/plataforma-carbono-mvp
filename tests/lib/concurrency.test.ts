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

  describe('with an abort signal', () => {
    it('never starts a queued task that is aborted, and rejects it', async () => {
      const started: string[] = []
      const run = createLimiter(1)
      const a = deferred(started, 'a')
      const b = deferred(started, 'b')
      const controller = new AbortController()
      const pa = run(a.task)
      const pb = run(b.task, controller.signal)
      await tick()

      const reason = new Error('superseded')
      controller.abort(reason)
      await expect(pb).rejects.toBe(reason)

      a.resolve()
      await pa
      await tick()
      expect(started).toEqual(['a'])
    })

    it('rejects an already aborted task without taking a slot', async () => {
      const started: string[] = []
      const run = createLimiter(1)
      const a = deferred(started, 'a')
      const gone = new AbortController()
      gone.abort()

      await expect(run(a.task, gone.signal)).rejects.toBe(gone.signal.reason)
      expect(started).toEqual([])

      const b = deferred(started, 'b')
      const pb = run(b.task)
      await tick()
      expect(started).toEqual(['b'])
      b.resolve()
      expect(await pb).toBe('b')
    })

    it('keeps its limit and drains the queue after aborts', async () => {
      const run = createLimiter(2)
      let running = 0
      let peak = 0
      const finished: string[] = []
      const work = (name: string) => async () => {
        running++
        peak = Math.max(peak, running)
        await tick()
        running--
        finished.push(name)
        return name
      }

      const controller = new AbortController()
      const kept = ['a', 'b', 'c', 'd'].map((n) => run(work(n)))
      const dropped = ['x', 'y', 'z'].map((n) => run(work(n), controller.signal))
      controller.abort()
      const late = run(work('e'))

      await Promise.allSettled(dropped)
      await expect(Promise.all([...kept, late])).resolves.toEqual(['a', 'b', 'c', 'd', 'e'])
      expect(finished).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect(peak).toBe(2)
    })

    it('leaves a started task to run to its end when the signal aborts later', async () => {
      const started: string[] = []
      const run = createLimiter(1)
      const a = deferred(started, 'a')
      const controller = new AbortController()
      const pa = run(a.task, controller.signal)
      await tick()

      controller.abort()
      a.resolve()
      expect(await pa).toBe('a')
    })
  })
})
