import type { PlatformTheme } from '@/types/plataforma'
import { resolveMonth, type MonthInfo } from '@/lib/phenology'
import { mix, readableOn, adjustContrast } from '@/lib/color'

/**
 * Tema = neutros fixos "mata branca" (claro ou escuro) mais o acento do mes.
 * So o acento muda ao longo do ano; os neutros sao o cromo fixo.
 * `buildTheme(month, dark)` compoe o PlatformTheme efetivo.
 *
 * O conjunto de acentos sai calculado da cor do mes (ver lib/plataforma/color.ts),
 * nao escrito a mao: sao doze meses em dois modos, e a tinta de texto precisa
 * passar em 4,5:1 contra o cartao tanto no verde-oliva de abril quanto no
 * laranja claro de outubro.
 */

// Neutros fixos, mantidos em sincronia com as CSS vars em plataforma.css.
const lightNeutrals = {
  bg: '#f7f6f2', mist: '#eceae3', border: '#d8d5cb', bgCard: '#ffffff',
  text: '#26241d', body: '#57544a', textDim: '#6f6c63', dim: '#8a8776', caption: '#95927f',
  chip: '#f2f0e8', glassBg: 'rgba(252,252,247,.96)', glassBd: 'rgba(60,58,48,.14)',
  terracota: '#b5602f', acude: '#4a7fa5',
}
const darkNeutrals = {
  bg: '#16150f', mist: '#201e16', border: '#34322a', bgCard: '#211f18',
  text: '#f2f0e8', body: '#cfccc0', textDim: '#a8a49a', dim: '#9b9788', caption: '#8a8776',
  chip: '#2a281d', glassBg: 'rgba(28,26,18,.94)', glassBd: 'rgba(230,226,210,.12)',
  terracota: '#c8703c', acude: '#6ba3c9',
}

export interface AccentSet {
  accent: string
  accentBg: string
  accentInk: string
  accentBd: string
  accentGrad: string
  onAccent: string
}

/** Deriva fundo suave, borda, tinta e cor sobre o solido a partir da cor do mes. */
export function buildAccent(base: string, dark: boolean): AccentSet {
  const card = dark ? darkNeutrals.bgCard : lightNeutrals.bgCard
  // No escuro o proprio acento precisa clarear para sobreviver sobre o cartao;
  // no claro a cor do mes ja passa como preenchimento e so a tinta e ajustada.
  const accent = dark ? adjustContrast(base, card, '#ffffff', 4.5) : base
  const bgMix = dark ? darkNeutrals.bg : '#ffffff'

  return {
    accent,
    accentBg: mix(base, bgMix, dark ? 0.86 : 0.9),
    accentBd: mix(base, bgMix, dark ? 0.7 : 0.74),
    accentInk: dark
      ? mix(base, '#ffffff', 0.55)
      : adjustContrast(base, card, '#16150f', 4.5),
    accentGrad: `linear-gradient(135deg,${base},${mix(base, dark ? '#ffffff' : '#ffffff', 0.3)})`,
    onAccent: readableOn(accent),
  }
}

export function buildTheme(month: MonthInfo, dark: boolean): PlatformTheme {
  const neutrals = dark ? darkNeutrals : lightNeutrals
  return {
    id: 'carbono',
    name: 'Carbono Caatinga',
    fullName: 'Observatório da Caatinga, OCA',
    footer: 'OCA / UFCG-INSA',
    colors: { ...neutrals, ...buildAccent(month.color, dark) },
  }
}

/** Tema padrao para qualquer importador nao reativo. */
export const theme = buildTheme(resolveMonth('auto'), false)
