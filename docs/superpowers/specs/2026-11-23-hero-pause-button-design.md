# Hero pause button

Approved 2026-11-23 ("pode fazer").

## Intent

The home hero rotates its four photos every 10 s. The user asked for a small
pause button next to the dots, so a visitor can stop the rotation. This
reverses the 2026-11-03 accessibility design's "no visible pause button on the
carousel" (`2026-11-03-accessibility-design.md`, §6F and §8) for the hero only.
It also gives WCAG 2.2.2 (Pause, Stop, Hide) a visible mechanism. The user
did not give the reason, so the Glossário scenes and that spec's §8 line are
left as they are.

## Goals

- A small toggle right after the dots, in the dots' translucent white, with
  ⏸ (two bars) while the photos rotate and ▶ while they are paused.
- A 24 px hit area. The drawn glyph stays small, like the dots.
- Once paused, the hero stays paused until the toggle is pressed again. A dot or
  an arrow changes the photo but does not resume.
- Under `prefers-reduced-motion: reduce` the rotation starts paused (as today)
  and the toggle shows ▶, so a visitor can opt in to the rotation.
- The accessible name says what the press will do: "Pausar a troca de fotos" /
  "Retomar a troca de fotos" in `messages/pt.json`, with English in
  `messages/en.json`. No `aria-pressed`, following the WAI carousel pattern.
- The state lasts for the visit (component state). Nothing is stored.
- Shown on phones too, next to the dots.

## Non-goals

- Pausing while the pointer is over the hero, and stopping after the first
  dot/arrow click (§6F of the accessibility spec). Not asked.
- Glossário scenes. `/acessibilidade` copy.

## Approach

There is one sensible way: the effective pause is the visitor's explicit choice,
or reduced motion when they have made none. The existing per-photo
`setTimeout` effect already returns early on `focusHeld` and on reduced
motion. The pause joins that guard, so there is no second timer. A pure helper
in `lib/marketing/heroRotation.ts` decides whether to rotate, so it can be
unit-tested without a DOM. The project's tests render with
`renderToStaticMarkup` in a node environment.

## Left to the builder

- The exact glyph drawing (inline SVG, `currentColor`).
- The gap between the last dot and the toggle.
