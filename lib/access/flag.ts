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
 * Signup is open exactly when the gate is on. With the gate off a session checks no access claim;
 * the accounts signup creates carry a `requested` marker that lib/auth.ts refuses whatever the
 * switch says, and tying signup to the switch keeps a switch-off environment exactly as it was
 * before signup existed.
 */
export function isSignupOpen(): boolean {
  return isAccessGuardEnabled()
}
