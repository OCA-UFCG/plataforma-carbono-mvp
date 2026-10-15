'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { authColors, authStyles, primaryButtonStyle, secondaryButtonStyle } from '@/components/auth/AuthCard'
import { postJson } from '@/lib/access/clientFetch'

export interface ApprovalRow {
  uid: string
  email: string
  intention: string
  /** Formatted on the server, so the client never re-formats it in another time zone. */
  requestedAt: string
}

type Decision = 'approved' | 'rejected'
type RowState = 'idle' | 'working' | Decision | 'conflict' | 'failed'

const DECIDED_LABEL: Record<Decision, string> = { approved: 'Aprovado', rejected: 'Recusado' }
const FAILED_MESSAGE = 'Não foi possível salvar a decisão.'

/**
 * What a refused decision shows: the route's own message when it sent one, since it says what went
 * wrong (an unconfirmed email, a decision recorded without access). Not the 401's: that body comes
 * from lib/auth.ts, in English.
 */
export function decisionFailureMessage(status: number, body: Record<string, unknown> | null): string {
  return status !== 401 && typeof body?.error === 'string' && body.error ? body.error : FAILED_MESSAGE
}

const cell: CSSProperties = { padding: '12px 14px', verticalAlign: 'top', textAlign: 'left', fontSize: 14, lineHeight: 1.45 }
const headerCell: CSSProperties = { ...cell, color: authColors.label, fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${authColors.border}` }

export default function ApprovalsTable({ rows }: { rows: ApprovalRow[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [states, setStates] = useState<Record<string, RowState>>({})
  const [failures, setFailures] = useState<Record<string, string>>({})

  const setRow = (uid: string, state: RowState) => setStates((current) => ({ ...current, [uid]: state }))
  const failRow = (uid: string, message: string) => {
    setFailures((current) => ({ ...current, [uid]: message }))
    setRow(uid, 'failed')
  }

  async function decide(uid: string, decision: Decision) {
    setRow(uid, 'working')
    try {
      const { ok, status, body } = await postJson('/api/signup/approve', { uid, decision })
      if (ok) {
        setRow(uid, decision)
        // Reload the list: a request decided elsewhere would otherwise stay here as if waiting.
        startTransition(() => router.refresh())
        return
      }
      // A 409 carrying a status means someone decided first, which the admin needs to tell apart
      // from a failure.
      const decidedElsewhere = status === 409 && typeof body?.status === 'string'
      if (decidedElsewhere) {
        setRow(uid, 'conflict')
        startTransition(() => router.refresh())
        return
      }
      failRow(uid, decisionFailureMessage(status, body))
    } catch {
      failRow(uid, FAILED_MESSAGE)
    }
  }

  if (rows.length === 0) return <p style={authStyles.status}>Nenhum pedido aguardando decisão.</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: authColors.ink }}>
        <thead>
          <tr>
            <th style={headerCell}>E-mail</th>
            <th style={headerCell}>Intenção de uso</th>
            <th style={{ ...headerCell, whiteSpace: 'nowrap' }}>Pedido em</th>
            <th style={{ ...headerCell, whiteSpace: 'nowrap' }}>Decisão</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const state = states[row.uid] ?? 'idle'
            const working = state === 'working'
            return (
              <tr key={row.uid} style={{ borderBottom: `1px solid ${authColors.border}` }}>
                <td style={cell}>{row.email}</td>
                {/* A stranger's text: React escapes it, and pre-wrap keeps its line breaks without interpreting anything. */}
                <td style={{ ...cell, color: authColors.muted, whiteSpace: 'pre-wrap' }}>{row.intention}</td>
                <td style={{ ...cell, whiteSpace: 'nowrap', color: authColors.muted }}>{row.requestedAt}</td>
                <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                  {state === 'approved' || state === 'rejected' ? (
                    <span style={{ fontWeight: 700 }}>{DECIDED_LABEL[state]}</span>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" disabled={working} onClick={() => void decide(row.uid, 'approved')} style={{ ...primaryButtonStyle(working), padding: '8px 12px' }}>
                          {working ? 'Salvando...' : 'Aprovar'}
                        </button>
                        <button type="button" disabled={working} onClick={() => void decide(row.uid, 'rejected')} style={{ ...secondaryButtonStyle(working), padding: '7px 12px', color: authColors.error, borderColor: authColors.error }}>
                          Recusar
                        </button>
                      </div>
                      {state === 'conflict' && <p role="alert" style={authStyles.error}>Outra pessoa decidiu este pedido antes de você.</p>}
                      {state === 'failed' && <p role="alert" style={authStyles.error}>{failures[row.uid] ?? FAILED_MESSAGE}</p>}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
