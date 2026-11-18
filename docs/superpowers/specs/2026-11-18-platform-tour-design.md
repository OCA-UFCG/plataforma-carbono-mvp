# Platform tour — design

Date: 2026-11-18. Status: approved in conversation, pending doc approval.

## Intent

A guided tour of the platform (`/mapa`) like the one SEDES ships
(`SAP-frontend/src/components/PlatformTour/`): it opens by itself on the first
visit, darkens the screen and walks the visitor through the interface one
element at a time, and a button replays it later.

Why: keep the two OCA products alike. The steps, though, are written for the
partners now arriving by invite (PR #180): they land on an empty map, with no
layer on and no Resultado panel, and the tour has to show them how to get from
there to a result.

## Goals

- Same mechanics, look and accessibility fixes as SEDES's Monitoramento tour.
- Steps that teach the analysis flow: choose a recorte, turn a layer on, read
  the result.
- Replayable at any time.

## Non-goals

- No per-account "seen" record on the server: the browser remembers, as in
  SEDES.
- No phone design work (the site is desktop-first): the tour does not open by
  itself below 768px, and the replay button is left to work as it does.
- No English copy: the platform's UI is Portuguese-only, hard-coded, and the
  tour follows it.
- No opening animation (SEDES's `PlatformIntro`) and no per-section tours:
  Caativar has one area.

## Anti-goals

- The tour must not call Earth Engine or change the visitor's map: no layer
  turned on, no recorte selected, nothing left behind when it closes.
- No invented numbers presented as a result.

## Approaches

1. **Port SEDES's `driver.js` tour** (picked: "manter os dois produtos
   parecidos, segue o SEDES"). Same library and version (1.9.0), same hook
   shape, the CSS re-skinned in Caativar's tokens. It brings SEDES's fixes
   for free: the `<footer>` role, the dummy element's ARIA, the focus ring on
   "×", reduced motion, the screen-reader progress text.
2. A hand-built tour component. Full control of the look, but it re-solves
   positioning, focus and scrolling, and drifts from SEDES. Rejected.
3. A shared package for both products. The stacks differ (next-intl and
   Tailwind there, hard-coded strings and CSS modules here). Rejected.

For the Resultado step, two options were weighed:

- **(a) A preview in the balloon** (picked). The tour points at the map and the
  balloon shows what the Resultado panel brings, the way SEDES's "i" step
  previews the ficha. It ends with "ligue uma camada e clique num recorte no mapa" (a municipality would be wrong: only the biome is on at a first visit).
- (b) The tour turns a carbon stock layer on, selects the Caatinga and points
  at the real panel. Concrete, but the tour waits seconds on a cold GEE cache,
  can fail mid-tour, and changes the visitor's map. Rejected.

## Steps

| # | Points at | SEDES counterpart | Content |
|---|-----------|-------------------|---------|
| 1 | nothing (centered) | welcome | "Boas-vindas à Caativar", with the logo; "Começar" |
| 2 | the Território section | spatialScope | choose a recorte, search it by name, or click the map |
| 3 | "Delimitar recorte" / "Marcar ponto" | — (new) | draw your own area, or mark a point for its series |
| 4 | the first layer card | layerCard | the switch puts the layer on the map |
| 5 | the first layer's "i" | layerInfo | opens the ficha; preview below the text: name, chips, start of the summary |
| 6 | the map | — (new) | with a layer on, click a recorte (or draw one) and Resultado opens; preview of what it shows |
| 7 | "Mapa base" in the map controls | mapSettings | switch the base map |
| 8 | the replay button | replay | "Tudo pronto": to see it again, press the button |

Dropped from SEDES: "Três áreas de trabalho" (Caativar has one) and
"Territórios" (indigenous lands and the like are recortes here, so step 2
covers them).

## Decided

- Library `driver.js@1.9.0`; options as in SEDES: `disableActiveInteraction`,
  `overlayClickBehavior: 'none'` (leave by "×" or Esc), `waitForElement`,
  progress dots in place of "3/8".
- Auto-start on the first visit, ≥768px wide, after the page settles. "Seen" is
  marked when the tour opens, not when it ends, in `localStorage` under a
  versioned key (`caativar.platformTour.v1.seen`); storage failure counts as
  seen, as in SEDES.
- Steps point at `data-tour="…"` attributes, never at classes.
- The tour opens what it points into before pointing: the layer panel (it
  starts collapsed below 1180px), the Território section and the first theme.
- Copy in Portuguese, hard-coded beside the tour, with the platform's terms
  ("recorte", "ficha", "Resultado", "Delimitar recorte").

## My calls (not discussed)

- **Replay button**: a "?" in the map controls stack, labelled "Tutorial"
  (tooltip and accessible name). It is always on screen, whatever the panels
  do, and it keeps out of the site header, whose width budget is already spent
  at 1280px. SEDES keeps it in its side rail, which Caativar lacks.
- **Step 6 preview** carries no numbers: it lists what Resultado brings
  (statistics for the recorte, the chart, the download) under the name of the
  first measured layer, so nothing reads as a real value.
- **Overlay colour**: the deepest brand green instead of black, as SEDES uses
  its deepest olive.

## Left to the builder

- The tour's CSS values in Caativar's tokens (fonts, accent, radii).
- Balloon sides and alignment per step; where step 6's balloon lands over the
  map.
- The help icon's SVG (Material Symbols, like the other map icons).
- Unit tests for the pure parts (seen flag, step list, reveal helpers).
