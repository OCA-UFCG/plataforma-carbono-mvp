'use client'

import { useLocale, useTranslations } from 'next-intl'
import TypeCards from './TypeCards'
import { soonText } from '@/config/territorios/chooserScript'
import { TERRITORY_TYPES, type TerritoryType } from '@/config/territorios/story'

export interface IntroScreenProps {
  onSelect:    (type: TerritoryType) => void
  /** Focused when the visitor comes back from the chooser or the story. */
  headingRef?: React.Ref<HTMLHeadingElement>
}

const SOON_TYPES = TERRITORY_TYPES.filter((type) => !type.enabled)

// The home's SiteHeader sits above this screen, outside <main> (TerritoriosApp).
// The band imitates PageIntro, which takes no ref for the heading and requires
// an intro paragraph this screen does without.
export default function IntroScreen({ onSelect, headingRef }: IntroScreenProps) {
  const t = useTranslations('TerritoriosIntro')
  const types = useTranslations('TerritoriosTypes')
  const locale = useLocale()
  const soonLabels = SOON_TYPES.map((type) => types(`types.${type.id}.label`))

  return (
    <div className="territorios-intro">
      <div className="territorios-intro-faixa">
        <div className="container territorios-intro-faixa-conteudo">
          <p className="territorios-intro-sobretitulo text-subtle-medium">{t('eyebrow')}</p>
          <h1 ref={headingRef} tabIndex={-1} className="territorios-intro-titulo text-h2">{t('title')}</h1>
        </div>
      </div>
      <div className="container territorios-intro-corpo">
        <TypeCards onSelect={onSelect} />
        {soonLabels.length > 0 && (
          <p className="territorios-intro-embreve">{soonText(soonLabels, (key, values) => t(key, values), locale)}</p>
        )}
      </div>
    </div>
  )
}
