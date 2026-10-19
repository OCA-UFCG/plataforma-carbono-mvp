import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Esqueci minha senha | Caativar' }

/** Independent of the access switch: accounts made by hand forget passwords too. */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
