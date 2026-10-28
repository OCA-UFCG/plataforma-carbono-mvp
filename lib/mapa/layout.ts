// Geometry of the platform's docked layout (Figma 19413:54279 and 19451:60959):
// under the site header, a row of columns, each side column 382px of the
// 1436px frame and the map taking the rest.

/** Width of each side column: the layer panel, the ficha and the results. */
export const COLUMN_WIDTH = 382

/**
 * How far the map's own controls sit from its edges: the "‹" button that
 * collapses the panel fills this strip on the left, and the "Resultado" button,
 * the controls and the legend keep it on the right. Mapa.tsx hands it to
 * MapView as both `leftEdge` and `rightOffset`, so the floating overlays and
 * the fit to a selected recorte stay clear of them.
 */
export const MAP_INSET = 40

/**
 * Width the "Resultado" button (125px) and its 16px gap take out of the top
 * of the map, right of the strip the search bar centers in. Only the search
 * bar reads it: it is the one overlay that opens across the top.
 */
export const RESULT_BUTTON_SPAN = 141
