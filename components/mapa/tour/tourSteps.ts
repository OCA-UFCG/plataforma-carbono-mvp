import type { DriveStep, PopoverDOM } from 'driver.js'
import { TOUR_COPY } from './tourCopy'
import {
  renderLayerPreview,
  renderPopover,
  renderResultPreview,
  type HookOpts,
} from './tourDom'

export { TOUR_COPY }

/**
 * Kept in the browser, not on the account: enough for the tour not to come
 * back on every visit, with no per-user preference on the server. Bumping the
 * `v1` shows a changed tour to everyone again.
 */
export const PLATFORM_TOUR_SEEN_KEY = 'caativar.platformTour.v1.seen'

/** Below this width the platform is a phone fallback, and the tour waits for the "?". */
const AUTO_START_MIN_WIDTH = 768

export function hasSeenPlatformTour(): boolean {
  try {
    return window.localStorage.getItem(PLATFORM_TOUR_SEEN_KEY) === '1'
  } catch {
    // Without storage there is no remembering it was seen: better not to
    // open by itself than to open on every visit. The "?" still works.
    return true
  }
}

export function markPlatformTourSeen(): void {
  try {
    window.localStorage.setItem(PLATFORM_TOUR_SEEN_KEY, '1')
  } catch {
    // Seeing it again on the next visit is the worst that happens.
  }
}

/** A first visit at desktop width. */
export function shouldAutoStartTour(): boolean {
  return window.innerWidth >= AUTO_START_MIN_WIDTH && !hasSeenPlatformTour()
}

/** The welcome step's logo goes above its title. */
function renderWelcome(dom: PopoverDOM, opts: HookOpts) {
  // A step's own onPopoverRender replaces the config's, so it tidies too.
  renderPopover(dom, opts)
  const logo = document.createElement('img')
  logo.src = '/logos/caativar.svg'
  logo.alt = 'Caativar'
  logo.width = 113
  logo.height = 36
  logo.className = 'caativar-tour-logo'
  dom.title.before(logo)
}

/**
 * The eight steps, SEDES's Monitoramento tour told for an invited partner:
 * where to look, what to turn on, and where the result comes out.
 *
 * @example
 * driver({ steps: buildTourSteps(), ... }).drive()
 */
export function buildTourSteps(): DriveStep[] {
  const at = (target: string) => `[data-tour="${target}"]`

  return [
    {
      popover: {
        ...TOUR_COPY.welcome,
        nextBtnText: TOUR_COPY.start,
        showButtons: ['next', 'close'],
        onPopoverRender: renderWelcome,
      },
    },
    { element: at('territory'), popover: { ...TOUR_COPY.territory, side: 'right', align: 'start' } },
    { element: at('draw'), popover: { ...TOUR_COPY.draw, side: 'right', align: 'start' } },
    { element: at('layer-card'), popover: { ...TOUR_COPY.layerCard, side: 'right', align: 'start' } },
    {
      element: at('layer-info'),
      popover: {
        ...TOUR_COPY.layerInfo,
        side: 'right',
        align: 'start',
        onPopoverRender: (dom, opts) => {
          renderPopover(dom, opts)
          renderLayerPreview(dom)
        },
      },
    },
    {
      element: at('map'),
      popover: {
        title: TOUR_COPY.result.title,
        description: TOUR_COPY.result.description,
        onPopoverRender: (dom, opts) => {
          renderPopover(dom, opts)
          renderResultPreview(dom)
        },
      },
    },
    { element: at('basemap'), popover: { ...TOUR_COPY.basemap, side: 'left', align: 'start' } },
    { element: at('tour-replay'), popover: { ...TOUR_COPY.replay, side: 'left', align: 'end' } },
  ]
}
