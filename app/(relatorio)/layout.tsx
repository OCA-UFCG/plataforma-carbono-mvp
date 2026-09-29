import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import '../relatorio.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { getAuthenticatedSession } from '@/lib/auth'
import { libreFranklin } from '../fonts/app'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { HTML_LANG, type Locale } from '@/translations/config'

// Fourth sibling root layout. The report is a document that scrolls and prints,
// and (mapa)'s layout zeroes the body scroll and pins the height to the
// viewport for the map; sharing it would make the document unreadable. Being a
// sibling root, relatorio.css loads only on the routes of this group.
//
// Consequence: a link from /mapa to here crosses a route-group boundary, so it
// is an <a href> and a full page load, never next/link.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('RelatorioMetadata')

  return {
    title: t('title'),
    description: t('description'),
    icons: { icon: '/logos/logo_oca.png' },
  }
}

export default async function RelatorioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthenticatedSession()
  if (!session) redirect('/login?redirect=/relatorio')

  // The language comes from the cookie the language switch writes (see
  // translations/request.ts).
  const locale = (await getLocale()) as Locale
  const messages = await getMessages()

  return (
    <html lang={HTML_LANG[locale]} className={libreFranklin.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
