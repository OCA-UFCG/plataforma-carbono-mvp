const TRUSTED_FETCH_SITES = new Set(['same-origin', 'none'])

function parseOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/**
 * Whether a state-changing request came from one of this app's own pages. A browser marks a
 * cross-site request in Sec-Fetch-Site and sends Origin (and usually Referer) with a POST; each
 * one present has to point here, and a request carrying none of the three is refused.
 *
 * Trusted origins: the request URL's own, plus APP_BASE_URL's. Behind the beta/prod reverse proxy
 * request.url may carry the container's internal host, and then only APP_BASE_URL matches what
 * the browser sends.
 */
export function hasTrustedOrigin(req: Request): boolean {
  const trusted = new Set<string>([new URL(req.url).origin])
  const configured = parseOrigin(process.env.APP_BASE_URL)
  if (configured) trusted.add(configured)

  const fetchSite = req.headers.get('sec-fetch-site')?.trim().toLowerCase()
  const origin = req.headers.get('origin')?.trim()
  const referer = req.headers.get('referer')?.trim()

  if (fetchSite && !TRUSTED_FETCH_SITES.has(fetchSite)) return false
  if (origin && !trusted.has(parseOrigin(origin) ?? '')) return false
  if (referer && !trusted.has(parseOrigin(referer) ?? '')) return false

  return Boolean(fetchSite || origin || referer)
}
