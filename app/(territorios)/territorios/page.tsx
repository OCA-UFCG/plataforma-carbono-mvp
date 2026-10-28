import SiteFooter from '@/components/marketing/SiteFooter'
import SiteHeader from '@/components/marketing/SiteHeader'
import { StoryScriptProvider } from '@/components/territorios/StoryScriptContext'
import TerritoriosApp from '@/components/territorios/TerritoriosApp'
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
