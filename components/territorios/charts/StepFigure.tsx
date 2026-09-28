// The answer's figure: one big number with its unit beside it. Adapted from the
// `Hero` of components/mapa/results/blocks.tsx (commit c5eab2a, branch
// feat/resultados-por-camada), with the type from the home's tokens.
//
// Plain text rather than a <figure>: the number and unit read as they are.

import '@/app/territorios-graficos.css'

export interface StepFigureProps {
  value: string
  unit:  string
  /** Color of the number, a STEP_COLORS entry; the page ink when left out. */
  color?: string
}

export default function StepFigure({ value, unit, color }: StepFigureProps) {
  return (
    <p className="tg-step-figure">
      <span className="tg-step-figure-value" style={color ? { color } : undefined}>{value}</span>
      {unit && <span className="tg-step-figure-unit">{unit}</span>}
    </p>
  )
}
