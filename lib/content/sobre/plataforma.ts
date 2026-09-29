// Structure of "Conheça a plataforma" (/sobre), Figma frame 18988:8611, content
// node 18988:8640. The copy (verbatim from the design) lives in
// translations/<locale>/SobrePlataformaPage.json; this module holds what does
// not translate: the image, the icons and the shape of the text. The "O que a
// plataforma não faz" band at the foot of the page is SOBRE_FAIXA in
// lib/content/paginas.ts.

// The design breaks the opening text into three blocks with a blank line
// between them, the first and last of two lines each; every inner array is
// one block, its strings the keys of the lines (why.blocks.<key> in the
// messages).
export const SOBRE_PLATAFORMA = {
  // 18988:8641: the text beside the photo.
  porQue: {
    blocos: [['b1.l1', 'b1.l2'], ['b2.l1'], ['b3.l1', 'b3.l2']],
    // The same photo as "Entenda essa relação" (IMAGENS.md). Its alt text is
    // why.imageAlt in the messages.
    imagem: '/images/sobre/lago-serra.webp',
  },

  // 18988:8648: the two icon cards; `id` is the key under cards.<id> in the
  // messages, `paragrafos` the keys of its paragraphs.
  cards: [
    { id: 'mission', icone: '/icons/sobre/target.svg', paragrafos: ['p1'] },
    { id: 'audience', icone: '/icons/sobre/groups.svg', paragrafos: ['p1', 'p2'] },
  ],
}
