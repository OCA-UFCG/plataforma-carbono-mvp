import type { Metadata } from 'next'
import { Libre_Franklin } from 'next/font/google'
import '../plataforma.css'

// Layout raiz da plataforma: tela cheia, sem o header/rodapé de marketing. Como é
// um layout raiz irmão do de (marketing), o plataforma.css (que zera o scroll do
// body e define os tokens do mapa) só carrega nas rotas deste grupo.
const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-app',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mapas | Plataforma Carbono Caatinga',
  description: 'Monitoramento do carbono florestal do bioma Caatinga. OCA, UFCG, INSA.',
  icons: { icon: '/logos/logo_oca.png' },
}

export default function PlataformaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={libreFranklin.variable}>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', height: '100dvh' }}>
        {children}
      </body>
    </html>
  )
}
