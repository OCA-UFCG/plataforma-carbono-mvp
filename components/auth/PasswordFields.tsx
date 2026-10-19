'use client'

import { useState } from 'react'
import { authColors, authStyles } from '@/components/auth/AuthCard'
import type { PasswordPairError } from '@/lib/access/passwordRules'

export const PASSWORD_PAIR_MESSAGES: Record<PasswordPairError, string> = {
  required: 'Informe a senha.',
  'too-short': 'A senha precisa de pelo menos 8 caracteres.',
  'confirm-required': 'Confirme a senha.',
  mismatch: 'As senhas não são iguais.',
}

/** Shown when the server's rule (Firebase's password policy) refuses what the form accepted. */
export const WEAK_PASSWORD_MESSAGE = 'A senha não atende aos requisitos. Use pelo menos 8 caracteres.'

interface PasswordFieldsProps {
  labels?: { password: string; confirmation: string }
  disabled?: boolean
}

/**
 * The password pair of the confirmation and reset pages: two inputs named `password` and
 * `confirmation`, which the form reads through FormData and checks with passwordPairError
 * (lib/access/passwordRules.ts), and one toggle that shows both.
 */
export default function PasswordFields({
  labels = { password: 'Senha', confirmation: 'Confirmar senha' },
  disabled = false,
}: PasswordFieldsProps) {
  const [visible, setVisible] = useState(false)
  const type = visible ? 'text' : 'password'

  return (
    <>
      <label style={authStyles.label}>
        {labels.password}
        <input name="password" type={type} autoComplete="new-password" required disabled={disabled} style={authStyles.input} />
      </label>
      <label style={authStyles.label}>
        {labels.confirmation}
        <input name="confirmation" type={type} autoComplete="new-password" required disabled={disabled} style={authStyles.input} />
      </label>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        disabled={disabled}
        style={{ justifySelf: 'start', border: 0, padding: 0, background: 'none', color: authColors.accent, cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700 }}
      >
        {visible ? 'Ocultar senha' : 'Mostrar senha'}
      </button>
    </>
  )
}
