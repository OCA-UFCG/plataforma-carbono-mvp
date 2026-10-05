import { defineCopy, line, type Copy } from './site/model'

// The four highlight cards, copy taken from the Figma home frame (18862:8538).
// Numbers are kept apart from their units because the card renders them at
// different sizes. Editors change the words in Contentful; the icons, and so
// the number of cards, stay here.
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

// One per card, in the order the cards show.
export const DESTAQUES_ICONES = [
  '/icons/destaques/populacao.svg',
  '/icons/destaques/remocao.svg',
  '/icons/destaques/eficiencia.svg',
  '/icons/destaques/capacidade.svg',
]

export const INICIO_DESTAQUES = defineCopy({
  id: 'inicioDestaques',
  name: 'Início · Destaques',
  description:
    'Os quatro cartões de números da página inicial, na ordem em que aparecem. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    titulo: line('Título da seção', 'Destaques'),
    card1Rotulo: line('Cartão 1 · Rótulo', 'População'),
    card1Numero: line('Cartão 1 · Número', '26'),
    card1Unidade: line('Cartão 1 · Unidade', 'milhões'),
    card1Texto: line('Cartão 1 · Texto', 'de pessoas vivem no bioma Caatinga.'),
    card2Rotulo: line('Cartão 2 · Rótulo', 'Remoção de carbono'),
    card2Numero: line('Cartão 2 · Número', '40'),
    card2Unidade: line('Cartão 2 · Unidade', '%'),
    card2Texto: line('Cartão 2 · Texto', 'dos gases de efeito estufa removidos no país em 2022 foi pelo bioma.'),
    card3Rotulo: line('Cartão 3 · Rótulo', 'Eficiência de carbono'),
    card3Numero: line('Cartão 3 · Número', '60'),
    card3Unidade: line('Cartão 3 · Unidade', '%'),
    card3Texto: line('Cartão 3 · Texto', 'de eficiência no uso do carbono, uma das maiores do Brasil e do mundo.'),
    card4Rotulo: line('Cartão 4 · Rótulo', 'Capacidade de remoção'),
    card4Numero: line('Cartão 4 · Número', '1,5–5'),
    card4Unidade: line('Cartão 4 · Unidade', 't CO₂/ha/ano'),
    card4Texto: line('Cartão 4 · Texto', 'de capacidade de remoção de carbono.'),
  },
})

export type Destaque = {
  icone: string
  rotulo: string
  numero: string
  unidade: string
  texto: string
}

export function destaquesCards(copy: Copy<typeof INICIO_DESTAQUES>): Destaque[] {
  const cards = [
    { rotulo: copy.card1Rotulo, numero: copy.card1Numero, unidade: copy.card1Unidade, texto: copy.card1Texto },
    { rotulo: copy.card2Rotulo, numero: copy.card2Numero, unidade: copy.card2Unidade, texto: copy.card2Texto },
    { rotulo: copy.card3Rotulo, numero: copy.card3Numero, unidade: copy.card3Unidade, texto: copy.card3Texto },
    { rotulo: copy.card4Rotulo, numero: copy.card4Numero, unidade: copy.card4Unidade, texto: copy.card4Texto },
  ]

  return cards.map((card, i) => ({ icone: DESTAQUES_ICONES[i], ...card }))
}
