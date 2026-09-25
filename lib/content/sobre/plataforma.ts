// Content of "Conheça a plataforma" (/sobre), Figma frame 18988:8611, content
// node 18988:8640, copied verbatim. The "O que a plataforma não faz" band at
// the foot of the page is SOBRE_FAIXA in lib/content/paginas.ts.

// The design breaks the opening text into three blocks with a blank line
// between them, the first and last of two lines each; every inner array is
// one block, its strings the lines.
export const SOBRE_PLATAFORMA = {
  // 18988:8641: the text beside the photo.
  porQue: {
    titulo: 'Por que criar uma plataforma para a Caatinga?',
    blocos: [
      [
        'A Caatinga funciona de forma diferente de outros biomas. Sua vegetação perde as folhas durante a seca, responde rapidamente às chuvas e armazena uma parte importante do carbono no solo.',
        'Por isso, dados e métodos criados para florestas úmidas nem sempre representam corretamente o que acontece na Caatinga.',
      ],
      [
        'Um sistema de monitoramento que não reconheça essa dinâmica pode interpretar a perda natural das folhas como degradação, e uma referência fixa de "quanto carbono haveria sem o projeto" não funciona onde a chuva varia tanto de um ano para outro.',
      ],
      [
        'Isso ajuda a explicar por que quase não há projetos de carbono certificados no bioma, e por que os que existem no Brasil se concentram na Amazônia e no Cerrado.',
        'A CaatiVAR reúne informações sobre o bioma para apoiar análises mais adequadas à sua realidade.',
      ],
    ],
    // The same photo as "Entenda essa relação" (IMAGENS.md).
    imagem: '/images/sobre/lago-serra.webp',
    imagemAlt: 'Lago de águas calmas ao pé de um morro rochoso coberto de vegetação da Caatinga, sob céu azul',
  },

  // 18988:8648: the two icon cards.
  cards: [
    {
      titulo: 'Qual é a missão da CaatiVAR?',
      icone: '/icons/sobre/target.svg',
      paragrafos: [
        'Ampliar o acesso a dados e conhecimentos sobre o carbono na Caatinga, apoiar o monitoramento participativo e contribuir para que o mercado de carbono, se e quando chegar aos territórios, respeite o bioma e os direitos de quem vive nele.',
      ],
    },
    {
      titulo: 'Para quem é a plataforma?',
      icone: '/icons/sobre/groups.svg',
      paragrafos: [
        'A CaatiVAR foi desenvolvida para comunidades, gestores públicos, pesquisadores, investidores e demais interessados no mercado de carbono na Caatinga.',
        'Cada público pode utilizar as informações de acordo com suas necessidades, seja para conhecer o tema, consultar dados ou apoiar decisões.',
      ],
    },
  ],
}
