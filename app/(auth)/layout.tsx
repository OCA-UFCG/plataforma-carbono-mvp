import type { Metadata } from 'next'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Analytics } from '@/components/Analytics'
import { libreFranklin } from '../fonts/app'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { HTML_LANG, type Locale } from '@/translations/config'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('LoginMetadata')

  return {
    title: t('title'),
    description: t('description'),
    icons: { icon: '/logos/logo_oca.png' },
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // The language comes from the cookie the language switch writes (see
  // translations/request.ts).
  const locale = (await getLocale()) as Locale
  const messages = await getMessages()

  return (
    <html lang={HTML_LANG[locale]} className={libreFranklin.variable}>
      <body style={{ margin: 0, minHeight: '100dvh', fontFamily: 'var(--font-app), sans-serif' }}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
