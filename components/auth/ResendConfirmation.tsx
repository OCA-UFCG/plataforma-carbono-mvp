'use client'

import { useState } from 'react'
import { authStyles, secondaryButtonStyle } from '@/components/auth/AuthCard'
import { postJson } from '@/lib/access/clientFetch'

/**
 * Asks for a new confirmation email. The answer is the same whether or not the address has an
 * account, so a failed request shows the same line as a successful one.
 */
export default function ResendConfirmation({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function resend() {
    setState('sending')
    try {
      await postJson('/api/signup/resend', { email })
    } catch {
      // The answer is generic either way.
    } finally {
      setState('sent')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <button type="button" onClick={() => void resend()} disabled={state === 'sending' || !email} style={secondaryButtonStyle(state === 'sending')}>
        {state === 'sending' ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
      </button>
      {state === 'sent' && <p role="status" style={authStyles.status}>Se o endereço estiver cadastrado, um novo e-mail foi enviado.</p>}
    </div>
  )
}
