// Phenological cycle of the Caatinga: the interface wears the color of the current month.
//
// The twelve colors were not picked by eye. They come from the Landsat series
// from 1985 to 2024 over the native vegetation of the biome, unmixed into NDFI
// (Normalized Difference Fraction Index, from the GV, NPV, soil and shade
// fractions), with the median of each month translated into a ramp anchored on
// the two colors of the OCA logo, the green #597636 and the terracotta #D08C53.
// The study is in prototipos/sazonalidade.html and the scripts that produced the
// series are in ../../gee.
//
// April is the green peak (median NDFI +0.56) and October the dry bottom (-0.56).
// The app always opens on today's month; the user can pin another month to see
// how the interface looks in it, and the preference holds until it is changed.

export type MonthId =
  | 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun'
  | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

/** 'auto' follows the visitor's date; any other value pins the month. */
export type MonthPref = 'auto' | MonthId

export type Phase = 'folha' | 'queda' | 'branca' | 'chuva'

export interface PhaseInfo {
  label: string
  photo: string
  photoDate: string
}

export const PHASES: Record<Phase, PhaseInfo> = {
  folha:  { label: 'Caatinga em folha', photo: '/welcome/foto_verde.jpg',     photoDate: 'jan 2025' },
  queda:  { label: 'Folhas ao chão',    photo: '/welcome/foto_transicao.jpg', photoDate: 'jun 2024' },
  branca: { label: 'Mata branca',       photo: '/welcome/foto_seca.jpg',      photoDate: 'dez 2024' },
  chuva:  { label: 'Primeiras chuvas',  photo: '/welcome/foto_agua.jpg',      photoDate: 'jan 2025' },
}

export interface MonthInfo {
  id: MonthId
  /** 0 to 11, in calendar order and the same as Date#getMonth. */
  i: number
  label: string
  short: string
  /** Color of the month in the seasonal ramp, base of every interface accent. */
  color: string
  phase: Phase
  /** Median NDFI of the month in the 1985-2024 series over native vegetation. */
  ndfi: number
}

export const MONTHS: MonthInfo[] = [
  { id: 'jan', i: 0,  label: 'Janeiro',   short: 'Jan', color: '#778100', phase: 'folha',  ndfi:  0.220 },
  { id: 'fev', i: 1,  label: 'Fevereiro', short: 'Fev', color: '#637E00', phase: 'folha',  ndfi:  0.384 },
  { id: 'mar', i: 2,  label: 'Março',     short: 'Mar', color: '#577B14', phase: 'folha',  ndfi:  0.484 },
  { id: 'abr', i: 3,  label: 'Abril',     short: 'Abr', color: '#4F791E', phase: 'folha',  ndfi:  0.559 },
  { id: 'mai', i: 4,  label: 'Maio',      short: 'Mai', color: '#617E02', phase: 'folha',  ndfi:  0.387 },
  { id: 'jun', i: 5,  label: 'Junho',     short: 'Jun', color: '#848300', phase: 'queda',  ndfi:  0.129 },
  { id: 'jul', i: 6,  label: 'Julho',     short: 'Jul', color: '#A78400', phase: 'queda',  ndfi: -0.111 },
  { id: 'ago', i: 7,  label: 'Agosto',    short: 'Ago', color: '#CA8516', phase: 'branca', ndfi: -0.376 },
  { id: 'set', i: 8,  label: 'Setembro',  short: 'Set', color: '#DB8633', phase: 'branca', ndfi: -0.538 },
  { id: 'out', i: 9,  label: 'Outubro',   short: 'Out', color: '#DD8637', phase: 'branca', ndfi: -0.560 },
  { id: 'nov', i: 10, label: 'Novembro',  short: 'Nov', color: '#C38507', phase: 'chuva',  ndfi: -0.322 },
  { id: 'dez', i: 11, label: 'Dezembro',  short: 'Dez', color: '#988400', phase: 'chuva',  ndfi: -0.014 },
]

export const MONTH_BY_ID: Record<MonthId, MonthInfo> = Object.fromEntries(
  MONTHS.map((m) => [m.id, m]),
) as Record<MonthId, MonthInfo>

/** Effective month from the preference: 'auto' derives it from today's date. */
export function resolveMonth(pref: MonthPref): MonthInfo {
  if (pref !== 'auto' && MONTH_BY_ID[pref]) return MONTH_BY_ID[pref]
  return MONTHS[new Date().getMonth()]
}

/** Accepts only the known values; anything else falls back to 'auto'. */
export function isMonthPref(v: unknown): v is MonthPref {
  return v === 'auto' || (typeof v === 'string' && v in MONTH_BY_ID)
}

/** Position of the month marker on the cycle band, at the center of its slice. */
export function cyclePosition(m: MonthInfo): string {
  return `${((m.i + 0.5) / 12) * 100}%`
}

/**
 * Continuous band of the yearly cycle, used in the header and in the welcome.
 * The stops fall at the center of each month slice, so the band reads as a
 * gradient and not as twelve blocks, and each month still lines up with the marker.
 */
export const CYCLE_GRADIENT = `linear-gradient(90deg,${MONTHS.map(
  (m) => `${m.color} ${(((m.i + 0.5) / 12) * 100).toFixed(2)}%`,
).join(',')})`
