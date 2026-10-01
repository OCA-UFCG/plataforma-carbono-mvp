import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import '../mapa.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { getAuthenticatedSession } from '@/lib/auth'
import { Analytics } from '@/components/Analytics'
import { libreFranklin } from '../fonts/app'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { HTML_LANG, type Locale } from '@/translations/config'
import { CLIENT_NAMESPACES, pickMessages } from '@/translations/clientNamespaces'

// Root layout of the maps and analysis module: full screen, without the
// marketing header/footer. Since it is a sibling root layout to (marketing)'s,
// mapa.css (which zeroes the body scroll and defines the map tokens) loads only
// on the routes of this group.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('MapaUiMetadata')

  return {
    title: t('title'),
    description: t('description'),
    icons: { icon: '/logos/logo_oca.png' },
  }
}

export default async function MapaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthenticatedSession()
  if (!session) redirect('/login?redirect=/mapa')

  // The language comes from the cookie the language switch writes (see
  // translations/request.ts).
  const locale = (await getLocale()) as Locale
  const messages = await getMessages()

  return (
    <html lang={HTML_LANG[locale]} className={libreFranklin.variable}>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', height: '100dvh' }}>
        <NextIntlClientProvider messages={pickMessages(messages, CLIENT_NAMESPACES.mapa)}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
