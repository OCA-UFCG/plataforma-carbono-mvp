// Confere o contraste WCAG do conjunto de acentos gerado para os 12 meses, nos
// dois modos. Roda o codigo real (buildAccent), nao uma copia. Uso: npm run contrast
import { MONTHS } from '@/lib/phenology'
import { contrast } from '@/lib/color'
import { buildAccent, buildFluxInks, buildReportTheme } from '@/config/mapa/platforms'
import { REPORT_LAYERS } from '@/config/mapa/reportLayers'

const CARD = { light: '#ffffff', dark: '#211f18' }
const MIN = 4.5

console.log('mes   modo     accent    accentInk  vs card   onAccent  vs accent')
let failures = 0

for (const m of MONTHS) {
  for (const dark of [false, true]) {
    const a = buildAccent(m.color, dark)
    const card = dark ? CARD.dark : CARD.light
    const inkRatio = contrast(a.accentInk, card)
    const onRatio = contrast(a.onAccent, a.accent)
    const ok = inkRatio >= MIN && onRatio >= MIN
    if (!ok) failures++
    console.log(
      m.short.padEnd(5), (dark ? 'escuro' : 'claro').padEnd(8),
      a.accent.padEnd(9), a.accentInk.padEnd(10), inkRatio.toFixed(2).padStart(5), '  ',
      a.onAccent.padEnd(9), onRatio.toFixed(2).padStart(5), ok ? '' : '  <-- FALHA',
    )
  }
}

// The two carbon flux inks (red = emitiu, green = sequestrou) are fixed all
// year, but the surfaces under them are not: they land on `accentBg`, which is
// the month color diluted into the card. So the pair is checked against every
// month in both modes, and against the plain card as well, in case `bgCard`
// ever moves. Anything below the minimum here means a carbon number would be
// unreadable for part of the year.
console.log('\nfluxo  mes   modo     emissionInk  vs accentBg  vs card   removalInk  vs accentBg  vs card')

for (const m of MONTHS) {
  for (const dark of [false, true]) {
    const flux = buildFluxInks(dark)
    const accentBg = buildAccent(m.color, dark).accentBg
    const card = dark ? CARD.dark : CARD.light
    const ratios = [
      contrast(flux.emissionInk, accentBg),
      contrast(flux.emissionInk, card),
      contrast(flux.removalInk, accentBg),
      contrast(flux.removalInk, card),
    ]
    const ok = ratios.every((r) => r >= MIN)
    if (!ok) failures++
    console.log(
      '      ', m.short.padEnd(5), (dark ? 'escuro' : 'claro').padEnd(8),
      flux.emissionInk.padEnd(12), ratios[0].toFixed(2).padStart(11), ratios[1].toFixed(2).padStart(9), '  ',
      flux.removalInk.padEnd(11), ratios[2].toFixed(2).padStart(11), ratios[3].toFixed(2).padStart(9),
      ok ? '' : '  <-- FALHA',
    )
  }
}

// The report document does not rotate with the month: it wears the fixed OCA
// accent on white paper, and each section heading is white text on its own
// `sectionColor`. Both go through the same 4.5:1 gate as the monthly accents,
// because a heading nobody can read is a heading nobody can read whether the
// color came from a month or from a config file.
console.log('\nrelatorio                     cor       vs branco')

const reportTheme = buildReportTheme()
const reportPairs: [string, string, string][] = [
  ['accentInk', reportTheme.colors.accentInk, '#ffffff'],
  ['onAccent', reportTheme.colors.onAccent, reportTheme.colors.accent],
  ['emissionInk', reportTheme.colors.emissionInk, '#ffffff'],
  ['removalInk', reportTheme.colors.removalInk, '#ffffff'],
  ...REPORT_LAYERS.map((entry): [string, string, string] =>
    [`secao ${entry.layerId}`, entry.sectionColor, '#ffffff']),
]

for (const [label, fg, bg] of reportPairs) {
  const ratio = contrast(fg, bg)
  const ok = ratio >= MIN
  if (!ok) failures++
  console.log(
    label.padEnd(30), fg.padEnd(9), ratio.toFixed(2).padStart(9),
    ok ? '' : '  <-- FALHA',
  )
}

console.log(`\nfalhas de contraste abaixo de ${MIN}:1 -> ${failures}`)
process.exit(failures ? 1 : 0)
