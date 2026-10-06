/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import '@/app/territorios-relatorio.css'
import { STEP_ICONS } from '@/config/territorios/icons'
import type { StepId } from '@/types/territorios'

/** A tab's icon in its 24 px box (Figma 19257:5752). Decorative: the title beside it names the tab. */
export default function StepIcon({ step }: { step: StepId }) {
  const icon = STEP_ICONS[step]
  return (
    <span className="territorios-icone" aria-hidden="true">
      <img src={icon.src} alt="" width={icon.width} height={icon.height} style={{ top: icon.top, left: icon.left }} />
    </span>
  )
}
