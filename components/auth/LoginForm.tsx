'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import AuthCard, { authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'
import ResendConfirmation from '@/components/auth/ResendConfirmation'
import { loginErrorMessage } from '@/lib/access/loginErrors'
import { FORGOT_PASSWORD_PATH, PENDING_APPROVAL_PATH, SIGNUP_PATH } from '@/lib/access/paths'

export default function LoginForm({ redirectTo, signupOpen }: { redirectTo: string; signupOpen: boolean }) {
  const router = useRouter()
  const { signIn } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    if (!email || !password) return

    setSubmitting(true)
    setError(null)
    setUnconfirmedEmail(null)
    try {
      const outcome = await signIn(email, password)
      if (outcome === 'ok') {
        router.replace(redirectTo)
        router.refresh()
        return
      }
      if (outcome === 'pending') {
        router.replace(PENDING_APPROVAL_PATH)
        return
      }
      setUnconfirmedEmail(email)
      setSubmitting(false)
    } catch (cause) {
      setError(loginErrorMessage(cause))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Acesse a plataforma de carbono"
      description={signupOpen ? 'Entre com seu e-mail e senha.' : 'Entre com as credenciais fornecidas pela equipe da plataforma.'}
    >
      <form onSubmit={handleSubmit} style={authStyles.form}>
        <label style={authStyles.label}>
          E-mail
          <input name="email" type="email" autoComplete="username" required disabled={submitting} style={authStyles.input} />
        </label>
        <label style={authStyles.label}>
          Senha
          <input name="password" type="password" autoComplete="current-password" required disabled={submitting} style={authStyles.input} />
        </label>
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        {unconfirmedEmail && (
          <div style={{ display: 'grid', gap: 10 }}>
            <p role="alert" style={authStyles.error}>Confirme seu e-mail antes de entrar. Enviamos o link para o endereço do cadastro.</p>
            <ResendConfirmation email={unconfirmedEmail} />
          </div>
        )}
        <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p style={authStyles.footer}>
        <Link href={FORGOT_PASSWORD_PATH} style={authStyles.link}>Esqueci minha senha</Link>
      </p>
      {signupOpen && (
        <p style={{ ...authStyles.footer, margin: '10px 0 0' }}>
          Não tem conta? <Link href={SIGNUP_PATH} style={authStyles.link}>Criar conta</Link>
        </p>
      )}
    </AuthCard>
  )
}
