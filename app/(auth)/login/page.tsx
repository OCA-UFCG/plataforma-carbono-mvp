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
