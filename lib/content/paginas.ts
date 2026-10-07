import { defineCopy, line, optionalLine, paragraph } from './site/model'

// Copy for the internal pages' shared frame: the grey intro band at the top
// and the photo band above the footer. Taken verbatim from the Figma frames
// "Sobre" (18988:8611, the same intro on all four Sobre pages) and
// "Comunicação" (18978:2048). Each page's own content lives in its own module;
// the band at the foot of "Conheça a plataforma" is part of that page's copy
// (lib/content/sobre/plataforma.ts).

export type PageIntroContent = {
  eyebrow: string
  title: string
  intro: string
}

export type PhotoBandContent = {
  image: string
  title: string
  items?: string[]
}

// Figma node 18988:8613, with the copy of the content doc's 2026-10-05
// meeting, which dropped the design's "Institucional" eyebrow.
export const SOBRE_INTRO = defineCopy({
  id: 'sobreIntro',
  name: 'Sobre · Introdução',
  description:
    'Faixa cinza do topo das quatro páginas de Sobre, a mesma em todas. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    chamada: optionalLine('Chamada acima do título'),
    titulo: line('Título', 'Sobre a Caativar'),
    texto: paragraph(
      'Texto',
      'A Caativar é uma iniciativa da Superintendência do Desenvolvimento do Nordeste (Sudene), em parceria com o Observatório da Caatinga e Desertificação (OCA) da Universidade Federal de Campina Grande (UFCG).',
    ),
  },
})

// The band's photo stays in the code, with the rest of the images.
export const SOBRE_FAIXA_IMAGEM = '/images/faixas/sobre.webp'

export const COMUNICACAO_PAGINA = defineCopy({
  id: 'comunicacaoPagina',
  name: 'Comunicação · Página',
  description:
    'Textos da página Comunicação ao redor da lista de publicações. As publicações em si são as entradas de Cartilha e Caderno Temático. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    // Figma node 18978:2050. The paragraph is the landing's former description
    // of the platform, word for word; it looks like placeholder copy, and is an
    // open question to the content owner (issue #44, question 4).
    introChamada: line('Introdução · Chamada acima do título', 'Materiais'),
    introTitulo: line('Introdução · Título', 'Comunicação'),
    introTexto: paragraph(
      'Introdução · Texto',
      'A Caativar reúne, em um só lugar e de forma aberta, dados, mapas e conteúdos sobre o carbono da Caatinga. Foi feita para que quem vive no bioma e quem decide sobre ele conheça o que cada território guarda, avalie propostas de projetos de carbono e negocie com mais segurança.',
    ),
  },
})
