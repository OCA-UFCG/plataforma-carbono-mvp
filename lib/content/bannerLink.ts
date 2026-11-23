// The link of a hero banner's button (the `bannerInicio` type's `buttonLink`)
// is typed by an editor and lands in an href, so it is held to one rule in
// two places: Contentful refuses to publish anything else
// (lib/content/site/provision.ts) and the page drops what still gets through
// (lib/content/banners.ts). Free of `server-only`: the provision script loads
// this module under plain tsx.

// A path of this site ("/", "/sobre") or an https address with a host, and no
// whitespace anywhere. "//host" and "/\host" are refused because a browser
// reads both as another host, and whitespace because a browser deletes tab, LF
// and CR anywhere in a URL, turning "/<tab>/host" into "//host". Written
// without a lookahead, which Contentful's validator is not known to support.
export const BANNER_LINK_PATTERN = String.raw`^(/|/[^/\\\s]\S*|https://[^/\\\s]\S*)$`

export const BANNER_LINK_MESSAGE =
  'Use um caminho do site começando com uma barra, como /sobre, ou um endereço completo começando com https://.'

const BANNER_LINK = new RegExp(BANNER_LINK_PATTERN)

// The link to render, or undefined when there is none or it breaks the rule.
export function bannerLink(raw?: string | null): string | undefined {
  const link = raw?.trim()

  return link && BANNER_LINK.test(link) ? link : undefined
}
