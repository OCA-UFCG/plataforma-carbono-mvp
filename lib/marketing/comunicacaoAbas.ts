// The tabs of the Comunicação page (Figma 19254:16031). The open one is in
// the address as ?aba=eventos, so a link can open the events tab and the
// server renders it already selected; the first tab is the bare /comunicacao.
// Not /comunicacao/eventos: that path belongs to the publication pages,
// /comunicacao/<slug>. Each tab's label is in messages/<locale>.json, under
// "ComunicacaoAbas.<id>".
export const ABAS_COMUNICACAO = [{ id: 'conteudo' }, { id: 'eventos' }] as const

export type AbaComunicacao = (typeof ABAS_COMUNICACAO)[number]['id']

export const ABA_PARAM = 'aba'

// Anything else in the address opens the first tab. A repeated value reaches
// here as its first one, which is what useSearchParams().get() returns.
export function parseAba(value: string | null): AbaComunicacao {
  return ABAS_COMUNICACAO.find((aba) => aba.id === value)?.id ?? ABAS_COMUNICACAO[0].id
}

// The address of a tab, keeping whatever else the current one carries.
export function abaHref(current: URL, aba: AbaComunicacao): string {
  const url = new URL(current)

  if (aba === ABAS_COMUNICACAO[0].id) url.searchParams.delete(ABA_PARAM)
  else url.searchParams.set(ABA_PARAM, aba)

  return `${url.pathname}${url.search}${url.hash}`
}
