import { flushSync } from 'react-dom'
import type { Config, PopoverDOM } from 'driver.js'
import { useStore } from '@/lib/mapa/store'
import { fichaHeadline } from '@/lib/mapa/ficha'
import { isMeasuredRaster } from '@/lib/mapa/analysisTargets'
import type { LayerConfig } from '@/types/mapa'
import { TOUR_COPY } from './tourCopy'

/** The options driver.js hands a popover hook; the package does not export the type. */
export type HookOpts = Parameters<NonNullable<Config['onPopoverRender']>>[1]

/** A new element with an optional class and text, never through innerHTML. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * Swaps the footer's "Passo 3 de 8" for a row of dots, the current one
 * stretched. The text stays, visually hidden, for screen readers.
 */
function renderProgressDots(dom: PopoverDOM, { config, index }: HookOpts) {
  const total = config.steps?.length ?? 0
  if (index === undefined || total === 0) return

  const label = el('span', 'caativar-tour-sr-only', dom.progress.textContent ?? '')
  const dots = el('span', 'caativar-tour-dots')
  dots.setAttribute('aria-hidden', 'true')
  for (let step = 0; step < total; step++) {
    const dot = el('span', 'caativar-tour-dot')
    if (step < index) dot.classList.add('caativar-tour-dot-done')
    if (step === index) dot.classList.add('caativar-tour-dot-current')
    dots.append(dot)
  }
  dom.progress.replaceChildren(label, dots)
}

/**
 * Tidies the balloon on every step. Its footer is a `<footer>` outside
 * `<main>`, which screen readers would count as a second page footer (the
 * fix SEDES made for the same reason).
 */
export function renderPopover(dom: PopoverDOM, opts: HookOpts): void {
  dom.footer.setAttribute('role', 'none')
  renderProgressDots(dom, opts)
}

/**
 * The welcome step points at nothing: driver.js centres the balloon on an
 * empty div and marks that div as opening a dialog, attributes a div without
 * a role may not carry. Runs after the highlight, once they are set.
 */
export function clearDummyElementAria(element?: Element): void {
  if (element) return
  const dummy = document.getElementById('driver-dummy-element')
  dummy?.removeAttribute('aria-haspopup')
  dummy?.removeAttribute('aria-expanded')
  dummy?.removeAttribute('aria-controls')
}

/** The layer of the first card in the panel, the one steps 4 and 5 point at. */
function firstCardLayer(): LayerConfig | undefined {
  const id = document.querySelector('[data-tour="layer-info"]')?.getAttribute('data-layer-id')
  return id ? useStore.getState().layers.find((layer) => layer.id === id) : undefined
}

/**
 * Below step 5's text, a preview of the first layer's ficha: its name, the
 * period and resolution chips, and the start of its summary. A copy, not the
 * real "i": the ficha opens a column that would move the map under the tour.
 */
export function renderLayerPreview(dom: PopoverDOM): void {
  const layer = firstCardLayer()
  if (!layer) return
  const { summary, chips } = fichaHeadline(layer.id)

  const preview = el('div', 'caativar-tour-preview')
  preview.append(el('strong', undefined, layer.name))
  if (chips.length > 0) {
    const row = el('span', 'caativar-tour-chips')
    for (const chip of chips) row.append(el('span', 'caativar-tour-chip', chip))
    preview.append(row)
  }
  if (summary) preview.append(el('p', undefined, summary))
  dom.description.after(preview)
}

/**
 * Below step 6's text, what the Resultado panel brings, with no numbers: the
 * tour never measures anything, so nothing here may read as a real value.
 * Named after the first card's layer when that layer is one Resultado
 * measures; otherwise the list stands alone.
 */
export function renderResultPreview(dom: PopoverDOM): void {
  const preview = el('div', 'caativar-tour-preview')
  const layer = firstCardLayer()
  if (layer && isMeasuredRaster(layer)) {
    preview.append(el('span', 'caativar-tour-preview-label', 'Resultado'))
    preview.append(el('strong', undefined, layer.name))
  }
  const list = el('ul', 'caativar-tour-preview-list')
  for (const item of TOUR_COPY.result.items) list.append(el('li', undefined, item))
  preview.append(list)
  dom.description.after(preview)
}

/**
 * Opens the folds the steps point into: Território, then the first theme of
 * the layer list. Both render nothing while closed, so each click is flushed
 * at once, and the next query (and driver.js) find the content in the DOM.
 *
 * @returns whether anything opened, for the caller to let the layout settle.
 */
export function revealTourTargets(): boolean {
  const togglers = [
    document.querySelector<HTMLElement>('[data-tour-reveal="territory"]'),
    document.querySelector<HTMLElement>('[data-tour-reveal="theme"]'),
  ]
  let opened = false
  for (const toggler of togglers) {
    if (toggler?.getAttribute('aria-expanded') !== 'false') continue
    flushSync(() => toggler.click())
    opened = true
  }
  return opened
}
