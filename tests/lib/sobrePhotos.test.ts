import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CAATINGA_PESSOAS_IMAGEM } from '@/lib/content/sobre/caatinga'

// The RIFF/WEBP signature, the first chunk and the size of a WebP photo in
// public/. A photo here must be a simple lossy file, one 'VP8 ' chunk: that
// format has no room for EXIF, so no phone metadata (GPS included) can ride
// along. Its frame header keeps the width and height in bytes 26-29, 14 bits
// each.
function webp(src: string): { format: string; width: number; height: number } {
  const buf = readFileSync(path.join(process.cwd(), 'public', src))
  return {
    format: `${buf.toString('ascii', 0, 4)}/${buf.toString('ascii', 8, 16)}`,
    width: buf.readUInt16LE(26) & 0x3fff,
    height: buf.readUInt16LE(28) & 0x3fff,
  }
}

describe('Sobre photos', () => {
  // The landing's house photo, cropped to the tighter window the design's
  // fill shows (18988:8735); its original carries GPS coordinates, which the
  // simple 'VP8 ' format cannot hold.
  it('gives "Um bioma de natureza e pessoas" its own crop at 2x its 298x219 frame, without metadata', () => {
    expect(CAATINGA_PESSOAS_IMAGEM.src).toBe('/images/sobre/natureza-pessoas.webp')
    expect(webp(CAATINGA_PESSOAS_IMAGEM.src)).toEqual({ format: 'RIFF/WEBPVP8 ', width: 596, height: 438 })
  })
})
