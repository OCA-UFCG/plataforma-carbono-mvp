'use client'

// The recharts-free shells of the results cards: the wrapper every chart sits
// in, plus the two states that have no chart to show. They live apart from
// StatsChart.tsx so a component can render a skeleton or an error without a
// static import of that module, which would drag recharts -- ~370 KB -- into
// the map bundle alongside the charts it only loads on demand.

import type { PlatformTheme } from '@/types/mapa'

// Error (stats request failed): a sentence in the result's own body style.

export function ErrorCard({ theme, message }: { theme: PlatformTheme; message: string }) {
  return (
    <p role="alert" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.4, color: theme.colors.body }}>
      {message}
    </p>
  )
}

// Skeleton (while stats are loading), shaped like a result: the headline, the
// box of secondary figures and the bars.

export function SkeletonChart({ theme }: { theme: PlatformTheme }) {
  const c = theme.colors
  const bar = (width: string, height: number) => (
    <div className="skeleton-shimmer" style={{ width, height, borderRadius: 6, background: c.chip }} />
  )
  return (
    <div role="status" aria-label="Carregando resultado" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {bar('70%', 56)}
      <div style={{ height: 76, border: `1px solid ${c.border}`, borderRadius: 12, background: c.bgCard }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[80, 60, 40].map((w) => <div key={w}>{bar(`${w}%`, 10)}</div>)}
      </div>
    </div>
  )
}

// Shared card wrapper

export function CardBox({
  title,
  caption,
  theme,
  children,
}: {
  title: string
  caption?: string
  theme: PlatformTheme
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: theme.colors.accentBg,
        border: `1px solid ${theme.colors.accent}`,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        // `minWidth: 0` lets the card shrink to fit the flex parent
        // (ResultsSidebar). Without it, ResponsiveContainer can measure
        // the parent as -1 on first render and warn in the console.
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{
            fontSize: 12.5,
            color: theme.colors.textDim,
            fontFamily: "var(--font-raleway), sans-serif",
          }}
        >
          {title}
        </span>
        {caption && (
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: theme.colors.text,
              fontFamily: "var(--font-raleway), sans-serif",
            }}
          >
            {caption}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
