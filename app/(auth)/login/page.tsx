import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import { getAuthenticatedSession, safeRedirect } from '@/lib/auth'

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const redirectTo = safeRedirect((await searchParams).redirect)
  if (await getAuthenticatedSession()) redirect(redirectTo)

  return <LoginForm redirectTo={redirectTo} />
}
