import { defineCopy, line, text, type Copy } from './site/model'

// Content for the "Conheça a iniciativa" tabbed section (Plataforma,
// Figma node 18862:8546, "Sobre"). The first tab's copy comes from that node;
// the other three from its variant instances on the same page, 18916:9520
// ("A Caatinga"), 18916:9585 ("Carbono e comunidades") and 18916:9650
// ("Como funciona"). The copy of the first, second and fourth tabs is the
// content doc's 2026-10-05 meeting revision. Image alt text is not in the
// design and is written here.
//
// Editors change the words in Contentful. The tabs themselves — how many,
// their anchors and their photos — stay here. A tab's label is also its
// panel's heading, as in the design, so the two are one field.

export type ConteudoAba = {
  imagem: string
  imagemAlt: string
  titulo: string
  paragrafos: string[]
  destaque: string
}

export type AbaPlataforma = {
  id: string
  label: string
  conteudo: ConteudoAba
}

// One per tab, in the order the tabs show.
export const ABAS_IMAGENS = [
  {
    id: 'o-que-e',
    imagem: '/images/plataforma/o-que-e.webp',
    imagemAlt: 'Vista de um vale da Caatinga com vegetação e cidade ao fundo',
  },
  {
    id: 'a-caatinga',
    imagem: '/images/plataforma/a-caatinga.webp',
    imagemAlt: 'Vista do alto de uma serra da Caatinga, com vegetação seca em primeiro plano sob céu azul',
  },
  {
    id: 'carbono-e-comunidades',
    imagem: '/images/plataforma/carbono-e-comunidades.webp',
    imagemAlt: 'Casa de uma comunidade rural da Caatinga, com terreiro de chão batido e vegetação ao redor',
  },
  {
    id: 'como-funciona',
    imagem: '/images/plataforma/como-funciona.webp',
    imagemAlt: 'Plantação de milho diante de um morro coberto pela vegetação da Caatinga',
  },
]

export const INICIO_PLATAFORMA = defineCopy({
  id: 'inicioPlataforma',
  name: 'Início · Conheça a iniciativa',
  description:
    'As quatro abas da seção "Conheça a iniciativa" da página inicial, na ordem em que aparecem. O título de cada aba é também o título do seu conteúdo. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    titulo: line('Título da seção', 'Conheça a iniciativa'),
    aba1Titulo: line('Aba 1 · Título', 'O que é a Caativar?'),
    aba1Texto: text(
      'Aba 1 · Texto',
      'A Caativar é uma iniciativa que reúne, em um só lugar e de forma aberta, conteúdos, mapas e dados ambientais de municípios, estados, territórios tradicionais e assentamentos da Caatinga. Foi pensada para quem vive no bioma e quem decide sobre ele.',
    ),
    aba1Destaque: line(
      'Aba 1 · Destaque',
      'Informação aberta para que os projetos de carbono respeitem o bioma e quem o conserva.',
    ),
    aba2Titulo: line('Aba 2 · Título', 'A Caatinga'),
    aba2Texto: text(
      'Aba 2 · Texto',
      'A Caatinga abriga a maior e mais diversa Floresta Tropical Sazonalmente Seca do mundo. Além de ser o lugar onde milhões de pessoas vivem, desempenha um papel relevante na regulação do clima. Em 2022, foi o bioma que mais removeu carbono da atmosfera no Brasil. Mesmo assim, há poucas iniciativas que reconhecem os serviços ecossistêmicos que o bioma fornece.',
    ),
    aba2Destaque: line(
      'Aba 2 · Destaque',
      'A Caatinga oferece serviços ecossistêmicos essenciais, ainda pouco reconhecidos e valorizados.',
    ),
    aba3Titulo: line('Aba 3 · Título', 'Carbono e comunidades'),
    aba3Texto: text(
      'Aba 3 · Texto',
      'Projetos de carbono podem gerar renda complementar, mas devem reconhecer direitos, garantir a participação nas decisões, inclusive o direito de recusar, e repartir os benefícios de forma justa com quem conserva a vegetação e reúne conhecimentos essenciais sobre seus territórios.',
    ),
    aba3Destaque: line('Aba 3 · Destaque', 'Quem conserva o território deve participar das decisões e dos benefícios.'),
    aba4Titulo: line('Aba 4 · Título', 'Como funciona'),
    aba4Texto: text(
      'Aba 4 · Texto',
      'A Caativar reúne dados sobre o carbono armazenado no solo e na vegetação, a produtividade e os fluxos de carbono, as mudanças no uso e cobertura da terra, a ocorrência de fogo e o clima, organizados para diferentes recortes territoriais da Caatinga.',
    ),
    aba4Destaque: line('Aba 4 · Destaque', 'Dados ambientais para compreender as condições de cada território.'),
  },
})

export function abasPlataforma(copy: Copy<typeof INICIO_PLATAFORMA>): AbaPlataforma[] {
  const abas = [
    { titulo: copy.aba1Titulo, paragrafos: copy.aba1Texto, destaque: copy.aba1Destaque },
    { titulo: copy.aba2Titulo, paragrafos: copy.aba2Texto, destaque: copy.aba2Destaque },
    { titulo: copy.aba3Titulo, paragrafos: copy.aba3Texto, destaque: copy.aba3Destaque },
    { titulo: copy.aba4Titulo, paragrafos: copy.aba4Texto, destaque: copy.aba4Destaque },
  ]

  return abas.map((aba, i) => {
    const { id, imagem, imagemAlt } = ABAS_IMAGENS[i]

    return { id, label: aba.titulo, conteudo: { imagem, imagemAlt, ...aba } }
  })
}
