'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { IcLeaf } from '@/components/mapa/icons'

function MapaLoading() {
  const t = useTranslations('MapaUiPage')

  return (
    <div
      style={{
        height: '100dvh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b6a60',
        fontFamily: 'var(--font-app), sans-serif',
        fontSize: 15.5,
        gap: 10,
      }}
    >
      <IcLeaf size={20} color="#5f7030" />
      {t('loading')}
    </div>
  )
}

// MapLibre requires browser APIs (WebGL, window).
// dynamic + ssr:false prevents Next.js from trying to render it on the server.
const Mapa = dynamic(() => import('@/components/mapa/Mapa'), {
  ssr: false,
  loading: () => <MapaLoading />,
})

export default function MapaPage() {
  return <Mapa />
}
