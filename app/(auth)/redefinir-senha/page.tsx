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
