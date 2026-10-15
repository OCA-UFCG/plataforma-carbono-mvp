'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import AuthCard, { authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'
import ResendConfirmation from '@/components/auth/ResendConfirmation'
import { postJson } from '@/lib/access/clientFetch'
import { normalizeEmail } from '@/lib/access/emailAddress'
import { INTENTION_MAX_LENGTH } from '@/lib/access/intention'
import { LOGIN_PATH } from '@/lib/access/paths'
import { signupFormError } from '@/lib/access/signupForm'

const GENERIC_ERROR = 'Não foi possível concluir o cadastro. Tente novamente.'

/** Email and intended use; the password is chosen later, from the confirmation link. */
export default function SignupForm() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Kept for the resend button: the form is gone by the time it shows.
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = normalizeEmail(data.get('email'))
    const intention = String(data.get('intention') ?? '')
    const invalid = signupFormError(email, intention)
    if (invalid) {
      setError(invalid)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const { ok, body } = await postJson('/api/signup', { email, intention })
      if (ok) {
        setSentTo(email)
        return
      }
      setError(typeof body?.error === 'string' ? body.error : GENERIC_ERROR)
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <AuthCard title="Confirme seu e-mail" description="Enviamos um link para o endereço informado. Abra o link para confirmar o cadastro e escolher sua senha.">
        <ResendConfirmation email={sentTo} />
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Criar conta">
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <label style={authStyles.label}>
          E-mail
          <input name="email" type="email" autoComplete="email" placeholder="de preferência institucional" required disabled={submitting} style={authStyles.input} />
        </label>
        <label style={authStyles.label}>
          Como pretende usar a plataforma?
          <textarea
            name="intention"
            rows={4}
            maxLength={INTENTION_MAX_LENGTH}
            placeholder="Se tiver vínculo com alguma instituição, informe qual."
            required
            disabled={submitting}
            style={{ ...authStyles.input, resize: 'vertical' }}
          />
          <span style={authStyles.hint}>Sua descrição é enviada à equipe da plataforma, que libera o acesso.</span>
        </label>
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
          {submitting ? 'Criando conta...' : 'Criar conta'}
        </button>
        <p style={authStyles.hint}>Você escolhe sua senha ao confirmar o e-mail.</p>
      </form>
      <p style={authStyles.footer}>
        Já tem conta? <Link href={LOGIN_PATH} style={authStyles.link}>Entrar</Link>
      </p>
    </AuthCard>
  )
}
