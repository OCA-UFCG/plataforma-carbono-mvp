'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import ReportSection from './ReportSection'
import { useReportMapCaptureQueue } from './useReportMapCaptureQueue'
import { layerMetaText } from '@/config/mapa/layerMeta'
import { intlLocale } from '@/lib/mapa/locale'
import { numero } from '@/lib/mapa/format'
import { useMapaText } from '@/lib/mapa/useMapaText'
import type { PlatformTheme } from '@/types/mapa'
import type { ReportAnalysis, ReportShell } from '@/types/relatorio'

export interface ReportDocumentProps {
  theme:    PlatformTheme
  shell:    ReportShell
  analyses: Map<string, ReportAnalysis>
  pending:  Set<string>
  errors:   Map<string, string>
  expired:  boolean
  /**
   * The canonical query string (recorte, feicao, ano, camadas), for the
   * expired-session notice's link back to /login. Passed by ReportClient
   * rather than read from window.location.search, since this component is
   * server-rendered once, where window is undefined.
   */
  query:    string
  onRetry:  (layerId: string) => void
}

export default function ReportDocument({
  theme, shell, analyses, pending, errors, expired, query, onRetry,
}: ReportDocumentProps) {
  const t = useTranslations('RelatorioDocument')
  const locale = useLocale()
  const tx = useMapaText()
  const c = theme.colors
  const [captured, setCaptured] = useState<Map<string, string | null>>(new Map())
  // The captures are serialized: six MapLibre instances rendering at once
  // exhausts the browser's WebGL contexts and some of them come back blank.
  const { activeKey, onCaptured } = useReportMapCaptureQueue(
    shell.analyses.map((a) => a.layerId),
    (layerId) => analyses.get(layerId)?.status === 'available',
  )
  const generatedAt = new Date(shell.generatedAt).toLocaleDateString(intlLocale(locale))
  // A section is settled once it has an analysis or a terminal error — not
  // only on a 2xx. Counting only `analyses` would leave the print button
  // disabled forever whenever a section ends in `errors`: the rest of the
  // document stands and must still be printable.
  const done = shell.analyses.filter(
    (a) => analyses.has(a.layerId) || errors.has(a.layerId),
  ).length

  // Only an available analysis renders a map, so only those are waited on. A
  // section that came back unavailable or year_not_found shows no frame and
  // would otherwise hold the button forever.
  const withMap = shell.analyses.filter(
    (a) => analyses.get(a.layerId)?.status === 'available',
  )
  // `has`, not a truthy value: a failed capture stores null and is still
  // settled — the frame carries its own message and the document prints.
  const mapsDone = withMap.filter((a) => captured.has(a.layerId)).length
  const analysesReady = done === shell.analyses.length
  const ready = analysesReady && mapsDone === withMap.length

  const progress = !analysesReady
    ? t('progress.analyses', { done, total: shell.analyses.length })
    : withMap.length === 0
      ? t('progress.noMaps')
      : ready
        ? t('progress.ready', { analyses: shell.analyses.length, maps: withMap.length })
        : t('progress.maps', { done: mapsDone, total: withMap.length })

  return (
    <>
      <div className="report-toolbar report-no-print">
        <span style={{ fontSize: 14, color: c.textDim }} aria-live="polite">
          {progress}
        </span>
        <span style={{ display: 'flex', gap: 12 }}>
          <a href="/mapa" style={{ color: c.accentInk, fontSize: 14 }}>{t('backToMaps')}</a>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            // Printing before the captures finish would put blank frames on
            // paper, so the reason for the wait is spelled out rather than
            // leaving a greyed button with no explanation.
            title={ready ? undefined : t('printDisabledHint')}
            style={{
              padding: '6px 14px', font: 'inherit', fontSize: 14, borderRadius: 4,
              border: 'none', cursor: ready ? 'pointer' : 'default',
              color: c.onAccent, background: c.accent,
              opacity: ready ? 1 : 0.5,
            }}
          >
            {t('print')}
          </button>
        </span>
      </div>

      {expired && (
        <p
          className="report-no-print"
          style={{ margin: 0, padding: '10px 16px', background: c.accentBg, color: c.accentInk }}
        >
          {t('expired.prefix')}{' '}
          <a href={`/login?redirect=${encodeURIComponent(`/relatorio?${query}`)}`}>
            {t('expired.link')}
          </a>{' '}
          {t('expired.suffix')}
        </p>
      )}

      <main className="report-paper">
        <header>
          <div
            style={{
              padding: '12px 20px', textAlign: 'center',
              color: c.onAccent, background: c.accent,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 21, textTransform: 'uppercase' }}>
              {t('title')}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.85 }}>
              {t('byline')}
            </p>
          </div>

          <dl
            className="report-block"
            style={{
              display: 'grid', gap: 0, gridTemplateColumns: '170px 1fr',
              margin: '20px 0 0', border: `1px solid ${c.border}`, fontSize: 14,
            }}
          >
            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.body, background: c.mist }}>
              {t('fields.analysisArea')}
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {/* The state comes along when the recorte declares one: on its own
                  "Bom Jesus" names three different municipalities of the Caatinga,
                  and the document outlives the form that picked it. */}
              <strong>{shell.recorte.featureName}</strong>
              {shell.recorte.featureContext ? ` (${shell.recorte.featureContext})` : ''}
              {' — '}{shell.recorte.layerName}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.body, background: c.mist }}>
              {t('fields.area')}
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {numero(shell.recorte.areaHa, 0, locale)} ha
              {shell.recorte.boundary === 'simplified' && (
                <span style={{ color: c.textDim }}> {t('simplifiedBoundary')}</span>
              )}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.body, background: c.mist }}>
              {t('fields.referenceYear')}
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {shell.requestedYear}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.body, background: c.mist }}>
              {t('fields.generatedOn')}
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {generatedAt}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.body, background: c.mist }}>
              {t('fields.variables')}
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {shell.analyses.map((a) => a.name).join(' · ')}
            </dd>
          </dl>
        </header>

        {shell.analyses.map((descriptor, index) => (
          <ReportSection
            key={descriptor.layerId}
            theme={theme}
            index={index}
            recorte={shell.recorte}
            descriptor={descriptor}
            analysis={analyses.get(descriptor.layerId)}
            pending={pending.has(descriptor.layerId)}
            error={errors.get(descriptor.layerId) ?? null}
            onRetry={() => onRetry(descriptor.layerId)}
            mapSrc={captured.get(descriptor.layerId) ?? undefined}
            mapActive={activeKey === descriptor.layerId}
            onMapCapture={(src) => {
              setCaptured((prev) => new Map(prev).set(descriptor.layerId, src))
              onCaptured(descriptor.layerId)
            }}
          />
        ))}

        <section className="report-section" style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${c.border}` }}>
          <h2 className="report-heading" style={{ margin: 0, fontSize: 18, color: c.textDim }}>
            {t('methodology.title')}
          </h2>
          <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6, color: c.body }}>
            {shell.analyses.map((descriptor) => (
              <p key={descriptor.layerId} style={{ margin: '0 0 8px' }}>
                <strong>{descriptor.name}:</strong> {descriptor.methodology}{' '}
                {t('methodology.source')}: {layerMetaText(descriptor.layerId, tx)?.source ?? descriptor.source}.
              </p>
            ))}
            <p style={{ margin: '16px 0 0', color: c.textDim }}>
              {t('methodology.disclaimer')}
            </p>
          </div>
        </section>

        <footer style={{ marginTop: 40, paddingTop: 12, borderTop: `1px solid ${c.border}`, fontSize: 11, color: c.textDim }}>
          {t('footer', { date: generatedAt })}
        </footer>
      </main>
    </>
  )
}
