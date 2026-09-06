// Stub for the `server-only` guard. Next.js aliases that module internally at
// build time (it is not an installed package), so importing a module that
// carries the guard would fail to resolve under vitest. Aliased in
// vitest.config.mts.
export {}
