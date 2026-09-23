// Content for the "Conheça a plataforma" tabbed section (Plataforma,
// Figma node 18862:8546, "Sobre"). The first tab's copy comes from that node;
// the other three from its variant instances on the same page, 18916:9520
// ("A Caatinga"), 18916:9585 ("Carbono e comunidades") and 18916:9650
// ("Como funciona"). Image alt text is not in the design and is written here.

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

export const ABAS_PLATAFORMA: AbaPlataforma[] = [
  {
    id: 'o-que-e',
    label: 'O que é a CaatiVAR?',
    conteudo: {
      imagem: '/images/plataforma/o-que-e.webp',
      imagemAlt: 'Vista de um vale da Caatinga com vegetação e cidade ao fundo',
      titulo: 'O que é a CaatiVAR?',
      paragrafos: [
        'A CaatiVAR reúne, em um só lugar e de forma aberta, dados, mapas e conteúdos sobre o carbono da Caatinga. Foi feita para que quem vive no bioma e quem decide sobre ele conheça o que cada território guarda, avalie propostas de projetos de carbono e negocie com mais segurança.',
      ],
      destaque:
        'Informação aberta para que o mercado de carbono respeite o bioma e quem o conserva.',
    },
  },
  {
    id: 'a-caatinga',
    label: 'A Caatinga',
    conteudo: {
      imagem: '/images/plataforma/a-caatinga.webp',
      imagemAlt: 'Vista do alto de uma serra da Caatinga, com vegetação seca em primeiro plano sob céu azul',
      titulo: 'A Caatinga',
      paragrafos: [
        'A Caatinga abriga a maior e mais diversa Floresta Tropical Sazonalmente Seca do mundo. Além de ser a casa de milhões de pessoas em cidades, comunidades rurais e territórios de povos tradicionais, desempenha um papel decisivo na regulação do clima: em 2022, foi o bioma que mais removeu carbono da atmosfera no Brasil. Mesmo assim, quase não há projetos de carbono certificados no bioma.',
      ],
      destaque: 'O bioma que mais remove carbono no Brasil ainda está fora do mercado.',
    },
  },
  {
    id: 'carbono-e-comunidades',
    label: 'Carbono e comunidades',
    conteudo: {
      imagem: '/images/plataforma/carbono-e-comunidades.webp',
      imagemAlt: 'Casa de uma comunidade rural da Caatinga, com terreiro de chão batido e vegetação ao redor',
      titulo: 'Carbono e comunidades',
      paragrafos: [
        'Projetos de carbono podem gerar renda complementar, mas devem reconhecer direitos, garantir a participação nas decisões, inclusive o direito de recusar, e repartir os benefícios de forma justa com quem conserva a vegetação e reúne conhecimentos essenciais sobre seus territórios.',
      ],
      destaque: 'Quem conserva o território deve participar das decisões e dos benefícios.',
    },
  },
  {
    id: 'como-funciona',
    label: 'Como funciona',
    conteudo: {
      imagem: '/images/plataforma/como-funciona.webp',
      imagemAlt: 'Plantação de milho diante de um morro coberto pela vegetação da Caatinga',
      titulo: 'Como funciona',
      paragrafos: [
        'A CaatiVAR reúne dados sobre o carbono armazenado no solo e na vegetação, a produtividade e os fluxos de carbono, o clima, as mudanças da vegetação ao longo do tempo, o uso e a cobertura da terra e a ocorrência de fogo, organizados para diferentes recortes territoriais da Caatinga.',
      ],
      destaque: 'Dados ambientais para compreender as condições de cada território.',
    },
  },
]
