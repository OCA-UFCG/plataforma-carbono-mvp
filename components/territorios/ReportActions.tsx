'use client'

/* eslint-disable @next/next/no-img-element -- fixed-size icons exported from Figma */
import { useEffect, useState } from 'react'
import '@/app/territorios-relatorio.css'
import { INTRO, REPORT } from '@/config/territorios/chooserScript'
import { UI_ICONS } from '@/config/territorios/icons'
import type { TerritoryType } from '@/config/territorios/story'
import { UI } from '@/config/territorios/storyScript'

export interface LocationBadge {
  /** The territory as the band names it, or "Caatinga" for the bioma. */
  value:  string
  /** Back to the chooser; null for the bioma, which has nothing else to choose. */
  onEdit: (() => void) | null
}

export interface ReportActionsProps {
  type:         TerritoryType
  /** Back to the gallery of types. */
  onChangeType: () => void
  /** null while a territory is being chosen; left out while the chosen one loads. */
  location?:    LocationBadge | null
  /** Title the share sheet gives the link; null while there is no report to share. */
  shareTitle:   string | null
  /** Prints the summary; null while there is no report to print. */
  onDownload:   (() => void) | null
  /** Set while the summary waits for its last themes before printing. */
  downloading:  boolean
}

type ShareNotice = 'copied' | 'failed' | null

/**
 * The right side of the report's title band (Figma 19254:37431): the recorte
 * and the location as badges, each opening the screen that changes it, then
 * "Baixar" and "Compartilhar". Before a territory is chosen the location reads
 * "escolher" and both buttons are disabled (19254:37382).
 */
export default function ReportActions({
  type, onChangeType, location, shareTitle, onDownload, downloading,
}: ReportActionsProps) {
  const [notice, setNotice] = useState<ShareNotice>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  async function share(title: string) {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
      } catch {
        // Closing the share sheet rejects too; there is nothing to report.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setNotice('copied')
    } catch {
      setNotice('failed')
    }
  }

  const unit = type.unitLabel.toLocaleLowerCase('pt-BR')

  return (
    <div className="territorios-acoes">
      <button type="button" className="territorios-selo" onClick={onChangeType}>
        <span>{REPORT.cut}: <b>{unit}</b></span>
        <span className="territorios-sr">. {INTRO.changeType}</span>
        <img src={UI_ICONS.edit} alt="" width={24} height={24} />
      </button>

      {location === null && (
        <p className="territorios-selo">{REPORT.location}: {REPORT.locationPending}</p>
      )}
      {location?.onEdit && (
        <button type="button" className="territorios-selo" onClick={location.onEdit}>
          <span>{REPORT.location}: <b>{location.value}</b></span>
          <span className="territorios-sr">. {UI.changeTerritory}</span>
          <img src={UI_ICONS.edit} alt="" width={24} height={24} />
        </button>
      )}
      {location && !location.onEdit && (
        <p className="territorios-selo">{REPORT.location}: <b>{location.value}</b></p>
      )}

      <button
        type="button"
        className="territorios-acao territorios-acao--baixar"
        disabled={!onDownload}
        aria-busy={downloading || undefined}
        onClick={onDownload ?? undefined}
      >
        {REPORT.download}
        <img src={UI_ICONS.download} alt="" width={16} height={16} />
      </button>
      <button
        type="button"
        className="territorios-acao territorios-acao--compartilhar"
        disabled={shareTitle === null}
        onClick={() => { if (shareTitle !== null) void share(shareTitle) }}
      >
        {UI.share}
        <img src={shareTitle === null ? UI_ICONS.shareDisabled : UI_ICONS.share} alt="" width={16} height={16} />
      </button>

      <p className="territorios-aviso-link" role="status">
        {notice === 'copied' ? UI.linkCopied : notice === 'failed' ? UI.copyFailed : ''}
      </p>
    </div>
  )
}
