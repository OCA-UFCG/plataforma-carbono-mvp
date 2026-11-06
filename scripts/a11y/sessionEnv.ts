import { createRequire } from 'node:module'

export type AdminCredentials = { projectId: string; clientEmail: string; privateKey: string; apiKey: string }

/**
 * Loads `dir`'s .env files the way the app does, through @next/env, as
 * scripts/backfill-access-claims.mjs does: a line-by-line reader cuts a
 * multi-line FIREBASE_PRIVATE_KEY and misses names with digits, such as
 * FIREBASE_PRIVATE_KEY_BASE64, which the app prefers.
 */
export function loadLocalEnv(dir: string): void {
  const require = createRequire(import.meta.url)
  const { loadEnvConfig } = require('@next/env') as typeof import('@next/env')
  loadEnvConfig(dir, true, { info() {}, error: console.error }, true)
}

/** The Admin SDK service account and the web API key, read as lib/firebase-admin.ts reads them, or null. */
export function adminCredentials(env: Readonly<Record<string, string | undefined>>): AdminCredentials | null {
  const projectId = env.FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = env.FIREBASE_CLIENT_EMAIL
  const base64Key = env.FIREBASE_PRIVATE_KEY_BASE64
  const privateKey = base64Key
    ? Buffer.from(base64Key, 'base64').toString('utf8')
    : env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!projectId || !clientEmail || !privateKey || !apiKey) return null
  return { projectId, clientEmail, privateKey, apiKey }
}
