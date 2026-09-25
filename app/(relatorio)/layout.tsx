import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import '../relatorio.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { getAuthenticatedSession } from '@/lib/auth'
import { libreFranklin } from '../fonts/app'

// Fourth sibling root layout. The report is a document that scrolls and prints,
// and (mapa)'s layout zeroes the body scroll and pins the height to the
// viewport for the map; sharing it would make the document unreadable. Being a
// sibling root, relatorio.css loads only on the routes of this group.
//
// Consequence: a link from /mapa to here crosses a route-group boundary, so it
// is an <a href> and a full page load, never next/link.
export const metadata: Metadata = {
  title: 'Relatório territorial | Caativar',
  description: 'Relatório automático de carbono por recorte territorial do bioma Caatinga. OCA, UFCG, INSA.',
  icons: { icon: '/logos/logo_oca.png' },
}

export default async function RelatorioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthenticatedSession()
  if (!session) redirect('/login?redirect=/relatorio')

  return (
    <html lang="pt-BR" className={libreFranklin.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
