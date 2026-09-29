// Structure of "Como funciona" (/sobre/como-funciona), Figma frame 18988:8943,
// content node 18988:8972. The steps are the six variants of the "Card Sobre"
// component (18985:7140 and siblings). The copy (verbatim from the design) lives
// in translations/<locale>/SobreComoFuncionaPage.json under steps.<id> and
// faq.items.<id>; this module holds the ids and the shape.

// Colour of a group of step 2's labels. The four mirror the four themes of the
// map's layer panel (config/mapa/groups.ts); the design words the third one
// "Uso da terra e pressões" where the panel says "Uso do solo e pressões".
export type TomGrupo = 'territorio' | 'carbono' | 'pressoes' | 'ambiente'

// `id` is the key of the group under steps.<step>.groups.<id>, `itens` the keys
// of its labels under items.
export type GrupoInformacao = { id: string; tom: TomGrupo; itens: string[] }

export type Passo = {
  id: string
  // Keys of the paragraphs under steps.<id>.
  paragrafos: string[]
  grupos?: GrupoInformacao[]
}

export const COMO_FUNCIONA = {
  passos: [
    { id: 'findArea', paragrafos: ['p1', 'p2'] },
    {
      id: 'chooseInfo',
      paragrafos: ['p1'],
      grupos: [
        { id: 'territory', tom: 'territorio', itens: ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'] },
        { id: 'carbon', tom: 'carbono', itens: ['i1', 'i2', 'i3', 'i4'] },
        { id: 'pressures', tom: 'pressoes', itens: ['i1', 'i2'] },
        { id: 'environment', tom: 'ambiente', itens: ['i1', 'i2', 'i3'] },
      ],
    },
    { id: 'viewMap', paragrafos: ['p1', 'p2'] },
    { id: 'choosePeriod', paragrafos: ['p1'] },
    { id: 'details', paragrafos: ['p1', 'p2'] },
    { id: 'report', paragrafos: ['p1'] },
  ] satisfies Passo[],

  // 18988:8979: ids of the questions under faq.items.
  duvidas: ['availability', 'download', 'sources'],
}
