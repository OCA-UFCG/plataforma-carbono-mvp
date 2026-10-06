import SiteFooter from '@/components/marketing/SiteFooter'
import SiteHeader from '@/components/marketing/SiteHeader'
import TerritoriosApp from '@/components/territorios/TerritoriosApp'

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

  // Stands in for the home, where the section will live: the site's header and
  // footer around it, and nothing else on the page.
  return (
    <>
      <SiteHeader />
      <main>
        <h1 className="sr-only">Territórios</h1>
        <TerritoriosApp initialRecorte={recorte} initialFeicao={feicao} initialEtapa={etapa} />
      </main>
      <SiteFooter />
    </>
  )
}
