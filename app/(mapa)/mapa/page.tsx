'use client'

import dynamic from 'next/dynamic'
import { IcLeaf } from '@/components/mapa/icons'

// MapLibre requires browser APIs (WebGL, window).
// dynamic + ssr:false prevents Next.js from trying to render it on the server.
const Mapa = dynamic(() => import('@/components/mapa/Mapa'), {
  ssr: false,
  loading: () => (
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
      Carregando mapa...
    </div>
  ),
})

export default function MapaPage() {
  return <Mapa />
}
