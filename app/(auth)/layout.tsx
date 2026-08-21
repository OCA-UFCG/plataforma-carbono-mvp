import type { Metadata } from 'next'
import { Libre_Franklin } from 'next/font/google'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Analytics } from '@/components/Analytics'

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-app',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Entrar | Plataforma Carbono Caatinga',
  description: 'Acesso ao módulo de mapas e análises da Plataforma Carbono Caatinga.',
  icons: { icon: '/logos/logo_oca.png' },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={libreFranklin.variable}>
      <body style={{ margin: 0, minHeight: '100dvh', fontFamily: 'var(--font-app), sans-serif' }}>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
