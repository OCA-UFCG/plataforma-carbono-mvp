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
// The first two cards carry the copy of the content doc's 2026-10-05 meeting.
// The second is back to the design's 40% of the greenhouse gases removed in
// Brazil in 2022, which the content doc's bulletin sources to Climate TRACE
// (2022): 410 Mt CO2e, the figure /sobre/caatinga gives. It replaces the 48%
// of gross carbon removal the previous landing carried, a different metric
// (DA COSTA et al., 2025; MENDES et al., 2023; 2025). The card has no field to
// display a source — the design's card has no source line — so it is recorded
// here.
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
    rotulo: 'População',
    numero: '26',
    unidade: 'milhões',
    texto: 'de pessoas vivem no bioma Caatinga.',
  },
  {
    icone: '/icons/destaques/remocao.svg',
    rotulo: 'Remoção de carbono',
    numero: '40',
    unidade: '%',
    texto: 'dos gases de efeito estufa removidos no país em 2022 foi pelo bioma.',
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
