import { MAPA_LINK, TERRITORIOS_LINK } from '@/lib/marketing/nav'
import { defineCopy, line, list, paragraph, type Copy } from './site/model'

// Copy of the landing's "Duas formas de explorar os dados" section (Caminhos,
// Figma node 19253:14778), which replaced the Ferramenta band: two cards, the
// territorial summary and the data platform. The words are the design's, the
// hover list from its hover state (19253:15506), except the second card's
// button: the design labels both "Ver Resumo", and the one that opens the
// platform says so instead.
//
// Editors change the words in Contentful. The cards themselves — how many,
// their photos and where each one leads — stay here.

export type CaminhoCard = {
  id: string
  href: string
  imagem: string
  selo: string
  titulo: string
  texto: string
  itens: string[]
  botao: string
}

// One per card, in the order the cards show. Both links cross a route group:
// the summary is app/(territorios), the platform app/(mapa).
export const CAMINHOS_DESTINOS = [
  { id: 'resumo', href: TERRITORIOS_LINK.href, imagem: '/images/caminhos/resumo-territorial.webp' },
  { id: 'plataforma', href: MAPA_LINK.href, imagem: '/images/caminhos/plataforma.webp' },
]

export const INICIO_CAMINHOS = defineCopy({
  id: 'inicioCaminhos',
  name: 'Início · Duas formas de explorar',
  description:
    'Seção da página inicial com os dois cartões que levam ao resumo territorial e à plataforma de dados. A lista de cada cartão aparece ao passar o mouse. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    chamada: line('Chamada acima do título', 'Duas formas de explorar os dados'),
    titulo: line('Título', 'Os mesmos dados de carbono, dois caminhos'),
    resumoSelo: line('Resumo territorial · Selo', 'Mais direto'),
    resumoTitulo: line('Resumo territorial · Título', 'Resumo territorial'),
    resumoTexto: paragraph(
      'Resumo territorial · Texto',
      'Escolha um município e veja, em uma página, um panorama dos dados de carbono do seu território.',
    ),
    resumoItens: list('Resumo territorial · Lista', [
      'Panorama dos indicadores do município',
      'Leitura rápida, sem precisar configurar nada',
      'Adaptado para o território escolhido',
    ]),
    resumoBotao: line('Resumo territorial · Botão', 'Ver Resumo'),
    plataformaSelo: line('Plataforma · Selo', 'Mais detalhado'),
    plataformaTitulo: line('Plataforma · Título', 'Plataforma de dados'),
    plataformaTexto: paragraph(
      'Plataforma · Texto',
      'Explore o mapa, cruze camadas e acompanhe as mudanças ao longo do tempo em todos os territórios da Caatinga.',
    ),
    plataformaItens: list('Plataforma · Lista', [
      'Mapa para localizar qualquer território',
      'Combine camadas de dados no mapa',
      'Compare dados e períodos diferentes',
    ]),
    plataformaBotao: line('Plataforma · Botão', 'Acessar plataforma'),
  },
})

export function caminhosCards(copy: Copy<typeof INICIO_CAMINHOS>): CaminhoCard[] {
  const cards = [
    {
      selo: copy.resumoSelo,
      titulo: copy.resumoTitulo,
      texto: copy.resumoTexto,
      itens: copy.resumoItens,
      botao: copy.resumoBotao,
    },
    {
      selo: copy.plataformaSelo,
      titulo: copy.plataformaTitulo,
      texto: copy.plataformaTexto,
      itens: copy.plataformaItens,
      botao: copy.plataformaBotao,
    },
  ]

  return cards.map((card, i) => ({ ...CAMINHOS_DESTINOS[i], ...card }))
}
