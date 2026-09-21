import type { CSSProperties } from 'react'

/**
 * The map's floating overlays live in the free strip between the Temas panel on
 * the left and the Results panel on the right, measured by `leftEdge` and
 * `rightOffset` in Mapa.tsx. Anything anchored to those two keeps out of the
 * panels on its own; anything centered on the *window* does not, and runs under
 * whichever panel grows.
 *
 * `.3s` matches the transition the anchored controls already use, so opening a
 * panel moves the whole cluster as one.
 */
export function centeredInGutters(leftEdge: number, rightOffset: number): CSSProperties {
  return {
    left: `calc(${leftEdge}px + (100% - ${leftEdge + rightOffset}px) / 2)`,
    transform: 'translateX(-50%)',
    transition: 'left .3s, max-width .3s',
  }
}

/**
 * Widest an overlay may be without entering a panel. `inset` is the breathing
 * room left on each side once the strip gets tight.
 */
export function gutterMaxWidth(leftEdge: number, rightOffset: number, inset = 32): string {
  return `calc(100% - ${leftEdge + rightOffset + inset}px)`
}
