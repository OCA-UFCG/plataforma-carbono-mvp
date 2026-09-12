import ReportClient from '@/components/relatorio/ReportClient'

interface ReportPageParams {
  recorte?: string | string[]
  feicao?:  string | string[]
  ano?:     string | string[]
  camadas?: string | string[]
}

function single(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<ReportPageParams>
}) {
  const params = await searchParams

  // The parameters go through unvalidated on purpose: the routes validate them
  // and answer 400/404, and the client renders that answer. Duplicating the
  // patterns here would give two places to keep in sync.
  return (
    <ReportClient
      recorteId={single(params.recorte)}
      feicaoId={single(params.feicao)}
      year={single(params.ano)}
      layerIds={single(params.camadas).split(',').filter(Boolean)}
    />
  )
}
