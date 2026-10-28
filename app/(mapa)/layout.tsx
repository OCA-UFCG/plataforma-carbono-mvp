import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import '../globals.css'
import '../mapa.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { getAuthenticatedSession } from '@/lib/auth'
import { Analytics } from '@/components/Analytics'
import { FAVICON } from '@/lib/favicon'
import { inter, rubik } from '../fonts/marketing'

// Root layout of the maps and analysis module: full screen, under the site
// header and without the footer. Since it is a sibling root layout to
// (marketing)'s, its CSS loads only on the routes of this group: globals.css
// first, so the tokens, type classes and SiteHeader match the site by
// construction, as in (territorios); then mapa.css, which zeroes the body
// scroll and defines the map tokens.
//
// The font classes go on <html>: mapa.css aliases --font-app, which every map
// component reads, to --font-sans on :root, and a var() on :root only resolves
// if --font-sans is set on that same element.
export const metadata: Metadata = {
  title: 'Mapas e análises | Caativar',
  description: 'Módulo de mapas e análises do carbono florestal do bioma Caatinga. OCA, UFCG, INSA.',
  icons: FAVICON,
}

export default async function MapaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthenticatedSession()
  if (!session) redirect('/login?redirect=/mapa')

  return (
    <html lang="pt-BR" className={`${rubik.variable} ${inter.variable}`}>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', height: '100dvh' }}>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
