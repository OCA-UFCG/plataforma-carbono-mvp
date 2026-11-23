// Pure logic behind the home hero's arrows and its rotation, kept out of the
// client component so it can be tested without a DOM.

// The photo `delta` places from `index`, wrapping at both ends: the arrows
// loop, so neither is ever disabled. `delta` may exceed `count`, and `%` alone
// would leave a negative result, hence the second `+ count`.
export function stepPhotoIndex(index: number, delta: number, count: number): number {
  return (((index + delta) % count) + count) % count
}

// Whether the rotation is paused: the visitor's own press of the pause toggle
// when there was one (`null` until then), else their reduced-motion setting,
// so that setting starts the hero paused but a press can still start it.
export function isPaused(choice: boolean | null, reducedMotion: boolean): boolean {
  return choice ?? reducedMotion
}

// Whether the timer may advance the photo: there must be another photo to show,
// and neither keyboard focus inside the hero nor a pause may be holding it.
export function shouldRotate(count: number, focusHeld: boolean, paused: boolean): boolean {
  return count >= 2 && !focusHeld && !paused
}
