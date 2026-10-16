import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import AuthCard, { authStyles } from '@/components/auth/AuthCard'
import ApprovalsTable, { type ApprovalRow } from '@/components/auth/ApprovalsTable'
import { getAuthenticatedSession, loginRedirect } from '@/lib/auth'
import { isAccessAdmin } from '@/lib/access/admins'
import { APPROVALS_PATH } from '@/lib/access/paths'
import { listPendingAccessRequests } from '@/lib/access/requests'

export const metadata: Metadata = { title: 'Pedidos de acesso | Caativar' }

// The Caatinga's time zone, so the date reads as the team lives it whatever the server's zone.
const requestedAtFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Fortaleza' })

/**
 * Where admins decide access requests. Showing a row never authorizes anything: the approve route
 * checks the admin list again.
 */
export default async function ApprovalsPage() {
  const session = await getAuthenticatedSession()
  // An admin arriving from the team email while logged out comes back here after the login.
  if (!session) redirect(loginRedirect(APPROVALS_PATH))
  // Not 403: a signed-in non-admin is not told the page exists.
  if (!isAccessAdmin(session.email)) notFound()

  // The query needs Firestore's composite index (firestore.indexes.json); without it the page shows
  // an alert instead of breaking, so the admin knows something needs fixing.
  let rows: ApprovalRow[] | null = null
  try {
    rows = (await listPendingAccessRequests()).map((request) => ({
      uid: request.uid,
      email: request.email,
      intention: request.intention,
      requestedAt: requestedAtFormat.format(new Date(request.createdAt)),
    }))
  } catch (error) {
    console.error('[/aprovacoes] could not list the access requests:', error)
  }

  return (
    <AuthCard title="Pedidos de acesso" description="Cadastros que confirmaram o e-mail e aguardam liberação." width={960}>
      {rows ? (
        <ApprovalsTable rows={rows} />
      ) : (
        <p role="alert" style={authStyles.error}>Não foi possível carregar os pedidos. Avise a equipe técnica: pode faltar o índice do Firestore.</p>
      )}
      {/* Another route group: a full page load, so a plain anchor (next/link would soft-navigate across the layouts). */}
      <p style={authStyles.footer}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- cross-route-group link; see CLAUDE.md */}
        <a href="/" style={authStyles.link}>Voltar para a plataforma</a>
      </p>
    </AuthCard>
  )
}
