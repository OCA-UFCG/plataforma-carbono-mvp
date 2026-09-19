// Content for the "Conheça a plataforma" tabbed section (Plataforma,
// Figma node 18862:8546, "Sobre"). Only the first tab is designed in the
// Figma file; the other three ("A Caatinga", "Carbono e comunidades",
// "Como funciona") have no copy anywhere in the repo or the design. This is
// a recorded product decision, not an oversight: the content this page
// replaced was sourced, cited material, and inventing lookalike scientific
// copy to fill the gap would be worse than an empty state. See
// components/marketing/Plataforma.tsx for how `conteudo: null` renders.

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
  // null means the copy has not been written yet: the section renders an empty
  // state for the tab rather than inventing scientific content.
  conteudo: ConteudoAba | null
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
  { id: 'a-caatinga', label: 'A Caatinga', conteudo: null },
  { id: 'carbono-e-comunidades', label: 'Carbono e comunidades', conteudo: null },
  { id: 'como-funciona', label: 'Como funciona', conteudo: null },
]
