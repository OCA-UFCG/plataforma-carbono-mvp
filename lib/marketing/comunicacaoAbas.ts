// The two tabs of the Comunicação page (Figma 19254:16031). The open one is in
// the address as ?aba=eventos, so a link can open the events tab and the
// server renders it already selected; the first tab is the bare /comunicacao.
// Not /comunicacao/eventos: that path belongs to the publication pages,
// /comunicacao/<slug>.
export const ABAS_COMUNICACAO = [
  { id: 'conteudo', label: 'Conteúdo' },
  { id: 'eventos', label: 'Eventos e articulações' },
] as const

export type AbaComunicacao = (typeof ABAS_COMUNICACAO)[number]['id']

export const ABA_PARAM = 'aba'

// Anything else in the address, a repeated or unknown value included, opens
// the first tab.
export function parseAba(value: string | string[] | undefined): AbaComunicacao {
  return ABAS_COMUNICACAO.find((aba) => aba.id === value)?.id ?? ABAS_COMUNICACAO[0].id
}

// The address of a tab, keeping whatever else the current one carries.
export function abaHref(current: URL, aba: AbaComunicacao): string {
  const url = new URL(current)

  if (aba === ABAS_COMUNICACAO[0].id) url.searchParams.delete(ABA_PARAM)
  else url.searchParams.set(ABA_PARAM, aba)

  return `${url.pathname}${url.search}${url.hash}`
}
