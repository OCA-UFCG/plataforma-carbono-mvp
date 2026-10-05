// Copy for the internal pages' shared frame: the grey intro band at the top
// and the photo band above the footer. Taken verbatim from the Figma frames
// "Sobre" (18988:8611, the same intro on all four Sobre pages) and
// "Comunicação" (18978:2048). Each page's own content lives in its own module.

export type PageIntroContent = {
  eyebrow?: string
  title: string
  intro: string
}

export type PhotoBandContent = {
  image: string
  eyebrow?: string
  title: string
  items?: string[]
}

// Figma node 18988:8613, with the copy of the content doc's 2026-10-05
// meeting, which dropped the design's "Institucional" eyebrow.
export const SOBRE_INTRO: PageIntroContent = {
  title: 'Sobre a Caativar',
  intro:
    'A Caativar é uma iniciativa da Superintendência do Desenvolvimento do Nordeste (Sudene), em parceria com o Observatório da Caatinga e Desertificação (OCA) da Universidade Federal de Campina Grande (UFCG).',
}

// Figma node 18978:2050. The paragraph is the landing's former description of
// the platform, word for word; it looks like placeholder copy, and is an open
// question to the content owner (issue #44, question 4).
export const COMUNICACAO_INTRO: PageIntroContent = {
  eyebrow: 'Materiais',
  title: 'Comunicação',
  intro:
    'A Caativar reúne, em um só lugar e de forma aberta, dados, mapas e conteúdos sobre o carbono da Caatinga. Foi feita para que quem vive no bioma e quem decide sobre ele conheça o que cada território guarda, avalie propostas de projetos de carbono e negocie com mais segurança.',
}

// Figma node 18988:8651, at the foot of "Conheça a plataforma" only.
export const SOBRE_FAIXA: PhotoBandContent = {
  image: '/images/faixas/sobre.webp',
  title: 'O que a plataforma não faz',
  items: [
    'Não vende créditos de carbono',
    'Não certifica nem aprova projetos',
    'Não substitui reguladores e certificadoras',
  ],
}

// Figma node 18978:2080.
export const COMUNICACAO_FAIXA: PhotoBandContent = {
  image: '/images/faixas/comunicacao.webp',
  eyebrow: 'Esse espaço está crescendo',
  title:
    'Estamos desenvolvendo mais cartilhas, cadernos temáticos e outros materiais sobre o carbono na Caatinga.',
}
