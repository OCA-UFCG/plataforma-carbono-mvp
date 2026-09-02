import { describe, expect, it } from 'vitest'
import { basemaps, cartoTileUrl, defaultBasemapId } from '@/config/mapa/basemaps'

describe('cartoTileUrl', () => {
  it('appends the API key CARTO began requiring on the raster basemaps', () => {
    expect(cartoTileUrl('light_all', 'k3y')).toBe(
      'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=k3y',
    )
  })

  // An empty `key=` is answered with the very same watermarked tile as a
  // request carrying no parameter, so sending one buys nothing.
  it('omits the parameter when no key is configured', () => {
    const bare = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'

    expect(cartoTileUrl('dark_all', undefined)).toBe(bare)
    expect(cartoTileUrl('dark_all', '')).toBe(bare)
    expect(cartoTileUrl('dark_all', '   ')).toBe(bare)
  })

  it('trims the key, tolerating a value pasted with surrounding whitespace', () => {
    expect(cartoTileUrl('light_all', ' k3y\n')).toBe(
      'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=k3y',
    )
  })

  it('escapes the key so a malformed value cannot append query parameters', () => {
    expect(cartoTileUrl('light_all', 'a&b=c')).toBe(
      'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=a%26b%3Dc',
    )
  })
})

describe('basemaps', () => {
  it('keeps the default basemap and its dark counterpart addressable', () => {
    expect(basemaps[defaultBasemapId]).toBeDefined()
    expect(basemaps['carto-dark']).toBeDefined()
  })

  // The watermark reached production because the tile URLs were written by
  // hand. Routing every CARTO basemap through cartoTileUrl is what makes the
  // key reach all of them at once.
  it('builds every CARTO basemap with cartoTileUrl', () => {
    const cartoUrls = Object.values(basemaps)
      .map((b) => b.url)
      .filter((url) => url.includes('cartocdn.com'))

    expect(cartoUrls.length).toBeGreaterThan(0)

    for (const url of cartoUrls) {
      expect(url).toMatch(
        /^https:\/\/basemaps\.cartocdn\.com\/(light|dark)_all\/\{z\}\/\{x\}\/\{y\}\.png(\?key=[^&]+)?$/,
      )
    }
  })

  it('keeps every basemap on https, since the map is served over https', () => {
    for (const b of Object.values(basemaps)) {
      expect(b.url.startsWith('https://')).toBe(true)
    }
  })
})
