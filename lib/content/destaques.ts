// The four highlight cards, copy taken from the Figma home frame (18862:8538).
// Numbers are kept apart from their units because the card renders them at
// different sizes.
//
// All four cards reuse the exact same "Map" icon glyph in the Figma file
// (nodes I18862:8542;18808:5943, I18862:8543;18808:5943, I18862:8544;18808:5943
// and I18862:8545;18808:5943 all point at the same exported asset). That is
// not an oversight on this side: the icon paths below are four copies of that
// one exported SVG, one per card, so a future design pass can swap a single
// card's glyph without touching the others.
//
// The second card deliberately departs from the Figma copy, on the content
// owner's instruction. The design read 40% "das remoções de gases de efeito
// estufa do Brasil em 2022" with no source. The figure now shown is the 48%
// the previous landing carried, which is a DIFFERENT metric — gross CARBON
// removal, not all greenhouse gases — so the label and the sentence moved with
// the number rather than the number alone: "48% of GHG removals" is a claim
// neither source supports.
//
// Source for the figure and wording, carried over from the previous landing
// (now lib/content/dimensoes.ts): DA COSTA et al. (2025); MENDES et al.
// (2023; 2025). The card has no field to display it — the design's card has no
// source line — so it is recorded here. Raised in the PR: a headline figure on
// a platform whose argument is open scientific data arguably ought to show its
// provenance, which would need a design change.
export type Destaque = {
  icone: string
  rotulo: string
  numero: string
  unidade: string
  texto: string
}

export const DESTAQUES: Destaque[] = [
  {
    icone: '/icons/destaques/populacao.svg',
    rotulo: 'População do bioma',
    numero: '26',
    unidade: 'milhões',
    texto: 'de pessoas vivem no bioma.',
  },
  {
    icone: '/icons/destaques/remocao.svg',
    rotulo: 'Remoção de carbono',
    numero: '48',
    unidade: '%',
    texto:
      'da remoção bruta de carbono do Brasil em 2022, ocupando cerca de 10% do território.',
  },
  {
    icone: '/icons/destaques/eficiencia.svg',
    rotulo: 'Eficiência de carbono',
    numero: '60',
    unidade: '%',
    texto: 'de eficiência no uso do carbono, uma das maiores do Brasil e do mundo.',
  },
  {
    icone: '/icons/destaques/capacidade.svg',
    rotulo: 'Capacidade de remoção',
    numero: '1,5–5',
    unidade: 't CO₂/ha/ano',
    texto: 'de capacidade de remoção de carbono.',
  },
]
