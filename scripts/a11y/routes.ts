/**
 * The pages the accessibility checks visit: the axe check (check.mts) and the
 * screenshot guard (screens.mts). `ready` is a selector the page shows only
 * once it rendered for real, so an error page never passes for the page.
 * `settled` is for a page that draws its heading first and its real state after
 * a request (the email-link pages): the check waits until the `h1` says it.
 * `session` routes need a `session` cookie (A11Y_SESSION; see session.mts) and
 * are skipped without one, as in CI.
 */
export type A11yRoute = { path: string; ready: string; settled?: string; session?: true }

// The auth pages sit on AuthCard (`main > section > h1`). Next's own 404 also
// has an `h1`, but no `main`, so a bare `h1` could pass for a page that is not there.
const AUTH_READY = 'main > section > h1'

export const A11Y_ROUTES: readonly A11yRoute[] = [
  { path: '/', ready: 'main' },
  { path: '/sobre', ready: 'main' },
  { path: '/sobre/caatinga', ready: 'main' },
  { path: '/sobre/carbono-e-comunidades', ready: 'main' },
  { path: '/sobre/como-funciona', ready: 'main' },
  { path: '/comunicacao', ready: 'main' },
  { path: '/glossario', ready: 'main' },
  { path: '/territorios', ready: 'main h1' },
  { path: '/comunicacao/cartilha-1-o-que-e-credito-de-carbono', ready: 'main h1' },
  { path: '/login', ready: AUTH_READY },
  // Renders only with PLATFORM_ACCESS_GUARD_ENABLED=true on the server.
  { path: '/cadastro', ready: AUTH_READY },
  // The confirmation page 404s without the switch, like /cadastro. Opened with
  // no code, it settles on the invalid-link card: the page a stale link shows.
  { path: '/cadastro/confirmacao', ready: AUTH_READY, settled: 'Link inválido' },
  { path: '/esqueci-senha', ready: AUTH_READY },
  { path: '/redefinir-senha', ready: AUTH_READY, settled: 'Link inválido' },
  { path: '/aguardando-liberacao', ready: AUTH_READY },
  { path: '/mapa', ready: '.maplibregl-canvas', session: true },
]

/**
 * The routes of this run: the given paths (all when none). With no paths, the
 * session routes are left out without a session, as in CI. A session route
 * named on purpose without one throws: dropping it would leave a run that
 * checked nothing and still passed.
 */
export function routesToRun(paths: readonly string[], hasSession: boolean): A11yRoute[] {
  const unknown = paths.filter((path) => !A11Y_ROUTES.some((route) => route.path === path))
  if (unknown.length) throw new Error(`Unknown route(s): ${unknown.join(', ')}. Add them to scripts/a11y/routes.ts.`)
  const needSession = A11Y_ROUTES.filter((route) => route.session && paths.includes(route.path))
  if (needSession.length > 0 && !hasSession) {
    throw new Error(`${needSession.map((route) => route.path).join(', ')} need(s) a session: set A11Y_SESSION (see scripts/a11y/session.mts).`)
  }
  return A11Y_ROUTES.filter((route) => (paths.length === 0 || paths.includes(route.path)) && (hasSession || !route.session))
}

/**
 * The session cookie a route is opened with: only the routes marked `session`
 * get one. /login and /cadastro send a signed-in visitor on to /mapa, so with
 * the cookie they would be checked as the platform under their own path.
 */
export function sessionFor(route: A11yRoute, session: string | undefined): string | undefined {
  return route.session ? session : undefined
}

/** The screenshot file of a route: "/" is home.png, "/sobre/caatinga" is sobre-caatinga.png. */
export function screenshotName(path: string): string {
  const slug = path.split('/').filter(Boolean).join('-')
  return `${slug || 'home'}.png`
}
