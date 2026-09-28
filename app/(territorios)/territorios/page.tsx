import { redirect } from 'next/navigation'
import TerritoriosApp from '@/components/territorios/TerritoriosApp'
import { getAuthenticatedSession } from '@/lib/auth'

interface TerritoriosPageParams {
  recorte?: string | string[]
  feicao?:  string | string[]
  etapa?:   string | string[]
}

function single(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

export default async function TerritoriosPage({
  searchParams,
}: {
  searchParams: Promise<TerritoriosPageParams>
}) {
  const params = await searchParams
  const recorte = single(params.recorte)
  const feicao = single(params.feicao)
  const etapa = single(params.etapa)

  // Only the page receives the query, so the login redirect lives here and
  // brings the visitor back to the same step (see the layout for why it has
  // no redirect of its own).
  if (!await getAuthenticatedSession()) {
    const query = new URLSearchParams(
      Object.entries({ recorte, feicao, etapa }).filter(([, value]) => value),
    ).toString()
    redirect('/login?redirect=' + encodeURIComponent('/territorios' + (query ? '?' + query : '')))
  }

  return <TerritoriosApp initialRecorte={recorte} initialFeicao={feicao} initialEtapa={etapa} />
}
