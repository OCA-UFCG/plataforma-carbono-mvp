// Pure logic behind the home hero's previous/next arrows, kept out of the
// client component so it can be tested without a DOM.

// The photo `delta` places from `index`, wrapping at both ends: the arrows
// loop, so neither is ever disabled. `delta` may exceed `count`, and `%` alone
// would leave a negative result, hence the second `+ count`.
export function stepPhotoIndex(index: number, delta: number, count: number): number {
  return (((index + delta) % count) + count) % count
}
