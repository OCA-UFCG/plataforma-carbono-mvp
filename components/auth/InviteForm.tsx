'use client'

import { FormEvent, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { authColors, authStyles, primaryButtonStyle } from '@/components/auth/AuthCard'
import { postJson } from '@/lib/access/clientFetch'
import {
  addressesToRetry,
  INVITE_OUTCOME_LABEL,
  isRetryable,
  MAX_INVITES,
  parseInviteList,
  readInviteResults,
  type InviteResult,
} from '@/lib/access/inviteList'

const FAILED_MESSAGE = 'Não foi possível convidar.'

/**
 * Where admins invite partners, above the approvals table. The route checks the admin list again:
 * showing this form authorizes nothing. The text of the invite is fixed; the admin types addresses
 * only.
 */
export default function InviteForm() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<InviteResult[]>([])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const emails = parseInviteList(text)
    if (emails.length === 0) {
      setError('Informe ao menos um e-mail.')
      return
    }
    if (emails.length > MAX_INVITES) {
      setError(`Envie no máximo ${MAX_INVITES} e-mails por vez.`)
      return
    }

    setSending(true)
    setError(null)
    setResults([])
    try {
      const { ok, status, body } = await postJson('/api/signup/invite', { emails })
      const sent = ok ? readInviteResults(body) : null
      if (!sent) {
        // The route's own message says what went wrong; the 401's comes from lib/auth.ts, in English.
        setError(status !== 401 && typeof body?.error === 'string' && body.error ? body.error : FAILED_MESSAGE)
        return
      }
      setResults(sent)
      // Only what another try could change stays in the box, so resubmitting re-sends nothing.
      setText(addressesToRetry(sent).join('\n'))
      // An invite that approved a pending request takes it off the table below.
      if (sent.some((result) => result.outcome === 'approved')) startTransition(() => router.refresh())
    } catch {
      setError(FAILED_MESSAGE)
    } finally {
      setSending(false)
    }
  }

  return (
    <section aria-labelledby="convidar-parceiros" style={{ margin: '0 0 32px', paddingBottom: 28, borderBottom: `1px solid ${authColors.border}` }}>
      <h2 id="convidar-parceiros" style={{ margin: '0 0 6px', color: authColors.ink, fontSize: 18, lineHeight: 1.3 }}>Convidar parceiros</h2>
      <p style={{ ...authStyles.status, margin: '0 0 18px', fontSize: 14 }}>
        O acesso é liberado assim que a pessoa confirmar o e-mail e escolher a senha, sem passar por aprovação.
      </p>
      <form onSubmit={handleSubmit} noValidate style={authStyles.form}>
        <label style={authStyles.label}>
          E-mails (um por linha)
          <textarea
            name="emails"
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={sending}
            spellCheck={false}
            style={{ ...authStyles.input, resize: 'vertical' }}
          />
        </label>
        {error && <p role="alert" style={authStyles.error}>{error}</p>}
        <button type="submit" disabled={sending} style={{ ...primaryButtonStyle(sending), justifySelf: 'start' }}>
          {sending ? 'Enviando...' : 'Enviar convites'}
        </button>
      </form>
      {/* Present before any result, so screen readers announce the list when it fills. */}
      <div role="status">
        {results.length > 0 && (
          <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {results.map((result) => (
              <li key={result.email} style={{ color: authColors.ink, fontSize: 14, lineHeight: 1.45 }}>
                {result.email} — <span style={{ color: isRetryable(result.outcome) ? authColors.error : authColors.muted }}>{INVITE_OUTCOME_LABEL[result.outcome]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
