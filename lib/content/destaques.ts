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
// Known discrepancy, not silently resolved: the "Remoção de GEE" card says
// 40% "das remoções de gases de efeito estufa do Brasil em 2022" per the
// Figma copy. The landing this replaces said 48% "da remoção bruta de
// carbono do país" (that old copy now lives in lib/content/dimensoes.ts).
// Both figures may be correct — all greenhouse gases versus carbon alone —
// but the content owner has not confirmed which the site should show. This
// ships the Figma figure (40%) as instructed; do not "fix" it back to 48%
// without checking with the content owner first.
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
    rotulo: 'Remoção de GEE',
    numero: '40',
    unidade: '%',
    texto:
      'das remoções de gases de efeito estufa do Brasil em 2022, mais do que qualquer outro bioma.',
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
