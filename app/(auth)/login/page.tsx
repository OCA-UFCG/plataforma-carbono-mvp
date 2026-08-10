import { redirect } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import { getAuthenticatedSession } from '@/lib/auth'

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>
}

function getRedirect(value: string | string[] | undefined) {
  return typeof value === 'string' && (value === '/' || value === '/mapa' || value.startsWith('/mapa/'))
    ? value
    : '/'
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const redirectTo = getRedirect((await searchParams).redirect)
  if (await getAuthenticatedSession()) redirect(redirectTo)

  return <LoginForm redirectTo={redirectTo} />
}
