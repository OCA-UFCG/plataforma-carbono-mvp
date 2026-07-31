/**
 * Ícones lineares do handoff "Design profissional responsivo Caatinga".
 * SVGs Lucide/Feather (viewBox 24, stroke-width 2, cantos/pontas arredondados)
 * inlinados EXATAMENTE como no protótipo, para fidelidade independente da
 * versão do react-icons. Todos aceitam { size, color, strokeWidth, style }.
 */
import type { CSSProperties, ReactNode } from 'react'

export interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
  style?: CSSProperties
  className?: string
  title?: string
}

function line(paths: ReactNode, defaultSw = 2) {
  function Ic({ size = 16, color = 'currentColor', strokeWidth, style, className, title }: IconProps) {
    return (
      <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={strokeWidth ?? defaultSw}
        strokeLinecap="round" strokeLinejoin="round"
        style={style} className={className} aria-hidden={title ? undefined : true}
        role={title ? 'img' : undefined}
      >
        {title ? <title>{title}</title> : null}
        {paths}
      </svg>
    )
  }
  return Ic
}

export const IcLeaf = line(<>
  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
</>)

export const IcChevronDown  = line(<path d="m6 9 6 6 6-6" />)
export const IcChevronUp    = line(<path d="m18 15-6-6-6 6" />)
export const IcChevronLeft  = line(<path d="m15 18-6-6 6-6" />)
export const IcChevronRight = line(<path d="m9 18 6-6-6-6" />)

export const IcSearch = line(<>
  <circle cx="11" cy="11" r="8" />
  <path d="m21 21-4.3-4.3" />
</>)

export const IcCheck = line(<path d="M20 6 9 17l-5-5" />)

export const IcX = line(<>
  <path d="M18 6 6 18" />
  <path d="m6 6 12 12" />
</>)

export const IcMapPin = line(<>
  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
  <circle cx="12" cy="10" r="3" />
</>)

// "Recortes territoriais", caixa/gema (só o contorno, como no protótipo)
export const IcBox = line(<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />)

// "Carbono e ambiente", camadas
export const IcLayers = line(<>
  <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.84Z" />
  <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
  <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
</>)

export const IcArrowUpRight = line(<>
  <path d="M7 7h10v10" />
  <path d="M7 17 17 7" />
</>)

export const IcPlus  = line(<>
  <path d="M5 12h14" />
  <path d="M12 5v14" />
</>)
export const IcMinus = line(<path d="M5 12h14" />)

// geolocalização (locate-fixed, como no protótipo: círculo r7 + 4 marcas)
export const IcLocate = line(<>
  <circle cx="12" cy="12" r="7" />
  <path d="M22 12h-3" />
  <path d="M5 12H2" />
  <path d="M12 5V2" />
  <path d="M12 22v-3" />
</>)

// tela cheia (4 cantos)
export const IcMaximize = line(<>
  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
</>)

// norte, seta preenchida do protótipo (não é stroke)
export function IcNorth({ size = 15, color = 'currentColor', style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} className={className} aria-hidden>
      <path d="M12 3l5.5 15-5.5-3.6L6.5 18z" fill={color} stroke="none" />
    </svg>
  )
}

export const IcDownload = line(<>
  <path d="M12 15V3" />
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  <path d="m7 10 5 5 5-5" />
</>)

export const IcInfo = line(<>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 16v-4" />
  <path d="M12 8h.01" />
</>)

// desenho (pen, como no protótipo)
export const IcPen = line(<>
  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
  <path d="m15 5 4 4" />
</>)

// mapa base
export const IcMap = line(<>
  <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
  <path d="M15 5.764v15" />
  <path d="M9 3.236v15" />
</>)

export const IcList = line(<>
  <path d="M3 5h.01" /><path d="M3 12h.01" /><path d="M3 19h.01" />
  <path d="M8 5h13" /><path d="M8 12h13" /><path d="M8 19h13" />
</>)

// estatística (barras), aba recolhida do painel de resultados
export const IcBarChart = line(<>
  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
  <path d="M18 17V9" />
  <path d="M13 17V5" />
  <path d="M8 17v-3" />
</>)

export const IcMoon = line(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />)
export const IcSun = line(<>
  <circle cx="12" cy="12" r="4" />
  <path d="M12 2v2" /><path d="M12 20v2" />
  <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
  <path d="M2 12h2" /><path d="M20 12h2" />
  <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
</>)
