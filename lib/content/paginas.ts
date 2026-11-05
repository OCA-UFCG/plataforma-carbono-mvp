import { defineCopy, line, optionalLine, paragraph } from './site/model'

// Copy for the internal pages' shared frame: the grey intro band at the top.
// Taken verbatim from the Figma frames "Sobre" (19538:11039, the same intro
// on all four Sobre pages), "Comunicação" (18978:2048) and "Glossário"
// (19400:12092). Each page's own content lives in its own module.

export type PageIntroContent = {
  eyebrow?: string
  title: string
  intro: string
}

// Figma node 18988:8613, with the copy of the content doc's 2026-10-05
// meeting, which dropped the design's "Institucional" eyebrow.
export const SOBRE_INTRO = defineCopy({
  id: 'sobreIntro',
  name: 'Sobre · Introdução',
  description:
    'Faixa cinza do topo das quatro páginas de Sobre, a mesma em todas. Há uma única entrada deste tipo: edite-a, não crie outra.',
  localized: true,
  fields: {
    chamada: optionalLine('Chamada acima do título'),
    titulo: line('Título', 'Sobre a Caativar'),
    texto: paragraph(
      'Texto',
      'A Caativar é uma iniciativa da Superintendência do Desenvolvimento do Nordeste (Sudene), em parceria com o Observatório da Caatinga e Desertificação (OCA) da Universidade Federal de Campina Grande (UFCG).',
    ),
  },
})

export const COMUNICACAO_PAGINA = defineCopy({
  id: 'comunicacaoPagina',
  name: 'Comunicação · Página',
  description:
    'Textos da página Comunicação ao redor da lista de publicações. As publicações em si são as entradas de Cartilha e Caderno Temático. Há uma única entrada deste tipo: edite-a, não crie outra.',
  localized: true,
  fields: {
    // Figma node 18978:2050, without its "Materiais" eyebrow, taken out on
    // 2026-10-06. The paragraph is the landing's former description of the
    // platform, word for word; it looks like placeholder copy, and is an open
    // question to the content owner (issue #44, question 4).
    introTitulo: line('Introdução · Título', 'Comunicação'),
    introTexto: paragraph(
      'Introdução · Texto',
      'A Caativar reúne, em um só lugar e de forma aberta, dados, mapas e conteúdos sobre o carbono da Caatinga. Foi feita para que quem vive no bioma e quem decide sobre ele conheça o que cada território guarda, avalie propostas de projetos de carbono e negocie com mais segurança.',
    ),
  },
})

export const GLOSSARIO_PAGINA = defineCopy({
  id: 'glossarioPagina',
  name: 'Glossário · Página',
  description:
    'Título da página Glossário, no topo da barra lateral. O campo "Introdução · Texto" não aparece mais na página. Os termos em si ainda estão no código (lib/glossario/termos.ts). Há uma única entrada deste tipo: edite-a, não crie outra.',
  localized: true,
  fields: {
    // The title over the sidebar, Figma node 19507:16727.
    introTitulo: line('Introdução · Título', 'Glossário'),
    // LEGACY: the paragraph of the intro band the redesign dropped
    // (19507:12478), unread since. It stays declared because
    // `npm run contentful:provision -- --apply` puts the whole content type,
    // and Contentful refuses to drop a field that was not omitted first.
    // Removing it takes omitting it in the space, then deleting it there and
    // here. The old frame (19400:12094) repeated the Comunicação page's
    // paragraph word for word (issue #44, question 4; issue #147, question 2).
    introTexto: paragraph(
      'Introdução · Texto',
      'A Caativar reúne, em um só lugar e de forma aberta, dados, mapas e conteúdos sobre o carbono da Caatinga. Foi feita para que quem vive no bioma e quem decide sobre ele conheça o que cada território guarda, avalie propostas de projetos de carbono e negocie com mais segurança.',
    ),
  },
})
