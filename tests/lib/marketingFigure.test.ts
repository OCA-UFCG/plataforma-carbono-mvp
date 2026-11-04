import { describe, expect, it } from 'vitest'
import { barFill, splitFigure } from '@/lib/marketing/figure'

// The Sobre figure cards (Figma "Cards sobre", 19406:47719) set the number at
// display size and its unit beside it, smaller. Editors type the figure whole
// in Contentful, so the split happens here, on every value the site holds in
// either language, the code's older defaults included.
describe('splitFigure', () => {
  it.each([
    ['410 Mt CO₂eq', { value: '410', unit: 'Mt CO₂eq' }],
    ['Até 58%', { value: 'Até 58%' }],
    ['Up to 58%', { value: 'Up to 58%' }],
    ['125 tC/ha', { value: '125', unit: 'tC/ha' }],
    ['125tC/ha', { value: '125', unit: 'tC/ha' }],
    ['1,5 a 5 tCO₂/ha/ano', { value: '1,5 a 5', unit: 'tCO₂/ha/ano' }],
    ['1.5 to 5 tCO₂/ha/year', { value: '1.5 to 5', unit: 'tCO₂/ha/year' }],
    ['1,5–5tCO₂/ha/ano', { value: '1,5–5', unit: 'tCO₂/ha/ano' }],
    ['mín. 50%', { value: 'mín. 50%' }],
    // An ASCII 2 typed for the subscript stays in the unit: it is glued to a
    // letter, so it does not start a number.
    ['410 Mt CO2eq', { value: '410', unit: 'Mt CO2eq' }],
    ['100 km²', { value: '100', unit: 'km²' }],
    // A range may be typed with any dash or the minus sign (Google Docs turns
    // "--" into an em dash); the second number belongs to the figure.
    ['1,5—5tCO₂/ha/ano', { value: '1,5—5', unit: 'tCO₂/ha/ano' }],
    ['1,5−5 tCO₂', { value: '1,5−5', unit: 'tCO₂' }],
    ['1,5‒5 t', { value: '1,5‒5', unit: 't' }],
    // Never a digit in the unit: a figure the rule cannot split stays whole.
    ['1/3', { value: '1/3' }],
    ['—', { value: '—' }],
  ])('splits %j', (input, expected) => expect(splitFigure(input)).toEqual(expected))
})

// The share a card's progress bar fills, typed by an editor: anything that is
// not a share from 0 to 100 draws no bar rather than a wrong one.
describe('barFill', () => {
  it.each([
    ['38', 38],
    ['58%', 58],
    [' 58,5 ', 58.5],
    ['0', 0],
    ['100', 100],
    ['', undefined],
    ['cinquenta', undefined],
    ['150', undefined],
    ['-5', undefined],
  ])('reads %j', (input, expected) => expect(barFill(input)).toBe(expected))
})
