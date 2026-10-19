'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import AuthCard, { authStyles, linkButtonStyle, primaryButtonStyle } from '@/components/auth/AuthCard'
import PasswordFields, { PASSWORD_PAIR_MESSAGES, WEAK_PASSWORD_MESSAGE } from '@/components/auth/PasswordFields'
import { postJson } from '@/lib/access/clientFetch'
import { passwordPairError } from '@/lib/access/passwordRules'
import { FORGOT_PASSWORD_PATH, LOGIN_PATH } from '@/lib/access/paths'

type State = { step: 'checking' } | { step: 'ready'; email: string } | { step: 'changed' } | { step: 'invalid' }

const FAILED_MESSAGE = 'Não foi possível alterar a senha. Tente novamente.'

export default function ResetPasswordForm({ code }: { code: string }) {
  const [state, setState] = useState<State>({ step: 'checking' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // Checking does not spend the code.
    postJson('/api/password-reset/check', { code })
      .then(({ ok, body }) => {
        if (!active) return
        const email = body?.email
        setState(ok && typeof email === 'string' ? { step: 'ready', email } : { step: 'invalid' })
      })
      .catch(() => {
        if (active) setState({ step: 'invalid' })
      })
    return () => {
      active = false
    }
  }, [code])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    const pairError = passwordPairError(password, String(data.get('confirmation') ?? ''))
    if (pairError) {
      setError(PASSWORD_PAIR_MESSAGES[pairError])
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { ok, status } = await postJson('/api/password-reset/confirm', { code, password })
      if (ok) {
        setState({ step: 'changed' })
        return
      }
      if (status === 410) {
        setState({ step: 'invalid' })
        return
      }
      setError(status === 400 ? WEAK_PASSWORD_MESSAGE : FAILED_MESSAGE)
    } catch {
      setError(FAILED_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  if (state.step === 'checking') return <AuthCard title="Verificando o link..." />

  if (state.step === 'invalid') {
    return (
      <AuthCard title="Link inválido ou expirado" description="Peça um novo link para redefinir a senha.">
        <Link href={FORGOT_PASSWORD_PATH} style={linkButtonStyle}>Pedir novo link</Link>
      </AuthCard>
    )
  }

  if (state.step === 'changed') {
    return (
      <AuthCard title="Senha alterada" description="Sua senha foi alterada. Entre com a nova senha.">
        <Link href={LOGIN_PATH} style={linkButtonStyle}>Entrar</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Escolher nova senha" description={`Conta: ${state.email}`}>
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <PasswordFields labels={{ password: 'Nova senha', confirmation: 'Confirmar nova senha' }} disabled={saving} />
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={saving} style={primaryButtonStyle(saving)}>
          {saving ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthCard>
  )
}
