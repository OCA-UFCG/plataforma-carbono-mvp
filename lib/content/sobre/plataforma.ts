// Content of "Conheça a plataforma" (/sobre), Figma frame 18988:8611, content
// node 18988:8640, with the copy of the content doc's 2026-10-05 meeting
// revision. The "O que a plataforma não faz" band at the foot of the page is
// SOBRE_FAIXA in lib/content/paginas.ts.

// The opening text is three blocks with a blank line between them; every
// inner array is one block, its strings lines set without a blank line.
export const SOBRE_PLATAFORMA = {
  // 18988:8641: the text beside the photo.
  porQue: {
    titulo: 'Por que criar uma plataforma para a Caatinga?',
    blocos: [
      [
        'A Caatinga possui sua própria dinâmica. Sua vegetação perde as folhas durante a seca e responde rapidamente às chuvas, enquanto armazena uma quantidade significativa de carbono no solo. Por isso, métodos criados para estimar carbono em outros biomas nem sempre representam corretamente o que acontece na Caatinga.',
      ],
      [
        'Abordagens que não incorporam essa dinâmica podem confundir variações naturais da vegetação com processos de degradação ou deixar de representar adequadamente as mudanças nos estoques e fluxos de carbono.',
      ],
      ['A Caativar surge, nesse contexto, para apoiar análises mais adequadas à realidade do bioma.'],
    ],
    // The same photo as "Entenda essa relação" (IMAGENS.md).
    imagem: '/images/sobre/lago-serra.webp',
    imagemAlt: 'Lago de águas calmas ao pé de um morro rochoso coberto de vegetação da Caatinga, sob céu azul',
  },

  // 18988:8648: the two icon cards.
  cards: [
    {
      titulo: 'Qual é a missão da Caativar?',
      icone: '/icons/sobre/target.svg',
      paragrafos: [
        'Valorizar o bioma, fortalecer a autonomia dos territórios e contribuir para que a geração de renda seja inclusiva e respeite os modos de vida locais.',
      ],
    },
    {
      titulo: 'Para quem é a plataforma?',
      icone: '/icons/sobre/groups.svg',
      paragrafos: [
        'A Caativar foi desenvolvida para comunidades, gestores públicos, pesquisadores, investidores e demais interessados em projetos de carbono na Caatinga.',
      ],
    },
  ],
}
