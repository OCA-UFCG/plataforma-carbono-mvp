'use client'

// The recharts-free shells of the results cards: the wrapper every chart sits
// in, plus the two states that have no chart to show. They live apart from
// StatsChart.tsx so a component can render a skeleton or an error without a
// static import of that module, which would drag recharts -- ~370 KB -- into
// the map bundle alongside the charts it only loads on demand.

import type { PlatformTheme } from '@/types/mapa'

// Error card (stats request failed)

export function ErrorCard({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
        fontFamily: "var(--font-raleway), sans-serif",
        fontSize: 12,
        color: '#b91c1c',
        lineHeight: 1.4,
      }}
    >
      {message}
    </div>
  )
}

// Skeleton loader (animated placeholder while stats are loading)

export function SkeletonChart({ theme }: { theme: PlatformTheme }) {
  return (
    <CardBox title="Carregando..." theme={theme}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {[60, 80, 45, 70, 55].map((width, i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{
              height: 10,
              width: `${width}%`,
              borderRadius: 3,
              background: theme.colors.bgCard,
            }}
          />
        ))}
      </div>
    </CardBox>
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
            fontSize: 11,
            color: theme.colors.textDim,
            fontFamily: "var(--font-raleway), sans-serif",
          }}
        >
          {title}
        </span>
        {caption && (
          <span
            style={{
              fontSize: 11,
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
