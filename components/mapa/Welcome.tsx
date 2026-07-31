'use client'

/* eslint-disable @next/next/no-img-element */
import { IcLeaf, IcX } from './icons'
import { useStore } from '@/lib/mapa/store'
import {
  MONTHS, PHASES, CYCLE_GRADIENT, cyclePosition, resolveMonth, type MonthInfo,
} from '@/lib/phenology'
import { readableOn } from '@/lib/color'
import type { PlatformTheme } from '@/types/mapa'

interface Props {
  theme: PlatformTheme
  month: MonthInfo
}

const LOGOS = [
  { src: '/logos/logo_oca.png', alt: 'OCA' },
  { src: '/logos/logo_ufcg.png', alt: 'UFCG' },
  { src: '/logos/logo_insa.png', alt: 'INSA' },
  { src: '/logos/logo_sudene.png', alt: 'Sudene' },
]

const STEPS = [
  { n: 1, t: 'Ative uma camada', d: 'Ligue uma camada de carbono ou ambiente no painel de temas.' },
  { n: 2, t: 'Clique ou desenhe', d: 'Clique num município ou desenhe uma área sobre o mapa.' },
  { n: 3, t: 'Leia e exporte', d: 'Veja a estatística zonal e exporte em CSV ou PNG.' },
]

export default function Welcome({ theme, month }: Props) {
  const setWelcomeSeen = useStore((s) => s.setWelcomeSeen)
  const setMonth       = useStore((s) => s.setMonth)
  const realMonth      = resolveMonth('auto')
  const phase           = PHASES[month.phase]

  const close = () => setWelcomeSeen(true)

  return (
    <div
      role="dialog"
      aria-label="Boas-vindas"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        backgroundImage:
          'linear-gradient(165deg,rgba(24,26,17,.72),rgba(24,26,17,.5) 45%,rgba(24,26,17,.78)), url(/welcome/foto_agua.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 100%)', maxHeight: '92dvh', overflowY: 'auto',
          background: theme.colors.glassBg, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderRadius: 20, boxShadow: '0 40px 90px -24px rgba(0,0,0,.6)', color: theme.colors.text,
        }}
      >
        {/* faixa do ciclo */}
        <div style={{ height: 6, background: CYCLE_GRADIENT, position: 'relative', borderRadius: '20px 20px 0 0' }}>
          <div style={{ position: 'absolute', left: cyclePosition(month), top: 0, bottom: 0, width: 3, background: 'rgba(255,255,255,.9)' }} />
        </div>

        <div style={{ padding: '22px 30px 28px' }}>
          {/* marca + fechar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.colors.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.onAccent }}>
              <IcLeaf size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Carbono Caatinga</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: theme.colors.dim, textTransform: 'uppercase' }}>Observatório da Caatinga, OCA</div>
            </div>
            <button onClick={close} aria-label="Fechar" style={{ background: theme.colors.mist, border: 'none', borderRadius: 999, width: 32, height: 32, cursor: 'pointer', color: theme.colors.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcX size={15} />
            </button>
          </div>

          {/* manchete + parágrafo */}
          <h1 style={{ fontSize: 31, fontWeight: 800, letterSpacing: '-.015em', lineHeight: 1.15, margin: '0 0 12px' }}>
            A cor da interface acompanha o mês do bioma
          </h1>
          <p style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: theme.colors.body, margin: '0 0 20px', maxWidth: 680 }}>
            Módulo de mapas e análises da Plataforma Carbono Caatinga. A interface veste a cor do mês
            corrente, apurada desde 1985 no acompanhamento da vegetação nativa por imagens do satélite Landsat e
            por uma câmera instalada em campo. Estão disponíveis camadas de solo, biomassa, produtividade, fluxo,
            fogo e uso da terra, sobre as quais se calcula estatística por município, território ou área desenhada.
          </p>

          {/* rampa dos doze meses, clicável */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, marginBottom: 8 }}>
              {MONTHS.map((m) => {
                const isCurrent = m.id === month.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMonth(m.id)}
                    title={`${m.label}, ${PHASES[m.phase].label}`}
                    aria-label={`Ver a interface em ${m.label}`}
                    aria-pressed={isCurrent}
                    style={{
                      position: 'relative', background: m.color, color: readableOn(m.color),
                      border: 'none', borderRadius: 3, cursor: 'pointer', padding: 0,
                      // A altura acompanha o quanto a vegetação está enfolhada no mês:
                      // a rampa é o próprio dado, alta em abril e baixa em outubro.
                      height: 26 + (m.ndfi + 0.6) * 34,
                      alignSelf: 'end',
                      outline: isCurrent ? `2px solid ${theme.colors.text}` : 'none', outlineOffset: 1,
                      fontSize: 9.5, fontWeight: 800, letterSpacing: '.02em',
                    }}
                  >
                    {m.short}
                    {realMonth.id === m.id && (
                      <span style={{ position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: readableOn(m.color) }} />
                    )}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: theme.colors.dim, lineHeight: 1.5 }}>
              <strong style={{ color: theme.colors.text, fontWeight: 700 }}>{month.label}</strong>
              {', '}{phase.label.toLowerCase()}. A altura de cada barra acompanha o quanto a vegetação está
              enfolhada no mês, apurado ao longo de quarenta anos; o ponto marca o mês de hoje.
            </div>
          </div>

          {/* foto da fase do mês */}
          <figure style={{ margin: '0 0 22px' }}>
            <img
              src={phase.photo}
              alt={`Caatinga na fase ${phase.label.toLowerCase()}`}
              style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12, display: 'block', border: `1px solid ${theme.colors.border}` }}
            />
            <figcaption style={{ fontSize: 11, fontWeight: 500, color: theme.colors.caption, marginTop: 6 }}>
              {phase.label}, foto de {phase.photoDate}. Acervo do projeto.
            </figcaption>
          </figure>

          {/* passos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
            {STEPS.map((st) => (
              <div key={st.n} style={{ display: 'flex', gap: 10 }}>
                <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 999, background: theme.colors.accentBg, color: theme.colors.accentInk, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{st.n}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{st.t}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: theme.colors.dim, lineHeight: 1.45 }}>{st.d}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={close}
            className="ui-press"
            style={{ background: theme.colors.accent, color: theme.colors.onAccent, border: 'none', borderRadius: 999, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Começar a explorar
          </button>

          {/* logos */}
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${theme.colors.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: theme.colors.caption, textTransform: 'uppercase', marginBottom: 10 }}>Realização e apoio</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              {LOGOS.map((l) => (
                <div key={l.alt} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', border: `1px solid ${theme.colors.border}` }}>
                  <img src={l.src} alt={l.alt} style={{ height: 30, width: 'auto', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
