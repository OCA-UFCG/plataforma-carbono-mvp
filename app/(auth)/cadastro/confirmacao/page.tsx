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
