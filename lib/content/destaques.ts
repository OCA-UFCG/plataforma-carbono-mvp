import { defineCopy, line, type Copy } from './site/model'

// The four highlight cards of the Figma home frame (18862:8538).
// Numbers are kept apart from their units because the card renders them at
// different sizes. Editors change the words in Contentful; the icons, and so
// the number of cards, stay here.
//
// The copy below is the Contentful entry as editors left it on 2026-10-06:
// "Área" opens the row and "Eficiência no uso de carbono" closes it, where the
// design had "Capacidade de remoção". The removal card gives 38% of the
// greenhouse gases removed in Brazil in 2022, as /sobre/caatinga does (Costa
// et al., 2025); the card has no field to display a source, so it is recorded
// here.
//
// Each card has its own icon, white on the card's green header, named for its
// glyph. "Área" and "Eficiência" are Material Symbols ("map_search",
// "chart_data", 24dp, weight 400), recoloured from #1f1f1f, chosen on
// 2026-10-06. "População" has the Figma home's "People" and "Remoção" its
// "co2" (cards 19254:16784). The icons follow the cards by position, so a
// card moved in Contentful must be moved here too.

// One per card, in the order the cards show.
export const DESTAQUES_ICONES = [
  '/icons/destaques/map-search.svg',
  '/icons/destaques/people.svg',
  '/icons/destaques/co2.svg',
  '/icons/destaques/chart-data.svg',
]

export const INICIO_DESTAQUES = defineCopy({
  id: 'inicioDestaques',
  name: 'Início · Destaques',
  description:
    'Os quatro cartões de números da página inicial, na ordem em que aparecem. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    titulo: line('Título da seção', 'Destaques'),
    card1Rotulo: line('Cartão 1 · Rótulo', 'Área'),
    card1Numero: line('Cartão 1 · Número', '≅850'),
    card1Unidade: line('Cartão 1 · Unidade', 'mil km²'),
    card1Texto: line('Cartão 1 · Texto', 'de extensão, abrangendo 9 estados'),
    card2Rotulo: line('Cartão 2 · Rótulo', 'População'),
    card2Numero: line('Cartão 2 · Número', '≅26'),
    card2Unidade: line('Cartão 2 · Unidade', 'milhões'),
    card2Texto: line('Cartão 2 · Texto', 'de pessoas vivem no bioma Caatinga'),
    card3Rotulo: line('Cartão 3 · Rótulo', 'Remoção de carbono'),
    card3Numero: line('Cartão 3 · Número', '38'),
    card3Unidade: line('Cartão 3 · Unidade', '%'),
    card3Texto: line('Cartão 3 · Texto', 'dos gases de efeito estufa removidos no país em 2022 foi pelo bioma'),
    card4Rotulo: line('Cartão 4 · Rótulo', 'Eficiência no uso de carbono'),
    card4Numero: line('Cartão 4 · Número', '60'),
    card4Unidade: line('Cartão 4 · Unidade', '%'),
    card4Texto: line('Cartão 4 · Texto', 'do carbono capturado não volta para a atmosfera'),
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
