'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import AuthCard, { authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'

function loginErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  return 'E-mail ou senha inválidos.'
}

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const { signIn } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    if (!email || !password) return

    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
      router.replace(redirectTo)
      router.refresh()
    } catch (cause) {
      setError(loginErrorMessage(cause))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Acesse a plataforma de carbono" description="Entre com as credenciais fornecidas pela equipe da plataforma.">
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
        <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthCard>
  )
}
