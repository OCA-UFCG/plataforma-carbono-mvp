import type { Metadata } from 'next'

// The tab icon of every route group: the Caativar symbol, the hexagon and tree
// of the design's current lockup (Figma 19268:13635 on "Área trabalho").
// public/logos/caativar-simbolo.svg is that lockup's symbol group (19268:13651)
// as Figma exports it, with only the root changed: a square viewBox, padded
// 0.326 above and below the 237.025x236.373 export. The 32px PNG is the same
// SVG rasterized with sharp, for browsers that show no SVG in the tab; listing
// it first, with a size, lets those that do still pick the SVG.
export const FAVICON: Metadata['icons'] = {
  icon: [
    { url: '/logos/caativar-simbolo-32.png', sizes: '32x32', type: 'image/png' },
    { url: '/logos/caativar-simbolo.svg', type: 'image/svg+xml' },
  ],
}
