#!/usr/bin/env node
/**
 * Grants access to every account that exists, before the access gate is turned on.
 *
 * Accounts that predate signup lack the `caativar` claim; turning PLATFORM_ACCESS_GUARD_ENABLED on
 * without running this first would lock them all out. Order: deploy with the switch off → run
 * this → turn the switch on (docs/signup.md).
 *
 *   node scripts/backfill-access-claims.mjs           # dry run
 *   node scripts/backfill-access-claims.mjs --apply
 *
 * Every granted account is signed out: the claim enters a session cookie only when the cookie is
 * minted. Run with the switch still off, the visible effect is one login prompt.
 *
 * Idempotent: accounts with a valid claim are skipped. Accounts from signup (a signup request, or
 * the signup marker) are skipped too: the decision on them belongs to the approvals page, and
 * running this after signup opens would otherwise approve every pending and rejected request at
 * once. Needs Firestore enabled.
 */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Mirrors lib/access/claims.ts; tests/scripts/backfillAccessClaims.test.ts fails if they drift. A
// backfill writing a claim the gate does not recognize would lock everyone out.
export const ACCESS_CLAIM_NAMESPACE = 'caativar'
export const APPROVED_ACCESS = 'approved'
// The marker signup puts on the accounts it creates. Granting `legacy` over it would approve them.
export const REQUESTED_ACCESS = 'requested'
const LEGACY_TIER = 'legacy'
const VALID_TIERS = new Set(['allowed', 'common', LEGACY_TIER])

// Beta, prod and local development share the same Firebase accounts, so a request in any of these
// collections counts. A request's id is the account's uid (lib/access/requests.ts).
const SIGNUP_COLLECTIONS = ['access-requests', 'access-requests-local']

export function buildBackfillClaims(existingClaims = {}, atSeconds) {
  // setCustomUserClaims replaces the whole set: writing only ours would erase any other claim.
  return {
    ...existingClaims,
    [ACCESS_CLAIM_NAMESPACE]: { access: APPROVED_ACCESS, tier: LEGACY_TIER, at: atSeconds },
  }
}

/** A request in any collection, or the signup marker: the marker holds even if the request document is missing. */
function isSignupAccount(user, signupUids) {
  return signupUids.has(user?.uid) || user?.customClaims?.[ACCESS_CLAIM_NAMESPACE]?.access === REQUESTED_ACCESS
}

export function shouldBackfillUser(user, signupUids = new Set()) {
  if (isSignupAccount(user, signupUids)) return false

  const namespaced = user?.customClaims?.[ACCESS_CLAIM_NAMESPACE]
  if (!namespaced || typeof namespaced !== 'object') return true
  if (namespaced.access !== APPROVED_ACCESS) return true
  return !VALID_TIERS.has(namespaced.tier)
}

/**
 * Claim first, then revocation, as lib/access/claims.ts does: the reverse would sign the person
 * out and the next login would still lack the claim.
 */
export async function backfillUser(auth, user, atSeconds) {
  await auth.setCustomUserClaims(user.uid, buildBackfillClaims(user.customClaims, atSeconds))
  await auth.revokeRefreshTokens(user.uid)
}

export async function listSignupUids(db, collections) {
  const uids = new Set()
  for (const name of collections) {
    for (const ref of await db.collection(name).listDocuments()) uids.add(ref.id)
  }
  return uids
}

async function main() {
  const apply = process.argv.includes('--apply')

  // Loaded here, not at import, so the test can import this file without credentials. @next/env
  // reads .env.local the way the app does; a line-by-line reader, and Node 20's --env-file, cut
  // the multi-line FIREBASE_PRIVATE_KEY.
  const require = createRequire(import.meta.url)
  require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error: console.error })
  const { cert, initializeApp } = require('firebase-admin/app')
  const { getAuth } = require('firebase-admin/auth')
  const { getFirestore } = require('firebase-admin/firestore')

  const privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
    : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin credentials: check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (or _BASE64).')
    process.exit(1)
  }

  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  const auth = getAuth(app)
  const collections = [...new Set([...SIGNUP_COLLECTIONS, process.env.FIREBASE_ACCESS_REQUESTS_COLLECTION?.trim()].filter(Boolean))]
  const signupUids = await listSignupUids(getFirestore(app), collections)
  const atSeconds = Math.floor(Date.now() / 1000)

  console.log(apply ? `Granting access in ${projectId}…` : `Dry run against ${projectId}: nothing is written. Use --apply to grant.`)

  let scanned = 0
  let granted = 0
  let alreadyValid = 0
  let fromSignup = 0
  let pageToken

  do {
    const page = await auth.listUsers(1000, pageToken)
    for (const user of page.users) {
      scanned += 1
      if (isSignupAccount(user, signupUids)) {
        fromSignup += 1
        continue
      }
      if (!shouldBackfillUser(user)) {
        alreadyValid += 1
        continue
      }
      console.log(`  ${apply ? 'granting and signing out' : 'would grant and sign out'}: ${user.email ?? user.uid}`)
      if (apply) await backfillUser(auth, user, atSeconds)
      granted += 1
    }
    pageToken = page.pageToken
  } while (pageToken)

  console.log(`\n${scanned} account(s) scanned · ${granted} ${apply ? 'granted and signed out' : 'would be granted and signed out'} · ${alreadyValid} already valid · ${fromSignup} from signup, decided on the approvals page`)
  if (!apply) console.log('\nNothing was written. Run again with --apply.')
}

// Runs only when called directly; an import (the test) does not.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
