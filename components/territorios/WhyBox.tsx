/* eslint-disable @next/next/no-img-element -- fixed-size icons */
import { UI_ICONS } from '@/config/territorios/icons'
import { UI, type LinkedText } from '@/config/territorios/storyScript'

export interface WhyBoxProps {
  title:  string
  text:   LinkedText
  source: string
  /** Glossário term the linked word opens. */
  glossarySlug: string
  /** Heading level of the title: 4 in a tab, 5 in the summary. */
  level?: 4 | 5
}

/**
 * Under a theme's answer: why the theme matters for carbon, with one word
 * leading to its Glossário term, and where the data comes from.
 */
export default function WhyBox({ title, text, source, glossarySlug, level = 4 }: WhyBoxProps) {
  const Heading = level === 4 ? 'h4' : 'h5'
  return (
    <aside className="territorios-porque">
      <img src={UI_ICONS.tree} alt="" width={24} height={24} />
      <div>
        <Heading className="territorios-porque-titulo">{title}</Heading>
        <p className="territorios-porque-texto">
          {text.before}
          {text.term && (
            // A new tab keeps the report open; the Glossário lives in another
            // root layout, so a plain link.
            <a href={`/glossario?termo=${glossarySlug}`} target="_blank" rel="noopener">
              {text.term}
              <img src={UI_ICONS.externalLink} alt={`(${UI.newTab})`} width={14} height={14} />
            </a>
          )}
          {text.after}
        </p>
        <p className="territorios-porque-fonte">
          <b>{UI.sourceLabel}</b> {source}
        </p>
      </div>
    </aside>
  )
}
