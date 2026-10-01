'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import SiteHeader from '@/components/marketing/SiteHeader'
import IntroScreen from './IntroScreen'
import StepRail from './StepRail'
import StorySummary from './StorySummary'
import type { LandUseYear } from './StoryMap'
import ThemeStep, { type ThemeLoad } from './ThemeStep'
import { useActiveSection } from './useActiveSection'
import {
  BIOMA_FEATURE_ID,
  BIOMA_RECORTE_ID,
  LAND_USE_YEARS,
  STEPS,
  STORY_THEMES,
  territoryTypeByRecorte,
  type TerritoryType,
} from '@/config/territorios/story'
import { TERRITORY_SCRIPT } from '@/config/territorios/storyScript'
import { wantedThemes } from '@/lib/territorios/activeSection'
import type { StepId, TerritoryPayload, ThemeId, ThemeResponse } from '@/types/territorios'

// MapLibre needs WebGL and window.
const StoryMap = dynamic(() => import('./StoryMap'), {
  ssr: false,
  loading: () => <div className="territorios-mapa" />,
})

function ChooserLoading() {
  const t = useTranslations('TerritoriosChooser')
  return <p className="territorios-contagem" role="status">{t('loading')}</p>
}

// The chooser draws every territory of the type on a MapLibre map as well.
const TerritoryChooser = dynamic(() => import('./TerritoryChooser'), {
  ssr: false,
  loading: () => <ChooserLoading />,
})

export interface TerritoriosAppProps {
  initialRecorte: string
  initialFeicao:  string
  initialEtapa:   string
}

/**
 * Theme requests in flight at once. Two, for the reason ReportClient gives:
 * each one can be a live Earth Engine reduction, and the per-IP rate limiter is
 * shared with the tile requests of the same story.
 */
const CONCURRENCY = 2

type TerritoryLoad =
  | { key: string; kind: 'ready'; payload: TerritoryPayload }
  | { key: string; kind: 'failed'; rateLimited: boolean }

type SettledLoad = Exclude<ThemeLoad, { kind: 'loading' }>

interface ThemeLoads {
  key:      string | null
  entries:  Partial<Record<ThemeId, SettledLoad>>
  /** Themes whose retry button cleared the entry; requested whichever section is settled. */
  retrying: ThemeId[]
}

interface Scheduler {
  key:        string
  controller: AbortController
  queue:      ThemeId[]
  inFlight:   Set<ThemeId>
}

/** The phone layout of territorios.css, where the map opens as a sheet. */
const PHONE_QUERY = '(max-width: 767px)'

function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const isPhone = () => window.matchMedia(PHONE_QUERY).matches

const THEME_IDS = STORY_THEMES.map((t) => t.id)
const LOADING: ThemeLoad = { kind: 'loading' }
const NO_RETRIES: ThemeId[] = []

function enabledType(recorteId: string): TerritoryType | null {
  const type = territoryTypeByRecorte(recorteId)
  return type?.enabled ? type : null
}

function isStep(value: string): value is StepId {
  return (STEPS as string[]).includes(value)
}

function isTheme(step: StepId): step is ThemeId {
  return (THEME_IDS as string[]).includes(step)
}

function initialStep(etapa: string): StepId {
  return isStep(etapa) ? etapa : 'territorio'
}

/** A new screen starts at its top, not at the offset the previous, longer one left. */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' })
}

/** Path and query of a story screen, for the address bar and the login link. */
function storyPath(type: TerritoryType | null, featureId: string, step: StepId): string {
  const params = new URLSearchParams()
  if (type?.recorteId) params.set('recorte', type.recorteId)
  if (type?.recorteId && featureId) {
    params.set('feicao', featureId)
    params.set('etapa', step)
  }
  const query = params.toString()
  return query ? `/territorios?${query}` : '/territorios'
}

export default function TerritoriosApp({ initialRecorte, initialFeicao, initialEtapa }: TerritoriosAppProps) {
  const ui = useTranslations('TerritoriosUi')
  const names = useTranslations('TerritoriosTypes')
  const [type, setType] = useState<TerritoryType | null>(() => enabledType(initialRecorte))
  const [featureId, setFeatureId] = useState(() => {
    const restored = enabledType(initialRecorte)
    if (restored?.recorteId === BIOMA_RECORTE_ID) return BIOMA_FEATURE_ID
    return restored ? initialFeicao : ''
  })
  const [expired, setExpired] = useState(false)

  const [territoryLoad, setTerritoryLoad] = useState<TerritoryLoad | null>(null)
  const [territoryAttempt, setTerritoryAttempt] = useState(0)
  const [themeLoads, setThemeLoads] = useState<ThemeLoads>({ key: null, entries: {}, retrying: [] })
  /** The territory printed from a section other than the summary, which then wants every theme. */
  const [printedKey, setPrintedKey] = useState<string | null>(null)

  const introHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const storyHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const mapColumnRef = useRef<HTMLDivElement | null>(null)
  /** Stands for the map column on a phone, where the map never sits over the text. */
  const noMapRef = useRef<HTMLDivElement | null>(null)
  const closeMapRef = useRef<HTMLButtonElement | null>(null)
  /** The "Ver no mapa" button that opened the sheet, which gets the focus back. */
  const mapOpenerRef = useRef<HTMLButtonElement | null>(null)
  const schedulerRef = useRef<Scheduler | null>(null)
  /** The step from the address, scrolled to once the first territory is laid out. */
  const restoreRef = useRef<StepId | null>(initialStep(initialEtapa))
  /** Set when the visitor changes screen, since the control they used unmounts with the old one. */
  const moveFocusRef = useRef(false)

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

  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false)
  /** The step the phone's map sheet shows; null while it is closed. */
  const [sheetStep, setSheetStep] = useState<StepId | null>(null)
  const sheetOpen = phone && sheetStep !== null
  const [landUseYear, setLandUseYear] = useState<LandUseYear>(LAND_USE_YEARS[LAND_USE_YEARS.length - 1])
  /**
   * The phone mounts the map on the first "Ver no mapa" and keeps it, so the
   * story costs no tile until the visitor asks for the map. One instance, moved
   * between the column and the sheet by CSS alone.
   */
  const [mapMounted, setMapMounted] = useState(false)
  /** The step the sheet was last opened on, which the map keeps while closed. */
  const [lastSheetStep, setLastSheetStep] = useState<StepId | null>(null)
  if (!phone && !mapMounted) setMapMounted(true)

  const { active, settled, scrollToStep, resetTo } = useActiveSection({
    steps:   STEPS,
    initial: initialStep(initialEtapa),
    bodyRef,
    mapRef:  phone ? noMapRef : mapColumnRef,
    enabled: payload !== null,
  })

  // On a computer the map follows the section; on a phone it keeps the step it
  // was opened on, and a closed sheet asks for nothing.
  const mapStep = phone ? lastSheetStep ?? settled : settled

  const openMap = useCallback((step: StepId, opener: HTMLButtonElement) => {
    mapOpenerRef.current = opener
    setMapMounted(true)
    setLastSheetStep(step)
    setSheetStep(step)
  }, [])

  const closeMap = useCallback(() => setSheetStep(null), [])

  useEffect(() => {
    if (!sheetOpen) return
    closeMapRef.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMap()
    }
    // The page behind the sheet stays where the visitor left it.
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      root.style.overflow = overflow
      // Here and not in closeMap: until this render commits, the button still
      // sits in an inert subtree and refuses the focus.
      if (mapOpenerRef.current?.isConnected) mapOpenerRef.current.focus({ preventScroll: true })
      mapOpenerRef.current = null
    }
  }, [sheetOpen, closeMap])

  const onUnauthorized = useCallback(() => setExpired(true), [])

  // The page restores its own step from the address; the browser's restored
  // offset would land on another section once the charts change the heights.
  useEffect(() => {
    window.history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    window.history.replaceState(null, '', storyPath(type, featureId, settled))
  }, [type, featureId, settled])

  useEffect(() => {
    if (!moveFocusRef.current) return
    const target = screen === 'intro' ? introHeadingRef.current
      : screen === 'story' && payload ? storyHeadingRef.current
        : null
    if (!target) return
    moveFocusRef.current = false
    target.focus({ preventScroll: true })
  }, [screen, payload])

  useEffect(() => {
    if (!payload || !restoreRef.current) return
    const step = restoreRef.current
    restoreRef.current = null
    if (step !== STEPS[0]) scrollToStep(step, 'instant')
  }, [payload, scrollToStep])

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

    // A theme queued for a section the visitor has already left would hold back
    // the ones now wanted; the requests in flight finish.
    scheduler.queue = scheduler.queue.filter((theme) => themes.includes(theme))
    for (const theme of themes) {
      if (!scheduler.inFlight.has(theme) && !scheduler.queue.includes(theme)) scheduler.queue.push(theme)
    }
    pump()
  }, [])

  // Printing from any section outputs the summary, whose cards still loading
  // stay off the sheet; every theme is then requested for the next print.
  useEffect(() => {
    if (!territoryKey) return
    const onBeforePrint = () => setPrintedKey(territoryKey)
    window.addEventListener('beforeprint', onBeforePrint)
    return () => window.removeEventListener('beforeprint', onBeforePrint)
  }, [territoryKey])

  // Follows the settled section, not the active one, so scrolling past a
  // section asks for nothing. Failures stay until their retry button clears them.
  const missingThemes = useMemo(() => {
    if (!payload || expired) return []
    const sectionThemes = printedKey === territoryKey ? THEME_IDS : wantedThemes(settled)
    const wanted = new Set([...sectionThemes, ...retrying])
    return [...wanted].filter((theme) => !entries[theme])
  }, [payload, expired, printedKey, territoryKey, settled, retrying, entries])

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

  function chooseType(next: TerritoryType) {
    if (!next.enabled || !next.recorteId) return
    setType(next)
    scrollToTop()
    if (next.recorteId === BIOMA_RECORTE_ID) chooseTerritory(BIOMA_FEATURE_ID)
    else setFeatureId('')
  }

  function chooseTerritory(id: string) {
    setSheetStep(null)
    restoreRef.current = null
    moveFocusRef.current = true
    setFeatureId(id)
    resetTo(STEPS[0])
    scrollToTop()
  }

  function changeTerritory() {
    setSheetStep(null)
    restoreRef.current = null
    moveFocusRef.current = true
    setType(null)
    setFeatureId('')
    resetTo(STEPS[0])
    scrollToTop()
  }

  const loads = Object.fromEntries(
    THEME_IDS.map((theme) => [theme, entries[theme] ?? LOADING]),
  ) as Record<ThemeId, ThemeLoad>

  const storyStep = (step: Exclude<StepId, 'resumo'>, i: number) => (
    <ThemeStep
      key={step}
      step={step}
      territory={payload!}
      type={type!}
      load={isTheme(step) ? loads[step] : LOADING}
      expired={expired}
      onRetry={() => { if (isTheme(step)) retryTheme(step) }}
      onNext={() => scrollToStep(STEPS[i + 1])}
      onShowMap={(opener) => openMap(step, opener)}
      mapOpen={sheetOpen && sheetStep === step}
      landUseYear={step === 'uso' && !phone ? { year: landUseYear, onChange: setLandUseYear } : undefined}
    />
  )

  return (
    <>
      {/* Outside <main>, where a <header> keeps its banner role. The home's
          SiteHeader works here because the layout loads globals.css, which holds
          the .container, .text-* and .sr-only classes it relies on; its links
          cross into the (marketing) root layout as full page loads. */}
      {screen === 'intro' && <SiteHeader />}
      {expired && (
        <p className="territorios-aviso territorios-no-print" role="alert">
          {ui('sessionExpired')}{' '}
          <a href={`/login?redirect=${encodeURIComponent(storyPath(type, featureId, settled))}`}>{ui('signIn')}</a>
        </p>
      )}

      <main className={screen === 'story' ? 'territorios territorios--historia' : 'territorios'}>
        {screen === 'intro' && <IntroScreen onSelect={chooseType} headingRef={introHeadingRef} />}

        {screen === 'search' && type && (
          <TerritoryChooser
            key={type.id}
            type={type}
            onChoose={chooseTerritory}
            onBack={changeTerritory}
            onUnauthorized={onUnauthorized}
          />
        )}

        {screen === 'story' && type && (
          <>
            <StepRail current={active} onSelect={scrollToStep} inert={sheetOpen} />

            <header className="territorios-cabecalho territorios-no-print" inert={sheetOpen}>
              <div>
                <p className="territorios-rotulo">{names(`types.${type.id}.unitLabel`)}</p>
                <h1 ref={storyHeadingRef} tabIndex={-1} className="territorios-nome">
                  {payload ? TERRITORY_SCRIPT.title(payload.featureName, type.id === 'estado' ? undefined : payload.context) : ui('pageTitle')}
                </h1>
              </div>
              <button type="button" className="territorios-btn territorios-btn--contorno" onClick={changeTerritory}>
                {ui('changeTerritory')}
              </button>
            </header>

            {!territory && (
              <p className="territorios-estado" role="status" style={{ marginTop: 28 }}>{ui('loading')}</p>
            )}

            {territory?.kind === 'failed' && (
              <div className="territorios-estado" role="status" style={{ marginTop: 28 }}>
                <p>{territory.rateLimited ? ui('rateLimited') : ui('territoryUnavailable')}</p>
                {!expired && (
                  <button
                    type="button"
                    className="territorios-btn territorios-btn--contorno"
                    onClick={() => { setTerritoryLoad(null); setTerritoryAttempt((n) => n + 1) }}
                  >
                    {ui('retry')}
                  </button>
                )}
              </div>
            )}

            {payload && (
              <div ref={bodyRef}>
                <div className="territorios-historia">
                  <div className="territorios-secoes" inert={sheetOpen}>
                    {STEPS.map((step, i) => step === 'resumo' ? null : storyStep(step, i))}
                  </div>

                  {sheetOpen && <div className="territorios-folha-fundo" aria-hidden="true" onClick={closeMap} />}

                  {/* The one MapLibre instance of the whole story: a column on a
                      computer, a sheet over the page on a phone. */}
                  <div
                    ref={mapColumnRef}
                    className="territorios-historia-mapa territorios-no-print"
                    data-aberta={sheetOpen || undefined}
                    {...(sheetOpen ? {
                      role: 'dialog',
                      'aria-modal': true,
                      'aria-label': ui('mapDialog', { step: names(`steps.${mapStep}`) }),
                    } : {})}
                  >
                    {sheetOpen && (
                      <div className="territorios-folha-topo">
                        <p className="territorios-folha-titulo">{names(`steps.${mapStep}`)}</p>
                        <button
                          ref={closeMapRef}
                          type="button"
                          className="territorios-btn territorios-btn--contorno"
                          onClick={closeMap}
                        >
                          {ui('closeMap')}
                        </button>
                      </div>
                    )}
                    {mapMounted && (
                      <StoryMap
                        territory={payload}
                        step={mapStep}
                        landUseYear={landUseYear}
                        onLandUseYear={setLandUseYear}
                        yearSwitch={phone}
                        cooperative={!phone}
                        onUnauthorized={onUnauthorized}
                      />
                    )}
                  </div>
                </div>

                <div inert={sheetOpen}>
                  <StorySummary
                    territory={payload}
                    type={type}
                    loads={loads}
                    expired={expired}
                    onRetry={retryTheme}
                    onAnotherTerritory={changeTerritory}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
