/**
 * POST /api/signup — opens an account and its access request (docs/signup.md).
 *
 * The account is created through the Admin SDK, never the browser: client sign-up is turned off in
 * the Firebase console, so the public API key cannot create accounts that skip this route.
 */

import { getFirebaseAdminAuth } from '@/lib/firebase-admin'
import { buildRequestedClaims } from '@/lib/access/claims'
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

/**
 * An orphan account is worse than none: the person would get "accepted" forever and never an
 * email, and only a hand deletion would free the address.
 */
async function deleteOrphan(uid: string) {
  await getFirebaseAdminAuth().deleteUser(uid).catch((undoError: unknown) => {
    console.error('[/api/signup] could not delete the orphan account; remove it by hand:', undoError)
  })
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
    // The marker keeps the account out of every environment until access is granted, the ones with
    // the switch off included (lib/auth.ts). An account that cannot carry it is not kept.
    await auth.setCustomUserClaims(uid, buildRequestedClaims())
  } catch (error) {
    console.error('[/api/signup] could not mark the account as a signup:', error instanceof Error ? error.message : 'unknown error')
    await deleteOrphan(uid)
    return serverError()
  }

  try {
    await createAccessRequest(uid, { email, tier, intention })
  } catch (error) {
    console.error('[/api/signup] could not record the access request:', error)
    await deleteOrphan(uid)
    return serverError()
  }

  // The request is recorded, and a mail failure does not undo it: resend exists for that. It must
  // not pass silently either, or a broken mailer in production would go unnoticed.
  if (!(await sendVerificationEmail(email))) {
    console.error(`[/api/signup] signup recorded without a delivered confirmation email (${email}).`)
  }
  return accepted()
}
