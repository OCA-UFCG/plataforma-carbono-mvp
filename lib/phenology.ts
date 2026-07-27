// Ciclo fenologico da Caatinga: a interface veste a cor do mes corrente.
//
// As doze cores nao foram escolhidas no olho. Vieram da serie Landsat de 1985 a
// 2024 sobre a vegetacao nativa do bioma, desmisturada em NDFI (Normalized
// Difference Fraction Index, das fracoes GV, NPV, solo e sombra), com a mediana
// de cada mes traduzida numa rampa ancorada nas duas cores do logo do OCA, o
// verde #597636 e a terracota #D08C53. O estudo esta em prototipos/sazonalidade.html
// e os scripts que produziram a serie em ../../gee.
//
// Abril e o pico verde (NDFI mediano +0,56) e outubro o fundo seco (-0,56). O
// app abre sempre no mes de hoje; o usuario pode fixar outro mes para ver como a
// interface fica nele, e a preferencia vale ate ser trocada.

export type MonthId =
  | 'jan' | 'fev' | 'mar' | 'abr' | 'mai' | 'jun'
  | 'jul' | 'ago' | 'set' | 'out' | 'nov' | 'dez'

/** 'auto' segue a data do visitante; qualquer outro valor fixa o mes. */
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
  /** 0 a 11, na ordem do calendario e igual ao Date#getMonth. */
  i: number
  label: string
  short: string
  /** Cor do mes na rampa sazonal, base de todo o acento da interface. */
  color: string
  phase: Phase
  /** NDFI mediano do mes na serie 1985-2024 sobre a vegetacao nativa. */
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

/** Mes efetivo a partir da preferencia: 'auto' deriva da data de hoje. */
export function resolveMonth(pref: MonthPref): MonthInfo {
  if (pref !== 'auto' && MONTH_BY_ID[pref]) return MONTH_BY_ID[pref]
  return MONTHS[new Date().getMonth()]
}

/** Aceita so os valores conhecidos; qualquer outro cai em 'auto'. */
export function isMonthPref(v: unknown): v is MonthPref {
  return v === 'auto' || (typeof v === 'string' && v in MONTH_BY_ID)
}

/** Posicao do marcador do mes na faixa do ciclo, no centro da sua fatia. */
export function cyclePosition(m: MonthInfo): string {
  return `${((m.i + 0.5) / 12) * 100}%`
}

/**
 * Faixa continua do ciclo anual, usada no header e no welcome. Os stops caem no
 * centro de cada fatia de mes, entao a faixa le como um degrade e nao como doze
 * blocos, e ainda assim a posicao de cada mes bate com a do marcador.
 */
export const CYCLE_GRADIENT = `linear-gradient(90deg,${MONTHS.map(
  (m) => `${m.color} ${(((m.i + 0.5) / 12) * 100).toFixed(2)}%`,
).join(',')})`
