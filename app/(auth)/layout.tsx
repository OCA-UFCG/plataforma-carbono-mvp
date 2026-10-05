import type { Metadata } from 'next'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Analytics } from '@/components/Analytics'
import { libreFranklin } from '../fonts/app'
import { FAVICON } from '@/lib/favicon'

export const metadata: Metadata = {
  title: 'Entrar | Caativar',
  description: 'Acesso ao módulo de mapas e análises da Caativar.',
  icons: FAVICON,
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
