'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import ReportDocument from './ReportDocument'
import { buildReportTheme } from '@/config/mapa/platforms'
import type { ReportAnalysis, ReportShell } from '@/types/relatorio'

export interface ReportClientProps {
  recorteId: string
  feicaoId:  string
  year:      string
  layerIds:  string[]
}

/**
 * How many analyses are measured at once.
 *
 * Two, not more. Each one is up to two live Earth Engine reductions, and the
 * per-IP rate limiter in lib/mapa/rateLimit.ts is shared with the map's own
 * requests; eight in parallel would spend the budget and start answering 429 to
 * the sections still queued.
 */
const CONCURRENCY = 2

type Status = 'loading' | 'ready' | 'error'

/**
 * Every report route answers in English (`'Invalid recorte.'`, `'Recorte not
 * found.'`, …): those strings are for logs and for developers, not for the
 * reader of a printable document, so they are never rendered. This maps the
 * HTTP status to a key of `RelatorioClient.errors` instead, translated at
 * render time so the message follows the language; `payload.error` is still
 * logged to the console for diagnosis.
 */
type ErrorKey = 'badRequest' | 'notFound' | 'rateLimited' | 'generic' | 'shellFailed' | 'analysisFailed'

/** An error carrying the key of its message rather than the message itself. */
class ReportError extends Error {
  constructor(readonly key: ErrorKey) {
    super(key)
  }
}

function errorKeyForStatus(status: number): ErrorKey {
  if (status === 400) return 'badRequest'
  // The message says "área" and not "feição": "feição" is the codebase's word
  // for a vector feature, not a word to show a reader.
  if (status === 404) return 'notFound'
  if (status === 429) return 'rateLimited'
  return 'generic'
}

export default function ReportClient({ recorteId, feicaoId, year, layerIds }: ReportClientProps) {
  const t = useTranslations('RelatorioClient')
  const theme = useMemo(() => buildReportTheme(), [])
  const [shell, setShell] = useState<ReportShell | null>(null)
  // Initialised to 'loading' rather than written on effect entry: writing
  // state as the first statement of an effect's async body runs synchronously
  // before the first await, which react-hooks/set-state-in-effect flags as an
  // error in this project. Only the success and failure paths below write it,
  // and both sit after an await.
  const [shellStatus, setShellStatus] = useState<Status>('loading')
  const [shellError, setShellError] = useState<ErrorKey | null>(null)
  const [analyses, setAnalyses] = useState<Map<string, ReportAnalysis>>(new Map())
  const [pending, setPending] = useState<Set<string>>(new Set())
  // Holds message keys (see ErrorKey), translated where they are rendered.
  const [errors, setErrors] = useState<Map<string, ErrorKey>>(new Map())
  const [expired, setExpired] = useState(false)
  const query = useMemo(
    () => ({ recorte: recorteId, feicao: feicaoId, ano: year }),
    [recorteId, feicaoId, year],
  )
  const camadas = useMemo(() => layerIds.join(','), [layerIds])

  // The canonical query string handed to ReportDocument for its expired-session
  // link. Built from these props, not from window.location.search: the
  // document is rendered once on the server, where window is undefined, and
  // that render must not throw precisely when the session has expired, which
  // is the case this link exists for.
  const queryString = useMemo(
    () => new URLSearchParams({ recorte: recorteId, feicao: feicaoId, ano: year, camadas }).toString(),
    [recorteId, feicaoId, year, camadas],
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadShell() {
      try {
        const params = new URLSearchParams({ ...query, camadas })
        const res = await fetch(`/api/mapa/relatorio/base?${params}`, { signal: controller.signal })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          console.error('[ReportClient] /base failed:', res.status, payload?.error)
          throw new ReportError(errorKeyForStatus(res.status))
        }
        setShell(await res.json() as ReportShell)
        setShellStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) return
        setShellError(err instanceof ReportError ? err.key : 'shellFailed')
        setShellStatus('error')
      }
    }

    void loadShell()
    return () => controller.abort()
  }, [query, camadas])

  const fetchAnalysis = useCallback(async (layerId: string, signal?: AbortSignal) => {
    setPending((prev) => new Set(prev).add(layerId))
    setErrors((prev) => {
      const next = new Map(prev)
      next.delete(layerId)
      return next
    })

    try {
      const params = new URLSearchParams({ ...query, camada: layerId })
      const res = await fetch(`/api/mapa/relatorio/analise?${params}`, { signal })
      // A session that expired mid-generation would otherwise raise the same
      // notice once per section.
      if (res.status === 401) {
        setExpired(true)
        return
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        console.error(`[ReportClient] /analise (${layerId}) failed:`, res.status, payload?.error)
        throw new ReportError(errorKeyForStatus(res.status))
      }
      const analysis = await res.json() as ReportAnalysis
      setAnalyses((prev) => new Map(prev).set(layerId, analysis))
    } catch (err) {
      if (signal?.aborted) return
      setErrors((prev) => new Map(prev).set(
        layerId,
        err instanceof ReportError ? err.key : 'analysisFailed',
      ))
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(layerId)
        return next
      })
    }
  }, [query])

  // The queue runs once per shell. A ref guards it because the effect's
  // dependencies include a callback that changes with the query, and
  // re-entering would measure everything twice.
  const startedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!shell) return
    const signature = `${camadas}|${query.recorte}|${query.feicao}|${query.ano}`
    if (startedRef.current === signature) return
    startedRef.current = signature

    const controller = new AbortController()
    const queue = shell.analyses.map((a) => a.layerId)

    async function worker() {
      for (;;) {
        const layerId = queue.shift()
        if (!layerId || controller.signal.aborted) return
        await fetchAnalysis(layerId, controller.signal)
      }
    }

    void Promise.all(Array.from({ length: CONCURRENCY }, worker))
    return () => {
      controller.abort()
      // Clears the guard along with the abort, so React StrictMode's
      // mount -> effect -> cleanup -> effect double-invocation in
      // development restarts the queue on the second effect instead of
      // finding a stale signature and never starting any worker.
      startedRef.current = null
    }
  }, [shell, camadas, query, fetchAnalysis])

  const translatedErrors = useMemo(
    () => new Map([...errors].map(([layerId, key]) => [layerId, t(`errors.${key}`)])),
    [errors, t],
  )

  if (shellStatus === 'error') {
    return (
      <main className="report-paper">
        <h1>{t('failureTitle')}</h1>
        <p>{shellError && t(`errors.${shellError}`)}</p>
        <p className="report-no-print">
          <a href="/mapa">{t('backToMaps')}</a>
        </p>
      </main>
    )
  }

  if (!shell) {
    return <main className="report-paper"><p>{t('loading')}</p></main>
  }

  return (
    <ReportDocument
      theme={theme}
      shell={shell}
      analyses={analyses}
      pending={pending}
      errors={translatedErrors}
      expired={expired}
      query={queryString}
      onRetry={(layerId) => void fetchAnalysis(layerId)}
    />
  )
}
