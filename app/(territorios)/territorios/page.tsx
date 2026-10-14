import { redirect } from 'next/navigation'
import SiteFooter from '@/components/marketing/SiteFooter'
import SiteHeader from '@/components/marketing/SiteHeader'
import { StoryScriptProvider } from '@/components/territorios/StoryScriptContext'
import TerritoriosApp from '@/components/territorios/TerritoriosApp'
import { getAuthenticatedSession } from '@/lib/auth'
import { loadSiteCopy } from '@/lib/content/site/fetch'
import { TERRITORIOS_COPY } from '@/lib/content/territorios'

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

  // Contentful down, or the types not provisioned yet: the story keeps the
  // copy it ships with (lib/content/site/fetch.ts).
  const copy = await loadSiteCopy(TERRITORIOS_COPY)

  // Stands in for the home, where the section will live: the site's header and
  // footer around it, and nothing else on the page.
  return (
    <>
      <SiteHeader />
      <main>
        <h1 className="sr-only">Territórios</h1>
        <StoryScriptProvider copy={copy}>
          <TerritoriosApp initialRecorte={recorte} initialFeicao={feicao} initialEtapa={etapa} />
        </StoryScriptProvider>
      </main>
      <SiteFooter />
    </>
  )
}
