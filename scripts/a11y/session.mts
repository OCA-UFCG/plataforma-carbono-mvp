/**
 * Prints a `session` cookie value, valid for one hour, for an existing account,
 * so the accessibility checks can visit the platform's routes locally:
 *
 *   A11Y_SESSION=$(npx tsx scripts/a11y/session.mts <email>) npm run a11y -- /mapa
 *
 * It signs that account in against the shared Firebase project, so run it
 * only with an account its owner agreed to. The account's `caativar` claim
 * travels in the ID token, so the access gate (verifySessionCookie in
 * lib/auth.ts) treats the cookie as it would a login. Needs .env.local.
 *
 * lib/firebase-admin.ts is not imported: its `import 'server-only'` throws
 * outside Next, so the Admin app is initialized here the same way, from the
 * credentials sessionEnv.ts reads as the app does.
 */
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { adminCredentials, loadLocalEnv } from './sessionEnv'

const ONE_HOUR_MS = 60 * 60 * 1000

async function mintSession(email: string): Promise<string> {
  const credentials = adminCredentials(process.env)
  if (!credentials) throw new Error('Firebase configuration is incomplete in .env.local.')
  const { projectId, clientEmail, privateKey, apiKey } = credentials

  const auth = getAuth(initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }))
  const { uid } = await auth.getUserByEmail(email)
  const customToken = await auth.createCustomToken(uid)

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  })
  const body = (await response.json().catch(() => null)) as { idToken?: string; error?: { message?: string } } | null
  if (!response.ok || !body?.idToken) throw new Error(`sign-in failed: ${body?.error?.message ?? response.status}`)

  return auth.createSessionCookie(body.idToken, { expiresIn: ONE_HOUR_MS })
}

loadLocalEnv(fileURLToPath(new URL('../..', import.meta.url)))
const email = process.argv[2] ?? process.env.A11Y_EMAIL
if (!email) {
  console.error('usage: npx tsx scripts/a11y/session.mts <email>')
  process.exit(2)
}
try {
  process.stdout.write(await mintSession(email))
} catch (error) {
  // The message only: never the tokens.
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
