import type { Metadata } from 'next'

// The tab icon of every route group: the Caativar symbol, the hexagon and tree
// of the header's lockup. public/logos/caativar-simbolo.svg is that lockup's
// first nine paths copied unchanged from public/logos/caativar.svg (the other
// eight draw "Caativar"), framed by a square viewBox around the hexagon's
// stroke. The 32px PNG is the same SVG rasterized with sharp, for browsers
// that show no SVG in the tab; listing it first, with a size, lets those that
// do still pick the SVG.
export const FAVICON: Metadata['icons'] = {
  icon: [
    { url: '/logos/caativar-simbolo-32.png', sizes: '32x32', type: 'image/png' },
    { url: '/logos/caativar-simbolo.svg', type: 'image/svg+xml' },
  ],
}
