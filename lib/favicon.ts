import type { Metadata } from 'next'

// The tab icon of every route group: the Caativar symbol, the hexagon and tree
// of the lockup in public/logos/caativar.svg. public/logos/caativar-simbolo.svg
// is that file's symbol elements (the mask onwards) under a square viewBox
// fitted to the hexagon's 71.4x71.2 extent. The 32px PNG is the same SVG
// rasterized with rsvg-convert, for browsers that show no SVG in the tab;
// listing it first, with a size, lets those that do still pick the SVG.
export const FAVICON: Metadata['icons'] = {
  icon: [
    { url: '/logos/caativar-simbolo-32.png', sizes: '32x32', type: 'image/png' },
    { url: '/logos/caativar-simbolo.svg', type: 'image/svg+xml' },
  ],
}
