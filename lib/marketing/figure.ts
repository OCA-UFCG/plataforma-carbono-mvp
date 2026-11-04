// Helpers for the Sobre figure cards (components/marketing/sobre/FigureCard.tsx),
// which read their figures as editors type them in Contentful.

export type Figure = { value: string; unit?: string }

// The figure runs to the end of its last number that starts a word (at the
// start, after whitespace or after a dash); what follows is the unit. A
// subscript typed as a Unicode character ("CO₂", "km²") is not a digit, and a
// digit glued to a letter ("CO2") does not start a number, so either stays in
// the unit. Greedy `.*` backtracks to that last number. Figures come from
// single-line fields, so `.` never has a line break to cross.
const FIGURE = /^(.*(?:^|[\s–-])\d[\d.,]*%?)\s*(.*)$/

// Splits "410 Mt CO₂eq" into "410" and "Mt CO₂eq", for the number at display
// size and the unit beside it. A figure with nothing after its number ("Até
// 58%", "mín. 50%") or no number at all comes back whole, with no unit.
export function splitFigure(valor: string): Figure {
  const trimmed = valor.trim()
  const match = trimmed.match(FIGURE)
  if (!match) return { value: trimmed }
  const [, value, unit] = match
  return unit ? { value, unit } : { value }
}

const SHARE = /^\s*(\d{1,3}(?:[.,]\d+)?)\s*%?\s*$/

// Reads the share a card's progress bar fills, as an editor types it ("38",
// "58%", "58,5"). Anything that is not a share from 0 to 100 gives undefined,
// and the card then draws no bar rather than a wrong one.
export function barFill(raw: string): number | undefined {
  const match = raw.match(SHARE)
  if (!match) return undefined
  const share = Number(match[1].replace(',', '.'))
  return share >= 0 && share <= 100 ? share : undefined
}
