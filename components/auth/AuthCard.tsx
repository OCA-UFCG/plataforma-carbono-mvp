import type { CSSProperties, ReactNode } from 'react'

/**
 * The card every page of the (auth) group sits on: the login card's gradient, cream panel and
 * Caativar mark, plus the input, label and button styles the forms share. No hooks, so server
 * pages and client components both render it.
 */

export const authColors = {
  ink: '#26241d',
  muted: '#6b6a60',
  label: '#39382f',
  accent: '#5f7030',
  card: '#fffdf7',
  border: '#cfcbbd',
  error: '#a12b22',
} as const

export const authStyles = {
  form: { display: 'grid', gap: 18 },
  label: { display: 'grid', gap: 7, color: authColors.label, fontSize: 13, fontWeight: 700 },
  input: { boxSizing: 'border-box', width: '100%', border: `1px solid ${authColors.border}`, borderRadius: 9, padding: '12px 13px', font: 'inherit' },
  hint: { margin: 0, color: authColors.muted, fontSize: 12, fontWeight: 400, lineHeight: 1.45 },
  error: { margin: 0, color: authColors.error, fontSize: 13, lineHeight: 1.4 },
  status: { margin: 0, color: authColors.muted, fontSize: 13, lineHeight: 1.4 },
  link: { color: authColors.accent, fontSize: 14, fontWeight: 700 },
  footer: { margin: '22px 0 0', color: authColors.muted, fontSize: 14, lineHeight: 1.5 },
} satisfies Record<string, CSSProperties>

export function primaryButtonStyle(busy: boolean): CSSProperties {
  return { border: 0, borderRadius: 9, padding: '13px 16px', background: authColors.accent, color: '#fff', cursor: busy ? 'wait' : 'pointer', font: 'inherit', fontWeight: 800, opacity: busy ? .7 : 1 }
}

export function secondaryButtonStyle(busy: boolean): CSSProperties {
  return { border: `1px solid ${authColors.accent}`, borderRadius: 9, padding: '11px 16px', background: 'transparent', color: authColors.accent, cursor: busy ? 'wait' : 'pointer', font: 'inherit', fontWeight: 700, opacity: busy ? .7 : 1 }
}

/** A next/link drawn as the primary button, for a card whose only action is to go somewhere. */
export const linkButtonStyle: CSSProperties = { ...primaryButtonStyle(false), display: 'block', textAlign: 'center', textDecoration: 'none' }

interface AuthCardProps {
  title: string
  description?: ReactNode
  /** 420 for every card; the approvals panel passes 960 for its table. */
  width?: number
  children?: ReactNode
}

export default function AuthCard({ title, description, width = 420, children }: AuthCardProps) {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(140deg, #20281d 0%, #3d482c 48%, #c5813e 160%)' }}>
      <section style={{ width: `min(100%, ${width}px)`, padding: '40px', borderRadius: 20, background: authColors.card, boxShadow: '0 24px 60px rgba(0,0,0,.28)' }}>
        <div aria-label="Caativar" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: authColors.ink, fontWeight: 800 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 9, background: authColors.accent, color: '#fff' }}>O</span>
          Caativar
        </div>
        <h1 style={{ margin: description ? '36px 0 8px' : '36px 0 24px', color: authColors.ink, fontSize: 28, lineHeight: 1.15 }}>{title}</h1>
        {description ? <p style={{ margin: '0 0 28px', color: authColors.muted, fontSize: 15, lineHeight: 1.5 }}>{description}</p> : null}
        {children}
      </section>
    </main>
  )
}
