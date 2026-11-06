// Caps how many async tasks run at once, starting the rest in arrival order.

/**
 * A runner that keeps at most `max` tasks in flight. A task's slot is freed
 * when it settles, failure included, so one error never stalls the queue.
 *
 * A `signal` cancels a task while it waits: it leaves the queue and rejects
 * with the signal's reason, never taking a slot. Once the task starts it owns
 * its cancellation (a fetch gets the same signal) and the slot frees when it
 * settles.
 */
export function createLimiter(max: number) {
  let active = 0
  const queue: (() => void)[] = []

  const release = () => {
    active--
    queue.shift()?.()
  }

  return function run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason)
        return
      }

      const onAbort = () => {
        const at = queue.indexOf(start)
        if (at >= 0) queue.splice(at, 1)
        reject(signal!.reason)
      }
      const start = () => {
        signal?.removeEventListener('abort', onAbort)
        active++
        // Through a promise, so a task that throws before returning one still
        // frees its slot.
        Promise.resolve().then(task).then(resolve, reject).finally(release)
      }

      if (active < max) {
        start()
      } else {
        signal?.addEventListener('abort', onAbort, { once: true })
        queue.push(start)
      }
    })
  }
}
