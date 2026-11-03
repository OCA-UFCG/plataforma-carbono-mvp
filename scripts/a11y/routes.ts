/**
 * The pages the accessibility checks visit: the axe check (check.mts) and the
 * screenshot guard (screens.mts). `ready` is a selector the page shows only
 * once it rendered for real, so an error page never passes for the page.
 * `session` routes need a `session` cookie (A11Y_SESSION; see session.mts) and
 * are skipped without one, as in CI.
 */
export type A11yRoute = { path: string; ready: string; session?: true }

export const A11Y_ROUTES: readonly A11yRoute[] = [
  { path: '/', ready: 'main' },
  { path: '/sobre', ready: 'main' },
  { path: '/sobre/caatinga', ready: 'main' },
  { path: '/sobre/carbono-e-comunidades', ready: 'main' },
  { path: '/sobre/como-funciona', ready: 'main' },
  { path: '/comunicacao', ready: 'main' },
  { path: '/glossario', ready: 'main' },
  { path: '/territorios', ready: 'main h1' },
  { path: '/login', ready: 'h1' },
  // Renders only with PLATFORM_ACCESS_GUARD_ENABLED=true on the server.
  { path: '/cadastro', ready: 'h1' },
  { path: '/esqueci-senha', ready: 'h1' },
  { path: '/mapa', ready: '.maplibregl-canvas', session: true },
]

/** The routes of this run: the given paths (all when none), minus session routes without a session. */
export function routesToRun(paths: readonly string[], hasSession: boolean): A11yRoute[] {
  const unknown = paths.filter((path) => !A11Y_ROUTES.some((route) => route.path === path))
  if (unknown.length) throw new Error(`Unknown route(s): ${unknown.join(', ')}. Add them to scripts/a11y/routes.ts.`)
  return A11Y_ROUTES.filter((route) => (paths.length === 0 || paths.includes(route.path)) && (hasSession || !route.session))
}

/** The screenshot file of a route: "/" is home.png, "/sobre/caatinga" is sobre-caatinga.png. */
export function screenshotName(path: string): string {
  const slug = path.split('/').filter(Boolean).join('-')
  return `${slug || 'home'}.png`
}
