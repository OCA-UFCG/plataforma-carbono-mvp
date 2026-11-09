import type { CSSProperties } from 'react'

/**
 * The `.sr-only` clip of app/globals.css as a style object: kept in the
 * accessibility tree, invisible on screen and on paper. Components that must
 * work in every root layout use this instead of the class, because the (auth)
 * and (relatorio) layouts do not load globals.css.
 */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}
