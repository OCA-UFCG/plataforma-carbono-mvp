import type { Metadata } from 'next'
import { Libre_Franklin } from 'next/font/google'
import { redirect } from 'next/navigation'
import '../mapa.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { getAuthenticatedSession } from '@/lib/auth'
import { Analytics } from '@/components/Analytics'

// Root layout of the maps and analysis module: full screen, without the
// marketing header/footer. Since it is a sibling root layout to (marketing)'s,
// mapa.css (which zeroes the body scroll and defines the map tokens) loads only
// on the routes of this group.
const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-app',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mapas e análises | Plataforma Carbono Caatinga',
  description: 'Módulo de mapas e análises do carbono florestal do bioma Caatinga. OCA, UFCG, INSA.',
  icons: { icon: '/logos/logo_oca.png' },
}

export default async function MapaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthenticatedSession()
  if (!session) redirect('/login?redirect=/mapa')

  return (
    <html lang="pt-BR" className={libreFranklin.variable}>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', height: '100dvh' }}>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
