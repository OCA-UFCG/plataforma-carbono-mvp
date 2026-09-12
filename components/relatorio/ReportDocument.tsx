'use client'

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

export default function ReportDocument({ shell, analyses }: ReportDocumentProps) {
  return (
    <main className="report-paper">
      <h1>{shell.recorte.featureName}</h1>
      <p>{analyses.size} de {shell.analyses.length} análises carregadas.</p>
    </main>
  )
}
