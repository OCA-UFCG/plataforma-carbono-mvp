import 'server-only'

import type { AbstractIntlMessages } from 'next-intl'
import { getMessages } from 'next-intl/server'

// The namespaces a route group's client components read. Server components
// read every message on the server; only these travel to the browser, in the
// NextIntlClientProvider each root layout renders.
export const HEADER_NAMESPACES = ['Nav', 'SiteHeader'] as const

// The marketing pages share one root layout, so its list covers the client
// components of every translated page.
export const MARKETING_NAMESPACES = [
  ...HEADER_NAMESPACES,
  'Hero',
  'Plataforma',
  'MoreLink',
  'ComunicacaoAbas',
  'Eventos',
  'PdfViewer',
  'Sobre',
] as const

export async function clientMessages(namespaces: readonly string[]): Promise<AbstractIntlMessages> {
  const messages = await getMessages()

  return Object.fromEntries(namespaces.filter((namespace) => namespace in messages).map((n) => [n, messages[n]]))
}
