// Caps how many async tasks run at once, starting the rest in arrival order.

/**
 * A runner that keeps at most `max` tasks in flight. A task's slot is freed
 * when it settles, failure included, so one error never stalls the queue.
 */
export function createLimiter(max: number) {
  let active = 0
  const queue: (() => void)[] = []

  const release = () => {
    active--
    queue.shift()?.()
  }

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        active++
        // Through a promise, so a task that throws before returning one still
        // frees its slot.
        Promise.resolve().then(task).then(resolve, reject).finally(release)
      }
      if (active < max) start()
      else queue.push(start)
    })
  }
}
