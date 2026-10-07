import type { ReactNode, Ref } from 'react'
import '@/app/territorios-relatorio.css'

export interface ReportBandProps {
  title:      string
  /** Takes the focus after a change of screen. */
  headingRef: Ref<HTMLHeadingElement>
  /** A paragraph under the title; only the gallery has one. */
  lead?:      string
  /** The badges and buttons on its right; none on the gallery. */
  children?:  ReactNode
}

/**
 * The section's title band (Figma 19254:37414), which stays while the body
 * below it changes. With actions, the title and the actions share one row,
 * aligned on their bottom edge. The design's eyebrow, "Territórios", was
 * taken out on 2026-10-06.
 */
export default function ReportBand({ title, headingRef, lead, children }: ReportBandProps) {
  const className = children
    ? 'territorios-secao-faixa territorios-secao-faixa--acoes territorios-no-print'
    : 'territorios-secao-faixa territorios-no-print'
  return (
    <div className={className}>
      <div className="container territorios-secao-faixa-conteudo">
        <h2 id="territorios-secao-titulo" ref={headingRef} tabIndex={-1} className="territorios-secao-titulo text-h2">
          {title}
        </h2>
        {lead && <p className="territorios-secao-lead text-body">{lead}</p>}
        {children}
      </div>
    </div>
  )
}
