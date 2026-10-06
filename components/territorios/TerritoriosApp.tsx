'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReportActions, { type LocationBadge } from './ReportActions'
import ReportBand from './ReportBand'
import ReportTabs from './ReportTabs'
import StorySummary from './StorySummary'
import type { LandUseYear } from './StoryMap'
import ThemeStep, { type ThemeLoad } from './ThemeStep'
import TypeCards from './TypeCards'
import {
  BIOMA_FEATURE_ID,
  BIOMA_RECORTE_ID,
  LAND_USE_YEARS,
  STORY_THEMES,
  territoryTypeByRecorte,
  type TerritoryType,
} from '@/config/territorios/story'
import { CHOOSER, INTRO, REPORT } from '@/config/territorios/chooserScript'
import { TERRITORY_SCRIPT, UI } from '@/config/territorios/storyScript'
import { readyToPrint, sectionId, stalePrintRequest, stepFromQuery, storyPath, wantedThemes } from '@/lib/territorios/storyTabs'
import type { StepId, TerritoryPayload, ThemeId, ThemeResponse } from '@/types/territorios'

// MapLibre needs WebGL and window.
const StoryMap = dynamic(() => import('./StoryMap'), {
  ssr: false,
  loading: () => <div className="territorios-mapa" />,
})

// The chooser draws every territory of the type on a MapLibre map as well.
const TerritoryChooser = dynamic(() => import('./TerritoryChooser'), {
  ssr: false,
  loading: () => <p className="territorios-contagem" role="status">{CHOOSER.loading}</p>,
})

export interface TerritoriosAppProps {
  initialRecorte: string
  initialFeicao:  string
  initialEtapa:   string
}

/**
 * Theme requests in flight at once. Two, for the reason ReportClient gives:
 * each one can be a live Earth Engine reduction, and the per-IP rate limiter is
 * shared with the tile requests of the same report.
 */
const CONCURRENCY = 2

type TerritoryLoad =
  | { key: string; kind: 'ready'; payload: TerritoryPayload }
  | { key: string; kind: 'failed'; rateLimited: boolean }

type SettledLoad = Exclude<ThemeLoad, { kind: 'loading' }>

interface ThemeLoads {
  key:      string | null
  entries:  Partial<Record<ThemeId, SettledLoad>>
  /** Themes whose retry button cleared the entry; requested whichever tab is open. */
  retrying: ThemeId[]
}

interface Scheduler {
  key:        string
  controller: AbortController
  queue:      ThemeId[]
  inFlight:   Set<ThemeId>
}

/** The steps the map draws; the summary has no map of its own. */
type MapStep = Exclude<StepId, 'resumo'>

const THEME_IDS = STORY_THEMES.map((t) => t.id)
const LOADING: ThemeLoad = { kind: 'loading' }
const NO_RETRIES: ThemeId[] = []

function typeOf(recorteId: string): TerritoryType | null {
  return territoryTypeByRecorte(recorteId) ?? null
}

function isTheme(step: StepId): step is ThemeId {
  return (THEME_IDS as string[]).includes(step)
}

/** Type and territory an address names; the bioma has a single feature. */
function stateFromQuery(params: URLSearchParams): { type: TerritoryType | null; featureId: string } {
  const type = typeOf(params.get('recorte') ?? '')
  if (type?.recorteId === BIOMA_RECORTE_ID) return { type, featureId: BIOMA_FEATURE_ID }
  return { type, featureId: type ? params.get('feicao') ?? '' : '' }
}

/**
 * The whole Territórios tool as one section of a page: its title band stays,
 * and the body below it changes, from the gallery of types to the chooser and
 * the report (Figma 19254:37325). Each change of screen is an entry in the
 * browser's history; a change of tab replaces the current one.
 */
export default function TerritoriosApp({ initialRecorte, initialFeicao, initialEtapa }: TerritoriosAppProps) {
  const pathname = usePathname()
  const [type, setType] = useState<TerritoryType | null>(() => typeOf(initialRecorte))
  const [featureId, setFeatureId] = useState(() => {
    const restored = typeOf(initialRecorte)
    if (restored?.recorteId === BIOMA_RECORTE_ID) return BIOMA_FEATURE_ID
    return restored ? initialFeicao : ''
  })
  const [tab, setTab] = useState<StepId>(() => stepFromQuery(initialEtapa))
  /**
   * The step the map draws: the open tab's, kept through the summary so the map
   * is where the visitor left it on the way back.
   */
  const [mapStep, setMapStep] = useState<MapStep>(() => {
    const step = stepFromQuery(initialEtapa)
    return step === 'resumo' ? 'territorio' : step
  })
  if (tab !== 'resumo' && tab !== mapStep) setMapStep(tab)
  const [expired, setExpired] = useState(false)
  const [landUseYear, setLandUseYear] = useState<LandUseYear>(LAND_USE_YEARS[LAND_USE_YEARS.length - 1])

  const [territoryLoad, setTerritoryLoad] = useState<TerritoryLoad | null>(null)
  const [territoryAttempt, setTerritoryAttempt] = useState(0)
  const [themeLoads, setThemeLoads] = useState<ThemeLoads>({ key: null, entries: {}, retrying: [] })
  /** The territory printed with the browser's own command, which then wants every theme. */
  const [printedKey, setPrintedKey] = useState<string | null>(null)
  /** The territory whose summary "Baixar" prints once its last theme settles. */
  const [printKey, setPrintKey] = useState<string | null>(null)
  /** Counts the prints "Baixar" set off; each one prints after its commit. */
  const [printRun, setPrintRun] = useState(0)

  const sectionRef = useRef<HTMLElement | null>(null)
  const bandHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const schedulerRef = useRef<Scheduler | null>(null)
  /** Set when the visitor changes screen, since the control they used unmounts with the old one. */
  const moveFocusRef = useRef(false)
  /** Set by a panel's own button, which unmounts with the panel. */
  const focusPanelRef = useRef(false)

  const recorteId = type?.recorteId ?? null
  const territoryKey = recorteId && featureId ? `${recorteId}|${featureId}` : null
  // Loads are keyed by territory rather than reset on a change, so a stale
  // answer from the previous territory can never show under the new name.
  const territory = territoryLoad?.key === territoryKey ? territoryLoad : null
  const payload = territory?.kind === 'ready' ? territory.payload : null
  const entries = useMemo(
    () => (themeLoads.key === territoryKey ? themeLoads.entries : {}),
    [themeLoads, territoryKey],
  )
  const retrying = themeLoads.key === territoryKey ? themeLoads.retrying : NO_RETRIES
  const screen = !type ? 'intro' : !featureId ? 'search' : 'story'

  // Derived during render, as mapStep is: the print itself waits for the
  // effect below, once the summary holds the last answer. A request left on
  // another territory is dropped first.
  if (stalePrintRequest(printKey, territoryKey)) setPrintKey(null)
  if (readyToPrint(printKey, territoryKey, expired, entries)) {
    setPrintKey(null)
    setPrintRun((n) => n + 1)
  }

  useEffect(() => {
    if (printRun > 0) window.print()
  }, [printRun])

  const onUnauthorized = useCallback(() => setExpired(true), [])

  // Tabs replace the entry; screens push one (see goTo).
  useEffect(() => {
    window.history.replaceState(null, '', storyPath(pathname, recorteId, featureId, tab))
  }, [pathname, recorteId, featureId, tab])

  // After a change of screen the band's title takes the focus; the chooser
  // puts it on its own question, and the report waits for its territory.
  useEffect(() => {
    if (!moveFocusRef.current) return
    if (screen === 'search' || (screen === 'story' && !payload)) return
    moveFocusRef.current = false
    bandHeadingRef.current?.focus({ preventScroll: true })
  }, [screen, payload])

  // A panel's own buttons unmount with it; the new panel's title takes the focus.
  useEffect(() => {
    if (!focusPanelRef.current) return
    focusPanelRef.current = false
    document.getElementById(`${sectionId(tab)}-titulo`)?.focus({ preventScroll: true })
  }, [tab])

  useEffect(() => {
    if (!recorteId || !featureId) return
    const key = `${recorteId}|${featureId}`
    const controller = new AbortController()
    const params = new URLSearchParams({ recorte: recorteId, feicao: featureId })

    fetch(`/api/territorios/territorio?${params}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) setExpired(true)
        // A feature the server does not know came from a stale or edited
        // address: back to where a territory is chosen.
        if (res.status === 400 || res.status === 404) {
          setFeatureId('')
          if (recorteId === BIOMA_RECORTE_ID) setType(null)
          return
        }
        if (!res.ok) {
          setTerritoryLoad({ key, kind: 'failed', rateLimited: res.status === 429 })
          return
        }
        const body = await res.json() as TerritoryPayload
        if (!controller.signal.aborted) setTerritoryLoad({ key, kind: 'ready', payload: body })
      })
      .catch(() => {
        if (!controller.signal.aborted) setTerritoryLoad({ key, kind: 'failed', rateLimited: false })
      })

    return () => controller.abort()
  }, [recorteId, featureId, territoryAttempt])

  const requestThemes = useCallback((key: string, recorte: string, feicao: string, themes: ThemeId[]) => {
    let s = schedulerRef.current
    if (!s || s.key !== key || s.controller.signal.aborted) {
      if (themes.length === 0) return
      s?.controller.abort()
      s = { key, controller: new AbortController(), queue: [], inFlight: new Set() }
      schedulerRef.current = s
    }
    const scheduler = s

    const store = (theme: ThemeId, load: SettledLoad) => {
      if (scheduler.controller.signal.aborted) return
      setThemeLoads((prev) => {
        const same = prev.key === key
        return {
          key,
          entries:  { ...(same ? prev.entries : {}), [theme]: load },
          retrying: same ? prev.retrying.filter((t) => t !== theme) : [],
        }
      })
    }

    const load = async (theme: ThemeId) => {
      try {
        const params = new URLSearchParams({ recorte, feicao, tema: theme })
        const res = await fetch(`/api/territorios/tema?${params}`, { signal: scheduler.controller.signal })
        if (res.status === 401) {
          setExpired(true)
          scheduler.queue = []
        }
        if (!res.ok) {
          store(theme, { kind: 'failed', rateLimited: res.status === 429 })
          return
        }
        store(theme, { kind: 'ready', response: await res.json() as ThemeResponse })
      } catch {
        store(theme, { kind: 'failed', rateLimited: false })
      }
    }

    const pump = () => {
      while (scheduler.inFlight.size < CONCURRENCY && scheduler.queue.length > 0) {
        const theme = scheduler.queue.shift()!
        scheduler.inFlight.add(theme)
        void load(theme).finally(() => {
          scheduler.inFlight.delete(theme)
          if (!scheduler.controller.signal.aborted) pump()
        })
      }
    }

    // A theme queued for a tab the visitor has already left would hold back
    // the ones now wanted; the requests in flight finish.
    scheduler.queue = scheduler.queue.filter((theme) => themes.includes(theme))
    for (const theme of themes) {
      if (!scheduler.inFlight.has(theme) && !scheduler.queue.includes(theme)) scheduler.queue.push(theme)
    }
    pump()
  }, [])

  // The browser's own print command, from any tab, outputs the summary, whose
  // cards still loading stay off the sheet; every theme is then requested for
  // the next print.
  useEffect(() => {
    if (!territoryKey) return
    const onBeforePrint = () => setPrintedKey(territoryKey)
    window.addEventListener('beforeprint', onBeforePrint)
    return () => window.removeEventListener('beforeprint', onBeforePrint)
  }, [territoryKey])

  // Follows the open tab; "Baixar" and a print want every theme. Failures stay
  // until their retry button clears them.
  const missingThemes = useMemo(() => {
    if (!payload || expired) return []
    const everyTheme = territoryKey !== null && (printedKey === territoryKey || printKey === territoryKey)
    const tabThemes = everyTheme ? THEME_IDS : wantedThemes(tab)
    const wanted = new Set([...tabThemes, ...retrying])
    return [...wanted].filter((theme) => !entries[theme])
  }, [payload, expired, printedKey, printKey, territoryKey, tab, retrying, entries])

  // Called with an empty list too, which drops what is still queued.
  useEffect(() => {
    if (!recorteId || !featureId || !territoryKey) return
    requestThemes(territoryKey, recorteId, featureId, missingThemes)
  }, [missingThemes, recorteId, featureId, territoryKey, requestThemes])

  useEffect(() => () => schedulerRef.current?.controller.abort(), [territoryKey])

  const retryTheme = useCallback((theme: ThemeId) => {
    // With the session gone the request would only fail again; the banner
    // already says what to do.
    if (expired) return
    setThemeLoads((prev) => {
      if (!prev.entries[theme]) return prev
      const next = { ...prev.entries }
      delete next[theme]
      return { key: prev.key, entries: next, retrying: [...prev.retrying, theme] }
    })
  }, [expired])

  /** A new screen or tab starts at the top of the section, not where the previous one left the page. */
  const scrollToSection = useCallback(() => {
    const section = sectionRef.current
    if (section && section.getBoundingClientRect().top < 0) section.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [])

  /** Shows a screen of the section, without touching the history. */
  const show = useCallback((nextType: TerritoryType | null, nextFeature: string, step: StepId) => {
    moveFocusRef.current = true
    setType(nextType)
    setFeatureId(nextFeature)
    setTab(step)
    scrollToSection()
  }, [scrollToSection])

  function goTo(nextType: TerritoryType | null, nextFeature: string) {
    window.history.pushState(null, '', storyPath(pathname, nextType?.recorteId ?? null, nextFeature, 'territorio'))
    show(nextType, nextFeature, 'territorio')
  }

  // The browser's back and forward walk the same screens, and a report entry
  // reopens on the tab it was left at.
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)
      const next = stateFromQuery(params)
      show(next.type, next.featureId, stepFromQuery(params.get('etapa') ?? ''))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [show])

  function chooseType(next: TerritoryType) {
    goTo(next, next.recorteId === BIOMA_RECORTE_ID ? BIOMA_FEATURE_ID : '')
  }

  const chooseTerritory = (id: string) => goTo(type, id)

  const changeType = () => goTo(null, '')

  // The bioma has no chooser, so another one means another type.
  const changeTerritory = () => (type?.recorteId === BIOMA_RECORTE_ID ? changeType() : goTo(type, ''))

  /** A panel's own "next" button, which unmounts with the panel. */
  function openTab(step: StepId) {
    focusPanelRef.current = true
    setTab(step)
    scrollToSection()
  }

  /** "Baixar": asks for every theme, and prints once they have all settled. */
  function download() {
    if (territoryKey) setPrintKey(territoryKey)
  }

  const loads = Object.fromEntries(
    THEME_IDS.map((theme) => [theme, entries[theme] ?? LOADING]),
  ) as Record<ThemeId, ThemeLoad>

  const isBioma = type?.recorteId === BIOMA_RECORTE_ID
  const territoryTitle = payload && type
    ? TERRITORY_SCRIPT.title(payload.featureName, type.id === 'estado' ? undefined : payload.context)
    : null
  // The report names its territory; the gallery and the chooser keep the section's question.
  const bandTitle = screen === 'story' && territoryTitle ? territoryTitle : INTRO.title
  const location: LocationBadge | null | undefined =
    screen === 'search' ? null
      : isBioma ? { value: REPORT.biomeLocation, onEdit: null }
        : territoryTitle ? { value: territoryTitle, onEdit: changeTerritory }
          : undefined

  return (
    <section ref={sectionRef} className="territorios-secao" aria-labelledby="territorios-secao-titulo">
      <ReportBand eyebrow={INTRO.eyebrow} title={bandTitle} headingRef={bandHeadingRef}>
        {screen !== 'intro' && type && (
          <ReportActions
            type={type}
            onChangeType={changeType}
            location={location}
            shareTitle={screen === 'story' ? territoryTitle : null}
            onDownload={screen === 'story' && payload ? download : null}
            downloading={printKey !== null && printKey === territoryKey}
          />
        )}
      </ReportBand>

      {screen !== 'intro' && (
        <ReportTabs
          current={screen === 'search' ? 'localizacao' : tab}
          stepsEnabled={payload !== null}
          onLocation={screen === 'story' && !isBioma ? changeTerritory : null}
          onSelect={setTab}
        />
      )}

      {expired && (
        <p className="territorios-aviso territorios-no-print" role="alert">
          {UI.sessionExpired}{' '}
          <a href={`/login?redirect=${encodeURIComponent(storyPath(pathname, recorteId, featureId, tab))}`}>{UI.signIn}</a>
        </p>
      )}

      <div className="container territorios">
        {screen === 'intro' && <TypeCards onSelect={chooseType} />}

        {screen === 'search' && type && (
          <TerritoryChooser
            key={type.id}
            type={type}
            onChoose={chooseTerritory}
            onBack={changeType}
            onUnauthorized={onUnauthorized}
          />
        )}

        {screen === 'story' && type && (
          <>
            {!territory && <p className="territorios-estado" role="status">{UI.loading}</p>}

            {territory?.kind === 'failed' && (
              <div className="territorios-estado" role="status">
                <p>{territory.rateLimited ? UI.rateLimited : UI.territoryUnavailable}</p>
                {!expired && (
                  <button
                    type="button"
                    className="territorios-btn territorios-btn--contorno"
                    onClick={() => { setTerritoryLoad(null); setTerritoryAttempt((n) => n + 1) }}
                  >
                    {UI.retry}
                  </button>
                )}
              </div>
            )}

            {payload && (
              <>
                <div className="territorios-relatorio" hidden={tab === 'resumo'}>
                  {tab !== 'resumo' && (
                    <ThemeStep
                      key={tab}
                      step={tab}
                      territory={payload}
                      type={type}
                      load={isTheme(tab) ? loads[tab] : LOADING}
                      expired={expired}
                      onRetry={() => { if (isTheme(tab)) retryTheme(tab) }}
                      onBack={changeType}
                      onNext={openTab}
                      landUseYear={tab === 'uso' ? { year: landUseYear, onChange: setLandUseYear } : undefined}
                    />
                  )}
                  {/* The one MapLibre instance of the report, kept mounted across
                      the tabs; on the summary its column is hidden. */}
                  <div className="territorios-relatorio-mapa territorios-no-print">
                    <StoryMap
                      territory={payload}
                      step={mapStep}
                      landUseYear={landUseYear}
                      onLandUseYear={setLandUseYear}
                      onUnauthorized={onUnauthorized}
                    />
                  </div>
                </div>

                <StorySummary
                  hidden={tab !== 'resumo'}
                  territory={payload}
                  type={type}
                  loads={loads}
                  expired={expired}
                  onRetry={retryTheme}
                  onBack={changeType}
                />
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
