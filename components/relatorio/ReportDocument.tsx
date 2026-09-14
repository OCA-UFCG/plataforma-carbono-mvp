'use client'

import { useState } from 'react'
import ReportSection from './ReportSection'
import { useReportMapCaptureQueue } from './useReportMapCaptureQueue'
import { numero } from '@/lib/mapa/format'
import { LAYER_META } from '@/config/mapa/layerMeta'
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
  const c = theme.colors
  const [captured, setCaptured] = useState<Map<string, string | null>>(new Map())
  // The captures are serialized: six MapLibre instances rendering at once
  // exhausts the browser's WebGL contexts and some of them come back blank.
  const { activeKey, onCaptured } = useReportMapCaptureQueue(
    shell.analyses.map((a) => a.layerId),
    (layerId) => analyses.get(layerId)?.status === 'available',
  )
  const generatedAt = new Date(shell.generatedAt).toLocaleDateString('pt-BR')
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
    ? `${done} de ${shell.analyses.length} análises prontas`
    : withMap.length === 0
      ? 'Nenhum mapa a gerar'
      : ready
        ? `${shell.analyses.length} análises e ${withMap.length} mapas prontos`
        : `${mapsDone} de ${withMap.length} mapas gerados`

  return (
    <>
      <div className="report-toolbar report-no-print">
        <span style={{ fontSize: 14, color: c.textDim }} aria-live="polite">
          {progress}
        </span>
        <span style={{ display: 'flex', gap: 12 }}>
          <a href="/mapa" style={{ color: c.accentInk, fontSize: 14 }}>Voltar aos mapas</a>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            // Printing before the captures finish would put blank frames on
            // paper, so the reason for the wait is spelled out rather than
            // leaving a greyed button with no explanation.
            title={ready ? undefined : 'Disponível quando todas as análises e mapas terminarem'}
            style={{
              padding: '6px 14px', font: 'inherit', fontSize: 14, borderRadius: 4,
              border: 'none', cursor: ready ? 'pointer' : 'default',
              color: c.onAccent, background: c.accent,
              opacity: ready ? 1 : 0.5,
            }}
          >
            Imprimir ou salvar em PDF
          </button>
        </span>
      </div>

      {expired && (
        <p
          className="report-no-print"
          style={{ margin: 0, padding: '10px 16px', background: c.accentBg, color: c.accentInk }}
        >
          Sua sessão expirou.{' '}
          <a href={`/login?redirect=${encodeURIComponent(`/relatorio?${query}`)}`}>
            Entrar novamente
          </a>{' '}
          para completar o relatório.
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
              Relatório territorial de carbono
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.85 }}>
              Plataforma Carbono Caatinga — Observatório da Caatinga, OCA / UFCG-INSA
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
              Área de análise
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
              Área
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {numero(shell.recorte.areaHa, 0)} ha
              {shell.recorte.boundary === 'simplified' && (
                <span style={{ color: c.textDim }}> (limite simplificado)</span>
              )}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.body, background: c.mist }}>
              Ano de referência
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {shell.requestedYear}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.body, background: c.mist }}>
              Gerado em
            </dt>
            <dd style={{ margin: 0, padding: '10px 12px', borderLeft: `1px solid ${c.border}` }}>
              {generatedAt}
            </dd>

            <dt style={{ padding: '10px 12px', fontWeight: 700, color: c.body, background: c.mist }}>
              Variáveis
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
            Notas metodológicas e fontes
          </h2>
          <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6, color: c.body }}>
            {shell.analyses.map((descriptor) => (
              <p key={descriptor.layerId} style={{ margin: '0 0 8px' }}>
                <strong>{descriptor.name}:</strong> {descriptor.methodology}{' '}
                Fonte: {LAYER_META[descriptor.layerId]?.source ?? descriptor.source}.
              </p>
            ))}
            <p style={{ margin: '16px 0 0', color: c.textDim }}>
              Documento gerado automaticamente a partir de estatística zonal calculada no
              Google Earth Engine sobre o recorte indicado. Os números refletem os dados
              disponíveis na data de geração.
            </p>
          </div>
        </section>

        <footer style={{ marginTop: 40, paddingTop: 12, borderTop: `1px solid ${c.border}`, fontSize: 11, color: c.textDim }}>
          Plataforma Carbono Caatinga · OCA / UFCG-INSA · gerado em {generatedAt}
        </footer>
      </main>
    </>
  )
}
