import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import SignupForm from '@/components/auth/SignupForm'
import { getAuthenticatedSession } from '@/lib/auth'
import { isSignupOpen } from '@/lib/access/flag'

export const metadata: Metadata = { title: 'Criar conta | Caativar' }

// The switch is read per request. At build time it is unset, and the page would be
// prerendered as a 404.
export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  // The same rule as the signup routes: while signup is closed the form does not exist, rather
  // than only losing its link on the login card.
  if (!isSignupOpen()) notFound()
  // Already signed in: the platform, where the login would have landed too (safeRedirect).
  if (await getAuthenticatedSession()) redirect('/mapa')

  return <SignupForm />
}
