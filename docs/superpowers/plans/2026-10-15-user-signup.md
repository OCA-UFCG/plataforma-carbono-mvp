# User Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people request access to Caativar themselves: sign up with an email and an intended use, choose a password from the confirmation link, and get in automatically (listed domain) or after an admin approves.

**Architecture:** A port of SAP's signup to this repo. A custom claim on the Firebase account (`caativar.access`) authorizes and travels inside the session cookie; a Firestore `access-requests` document per account audits. The gate lives in `lib/auth.ts` (`createSessionCookie` refuses, `verifySessionCookie` drops claim-less cookies) behind the `PLATFORM_ACCESS_GUARD_ENABLED` switch, which also opens signup. Accounts are created without a password through the Admin SDK; the confirmation page sets it with the verification code. Emails go out through Gmail SMTP (nodemailer).

**Tech Stack:** Next.js 16 App Router (Node runtime routes), React 19, TypeScript strict, firebase-admin 13 (Auth + Firestore), Identity Toolkit REST, nodemailer, vitest 4 (node environment, `renderToStaticMarkup` for components).

**Spec:** `docs/superpowers/specs/2026-10-15-user-signup-design.md`

## Global Constraints

- Code, comments, logs and commit messages in English; every UI string in Portuguese, copied verbatim from spec §6.3 and §9. Spell "e-mail" as the login card does; "a Caativar" is feminine.
- Repo style: no semicolons, single quotes, 2-space indent, `@/` imports.
- Every new API route exports `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` and answers with `Cache-Control: no-store` (`jsonNoStore`).
- New environment variables are server-only; never `NEXT_PUBLIC_`. Read them on every call, never at module load.
- Nothing logs a confirmation code, a reset code, a link carrying one, or a password.
- Links inside `app/(auth)/` use `next/link`; a link to `/` (another route group) uses `<a href>`.
- Tests live in `tests/**/*.test.ts` and are type-checked by `next build` (tsconfig includes them): no `any`, mocks through `vi.hoisted` + `vi.mock`.
- CI runs neither `npm test` nor `npm run lint`: run both locally before every commit that touches code.
- Commits: conventional prefix (`feat:`, `test:`, `refactor:`, `docs:`, `chore:`), no co-author or attribution trailers.
- Branch: `feat/user-signup` (already created, spec committed on it).

## Review Focus

1. **An email typed with capitals or spaces** (`"  Fulana@UFCG.edu.br "`): the account, the request and the tier use the normalized address, and a listed domain still matches. Pinned in Task 2 (tier) and Task 11 (route).
2. **Production behind the reverse proxy**, where `request.url` carries the container's host: a same-origin browser POST must still pass the origin check through `APP_BASE_URL`. Pinned in Task 4.
3. **`APP_BASE_URL` set with a trailing slash**: email links must not come out with `//`. Pinned in Task 5.
4. **A confirmation link with no code, or opened again after use**: the check answers 410 without calling Firebase for a missing code, and a reused code cannot set a password again. Pinned in Task 12.
5. **A rejected (disabled) person signing up again**: signup answers the same `accepted`, sends nothing, and resend stays silent for the disabled account. Pinned in Task 11.

## File Structure

| File | Responsibility |
|---|---|
| `lib/access/flag.ts` | The switch: `isAccessGuardEnabled`, `isSignupOpen` |
| `lib/access/paths.ts` | Route constants, client-safe |
| `lib/access/emailAddress.ts` | `normalizeEmail`, `isWellFormedEmail` |
| `lib/access/domains.ts` | Allowlist parsing, `resolveSignupTier` |
| `lib/access/admins.ts` | `isAccessAdmin` |
| `lib/access/passwordRules.ts` | `MIN_PASSWORD_LENGTH`, `passwordPairError`, `isAcceptablePassword` |
| `lib/access/intention.ts` | `INTENTION_MAX_LENGTH`, `normalizeIntention` |
| `lib/access/signupForm.ts` | The signup form's client-side check |
| `lib/access/sessionCodes.ts` | `access_pending` / `access_granted` / `email_unconfirmed` |
| `lib/access/loginErrors.ts` | Login card error messages |
| `lib/access/clientFetch.ts` | `postJson` for client components |
| `lib/firebase-admin.ts` | Admin app, Auth and Firestore accessors |
| `lib/access/claims.ts` | The access claim: read, build, `approveAccess` |
| `lib/rateLimit.ts` | Limiter factory, client address |
| `lib/mapa/rateLimit.ts` | The map's 60/min instance (same exports as today) |
| `lib/access/rateLimits.ts` | One limiter per access action, client key |
| `lib/access/trustedOrigin.ts` | Same-origin check for mutations |
| `lib/access/http.ts` | `jsonNoStore`, body reading, the shared refusals |
| `lib/mailer.ts` | nodemailer over Gmail SMTP |
| `lib/access/urls.ts` | Absolute links for emails |
| `lib/access/emails.ts` | The five messages |
| `lib/access/firebaseCodes.ts` | Identity Toolkit: check, apply, reset |
| `lib/access/requests.ts` | Firestore audit record |
| `lib/access/verification.ts` | Sending the confirmation email |
| `lib/access/settlement.ts` | `settleSignup` |
| `lib/access/passwordReset.ts` | Sending the reset email |
| `lib/auth.ts` | The session gate (+ `/aprovacoes` in `safeRedirect`) |
| `app/api/session/route.ts` | Login: cookie or access code |
| `app/api/signup/{route,resend,confirm/check,confirm,approve}` | Signup routes |
| `app/api/password-reset/{route,check,confirm}` | Reset routes |
| `components/auth/AuthCard.tsx` | The shared card and form styles |
| `components/auth/PasswordFields.tsx` | Password pair with visibility toggle |
| `components/auth/ResendConfirmation.tsx` | Resend button + status |
| `components/auth/{SignupForm,SignupConfirmation,ForgotPasswordForm,ResetPasswordForm,ApprovalsTable}.tsx` | Screens |
| `app/(auth)/{cadastro,cadastro/confirmacao,aguardando-liberacao,esqueci-senha,redefinir-senha,aprovacoes}/page.tsx` | Pages |
| `scripts/backfill-access-claims.mjs` | Grants `legacy` to existing accounts |
| `firestore.rules`, `firestore.indexes.json`, `firebase.json` | Firestore deploy files |
| `docs/signup.md` | Operations guide (English) |
| `tests/helpers/fakeFirestore.ts`, `tests/helpers/jsonPost.ts` | Test helpers |

---

### Task 1: Probe Identity Toolkit's code check (throwaway, no commit)

Spec §15 makes the whole confirmation design rest on one behavior: `accounts:resetPassword` called with only an `oobCode` returns `requestType: 'VERIFY_EMAIL'` and the email for a verification code **without spending it**. Confirm it against `plataforma-carbono` before building on it.

**This writes to the shared Firebase project** (one throwaway account, deleted in a `finally`). Ask the user before running Step 2.

**Files:**
- Create (scratchpad only, never committed): `$SCRATCH/probe-action-codes.mjs`, where `$SCRATCH` is the session scratchpad directory.

- [ ] **Step 1: Write the probe**

```js
// $SCRATCH/probe-action-codes.mjs — run from the repo root
import { createRequire } from 'node:module'

const root = process.cwd()
const require = createRequire(`${root}/package.json`)
require('@next/env').loadEnvConfig(root, true, { info() {}, error: console.error })
const { cert, initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

const privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
  ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
  : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const auth = getAuth(initializeApp({ credential: cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }) }))
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

async function toolkit(endpoint, body) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

const email = `signup-probe-${Date.now()}@example.com`
const user = await auth.createUser({ email, emailVerified: false })
try {
  const code = new URL(await auth.generateEmailVerificationLink(email)).searchParams.get('oobCode')
  const check = await toolkit('accounts:resetPassword', { oobCode: code })
  console.log('check:', check.status, check.body.requestType, check.body.email === email ? 'email matches' : check.body.email ?? check.body.error?.message)
  console.log('verified after check:', (await auth.getUser(user.uid)).emailVerified)
  await auth.updateUser(user.uid, { password: 'probe-password-123' })
  const apply = await toolkit('accounts:update', { oobCode: code })
  console.log('apply:', apply.status, apply.body.email === email ? 'email matches' : apply.body.email ?? apply.body.error?.message)
  console.log('verified after apply:', (await auth.getUser(user.uid)).emailVerified)
  const recheck = await toolkit('accounts:resetPassword', { oobCode: code })
  console.log('check after apply:', recheck.status, recheck.body.error?.message)
} finally {
  await auth.deleteUser(user.uid)
  console.log('probe account deleted')
}
```

- [ ] **Step 2: Run it (after the user agrees)**

Run: `node "$SCRATCH/probe-action-codes.mjs"`
Expected:
```
check: 200 VERIFY_EMAIL email matches
verified after check: false
apply: 200 email matches
verified after apply: true
check after apply: 400 INVALID_OOB_CODE
probe account deleted
```

- [ ] **Step 3: Decide**

If every line matches, continue with Task 2. If `check` does not return `VERIFY_EMAIL` with the email, or `verified after check` is `true`, **stop and report to the user**: spec §15's fallback (apply the code on open, ask for the password after) changes Tasks 12 and 15, and needs their decision. Delete nothing else; the probe cleans up after itself.

---

### Task 2: Access rules (switch, paths, emails, domains, admins, passwords)

Pure, client-safe modules that every later task reads.

**Files:**
- Create: `lib/access/flag.ts`, `lib/access/paths.ts`, `lib/access/emailAddress.ts`, `lib/access/domains.ts`, `lib/access/admins.ts`, `lib/access/passwordRules.ts`
- Test: `tests/lib/access/accessRules.test.ts`

**Interfaces:**
- Produces: `isAccessGuardEnabled(): boolean`, `isSignupOpen(): boolean`; path constants `LOGIN_PATH`, `SIGNUP_PATH`, `SIGNUP_CONFIRMATION_PATH`, `PENDING_APPROVAL_PATH`, `FORGOT_PASSWORD_PATH`, `PASSWORD_RESET_PATH`, `APPROVALS_PATH`; `normalizeEmail(value: unknown): string`, `isWellFormedEmail(email: string): boolean`; `type SignupTier = 'allowed' | 'common'`, `parseAllowedSignupDomains(value?: string): Set<string>`, `emailDomain(email: unknown): string | null`, `resolveSignupTier(email: unknown): SignupTier`; `parseAccessAdminEmails(value?: string): Set<string>`, `isAccessAdmin(email: unknown): boolean`; `MIN_PASSWORD_LENGTH = 8`, `type PasswordPairError = 'required' | 'too-short' | 'confirm-required' | 'mismatch'`, `passwordPairError(password: string, confirmation: string): PasswordPairError | null`, `isAcceptablePassword(value: unknown): value is string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/access/accessRules.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAccessGuardEnabled, isSignupOpen } from '@/lib/access/flag'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { emailDomain, parseAllowedSignupDomains, resolveSignupTier } from '@/lib/access/domains'
import { isAccessAdmin, parseAccessAdminEmails } from '@/lib/access/admins'
import { MIN_PASSWORD_LENGTH, isAcceptablePassword, passwordPairError } from '@/lib/access/passwordRules'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the access switch', () => {
  it('is on only when the variable is exactly "true"', () => {
    for (const value of ['', 'false', 'TRUE', '1', ' true']) {
      vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', value)
      expect(isAccessGuardEnabled()).toBe(false)
    }
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    expect(isAccessGuardEnabled()).toBe(true)
  })

  it('opens signup exactly when the gate is on', () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect(isSignupOpen()).toBe(false)
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    expect(isSignupOpen()).toBe(true)
  })
})

describe('email addresses', () => {
  it('normalizes to trimmed lowercase, and anything but a string to ""', () => {
    expect(normalizeEmail('  Fulana@UFCG.edu.BR ')).toBe('fulana@ufcg.edu.br')
    expect(normalizeEmail(42)).toBe('')
    expect(normalizeEmail(undefined)).toBe('')
  })

  it('accepts one @ with a dotted domain and nothing blank', () => {
    expect(isWellFormedEmail('fulana@ufcg.edu.br')).toBe(true)
    for (const bad of ['', 'fulana', 'fulana@', '@ufcg.edu.br', 'fulana@ufcg', 'ful ana@ufcg.edu.br', 'a@b@c.br']) {
      expect(isWellFormedEmail(bad)).toBe(false)
    }
  })
})

describe('signup domains', () => {
  it('parses a comma list, with or without @, ignoring blanks and case', () => {
    expect(parseAllowedSignupDomains(' UFCG.edu.br, @insa.gov.br ,,')).toEqual(new Set(['ufcg.edu.br', 'insa.gov.br']))
    expect(parseAllowedSignupDomains('')).toEqual(new Set())
  })

  it('takes the domain of a single well-formed address only', () => {
    expect(emailDomain('Fulana@UFCG.edu.br')).toBe('ufcg.edu.br')
    expect(emailDomain('fulana')).toBeNull()
    expect(emailDomain('a@b@ufcg.edu.br')).toBeNull()
    expect(emailDomain('@ufcg.edu.br')).toBeNull()
    expect(emailDomain(null)).toBeNull()
  })

  it('admits a listed domain by exact match, never by suffix, whatever the case and spacing', () => {
    vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', 'ufcg.edu.br')
    expect(resolveSignupTier('fulana@ufcg.edu.br')).toBe('allowed')
    expect(resolveSignupTier('  Fulana@UFCG.EDU.BR ')).toBe('allowed')
    expect(resolveSignupTier('fulana@ccc.ufcg.edu.br')).toBe('common')
    expect(resolveSignupTier('fulana@naoufcg.edu.br')).toBe('common')
    expect(resolveSignupTier('fulana@gmail.com')).toBe('common')
  })

  it('sends everyone to approval when the list is empty or the address is malformed', () => {
    vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', '')
    expect(resolveSignupTier('fulana@ufcg.edu.br')).toBe('common')
    vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', 'ufcg.edu.br')
    expect(resolveSignupTier('fulana@ufcg.edu.br@gmail.com')).toBe('common')
  })
})

describe('access admins', () => {
  it('matches a listed email regardless of case and spacing', () => {
    vi.stubEnv('ACCESS_ADMIN_EMAILS', ' Admin@UFCG.edu.br , outra@insa.gov.br')
    expect(parseAccessAdminEmails()).toEqual(new Set(['admin@ufcg.edu.br', 'outra@insa.gov.br']))
    expect(isAccessAdmin('admin@ufcg.edu.br')).toBe(true)
    expect(isAccessAdmin('ADMIN@ufcg.edu.br')).toBe(true)
    expect(isAccessAdmin('fulana@ufcg.edu.br')).toBe(false)
  })

  it('admits nobody when the list is empty or the email is missing', () => {
    vi.stubEnv('ACCESS_ADMIN_EMAILS', '')
    expect(isAccessAdmin('admin@ufcg.edu.br')).toBe(false)
    vi.stubEnv('ACCESS_ADMIN_EMAILS', 'admin@ufcg.edu.br')
    expect(isAccessAdmin(undefined)).toBe(false)
    expect(isAccessAdmin('')).toBe(false)
  })
})

describe('password rules', () => {
  it('checks the pair in the order the person fills it in', () => {
    expect(passwordPairError('', '')).toBe('required')
    expect(passwordPairError('1234567', '1234567')).toBe('too-short')
    expect(passwordPairError('12345678', '')).toBe('confirm-required')
    expect(passwordPairError('12345678', '12345679')).toBe('mismatch')
    expect(passwordPairError('12345678', '12345678')).toBeNull()
  })

  it('accepts on the server only a string of at least the minimum length', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(isAcceptablePassword('12345678')).toBe(true)
    expect(isAcceptablePassword('1234567')).toBe(false)
    expect(isAcceptablePassword(12345678)).toBe(false)
    expect(isAcceptablePassword(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/access/accessRules.test.ts`
Expected: FAIL, "Failed to resolve import "@/lib/access/flag"".

- [ ] **Step 3: Write the modules**

```ts
// lib/access/flag.ts
/**
 * The rollout switch for the access gate (docs/signup.md). It imports nothing, so lib/auth.ts,
 * the login page and the signup routes can all read it.
 *
 * Off by default: every account that predates signup lacks the access claim until
 * scripts/backfill-access-claims.mjs grants it, and turning the gate on before that locks
 * everyone out. Deploy with it off, run the backfill, then turn it on.
 */
export function isAccessGuardEnabled(): boolean {
  return process.env.PLATFORM_ACCESS_GUARD_ENABLED === 'true'
}

/**
 * Signup is open exactly when the gate is on. With the gate off a session checks neither the
 * claim nor the email, so an open signup would let anyone in, unconfirmed and unapproved: more
 * open than before signup existed.
 */
export function isSignupOpen(): boolean {
  return isAccessGuardEnabled()
}
```

```ts
// lib/access/paths.ts
/**
 * Routes of the access flow, importable from client components: nothing here pulls in the
 * Admin SDK.
 */
export const LOGIN_PATH = '/login'
export const SIGNUP_PATH = '/cadastro'
export const SIGNUP_CONFIRMATION_PATH = '/cadastro/confirmacao'
/** Where a correct password without access lands. Not /login: the password was right. */
export const PENDING_APPROVAL_PATH = '/aguardando-liberacao'
export const FORGOT_PASSWORD_PATH = '/esqueci-senha'
export const PASSWORD_RESET_PATH = '/redefinir-senha'
export const APPROVALS_PATH = '/aprovacoes'
```

```ts
// lib/access/emailAddress.ts
/** Trimmed and lowercased; '' for anything that is not a string. */
export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/** One `@`, something on both sides, a dot in the domain, no whitespace. */
export function isWellFormedEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

```ts
// lib/access/domains.ts
import { normalizeEmail } from '@/lib/access/emailAddress'

/** `allowed` gets in when the address is confirmed; `common` waits for an admin. */
export type SignupTier = 'allowed' | 'common'

function normalizeDomain(entry: string) {
  // People paste the domain off an address, so `@ufcg.edu.br` and `ufcg.edu.br` both count.
  return entry.trim().toLowerCase().replace(/^@/, '')
}

/**
 * Read on every call, so removing a domain from SIGNUP_ALLOWED_DOMAINS applies on the next
 * request. Never give the variable a NEXT_PUBLIC_ prefix: the whole list would ship to the
 * browser.
 */
export function parseAllowedSignupDomains(value = process.env.SIGNUP_ALLOWED_DOMAINS): Set<string> {
  return new Set((value ?? '').split(',').map(normalizeDomain).filter(Boolean))
}

/** The domain of a single well-formed address, or null: a malformed one takes the denying path. */
export function emailDomain(email: unknown): string | null {
  const parts = normalizeEmail(email).split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return parts[1]
}

/**
 * Exact match, never by suffix: with `ufcg.edu.br` listed, neither `ccc.ufcg.edu.br` nor
 * `naoufcg.edu.br` gets in. A subdomain that should is written into the list.
 */
export function resolveSignupTier(email: unknown): SignupTier {
  const domain = emailDomain(email)
  return domain !== null && parseAllowedSignupDomains().has(domain) ? 'allowed' : 'common'
}
```

```ts
// lib/access/admins.ts
import { normalizeEmail } from '@/lib/access/emailAddress'

/** Read on every call, so removing someone from ACCESS_ADMIN_EMAILS applies on the next request. */
export function parseAccessAdminEmails(value = process.env.ACCESS_ADMIN_EMAILS): Set<string> {
  return new Set((value ?? '').split(',').map(normalizeEmail).filter(Boolean))
}

/** Whether a signed-in email may decide access requests at /aprovacoes. */
export function isAccessAdmin(email: unknown): boolean {
  const normalized = normalizeEmail(email)
  return normalized !== '' && parseAccessAdminEmails().has(normalized)
}
```

```ts
// lib/access/passwordRules.ts
/**
 * The local floor for a password, the same on the confirmation and reset pages and in their
 * routes. Firebase's password policy is the rule that holds (docs/signup.md); this one lets the
 * person see the error before the request leaves.
 */
export const MIN_PASSWORD_LENGTH = 8

export type PasswordPairError = 'required' | 'too-short' | 'confirm-required' | 'mismatch'

export function passwordPairError(password: string, confirmation: string): PasswordPairError | null {
  if (!password) return 'required'
  if (password.length < MIN_PASSWORD_LENGTH) return 'too-short'
  if (!confirmation) return 'confirm-required'
  if (password !== confirmation) return 'mismatch'
  return null
}

/** The server's check: a string of at least MIN_PASSWORD_LENGTH characters. */
export function isAcceptablePassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/access/accessRules.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add lib/access/flag.ts lib/access/paths.ts lib/access/emailAddress.ts lib/access/domains.ts lib/access/admins.ts lib/access/passwordRules.ts tests/lib/access/accessRules.test.ts
git commit -m "feat: add the access rules for signup"
```

---
### Task 3: Admin SDK app and the access claim

**Files:**
- Modify: `lib/firebase-admin.ts` (whole file)
- Create: `lib/access/claims.ts`
- Test: `tests/lib/access/claims.test.ts`, `tests/lib/firebaseAdmin.test.ts`

**Interfaces:**
- Consumes: `SignupTier` (Task 2).
- Produces: `getFirebaseAdminApp(): App`, `getFirebaseAdminAuth(): Auth`, `getFirebaseAdminDb(): Firestore`; `ACCESS_CLAIM_NAMESPACE = 'caativar'`, `APPROVED_ACCESS = 'approved'`, `type AccessTier = SignupTier | 'legacy'`, `interface AccessClaim { access: 'approved'; tier: AccessTier; at: number }`, `buildAccessClaims(tier: AccessTier, atSeconds?: number)`, `readAccessClaim(claims: unknown): AccessClaim | null`, `hasApprovedAccess(claims: unknown): boolean`, `approveAccess(uid: string, tier: AccessTier, atSeconds?: number): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/access/claims.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  setCustomUserClaims: vi.fn(),
  revokeRefreshTokens: vi.fn(),
}))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => mocks,
}))

import { ACCESS_CLAIM_NAMESPACE, approveAccess, buildAccessClaims, hasApprovedAccess, readAccessClaim } from '@/lib/access/claims'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ customClaims: undefined })
  mocks.setCustomUserClaims.mockResolvedValue(undefined)
  mocks.revokeRefreshTokens.mockResolvedValue(undefined)
})

describe('readAccessClaim', () => {
  it('reads a well-formed approved claim', () => {
    expect(readAccessClaim({ caativar: { access: 'approved', tier: 'allowed', at: 1700000000 } }))
      .toEqual({ access: 'approved', tier: 'allowed', at: 1700000000 })
  })

  it('denies anything else the same way', () => {
    const denied: unknown[] = [
      undefined, null, 'caativar', {}, { caativar: null }, { caativar: 'approved' },
      { caativar: { access: 'pending', tier: 'allowed', at: 1 } },
      { caativar: { access: 'approved', tier: 'admin', at: 1 } },
      { sap: { access: 'approved', tier: 'allowed', at: 1 } },
    ]
    for (const claims of denied) {
      expect(readAccessClaim(claims)).toBeNull()
      expect(hasApprovedAccess(claims)).toBe(false)
    }
  })

  it('tolerates a missing timestamp', () => {
    expect(readAccessClaim({ caativar: { access: 'approved', tier: 'legacy' } })?.at).toBe(0)
  })
})

describe('buildAccessClaims', () => {
  it('nests the claim under the namespace', () => {
    expect(ACCESS_CLAIM_NAMESPACE).toBe('caativar')
    expect(buildAccessClaims('common', 42)).toEqual({ caativar: { access: 'approved', tier: 'common', at: 42 } })
  })
})

describe('approveAccess', () => {
  it("merges the claim into the account's other claims, then revokes its tokens", async () => {
    mocks.getUser.mockResolvedValueOnce({ customClaims: { role: 'editor' } })

    await approveAccess('uid-1', 'common', 42)

    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith('uid-1', {
      role: 'editor',
      caativar: { access: 'approved', tier: 'common', at: 42 },
    })
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith('uid-1')
    expect(mocks.setCustomUserClaims.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.revokeRefreshTokens.mock.invocationCallOrder[0])
  })
})
```

```ts
// tests/lib/firebaseAdmin.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Firebase Admin accessors', () => {
  it('refuse to start without the service account', () => {
    vi.stubEnv('FIREBASE_PROJECT_ID', '')
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', '')
    vi.stubEnv('FIREBASE_CLIENT_EMAIL', '')
    vi.stubEnv('FIREBASE_PRIVATE_KEY', '')
    vi.stubEnv('FIREBASE_PRIVATE_KEY_BASE64', '')

    expect(() => getFirebaseAdminAuth()).toThrow('Firebase Admin configuration is incomplete.')
    expect(() => getFirebaseAdminDb()).toThrow('Firebase Admin configuration is incomplete.')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/access/claims.test.ts tests/lib/firebaseAdmin.test.ts`
Expected: FAIL: `@/lib/access/claims` does not resolve, and `getFirebaseAdminDb` is not exported.

- [ ] **Step 3: Rewrite `lib/firebase-admin.ts`**

```ts
import 'server-only'

import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getPrivateKey() {
  const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64
  if (base64Key) return Buffer.from(base64Key, 'base64').toString('utf8')

  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}

/** The one Admin app, created on first use from the service account. */
export function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp()

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = getPrivateKey()

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin configuration is incomplete.')
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp())
}

/** Firestore, which holds only the access-request audit record (lib/access/requests.ts). */
export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp())
}
```

The initialization logic is unchanged; it only moves into `getFirebaseAdminApp` so Auth and Firestore share the app.

- [ ] **Step 4: Write `lib/access/claims.ts`**

```ts
import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import type { SignupTier } from '@/lib/access/domains'

/**
 * Everything this app writes on an account sits under one namespace: Firebase reserves the
 * token's top-level names (`sub`, `iat`, `exp`…) and refuses a claim that collides with them.
 * scripts/backfill-access-claims.mjs mirrors these two constants, and a test compares them.
 */
export const ACCESS_CLAIM_NAMESPACE = 'caativar'
export const APPROVED_ACCESS = 'approved'

/**
 * How the account got in: `allowed` (a listed domain confirmed its address), `common` (an admin
 * approved it) or `legacy` (the backfill, for accounts that predate signup).
 */
export type AccessTier = SignupTier | 'legacy'

const ACCESS_TIERS: readonly AccessTier[] = ['allowed', 'common', 'legacy']

export interface AccessClaim {
  access: typeof APPROVED_ACCESS
  tier: AccessTier
  at: number
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000)
}

export function buildAccessClaims(tier: AccessTier, atSeconds = nowInSeconds()) {
  return { [ACCESS_CLAIM_NAMESPACE]: { access: APPROVED_ACCESS, tier, at: atSeconds } }
}

/**
 * The access claim of a decoded token or of an account's custom claims, or null. A missing claim
 * and a malformed one take the same path: the one that denies.
 */
export function readAccessClaim(claims: unknown): AccessClaim | null {
  if (!claims || typeof claims !== 'object') return null
  const namespaced = (claims as Record<string, unknown>)[ACCESS_CLAIM_NAMESPACE]
  if (!namespaced || typeof namespaced !== 'object') return null

  const { access, tier, at } = namespaced as Record<string, unknown>
  if (access !== APPROVED_ACCESS) return null
  if (!ACCESS_TIERS.includes(tier as AccessTier)) return null

  return { access: APPROVED_ACCESS, tier: tier as AccessTier, at: typeof at === 'number' ? at : 0 }
}

export function hasApprovedAccess(claims: unknown): boolean {
  return readAccessClaim(claims) !== null
}

/**
 * Grants access. The only caller of setCustomUserClaims in the app: the domain rule and an
 * admin's approval both come through here.
 *
 * setCustomUserClaims replaces the whole set, so the account's other claims are merged back in.
 * The revocation is not optional: a claim is stamped into a session cookie when the cookie is
 * minted, and a cookie minted before it would otherwise stay claim-less for up to 24 h. Sessions
 * are verified with checkRevoked (lib/auth.ts), so the revocation applies on the next request.
 */
export async function approveAccess(uid: string, tier: AccessTier, atSeconds = nowInSeconds()) {
  const auth = getFirebaseAdminAuth()
  const { customClaims } = await auth.getUser(uid)
  await auth.setCustomUserClaims(uid, { ...customClaims, ...buildAccessClaims(tier, atSeconds) })
  await auth.revokeRefreshTokens(uid)
}
```

- [ ] **Step 5: Run the tests to verify they pass, plus the whole suite**

Run: `npx vitest run tests/lib/access/claims.test.ts tests/lib/firebaseAdmin.test.ts && npm test`
Expected: PASS; the existing suite still passes (nothing else imports the changed internals).

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add lib/firebase-admin.ts lib/access/claims.ts tests/lib/access/claims.test.ts tests/lib/firebaseAdmin.test.ts
git commit -m "feat: add the access claim and a Firestore accessor"
```

---

### Task 4: Rate limits, origin check and the access routes' shared door

**Files:**
- Create: `lib/rateLimit.ts`, `lib/access/rateLimits.ts`, `lib/access/trustedOrigin.ts`, `lib/access/http.ts`
- Modify: `lib/mapa/rateLimit.ts` (whole file; same exports)
- Test: `tests/lib/rateLimit.test.ts`, `tests/lib/access/trustedOrigin.test.ts`, `tests/lib/access/http.test.ts`

**Interfaces:**
- Consumes: `isSignupOpen` (Task 2).
- Produces: `interface RateLimitResult { ok: boolean; retryAfter: number }`, `interface RateLimiter { consume(key: string): RateLimitResult; clear(): void }`, `createRateLimiter({ windowMs, max, maxTrackedKeys? }): RateLimiter`, `clientAddress(req: Request): string | null`, `clientIp(req: Request): string`; `accessRateLimits: Record<'signup' | 'resend' | 'confirm' | 'resetRequest' | 'resetCode', RateLimiter>`, `type AccessAction`, `accessClientKey(req: Request): string`; `hasTrustedOrigin(req: Request): boolean`; `NO_STORE`, `jsonNoStore(body: unknown, status?: number, headers?: Record<string, string>): NextResponse`, `readJsonObject(req: Request): Promise<Record<string, unknown>>`, `rejectWhenSignupClosed(): NextResponse | null`, `rejectUntrustedOrLimited(req: Request, action: AccessAction): NextResponse | null`, `type CodeFailure = 'invalid-code' | 'weak-password' | 'failed'`, `codeFailure(reason: CodeFailure, status: number): NextResponse`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/rateLimit.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clientAddress, clientIp, createRateLimiter } from '@/lib/rateLimit'
import { rateLimit } from '@/lib/mapa/rateLimit'

afterEach(() => {
  vi.useRealTimers()
})

describe('createRateLimiter', () => {
  it('allows max requests per window, then answers with the seconds to wait', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 })
    expect(limiter.consume('a').ok).toBe(true)
    vi.setSystemTime(10_000)
    expect(limiter.consume('a').ok).toBe(true)
    expect(limiter.consume('a')).toEqual({ ok: false, retryAfter: 50 })
    vi.setSystemTime(60_001)
    expect(limiter.consume('a').ok).toBe(true)
  })

  it('keeps one budget per key and one per limiter', () => {
    const first = createRateLimiter({ windowMs: 60_000, max: 1 })
    const second = createRateLimiter({ windowMs: 60_000, max: 1 })
    expect(first.consume('a').ok).toBe(true)
    expect(first.consume('a').ok).toBe(false)
    expect(first.consume('b').ok).toBe(true)
    expect(second.consume('a').ok).toBe(true)
  })

  it('forgets everything on clear', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 })
    limiter.consume('a')
    limiter.clear()
    expect(limiter.consume('a').ok).toBe(true)
  })
})

describe('the map limiter', () => {
  it('still allows 60 requests per minute per IP', () => {
    for (let i = 0; i < 60; i++) expect(rateLimit('192.0.2.60').ok).toBe(true)
    expect(rateLimit('192.0.2.60').ok).toBe(false)
  })
})

describe('client address', () => {
  const req = (headers: Record<string, string>) => new Request('http://localhost/', { headers })

  it('takes the first x-forwarded-for hop, then x-real-ip', () => {
    expect(clientAddress(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7')
    expect(clientAddress(req({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2')
    expect(clientAddress(req({}))).toBeNull()
  })

  it('keeps the map limiter\'s "unknown" fallback', () => {
    expect(clientIp(req({}))).toBe('unknown')
  })
})
```

```ts
// tests/lib/access/trustedOrigin.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasTrustedOrigin } from '@/lib/access/trustedOrigin'

afterEach(() => {
  vi.unstubAllEnvs()
})

const post = (url: string, headers: Record<string, string>) => new Request(url, { method: 'POST', headers })
const URL_LOCAL = 'http://localhost:3000/api/signup'

describe('hasTrustedOrigin', () => {
  it('accepts a same-origin request from the browser', () => {
    expect(hasTrustedOrigin(post(URL_LOCAL, { 'sec-fetch-site': 'same-origin', origin: 'http://localhost:3000' }))).toBe(true)
  })

  it('refuses a cross-site request whatever its other headers say', () => {
    expect(hasTrustedOrigin(post(URL_LOCAL, { 'sec-fetch-site': 'cross-site', origin: 'http://localhost:3000' }))).toBe(false)
    expect(hasTrustedOrigin(post(URL_LOCAL, { origin: 'https://evil.example' }))).toBe(false)
    expect(hasTrustedOrigin(post(URL_LOCAL, { referer: 'https://evil.example/page' }))).toBe(false)
    expect(hasTrustedOrigin(post(URL_LOCAL, { origin: 'null' }))).toBe(false)
  })

  it('refuses a request without any of the three headers', () => {
    expect(hasTrustedOrigin(post(URL_LOCAL, {}))).toBe(false)
  })

  it('trusts APP_BASE_URL behind a proxy that rewrites the request host', () => {
    const proxied = post('http://0.0.0.0:3000/api/signup', {
      'sec-fetch-site': 'same-origin',
      origin: 'https://caativar.example.org',
      referer: 'https://caativar.example.org/cadastro',
    })
    vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org/')
    expect(hasTrustedOrigin(proxied)).toBe(true)
    vi.stubEnv('APP_BASE_URL', '')
    expect(hasTrustedOrigin(proxied)).toBe(false)
  })
})
```

```ts
// tests/lib/access/http.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { codeFailure, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'
import { accessClientKey, accessRateLimits } from '@/lib/access/rateLimits'

beforeEach(() => {
  for (const limiter of Object.values(accessRateLimits)) limiter.clear()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const trusted = (headers: Record<string, string> = {}) => new Request('http://localhost/api/signup', {
  method: 'POST',
  headers: { 'sec-fetch-site': 'same-origin', 'x-forwarded-for': '203.0.113.7', ...headers },
})

describe('rejectWhenSignupClosed', () => {
  it('answers 404 while signup is closed and nothing while open', () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    const closed = rejectWhenSignupClosed()
    expect(closed?.status).toBe(404)
    expect(closed?.headers.get('Cache-Control')).toBe('no-store')
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    expect(rejectWhenSignupClosed()).toBeNull()
  })
})

describe('rejectUntrustedOrLimited', () => {
  it('refuses an untrusted origin with 403 before spending the budget', () => {
    expect(rejectUntrustedOrLimited(trusted({ 'sec-fetch-site': 'cross-site' }), 'resend')?.status).toBe(403)
    for (let i = 0; i < 10; i++) expect(rejectUntrustedOrLimited(trusted(), 'resend')).toBeNull()
  })

  it("answers 429 with Retry-After once the action's budget is spent, per action and per address", () => {
    for (let i = 0; i < 10; i++) rejectUntrustedOrLimited(trusted(), 'resend')
    const limited = rejectUntrustedOrLimited(trusted(), 'resend')
    expect(limited?.status).toBe(429)
    expect(Number(limited?.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(rejectUntrustedOrLimited(trusted(), 'confirm')).toBeNull()
    expect(rejectUntrustedOrLimited(trusted({ 'x-forwarded-for': '198.51.100.2' }), 'resend')).toBeNull()
  })
})

describe('accessClientKey', () => {
  it('keys by address, falling back to the user agent with an error in the log', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(accessClientKey(trusted())).toBe('ip:203.0.113.7')
    expect(error).not.toHaveBeenCalled()
    const noAddress = new Request('http://localhost/', { headers: { 'user-agent': 'Mozilla/5.0' } })
    expect(accessClientKey(noAddress)).toBe('ua:Mozilla/5.0')
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('readJsonObject', () => {
  it('returns the object, or {} for broken JSON and non-objects', async () => {
    const body = (text: string) => new Request('http://localhost/', { method: 'POST', body: text })
    expect(await readJsonObject(body('{"email":"a@b.co"}'))).toEqual({ email: 'a@b.co' })
    expect(await readJsonObject(body('{broken'))).toEqual({})
    expect(await readJsonObject(body('[1,2]'))).toEqual({})
    expect(await readJsonObject(body('"text"'))).toEqual({})
  })
})

describe('codeFailure', () => {
  it('names the reason in the body, uncached', async () => {
    const res = codeFailure('invalid-code', 410)
    expect(res.status).toBe(410)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ reason: 'invalid-code' })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/rateLimit.test.ts tests/lib/access/trustedOrigin.test.ts tests/lib/access/http.test.ts`
Expected: FAIL: `@/lib/rateLimit`, `@/lib/access/trustedOrigin` and `@/lib/access/http` do not resolve.

- [ ] **Step 3: Write `lib/rateLimit.ts`**

```ts
// In-memory sliding-window rate limiters, keyed by client. Suitable for a single Node instance:
// state lives in module scope and is NOT shared across instances; for a multi-instance deploy,
// move this to Redis or a shared store.

export interface RateLimitResult {
  ok: boolean
  /** Seconds until the oldest request in the window expires; only meaningful when `ok` is false. */
  retryAfter: number
}

export interface RateLimiter {
  consume(key: string): RateLimitResult
  clear(): void
}

export function createRateLimiter({ windowMs, max, maxTrackedKeys = 10_000 }: {
  windowMs: number
  max: number
  /** Safety cap so the map cannot grow unbounded. */
  maxTrackedKeys?: number
}): RateLimiter {
  const hits = new Map<string, number[]>()

  return {
    consume(key) {
      const now = Date.now()
      const windowStart = now - windowMs
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart)

      if (recent.length >= max) {
        hits.set(key, recent)
        return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) }
      }

      recent.push(now)
      hits.set(key, recent)

      // Opportunistic pruning: when the map gets large, drop keys whose whole window has expired
      // so memory stays bounded.
      if (hits.size > maxTrackedKeys) {
        for (const [trackedKey, times] of hits) {
          if (times.length === 0 || times[times.length - 1] <= windowStart) hits.delete(trackedKey)
        }
      }

      return { ok: true, retryAfter: 0 }
    },
    clear() {
      hits.clear()
    },
  }
}

/** The client address from proxy headers (the deploy's reverse proxy sets x-forwarded-for), or null. */
export function clientAddress(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip')?.trim() || null
}

/** Best-effort client IP for the map's limiter; 'unknown' when no proxy header is present. */
export function clientIp(req: Request): string {
  return clientAddress(req) ?? 'unknown'
}
```

- [ ] **Step 4: Rewrite `lib/mapa/rateLimit.ts` on top of it**

```ts
// The map and report routes' per-IP limit: 60 requests per minute. The limiter lives in
// lib/rateLimit.ts, shared with the signup routes (lib/access/rateLimits.ts); the exports here
// stay as they were, so the routes importing them do not change.
import { createRateLimiter, type RateLimitResult } from '@/lib/rateLimit'

export { clientIp } from '@/lib/rateLimit'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 60 // per IP per window

const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX_REQUESTS })

/** Record a request from `ip` and report whether it is within the limit. */
export function rateLimit(ip: string): RateLimitResult {
  return limiter.consume(ip)
}
```

- [ ] **Step 5: Write `lib/access/rateLimits.ts` and `lib/access/trustedOrigin.ts`**

```ts
// lib/access/rateLimits.ts
import { clientAddress, createRateLimiter } from '@/lib/rateLimit'

const WINDOW_MS = 60_000

/**
 * One budget per action, not one shared: signup happens before there is a session, so the key is
 * the network address, and a whole office often reaches the internet through one. The limits
 * follow each action's cost.
 */
export const accessRateLimits = {
  /** Creates an account and sends mail. A whole training session can sign up from one building. */
  signup: createRateLimiter({ windowMs: WINDOW_MS, max: 20 }),
  /** Sends mail on every call. */
  resend: createRateLimiter({ windowMs: WINDOW_MS, max: 10 }),
  /** The page checks the code as soon as it opens, and mail clients open links on their own to scan them. */
  confirm: createRateLimiter({ windowMs: WINDOW_MS, max: 40 }),
  /** "Esqueci minha senha": sends mail on every call. */
  resetRequest: createRateLimiter({ windowMs: WINDOW_MS, max: 10 }),
  /** Checking and using the reset code; the page checks it as soon as it opens. */
  resetCode: createRateLimiter({ windowMs: WINDOW_MS, max: 40 }),
}

export type AccessAction = keyof typeof accessRateLimits

/**
 * The client key of an unauthenticated request. The last resort is the user agent, never a fixed
 * key: one bucket for the whole world could be spent once a minute to block signup for everyone.
 * Reaching it also means the proxy is not forwarding the address, which is an infrastructure
 * problem and has to show up in the log.
 */
export function accessClientKey(req: Request): string {
  const address = clientAddress(req)
  if (address) return `ip:${address}`

  console.error('[access] no client address header: rate limiting falls back to the user agent. Check that the proxy forwards x-forwarded-for.')
  return `ua:${req.headers.get('user-agent')?.trim() || 'unknown'}`
}
```

```ts
// lib/access/trustedOrigin.ts
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
```

- [ ] **Step 6: Write `lib/access/http.ts`**

```ts
import { NextResponse } from 'next/server'
import { isSignupOpen } from '@/lib/access/flag'
import { accessClientKey, accessRateLimits, type AccessAction } from '@/lib/access/rateLimits'
import { hasTrustedOrigin } from '@/lib/access/trustedOrigin'

export const NO_STORE = { 'Cache-Control': 'no-store' } as const

export function jsonNoStore(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } })
}

/** The request body as an object; broken JSON or anything but an object becomes {}. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * The signup routes answer 404 while signup is closed (lib/access/flag.ts). Hiding the link on the
 * login card is not enough: the route would keep creating accounts for whoever called it.
 *
 *   const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'signup')
 *   if (refused) return refused
 */
export function rejectWhenSignupClosed(): NextResponse | null {
  return isSignupOpen() ? null : jsonNoStore({ error: 'Not found.' }, 404)
}

/**
 * The common door of the public access routes: a trusted origin, then the action's rate limit.
 * Returns the refusal, or null to go on.
 */
export function rejectUntrustedOrLimited(req: Request, action: AccessAction): NextResponse | null {
  if (!hasTrustedOrigin(req)) {
    return jsonNoStore({ error: 'Origem da requisição não autorizada.' }, 403)
  }

  const limit = accessRateLimits[action].consume(accessClientKey(req))
  if (!limit.ok) {
    return jsonNoStore(
      { error: 'Muitas tentativas. Tente novamente em instantes.' },
      429,
      { 'Retry-After': String(limit.retryAfter) },
    )
  }

  return null
}

/** Why a one-time code request failed, named in the body so the page picks its own copy. */
export type CodeFailure = 'invalid-code' | 'weak-password' | 'failed'

export function codeFailure(reason: CodeFailure, status: number) {
  return jsonNoStore({ reason }, status)
}
```

- [ ] **Step 7: Run the new tests and the whole suite**

Run: `npx vitest run tests/lib/rateLimit.test.ts tests/lib/access/trustedOrigin.test.ts tests/lib/access/http.test.ts && npm test`
Expected: PASS, including `tests/app/territoriosRoutes.test.ts` and `tests/app/reportRoutes.test.ts`, which mock `@/lib/mapa/rateLimit` and see the same exports.

- [ ] **Step 8: Lint and commit**

```bash
npm run lint
git add lib/rateLimit.ts lib/mapa/rateLimit.ts lib/access/rateLimits.ts lib/access/trustedOrigin.ts lib/access/http.ts tests/lib/rateLimit.test.ts tests/lib/access/trustedOrigin.test.ts tests/lib/access/http.test.ts
git commit -m "feat: add the rate limits and origin check for the access routes"
```

---

### Task 5: Mailer, email links and the messages

**Files:**
- Modify: `package.json`, `package-lock.json` (`nodemailer`, `@types/nodemailer`)
- Create: `lib/mailer.ts`, `lib/access/urls.ts`, `lib/access/emails.ts`
- Test: `tests/lib/mailer.test.ts`, `tests/lib/access/emails.test.ts`

**Interfaces:**
- Consumes: path constants (Task 2).
- Produces: `interface MailMessage { to; subject; html; text }`, `isMailerConfigured(): boolean`, `resetMailer(): void`, `escapeHtml(value: string): string`, `sendMail(message: MailMessage): Promise<{ delivered: boolean }>`; `appBaseUrl(): string`, `absoluteUrl(path: string): string`, `signupConfirmationUrl(code: string, email: string): string`, `passwordResetUrl(code: string): string`, `approvalsUrl(): string`, `loginUrl(): string`; `type EmailDraft = Omit<MailMessage, 'to'>`, `buildVerificationEmail({ link })`, `buildNewRequestEmail({ email, intention, approvalUrl })`, `buildDecisionEmail({ status: 'approved' | 'rejected', loginUrl })`, `buildPasswordResetEmail({ link })`, each returning `EmailDraft`.

- [ ] **Step 1: Install the mailer**

Run: `npm install nodemailer@^10.0.10 && npm install -D @types/nodemailer@^8.0.2`
Expected: both land in `package.json` (the same ranges SAP uses).

- [ ] **Step 2: Write the failing tests**

```ts
// tests/lib/mailer.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ sendMail: vi.fn(), createTransport: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }))

import { escapeHtml, isMailerConfigured, resetMailer, sendMail } from '@/lib/mailer'

const message = { to: 'fulana@ufcg.edu.br', subject: 'Assunto', html: '<p>corpo</p>', text: 'corpo com link https://x/?code=SECRET' }

beforeEach(() => {
  vi.resetAllMocks()
  resetMailer()
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail })
  mocks.sendMail.mockResolvedValue({})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sendMail', () => {
  it('logs instead of sending without credentials, and keeps the body out of the log', async () => {
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASSWORD', '')
    vi.stubEnv('MAIL_LOG_BODY', '')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    expect(await sendMail(message)).toEqual({ delivered: false })
    expect(mocks.createTransport).not.toHaveBeenCalled()
    expect(info.mock.calls.flat().join(' ')).not.toContain('SECRET')
  })

  it('logs the unsent email as an error in production', async () => {
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('NODE_ENV', 'production')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await sendMail(message)

    expect(error).toHaveBeenCalledOnce()
  })

  it('prints the body only with MAIL_LOG_BODY=true', async () => {
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('MAIL_LOG_BODY', 'true')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    await sendMail(message)

    expect(info.mock.calls.flat().join(' ')).toContain('SECRET')
  })

  it('sends through Gmail SMTP from SMTP_FROM, or from SMTP_USER', async () => {
    vi.stubEnv('SMTP_USER', 'plataforma@gmail.com')
    vi.stubEnv('SMTP_PASSWORD', 'app-password')
    vi.stubEnv('SMTP_FROM', '')
    expect(isMailerConfigured()).toBe(true)

    expect(await sendMail(message)).toEqual({ delivered: true })
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.gmail.com', port: 465, secure: true }))
    expect(mocks.sendMail).toHaveBeenCalledWith({ ...message, from: 'plataforma@gmail.com' })
  })
})

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })
})
```

```ts
// tests/lib/access/emails.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDecisionEmail, buildNewRequestEmail, buildPasswordResetEmail, buildVerificationEmail } from '@/lib/access/emails'
import { approvalsUrl, loginUrl, passwordResetUrl, signupConfirmationUrl } from '@/lib/access/urls'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('email links', () => {
  it('builds absolute links from APP_BASE_URL, without a doubled slash', () => {
    vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org/')
    expect(signupConfirmationUrl('C0DE', 'fulana@ufcg.edu.br'))
      .toBe('https://caativar.example.org/cadastro/confirmacao?code=C0DE&email=fulana%40ufcg.edu.br')
    expect(passwordResetUrl('C0DE')).toBe('https://caativar.example.org/redefinir-senha?code=C0DE')
    expect(approvalsUrl()).toBe('https://caativar.example.org/aprovacoes')
    expect(loginUrl()).toBe('https://caativar.example.org/login')
  })

  it('falls back to the dev server in development and logs an error in production', () => {
    vi.stubEnv('APP_BASE_URL', '')
    expect(loginUrl()).toBe('http://localhost:3000/login')
    vi.stubEnv('NODE_ENV', 'production')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(loginUrl()).toBe('/login')
    expect(error).toHaveBeenCalledOnce()
  })
})

const LINK = 'https://caativar.example.org/cadastro/confirmacao?code=C0DE&email=fulana%40ufcg.edu.br'
const FOOTER = 'Caativar — monitoramento do carbono florestal da Caatinga'

describe('confirmation email', () => {
  it('carries the link under the button and in the text part, and says to ignore an unknown signup', () => {
    const email = buildVerificationEmail({ link: LINK })
    expect(email.subject).toBe('Confirme seu endereço de e-mail — Caativar')
    expect(email.html).toContain(`href="${LINK.replace('&', '&amp;')}"`)
    expect(email.html).toContain('Confirmar e escolher senha')
    expect(email.html).toContain('Se o botão não funcionar, copie este endereço no navegador:')
    expect(email.text).toContain(LINK)
    expect(email.text).toContain('Se você não fez este cadastro, ignore este e-mail.')
    expect(email.text).toContain(FOOTER)
  })
})

describe('new request email', () => {
  it('escapes what a stranger typed', () => {
    const email = buildNewRequestEmail({
      email: 'x"><script>@evil.co',
      intention: '<img src=x onerror=alert(1)>\nPesquisa',
      approvalUrl: 'https://caativar.example.org/aprovacoes',
    })
    expect(email.subject).toBe('Novo pedido de acesso à Caativar')
    expect(email.html).not.toContain('<script>')
    expect(email.html).not.toContain('<img')
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(email.text).toContain('<img src=x onerror=alert(1)>')
    expect(email.html).toContain('href="https://caativar.example.org/aprovacoes"')
  })

  it('says when the intention was lost', () => {
    expect(buildNewRequestEmail({ email: 'a@b.co', intention: '', approvalUrl: 'u' }).text).toContain('(não informada)')
  })
})

describe('decision email', () => {
  it('links the login on approval and links nothing on rejection', () => {
    const approved = buildDecisionEmail({ status: 'approved', loginUrl: 'https://caativar.example.org/login' })
    expect(approved.subject).toBe('Seu acesso à Caativar foi liberado')
    expect(approved.html).toContain('href="https://caativar.example.org/login"')
    expect(approved.html).toContain('Entrar na Caativar')

    const rejected = buildDecisionEmail({ status: 'rejected', loginUrl: 'https://caativar.example.org/login' })
    expect(rejected.subject).toBe('Sobre seu pedido de acesso à Caativar')
    expect(rejected.html).not.toContain('href=')
    expect(rejected.text).not.toContain('https://')
  })
})

describe('password reset email', () => {
  it('carries the link and tells whoever did not ask to ignore it', () => {
    const email = buildPasswordResetEmail({ link: 'https://caativar.example.org/redefinir-senha?code=C0DE' })
    expect(email.subject).toBe('Redefina sua senha — Caativar')
    expect(email.text).toContain('https://caativar.example.org/redefinir-senha?code=C0DE')
    expect(email.text).toContain('Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma.')
  })
})
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run tests/lib/mailer.test.ts tests/lib/access/emails.test.ts`
Expected: FAIL: `@/lib/mailer`, `@/lib/access/emails` and `@/lib/access/urls` do not resolve.

- [ ] **Step 4: Write `lib/mailer.ts`**

```ts
import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

/**
 * The only module that talks to the world outside the platform: confirm your address, a new
 * access request, a decision, a password reset.
 *
 * Sent through Google's SMTP with an app password of the sending account (SMTP_USER), whose domain
 * already has SPF and DKIM, so the mail reaches the inbox without DNS work. Switching to a sending
 * service changes this file and no other.
 */

const SMTP_HOST = 'smtp.gmail.com'
const SMTP_PORT = 465

export interface MailMessage {
  to: string
  subject: string
  html: string
  /** Always present: clients without HTML need it, and leaving it out raises the spam score. */
  text: string
}

let transporter: Transporter | null = null

export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD)
}

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
  return transporter
}

/** Lets a test swap credentials between cases. */
export function resetMailer() {
  transporter = null
}

/** Text from outside (an address, the intention) enters an HTML email as text, never as markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Without credentials, logs instead of sending: that keeps local development working without an
 * app password. In production the same line is an error, because signup then answers success and
 * nobody ever receives anything.
 *
 * The body is NOT logged by default: it carries the confirmation or reset link, a credential.
 * MAIL_LOG_BODY=true prints it, for local debugging only.
 */
export async function sendMail({ to, subject, html, text }: MailMessage): Promise<{ delivered: boolean }> {
  if (!isMailerConfigured()) {
    const announce = process.env.NODE_ENV === 'production' ? console.error : console.info
    announce(`[mailer] no SMTP credentials; email NOT sent — to: ${to} · subject: ${subject}`)
    if (process.env.MAIL_LOG_BODY === 'true') console.info(`[mailer] body:\n${text}`)
    return { delivered: false }
  }

  await getTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html, text })
  return { delivered: true }
}
```

- [ ] **Step 5: Write `lib/access/urls.ts`**

```ts
import { APPROVALS_PATH, LOGIN_PATH, PASSWORD_RESET_PATH, SIGNUP_CONFIRMATION_PATH } from '@/lib/access/paths'

const DEVELOPMENT_BASE_URL = 'http://localhost:3000'

/**
 * The public origin for links inside emails: an inbox has no relative links. APP_BASE_URL is set
 * per environment; development falls back to the dev server, and production without it logs an
 * error, because every link it sends would be broken.
 */
export function appBaseUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured

  if (process.env.NODE_ENV === 'production') {
    console.error('[access] APP_BASE_URL is not set: links in emails will be broken.')
    return ''
  }
  return DEVELOPMENT_BASE_URL
}

export function absoluteUrl(path: string): string {
  return `${appBaseUrl()}${path}`
}

/** The address rides along only to fill the page's resend button; the confirm route reads the email from the code. */
export function signupConfirmationUrl(code: string, email: string): string {
  return `${absoluteUrl(SIGNUP_CONFIRMATION_PATH)}?${new URLSearchParams({ code, email })}`
}

export function passwordResetUrl(code: string): string {
  return `${absoluteUrl(PASSWORD_RESET_PATH)}?${new URLSearchParams({ code })}`
}

export const approvalsUrl = () => absoluteUrl(APPROVALS_PATH)
export const loginUrl = () => absoluteUrl(LOGIN_PATH)
```

- [ ] **Step 6: Write `lib/access/emails.ts`**

```ts
import { escapeHtml, type MailMessage } from '@/lib/mailer'

/**
 * The messages the platform sends, in Portuguese. Rules that hold for every one, for a reason:
 * - inline CSS only: mail clients drop style sheets;
 * - no image the message depends on: many inboxes block images by default;
 * - the URL written out under every button, for whoever cannot see or distrusts the button;
 * - a plain-text part beside the HTML.
 * Colors from the login card (components/auth/AuthCard.tsx).
 */

export type EmailDraft = Omit<MailMessage, 'to'>

const INK = '#26241d'
const MUTED = '#6b6a60'
const ACCENT = '#5f7030'
const BORDER = '#e4dfcf'
const PAGE = '#f4f1e8'
const CARD = '#fffdf7'

const FALLBACK = 'Se o botão não funcionar, copie este endereço no navegador:'
const FOOTER = 'Caativar — monitoramento do carbono florestal da Caatinga'

function layout(title: string, body: string): string {
  return [
    `<div style="margin:0;padding:24px;background:${PAGE};font-family:Helvetica,Arial,sans-serif;color:${INK};">`,
    `<div style="max-width:520px;margin:0 auto;padding:28px;background:${CARD};border:1px solid ${BORDER};border-radius:12px;">`,
    `<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${INK};">${escapeHtml(title)}</h1>`,
    body,
    `<p style="margin:28px 0 0;padding-top:16px;border-top:1px solid ${BORDER};font-size:12px;line-height:1.5;color:${MUTED};">${escapeHtml(FOOTER)}</p>`,
    `</div></div>`,
  ].join('')
}

/** `content` is HTML: callers escape whatever came from outside. */
function paragraph(content: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${MUTED};">${content}</p>`
}

/** A smaller closing line, for "ignore this if it was not you". */
function note(content: string): string {
  return `<p style="margin:22px 0 0;font-size:13px;line-height:1.55;color:${MUTED};">${escapeHtml(content)}</p>`
}

/** The button plus the URL written out right below it, never the button alone. */
function callToAction(label: string, url: string): string {
  const href = escapeHtml(url)
  return [
    `<p style="margin:22px 0 10px;">`,
    `<a href="${href}" style="display:inline-block;padding:11px 18px;background:${ACCENT};color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:9px;">${escapeHtml(label)}</a>`,
    `</p>`,
    `<p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;">${escapeHtml(FALLBACK)}<br>${href}</p>`,
  ].join('')
}

function plainText(...blocks: string[]): string {
  return [...blocks, FOOTER].join('\n\n')
}

export function buildVerificationEmail({ link }: { link: string }): EmailDraft {
  const title = 'Confirme seu endereço'
  const body = 'Recebemos um cadastro na Caativar, a plataforma de monitoramento do carbono florestal da Caatinga, com este endereço. Confirme que este e-mail pertence a você e escolha sua senha para continuar.'
  const ignore = 'Se você não fez este cadastro, ignore este e-mail.'

  return {
    subject: 'Confirme seu endereço de e-mail — Caativar',
    html: layout(title, paragraph(escapeHtml(body)) + callToAction('Confirmar e escolher senha', link) + note(ignore)),
    text: plainText(title, body, link, ignore),
  }
}

/** Goes to the team's mailbox. The address and the intention were typed by a stranger. */
export function buildNewRequestEmail({ email, intention, approvalUrl }: {
  email: string
  intention: string
  approvalUrl: string
}): EmailDraft {
  const title = 'Novo pedido de acesso'
  const label = 'Intenção de uso descrita no cadastro:'
  // Empty when settlement had to open a request the signup failed to record.
  const shownIntention = intention || '(não informada)'

  return {
    subject: 'Novo pedido de acesso à Caativar',
    html: layout(
      title,
      paragraph(`<strong>${escapeHtml(email)}</strong> confirmou o endereço e aguarda liberação.`) +
        paragraph(escapeHtml(label)) +
        `<blockquote style="margin:0 0 14px;padding:12px 14px;background:${PAGE};border-left:3px solid ${ACCENT};font-size:14px;line-height:1.55;color:${INK};white-space:pre-wrap;">${escapeHtml(shownIntention)}</blockquote>` +
        callToAction('Abrir a tela de aprovação', approvalUrl),
    ),
    text: plainText(
      title,
      `${email} confirmou o endereço e aguarda liberação.`,
      `${label}\n${shownIntention}`,
      `Decida na tela de aprovação:\n${approvalUrl}`,
    ),
  }
}

export function buildDecisionEmail({ status, loginUrl }: { status: 'approved' | 'rejected'; loginUrl: string }): EmailDraft {
  if (status === 'approved') {
    const title = 'Acesso liberado'
    const body = 'Seu cadastro foi aprovado. A plataforma está disponível para acesso.'
    return {
      subject: 'Seu acesso à Caativar foi liberado',
      html: layout(title, paragraph(escapeHtml(body)) + callToAction('Entrar na Caativar', loginUrl)),
      text: plainText(title, body, loginUrl),
    }
  }

  // No login link: pointing at a door that does not open is worse than pointing at none.
  const title = 'Pedido não aprovado'
  const body = 'Analisamos seu pedido de acesso à Caativar e ele não foi aprovado desta vez.'
  const followUp = 'Caso acredite que houve um engano, responda a este e-mail descrevendo como pretende usar a plataforma.'
  return {
    subject: 'Sobre seu pedido de acesso à Caativar',
    html: layout(title, paragraph(escapeHtml(body)) + paragraph(escapeHtml(followUp))),
    text: plainText(title, body, followUp),
  }
}

/** Says what to do if the person did not ask: anyone can type someone else's address. */
export function buildPasswordResetEmail({ link }: { link: string }): EmailDraft {
  const title = 'Redefinir senha'
  const body = 'Recebemos um pedido para trocar a senha da sua conta na Caativar. Use o botão abaixo para escolher uma nova senha. O link vale por uma hora e só pode ser usado uma vez.'
  const ignore = 'Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma.'

  return {
    subject: 'Redefina sua senha — Caativar',
    html: layout(title, paragraph(escapeHtml(body)) + callToAction('Escolher nova senha', link) + note(ignore)),
    text: plainText(title, body, link, ignore),
  }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/mailer.test.ts tests/lib/access/emails.test.ts`
Expected: PASS.

- [ ] **Step 8: Lint and commit**

```bash
npm run lint
git add package.json package-lock.json lib/mailer.ts lib/access/urls.ts lib/access/emails.ts tests/lib/mailer.test.ts tests/lib/access/emails.test.ts
git commit -m "feat: add the mailer and the signup emails"
```

---

### Task 6: Identity Toolkit action codes

**Files:**
- Create: `lib/access/firebaseCodes.ts`
- Test: `tests/lib/access/firebaseCodes.test.ts`

**Interfaces:**
- Produces: `type ActionCodeType = 'VERIFY_EMAIL' | 'PASSWORD_RESET'`, `extractOobCode(firebaseLink: string): string | null`, `checkActionCode(code: string, expected: ActionCodeType): Promise<string | null>` (the email, lowercased; spends nothing), `applyVerificationCode(code: string): Promise<string | null>`, `type PasswordResetResult = { status: 'changed'; email: string } | { status: 'invalid-code' } | { status: 'weak-password' } | { status: 'failed' }`, `resetPasswordWithCode(code: string, newPassword: string): Promise<PasswordResetResult>`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/access/firebaseCodes.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyVerificationCode, checkActionCode, extractOobCode, resetPasswordWithCode } from '@/lib/access/firebaseCodes'

const fetchMock = vi.fn<typeof fetch>()

function toolkitResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function lastCall() {
  const call = fetchMock.mock.calls.at(-1)
  if (!call) throw new Error('fetch was not called')
  const [url, init] = call
  return { url: String(url), body: JSON.parse(String(init?.body)) as Record<string, string> }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'public-key')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('extractOobCode', () => {
  it('reads the code out of a Firebase action link', () => {
    expect(extractOobCode('https://p.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=C0DE&apiKey=k')).toBe('C0DE')
    expect(extractOobCode('not a url')).toBeNull()
  })
})

describe('checkActionCode', () => {
  it('returns the lowercased email of a valid code of the expected type, through resetPassword without a password', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(200, { email: 'Fulana@UFCG.edu.br', requestType: 'VERIFY_EMAIL' }))

    expect(await checkActionCode('C0DE', 'VERIFY_EMAIL')).toBe('fulana@ufcg.edu.br')
    expect(lastCall()).toEqual({
      url: 'https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=public-key',
      body: { oobCode: 'C0DE' },
    })
  })

  it('refuses a code of another type', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(200, { email: 'a@b.co', requestType: 'VERIFY_EMAIL' }))
    expect(await checkActionCode('C0DE', 'PASSWORD_RESET')).toBeNull()
  })

  it('returns null for an invalid code, an unreachable Firebase or a missing API key', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'INVALID_OOB_CODE' } }))
    expect(await checkActionCode('C0DE', 'VERIFY_EMAIL')).toBeNull()

    fetchMock.mockRejectedValueOnce(new Error('network'))
    expect(await checkActionCode('C0DE', 'VERIFY_EMAIL')).toBeNull()

    vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', '')
    expect(await checkActionCode('C0DE', 'VERIFY_EMAIL')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('applyVerificationCode', () => {
  it('applies the code through accounts:update and returns the email it confirmed', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(200, { email: 'fulana@ufcg.edu.br', emailVerified: true }))

    expect(await applyVerificationCode('C0DE')).toBe('fulana@ufcg.edu.br')
    expect(lastCall()).toEqual({
      url: 'https://identitytoolkit.googleapis.com/v1/accounts:update?key=public-key',
      body: { oobCode: 'C0DE' },
    })
  })

  it('returns null when the code does not apply', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'EXPIRED_OOB_CODE' } }))
    expect(await applyVerificationCode('C0DE')).toBeNull()
  })
})

describe('resetPasswordWithCode', () => {
  it('changes the password and returns the account email', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(200, { email: 'fulana@ufcg.edu.br', requestType: 'PASSWORD_RESET' }))

    expect(await resetPasswordWithCode('C0DE', 'nova-senha-123')).toEqual({ status: 'changed', email: 'fulana@ufcg.edu.br' })
    expect(lastCall().body).toEqual({ oobCode: 'C0DE', newPassword: 'nova-senha-123' })
  })

  it('tells an invalid code from a weak password from anything else, without logging the password', async () => {
    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'EXPIRED_OOB_CODE' } }))
    expect(await resetPasswordWithCode('C0DE', 'x')).toEqual({ status: 'invalid-code' })

    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'PASSWORD_DOES_NOT_MEET_REQUIREMENTS : Missing password requirements' } }))
    expect(await resetPasswordWithCode('C0DE', 'x')).toEqual({ status: 'weak-password' })

    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(toolkitResponse(400, { error: { message: 'OPERATION_NOT_ALLOWED' } }))
    expect(await resetPasswordWithCode('C0DE', 'segredo-123')).toEqual({ status: 'failed' })
    expect(error.mock.calls.flat().join(' ')).not.toContain('segredo-123')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/access/firebaseCodes.test.ts`
Expected: FAIL: `@/lib/access/firebaseCodes` does not resolve.

- [ ] **Step 3: Write `lib/access/firebaseCodes.ts`**

```ts
import 'server-only'

/**
 * Firebase's one-time action codes, used without Firebase's action page. The links the Admin SDK
 * generates point at <project>.firebaseapp.com, an English page with the project's internal name
 * in the address bar; what confirms an address or resets a password is the `oobCode` inside. The
 * emails carry that code to our own pages, and the server hands it to Identity Toolkit.
 *
 * Codes and passwords are credentials: nothing here logs them.
 */

const IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/v1'

export type ActionCodeType = 'VERIFY_EMAIL' | 'PASSWORD_RESET'

type ToolkitResult = { ok: true; payload: Record<string, unknown> } | { ok: false; message: string }

/** The one-time code inside a link generated by the Admin SDK, or null. */
export function extractOobCode(firebaseLink: string): string | null {
  try {
    return new URL(firebaseLink).searchParams.get('oobCode')
  } catch {
    return null
  }
}

async function callIdentityToolkit(
  endpoint: 'accounts:resetPassword' | 'accounts:update',
  body: Record<string, string>,
): Promise<ToolkitResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    console.error('[access] NEXT_PUBLIC_FIREBASE_API_KEY is not set: action codes cannot be checked or applied.')
    return null
  }

  try {
    const response = await fetch(`${IDENTITY_TOOLKIT}/${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null

    if (!response.ok) {
      const error = payload?.error as { message?: unknown } | undefined
      return { ok: false, message: typeof error?.message === 'string' ? error.message : '' }
    }
    return { ok: true, payload: payload ?? {} }
  } catch {
    console.error('[access] could not reach Identity Toolkit.')
    return null
  }
}

function lowercasedEmail(payload: Record<string, unknown>): string | null {
  return typeof payload.email === 'string' && payload.email ? payload.email.toLowerCase() : null
}

/**
 * The email a still-valid code belongs to, without spending the code: accounts:resetPassword with
 * only the code is what the client SDK's checkActionCode calls. Null when the code is invalid,
 * used, expired, or of another type; the endpoint accepts verification codes too, so the type is
 * checked here.
 */
export async function checkActionCode(code: string, expected: ActionCodeType): Promise<string | null> {
  const result = await callIdentityToolkit('accounts:resetPassword', { oobCode: code })
  if (!result?.ok || result.payload.requestType !== expected) return null
  return lowercasedEmail(result.payload)
}

/** Applies a verification code, which marks the address confirmed. Returns the email it confirmed, or null. */
export async function applyVerificationCode(code: string): Promise<string | null> {
  const result = await callIdentityToolkit('accounts:update', { oobCode: code })
  return result?.ok ? lowercasedEmail(result.payload) : null
}

export type PasswordResetResult =
  | { status: 'changed'; email: string }
  | { status: 'invalid-code' }
  | { status: 'weak-password' }
  | { status: 'failed' }

/** Expired, used or made-up codes: asking for a new link fixes them. */
const INVALID_CODE_ERRORS = ['EXPIRED_OOB_CODE', 'INVALID_OOB_CODE', 'EMAIL_NOT_FOUND', 'USER_DISABLED']
/** Firebase's password policy refused the new password. */
const WEAK_PASSWORD_ERRORS = ['WEAK_PASSWORD', 'PASSWORD_DOES_NOT_MEET_REQUIREMENTS']

const startsWithAny = (message: string, prefixes: string[]) => prefixes.some((prefix) => message.startsWith(prefix))

/** Changes the password with a reset code; Firebase spends the code. */
export async function resetPasswordWithCode(code: string, newPassword: string): Promise<PasswordResetResult> {
  const result = await callIdentityToolkit('accounts:resetPassword', { oobCode: code, newPassword })
  if (!result) return { status: 'failed' }

  if (result.ok) {
    const email = lowercasedEmail(result.payload)
    return email ? { status: 'changed', email } : { status: 'failed' }
  }
  if (startsWithAny(result.message, INVALID_CODE_ERRORS)) return { status: 'invalid-code' }
  if (startsWithAny(result.message, WEAK_PASSWORD_ERRORS)) return { status: 'weak-password' }

  // Firebase's message names the error type, never the code or the password.
  console.error('[access] Identity Toolkit refused the password reset:', result.message)
  return { status: 'failed' }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/access/firebaseCodes.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add lib/access/firebaseCodes.ts tests/lib/access/firebaseCodes.test.ts
git commit -m "feat: check and apply Firebase action codes on our own pages"
```

---

### Task 7: Access requests in Firestore

**Files:**
- Create: `lib/access/intention.ts`, `lib/access/requests.ts`, `tests/helpers/fakeFirestore.ts`
- Test: `tests/lib/access/requests.test.ts`

**Interfaces:**
- Consumes: `getFirebaseAdminDb`, `getFirebaseAdminAuth` (Task 3); `SignupTier` (Task 2).
- Produces: `INTENTION_MAX_LENGTH = 1000`, `normalizeIntention(value: unknown): string`; `DEFAULT_ACCESS_REQUESTS_COLLECTION`, `accessRequestsCollectionName(value?: string): string`, `type AccessRequestStatus = 'pending' | 'approved' | 'rejected'`, `type AccessDecisionStatus`, `interface AccessRequestInput { email; tier: SignupTier; intention }`, `interface AccessRequest`, `interface PendingAccessRequest extends AccessRequest { uid }`, `interface AccessDecision { status: AccessDecisionStatus; decidedBy: string | null }`, `createAccessRequest(uid, input): Promise<void>`, `readAccessRequest(uid): Promise<AccessRequest | null>`, `listPendingAccessRequests(): Promise<PendingAccessRequest[]>`, `claimTeamNotification(uid): Promise<boolean>`, `type DecisionClaim = { claimed: true; tier: SignupTier } | { claimed: false; status: AccessRequestStatus | 'missing' }`, `claimPendingDecision(uid, decision): Promise<DecisionClaim>`, `recordAccessDecision(uid, decision): Promise<void>`; test helper `createFakeFirestore(): { db, store(name): Map<string, Record<string, unknown>> }`.

- [ ] **Step 1: Write the fake Firestore helper**

```ts
// tests/helpers/fakeFirestore.ts
type Data = Record<string, unknown>

interface FakeSnapshot {
  id: string
  exists: boolean
  data(): Data | undefined
}

/**
 * The slice of the Admin SDK's Firestore that lib/access/requests.ts and the backfill script use,
 * in memory: documents by collection and id, equality filters with one ordering, listDocuments,
 * and transactions whose writes land when the callback returns.
 */
export function createFakeFirestore() {
  const collections = new Map<string, Map<string, Data>>()

  function store(name: string): Map<string, Data> {
    let docs = collections.get(name)
    if (!docs) {
      docs = new Map()
      collections.set(name, docs)
    }
    return docs
  }

  function snapshot(id: string, data: Data | undefined): FakeSnapshot {
    return { id, exists: data !== undefined, data: () => (data === undefined ? undefined : { ...data }) }
  }

  function write(name: string, id: string, data: Data, merge: boolean) {
    const current = store(name).get(id)
    if (merge && !current) throw Object.assign(new Error(`No document to update: ${name}/${id}`), { code: 5 })
    store(name).set(id, merge ? { ...current, ...data } : { ...data })
  }

  function doc(name: string, id: string) {
    return {
      id,
      get: async () => snapshot(id, store(name).get(id)),
      set: async (data: Data) => write(name, id, data, false),
      update: async (data: Data) => write(name, id, data, true),
      applyUpdate: (data: Data) => write(name, id, data, true),
    }
  }
  type FakeDoc = ReturnType<typeof doc>

  function query(name: string, filters: Array<[string, unknown]>, order: string | null) {
    return {
      where: (field: string, _op: string, value: unknown) => query(name, [...filters, [field, value]], order),
      orderBy: (field: string) => query(name, filters, field),
      get: async () => {
        const docs = [...store(name)].filter(([, data]) => filters.every(([field, value]) => data[field] === value))
        if (order) docs.sort(([, a], [, b]) => String(a[order]).localeCompare(String(b[order])))
        return { docs: docs.map(([id, data]) => snapshot(id, data)) }
      },
    }
  }

  interface FakeTransaction {
    get(ref: FakeDoc): Promise<FakeSnapshot>
    update(ref: FakeDoc, data: Data): void
  }

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => doc(name, id),
      where: (field: string, op: string, value: unknown) => query(name, [], null).where(field, op, value),
      listDocuments: async () => [...store(name).keys()].map((id) => ({ id })),
    }),
    runTransaction: async <T>(callback: (transaction: FakeTransaction) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = []
      const result = await callback({
        get: (ref) => ref.get(),
        update: (ref, data) => {
          writes.push(() => ref.applyUpdate(data))
        },
      })
      for (const apply of writes) apply()
      return result
    },
  }

  return { db, store }
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/access/requests.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'

const holder = vi.hoisted(() => ({ db: null as unknown, getUsers: vi.fn() }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminDb: () => holder.db,
  getFirebaseAdminAuth: () => ({ getUsers: holder.getUsers }),
}))

import { INTENTION_MAX_LENGTH, normalizeIntention } from '@/lib/access/intention'
import {
  accessRequestsCollectionName, claimPendingDecision, claimTeamNotification, createAccessRequest,
  listPendingAccessRequests, readAccessRequest, recordAccessDecision,
} from '@/lib/access/requests'

let fake: ReturnType<typeof createFakeFirestore>
const COLLECTION = 'access-requests-local'

function seed(uid: string, overrides: Record<string, unknown> = {}) {
  fake.store(COLLECTION).set(uid, {
    email: `${uid}@example.org`, tier: 'common', intention: 'Pesquisa', status: 'pending',
    createdAt: '2026-10-15T12:00:00.000Z', decidedAt: null, decidedBy: null, notifiedAt: null,
    ...overrides,
  })
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', '')
  fake = createFakeFirestore()
  holder.db = fake.db
  holder.getUsers.mockReset()
  holder.getUsers.mockImplementation(async (ids: Array<{ uid: string }>) => ({
    users: ids.map(({ uid }) => ({ uid, emailVerified: true })),
  }))
})

describe('normalizeIntention', () => {
  it('trims, collapses whitespace and cuts at the limit', () => {
    expect(normalizeIntention('  Pesquisa\n\n  sobre   carbono ')).toBe('Pesquisa sobre carbono')
    expect(normalizeIntention('a'.repeat(INTENTION_MAX_LENGTH + 50))).toHaveLength(1000)
    expect(normalizeIntention('   ')).toBe('')
    expect(normalizeIntention(42)).toBe('')
  })
})

describe('the collection name', () => {
  it('defaults to the development collection', () => {
    expect(accessRequestsCollectionName('')).toBe('access-requests-local')
    expect(accessRequestsCollectionName(' access-requests ')).toBe('access-requests')
  })
})

describe('createAccessRequest and readAccessRequest', () => {
  it('records a pending request under the uid, in the configured collection', async () => {
    vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', 'access-requests')

    await createAccessRequest('u1', { email: 'a@ufcg.edu.br', tier: 'allowed', intention: 'Ensino' })

    expect(fake.store('access-requests').get('u1')).toMatchObject({
      email: 'a@ufcg.edu.br', tier: 'allowed', intention: 'Ensino', status: 'pending',
      decidedAt: null, decidedBy: null, notifiedAt: null,
    })
    expect(await readAccessRequest('u1')).toMatchObject({ email: 'a@ufcg.edu.br', status: 'pending' })
    expect(await readAccessRequest('nobody')).toBeNull()
  })
})

describe('listPendingAccessRequests', () => {
  it('lists pending requests whose email is confirmed, oldest first', async () => {
    seed('late', { createdAt: '2026-10-15T15:00:00.000Z' })
    seed('early', { createdAt: '2026-10-14T09:00:00.000Z' })
    seed('decided', { status: 'approved' })
    seed('unconfirmed')
    holder.getUsers.mockImplementation(async (ids: Array<{ uid: string }>) => ({
      users: ids.map(({ uid }) => ({ uid, emailVerified: uid !== 'unconfirmed' })),
    }))

    expect((await listPendingAccessRequests()).map((request) => request.uid)).toEqual(['early', 'late'])
  })

  it('asks Firebase about at most 100 accounts at a time', async () => {
    for (let i = 0; i < 150; i++) seed(`u${String(i).padStart(3, '0')}`)

    expect(await listPendingAccessRequests()).toHaveLength(150)
    expect(holder.getUsers).toHaveBeenCalledTimes(2)
    expect(holder.getUsers.mock.calls[0][0]).toHaveLength(100)
  })
})

describe('claimTeamNotification', () => {
  it('lets exactly one caller email the team', async () => {
    seed('u1')
    expect(await claimTeamNotification('u1')).toBe(true)
    expect(await claimTeamNotification('u1')).toBe(false)
    expect(fake.store(COLLECTION).get('u1')?.notifiedAt).toEqual(expect.any(String))
    expect(await claimTeamNotification('missing')).toBe(false)
  })
})

describe('claimPendingDecision', () => {
  it('lets the first decision through, with the stored tier, and turns the second away', async () => {
    seed('u1', { tier: 'common' })

    expect(await claimPendingDecision('u1', { status: 'approved', decidedBy: 'admin@ufcg.edu.br' }))
      .toEqual({ claimed: true, tier: 'common' })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: 'admin@ufcg.edu.br' })
    expect(await claimPendingDecision('u1', { status: 'rejected', decidedBy: 'outra@ufcg.edu.br' }))
      .toEqual({ claimed: false, status: 'approved' })
    expect(await claimPendingDecision('missing', { status: 'approved', decidedBy: 'a@b.co' }))
      .toEqual({ claimed: false, status: 'missing' })
  })
})

describe('recordAccessDecision', () => {
  it('closes a request with the decision and who made it', async () => {
    seed('u1', { tier: 'allowed' })
    await recordAccessDecision('u1', { status: 'approved', decidedBy: null })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: null, decidedAt: expect.any(String) })
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/lib/access/requests.test.ts`
Expected: FAIL: `@/lib/access/intention` does not resolve.

- [ ] **Step 4: Write `lib/access/intention.ts`**

```ts
/** The intended-use text: shared by the signup form (its maxLength) and the server (the real cut). */
export const INTENTION_MAX_LENGTH = 1000

/**
 * Ready to store and later paste into an email: trimmed, whitespace collapsed, cut at the limit.
 * The textarea's maxLength is a courtesy; this cut is the one that counts.
 */
export function normalizeIntention(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, INTENTION_MAX_LENGTH)
}
```

- [ ] **Step 5: Write `lib/access/requests.ts`**

```ts
import 'server-only'

import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase-admin'
import type { SignupTier } from '@/lib/access/domains'

/**
 * The audit trail of signup: one document per account (the id is the uid), with who asked, what
 * they wrote, who decided and when. It never authorizes: the access claim does
 * (lib/access/claims.ts), read from the session cookie without a database read. It outlives the
 * decision: it is what answers "who let this person in, and when" months later.
 */

export const DEFAULT_ACCESS_REQUESTS_COLLECTION = 'access-requests-local'

/**
 * Beta and prod set `access-requests`; the default keeps local test signups out of it. Forgetting
 * the variable in production creates a visibly empty collection, which is better than forgetting
 * it locally and mixing test signups into production's approvals page.
 */
export function accessRequestsCollectionName(value = process.env.FIREBASE_ACCESS_REQUESTS_COLLECTION): string {
  return value?.trim() || DEFAULT_ACCESS_REQUESTS_COLLECTION
}

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected'
export type AccessDecisionStatus = Exclude<AccessRequestStatus, 'pending'>

export interface AccessRequestInput {
  email: string
  tier: SignupTier
  intention: string
}

export interface AccessRequest extends AccessRequestInput {
  status: AccessRequestStatus
  createdAt: string
  decidedAt: string | null
  /** The admin's email, or null when the domain rule decided. */
  decidedBy: string | null
  /** When the team was emailed; claimed in a transaction so concurrent opens send one email. */
  notifiedAt: string | null
}

export interface PendingAccessRequest extends AccessRequest {
  uid: string
}

export interface AccessDecision {
  status: AccessDecisionStatus
  decidedBy: string | null
}

function requestDoc(uid: string) {
  return getFirebaseAdminDb().collection(accessRequestsCollectionName()).doc(uid)
}

const nowIso = () => new Date().toISOString()

export async function createAccessRequest(uid: string, { email, tier, intention }: AccessRequestInput) {
  const request: AccessRequest = {
    email, tier, intention, status: 'pending', createdAt: nowIso(), decidedAt: null, decidedBy: null, notifiedAt: null,
  }
  await requestDoc(uid).set(request)
}

export async function readAccessRequest(uid: string): Promise<AccessRequest | null> {
  const snapshot = await requestDoc(uid).get()
  return snapshot.exists ? ((snapshot.data() as AccessRequest | undefined) ?? null) : null
}

/** How many accounts getUsers accepts per call. */
const GET_USERS_BATCH_SIZE = 100

/** Of the given accounts, those whose email Firebase says is confirmed; deleted accounts drop out too. */
async function confirmedUids(uids: string[]): Promise<Set<string>> {
  const confirmed = new Set<string>()
  for (let start = 0; start < uids.length; start += GET_USERS_BATCH_SIZE) {
    const batch = uids.slice(start, start + GET_USERS_BATCH_SIZE).map((uid) => ({ uid }))
    const { users } = await getFirebaseAdminAuth().getUsers(batch)
    for (const user of users) if (user.emailVerified) confirmed.add(user.uid)
  }
  return confirmed
}

/**
 * What the approvals page lists: pending requests whose email is confirmed, oldest first. Without
 * the confirmation filter an admin could approve an address nobody proved to own. The query needs
 * the composite index in firestore.indexes.json.
 */
export async function listPendingAccessRequests(): Promise<PendingAccessRequest[]> {
  const snapshot = await getFirebaseAdminDb()
    .collection(accessRequestsCollectionName())
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .get()
  const requests = snapshot.docs.map((doc) => ({ uid: doc.id, ...(doc.data() as AccessRequest) }))
  if (requests.length === 0) return requests

  const confirmed = await confirmedUids(requests.map((request) => request.uid))
  return requests.filter((request) => confirmed.has(request.uid))
}

/**
 * Takes the right to email the team, in a transaction. The confirmation can run more than once at
 * the same time (a double click, a retry); reading notifiedAt and writing it separately let two of
 * them both send. True for the one that won.
 */
export async function claimTeamNotification(uid: string): Promise<boolean> {
  const doc = requestDoc(uid)
  return getFirebaseAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(doc)
    if (!snapshot.exists || (snapshot.data() as AccessRequest).notifiedAt) return false
    transaction.update(doc, { notifiedAt: nowIso() })
    return true
  })
}

export type DecisionClaim =
  | { claimed: true; tier: SignupTier }
  | { claimed: false; status: AccessRequestStatus | 'missing' }

/**
 * Takes the right to decide a request, in a transaction: two admins on the page at once would
 * otherwise both pass the "still pending" check, and one approving while the other rejects would
 * leave access granted with a record saying it was denied. Returns the stored tier, because the
 * caller grants access with it and it must never come from the page.
 */
export async function claimPendingDecision(uid: string, { status, decidedBy }: AccessDecision): Promise<DecisionClaim> {
  const doc = requestDoc(uid)
  return getFirebaseAdminDb().runTransaction(async (transaction): Promise<DecisionClaim> => {
    const snapshot = await transaction.get(doc)
    if (!snapshot.exists) return { claimed: false, status: 'missing' }

    const current = snapshot.data() as AccessRequest
    if (current.status !== 'pending') return { claimed: false, status: current.status }

    transaction.update(doc, { status, decidedBy, decidedAt: nowIso() })
    return { claimed: true, tier: current.tier }
  })
}

/** Closes a request without a transaction: used when the domain rule decides, with nobody to race. */
export async function recordAccessDecision(uid: string, { status, decidedBy }: AccessDecision) {
  await requestDoc(uid).update({ status, decidedBy, decidedAt: nowIso() })
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/lib/access/requests.test.ts`
Expected: PASS.

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add lib/access/intention.ts lib/access/requests.ts tests/helpers/fakeFirestore.ts tests/lib/access/requests.test.ts
git commit -m "feat: record access requests in Firestore"
```

---

### Task 8: Confirmation email and settlement

**Files:**
- Create: `lib/access/verification.ts`, `lib/access/settlement.ts`
- Test: `tests/lib/access/verification.test.ts`, `tests/lib/access/settlement.test.ts`

**Interfaces:**
- Consumes: `getFirebaseAdminAuth` (Task 3), `approveAccess`, `hasApprovedAccess` (Task 3), `resolveSignupTier` (Task 2), `sendMail` (Task 5), `buildVerificationEmail`, `buildNewRequestEmail` (Task 5), `signupConfirmationUrl`, `approvalsUrl` (Task 5), `extractOobCode` (Task 6), request functions (Task 7).
- Produces: `describeWithoutLink(error: unknown, code: string | null): string`, `sendVerificationEmail(email: string): Promise<boolean>`; `type SignupSettlement = 'approved' | 'pending' | 'rejected' | 'unconfirmed'`, `settleSignup({ uid, email, emailVerified }): Promise<SignupSettlement>`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/access/verification.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ generateEmailVerificationLink: vi.fn(), sendMail: vi.fn() }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ generateEmailVerificationLink: mocks.generateEmailVerificationLink }),
}))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))

import { describeWithoutLink, sendVerificationEmail } from '@/lib/access/verification'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  mocks.generateEmailVerificationLink.mockResolvedValue('https://p.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=C0DE')
  mocks.sendMail.mockResolvedValue({ delivered: true })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sendVerificationEmail', () => {
  it('sends our own confirmation link, carrying only the code and the address', async () => {
    expect(await sendVerificationEmail('fulana@ufcg.edu.br')).toBe(true)
    expect(mocks.generateEmailVerificationLink).toHaveBeenCalledWith('fulana@ufcg.edu.br')
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; text: string }
    expect(message.to).toBe('fulana@ufcg.edu.br')
    expect(message.text).toContain('https://caativar.example.org/cadastro/confirmacao?code=C0DE&email=fulana%40ufcg.edu.br')
    expect(message.text).not.toContain('firebaseapp.com')
  })

  it('reports an unconfigured mailer as not delivered', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendMail.mockResolvedValueOnce({ delivered: false })
    expect(await sendVerificationEmail('fulana@ufcg.edu.br')).toBe(false)
  })

  it('returns false on failure and keeps the code out of the log', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendMail.mockRejectedValueOnce(new Error('SMTP said no to a message with code=C0DE'))

    expect(await sendVerificationEmail('fulana@ufcg.edu.br')).toBe(false)
    expect(error.mock.calls.flat().join(' ')).not.toContain('C0DE')
  })
})

describe('describeWithoutLink', () => {
  it('cuts every copy of the code out of the message', () => {
    expect(describeWithoutLink(new Error('a C0DE b C0DE'), 'C0DE')).toBe('a [code omitted] b [code omitted]')
    expect(describeWithoutLink('not an error', null)).toBe('unknown error')
  })
})
```

```ts
// tests/lib/access/settlement.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  sendMail: vi.fn(),
  approveAccess: vi.fn(),
  db: null as unknown,
}))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUser: mocks.getUser }),
  getFirebaseAdminDb: () => mocks.db,
}))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))
vi.mock('@/lib/access/claims', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/access/claims')>(),
  approveAccess: mocks.approveAccess,
}))

import { settleSignup } from '@/lib/access/settlement'

let fake: ReturnType<typeof createFakeFirestore>
const COLLECTION = 'access-requests-local'

function seed(uid: string, overrides: Record<string, unknown> = {}) {
  fake.store(COLLECTION).set(uid, {
    email: `${uid}@example.org`, tier: 'common', intention: 'Pesquisa', status: 'pending',
    createdAt: '2026-10-15T12:00:00.000Z', decidedAt: null, decidedBy: null, notifiedAt: null,
    ...overrides,
  })
}

const settle = (uid: string, emailVerified = true) => settleSignup({ uid, email: `${uid}@example.org`, emailVerified })

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', '')
  vi.stubEnv('OCA_NOTIFICATION_EMAIL', 'equipe@ufcg.edu.br')
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', 'ufcg.edu.br')
  fake = createFakeFirestore()
  mocks.db = fake.db
  mocks.getUser.mockResolvedValue({ customClaims: undefined })
  mocks.sendMail.mockResolvedValue({ delivered: true })
  mocks.approveAccess.mockResolvedValue(undefined)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('settleSignup', () => {
  it('does nothing for an unconfirmed address', async () => {
    expect(await settle('u1', false)).toBe('unconfirmed')
    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it('answers approved for an account that already holds access, without opening a request or emailing', async () => {
    mocks.getUser.mockResolvedValueOnce({ customClaims: { caativar: { access: 'approved', tier: 'legacy', at: 1 } } })

    expect(await settle('legacy')).toBe('approved')
    expect(fake.store(COLLECTION).size).toBe(0)
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  it('grants access on the domain track and records that the rule decided', async () => {
    seed('u1', { tier: 'allowed' })

    expect(await settle('u1')).toBe('approved')
    expect(mocks.approveAccess).toHaveBeenCalledWith('u1', 'allowed')
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: null })
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  it('leaves a common request pending and emails the team once, with the approvals link', async () => {
    seed('u1')

    expect(await settle('u1')).toBe('pending')
    expect(await settle('u1')).toBe('pending')
    expect(mocks.sendMail).toHaveBeenCalledOnce()
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; text: string }
    expect(message.to).toBe('equipe@ufcg.edu.br')
    expect(message.text).toContain('https://caativar.example.org/aprovacoes')
    expect(mocks.approveAccess).not.toHaveBeenCalled()
  })

  it('opens the missing request of a signup that failed midway, tier from the domain', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(await settleSignup({ uid: 'u1', email: 'fulana@gmail.com', emailVerified: true })).toBe('pending')
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ email: 'fulana@gmail.com', tier: 'common', intention: '' })

    expect(await settleSignup({ uid: 'u2', email: 'fulana@ufcg.edu.br', emailVerified: true })).toBe('approved')
    expect(mocks.approveAccess).toHaveBeenCalledWith('u2', 'allowed')
  })

  it('returns a decision already made', async () => {
    seed('u1', { status: 'rejected' })
    expect(await settle('u1')).toBe('rejected')
  })

  it('grants again an approved request whose account lacks the claim', async () => {
    seed('u1', { status: 'approved', tier: 'common' })

    expect(await settle('u1')).toBe('approved')
    expect(mocks.approveAccess).toHaveBeenCalledWith('u1', 'common')
  })

  it('keeps the request pending without a team mailbox, and says so in the log', async () => {
    vi.stubEnv('OCA_NOTIFICATION_EMAIL', '')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('u1')

    expect(await settle('u1')).toBe('pending')
    expect(mocks.sendMail).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledOnce()
    expect(fake.store(COLLECTION).get('u1')?.notifiedAt).toBeNull()
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/access/verification.test.ts tests/lib/access/settlement.test.ts`
Expected: FAIL: `@/lib/access/verification` and `@/lib/access/settlement` do not resolve.

- [ ] **Step 3: Write `lib/access/verification.ts`**

```ts
import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { buildVerificationEmail } from '@/lib/access/emails'
import { extractOobCode } from '@/lib/access/firebaseCodes'
import { signupConfirmationUrl } from '@/lib/access/urls'

/**
 * An error's message with the one-time code cut out. Mail libraries sometimes echo the content
 * they failed to send, and the code is a credential. The code is removed rather than the whole
 * link, because the HTML body writes the link with &amp; and a search for the raw link would miss
 * it.
 */
export function describeWithoutLink(error: unknown, code: string | null): string {
  const message = error instanceof Error ? error.message : 'unknown error'
  return code ? message.split(code).join('[code omitted]') : message
}

/**
 * Sends the confirmation email and says honestly whether it went out. A failure is returned, not
 * thrown: by the time signup calls this the request is recorded, and the resend button exists for
 * exactly this case.
 */
export async function sendVerificationEmail(email: string): Promise<boolean> {
  let code: string | null = null
  try {
    // Only the code leaves Firebase's link, toward our own page; without actionCodeSettings Firebase
    // does not require our domain among its authorized domains either.
    code = extractOobCode(await getFirebaseAdminAuth().generateEmailVerificationLink(email))
    if (!code) throw new Error('Firebase returned a link without a code.')

    const { delivered } = await sendMail({
      ...buildVerificationEmail({ link: signupConfirmationUrl(code, email) }),
      to: email,
    })
    if (!delivered) console.error('[access] confirmation email not delivered: the mailer is not configured.')
    return delivered
  } catch (error) {
    console.error('[access] could not send the confirmation email:', describeWithoutLink(error, code))
    return false
  }
}
```

- [ ] **Step 4: Write `lib/access/settlement.ts`**

```ts
import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { approveAccess, hasApprovedAccess } from '@/lib/access/claims'
import { resolveSignupTier } from '@/lib/access/domains'
import { buildNewRequestEmail } from '@/lib/access/emails'
import { claimTeamNotification, createAccessRequest, readAccessRequest, recordAccessDecision } from '@/lib/access/requests'
import { approvalsUrl } from '@/lib/access/urls'

export type SignupSettlement = 'approved' | 'pending' | 'rejected' | 'unconfirmed'

/**
 * Closes a signup whose address is confirmed. Two paths need it: the confirmation route, right
 * after the password is chosen, and the login route, for a confirmation that failed midway.
 * Nothing here trusts the browser: callers read emailVerified from Firebase, and the tier comes
 * from the stored request or, failing that, from the email.
 */
export async function settleSignup({ uid, email, emailVerified }: {
  uid: string
  email: string
  emailVerified: boolean
}): Promise<SignupSettlement> {
  if (!emailVerified) return 'unconfirmed'

  // An account that already holds access (a legacy one, say, whose owner confirmed the address
  // through a resent link) needs no request, and opening one would email the team about it.
  const { customClaims } = await getFirebaseAdminAuth().getUser(uid)
  if (hasApprovedAccess(customClaims)) return 'approved'

  let request = await readAccessRequest(uid)

  // A confirmed account with no request is the dead end of a signup that failed midway: the person
  // can neither sign up again (the email exists) nor move on. Open the request now; the intention
  // was lost, and the common track still goes through an admin, who can ask.
  if (!request) {
    console.warn(`[access] no access request for confirmed account ${uid}; opening one now.`)
    await createAccessRequest(uid, { email, tier: resolveSignupTier(email), intention: '' })
    request = await readAccessRequest(uid)
    if (!request) return 'unconfirmed'
  }

  // Approved but without the claim (step above returned otherwise): a grant that failed after the
  // decision was recorded. Grant it again, so the next login heals it.
  if (request.status === 'approved') {
    await approveAccess(uid, request.tier)
    return 'approved'
  }
  if (request.status === 'rejected') return 'rejected'

  if (request.tier === 'allowed') {
    await approveAccess(uid, 'allowed')
    // The domain rule decided, not an admin, and the record says so.
    await recordAccessDecision(uid, { status: 'approved', decidedBy: null })
    return 'approved'
  }

  await notifyTeam(uid, request.email, request.intention)
  return 'pending'
}

/**
 * Emails the team, once. The claim comes before the send and stays even if sending fails: the
 * request still shows on the approvals page, and repeating the email on every attempt would be
 * worse than losing it once.
 */
async function notifyTeam(uid: string, email: string, intention: string) {
  const to = process.env.OCA_NOTIFICATION_EMAIL
  if (!to) {
    console.error('[access] OCA_NOTIFICATION_EMAIL is not set: access request recorded without an email to the team.')
    return
  }
  if (!(await claimTeamNotification(uid))) return

  try {
    await sendMail({ ...buildNewRequestEmail({ email, intention, approvalUrl: approvalsUrl() }), to })
  } catch (error) {
    console.error('[access] could not email the team about an access request:', error instanceof Error ? error.message : 'unknown error')
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/access/verification.test.ts tests/lib/access/settlement.test.ts`
Expected: PASS.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add lib/access/verification.ts lib/access/settlement.ts tests/lib/access/verification.test.ts tests/lib/access/settlement.test.ts
git commit -m "feat: send the confirmation email and settle confirmed signups"
```

---

### Task 9: The shared auth card and the password fields

The login card's shell moves into `AuthCard` so six screens share it. `LoginForm` must render **byte-for-byte the same markup** after the move.

**Files:**
- Create: `components/auth/AuthCard.tsx`, `components/auth/PasswordFields.tsx`
- Modify: `components/auth/LoginForm.tsx` (render only)
- Test: `tests/components/authCard.test.ts`; temporary `tests/components/loginFormMarkup.tmp.test.ts` (deleted in this task)

**Interfaces:**
- Consumes: `PasswordPairError` (Task 2).
- Produces: default `AuthCard({ title: string; description?: ReactNode; width?: number; children?: ReactNode })`; `authColors`; `authStyles` (`form`, `label`, `input`, `hint`, `error`, `status`, `link`, `footer`); `primaryButtonStyle(busy: boolean): CSSProperties`, `secondaryButtonStyle(busy: boolean): CSSProperties`, `linkButtonStyle: CSSProperties`; default `PasswordFields({ labels?: { password: string; confirmation: string }; disabled?: boolean })` rendering inputs named `password` and `confirmation`; `PASSWORD_PAIR_MESSAGES: Record<PasswordPairError, string>`, `WEAK_PASSWORD_MESSAGE`.

- [ ] **Step 1: Capture the login card's current markup**

```ts
// tests/components/loginFormMarkup.tmp.test.ts — deleted at the end of this task
import { writeFileSync } from 'node:fs'
import { it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace() {}, refresh() {} }) }))
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ signIn: async () => {} }) }))

import LoginForm from '@/components/auth/LoginForm'

it('writes the login card markup', () => {
  const out = process.env.MARKUP_OUT
  if (!out) throw new Error('set MARKUP_OUT')
  writeFileSync(out, renderToStaticMarkup(createElement(LoginForm, { redirectTo: '/' })))
})
```

Run: `MARKUP_OUT="$SCRATCH/login-before.html" npx vitest run tests/components/loginFormMarkup.tmp.test.ts`
Expected: PASS, and `$SCRATCH/login-before.html` exists.

- [ ] **Step 2: Write the failing test**

```ts
// tests/components/authCard.test.ts
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AuthCard from '@/components/auth/AuthCard'
import PasswordFields, { PASSWORD_PAIR_MESSAGES } from '@/components/auth/PasswordFields'

describe('AuthCard', () => {
  it('renders the Caativar mark, the title, the description and the content on the 420px card', () => {
    const markup = renderToStaticMarkup(
      createElement(AuthCard, { title: 'Criar conta', description: 'Texto' }, createElement('p', null, 'conteúdo')),
    )
    expect(markup).toContain('aria-label="Caativar"')
    expect(markup).toMatch(/<h1[^>]*>Criar conta<\/h1>/)
    expect(markup).toContain('Texto')
    expect(markup).toContain('conteúdo')
    expect(markup).toContain('min(100%, 420px)')
  })

  it('widens for the approvals panel', () => {
    expect(renderToStaticMarkup(createElement(AuthCard, { title: 'Pedidos de acesso', width: 960 }))).toContain('min(100%, 960px)')
  })
})

describe('PasswordFields', () => {
  it('renders the two password inputs the forms read, hidden by default', () => {
    const markup = renderToStaticMarkup(createElement(PasswordFields))
    // React renders an input's type first, so match the attributes in any order.
    expect(markup).toMatch(/<input(?=[^>]*name="password")(?=[^>]*type="password")[^>]*>/)
    expect(markup).toMatch(/<input(?=[^>]*name="confirmation")(?=[^>]*type="password")[^>]*>/)
    expect(markup).toContain('Senha')
    expect(markup).toContain('Confirmar senha')
    expect(markup).toContain('Mostrar senha')
  })

  it("takes the reset page's labels", () => {
    const markup = renderToStaticMarkup(createElement(PasswordFields, { labels: { password: 'Nova senha', confirmation: 'Confirmar nova senha' } }))
    expect(markup).toContain('Nova senha')
    expect(markup).toContain('Confirmar nova senha')
  })

  it('has a Portuguese message for every pair error', () => {
    expect(PASSWORD_PAIR_MESSAGES).toEqual({
      required: 'Informe a senha.',
      'too-short': 'A senha precisa de pelo menos 8 caracteres.',
      'confirm-required': 'Confirme a senha.',
      mismatch: 'As senhas não são iguais.',
    })
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/components/authCard.test.ts`
Expected: FAIL: `@/components/auth/AuthCard` does not resolve.

- [ ] **Step 4: Write `components/auth/AuthCard.tsx`**

```tsx
import type { CSSProperties, ReactNode } from 'react'

/**
 * The card every page of the (auth) group sits on: the login card's gradient, cream panel and
 * Caativar mark, plus the input, label and button styles the forms share. No hooks, so server
 * pages and client components both render it.
 */

export const authColors = {
  ink: '#26241d',
  muted: '#6b6a60',
  label: '#39382f',
  accent: '#5f7030',
  card: '#fffdf7',
  border: '#cfcbbd',
  error: '#a12b22',
} as const

export const authStyles = {
  form: { display: 'grid', gap: 18 },
  label: { display: 'grid', gap: 7, color: authColors.label, fontSize: 13, fontWeight: 700 },
  input: { boxSizing: 'border-box', width: '100%', border: `1px solid ${authColors.border}`, borderRadius: 9, padding: '12px 13px', font: 'inherit' },
  hint: { margin: 0, color: authColors.muted, fontSize: 12, fontWeight: 400, lineHeight: 1.45 },
  error: { margin: 0, color: authColors.error, fontSize: 13, lineHeight: 1.4 },
  status: { margin: 0, color: authColors.muted, fontSize: 13, lineHeight: 1.4 },
  link: { color: authColors.accent, fontSize: 14, fontWeight: 700 },
  footer: { margin: '22px 0 0', color: authColors.muted, fontSize: 14, lineHeight: 1.5 },
} satisfies Record<string, CSSProperties>

export function primaryButtonStyle(busy: boolean): CSSProperties {
  return { border: 0, borderRadius: 9, padding: '13px 16px', background: authColors.accent, color: '#fff', cursor: busy ? 'wait' : 'pointer', font: 'inherit', fontWeight: 800, opacity: busy ? .7 : 1 }
}

export function secondaryButtonStyle(busy: boolean): CSSProperties {
  return { border: `1px solid ${authColors.accent}`, borderRadius: 9, padding: '11px 16px', background: 'transparent', color: authColors.accent, cursor: busy ? 'wait' : 'pointer', font: 'inherit', fontWeight: 700, opacity: busy ? .7 : 1 }
}

/** A next/link drawn as the primary button, for a card whose only action is to go somewhere. */
export const linkButtonStyle: CSSProperties = { ...primaryButtonStyle(false), display: 'block', textAlign: 'center', textDecoration: 'none' }

interface AuthCardProps {
  title: string
  description?: ReactNode
  /** 420 for every card; the approvals panel passes 960 for its table. */
  width?: number
  children?: ReactNode
}

export default function AuthCard({ title, description, width = 420, children }: AuthCardProps) {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(140deg, #20281d 0%, #3d482c 48%, #c5813e 160%)' }}>
      <section style={{ width: `min(100%, ${width}px)`, padding: '40px', borderRadius: 20, background: authColors.card, boxShadow: '0 24px 60px rgba(0,0,0,.28)' }}>
        <div aria-label="Caativar" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: authColors.ink, fontWeight: 800 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 9, background: authColors.accent, color: '#fff' }}>O</span>
          Caativar
        </div>
        <h1 style={{ margin: description ? '36px 0 8px' : '36px 0 24px', color: authColors.ink, fontSize: 28, lineHeight: 1.15 }}>{title}</h1>
        {description ? <p style={{ margin: '0 0 28px', color: authColors.muted, fontSize: 15, lineHeight: 1.5 }}>{description}</p> : null}
        {children}
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Write `components/auth/PasswordFields.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { authColors, authStyles } from '@/components/auth/AuthCard'
import type { PasswordPairError } from '@/lib/access/passwordRules'

export const PASSWORD_PAIR_MESSAGES: Record<PasswordPairError, string> = {
  required: 'Informe a senha.',
  'too-short': 'A senha precisa de pelo menos 8 caracteres.',
  'confirm-required': 'Confirme a senha.',
  mismatch: 'As senhas não são iguais.',
}

/** Shown when the server's rule (Firebase's password policy) refuses what the form accepted. */
export const WEAK_PASSWORD_MESSAGE = 'A senha não atende aos requisitos. Use pelo menos 8 caracteres.'

interface PasswordFieldsProps {
  labels?: { password: string; confirmation: string }
  disabled?: boolean
}

/**
 * The password pair of the confirmation and reset pages: two inputs named `password` and
 * `confirmation`, which the form reads through FormData and checks with passwordPairError
 * (lib/access/passwordRules.ts), and one toggle that shows both.
 */
export default function PasswordFields({
  labels = { password: 'Senha', confirmation: 'Confirmar senha' },
  disabled = false,
}: PasswordFieldsProps) {
  const [visible, setVisible] = useState(false)
  const type = visible ? 'text' : 'password'

  return (
    <>
      <label style={authStyles.label}>
        {labels.password}
        <input name="password" type={type} autoComplete="new-password" required disabled={disabled} style={authStyles.input} />
      </label>
      <label style={authStyles.label}>
        {labels.confirmation}
        <input name="confirmation" type={type} autoComplete="new-password" required disabled={disabled} style={authStyles.input} />
      </label>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        disabled={disabled}
        style={{ justifySelf: 'start', border: 0, padding: 0, background: 'none', color: authColors.accent, cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700 }}
      >
        {visible ? 'Ocultar senha' : 'Mostrar senha'}
      </button>
    </>
  )
}
```

- [ ] **Step 6: Move `LoginForm` onto the card**

Replace the imports and the returned JSX of `components/auth/LoginForm.tsx`; `loginErrorMessage`, the state and `handleSubmit` stay as they are.

```tsx
'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import AuthCard, { authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'
```

```tsx
  return (
    <AuthCard title="Acesse a plataforma de carbono" description="Entre com as credenciais fornecidas pela equipe da plataforma.">
      <form onSubmit={handleSubmit} style={authStyles.form}>
        <label style={authStyles.label}>
          E-mail
          <input name="email" type="email" autoComplete="username" required disabled={submitting} style={authStyles.input} />
        </label>
        <label style={authStyles.label}>
          Senha
          <input name="password" type="password" autoComplete="current-password" required disabled={submitting} style={authStyles.input} />
        </label>
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthCard>
  )
```

- [ ] **Step 7: Verify the login card is unchanged, then remove the probe**

Run:
```bash
MARKUP_OUT="$SCRATCH/login-after.html" npx vitest run tests/components/loginFormMarkup.tmp.test.ts
diff "$SCRATCH/login-before.html" "$SCRATCH/login-after.html" && echo IDENTICAL
rm tests/components/loginFormMarkup.tmp.test.ts
```
Expected: `IDENTICAL`. Any diff output means a style object's keys or values moved: fix `AuthCard`/`authStyles` until it is identical.

- [ ] **Step 8: Run the tests, lint and commit**

```bash
npx vitest run tests/components/authCard.test.ts
npm run lint
git add components/auth/AuthCard.tsx components/auth/PasswordFields.tsx components/auth/LoginForm.tsx tests/components/authCard.test.ts
git commit -m "refactor: move the login card into a shared auth card"
```

---

### Task 10: Session gate, login card and waiting page

**Files:**
- Create: `lib/access/sessionCodes.ts`, `lib/access/loginErrors.ts`, `lib/access/clientFetch.ts`, `components/auth/ResendConfirmation.tsx`, `app/(auth)/aguardando-liberacao/page.tsx`
- Modify: `lib/auth.ts`, `app/api/session/route.ts`, `components/auth/AuthProvider.tsx`, `components/auth/LoginForm.tsx`, `app/(auth)/login/page.tsx`
- Test: `tests/lib/access/sessionCodes.test.ts`, `tests/lib/auth.test.ts`, `tests/app/sessionRoute.test.ts`

**Interfaces:**
- Consumes: `isAccessGuardEnabled`, `isSignupOpen`, paths (Task 2); `hasApprovedAccess` (Task 3); `settleSignup` (Task 8); `AuthCard`, `authStyles`, `secondaryButtonStyle`, `primaryButtonStyle` (Task 9).
- Produces: `ACCESS_CODES`, `type AccessCode = 'access_pending' | 'access_granted' | 'email_unconfirmed'`, `readAccessCode(body: unknown): AccessCode | null`; `loginErrorMessage(error: unknown): string`; `postJson(path: string, body: unknown): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }>`; `type SessionCreation = { status: 'created'; sessionCookie: string } | { status: 'unapproved'; uid: string; email: string | null; emailVerified: boolean }`, `createSessionCookie(idToken): Promise<SessionCreation>`; `type SignInOutcome = 'ok' | 'pending' | 'unconfirmed'`; default `ResendConfirmation({ email: string })`; `LoginForm({ redirectTo: string; signupOpen: boolean })`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/access/sessionCodes.test.ts
import { describe, expect, it } from 'vitest'
import { readAccessCode } from '@/lib/access/sessionCodes'
import { loginErrorMessage } from '@/lib/access/loginErrors'

describe('readAccessCode', () => {
  it('reads the three codes and nothing else', () => {
    expect(readAccessCode({ code: 'access_pending' })).toBe('access_pending')
    expect(readAccessCode({ code: 'access_granted' })).toBe('access_granted')
    expect(readAccessCode({ code: 'email_unconfirmed' })).toBe('email_unconfirmed')
    expect(readAccessCode({ code: 'other' })).toBeNull()
    expect(readAccessCode(null)).toBeNull()
    expect(readAccessCode('access_pending')).toBeNull()
  })
})

describe('loginErrorMessage', () => {
  it('names throttling and a disabled account, and keeps the generic message otherwise', () => {
    expect(loginErrorMessage({ code: 'auth/too-many-requests' })).toBe('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
    expect(loginErrorMessage({ code: 'auth/user-disabled' })).toBe('Esta conta não tem acesso à plataforma.')
    expect(loginErrorMessage({ code: 'auth/invalid-credential' })).toBe('E-mail ou senha inválidos.')
    expect(loginErrorMessage(new Error('boom'))).toBe('E-mail ou senha inválidos.')
  })
})
```

```ts
// tests/lib/auth.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
  verifySessionCookie: vi.fn(),
}))

vi.mock('@/lib/firebase-admin', () => ({ getFirebaseAdminAuth: () => mocks }))

import { createSessionCookie, verifySessionCookie } from '@/lib/auth'

const CLAIM = { caativar: { access: 'approved', tier: 'legacy', at: 1 } }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.createSessionCookie.mockResolvedValue('minted-cookie')
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('createSessionCookie', () => {
  it('mints a cookie for any valid token while the gate is off', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.co', email_verified: false })

    expect(await createSessionCookie('token')).toEqual({ status: 'created', sessionCookie: 'minted-cookie' })
  })

  it('refuses a token without the claim while the gate is on, telling whether the email is confirmed', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'Fulana@UFCG.edu.br', email_verified: true })

    expect(await createSessionCookie('token')).toEqual({ status: 'unapproved', uid: 'u1', email: 'fulana@ufcg.edu.br', emailVerified: true })
    expect(mocks.createSessionCookie).not.toHaveBeenCalled()
  })

  it('mints a cookie for a token carrying the claim while the gate is on', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.co', email_verified: true, ...CLAIM })

    expect(await createSessionCookie('token')).toEqual({ status: 'created', sessionCookie: 'minted-cookie' })
    expect(mocks.createSessionCookie).toHaveBeenCalledWith('token', { expiresIn: 86_400_000 })
  })
})

describe('verifySessionCookie', () => {
  it('drops a claim-less cookie while the gate is on, and keeps it while off', async () => {
    mocks.verifySessionCookie.mockResolvedValue({ uid: 'u1' })

    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    expect(await verifySessionCookie('cookie')).toBeNull()
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect(await verifySessionCookie('cookie')).toEqual({ uid: 'u1' })
    expect(mocks.verifySessionCookie).toHaveBeenCalledWith('cookie', true)
  })

  it('keeps a cookie carrying the claim while the gate is on', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
    mocks.verifySessionCookie.mockResolvedValueOnce({ uid: 'u1', ...CLAIM })
    expect(await verifySessionCookie('cookie')).toMatchObject({ uid: 'u1' })
  })

  it('returns null for a missing or invalid cookie', async () => {
    expect(await verifySessionCookie(undefined)).toBeNull()
    mocks.verifySessionCookie.mockRejectedValueOnce(new Error('revoked'))
    expect(await verifySessionCookie('cookie')).toBeNull()
  })
})
```

```ts
// tests/app/sessionRoute.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSessionCookie: vi.fn(), settleSignup: vi.fn() }))

vi.mock('@/lib/auth', () => ({
  createSessionCookie: mocks.createSessionCookie,
  SESSION_COOKIE_NAME: 'session',
  SESSION_MAX_AGE_SECONDS: 86400,
}))
vi.mock('@/lib/access/settlement', () => ({ settleSignup: mocks.settleSignup }))

import { POST } from '@/app/api/session/route'

const login = (body: unknown) => new Request('http://localhost/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const unapproved = (emailVerified: boolean) => ({ status: 'unapproved', uid: 'u1', email: 'a@b.co', emailVerified })

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

describe('POST /api/session', () => {
  it('sets the session cookie when one was minted', async () => {
    mocks.createSessionCookie.mockResolvedValueOnce({ status: 'created', sessionCookie: 'cookie-value' })

    const res = await POST(login({ idToken: 't' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('session=cookie-value')
  })

  it('answers email_unconfirmed without settling an unconfirmed account', async () => {
    mocks.createSessionCookie.mockResolvedValueOnce(unapproved(false))

    const res = await POST(login({ idToken: 't' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'email_unconfirmed' })
    expect(mocks.settleSignup).not.toHaveBeenCalled()
  })

  it('settles a confirmed account and answers access_granted when that grants access', async () => {
    mocks.createSessionCookie.mockResolvedValueOnce(unapproved(true))
    mocks.settleSignup.mockResolvedValueOnce('approved')

    const res = await POST(login({ idToken: 't' }))

    expect(mocks.settleSignup).toHaveBeenCalledWith({ uid: 'u1', email: 'a@b.co', emailVerified: true })
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'access_granted' })
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('answers access_pending while the request waits, and when settling fails', async () => {
    mocks.createSessionCookie.mockResolvedValue(unapproved(true))
    mocks.settleSignup.mockResolvedValueOnce('pending')
    expect(await (await POST(login({ idToken: 't' }))).json()).toMatchObject({ code: 'access_pending' })

    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.settleSignup.mockRejectedValueOnce(new Error('firestore down'))
    const res = await POST(login({ idToken: 't' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'access_pending' })
  })

  it('keeps 400 for a missing token and 401 for an invalid one', async () => {
    expect((await POST(login({}))).status).toBe(400)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createSessionCookie.mockRejectedValueOnce(new Error('bad token'))
    expect((await POST(login({ idToken: 't' }))).status).toBe(401)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/access/sessionCodes.test.ts tests/lib/auth.test.ts tests/app/sessionRoute.test.ts`
Expected: FAIL: `@/lib/access/sessionCodes` does not resolve; `createSessionCookie` returns a string, not `{ status }`.

- [ ] **Step 3: Write the client-safe helpers**

```ts
// lib/access/sessionCodes.ts
/**
 * Why POST /api/session refused a correct password; shared by the route and AuthProvider.
 * - access_pending: the address is confirmed and the request waits for an admin;
 * - access_granted: access was granted just now, but the ID token predates it, so sign in again;
 * - email_unconfirmed: the address is not confirmed yet.
 */
export const ACCESS_CODES = ['access_pending', 'access_granted', 'email_unconfirmed'] as const
export type AccessCode = (typeof ACCESS_CODES)[number]

export function readAccessCode(body: unknown): AccessCode | null {
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined
  return ACCESS_CODES.includes(code as AccessCode) ? (code as AccessCode) : null
}
```

```ts
// lib/access/loginErrors.ts
/** The login card's message for a failed Firebase sign-in. */
export function loginErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  // A rejected request disables the account (app/api/signup/approve/route.ts).
  if (code === 'auth/user-disabled') return 'Esta conta não tem acesso à plataforma.'
  return 'E-mail ou senha inválidos.'
}
```

```ts
// lib/access/clientFetch.ts
/** POSTs JSON from a client component. The body is null when the response is not JSON; a network failure throws. */
export async function postJson(path: string, body: unknown): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const parsed: unknown = await response.json().catch(() => null)
  return {
    ok: response.ok,
    status: response.status,
    body: parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null,
  }
}
```

- [ ] **Step 4: Gate the session in `lib/auth.ts`**

Add the imports and replace `createSessionCookie` and `verifySessionCookie`; everything else in the file stays.

```ts
import { hasApprovedAccess } from '@/lib/access/claims'
import { isAccessGuardEnabled } from '@/lib/access/flag'
```

```ts
export type SessionCreation =
  | { status: 'created'; sessionCookie: string }
  | {
      status: 'unapproved'
      /** Who was refused, so the login route can try to settle a confirmed signup (lib/access/settlement.ts). */
      uid: string
      email: string | null
      emailVerified: boolean
    }

/**
 * Opens a platform session, and this is where access is barred: with the gate on, an account
 * without the access claim gets no cookie, and without a cookie there is no platform. The token is
 * verified once; the claim and email_verified come from the decoded token at no extra cost.
 */
export async function createSessionCookie(idToken: string): Promise<SessionCreation> {
  const auth = getFirebaseAdminAuth()
  const decoded = await auth.verifyIdToken(idToken)

  if (isAccessGuardEnabled() && !hasApprovedAccess(decoded)) {
    return {
      status: 'unapproved',
      uid: decoded.uid,
      email: decoded.email?.trim().toLowerCase() || null,
      emailVerified: Boolean(decoded.email_verified),
    }
  }

  return { status: 'created', sessionCookie: await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 }) }
}

/**
 * A verified, unrevoked session, or null. With the gate on, a cookie without the claim counts as
 * no session: that covers cookies minted before the gate was turned on, and every layout and API
 * route inherits the rule through here.
 */
export async function verifySessionCookie(sessionCookie: string | undefined): Promise<DecodedIdToken | null> {
  if (!sessionCookie) return null

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true)
    if (isAccessGuardEnabled() && !hasApprovedAccess(decoded)) return null
    return decoded
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Rewrite `app/api/session/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth'
import { settleSignup } from '@/lib/access/settlement'
import type { AccessCode } from '@/lib/access/sessionCodes'

export const runtime = 'nodejs'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

/** A correct password without a session. The client tells these apart from a wrong password. */
function refused(code: AccessCode) {
  return NextResponse.json({ error: 'Access not granted', code }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * One more chance before refusing a confirmed account: a confirmation that failed midway never
 * settled, and the domain track would otherwise never grant access. A failure here is logged and
 * the person waits, rather than seeing a login error.
 */
async function settleOnLogin(uid: string, email: string) {
  try {
    return await settleSignup({ uid, email, emailVerified: true })
  } catch (error) {
    console.error('[/api/session] could not settle the signup:', error)
    return 'pending' as const
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.idToken !== 'string') {
    return NextResponse.json({ error: 'idToken is required' }, { status: 400 })
  }

  try {
    const creation = await createSessionCookie(body.idToken)

    if (creation.status === 'unapproved') {
      if (!creation.emailVerified || !creation.email) return refused('email_unconfirmed')
      // Access granted now is not in this ID token, which predates it: the client signs in again.
      const settlement = await settleOnLogin(creation.uid, creation.email)
      return refused(settlement === 'approved' ? 'access_granted' : 'access_pending')
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE_NAME, creation.sessionCookie, {
      ...cookieOptions,
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
    return response
  } catch (error) {
    console.error('[/api/session] unable to create session:', error)
    return NextResponse.json({ error: 'Unable to create session' }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 })
  return response
}
```

- [ ] **Step 6: Return the outcome from `AuthProvider.signIn`**

In `components/auth/AuthProvider.tsx`, add the imports, change the context type and replace `signIn`; `signOut`, the effect and the provider stay.

```tsx
import type { Auth, User } from 'firebase/auth'
import { readAccessCode, type AccessCode } from '@/lib/access/sessionCodes'

/** `pending`: a correct password waiting for access; `unconfirmed`: the address is not confirmed. */
export type SignInOutcome = 'ok' | 'pending' | 'unconfirmed'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<SignInOutcome>
  signOut: () => Promise<void>
}

async function postSession(idToken: string): Promise<'ok' | AccessCode | 'failed'> {
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (response.ok) return 'ok'
    return readAccessCode(await response.json().catch(() => null)) ?? 'failed'
  } catch {
    return 'failed'
  }
}

async function signInAndPostSession(auth: Auth, email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return postSession(await credential.user.getIdToken())
}
```

Replace the old `import type { User } from 'firebase/auth'` with the first line above. Inside `AuthProvider`:

```tsx
  async function signIn(email: string, password: string): Promise<SignInOutcome> {
    const auth = getFirebaseAuth()
    let result = await signInAndPostSession(auth, email, password)
    // access_granted: the first token predates the claim just granted; a fresh sign-in mints one
    // that carries it. Once, never more.
    if (result === 'access_granted') result = await signInAndPostSession(auth, email, password)
    if (result === 'ok') return 'ok'

    await firebaseSignOut(auth)
    if (result === 'access_pending' || result === 'access_granted') return 'pending'
    if (result === 'email_unconfirmed') return 'unconfirmed'

    await fetch('/api/session', { method: 'DELETE' })
    throw new Error('Could not create the session.')
  }
```

- [ ] **Step 7: Write `components/auth/ResendConfirmation.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { authStyles, secondaryButtonStyle } from '@/components/auth/AuthCard'
import { postJson } from '@/lib/access/clientFetch'

/**
 * Asks for a new confirmation email. The answer is the same whether or not the address has an
 * account, so a failed request shows the same line as a successful one.
 */
export default function ResendConfirmation({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function resend() {
    setState('sending')
    try {
      await postJson('/api/signup/resend', { email })
    } catch {
      // The answer is generic either way.
    } finally {
      setState('sent')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <button type="button" onClick={() => void resend()} disabled={state === 'sending' || !email} style={secondaryButtonStyle(state === 'sending')}>
        {state === 'sending' ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
      </button>
      {state === 'sent' && <p role="status" style={authStyles.status}>Se o endereço estiver cadastrado, um novo e-mail foi enviado.</p>}
    </div>
  )
}
```

- [ ] **Step 8: Rewrite `components/auth/LoginForm.tsx`**

```tsx
'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import AuthCard, { authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'
import ResendConfirmation from '@/components/auth/ResendConfirmation'
import { loginErrorMessage } from '@/lib/access/loginErrors'
import { FORGOT_PASSWORD_PATH, PENDING_APPROVAL_PATH, SIGNUP_PATH } from '@/lib/access/paths'

export default function LoginForm({ redirectTo, signupOpen }: { redirectTo: string; signupOpen: boolean }) {
  const router = useRouter()
  const { signIn } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    if (!email || !password) return

    setSubmitting(true)
    setError(null)
    setUnconfirmedEmail(null)
    try {
      const outcome = await signIn(email, password)
      if (outcome === 'ok') {
        router.replace(redirectTo)
        router.refresh()
        return
      }
      if (outcome === 'pending') {
        router.replace(PENDING_APPROVAL_PATH)
        return
      }
      setUnconfirmedEmail(email)
      setSubmitting(false)
    } catch (cause) {
      setError(loginErrorMessage(cause))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Acesse a plataforma de carbono"
      description={signupOpen ? 'Entre com seu e-mail e senha.' : 'Entre com as credenciais fornecidas pela equipe da plataforma.'}
    >
      <form onSubmit={handleSubmit} style={authStyles.form}>
        <label style={authStyles.label}>
          E-mail
          <input name="email" type="email" autoComplete="username" required disabled={submitting} style={authStyles.input} />
        </label>
        <label style={authStyles.label}>
          Senha
          <input name="password" type="password" autoComplete="current-password" required disabled={submitting} style={authStyles.input} />
        </label>
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        {unconfirmedEmail && (
          <div style={{ display: 'grid', gap: 10 }}>
            <p role="alert" style={authStyles.error}>Confirme seu e-mail antes de entrar. Enviamos o link para o endereço do cadastro.</p>
            <ResendConfirmation email={unconfirmedEmail} />
          </div>
        )}
        <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p style={authStyles.footer}>
        <Link href={FORGOT_PASSWORD_PATH} style={authStyles.link}>Esqueci minha senha</Link>
      </p>
      {signupOpen && (
        <p style={{ ...authStyles.footer, margin: '10px 0 0' }}>
          Não tem conta? <Link href={SIGNUP_PATH} style={authStyles.link}>Criar conta</Link>
        </p>
      )}
    </AuthCard>
  )
}
```

- [ ] **Step 9: Pass the switch from the login page, and add the waiting page**

```tsx
// app/(auth)/login/page.tsx
import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import { getAuthenticatedSession, safeRedirect } from '@/lib/auth'
import { isSignupOpen } from '@/lib/access/flag'

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const redirectTo = safeRedirect((await searchParams).redirect)
  if (await getAuthenticatedSession()) redirect(redirectTo)

  return <LoginForm redirectTo={redirectTo} signupOpen={isSignupOpen()} />
}
```

```tsx
// app/(auth)/aguardando-liberacao/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import AuthCard, { authStyles } from '@/components/auth/AuthCard'
import { LOGIN_PATH } from '@/lib/access/paths'

export const metadata: Metadata = { title: 'Cadastro em análise | Caativar' }

/**
 * Where a correct password without access lands. No guard and no session: a pending account never
 * gets a cookie, so there is no email to show and nothing to sign out of.
 */
export default function PendingApprovalPage() {
  return (
    <AuthCard
      title="Cadastro em análise"
      description="Seu e-mail foi confirmado e sua solicitação chegou à equipe da plataforma. Assim que a intenção de uso que você descreveu for analisada, você receberá um aviso por e-mail e poderá acessar a plataforma."
    >
      <Link href={LOGIN_PATH} style={authStyles.link}>Voltar para o login</Link>
    </AuthCard>
  )
}
```

- [ ] **Step 10: Run the tests, the suite and lint**

Run: `npx vitest run tests/lib/access/sessionCodes.test.ts tests/lib/auth.test.ts tests/app/sessionRoute.test.ts && npm test && npm run lint`
Expected: PASS, including `tests/lib/safeRedirect.test.ts`, which imports the real `lib/auth.ts`.

- [ ] **Step 11: Commit**

```bash
git add lib/access/sessionCodes.ts lib/access/loginErrors.ts lib/access/clientFetch.ts lib/auth.ts app/api/session/route.ts components/auth/AuthProvider.tsx components/auth/ResendConfirmation.tsx components/auth/LoginForm.tsx "app/(auth)/login/page.tsx" "app/(auth)/aguardando-liberacao/page.tsx" tests/lib/access/sessionCodes.test.ts tests/lib/auth.test.ts tests/app/sessionRoute.test.ts
git commit -m "feat: gate sessions on the access claim"
```

---

### Task 11: Signup and resend routes

**Files:**
- Create: `app/api/signup/route.ts`, `app/api/signup/resend/route.ts`, `tests/helpers/jsonPost.ts`
- Test: `tests/app/signupRoutes.test.ts`

**Interfaces:**
- Consumes: `getFirebaseAdminAuth` (Task 3), `hasApprovedAccess` (Task 3), `normalizeEmail`, `isWellFormedEmail`, `resolveSignupTier` (Task 2), `normalizeIntention` (Task 7), `createAccessRequest` (Task 7), `sendVerificationEmail` (Task 8), `jsonNoStore`, `readJsonObject`, `rejectWhenSignupClosed`, `rejectUntrustedOrLimited` (Task 4).
- Produces: `POST /api/signup` → 201 `{ status: 'accepted' }` | 400 `{ error }` | 403 | 404 | 429 | 500; `POST /api/signup/resend` → 202 `{ status: 'accepted' }` | 403 | 404 | 429. Test helper `jsonPost(path: string, body: unknown, headers?: Record<string, string>): Request`.

- [ ] **Step 1: Write the request helper**

```ts
// tests/helpers/jsonPost.ts
/** A JSON POST as the app's own pages send it: same origin, from a forwarded client address. */
export function jsonPost(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost',
      'sec-fetch-site': 'same-origin',
      'x-forwarded-for': '203.0.113.7',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/app/signupRoutes.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserByEmail: vi.fn(),
  createAccessRequest: vi.fn(),
  sendVerificationEmail: vi.fn(),
  afterTasks: [] as Array<Promise<unknown>>,
}))

vi.mock('next/server', async (importOriginal) => ({
  ...await importOriginal<typeof import('next/server')>(),
  after: (task: () => unknown) => {
    mocks.afterTasks.push(Promise.resolve().then(task))
  },
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ createUser: mocks.createUser, deleteUser: mocks.deleteUser, getUserByEmail: mocks.getUserByEmail }),
}))
vi.mock('@/lib/access/requests', () => ({ createAccessRequest: mocks.createAccessRequest }))
vi.mock('@/lib/access/verification', () => ({ sendVerificationEmail: mocks.sendVerificationEmail }))

import { POST as signup } from '@/app/api/signup/route'
import { POST as resend } from '@/app/api/signup/resend/route'
import { accessRateLimits } from '@/lib/access/rateLimits'

const flushAfter = () => Promise.all(mocks.afterTasks.splice(0))
const VALID = { email: 'fulana@gmail.com', intention: 'Pesquisa sobre carbono' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
  vi.stubEnv('SIGNUP_ALLOWED_DOMAINS', 'ufcg.edu.br')
  for (const limiter of Object.values(accessRateLimits)) limiter.clear()
  mocks.afterTasks.splice(0)
  mocks.createUser.mockResolvedValue({ uid: 'new-uid' })
  mocks.deleteUser.mockResolvedValue(undefined)
  mocks.createAccessRequest.mockResolvedValue(undefined)
  mocks.sendVerificationEmail.mockResolvedValue(true)
})

describe('POST /api/signup', () => {
  it('answers 404 while signup is closed, before touching anything', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect((await signup(jsonPost('/api/signup', VALID))).status).toBe(404)
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('refuses a cross-site request and a client over its budget', async () => {
    expect((await signup(jsonPost('/api/signup', VALID, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403)
    for (let i = 0; i < 20; i++) await signup(jsonPost('/api/signup', VALID))
    const limited = await signup(jsonPost('/api/signup', VALID))
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBeTruthy()
  })

  it('rejects a malformed email and a blank intention', async () => {
    const badEmail = await signup(jsonPost('/api/signup', { ...VALID, email: 'fulana' }))
    expect(badEmail.status).toBe(400)
    expect(await badEmail.json()).toEqual({ error: 'Informe um e-mail válido.' })

    const blank = await signup(jsonPost('/api/signup', { ...VALID, intention: '   \n ' }))
    expect(blank.status).toBe(400)
    expect(await blank.json()).toEqual({ error: 'Descreva como pretende usar a plataforma.' })
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('creates the account without a password, from the normalized email, and records the request', async () => {
    const res = await signup(jsonPost('/api/signup', { email: '  Fulana@UFCG.edu.br ', intention: '  Ensino\n de  carbono ' }))

    expect(res.status).toBe(201)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ status: 'accepted' })
    expect(mocks.createUser).toHaveBeenCalledWith({ email: 'fulana@ufcg.edu.br', emailVerified: false })
    expect(mocks.createAccessRequest).toHaveBeenCalledWith('new-uid', { email: 'fulana@ufcg.edu.br', tier: 'allowed', intention: 'Ensino de carbono' })
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith('fulana@ufcg.edu.br')
  })

  it('never takes the tier from the client', async () => {
    await signup(jsonPost('/api/signup', { ...VALID, tier: 'allowed' }))
    expect(mocks.createAccessRequest).toHaveBeenCalledWith('new-uid', expect.objectContaining({ tier: 'common' }))
  })

  it('answers an existing email exactly like a new one, sending nothing', async () => {
    mocks.createUser.mockRejectedValueOnce(Object.assign(new Error('exists'), { code: 'auth/email-already-exists' }))

    const res = await signup(jsonPost('/api/signup', VALID))

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ status: 'accepted' })
    expect(mocks.createAccessRequest).not.toHaveBeenCalled()
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('deletes the account when the request cannot be recorded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createAccessRequest.mockRejectedValueOnce(new Error('firestore down'))

    const res = await signup(jsonPost('/api/signup', VALID))

    expect(res.status).toBe(500)
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-uid')
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('keeps the signup when the email fails, and says so in the log', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendVerificationEmail.mockResolvedValueOnce(false)

    expect((await signup(jsonPost('/api/signup', VALID))).status).toBe(201)
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('POST /api/signup/resend', () => {
  const account = (overrides: Record<string, unknown> = {}) => ({ uid: 'u1', emailVerified: false, disabled: false, customClaims: undefined, ...overrides })

  it('answers 404 while signup is closed', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect((await resend(jsonPost('/api/signup/resend', { email: 'fulana@gmail.com' }))).status).toBe(404)
  })

  it('sends a new link to an unconfirmed account without access, after the response', async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(account())

    const res = await resend(jsonPost('/api/signup/resend', { email: ' Fulana@Gmail.com ' }))
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ status: 'accepted' })
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()

    await flushAfter()
    expect(mocks.getUserByEmail).toHaveBeenCalledWith('fulana@gmail.com')
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith('fulana@gmail.com')
  })

  it('answers the same and sends nothing for a confirmed, a claimed, a disabled or an unknown account', async () => {
    mocks.getUserByEmail
      .mockResolvedValueOnce(account({ emailVerified: true }))
      .mockResolvedValueOnce(account({ customClaims: { caativar: { access: 'approved', tier: 'legacy', at: 1 } } }))
      .mockResolvedValueOnce(account({ disabled: true }))
      .mockRejectedValueOnce(Object.assign(new Error('none'), { code: 'auth/user-not-found' }))

    for (let i = 0; i < 4; i++) {
      const res = await resend(jsonPost('/api/signup/resend', { email: 'fulana@gmail.com' }))
      expect(res.status).toBe(202)
    }
    await flushAfter()
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('does not even look up a malformed address', async () => {
    expect((await resend(jsonPost('/api/signup/resend', { email: 'fulana' }))).status).toBe(202)
    await flushAfter()
    expect(mocks.getUserByEmail).not.toHaveBeenCalled()
  })

  it('stops a client after 10 resends a minute', async () => {
    mocks.getUserByEmail.mockResolvedValue(account({ emailVerified: true }))
    for (let i = 0; i < 10; i++) await resend(jsonPost('/api/signup/resend', { email: 'fulana@gmail.com' }))
    expect((await resend(jsonPost('/api/signup/resend', { email: 'fulana@gmail.com' }))).status).toBe(429)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/app/signupRoutes.test.ts`
Expected: FAIL: `@/app/api/signup/route` does not resolve.

- [ ] **Step 4: Write `app/api/signup/route.ts`**

```ts
/**
 * POST /api/signup — opens an account and its access request (docs/signup.md).
 *
 * The account is created through the Admin SDK, never the browser: client sign-up is turned off in
 * the Firebase console, so the public API key cannot create accounts that skip this route.
 */

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { resolveSignupTier } from '@/lib/access/domains'
import { jsonNoStore, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'
import { normalizeIntention } from '@/lib/access/intention'
import { createAccessRequest } from '@/lib/access/requests'
import { sendVerificationEmail } from '@/lib/access/verification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * One answer for every accepted signup, an email that already has an account included. Any
 * difference would turn the route into an oracle of who uses the platform.
 */
const accepted = () => jsonNoStore({ status: 'accepted' }, 201)
const serverError = () => jsonNoStore({ error: 'Não foi possível concluir o cadastro.' }, 500)

function isEmailTaken(error: unknown) {
  return (error as { code?: unknown } | null)?.code === 'auth/email-already-exists'
}

export async function POST(req: Request) {
  const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'signup')
  if (refused) return refused

  const body = await readJsonObject(req)
  const email = normalizeEmail(body.email)
  const intention = normalizeIntention(body.intention)

  if (!isWellFormedEmail(email)) return jsonNoStore({ error: 'Informe um e-mail válido.' }, 400)
  // Asked of everyone, the domain track included: it is part of the record, not only an input to
  // the manual decision.
  if (!intention) return jsonNoStore({ error: 'Descreva como pretende usar a plataforma.' }, 400)

  // Recomputed from the email here; the client never sends a tier.
  const tier = resolveSignupTier(email)
  const auth = getFirebaseAdminAuth()

  let uid: string
  try {
    // No password: whoever reads the mailbox chooses it on the confirmation page. An account
    // without a password cannot sign in, so until then it is inert.
    uid = (await auth.createUser({ email, emailVerified: false })).uid
  } catch (error) {
    if (isEmailTaken(error)) return accepted()
    console.error('[/api/signup] could not create the account:', error)
    return serverError()
  }

  try {
    await createAccessRequest(uid, { email, tier, intention })
  } catch (error) {
    // An orphan account is worse than none: the person would get "accepted" forever and never an
    // email, and only a hand deletion would free the address.
    console.error('[/api/signup] could not record the access request:', error)
    await auth.deleteUser(uid).catch((undoError: unknown) => {
      console.error('[/api/signup] could not delete the orphan account; remove it by hand:', undoError)
    })
    return serverError()
  }

  // The request is recorded, and a mail failure does not undo it: resend exists for that. It must
  // not pass silently either, or a broken mailer in production would go unnoticed.
  if (!(await sendVerificationEmail(email))) {
    console.error(`[/api/signup] signup recorded without a delivered confirmation email (${email}).`)
  }
  return accepted()
}
```

- [ ] **Step 5: Write `app/api/signup/resend/route.ts`**

```ts
/**
 * POST /api/signup/resend — a new confirmation email. It has to exist: links expire, sending can
 * fail and mail lands in spam. The answer is the same for every address.
 */

import { after } from 'next/server'
import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { hasApprovedAccess } from '@/lib/access/claims'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { jsonNoStore, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'
import { sendVerificationEmail } from '@/lib/access/verification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Only an unconfirmed, enabled account without access gets a link. A legacy account already has a
 * password and access, and a confirmation link would let whoever reads its mailbox replace the
 * password on the confirmation page: that is the reset flow's job. A disabled account was rejected.
 */
async function needsConfirmation(email: string): Promise<boolean> {
  try {
    const user = await getFirebaseAdminAuth().getUserByEmail(email)
    return !user.emailVerified && !user.disabled && !hasApprovedAccess(user.customClaims)
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'resend')
  if (refused) return refused

  const email = normalizeEmail((await readJsonObject(req)).email)
  if (isWellFormedEmail(email)) {
    // After the response: the lookup and the mail take time only when the account exists, and
    // waiting for them would let the clock tell what the body hides.
    after(async () => {
      if (await needsConfirmation(email)) await sendVerificationEmail(email)
    })
  }

  return jsonNoStore({ status: 'accepted' }, 202)
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/app/signupRoutes.test.ts`
Expected: PASS.

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add app/api/signup/route.ts app/api/signup/resend/route.ts tests/helpers/jsonPost.ts tests/app/signupRoutes.test.ts
git commit -m "feat: add the signup and resend routes"
```

---

### Task 12: Confirmation check and confirm routes

**Files:**
- Create: `app/api/signup/confirm/check/route.ts`, `app/api/signup/confirm/route.ts`
- Test: `tests/app/confirmRoutes.test.ts`

**Interfaces:**
- Consumes: `checkActionCode`, `applyVerificationCode` (Task 6); `getFirebaseAdminAuth` (Task 3); `isAcceptablePassword` (Task 2); `settleSignup` (Task 8); `jsonNoStore`, `readJsonObject`, `rejectWhenSignupClosed`, `rejectUntrustedOrLimited`, `codeFailure` (Task 4).
- Produces: `POST /api/signup/confirm/check { code }` → 200 `{ email }` | 410 `{ reason: 'invalid-code' }`; `POST /api/signup/confirm { code, password }` → 200 `{ status: 'approved' | 'pending' | 'rejected' }` | 400 `{ reason: 'weak-password' }` | 410 `{ reason: 'invalid-code' }` | 502 `{ reason: 'failed' }`. Both: 403, 404, 429.

- [ ] **Step 1: Write the failing test**

```ts
// tests/app/confirmRoutes.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  checkActionCode: vi.fn(),
  applyVerificationCode: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  settleSignup: vi.fn(),
}))

vi.mock('@/lib/access/firebaseCodes', () => ({
  checkActionCode: mocks.checkActionCode,
  applyVerificationCode: mocks.applyVerificationCode,
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUserByEmail: mocks.getUserByEmail, updateUser: mocks.updateUser, getUser: mocks.getUser }),
}))
vi.mock('@/lib/access/settlement', () => ({ settleSignup: mocks.settleSignup }))

import { POST as check } from '@/app/api/signup/confirm/check/route'
import { POST as confirm } from '@/app/api/signup/confirm/route'
import { accessRateLimits } from '@/lib/access/rateLimits'

const EMAIL = 'fulana@ufcg.edu.br'

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'true')
  for (const limiter of Object.values(accessRateLimits)) limiter.clear()
  mocks.checkActionCode.mockResolvedValue(EMAIL)
  mocks.applyVerificationCode.mockResolvedValue(EMAIL)
  mocks.getUserByEmail.mockResolvedValue({ uid: 'u1' })
  mocks.updateUser.mockResolvedValue({})
  mocks.getUser.mockResolvedValue({ uid: 'u1', emailVerified: true })
  mocks.settleSignup.mockResolvedValue('pending')
})

describe('POST /api/signup/confirm/check', () => {
  it('answers 404 while signup is closed', async () => {
    vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
    expect((await check(jsonPost('/api/signup/confirm/check', { code: 'C0DE' }))).status).toBe(404)
  })

  it('returns the email of a valid verification code, and spends nothing', async () => {
    const res = await check(jsonPost('/api/signup/confirm/check', { code: 'C0DE' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ email: EMAIL })
    expect(mocks.checkActionCode).toHaveBeenCalledWith('C0DE', 'VERIFY_EMAIL')
    expect(mocks.applyVerificationCode).not.toHaveBeenCalled()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('answers 410 for an invalid code, and for no code without asking Firebase', async () => {
    mocks.checkActionCode.mockResolvedValueOnce(null)
    const invalid = await check(jsonPost('/api/signup/confirm/check', { code: 'USED' }))
    expect(invalid.status).toBe(410)
    expect(await invalid.json()).toEqual({ reason: 'invalid-code' })

    mocks.checkActionCode.mockClear()
    expect((await check(jsonPost('/api/signup/confirm/check', {}))).status).toBe(410)
    expect((await check(jsonPost('/api/signup/confirm/check', { code: '' }))).status).toBe(410)
    expect(mocks.checkActionCode).not.toHaveBeenCalled()
  })
})

describe('POST /api/signup/confirm', () => {
  it('rejects a short password before touching the code', async () => {
    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: '1234567' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ reason: 'weak-password' })
    expect(mocks.checkActionCode).not.toHaveBeenCalled()
  })

  it('answers 410 for an invalid or reused code, without setting a password', async () => {
    mocks.checkActionCode.mockResolvedValueOnce(null)

    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'USED', password: 'senha-forte-1' }))

    expect(res.status).toBe(410)
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('takes the account from the code, never from the request body', async () => {
    await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1', email: 'outra@evil.co' }))
    expect(mocks.getUserByEmail).toHaveBeenCalledWith(EMAIL)
  })

  it('sets the password, then applies the code, then settles', async () => {
    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'pending' })
    expect(mocks.updateUser).toHaveBeenCalledWith('u1', { password: 'senha-forte-1' })
    expect(mocks.applyVerificationCode).toHaveBeenCalledWith('C0DE')
    expect(mocks.updateUser.mock.invocationCallOrder[0]).toBeLessThan(mocks.applyVerificationCode.mock.invocationCallOrder[0])
    expect(mocks.settleSignup).toHaveBeenCalledWith({ uid: 'u1', email: EMAIL, emailVerified: true })
  })

  it('answers 410 when the code no longer applies after the password was set', async () => {
    mocks.applyVerificationCode.mockResolvedValueOnce(null)
    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1' }))
    expect(res.status).toBe(410)
    expect(mocks.settleSignup).not.toHaveBeenCalled()
  })

  it("maps Firebase's password policy refusal to weak-password, before the code is spent", async () => {
    mocks.updateUser.mockRejectedValueOnce(Object.assign(new Error('policy'), { code: 'auth/password-does-not-meet-requirements' }))

    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senhafraca' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ reason: 'weak-password' })
    expect(mocks.applyVerificationCode).not.toHaveBeenCalled()
  })

  it('answers 502 when settling fails, without logging the password', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.settleSignup.mockRejectedValueOnce(new Error('firestore down'))

    const res = await confirm(jsonPost('/api/signup/confirm', { code: 'C0DE', password: 'senha-forte-1' }))

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ reason: 'failed' })
    expect(error.mock.calls.flat().join(' ')).not.toContain('senha-forte-1')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/app/confirmRoutes.test.ts`
Expected: FAIL: the routes do not resolve.

- [ ] **Step 3: Write `app/api/signup/confirm/check/route.ts`**

```ts
/**
 * POST /api/signup/confirm/check — whether a confirmation link's code is still valid, and for which
 * address. It spends nothing, so a mail scanner opening the link burns no code and settles nothing.
 */

import { checkActionCode } from '@/lib/access/firebaseCodes'
import { codeFailure, jsonNoStore, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'confirm')
  if (refused) return refused

  const { code } = await readJsonObject(req)
  const email = typeof code === 'string' && code ? await checkActionCode(code, 'VERIFY_EMAIL') : null

  return email ? jsonNoStore({ email }) : codeFailure('invalid-code', 410)
}
```

- [ ] **Step 4: Write `app/api/signup/confirm/route.ts`**

```ts
/**
 * POST /api/signup/confirm — the person chose a password on the confirmation page. Only the holder
 * of a valid verification code, that is, whoever reads the mailbox, gets to set it (spec §15).
 */

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { applyVerificationCode, checkActionCode } from '@/lib/access/firebaseCodes'
import { codeFailure, jsonNoStore, readJsonObject, rejectUntrustedOrLimited, rejectWhenSignupClosed } from '@/lib/access/http'
import { isAcceptablePassword } from '@/lib/access/passwordRules'
import { settleSignup } from '@/lib/access/settlement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The Admin SDK's refusals of a password: too short for Firebase, or against the password policy. */
function isWeakPasswordError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  return code === 'auth/invalid-password' || code === 'auth/password-does-not-meet-requirements'
}

export async function POST(req: Request) {
  const refused = rejectWhenSignupClosed() ?? rejectUntrustedOrLimited(req, 'confirm')
  if (refused) return refused

  const { code, password } = await readJsonObject(req)
  if (!isAcceptablePassword(password)) return codeFailure('weak-password', 400)
  if (typeof code !== 'string' || !code) return codeFailure('invalid-code', 410)

  // The email comes from the code, never from the request.
  const email = await checkActionCode(code, 'VERIFY_EMAIL')
  if (!email) return codeFailure('invalid-code', 410)

  const auth = getFirebaseAdminAuth()
  try {
    const { uid } = await auth.getUserByEmail(email)

    // The password before the code: applying first and then failing here would leave a confirmed
    // account with no password and a spent code. The other way round, a failure leaves a password
    // set by the mailbox owner, whose login answers email_unconfirmed and offers resend.
    await auth.updateUser(uid, { password })
    if (!(await applyVerificationCode(code))) return codeFailure('invalid-code', 410)

    const { emailVerified } = await auth.getUser(uid)
    const status = await settleSignup({ uid, email, emailVerified })
    return status === 'unconfirmed' ? codeFailure('failed', 502) : jsonNoStore({ status })
  } catch (error) {
    if (isWeakPasswordError(error)) return codeFailure('weak-password', 400)
    console.error('[/api/signup/confirm] could not confirm the signup:', error instanceof Error ? error.message : 'unknown error')
    return codeFailure('failed', 502)
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/app/confirmRoutes.test.ts`
Expected: PASS.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add app/api/signup/confirm/check/route.ts app/api/signup/confirm/route.ts tests/app/confirmRoutes.test.ts
git commit -m "feat: confirm signups by choosing the password from the email link"
```

---

### Task 13: Approve route

**Files:**
- Create: `app/api/signup/approve/route.ts`
- Test: `tests/app/approveRoute.test.ts`

**Interfaces:**
- Consumes: `getAuthenticatedRequest`, `unauthorizedResponse` (`lib/auth.ts`); `isAccessAdmin`, `normalizeEmail` (Task 2); `hasTrustedOrigin` (Task 4); `approveAccess` (Task 3); `readAccessRequest`, `claimPendingDecision`, `AccessDecisionStatus` (Task 7); `sendMail` (Task 5), `buildDecisionEmail`, `loginUrl` (Task 5); `jsonNoStore`, `readJsonObject` (Task 4).
- Produces: `POST /api/signup/approve { uid, decision: 'approved' | 'rejected' }` → 200 `{ status }` | 400 | 401 | 403 | 404 | 409 `{ error, status? }` | 500.

- [ ] **Step 1: Write the failing test**

```ts
// tests/app/approveRoute.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequest: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  approveAccess: vi.fn(),
  sendMail: vi.fn(),
  db: null as unknown,
}))

vi.mock('@/lib/auth', () => ({
  getAuthenticatedRequest: mocks.getAuthenticatedRequest,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUser: mocks.getUser, updateUser: mocks.updateUser }),
  getFirebaseAdminDb: () => mocks.db,
}))
vi.mock('@/lib/access/claims', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/access/claims')>(),
  approveAccess: mocks.approveAccess,
}))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))

import { POST } from '@/app/api/signup/approve/route'

let fake: ReturnType<typeof createFakeFirestore>
const COLLECTION = 'access-requests-local'

function seed(uid: string, overrides: Record<string, unknown> = {}) {
  fake.store(COLLECTION).set(uid, {
    email: `${uid}@example.org`, tier: 'common', intention: 'Pesquisa', status: 'pending',
    createdAt: '2026-10-15T12:00:00.000Z', decidedAt: null, decidedBy: null, notifiedAt: null,
    ...overrides,
  })
}

const decide = (body: unknown, headers?: Record<string, string>) => POST(jsonPost('/api/signup/approve', body, headers))

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('ACCESS_ADMIN_EMAILS', 'admin@ufcg.edu.br')
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  vi.stubEnv('FIREBASE_ACCESS_REQUESTS_COLLECTION', '')
  vi.stubEnv('SIGNUP_SEND_REJECTION_EMAIL', '')
  fake = createFakeFirestore()
  mocks.db = fake.db
  mocks.getAuthenticatedRequest.mockResolvedValue({ uid: 'admin-uid', email: 'Admin@UFCG.edu.br' })
  mocks.getUser.mockResolvedValue({ emailVerified: true })
  mocks.updateUser.mockResolvedValue({})
  mocks.approveAccess.mockResolvedValue(undefined)
  mocks.sendMail.mockResolvedValue({ delivered: true })
})

describe('POST /api/signup/approve', () => {
  it('answers 401 without a session', async () => {
    mocks.getAuthenticatedRequest.mockResolvedValueOnce(null)
    expect((await decide({ uid: 'u1', decision: 'approved' })).status).toBe(401)
  })

  it('answers 403 to a cross-site request and to a non-admin', async () => {
    seed('u1')
    expect((await decide({ uid: 'u1', decision: 'approved' }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403)
    mocks.getAuthenticatedRequest.mockResolvedValueOnce({ uid: 'x', email: 'fulana@ufcg.edu.br' })
    expect((await decide({ uid: 'u1', decision: 'approved' })).status).toBe(403)
    expect(fake.store(COLLECTION).get('u1')?.status).toBe('pending')
  })

  it('answers 400 to a missing uid or an unknown decision, and 404 to an unknown request', async () => {
    expect((await decide({ decision: 'approved' })).status).toBe(400)
    expect((await decide({ uid: 'u1', decision: 'maybe' })).status).toBe(400)
    expect((await decide({ uid: 'nobody', decision: 'approved' })).status).toBe(404)
  })

  it('refuses to approve an unconfirmed email', async () => {
    seed('u1')
    mocks.getUser.mockResolvedValueOnce({ emailVerified: false })

    const res = await decide({ uid: 'u1', decision: 'approved' })

    expect(res.status).toBe(409)
    expect(fake.store(COLLECTION).get('u1')?.status).toBe('pending')
    expect(mocks.approveAccess).not.toHaveBeenCalled()
  })

  it('records the approval, grants access with the stored tier and emails the applicant', async () => {
    seed('u1', { tier: 'common' })

    const res = await decide({ uid: 'u1', decision: 'approved', tier: 'legacy' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'approved' })
    expect(fake.store(COLLECTION).get('u1')).toMatchObject({ status: 'approved', decidedBy: 'admin@ufcg.edu.br' })
    expect(mocks.approveAccess).toHaveBeenCalledWith('u1', 'common')
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; subject: string; text: string }
    expect(message.to).toBe('u1@example.org')
    expect(message.subject).toBe('Seu acesso à Caativar foi liberado')
    expect(message.text).toContain('https://caativar.example.org/login')
  })

  it('turns away a second decision with the status already recorded', async () => {
    seed('u1', { status: 'approved' })

    const res = await decide({ uid: 'u1', decision: 'rejected' })

    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ status: 'approved' })
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('disables a rejected account, and emails it only when the team turned that on', async () => {
    seed('u1')
    expect((await decide({ uid: 'u1', decision: 'rejected' })).status).toBe(200)
    expect(mocks.updateUser).toHaveBeenCalledWith('u1', { disabled: true })
    expect(mocks.sendMail).not.toHaveBeenCalled()

    vi.stubEnv('SIGNUP_SEND_REJECTION_EMAIL', 'true')
    seed('u2')
    await decide({ uid: 'u2', decision: 'rejected' })
    expect((mocks.sendMail.mock.calls[0][0] as { subject: string }).subject).toBe('Sobre seu pedido de acesso à Caativar')
  })

  it('rejects an unconfirmed email too', async () => {
    seed('u1')
    mocks.getUser.mockResolvedValueOnce({ emailVerified: false })
    expect((await decide({ uid: 'u1', decision: 'rejected' })).status).toBe(200)
  })

  it('says so when the decision was recorded but access could not be granted', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('u1')
    mocks.approveAccess.mockRejectedValueOnce(new Error('auth down'))

    const res = await decide({ uid: 'u1', decision: 'approved' })

    expect(res.status).toBe(500)
    expect(fake.store(COLLECTION).get('u1')?.status).toBe('approved')
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  it('keeps the decision when the email fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    seed('u1')
    mocks.sendMail.mockRejectedValueOnce(new Error('smtp down'))
    expect((await decide({ uid: 'u1', decision: 'approved' })).status).toBe(200)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/app/approveRoute.test.ts`
Expected: FAIL: `@/app/api/signup/approve/route` does not resolve.

- [ ] **Step 3: Write `app/api/signup/approve/route.ts`**

```ts
/**
 * POST /api/signup/approve — an admin's decision on an access request. The approvals page showing
 * something never authorizes it: this route checks the session, the origin and the admin list
 * itself, and that is where the decider's identity comes from.
 */

import { getAuthenticatedRequest, unauthorizedResponse } from '@/lib/auth'
import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { isAccessAdmin } from '@/lib/access/admins'
import { approveAccess } from '@/lib/access/claims'
import { normalizeEmail } from '@/lib/access/emailAddress'
import { buildDecisionEmail } from '@/lib/access/emails'
import { jsonNoStore, readJsonObject } from '@/lib/access/http'
import { claimPendingDecision, readAccessRequest, type AccessDecisionStatus } from '@/lib/access/requests'
import { hasTrustedOrigin } from '@/lib/access/trustedOrigin'
import { loginUrl } from '@/lib/access/urls'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isDecision(value: unknown): value is AccessDecisionStatus {
  return value === 'approved' || value === 'rejected'
}

async function hasConfirmedEmail(uid: string) {
  try {
    return (await getFirebaseAdminAuth().getUser(uid)).emailVerified
  } catch {
    return false
  }
}

/**
 * Closes the loop with the applicant. The rejection email is off by default: the team has not
 * decided to send it, and sending it by mistake is worse than not sending it.
 */
async function notifyApplicant(email: string, decision: AccessDecisionStatus) {
  if (decision === 'rejected' && process.env.SIGNUP_SEND_REJECTION_EMAIL !== 'true') return
  try {
    await sendMail({ ...buildDecisionEmail({ status: decision, loginUrl: loginUrl() }), to: email })
  } catch (error) {
    // The decision is recorded; failing the request would make the admin decide it again.
    console.error('[/api/signup/approve] could not email the decision:', error instanceof Error ? error.message : 'unknown error')
  }
}

export async function POST(req: Request) {
  const session = await getAuthenticatedRequest(req)
  if (!session) return unauthorizedResponse()
  if (!hasTrustedOrigin(req)) return jsonNoStore({ error: 'Origem da requisição não autorizada.' }, 403)
  if (!isAccessAdmin(session.email)) return jsonNoStore({ error: 'Acesso negado.' }, 403)

  const body = await readJsonObject(req)
  const uid = typeof body.uid === 'string' ? body.uid.trim() : ''
  const decision = body.decision
  if (!uid || !isDecision(decision)) {
    return jsonNoStore({ error: 'Informe o usuário e uma decisão válida.' }, 400)
  }

  const request = await readAccessRequest(uid)
  if (!request) return jsonNoStore({ error: 'Pedido de acesso não encontrado.' }, 404)

  // The page lists only confirmed emails, but the route does not trust the page: approving an
  // unconfirmed address would grant access to an address nobody proved to own. Rejecting stays
  // allowed, since closing a suspicious request does not depend on it.
  if (decision === 'approved' && !(await hasConfirmedEmail(uid))) {
    return jsonNoStore({ error: 'Esta pessoa ainda não confirmou o e-mail.' }, 409)
  }

  // The decision is recorded before access is granted: a failure in between leaves a decided
  // request without access (settlement grants it again on the next login) rather than access
  // without a record.
  const claim = await claimPendingDecision(uid, { status: decision, decidedBy: normalizeEmail(session.email) })
  if (!claim.claimed) {
    return jsonNoStore({ error: 'Este pedido já foi decidido.', status: claim.status }, 409)
  }

  if (decision === 'approved') {
    try {
      // The tier the transaction read from the request, never one from the page.
      await approveAccess(uid, claim.tier)
    } catch (error) {
      console.error(`[/api/signup/approve] decision recorded but access not granted for ${uid}:`, error instanceof Error ? error.message : 'unknown error')
      return jsonNoStore({ error: 'A decisão foi registrada, mas o acesso não foi liberado. Avise a equipe técnica.' }, 500)
    }
  } else {
    // Without this a rejected account keeps trying to sign in, and its address stays taken. Reversible
    // from the Firebase console.
    await getFirebaseAdminAuth().updateUser(uid, { disabled: true }).catch((error: unknown) => {
      console.error('[/api/signup/approve] request rejected, but the account is still enabled:', error instanceof Error ? error.message : 'unknown error')
    })
  }

  await notifyApplicant(request.email, decision)
  return jsonNoStore({ status: decision })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/app/approveRoute.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add app/api/signup/approve/route.ts tests/app/approveRoute.test.ts
git commit -m "feat: let admins approve or reject access requests"
```

---

### Task 14: Password reset

**Files:**
- Create: `lib/access/passwordReset.ts`, `app/api/password-reset/route.ts`, `app/api/password-reset/check/route.ts`, `app/api/password-reset/confirm/route.ts`
- Test: `tests/lib/access/passwordReset.test.ts`, `tests/app/passwordResetRoutes.test.ts`

**Interfaces:**
- Consumes: `getFirebaseAdminAuth` (Task 3), `sendMail`, `buildPasswordResetEmail`, `passwordResetUrl` (Task 5), `extractOobCode`, `checkActionCode`, `resetPasswordWithCode` (Task 6), `describeWithoutLink` (Task 8), `normalizeEmail`, `isWellFormedEmail`, `isAcceptablePassword` (Task 2), `jsonNoStore`, `readJsonObject`, `rejectUntrustedOrLimited`, `codeFailure` (Task 4).
- Produces: `sendPasswordResetEmail(email: string): Promise<boolean>`; `POST /api/password-reset { email }` → 202; `POST /api/password-reset/check { code }` → 200 `{ email }` | 410; `POST /api/password-reset/confirm { code, password }` → 200 `{ status: 'changed' }` | 400 | 410 | 502. None of them depends on the switch.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/access/passwordReset.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getUserByEmail: vi.fn(), generatePasswordResetLink: vi.fn(), sendMail: vi.fn() }))

vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUserByEmail: mocks.getUserByEmail, generatePasswordResetLink: mocks.generatePasswordResetLink }),
}))
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/mailer')>(),
  sendMail: mocks.sendMail,
}))

import { sendPasswordResetEmail } from '@/lib/access/passwordReset'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('APP_BASE_URL', 'https://caativar.example.org')
  mocks.getUserByEmail.mockResolvedValue({ uid: 'u1' })
  mocks.generatePasswordResetLink.mockResolvedValue('https://p.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=R3SET')
  mocks.sendMail.mockResolvedValue({ delivered: true })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sendPasswordResetEmail', () => {
  it('sends our own reset link to an existing account', async () => {
    expect(await sendPasswordResetEmail('fulana@ufcg.edu.br')).toBe(true)
    const message = mocks.sendMail.mock.calls[0][0] as { to: string; text: string }
    expect(message.to).toBe('fulana@ufcg.edu.br')
    expect(message.text).toContain('https://caativar.example.org/redefinir-senha?code=R3SET')
  })

  it('does nothing, quietly, for an unknown address', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getUserByEmail.mockRejectedValueOnce(Object.assign(new Error('none'), { code: 'auth/user-not-found' }))

    expect(await sendPasswordResetEmail('ninguem@ufcg.edu.br')).toBe(false)
    expect(mocks.generatePasswordResetLink).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('logs a failure without the code', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.sendMail.mockRejectedValueOnce(new Error('rejected message with R3SET inside'))

    expect(await sendPasswordResetEmail('fulana@ufcg.edu.br')).toBe(false)
    expect(error.mock.calls.flat().join(' ')).not.toContain('R3SET')
  })
})
```

```ts
// tests/app/passwordResetRoutes.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonPost } from '@/tests/helpers/jsonPost'

const mocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  checkActionCode: vi.fn(),
  resetPasswordWithCode: vi.fn(),
  getUserByEmail: vi.fn(),
  revokeRefreshTokens: vi.fn(),
  afterTasks: [] as Array<Promise<unknown>>,
}))

vi.mock('next/server', async (importOriginal) => ({
  ...await importOriginal<typeof import('next/server')>(),
  after: (task: () => unknown) => {
    mocks.afterTasks.push(Promise.resolve().then(task))
  },
}))
vi.mock('@/lib/access/passwordReset', () => ({ sendPasswordResetEmail: mocks.sendPasswordResetEmail }))
vi.mock('@/lib/access/firebaseCodes', () => ({
  checkActionCode: mocks.checkActionCode,
  resetPasswordWithCode: mocks.resetPasswordWithCode,
}))
vi.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdminAuth: () => ({ getUserByEmail: mocks.getUserByEmail, revokeRefreshTokens: mocks.revokeRefreshTokens }),
}))

import { POST as requestReset } from '@/app/api/password-reset/route'
import { POST as checkReset } from '@/app/api/password-reset/check/route'
import { POST as confirmReset } from '@/app/api/password-reset/confirm/route'
import { accessRateLimits } from '@/lib/access/rateLimits'

const flushAfter = () => Promise.all(mocks.afterTasks.splice(0))

beforeEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('PLATFORM_ACCESS_GUARD_ENABLED', 'false')
  for (const limiter of Object.values(accessRateLimits)) limiter.clear()
  mocks.afterTasks.splice(0)
  mocks.sendPasswordResetEmail.mockResolvedValue(true)
  mocks.checkActionCode.mockResolvedValue('fulana@ufcg.edu.br')
  mocks.resetPasswordWithCode.mockResolvedValue({ status: 'changed', email: 'fulana@ufcg.edu.br' })
  mocks.getUserByEmail.mockResolvedValue({ uid: 'u1' })
  mocks.revokeRefreshTokens.mockResolvedValue(undefined)
})

describe('POST /api/password-reset', () => {
  it('answers 202 for any address, even with signup closed, and sends after the response', async () => {
    const res = await requestReset(jsonPost('/api/password-reset', { email: ' Fulana@UFCG.edu.br ' }))
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ status: 'accepted' })
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled()

    await flushAfter()
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith('fulana@ufcg.edu.br')
  })

  it('answers the same to a malformed address and sends nothing', async () => {
    expect((await requestReset(jsonPost('/api/password-reset', { email: 'fulana' }))).status).toBe(202)
    await flushAfter()
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('refuses a cross-site request and a client over 10 a minute', async () => {
    expect((await requestReset(jsonPost('/api/password-reset', { email: 'a@b.co' }, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403)
    for (let i = 0; i < 10; i++) await requestReset(jsonPost('/api/password-reset', { email: 'a@b.co' }))
    expect((await requestReset(jsonPost('/api/password-reset', { email: 'a@b.co' }))).status).toBe(429)
  })
})

describe('POST /api/password-reset/check', () => {
  it('returns the account email of a valid reset code', async () => {
    const res = await checkReset(jsonPost('/api/password-reset/check', { code: 'R3SET' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ email: 'fulana@ufcg.edu.br' })
    expect(mocks.checkActionCode).toHaveBeenCalledWith('R3SET', 'PASSWORD_RESET')
  })

  it('answers 410 for an invalid code or none', async () => {
    mocks.checkActionCode.mockResolvedValueOnce(null)
    expect((await checkReset(jsonPost('/api/password-reset/check', { code: 'USED' }))).status).toBe(410)
    expect((await checkReset(jsonPost('/api/password-reset/check', {}))).status).toBe(410)
  })
})

describe('POST /api/password-reset/confirm', () => {
  const submit = (body: unknown) => confirmReset(jsonPost('/api/password-reset/confirm', body))

  it('changes the password and signs out every session', async () => {
    const res = await submit({ code: 'R3SET', password: 'nova-senha-1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'changed' })
    expect(mocks.resetPasswordWithCode).toHaveBeenCalledWith('R3SET', 'nova-senha-1')
    expect(mocks.revokeRefreshTokens).toHaveBeenCalledWith('u1')
  })

  it('maps each failure to its reason', async () => {
    expect((await submit({ code: 'R3SET', password: 'curta' })).status).toBe(400)
    expect((await submit({ password: 'nova-senha-1' })).status).toBe(410)

    mocks.resetPasswordWithCode.mockResolvedValueOnce({ status: 'invalid-code' })
    expect((await submit({ code: 'R3SET', password: 'nova-senha-1' })).status).toBe(410)
    mocks.resetPasswordWithCode.mockResolvedValueOnce({ status: 'weak-password' })
    const weak = await submit({ code: 'R3SET', password: 'nova-senha-1' })
    expect(weak.status).toBe(400)
    expect(await weak.json()).toEqual({ reason: 'weak-password' })
    mocks.resetPasswordWithCode.mockResolvedValueOnce({ status: 'failed' })
    expect((await submit({ code: 'R3SET', password: 'nova-senha-1' })).status).toBe(502)
  })

  it('still answers changed when the explicit revocation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.revokeRefreshTokens.mockRejectedValueOnce(new Error('auth down'))
    expect((await submit({ code: 'R3SET', password: 'nova-senha-1' })).status).toBe(200)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/access/passwordReset.test.ts tests/app/passwordResetRoutes.test.ts`
Expected: FAIL: the modules do not resolve.

- [ ] **Step 3: Write `lib/access/passwordReset.ts`**

```ts
import 'server-only'

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { sendMail } from '@/lib/mailer'
import { buildPasswordResetEmail } from '@/lib/access/emails'
import { extractOobCode } from '@/lib/access/firebaseCodes'
import { passwordResetUrl } from '@/lib/access/urls'
import { describeWithoutLink } from '@/lib/access/verification'

/** How Firebase answers when no account has the address. */
function isUnknownAccount(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  return code === 'auth/user-not-found' || code === 'auth/email-not-found'
}

/**
 * Sends the reset link and says whether it went out. An address without an account is not an
 * error: the route answers the same either way, and logging every attempt would only fill the log
 * with whatever a stranger typed.
 */
export async function sendPasswordResetEmail(email: string): Promise<boolean> {
  let code: string | null = null
  try {
    const auth = getFirebaseAdminAuth()
    // Look the account up first: with email enumeration protection on, generating a link for an
    // unknown address fails as a generic auth/internal-error, indistinguishable from a real failure.
    await auth.getUserByEmail(email)

    code = extractOobCode(await auth.generatePasswordResetLink(email))
    if (!code) throw new Error('Firebase returned a link without a code.')

    const { delivered } = await sendMail({ ...buildPasswordResetEmail({ link: passwordResetUrl(code) }), to: email })
    if (!delivered) console.error('[access] password reset email not delivered: the mailer is not configured.')
    return delivered
  } catch (error) {
    if (isUnknownAccount(error)) return false
    console.error('[access] could not send the password reset email:', describeWithoutLink(error, code))
    return false
  }
}
```

- [ ] **Step 4: Write the three routes**

```ts
// app/api/password-reset/route.ts
/**
 * POST /api/password-reset — "Esqueci minha senha". Independent of the access switch: changing a
 * password creates no account, and accounts made by hand forget passwords too. The answer is the
 * same for every address; this is the most obvious door for learning who has an account.
 */

import { after } from 'next/server'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { jsonNoStore, readJsonObject, rejectUntrustedOrLimited } from '@/lib/access/http'
import { sendPasswordResetEmail } from '@/lib/access/passwordReset'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = rejectUntrustedOrLimited(req, 'resetRequest')
  if (refused) return refused

  const email = normalizeEmail((await readJsonObject(req)).email)
  // After the response, so the time taken does not tell an existing account from a missing one.
  if (isWellFormedEmail(email)) after(() => sendPasswordResetEmail(email))

  return jsonNoStore({ status: 'accepted' }, 202)
}
```

```ts
// app/api/password-reset/check/route.ts
/** POST /api/password-reset/check — whether a reset link's code is still valid, without spending it. */

import { checkActionCode } from '@/lib/access/firebaseCodes'
import { codeFailure, jsonNoStore, readJsonObject, rejectUntrustedOrLimited } from '@/lib/access/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = rejectUntrustedOrLimited(req, 'resetCode')
  if (refused) return refused

  const { code } = await readJsonObject(req)
  const email = typeof code === 'string' && code ? await checkActionCode(code, 'PASSWORD_RESET') : null

  return email ? jsonNoStore({ email }) : codeFailure('invalid-code', 410)
}
```

```ts
// app/api/password-reset/confirm/route.ts
/**
 * POST /api/password-reset/confirm — changes the password with the link's code. Firebase already
 * invalidates sessions when the password changes; the explicit revocation is there so this does
 * not depend on that detail in the one case where the old password may be in someone else's hands.
 */

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { resetPasswordWithCode } from '@/lib/access/firebaseCodes'
import { codeFailure, jsonNoStore, readJsonObject, rejectUntrustedOrLimited } from '@/lib/access/http'
import { isAcceptablePassword } from '@/lib/access/passwordRules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = rejectUntrustedOrLimited(req, 'resetCode')
  if (refused) return refused

  const { code, password } = await readJsonObject(req)
  if (!isAcceptablePassword(password)) return codeFailure('weak-password', 400)
  if (typeof code !== 'string' || !code) return codeFailure('invalid-code', 410)

  const result = await resetPasswordWithCode(code, password)
  if (result.status === 'invalid-code') return codeFailure('invalid-code', 410)
  if (result.status === 'weak-password') return codeFailure('weak-password', 400)
  if (result.status === 'failed') return codeFailure('failed', 502)

  try {
    const auth = getFirebaseAdminAuth()
    await auth.revokeRefreshTokens((await auth.getUserByEmail(result.email)).uid)
  } catch {
    // The password changed and Firebase invalidated the tokens on its own: this must not turn into
    // "could not change the password".
    console.error('[/api/password-reset/confirm] password changed, but the explicit session revocation failed.')
  }

  return jsonNoStore({ status: 'changed' })
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/access/passwordReset.test.ts tests/app/passwordResetRoutes.test.ts`
Expected: PASS.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
git add lib/access/passwordReset.ts app/api/password-reset tests/lib/access/passwordReset.test.ts tests/app/passwordResetRoutes.test.ts
git commit -m "feat: add the forgot-password routes"
```

---

### Task 15: Signup and confirmation screens

**Files:**
- Create: `lib/access/signupForm.ts`, `components/auth/SignupForm.tsx`, `components/auth/SignupConfirmation.tsx`, `app/(auth)/cadastro/page.tsx`, `app/(auth)/cadastro/confirmacao/page.tsx`
- Test: `tests/components/signupScreens.test.ts`

**Interfaces:**
- Consumes: `AuthCard`, `authStyles`, `primaryButtonStyle`, `linkButtonStyle` (Task 9); `PasswordFields`, `PASSWORD_PAIR_MESSAGES`, `WEAK_PASSWORD_MESSAGE` (Task 9); `ResendConfirmation`, `postJson` (Task 10); `normalizeEmail`, `isWellFormedEmail`, `passwordPairError`, paths, `isSignupOpen` (Task 2); `INTENTION_MAX_LENGTH` (Task 7); `getAuthenticatedSession` (`lib/auth.ts`); `POST /api/signup`, `/api/signup/confirm/check`, `/api/signup/confirm` (Tasks 11–12).
- Produces: `signupFormError(email: string, intention: string): string | null`; default `SignupForm()`; default `SignupConfirmation({ code: string; email: string })`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/signupScreens.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/link', async () => {
  const { createElement: h } = await import('react')
  return {
    default: ({ href, children, ...rest }: { href: string; children?: ReactNode } & Record<string, unknown>) => h('a', { href, ...rest }, children),
  }
})

import SignupForm from '@/components/auth/SignupForm'
import SignupConfirmation from '@/components/auth/SignupConfirmation'
import { signupFormError } from '@/lib/access/signupForm'

describe('signupFormError', () => {
  it('checks the email, then the intention', () => {
    expect(signupFormError('', 'Pesquisa')).toBe('Informe o e-mail.')
    expect(signupFormError('fulana', 'Pesquisa')).toBe('Informe um e-mail válido.')
    expect(signupFormError('fulana@ufcg.edu.br', '   ')).toBe('Descreva como pretende usar a plataforma.')
    expect(signupFormError('fulana@ufcg.edu.br', 'Pesquisa')).toBeNull()
  })
})

describe('SignupForm', () => {
  it('asks for the email and the intention only, and says the password comes later', () => {
    const markup = renderToStaticMarkup(createElement(SignupForm))

    expect(markup).toMatch(/<h1[^>]*>Criar conta<\/h1>/)
    expect(markup).toMatch(/<input[^>]*name="email"[^>]*placeholder="de preferência institucional"/)
    expect(markup).toMatch(/<textarea[^>]*name="intention"[^>]*maxLength="1000"/)
    expect(markup).toContain('Como pretende usar a plataforma?')
    expect(markup).toContain('Sua descrição é enviada à equipe da plataforma, que libera o acesso.')
    expect(markup).toContain('Você escolhe sua senha ao confirmar o e-mail.')
    expect(markup).not.toContain('type="password"')
    expect(markup).toContain('href="/login"')
  })
})

describe('SignupConfirmation', () => {
  it('starts by checking the link', () => {
    const markup = renderToStaticMarkup(createElement(SignupConfirmation, { code: 'C0DE', email: 'fulana@ufcg.edu.br' }))
    expect(markup).toContain('Verificando o link...')
    expect(markup).not.toContain('type="password"')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/signupScreens.test.ts`
Expected: FAIL: `@/components/auth/SignupForm` does not resolve.

- [ ] **Step 3: Write `lib/access/signupForm.ts`**

```ts
import { isWellFormedEmail } from '@/lib/access/emailAddress'

/** The signup form's own check, so the person sees the error before the request leaves. */
export function signupFormError(email: string, intention: string): string | null {
  if (!email) return 'Informe o e-mail.'
  if (!isWellFormedEmail(email)) return 'Informe um e-mail válido.'
  if (!intention.trim()) return 'Descreva como pretende usar a plataforma.'
  return null
}
```

- [ ] **Step 4: Write `components/auth/SignupForm.tsx`**

```tsx
'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import AuthCard, { authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'
import ResendConfirmation from '@/components/auth/ResendConfirmation'
import { postJson } from '@/lib/access/clientFetch'
import { normalizeEmail } from '@/lib/access/emailAddress'
import { INTENTION_MAX_LENGTH } from '@/lib/access/intention'
import { LOGIN_PATH } from '@/lib/access/paths'
import { signupFormError } from '@/lib/access/signupForm'

const GENERIC_ERROR = 'Não foi possível concluir o cadastro. Tente novamente.'

/** Email and intended use; the password is chosen later, from the confirmation link. */
export default function SignupForm() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Kept for the resend button: the form is gone by the time it shows.
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = normalizeEmail(data.get('email'))
    const intention = String(data.get('intention') ?? '')
    const invalid = signupFormError(email, intention)
    if (invalid) {
      setError(invalid)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const { ok, body } = await postJson('/api/signup', { email, intention })
      if (ok) {
        setSentTo(email)
        return
      }
      setError(typeof body?.error === 'string' ? body.error : GENERIC_ERROR)
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <AuthCard title="Confirme seu e-mail" description="Enviamos um link para o endereço informado. Abra o link para confirmar o cadastro e escolher sua senha.">
        <ResendConfirmation email={sentTo} />
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Criar conta">
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <label style={authStyles.label}>
          E-mail
          <input name="email" type="email" autoComplete="email" placeholder="de preferência institucional" required disabled={submitting} style={authStyles.input} />
        </label>
        <label style={authStyles.label}>
          Como pretende usar a plataforma?
          <textarea
            name="intention"
            rows={4}
            maxLength={INTENTION_MAX_LENGTH}
            placeholder="Se tiver vínculo com alguma instituição, informe qual."
            required
            disabled={submitting}
            style={{ ...authStyles.input, resize: 'vertical' }}
          />
          <span style={authStyles.hint}>Sua descrição é enviada à equipe da plataforma, que libera o acesso.</span>
        </label>
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
          {submitting ? 'Criando conta...' : 'Criar conta'}
        </button>
        <p style={authStyles.hint}>Você escolhe sua senha ao confirmar o e-mail.</p>
      </form>
      <p style={authStyles.footer}>
        Já tem conta? <Link href={LOGIN_PATH} style={authStyles.link}>Entrar</Link>
      </p>
    </AuthCard>
  )
}
```

- [ ] **Step 5: Write `components/auth/SignupConfirmation.tsx`**

```tsx
'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import AuthCard, { authStyles, linkButtonStyle, primaryButtonStyle } from '@/components/auth/AuthCard'
import PasswordFields, { PASSWORD_PAIR_MESSAGES, WEAK_PASSWORD_MESSAGE } from '@/components/auth/PasswordFields'
import ResendConfirmation from '@/components/auth/ResendConfirmation'
import { postJson } from '@/lib/access/clientFetch'
import { passwordPairError } from '@/lib/access/passwordRules'
import { LOGIN_PATH } from '@/lib/access/paths'

type Outcome = 'approved' | 'pending' | 'rejected'
type State =
  | { step: 'checking' }
  | { step: 'password'; email: string }
  | { step: 'done'; outcome: Outcome }
  | { step: 'invalid' }

const FAILED_MESSAGE = 'Não foi possível confirmar o cadastro. Tente novamente.'

const OUTCOME_COPY: Record<Outcome, { title: string; description: string }> = {
  approved: { title: 'Acesso liberado', description: 'Seu e-mail foi confirmado e o acesso está liberado.' },
  pending: { title: 'E-mail confirmado', description: 'Sua solicitação foi enviada à equipe da plataforma. Você receberá um e-mail quando ela for analisada.' },
  rejected: { title: 'Pedido não aprovado', description: 'Este pedido de acesso não foi aprovado.' },
}

function isOutcome(value: unknown): value is Outcome {
  return value === 'approved' || value === 'pending' || value === 'rejected'
}

/**
 * The confirmation link's page: checks the code (which spends nothing), asks for the password,
 * then shows how the signup settled. `email` comes from the link and only fills the resend button.
 */
export default function SignupConfirmation({ code, email }: { code: string; email: string }) {
  const [state, setState] = useState<State>({ step: 'checking' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // Checking spends nothing, so React running this twice in development does no harm.
    postJson('/api/signup/confirm/check', { code })
      .then(({ ok, body }) => {
        if (!active) return
        const checkedEmail = body?.email
        setState(ok && typeof checkedEmail === 'string' ? { step: 'password', email: checkedEmail } : { step: 'invalid' })
      })
      .catch(() => {
        if (active) setState({ step: 'invalid' })
      })
    return () => {
      active = false
    }
  }, [code])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const pairError = passwordPairError(password, String(data.get('confirmation') ?? ''))
    if (pairError) {
      setError(PASSWORD_PAIR_MESSAGES[pairError])
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { ok, status, body } = await postJson('/api/signup/confirm', { code, password })
      const outcome = body?.status
      if (ok && isOutcome(outcome)) {
        setState({ step: 'done', outcome })
        return
      }
      if (status === 410) {
        setState({ step: 'invalid' })
        return
      }
      setError(status === 400 ? WEAK_PASSWORD_MESSAGE : FAILED_MESSAGE)
    } catch {
      setError(FAILED_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  if (state.step === 'checking') return <AuthCard title="Verificando o link..." />

  if (state.step === 'invalid') {
    return (
      <AuthCard
        title="Link inválido ou expirado"
        description="Este link já foi usado ou expirou. Se você já confirmou o cadastro, entre com seu e-mail e senha. Se não, peça um novo link."
      >
        <div style={{ display: 'grid', gap: 14 }}>
          {email ? <ResendConfirmation email={email} /> : null}
          <Link href={LOGIN_PATH} style={authStyles.link}>Ir para o login</Link>
        </div>
      </AuthCard>
    )
  }

  if (state.step === 'done') {
    const copy = OUTCOME_COPY[state.outcome]
    return (
      <AuthCard title={copy.title} description={copy.description}>
        {state.outcome === 'approved' ? <Link href={LOGIN_PATH} style={linkButtonStyle}>Entrar na plataforma</Link> : null}
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Escolha sua senha" description={`Conta: ${state.email}`}>
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <PasswordFields disabled={saving} />
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={saving} style={primaryButtonStyle(saving)}>
          {saving ? 'Confirmando...' : 'Confirmar cadastro'}
        </button>
      </form>
    </AuthCard>
  )
}
```

- [ ] **Step 6: Write the two pages**

```tsx
// app/(auth)/cadastro/page.tsx
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import SignupForm from '@/components/auth/SignupForm'
import { getAuthenticatedSession } from '@/lib/auth'
import { isSignupOpen } from '@/lib/access/flag'

export const metadata: Metadata = { title: 'Criar conta | Caativar' }

export default async function SignupPage() {
  // The same rule as the signup routes: while signup is closed the form does not exist, rather
  // than only losing its link on the login card.
  if (!isSignupOpen()) notFound()
  if (await getAuthenticatedSession()) redirect('/')

  return <SignupForm />
}
```

```tsx
// app/(auth)/cadastro/confirmacao/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SignupConfirmation from '@/components/auth/SignupConfirmation'
import { isSignupOpen } from '@/lib/access/flag'

export const metadata: Metadata = { title: 'Confirmação de e-mail | Caativar' }

interface ConfirmationPageProps {
  searchParams: Promise<{ code?: string | string[]; email?: string | string[] }>
}

export default async function SignupConfirmationPage({ searchParams }: ConfirmationPageProps) {
  if (!isSignupOpen()) notFound()

  const { code, email } = await searchParams
  return <SignupConfirmation code={typeof code === 'string' ? code : ''} email={typeof email === 'string' ? email : ''} />
}
```

- [ ] **Step 7: Run the test, lint, and commit**

```bash
npx vitest run tests/components/signupScreens.test.ts
npm run lint
git add lib/access/signupForm.ts components/auth/SignupForm.tsx components/auth/SignupConfirmation.tsx "app/(auth)/cadastro" tests/components/signupScreens.test.ts
git commit -m "feat: add the signup and confirmation screens"
```
Expected: PASS before committing.

---

### Task 16: Forgot and reset password screens

**Files:**
- Create: `components/auth/ForgotPasswordForm.tsx`, `components/auth/ResetPasswordForm.tsx`, `app/(auth)/esqueci-senha/page.tsx`, `app/(auth)/redefinir-senha/page.tsx`
- Test: `tests/components/passwordScreens.test.ts`

**Interfaces:**
- Consumes: Task 9 card and fields; `postJson` (Task 10); `normalizeEmail`, `isWellFormedEmail`, `passwordPairError`, `LOGIN_PATH`, `FORGOT_PASSWORD_PATH` (Task 2); `POST /api/password-reset{,/check,/confirm}` (Task 14).
- Produces: default `ForgotPasswordForm()`, default `ResetPasswordForm({ code: string })`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/passwordScreens.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/link', async () => {
  const { createElement: h } = await import('react')
  return {
    default: ({ href, children, ...rest }: { href: string; children?: ReactNode } & Record<string, unknown>) => h('a', { href, ...rest }, children),
  }
})

import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

describe('ForgotPasswordForm', () => {
  it('asks for the account email and links back to the login', () => {
    const markup = renderToStaticMarkup(createElement(ForgotPasswordForm))
    expect(markup).toMatch(/<h1[^>]*>Esqueci minha senha<\/h1>/)
    expect(markup).toContain('Informe o e-mail da sua conta. Enviaremos um link para escolher uma nova senha.')
    expect(markup).toMatch(/<input[^>]*name="email"/)
    expect(markup).toContain('Enviar link')
    expect(markup).toContain('href="/login"')
  })
})

describe('ResetPasswordForm', () => {
  it('starts by checking the link', () => {
    expect(renderToStaticMarkup(createElement(ResetPasswordForm, { code: 'R3SET' }))).toContain('Verificando o link...')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/passwordScreens.test.ts`
Expected: FAIL: `@/components/auth/ForgotPasswordForm` does not resolve.

- [ ] **Step 3: Write `components/auth/ForgotPasswordForm.tsx`**

```tsx
'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import AuthCard, { authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'
import { postJson } from '@/lib/access/clientFetch'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { LOGIN_PATH } from '@/lib/access/paths'

const SEND_FAILED = 'Não foi possível enviar o link. Tente novamente.'

export default function ForgotPasswordForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = normalizeEmail(new FormData(event.currentTarget).get('email'))
    if (!isWellFormedEmail(email)) {
      setError(email ? 'Informe um e-mail válido.' : 'Informe o e-mail.')
      return
    }

    setState('sending')
    setError(null)
    try {
      const { ok, status } = await postJson('/api/password-reset', { email })
      if (ok) {
        setState('sent')
        return
      }
      setError(status === 429 ? 'Muitas tentativas. Tente novamente em instantes.' : SEND_FAILED)
    } catch {
      setError(SEND_FAILED)
    }
    setState('idle')
  }

  const backToLogin = <Link href={LOGIN_PATH} style={authStyles.link}>Voltar para o login</Link>

  if (state === 'sent') {
    return (
      <AuthCard title="Esqueci minha senha" description="Se houver uma conta com este endereço, enviamos um link para redefinir a senha. O link vale por uma hora.">
        {backToLogin}
      </AuthCard>
    )
  }

  const sending = state === 'sending'
  return (
    <AuthCard title="Esqueci minha senha" description="Informe o e-mail da sua conta. Enviaremos um link para escolher uma nova senha.">
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <label style={authStyles.label}>
          E-mail
          <input name="email" type="email" autoComplete="username" required disabled={sending} style={authStyles.input} />
        </label>
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={sending} style={primaryButtonStyle(sending)}>
          {sending ? 'Enviando...' : 'Enviar link'}
        </button>
      </form>
      <p style={authStyles.footer}>{backToLogin}</p>
    </AuthCard>
  )
}
```

- [ ] **Step 4: Write `components/auth/ResetPasswordForm.tsx`**

```tsx
'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import AuthCard, { authStyles, linkButtonStyle, primaryButtonStyle } from '@/components/auth/AuthCard'
import PasswordFields, { PASSWORD_PAIR_MESSAGES, WEAK_PASSWORD_MESSAGE } from '@/components/auth/PasswordFields'
import { postJson } from '@/lib/access/clientFetch'
import { passwordPairError } from '@/lib/access/passwordRules'
import { FORGOT_PASSWORD_PATH, LOGIN_PATH } from '@/lib/access/paths'

type State = { step: 'checking' } | { step: 'ready'; email: string } | { step: 'changed' } | { step: 'invalid' }

const FAILED_MESSAGE = 'Não foi possível alterar a senha. Tente novamente.'

export default function ResetPasswordForm({ code }: { code: string }) {
  const [state, setState] = useState<State>({ step: 'checking' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // Checking does not spend the code.
    postJson('/api/password-reset/check', { code })
      .then(({ ok, body }) => {
        if (!active) return
        const email = body?.email
        setState(ok && typeof email === 'string' ? { step: 'ready', email } : { step: 'invalid' })
      })
      .catch(() => {
        if (active) setState({ step: 'invalid' })
      })
    return () => {
      active = false
    }
  }, [code])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const pairError = passwordPairError(password, String(data.get('confirmation') ?? ''))
    if (pairError) {
      setError(PASSWORD_PAIR_MESSAGES[pairError])
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { ok, status } = await postJson('/api/password-reset/confirm', { code, password })
      if (ok) {
        setState({ step: 'changed' })
        return
      }
      if (status === 410) {
        setState({ step: 'invalid' })
        return
      }
      setError(status === 400 ? WEAK_PASSWORD_MESSAGE : FAILED_MESSAGE)
    } catch {
      setError(FAILED_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  if (state.step === 'checking') return <AuthCard title="Verificando o link..." />

  if (state.step === 'invalid') {
    return (
      <AuthCard title="Link inválido ou expirado" description="Peça um novo link para redefinir a senha.">
        <Link href={FORGOT_PASSWORD_PATH} style={linkButtonStyle}>Pedir novo link</Link>
      </AuthCard>
    )
  }

  if (state.step === 'changed') {
    return (
      <AuthCard title="Senha alterada" description="Sua senha foi alterada. Entre com a nova senha.">
        <Link href={LOGIN_PATH} style={linkButtonStyle}>Entrar</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Escolher nova senha" description={`Conta: ${state.email}`}>
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <PasswordFields labels={{ password: 'Nova senha', confirmation: 'Confirmar nova senha' }} disabled={saving} />
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={saving} style={primaryButtonStyle(saving)}>
          {saving ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthCard>
  )
}
```

- [ ] **Step 5: Write the two pages**

```tsx
// app/(auth)/esqueci-senha/page.tsx
import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Esqueci minha senha | Caativar' }

/** Independent of the access switch: accounts made by hand forget passwords too. */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
```

```tsx
// app/(auth)/redefinir-senha/page.tsx
import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = { title: 'Nova senha | Caativar' }

interface ResetPasswordPageProps {
  searchParams: Promise<{ code?: string | string[] }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { code } = await searchParams
  return <ResetPasswordForm code={typeof code === 'string' ? code : ''} />
}
```

- [ ] **Step 6: Run the test, lint, and commit**

```bash
npx vitest run tests/components/passwordScreens.test.ts
npm run lint
git add components/auth/ForgotPasswordForm.tsx components/auth/ResetPasswordForm.tsx "app/(auth)/esqueci-senha" "app/(auth)/redefinir-senha" tests/components/passwordScreens.test.ts
git commit -m "feat: add the forgot and reset password screens"
```
Expected: PASS before committing.

---

### Task 17: Approvals page

**Files:**
- Create: `components/auth/ApprovalsTable.tsx`, `app/(auth)/aprovacoes/page.tsx`
- Modify: `lib/auth.ts` (`safeRedirect` list), `tests/lib/safeRedirect.test.ts`
- Test: `tests/components/approvalsTable.test.ts`

**Interfaces:**
- Consumes: `AuthCard`, `authColors`, `authStyles`, button styles (Task 9); `postJson` (Task 10); `isAccessAdmin` (Task 2); `APPROVALS_PATH` (Task 2); `listPendingAccessRequests` (Task 7); `getAuthenticatedSession`, `loginRedirect` (`lib/auth.ts`); `POST /api/signup/approve` (Task 13).
- Produces: `interface ApprovalRow { uid: string; email: string; intention: string; requestedAt: string }`, default `ApprovalsTable({ rows: ApprovalRow[] })`; `/aprovacoes` page; `safeRedirect('/aprovacoes') === '/aprovacoes'`.

- [ ] **Step 1: Write the failing tests**

Add to the first `it` of `tests/lib/safeRedirect.test.ts` ("keeps the app routes, with a path or a query after them"):

```ts
    expect(safeRedirect('/aprovacoes')).toBe('/aprovacoes')
```

and to "refuses anything that could leave the site", next to the `/relatoriofalso` line:

```ts
    expect(safeRedirect('/aprovacoesfalso')).toBe('/')
```

```ts
// tests/components/approvalsTable.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }))

import ApprovalsTable from '@/components/auth/ApprovalsTable'

describe('ApprovalsTable', () => {
  it('lists each request with its intention as text, its date and both decisions', () => {
    const markup = renderToStaticMarkup(createElement(ApprovalsTable, {
      rows: [{ uid: 'u1', email: 'fulana@gmail.com', intention: '<b>Pesquisa</b> sobre carbono', requestedAt: '15/10/2026' }],
    }))

    for (const column of ['E-mail', 'Intenção de uso', 'Pedido em', 'Decisão']) expect(markup).toContain(column)
    expect(markup).toContain('fulana@gmail.com')
    expect(markup).toContain('&lt;b&gt;Pesquisa&lt;/b&gt; sobre carbono')
    expect(markup).toContain('15/10/2026')
    expect(markup).toContain('Aprovar')
    expect(markup).toContain('Recusar')
  })

  it('says when nothing is waiting', () => {
    expect(renderToStaticMarkup(createElement(ApprovalsTable, { rows: [] }))).toContain('Nenhum pedido aguardando decisão.')
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/lib/safeRedirect.test.ts tests/components/approvalsTable.test.ts`
Expected: FAIL: `/aprovacoes` falls back to `/`; `@/components/auth/ApprovalsTable` does not resolve.

- [ ] **Step 3: Let `/aprovacoes` be a post-login destination**

In `lib/auth.ts`, `safeRedirect`, change the list to:

```ts
  for (const base of ['/mapa', '/relatorio', '/sobre', '/comunicacao', '/territorios', '/aprovacoes']) {
```

- [ ] **Step 4: Write `components/auth/ApprovalsTable.tsx`**

```tsx
'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { authColors, authStyles, primaryButtonStyle, secondaryButtonStyle } from '@/components/auth/AuthCard'
import { postJson } from '@/lib/access/clientFetch'

export interface ApprovalRow {
  uid: string
  email: string
  intention: string
  /** Formatted on the server, so the client never re-formats it in another time zone. */
  requestedAt: string
}

type Decision = 'approved' | 'rejected'
type RowState = 'idle' | 'working' | Decision | 'conflict' | 'failed'

const DECIDED_LABEL: Record<Decision, string> = { approved: 'Aprovado', rejected: 'Recusado' }

const cell: CSSProperties = { padding: '12px 14px', verticalAlign: 'top', textAlign: 'left', fontSize: 14, lineHeight: 1.45 }
const headerCell: CSSProperties = { ...cell, color: authColors.label, fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${authColors.border}` }

export default function ApprovalsTable({ rows }: { rows: ApprovalRow[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [states, setStates] = useState<Record<string, RowState>>({})

  const setRow = (uid: string, state: RowState) => setStates((current) => ({ ...current, [uid]: state }))

  async function decide(uid: string, decision: Decision) {
    setRow(uid, 'working')
    try {
      const { ok, status, body } = await postJson('/api/signup/approve', { uid, decision })
      if (ok) {
        setRow(uid, decision)
        // Reload the list: a request decided elsewhere would otherwise stay here as if waiting.
        startTransition(() => router.refresh())
        return
      }
      // A 409 carrying a status means someone decided first, which the admin needs to tell apart
      // from a failure.
      const decidedElsewhere = status === 409 && typeof body?.status === 'string'
      setRow(uid, decidedElsewhere ? 'conflict' : 'failed')
      if (decidedElsewhere) startTransition(() => router.refresh())
    } catch {
      setRow(uid, 'failed')
    }
  }

  if (rows.length === 0) return <p style={authStyles.status}>Nenhum pedido aguardando decisão.</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: authColors.ink }}>
        <thead>
          <tr>
            <th style={headerCell}>E-mail</th>
            <th style={headerCell}>Intenção de uso</th>
            <th style={{ ...headerCell, whiteSpace: 'nowrap' }}>Pedido em</th>
            <th style={{ ...headerCell, whiteSpace: 'nowrap' }}>Decisão</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const state = states[row.uid] ?? 'idle'
            const working = state === 'working'
            return (
              <tr key={row.uid} style={{ borderBottom: `1px solid ${authColors.border}` }}>
                <td style={cell}>{row.email}</td>
                {/* A stranger's text: React escapes it, and pre-wrap keeps its line breaks without interpreting anything. */}
                <td style={{ ...cell, color: authColors.muted, whiteSpace: 'pre-wrap' }}>{row.intention}</td>
                <td style={{ ...cell, whiteSpace: 'nowrap', color: authColors.muted }}>{row.requestedAt}</td>
                <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                  {state === 'approved' || state === 'rejected' ? (
                    <span style={{ fontWeight: 700 }}>{DECIDED_LABEL[state]}</span>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" disabled={working} onClick={() => void decide(row.uid, 'approved')} style={{ ...primaryButtonStyle(working), padding: '8px 12px' }}>
                          {working ? 'Salvando...' : 'Aprovar'}
                        </button>
                        <button type="button" disabled={working} onClick={() => void decide(row.uid, 'rejected')} style={{ ...secondaryButtonStyle(working), padding: '7px 12px', color: authColors.error, borderColor: authColors.error }}>
                          Recusar
                        </button>
                      </div>
                      {state === 'conflict' && <p role="alert" style={authStyles.error}>Outra pessoa decidiu este pedido antes de você.</p>}
                      {state === 'failed' && <p role="alert" style={authStyles.error}>Não foi possível salvar a decisão.</p>}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Write `app/(auth)/aprovacoes/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import AuthCard, { authStyles } from '@/components/auth/AuthCard'
import ApprovalsTable, { type ApprovalRow } from '@/components/auth/ApprovalsTable'
import { getAuthenticatedSession, loginRedirect } from '@/lib/auth'
import { isAccessAdmin } from '@/lib/access/admins'
import { APPROVALS_PATH } from '@/lib/access/paths'
import { listPendingAccessRequests } from '@/lib/access/requests'

export const metadata: Metadata = { title: 'Pedidos de acesso | Caativar' }

// The Caatinga's time zone, so the date reads as the team lives it whatever the server's zone.
const requestedAtFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Fortaleza' })

/**
 * Where admins decide access requests. Showing a row never authorizes anything: the approve route
 * checks the admin list again.
 */
export default async function ApprovalsPage() {
  const session = await getAuthenticatedSession()
  // An admin arriving from the team email while logged out comes back here after the login.
  if (!session) redirect(loginRedirect(APPROVALS_PATH))
  // Not 403: a signed-in non-admin is not told the page exists.
  if (!isAccessAdmin(session.email)) notFound()

  // The query needs Firestore's composite index (firestore.indexes.json); without it the page shows
  // an alert instead of breaking, so the admin knows something needs fixing.
  let rows: ApprovalRow[] | null = null
  try {
    rows = (await listPendingAccessRequests()).map((request) => ({
      uid: request.uid,
      email: request.email,
      intention: request.intention,
      requestedAt: requestedAtFormat.format(new Date(request.createdAt)),
    }))
  } catch (error) {
    console.error('[/aprovacoes] could not list the access requests:', error)
  }

  return (
    <AuthCard title="Pedidos de acesso" description="Cadastros que confirmaram o e-mail e aguardam liberação." width={960}>
      {rows ? (
        <ApprovalsTable rows={rows} />
      ) : (
        <p role="alert" style={authStyles.error}>Não foi possível carregar os pedidos. Avise a equipe técnica: pode faltar o índice do Firestore.</p>
      )}
      {/* Another route group: a full page load, so a plain anchor. */}
      <p style={authStyles.footer}>
        <a href="/" style={authStyles.link}>Voltar para a plataforma</a>
      </p>
    </AuthCard>
  )
}
```

- [ ] **Step 6: Run the tests, lint, and commit**

```bash
npx vitest run tests/lib/safeRedirect.test.ts tests/components/approvalsTable.test.ts
npm run lint
git add lib/auth.ts tests/lib/safeRedirect.test.ts components/auth/ApprovalsTable.tsx "app/(auth)/aprovacoes" tests/components/approvalsTable.test.ts
git commit -m "feat: add the approvals page"
```
Expected: PASS before committing.

---

### Task 18: Firestore deploy files and the backfill script

**Files:**
- Create: `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `scripts/backfill-access-claims.mjs`
- Test: `tests/scripts/backfillAccessClaims.test.ts`

**Interfaces:**
- Consumes: `ACCESS_CLAIM_NAMESPACE`, `APPROVED_ACCESS`, `readAccessClaim` (Task 3, only in the test); `createFakeFirestore` (Task 7).
- Produces: script exports `ACCESS_CLAIM_NAMESPACE`, `APPROVED_ACCESS`, `buildBackfillClaims(existingClaims, atSeconds)`, `shouldBackfillUser(user, signupUids?)`, `backfillUser(auth, user, atSeconds)`, `listSignupUids(db, collections)`; CLI `node scripts/backfill-access-claims.mjs [--apply]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/scripts/backfillAccessClaims.test.ts
import { describe, expect, it, vi } from 'vitest'
import {
  ACCESS_CLAIM_NAMESPACE as SCRIPT_NAMESPACE,
  APPROVED_ACCESS as SCRIPT_APPROVED,
  backfillUser,
  buildBackfillClaims,
  listSignupUids,
  shouldBackfillUser,
} from '@/scripts/backfill-access-claims.mjs'
import { ACCESS_CLAIM_NAMESPACE, APPROVED_ACCESS, readAccessClaim } from '@/lib/access/claims'
import { createFakeFirestore } from '@/tests/helpers/fakeFirestore'

describe('the backfill script', () => {
  it('writes the claim the gate reads', () => {
    expect(SCRIPT_NAMESPACE).toBe(ACCESS_CLAIM_NAMESPACE)
    expect(SCRIPT_APPROVED).toBe(APPROVED_ACCESS)
    expect(readAccessClaim(buildBackfillClaims({}, 42))).toEqual({ access: 'approved', tier: 'legacy', at: 42 })
  })

  it("keeps the account's other claims", () => {
    expect(buildBackfillClaims({ role: 'editor' }, 42)).toEqual({
      role: 'editor',
      caativar: { access: 'approved', tier: 'legacy', at: 42 },
    })
  })

  it('grants accounts without a valid claim, and skips valid claims and signup accounts', () => {
    expect(shouldBackfillUser({ uid: 'a' })).toBe(true)
    expect(shouldBackfillUser({ uid: 'b', customClaims: { caativar: { access: 'pending' } } })).toBe(true)
    expect(shouldBackfillUser({ uid: 'c', customClaims: { caativar: { access: 'approved', tier: 'admin' } } })).toBe(true)
    expect(shouldBackfillUser({ uid: 'd', customClaims: { caativar: { access: 'approved', tier: 'common', at: 1 } } })).toBe(false)
    expect(shouldBackfillUser({ uid: 'e' }, new Set(['e']))).toBe(false)
  })

  it('sets the claim before revoking the tokens', async () => {
    const auth = { setCustomUserClaims: vi.fn(async () => undefined), revokeRefreshTokens: vi.fn(async () => undefined) }

    await backfillUser(auth, { uid: 'a', customClaims: undefined }, 42)

    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('a', { caativar: { access: 'approved', tier: 'legacy', at: 42 } })
    expect(auth.setCustomUserClaims.mock.invocationCallOrder[0]).toBeLessThan(auth.revokeRefreshTokens.mock.invocationCallOrder[0])
  })

  it('gathers signup accounts from every collection', async () => {
    const { db, store } = createFakeFirestore()
    store('access-requests').set('u1', {})
    store('access-requests-local').set('u2', {})

    expect(await listSignupUids(db, ['access-requests', 'access-requests-local', 'other'])).toEqual(new Set(['u1', 'u2']))
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/scripts/backfillAccessClaims.test.ts`
Expected: FAIL: `@/scripts/backfill-access-claims.mjs` does not resolve.

- [ ] **Step 3: Write `scripts/backfill-access-claims.mjs`**

```js
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
 * Idempotent: accounts with a valid claim are skipped. Accounts with a signup request are skipped
 * too: the decision on them belongs to the approvals page, and running this after signup opens
 * would otherwise approve every pending and rejected request at once. Needs Firestore enabled.
 */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Mirrors lib/access/claims.ts; tests/scripts/backfillAccessClaims.test.ts fails if they drift. A
// backfill writing a claim the gate does not recognize would lock everyone out.
export const ACCESS_CLAIM_NAMESPACE = 'caativar'
export const APPROVED_ACCESS = 'approved'
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

export function shouldBackfillUser(user, signupUids = new Set()) {
  if (signupUids.has(user?.uid)) return false

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
      if (signupUids.has(user.uid)) {
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
```

- [ ] **Step 4: Write the Firestore deploy files**

```
// firestore.rules
rules_version = '2';

// Caativar reaches Firestore only from the server, through the Admin SDK, which ignores these
// rules by definition. No browser needs access, so nobody has it. Without this file the database
// keeps whatever the console created it with, such as test mode's "open until a date", which
// closes by expiry rather than by decision.
//
// Publish: firebase deploy --only firestore --project plataforma-carbono
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

```json
{
  "indexes": [
    {
      "collectionGroup": "access-requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "access-requests-local",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```
(that is `firestore.indexes.json`; `docs/signup.md` explains why it exists, since JSON holds no comments)

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```
(that is `firebase.json`)

- [ ] **Step 5: Run the test, check the script parses, lint, and commit**

```bash
npx vitest run tests/scripts/backfillAccessClaims.test.ts
node --check scripts/backfill-access-claims.mjs
npm run lint
git add scripts/backfill-access-claims.mjs firestore.rules firestore.indexes.json firebase.json tests/scripts/backfillAccessClaims.test.ts
git commit -m "feat: add the access claim backfill and the Firestore deploy files"
```
Expected: PASS and no output from `node --check`. Do **not** run the script itself here: it is rollout step 2, the user's call (Task 20).

---

### Task 19: Configuration and documentation

**Files:**
- Modify: `.env.example`, `.github/workflows/deploy-beta.yml`, `.github/workflows/deploy-prod.yml`, `README.md`, `CLAUDE.md`
- Create: `docs/signup.md`

No new tests: this task is configuration and prose. It ends with the full verification.

- [ ] **Step 1: Add the variables to `.env.example`**

Append at the end of the file. Its comments are Portuguese without accents; match them.

```
# Cadastro e bloqueio de acesso (docs/signup.md). Todas exclusivas do servidor:
# nunca use o prefixo NEXT_PUBLIC_.
#
# Interruptor do bloqueio de acesso; tambem abre o cadastro. Ligue somente
# depois de rodar scripts/backfill-access-claims.mjs: antes disso, toda conta
# existente fica de fora.
PLATFORM_ACCESS_GUARD_ENABLED=false
# Dominios liberados sem aprovacao, separados por virgula (ex.: ufcg.edu.br).
# Vazio manda todo cadastro para a aprovacao.
SIGNUP_ALLOWED_DOMAINS=
# E-mails de quem decide os pedidos em /aprovacoes, separados por virgula.
ACCESS_ADMIN_EMAILS=
# Caixa compartilhada da equipe que recebe os pedidos novos.
OCA_NOTIFICATION_EMAIL=
# Conta de envio: SMTP do Gmail com senha de app. Sem ela os e-mails nao saem
# e o log registra; MAIL_LOG_BODY=true imprime o corpo, so em desenvolvimento
# (o link e uma credencial).
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
# MAIL_LOG_BODY=true
# Endereco publico do ambiente, para os links dos e-mails. Ausente em
# desenvolvimento, usa http://localhost:3000.
# APP_BASE_URL=
# Colecao do Firestore com os pedidos. Beta e producao usam access-requests;
# o padrao, access-requests-local, mantem os testes locais fora dela.
# FIREBASE_ACCESS_REQUESTS_COLLECTION=access-requests-local
# Envia o aviso de recusa a quem foi recusado.
# SIGNUP_SEND_REJECTION_EMAIL=false
```

- [ ] **Step 2: Pass the variables to both containers**

In `.github/workflows/deploy-beta.yml`, in the `docker run` of "Run new container", insert after the `-e CONTENTFUL_PREVIEW_TOKEN=…` line:

```
            -e PLATFORM_ACCESS_GUARD_ENABLED="${{ vars.PLATFORM_ACCESS_GUARD_ENABLED_BETA }}" \
            -e APP_BASE_URL="${{ vars.APP_BASE_URL_BETA }}" \
            -e SIGNUP_ALLOWED_DOMAINS="${{ vars.SIGNUP_ALLOWED_DOMAINS }}" \
            -e ACCESS_ADMIN_EMAILS="${{ vars.ACCESS_ADMIN_EMAILS }}" \
            -e OCA_NOTIFICATION_EMAIL="${{ vars.OCA_NOTIFICATION_EMAIL }}" \
            -e SMTP_USER="${{ vars.SMTP_USER }}" \
            -e SMTP_FROM="${{ vars.SMTP_FROM }}" \
            -e SMTP_PASSWORD="${{ secrets.SMTP_PASSWORD }}" \
            -e SIGNUP_SEND_REJECTION_EMAIL="${{ vars.SIGNUP_SEND_REJECTION_EMAIL }}" \
            -e FIREBASE_ACCESS_REQUESTS_COLLECTION=access-requests \
```

In `.github/workflows/deploy-prod.yml`, insert after the `-e CONTENTFUL_ACCESS_TOKEN=…` line the same block with the two unsuffixed variables:

```
            -e PLATFORM_ACCESS_GUARD_ENABLED="${{ vars.PLATFORM_ACCESS_GUARD_ENABLED }}" \
            -e APP_BASE_URL="${{ vars.APP_BASE_URL }}" \
            -e SIGNUP_ALLOWED_DOMAINS="${{ vars.SIGNUP_ALLOWED_DOMAINS }}" \
            -e ACCESS_ADMIN_EMAILS="${{ vars.ACCESS_ADMIN_EMAILS }}" \
            -e OCA_NOTIFICATION_EMAIL="${{ vars.OCA_NOTIFICATION_EMAIL }}" \
            -e SMTP_USER="${{ vars.SMTP_USER }}" \
            -e SMTP_FROM="${{ vars.SMTP_FROM }}" \
            -e SMTP_PASSWORD="${{ secrets.SMTP_PASSWORD }}" \
            -e SIGNUP_SEND_REJECTION_EMAIL="${{ vars.SIGNUP_SEND_REJECTION_EMAIL }}" \
            -e FIREBASE_ACCESS_REQUESTS_COLLECTION=access-requests \
```

An unset `vars.X` becomes an empty string, so the switch stays off until the variable is created with `true`.

- [ ] **Step 3: List them in the README's GitHub Actions table**

In `README.md`, append these rows to the table under "Configure estes valores em **Settings -> Secrets and variables -> Actions**":

```
| Variable | `PLATFORM_ACCESS_GUARD_ENABLED_BETA` / `PLATFORM_ACCESS_GUARD_ENABLED` | Liga o bloqueio de acesso e o cadastro no beta / na produção; só depois do backfill (`docs/signup.md`) |
| Variable | `APP_BASE_URL_BETA` / `APP_BASE_URL` | Endereço público do beta / da produção, usado nos links dos e-mails |
| Variable | `SIGNUP_ALLOWED_DOMAINS` | Domínios de e-mail liberados sem aprovação, separados por vírgula |
| Variable | `ACCESS_ADMIN_EMAILS` | E-mails de quem decide os pedidos em `/aprovacoes` |
| Variable | `OCA_NOTIFICATION_EMAIL` | Caixa da equipe que recebe os pedidos novos |
| Variable | `SMTP_USER` / `SMTP_FROM` | Conta do Gmail que envia os e-mails do cadastro |
| Secret | `SMTP_PASSWORD` | Senha de app dessa conta |
| Variable | `SIGNUP_SEND_REJECTION_EMAIL` | `true` para avisar por e-mail quem foi recusado |
```

- [ ] **Step 4: Update CLAUDE.md's Authentication section**

Replace the section's paragraph with:

```markdown
Everything requires a Firebase session; the public pages are `/login` and the access flow in `app/(auth)/` (`/cadastro`, `/cadastro/confirmacao`, `/aguardando-liberacao`, `/esqueci-senha`, `/redefinir-senha`). The flow: the client authenticates against Firebase (`lib/firebase.ts`) → `POST /api/session` exchanges the idToken for a 24 h HttpOnly `session` cookie (`lib/auth.ts`, `lib/firebase-admin.ts`) → server-rendered pages and every API route verify that cookie before doing any work. When adding an API route, call `getAuthenticatedRequest(req)` and return `unauthorizedResponse()` first. `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` are server-only; never prefix them with `NEXT_PUBLIC_`.

**Access gate and signup** (`docs/signup.md`). With `PLATFORM_ACCESS_GUARD_ENABLED=true`, a session needs the `caativar` custom claim on the account (`lib/access/claims.ts`): `createSessionCookie` refuses to mint a cookie without it and `verifySessionCookie` drops a cookie that lacks it, so every layout and route inherits the gate. `approveAccess` is the only writer of the claim; Firestore's `access-requests` collection is the audit record and never authorizes. The switch also opens signup (the signup routes answer 404 while it is off), and turning it on before `scripts/backfill-access-claims.mjs` locks every existing account out. Signup creates the account without a password; whoever reads the mailbox chooses it on the confirmation page. Admins (`ACCESS_ADMIN_EMAILS`) decide requests at `/aprovacoes`. Email goes through `lib/mailer.ts`, and nothing may log a confirmation or reset code.
```

- [ ] **Step 5: Write `docs/signup.md`**

````markdown
# Signup and access

People request access themselves. Whoever has an email on a domain in `SIGNUP_ALLOWED_DOMAINS` gets in as soon as they confirm the address; everyone else describes how they intend to use the platform and waits for an admin. Design: `docs/superpowers/specs/2026-10-15-user-signup-design.md`.

This document exists because the feature **depends on manual steps outside the code**, one of which is the only defense against accounts created straight from the browser.

## The flow

```
/cadastro (email + intention) → POST /api/signup → account without a password + request + email
  → link → /cadastro/confirmacao → check the code (spends nothing) → choose a password
  → POST /api/signup/confirm → password set → code applied → settle
       ├── listed domain → claim granted → "Acesso liberado"
       └── any other     → pending + email to the team → /aprovacoes → decision email
```

Login of a correct password without access: `access_pending` sends the person to `/aguardando-liberacao`; `email_unconfirmed` offers a new link; `access_granted` (the claim was granted during this login) makes the client sign in once more, since the first ID token predates the claim.

## Where access lives

- **The custom claim** `caativar: { access: 'approved', tier, at }` on the Firebase account **authorizes**. It travels inside the session cookie and is read on every request without a database read. `lib/access/claims.ts` `approveAccess` is the only writer.
- **The Firestore collection** `access-requests` **audits**: who asked, what they wrote, who decided and when.

Do not invert them: authorizing from Firestore would add a database read to every request.

## Firebase console steps

| # | Where | What | Why |
|---|---|---|---|
| 1 | Authentication → Settings → User actions | **Turn off "Enable create (sign-up)"** | The API key is public. With client sign-up on, anyone creates an account straight through Google's API, skipping our form and the domain rule. Our signup uses the Admin SDK, which this setting does not block. Sign-in keeps working. |
| 2 | Authentication → Settings → Password policy | Require enforcement, minimum 8 | In "Notify" mode Firebase only warns and accepts the password anyway. |
| 3 | Firestore | Create the `(default)` database, Native mode, `southamerica-east1` | The region cannot be changed later. |
| 4 | Firestore → Rules and Indexes | Publish `firestore.rules` and `firestore.indexes.json` | The rules close the database to browsers. The approvals page filters by `status` and orders by `createdAt`, which needs the composite index; without it the query fails with `FAILED_PRECONDITION` and the page shows an alert. |

Steps 3–4 can go through `firebase deploy --only firestore --project plataforma-carbono` with an account that is a member of the project.

Our own pages handle the confirmation and reset links, so the beta and production domains do not need to be in Authentication → Settings → Authorized domains.

## Rollout order

**This order cannot be inverted**; out of order, every current user loses access.

1. Console steps above.
2. **Deploy with the switch off** (`PLATFORM_ACCESS_GUARD_ENABLED_BETA` / `PLATFORM_ACCESS_GUARD_ENABLED` unset or `false`). Nothing visible changes; the signup pages and routes answer 404.
3. **Backfill:** `node scripts/backfill-access-claims.mjs` (dry run), then `--apply`. It grants `legacy` to every account without a valid claim, skips accounts with a signup request, and signs each granted account out so its next login carries the claim. Idempotent.
4. **Turn the switch on, beta first**, walk the flow there, then production. Beta and production share the Firebase accounts, so the claims are already valid on both.

## The sending account

The emails go out through Gmail's SMTP with an **app password**, not the account password; creating one needs two-step verification, and some institutional domains forbid app passwords. Gmail only accepts the authenticated account or a verified alias as the sender, so `SMTP_FROM` must be one of those. A regular Gmail account sends to about 500 recipients a day; each signup produces up to three emails.

Without credentials nothing is sent and the log says so: an `error` in production, an `info` in development.

## Testing locally

```bash
PLATFORM_ACCESS_GUARD_ENABLED=true SIGNUP_ALLOWED_DOMAINS=example.com \
ACCESS_ADMIN_EMAILS=signup-test-allowed@example.com MAIL_LOG_BODY=true npm run dev
```

`MAIL_LOG_BODY=true` prints each email's text, links included, to the dev server's log: copy the confirmation link from there. **Never set it outside your machine: the link is a credential.** Local development uses the same Firebase project as beta and production, so test signups create real accounts: delete them afterwards (their requests sit in `access-requests-local`).

## Variables

| Variable | Purpose |
|---|---|
| `PLATFORM_ACCESS_GUARD_ENABLED` | The switch. Beta reads `PLATFORM_ACCESS_GUARD_ENABLED_BETA`. |
| `SIGNUP_ALLOWED_DOMAINS` | Domains approved on confirmation; exact match. Empty sends everyone to approval. |
| `ACCESS_ADMIN_EMAILS` | Who can open `/aprovacoes`. |
| `OCA_NOTIFICATION_EMAIL` | The team's shared mailbox for new requests. |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | The sending account. |
| `APP_BASE_URL` | Origin of links in emails, also trusted by the origin check. Beta reads `APP_BASE_URL_BETA`. |
| `FIREBASE_ACCESS_REQUESTS_COLLECTION` | `access-requests` on beta and production; defaults to `access-requests-local`. |
| `SIGNUP_SEND_REJECTION_EMAIL` | `true` emails rejected applicants. Off until the team decides. |
| `MAIL_LOG_BODY` | Development only. |

## Open points

- No captcha yet; only per-IP limits.
- No way in the product to remove someone's access: only the Firebase console (remove the claim, or disable the account).
- Someone can still sign up with another person's address; the owner gets an email they can ignore, and if they confirm, the account and its password are theirs, with an intention text the owner did not write.
````

- [ ] **Step 6: Verify everything**

Run: `npm test && npm run lint && npm run build`
Expected: all tests PASS, lint clean, build succeeds (the build type-checks the tests too).

- [ ] **Step 7: Commit**

```bash
git add .env.example .github/workflows/deploy-beta.yml .github/workflows/deploy-prod.yml README.md CLAUDE.md docs/signup.md
git commit -m "docs: document the signup rollout and wire its variables into the deploys"
```

---

### Task 20: End-to-end check in the running app

Tests mock Firebase; this walks the real flow once against `plataforma-carbono`. **Ask the user before starting**, and confirm two prerequisites only they can provide:

1. Firestore exists in `plataforma-carbono` with `firestore.rules` and `firestore.indexes.json` published (console steps 3–4 of `docs/signup.md`; the index takes a few minutes to build).
2. They agree to two throwaway accounts (`signup-test-allowed@example.com`, `signup-test-common@example.org`) being created in the shared project and deleted at the end.

Nothing here touches the two existing accounts or runs the backfill.

- [ ] **Step 1: Start the dev server with the switch on**

Run (in the background, keeping its pid):
```bash
PLATFORM_ACCESS_GUARD_ENABLED=true SIGNUP_ALLOWED_DOMAINS=example.com \
ACCESS_ADMIN_EMAILS=signup-test-allowed@example.com MAIL_LOG_BODY=true \
PORT=3123 npm run dev > "$SCRATCH/dev.log" 2>&1 &
echo $! > "$SCRATCH/dev.pid"
```
Expected: `$SCRATCH/dev.log` shows "Ready". Shell variables win over `.env.local`. Stop it later by pid, never with `pkill -f`.

- [ ] **Step 2: Walk the flow in a browser at `http://localhost:3123`**

Use the claude-in-chrome tools (or headless Chrome if the extension is off). Check each item:

- `/login` shows "Entre com seu e-mail e senha.", "Esqueci minha senha" and "Não tem conta? Criar conta".
- `/cadastro` as `signup-test-allowed@example.com` with an intention → "Confirme seu e-mail". `dev.log` prints the confirmation email with a `/cadastro/confirmacao?code=…&email=…` link.
- Open the link → "Escolha sua senha", "Conta: signup-test-allowed@example.com". A mismatched pair shows "As senhas não são iguais.". A valid pair → "Acesso liberado".
- Open the same link again → "Link inválido ou expirado".
- Log in with that account → the map loads. Sign out.
- `/cadastro` as `signup-test-common@example.org` → link from the log → choose a password → "E-mail confirmado". `dev.log` shows "[mailer] no SMTP credentials" for the team email only if `OCA_NOTIFICATION_EMAIL` is set; otherwise the "OCA_NOTIFICATION_EMAIL is not set" error line.
- Log in as the common account → `/aguardando-liberacao`, "Cadastro em análise".
- Log in as the allowed account (the admin) → open `/aprovacoes` → the common request is listed with its intention and date → "Aprovar" → "Aprovado". `dev.log` prints the "Seu acesso à Caativar foi liberado" email. Sign out.
- Log in as the common account → the map loads. Sign out.
- `/esqueci-senha` with the common account → "Se houver uma conta…". Reset link from the log → "Escolher nova senha" → new password → "Senha alterada" → log in with the new password works.
- Log out, open `/aprovacoes` → redirected to `/login?redirect=%2Faprovacoes`.

- [ ] **Step 3: Restart without the switch and check it closes**

Stop the server (`kill "$(cat "$SCRATCH/dev.pid")"`), start it again without `PLATFORM_ACCESS_GUARD_ENABLED`, and check: `/cadastro` and `/cadastro/confirmacao` answer 404; `/login` shows the old subtitle and no "Criar conta"; `/esqueci-senha` still renders. Stop the server by pid.

- [ ] **Step 4: Delete the test accounts and their requests**

```js
// $SCRATCH/cleanup-signup-tests.mjs — run from the repo root
import { createRequire } from 'node:module'

const root = process.cwd()
const require = createRequire(`${root}/package.json`)
require('@next/env').loadEnvConfig(root, true, { info() {}, error: console.error })
const { cert, initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

const privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
  ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
  : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const app = initializeApp({ credential: cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }) })

for (const email of ['signup-test-allowed@example.com', 'signup-test-common@example.org']) {
  try {
    const { uid } = await getAuth(app).getUserByEmail(email)
    await getFirestore(app).collection('access-requests-local').doc(uid).delete()
    await getAuth(app).deleteUser(uid)
    console.log('deleted', email)
  } catch (error) {
    console.log('skipped', email, error.code ?? error.message)
  }
}
```

Run: `node "$SCRATCH/cleanup-signup-tests.mjs"`
Expected: `deleted` for both addresses.

- [ ] **Step 5: Report**

Tell the user what passed, with anything that did not, and the rollout steps that remain theirs (`docs/signup.md`): the console toggles, the sending account and its app password, the GitHub variables, the backfill, and turning the switch on, beta first.

---

## Self-Review Notes

- **Spec coverage:** §4 (Tasks 3, 10), §5.1 (11), §5.2 (12, 15), §5.3 (8), §5.4 (10), §5.5 (13), §5.6 (14, 16), §6 (9, 10, 15–17), §7 (7, 18), §8 (4, 11–14), §9 (5), §10–§11 (19, 20), §12 (all), §13 (every task's tests + 20), §15 (Task 1 probe, 12, 15).
- **Deviation from the spec's literal wording:** the confirmation page has no separate `saving`/`failed` steps; a failure is an inline error in the password step, which keeps the retry on the same card.
