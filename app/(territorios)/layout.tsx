import type { Metadata } from 'next'
import '../globals.css'
import '../territorios.css'
import { archivoNarrow, rubik } from '../fonts/marketing'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { HTML_LANG, type Locale } from '@/translations/config'
import { CLIENT_NAMESPACES, pickMessages } from '@/translations/clientNamespaces'

// Fifth sibling root layout. The story scrolls like the landing page and prints
// its summary, so it cannot share (mapa)'s locked viewport; being a sibling
// root, its CSS loads only here.
//
// globals.css comes first so the tokens, type classes and SiteHeader match the
// home by construction; territorios.css then overrides the few base rules the
// story needs otherwise (scroll behavior, body size, link underline).
//
// The font classes go on <html>, not <body> as in the marketing layout:
// territorios.css aliases --font-app and --font-raleway to --font-sans on
// :root, for the map components the story reuses, and a var() on :root only
// resolves if --font-sans is set on that same element.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TerritoriosMetadata')
  return {
    title: t('title'),
    robots: { index: false, follow: false },
    icons: { icon: '/logos/logo_oca.png' },
  }
}

// The session is checked by the page, not here. Layout and page render in
// parallel and the first redirect thrown wins: measured on 2026-09-16, a
// redirect from this layout always beat the page's and dropped recorte, feicao
// and etapa from the return address. Withholding the children instead turned
// the page's redirect into a 200 carrying it in the RSC payload. The group has
// a single page, and that page redirects before rendering anything.
export default async function TerritoriosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The language comes from the cookie the language switch writes (see
  // translations/request.ts).
  const locale = (await getLocale()) as Locale
  const messages = await getMessages()

  return (
    <html lang={HTML_LANG[locale]} className={`${rubik.variable} ${archivoNarrow.variable}`}>
      <body>
        <NextIntlClientProvider messages={pickMessages(messages, CLIENT_NAMESPACES.territorios)}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
