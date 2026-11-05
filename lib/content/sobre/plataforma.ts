import { defineCopy, line, list, paragraph, text } from '../site/model'

// Content of "Conheça a plataforma" (/sobre), Figma frame 19538:11039 (rebuilt
// on 2026-11-05; content node 19538:11069), with the copy of the content doc's
// 2026-10-05 meeting revision where the frame only rewords it.

export const SOBRE_PLATAFORMA = defineCopy({
  id: 'sobrePlataforma',
  name: 'Sobre · Conheça a plataforma',
  description:
    'Textos da página /sobre, abaixo da introdução comum às páginas de Sobre. Há uma única entrada deste tipo: edite-a, não crie outra.',
  localized: true,
  fields: {
    // 19538:11070: the text beside the photo, three blocks with a blank line
    // between them.
    porQueTitulo: line('Por que criar · Título', 'Por que criar uma plataforma para a Caatinga?'),
    porQueTexto: text('Por que criar · Texto', [
      'A Caatinga possui sua própria dinâmica. Sua vegetação perde as folhas durante a seca e responde rapidamente às chuvas, enquanto armazena uma quantidade significativa de carbono no solo. Por isso, métodos criados para estimar carbono em outros biomas nem sempre representam corretamente o que acontece na Caatinga.',
      'Abordagens que não incorporam essa dinâmica podem confundir variações naturais da vegetação com processos de degradação ou deixar de representar adequadamente as mudanças nos estoques e fluxos de carbono.',
      'A Caativar surge, nesse contexto, para apoiar análises mais adequadas à realidade do bioma.',
    ]),

    // 19538:11411: the heading over the mission, set as one large quote.
    missaoTitulo: line('Missão · Título', 'Qual é a missão da Caativar?'),
    missaoTexto: paragraph(
      'Missão · Texto',
      'Valorizar o bioma, fortalecer a autonomia dos territórios e contribuir para que a geração de renda seja inclusiva e respeite os modos de vida locais.',
    ),

    // 19538:11415: the grey band. The audiences are the chips, one per line;
    // the text after them adds who else the platform serves.
    publicoTitulo: line('Para quem · Título', 'Para quem é a plataforma?'),
    publicoPerfis: list('Para quem · Públicos', ['Comunidades', 'Gestores públicos', 'Pesquisadores', 'Investidores']),
    publicoTexto: text(
      'Para quem · Texto',
      'A plataforma também atende demais interessados no mercado de carbono na Caatinga. Cada público pode utilizar as informações de acordo com suas necessidades, seja para conhecer o tema, consultar dados ou apoiar decisões.',
    ),

    // 19551:11429: the list beside the second photo. The `faixa` ids predate
    // the redesign, when this was a photo band at the foot of the page; they
    // are kept so the entry keeps its copy.
    faixaTitulo: line('Limites · Título', 'O que a plataforma não faz'),
    faixaItens: list('Limites · Lista', [
      'Não vende créditos de carbono',
      'Não certifica nem aprova projetos',
      'Não substitui reguladores e certificadoras',
    ]),
  },
})

// The same photo as "Entenda essa relação" (IMAGENS.md). Its alt text is in
// messages/<locale>.json, under "Sobre.imageAlt".
export const SOBRE_PLATAFORMA_IMAGEM = {
  src: '/images/sobre/lago-serra.webp',
}

// The photo beside "O que a plataforma não faz" (19551:11428, IMAGENS.md);
// alt text under "Sobre.imageAlt.limites".
export const SOBRE_LIMITES_IMAGEM = {
  src: '/images/sobre/casa-flamboyants.webp',
}

// The icons of the old icon cards, until the page stops drawing them.
export const SOBRE_PLATAFORMA_ICONES = {
  missao: '/icons/sobre/target.svg',
  publico: '/icons/sobre/groups.svg',
}
