'use client'

import { useId, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { searchCountText, searchResultsText } from '@/config/territorios/chooserScript'
import { TERRITORY_SCRIPT } from '@/config/territorios/storyScript'
import { contextIsUnique, matchTerritory } from '@/lib/mapa/searchMatch'

export interface SearchEntry {
  index:    number
  name:     string
  context?: string
}

export interface TerritorySearchProps {
  entries:  readonly SearchEntry[]
  /** Lowercase plural for the count line; null hides it. */
  plural:   string | null
  onPropose: (index: number) => void
  onShowMap: () => void
}

/** Same cap as the report form: 1210 municipalities do not fit in a list. */
const MAX_SUGGESTIONS = 40

export default function TerritorySearch({ entries, plural, onPropose, onShowMap }: TerritorySearchProps) {
  const [query, setQuery] = useState('')
  const t = useTranslations('TerritoriosChooser')
  const locale = useLocale()
  const translate = (key: string, values?: Record<string, string | number>) => t(key, values)
  const inputId = useId()

  // True on the states recorte, where "mg" finds Minas Gerais; false on the
  // others, where a bare UF would list every feature of that state.
  const contextIdentifies = useMemo(
    () => contextIsUnique(entries.map((f) => f.context)),
    [entries],
  )

  const trimmed = query.trim()
  // The map lists every territory already, so the list starts once a name is typed.
  const found = useMemo(() => {
    if (!trimmed) return []
    return entries.filter((f) => matchTerritory(trimmed, f.name, f.context, { contextIdentifies }))
  }, [entries, trimmed, contextIdentifies])
  const matches = found.slice(0, MAX_SUGGESTIONS)

  return (
    <div className="territorios-escolha-busca">
      <label className="territorios-campo" htmlFor={inputId}>{t('searchLabel')}</label>
      <input
        id={inputId}
        className="territorios-input"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div aria-live="polite">
        {!trimmed && plural && (
          <p className="territorios-contagem">{searchCountText(entries.length, plural, translate, locale)}</p>
        )}
        {trimmed && matches.length === 0 && (
          <p className="territorios-contagem">{t('searchEmpty', { query: trimmed })}</p>
        )}
        {/* The list below sits outside the live region; this line announces it. */}
        {trimmed && found.length > 0 && (
          <p className="territorios-sr">{searchResultsText(found.length, translate, locale)}</p>
        )}
      </div>

      {matches.length > 0 && (
        <ul className="territorios-resultados territorios-escolha-resultados">
          {matches.map((f) => (
            <li key={f.index}>
              <button type="button" className="territorios-resultado" onClick={() => onPropose(f.index)}>
                {TERRITORY_SCRIPT.title(f.name, f.context)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {trimmed && (
        <button type="button" className="territorios-escolha-link" onClick={onShowMap}>
          {t('searchToMap')}
        </button>
      )}
    </div>
  )
}
