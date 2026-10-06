import type { ReactNode, Ref } from 'react'
import '@/app/territorios-relatorio.css'

export interface ReportBandProps {
  eyebrow:    string
  title:      string
  /** Takes the focus after a change of screen. */
  headingRef: Ref<HTMLHeadingElement>
  /** The badges and buttons on its right; none on the gallery. */
  children?:  ReactNode
}

/**
 * The section's title band (Figma 19254:37414), which stays while the body
 * below it changes. With actions, the titles and the actions share one row,
 * aligned on their bottom edge.
 */
export default function ReportBand({ eyebrow, title, headingRef, children }: ReportBandProps) {
  const className = children
    ? 'territorios-secao-faixa territorios-secao-faixa--acoes territorios-no-print'
    : 'territorios-secao-faixa territorios-no-print'
  return (
    <div className={className}>
      <div className="container territorios-secao-faixa-conteudo">
        <div className="territorios-secao-faixa-titulos">
          <p className="territorios-secao-sobretitulo text-subtle-medium">{eyebrow}</p>
          <h2 id="territorios-secao-titulo" ref={headingRef} tabIndex={-1} className="territorios-secao-titulo text-h2">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  )
}
