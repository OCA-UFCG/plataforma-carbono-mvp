// Confere o contraste WCAG do conjunto de acentos gerado para os 12 meses, nos
// dois modos. Roda o codigo real (buildAccent), nao uma copia. Uso: npm run contrast
import { MONTHS } from '@/lib/phenology'
import { contrast } from '@/lib/color'
import { buildAccent } from '@/config/plataforma/platforms'

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

console.log(`\nfalhas de contraste abaixo de ${MIN}:1 -> ${failures}`)
process.exit(failures ? 1 : 0)
