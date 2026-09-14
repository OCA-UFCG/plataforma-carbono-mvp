// Cache-busting for the vector recortes, client side only.
//
// `next.config.ts` once served /data/vector/* as
// `max-age=86400, stale-while-revalidate=604800`. That header is gone, but it
// cannot be taken back from the browsers that already stored a response under
// it: such an entry stays fresh for a day without the browser asking anything,
// and usable-while-stale for a week after that. Every client that loaded the
// map before the properties were enriched therefore kept serving itself a
// GeoJSON with no `name_state` -- the recorte still drew, because the geometry
// was unchanged, but every state came out named "Estados", the layer-name
// fallback in MapView and the search found none of them. A redeploy does not
// fix it: the stale copy lives in the browser, not on the server.
//
// A query string is the one lever that reaches those entries, because it is
// part of the browser's cache key and of nothing else. In particular it never
// reaches the filesystem: `layer.url` is also the path the server reads from
// disk (`path.join(process.cwd(), 'public', layer.url)` in recorteRegistry and
// clipRegistry), and those keep using the bare value. That double duty is why
// versioning the URLs themselves was rejected when the header was fixed.
//
// This does NOT have to be bumped when the data changes. `public, no-cache`
// stores the file and revalidates it on every use, so from now on an edited
// GeoJSON is picked up on the next load by way of the ETag. The version exists
// only to step around the entries poisoned by the old header, which is a
// one-time transition -- bumping it again would just cost everyone a full
// re-download of ~4.85 MB for nothing.
const VECTOR_DATA_VERSION = '2'

/**
 * The URL a browser should fetch a recorte from. Server-side readers want
 * `layer.url` itself, not this.
 */
export function vectorDataUrl(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}v=${VECTOR_DATA_VERSION}`
}
