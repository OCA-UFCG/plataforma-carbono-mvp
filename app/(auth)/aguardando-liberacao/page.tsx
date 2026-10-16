import type { Metadata } from 'next'
import Link from 'next/link'
import AuthCard, { authStyles } from '@/components/auth/AuthCard'
import { LOGIN_PATH } from '@/lib/access/paths'

export const metadata: Metadata = { title: 'Cadastro em análise | Caativar' }

/**
 * Where a correct password without access lands. No guard and no session: a pending account never
 * gets a cookie, so there is no email to show and nothing to sign out of.
 */
export default function PendingApprovalPage() {
  return (
    <AuthCard
      title="Cadastro em análise"
      description="Seu e-mail foi confirmado e sua solicitação chegou à equipe da plataforma. Assim que a intenção de uso que você descreveu for analisada, você receberá um aviso por e-mail e poderá acessar a plataforma."
    >
      <Link href={LOGIN_PATH} style={authStyles.link}>Voltar para o login</Link>
    </AuthCard>
  )
}
