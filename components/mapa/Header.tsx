'use client'

import { useEffect, useRef, useState } from 'react'
import { IcLeaf, IcSearch, IcChevronDown, IcMoon, IcSun, IcCheck } from './icons'
import { useStore } from '@/lib/mapa/store'
import {
  MONTHS, PHASES, CYCLE_GRADIENT, cyclePosition, resolveMonth, type MonthInfo,
} from '@/lib/phenology'
import { readableOn } from '@/lib/color'
import type { PlatformTheme } from '@/types/mapa'
import { useAuth } from '@/components/auth/AuthProvider'

interface Props {
  theme: PlatformTheme
  month: MonthInfo
}

export default function Header({ theme, month }: Props) {
  const monthPref      = useStore((s) => s.month)
  const setMonth       = useStore((s) => s.setMonth)
  const setWelcomeSeen = useStore((s) => s.setWelcomeSeen)
  const darkMode       = useStore((s) => s.darkMode)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)
  const { user, signOut } = useAuth()

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc) }
  }, [pickerOpen])

  const isAuto = monthPref === 'auto'
  const realMonth = resolveMonth('auto')

  async function handleSignOut() {
    await signOut()
    window.location.replace('/login')
  }

  return (
    <div style={{ flex: 'none', background: '#26241d', position: 'relative', zIndex: 30 }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px' }}>
        {/* Marca, volta para a landing. <a> e não next/link: a landing tem outro
            layout raiz, então a navegação precisa ser um carregamento de página
            inteiro. É exatamente o que a regra abaixo tenta evitar, e aqui é o
            comportamento desejado. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          aria-label="Página inicial da Caativar"
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', textDecoration: 'none' }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: theme.colors.accentGrad,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.onAccent, transition: 'background .4s',
          }}>
            <IcLeaf size={17} />
          </div>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: '#f5f4ec', lineHeight: 1.1 }}>Caativar</div>
        </a>

        {/* Chip do mês + seletor */}
        <div ref={pickerRef} style={{ position: 'relative', flex: 'none' }}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            aria-label="Mês da interface"
            aria-expanded={pickerOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px 0 8px',
              borderRadius: 999, background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.14)',
              cursor: 'pointer',
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: month.color, transition: 'background .4s' }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ede9d8', whiteSpace: 'nowrap' }}>
              {month.label}, {PHASES[month.phase].label.toLowerCase()}
            </span>
            {isAuto && (
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: '#26241d', background: '#cfccc0', borderRadius: 999, padding: '1px 6px', textTransform: 'uppercase' }}>auto</span>
            )}
            <IcChevronDown size={12} color="#a5a294" />
          </button>

          {pickerOpen && (
            <div style={{
              position: 'absolute', top: 40, left: 0, zIndex: 40, width: 320, background: theme.colors.bgCard,
              border: `1px solid ${theme.colors.border}`, borderRadius: 14, boxShadow: 'var(--sh-pop)', overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 14px 8px', fontSize: 12, fontWeight: 800, letterSpacing: '.14em', color: theme.colors.dim, textTransform: 'uppercase', borderBottom: `1px solid ${theme.colors.border}` }}>
                Mês da interface
              </div>

              <button
                onClick={() => { setMonth('auto'); setPickerOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                  background: isAuto ? theme.colors.accentBg : 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`,
                }}
              >
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: theme.colors.accentGrad, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: isAuto ? theme.colors.accentInk : theme.colors.text }}>Automático</span>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: theme.colors.dim }}>Segue a data, hoje: {realMonth.label}</span>
                </span>
                {isAuto && <IcCheck size={13} color={theme.colors.accent} />}
              </button>

              {/* Os doze meses como amostras da própria rampa sazonal. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 10 }}>
                {MONTHS.map((m) => {
                  const active = !isAuto && monthPref === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setMonth(m.id); setPickerOpen(false) }}
                      title={`${m.label}, ${PHASES[m.phase].label}`}
                      aria-label={`${m.label}, ${PHASES[m.phase].label}`}
                      aria-pressed={active}
                      style={{
                        position: 'relative', background: m.color, color: readableOn(m.color),
                        border: active ? `2px solid ${theme.colors.text}` : '2px solid transparent',
                        borderRadius: 8, padding: '9px 0', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, letterSpacing: '.02em',
                      }}
                    >
                      {m.short}
                      {realMonth.id === m.id && (
                        <span style={{ position: 'absolute', top: 3, right: 4, width: 5, height: 5, borderRadius: '50%', background: readableOn(m.color) }} />
                      )}
                    </button>
                  )
                })}
              </div>

              <div style={{ padding: '0 14px 12px', fontSize: 12, fontWeight: 500, lineHeight: 1.5, color: theme.colors.dim }}>
                Cores medidas na vegetação nativa do bioma, de 1985 a 2024. O ponto marca o mês de hoje.
              </div>
            </div>
          )}
        </div>

        {/* Busca (abre a busca do mapa) */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('cc-open-search'))}
          style={{
            flex: 1, maxWidth: 400, minWidth: 0, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9,
            height: 36, padding: '0 14px', borderRadius: 999, background: 'rgba(255,255,255,.1)', color: '#c6c2b0',
            cursor: 'text', overflow: 'hidden', border: 'none', textAlign: 'left',
          }}
        >
          <IcSearch size={14} style={{ flex: 'none' }} />
          <span style={{ fontSize: 15, fontWeight: 500, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Buscar município, estado ou território...
          </span>
        </button>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 15, fontWeight: 600, color: '#b3af9e', flex: 'none', whiteSpace: 'nowrap' }}>
          <div style={{ color: '#fff', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            Mapa
            <span style={{ width: 16, height: 2.5, borderRadius: 2, background: theme.colors.accent, transition: 'background .4s' }} />
          </div>
          <span style={{ opacity: .75 }}>Dados</span>
          <span style={{ opacity: .75 }}>Metodologia</span>
          <button onClick={() => setWelcomeSeen(false)} style={{ background: 'none', border: 'none', color: '#b3af9e', font: 'inherit', cursor: 'pointer', padding: 0 }}>Sobre</button>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
            style={{ background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.14)', color: '#ede9d8', cursor: 'pointer', width: 30, height: 30, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {darkMode ? <IcSun size={14} /> : <IcMoon size={13} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 2 }}>
            {user?.email && <span title={user.email} style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', color: '#d9d5c5', fontSize: 13 }}>{user.email}</span>}
            <button
              onClick={() => { void handleSignOut() }}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,.22)', borderRadius: 999, color: '#ede9d8', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700, padding: '6px 10px' }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Faixa do ciclo anual */}
      <div style={{ height: 4, background: CYCLE_GRADIENT, position: 'relative' }}>
        <div style={{ position: 'absolute', left: cyclePosition(month), top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,.9)', transition: 'left .4s' }} />
      </div>
    </div>
  )
}
