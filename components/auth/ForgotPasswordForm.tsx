'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import AuthCard, { authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'
import { postJson } from '@/lib/access/clientFetch'
import { isWellFormedEmail, normalizeEmail } from '@/lib/access/emailAddress'
import { LOGIN_PATH } from '@/lib/access/paths'

const SEND_FAILED = 'Não foi possível enviar o link. Tente novamente.'

export default function ForgotPasswordForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = normalizeEmail(new FormData(event.currentTarget).get('email'))
    if (!isWellFormedEmail(email)) {
      setError(email ? 'Informe um e-mail válido.' : 'Informe o e-mail.')
      return
    }

    setState('sending')
    setError(null)
    try {
      const { ok, status } = await postJson('/api/password-reset', { email })
      if (ok) {
        setState('sent')
        return
      }
      setError(status === 429 ? 'Muitas tentativas. Tente novamente em instantes.' : SEND_FAILED)
    } catch {
      setError(SEND_FAILED)
    }
    setState('idle')
  }

  const backToLogin = <Link href={LOGIN_PATH} style={authStyles.link}>Voltar para o login</Link>

  if (state === 'sent') {
    return (
      <AuthCard title="Esqueci minha senha" description="Se houver uma conta com este endereço, enviamos um link para redefinir a senha. O link vale por uma hora.">
        {backToLogin}
      </AuthCard>
    )
  }

  const sending = state === 'sending'
  return (
    <AuthCard title="Esqueci minha senha" description="Informe o e-mail da sua conta. Enviaremos um link para escolher uma nova senha.">
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <label style={authStyles.label}>
          E-mail
          <input name="email" type="email" autoComplete="username" required disabled={sending} style={authStyles.input} />
        </label>
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={sending} style={primaryButtonStyle(sending)}>
          {sending ? 'Enviando...' : 'Enviar link'}
        </button>
      </form>
      <p style={authStyles.footer}>{backToLogin}</p>
    </AuthCard>
  )
}
