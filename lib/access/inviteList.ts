import { normalizeEmail } from '@/lib/access/emailAddress'

/**
 * What the invite form and POST /api/signup/invite share. No server-only import: the form runs in
 * the browser.
 */

/**
 * Addresses per request. The route handles them one after another, each with its own SMTP login,
 * and must answer before the reverse proxy gives up (nginx's 60 s by default): ten stay near 35 s.
 */
export const MAX_INVITES = 10

export type InviteOutcome =
  | 'invited'
  | 'approved'
  | 'already-active'
  | 'disabled'
  | 'invalid'
  | 'unsent'
  | 'failed'

export interface InviteResult {
  email: string
  outcome: InviteOutcome
}

export const INVITE_OUTCOME_LABEL: Record<InviteOutcome, string> = {
  invited: 'Convite enviado',
  approved: 'Já tinha cadastro: acesso liberado',
  'already-active': 'Já tem acesso',
  disabled: 'Conta desativada. Reative pelo console do Firebase.',
  invalid: 'E-mail inválido',
  unsent: 'Conta criada, mas o e-mail não saiu. Convide de novo.',
  failed: 'Não foi possível convidar.',
}

/** Outcomes a new attempt could change: fixing a typo, or sending again what did not go out. */
const RETRYABLE: ReadonlySet<InviteOutcome> = new Set(['invalid', 'unsent', 'failed'])

export function isInviteOutcome(value: unknown): value is InviteOutcome {
  return typeof value === 'string' && Object.hasOwn(INVITE_OUTCOME_LABEL, value)
}

export function isRetryable(outcome: InviteOutcome): boolean {
  return RETRYABLE.has(outcome)
}

/** The route's per-address results, or null when the body is not what the route sends. */
export function readInviteResults(body: Record<string, unknown> | null): InviteResult[] | null {
  const list: unknown = body?.results
  if (!Array.isArray(list)) return null
  const results: InviteResult[] = []
  for (const entry of list as unknown[]) {
    const { email, outcome } = (entry ?? {}) as Record<string, unknown>
    if (typeof email !== 'string' || !isInviteOutcome(outcome)) return null
    results.push({ email, outcome })
  }
  return results
}

/**
 * The addresses typed or pasted into the form, normalized, without repeats, in their order. One per
 * line is what the label asks for, but pasted lists come with commas, semicolons or spaces too.
 */
export function parseInviteList(text: string): string[] {
  const seen = new Set<string>()
  for (const entry of text.split(/[\s,;]+/)) {
    const email = normalizeEmail(entry)
    if (email) seen.add(email)
  }
  return [...seen]
}

/** What the textarea keeps after a submission: only the addresses worth another try. */
export function addressesToRetry(results: readonly InviteResult[]): string[] {
  return results.filter((result) => isRetryable(result.outcome)).map((result) => result.email)
}
