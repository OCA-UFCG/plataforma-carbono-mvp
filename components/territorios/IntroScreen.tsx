'use client'

import TypeCards from './TypeCards'
import { INTRO } from '@/config/territorios/chooserScript'
import type { TerritoryType } from '@/config/territorios/story'

export interface IntroScreenProps {
  onSelect:    (type: TerritoryType) => void
  /** Focused when the visitor comes back from the chooser or the story. */
  headingRef?: React.Ref<HTMLHeadingElement>
}

// The home's SiteHeader sits above this screen, outside <main> (TerritoriosApp).
// The band imitates PageIntro, which takes no ref for the heading and requires
// an intro paragraph this screen does without.
export default function IntroScreen({ onSelect, headingRef }: IntroScreenProps) {
  return (
    <div className="territorios-intro">
      <div className="territorios-intro-faixa">
        <div className="container territorios-intro-faixa-conteudo">
          <p className="territorios-intro-sobretitulo text-subtle-medium">{INTRO.eyebrow}</p>
          <h1 ref={headingRef} tabIndex={-1} className="territorios-intro-titulo text-h2">{INTRO.title}</h1>
        </div>
      </div>
      <div className="container territorios-intro-corpo">
        <TypeCards onSelect={onSelect} />
      </div>
    </div>
  )
}
