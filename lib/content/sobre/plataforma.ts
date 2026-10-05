import { defineCopy, line, list, text } from '../site/model'

// Content of "Conheça a plataforma" (/sobre), Figma frame 18988:8611, content
// node 18988:8640, with the copy of the content doc's 2026-10-05 meeting
// revision, and the "O que a plataforma não faz" band at the foot of the page
// (18988:8651).

export const SOBRE_PLATAFORMA = defineCopy({
  id: 'sobrePlataforma',
  name: 'Sobre · Conheça a plataforma',
  description:
    'Textos da página /sobre, abaixo da introdução comum às páginas de Sobre. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    // 18988:8641: the text beside the photo, three blocks with a blank line
    // between them.
    porQueTitulo: line('Por que criar · Título', 'Por que criar uma plataforma para a Caatinga?'),
    porQueTexto: text('Por que criar · Texto', [
      'A Caatinga possui sua própria dinâmica. Sua vegetação perde as folhas durante a seca e responde rapidamente às chuvas, enquanto armazena uma quantidade significativa de carbono no solo. Por isso, métodos criados para estimar carbono em outros biomas nem sempre representam corretamente o que acontece na Caatinga.',
      'Abordagens que não incorporam essa dinâmica podem confundir variações naturais da vegetação com processos de degradação ou deixar de representar adequadamente as mudanças nos estoques e fluxos de carbono.',
      'A Caativar surge, nesse contexto, para apoiar análises mais adequadas à realidade do bioma.',
    ]),

    // 18988:8648: the two icon cards. The design sets a card's paragraphs on
    // consecutive lines, with no gap between them.
    missaoTitulo: line('Cartão da missão · Título', 'Qual é a missão da Caativar?'),
    missaoTexto: text(
      'Cartão da missão · Texto',
      'Valorizar o bioma, fortalecer a autonomia dos territórios e contribuir para que a geração de renda seja inclusiva e respeite os modos de vida locais.',
    ),
    publicoTitulo: line('Cartão do público · Título', 'Para quem é a plataforma?'),
    publicoTexto: text(
      'Cartão do público · Texto',
      'A Caativar foi desenvolvida para comunidades, gestores públicos, pesquisadores, investidores e demais interessados em projetos de carbono na Caatinga.',
    ),

    // 18988:8651
    faixaTitulo: line('Faixa do rodapé · Título', 'O que a plataforma não faz'),
    faixaItens: list('Faixa do rodapé · Lista', [
      'Não vende créditos de carbono',
      'Não certifica nem aprova projetos',
      'Não substitui reguladores e certificadoras',
    ]),
  },
})

// The same photo as "Entenda essa relação" (IMAGENS.md).
export const SOBRE_PLATAFORMA_IMAGEM = {
  src: '/images/sobre/lago-serra.webp',
  alt: 'Lago de águas calmas ao pé de um morro rochoso coberto de vegetação da Caatinga, sob céu azul',
}

export const SOBRE_PLATAFORMA_ICONES = {
  missao: '/icons/sobre/target.svg',
  publico: '/icons/sobre/groups.svg',
}
