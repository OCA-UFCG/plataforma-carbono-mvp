'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import AuthCard, { authStyles, linkButtonStyle, primaryButtonStyle } from '@/components/auth/AuthCard'
import PasswordFields, { PASSWORD_PAIR_MESSAGES, WEAK_PASSWORD_MESSAGE } from '@/components/auth/PasswordFields'
import ResendConfirmation from '@/components/auth/ResendConfirmation'
import { postJson } from '@/lib/access/clientFetch'
import { passwordPairError } from '@/lib/access/passwordRules'
import { LOGIN_PATH } from '@/lib/access/paths'

type Outcome = 'approved' | 'pending' | 'rejected'
type State =
  | { step: 'checking' }
  | { step: 'password'; email: string }
  | { step: 'done'; outcome: Outcome }
  | { step: 'invalid' }

const FAILED_MESSAGE = 'Não foi possível confirmar o cadastro. Tente novamente.'

const OUTCOME_COPY: Record<Outcome, { title: string; description: string }> = {
  approved: { title: 'Acesso liberado', description: 'Seu e-mail foi confirmado e o acesso está liberado.' },
  pending: { title: 'E-mail confirmado', description: 'Sua solicitação foi enviada à equipe da plataforma. Você receberá um e-mail quando ela for analisada.' },
  rejected: { title: 'Pedido não aprovado', description: 'Este pedido de acesso não foi aprovado.' },
}

function isOutcome(value: unknown): value is Outcome {
  return value === 'approved' || value === 'pending' || value === 'rejected'
}

/**
 * The confirmation link's page: checks the code (which spends nothing), asks for the password,
 * then shows how the signup settled. `email` comes from the link and only fills the resend button.
 */
export default function SignupConfirmation({ code, email }: { code: string; email: string }) {
  const [state, setState] = useState<State>({ step: 'checking' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // Checking spends nothing, so React running this twice in development does no harm.
    postJson('/api/signup/confirm/check', { code })
      .then(({ ok, body }) => {
        if (!active) return
        const checkedEmail = body?.email
        setState(ok && typeof checkedEmail === 'string' ? { step: 'password', email: checkedEmail } : { step: 'invalid' })
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
      const { ok, status, body } = await postJson('/api/signup/confirm', { code, password })
      const outcome = body?.status
      if (ok && isOutcome(outcome)) {
        setState({ step: 'done', outcome })
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
      <AuthCard
        title="Link inválido ou expirado"
        description="Este link já foi usado ou expirou. Se você já confirmou o cadastro, entre com seu e-mail e senha. Se não, peça um novo link."
      >
        <div style={{ display: 'grid', gap: 14 }}>
          {email ? <ResendConfirmation email={email} /> : null}
          <Link href={LOGIN_PATH} style={authStyles.link}>Ir para o login</Link>
        </div>
      </AuthCard>
    )
  }

  if (state.step === 'done') {
    const copy = OUTCOME_COPY[state.outcome]
    return (
      <AuthCard title={copy.title} description={copy.description}>
        {state.outcome === 'approved' ? <Link href={LOGIN_PATH} style={linkButtonStyle}>Entrar na plataforma</Link> : null}
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Escolha sua senha" description={`Conta: ${state.email}`}>
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <PasswordFields disabled={saving} />
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={saving} style={primaryButtonStyle(saving)}>
          {saving ? 'Confirmando...' : 'Confirmar cadastro'}
        </button>
      </form>
    </AuthCard>
  )
}
