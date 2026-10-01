// Structure of "Conheça a Caatinga" (/sobre/caatinga), Figma frame 18988:8667,
// content node 18988:8696. The copy (verbatim from the design, image alt text
// written by us) lives in translations/<locale>/SobreCaatingaPage.json; this
// module holds what does not translate: the image and the keys of the text
// blocks under each section of the messages.

export const CAATINGA = {
  // 18988:8697: the opening text, with no heading of its own (opening.<key>).
  abertura: ['p1', 'p2'],

  // 18988:8700. The design sets the second and third lines together, with no
  // blank line between them; each inner array is one block, its strings the
  // keys under vegetation.blocks.
  vegetacao: {
    blocos: [['b1.l1'], ['b2.l1', 'b2.l2']],
  },

  // 18988:8708: climate.{title,before,indicator,after}
  // 18988:8716: efficiency.{title,before,indicator,after}

  // 18988:8724: storage.{title,before,indicators.<id>,after.<key>}
  armazenamento: {
    indicadores: ['density', 'capacity'],
    depois: ['p1', 'p2'],
  },

  // 18988:8734: text beside the photo (people.paragraphs.<key>). The last
  // paragraph has no final full stop in the design; kept verbatim and flagged
  // to the content owner.
  pessoas: {
    paragrafos: ['p1', 'p2'],
    // The same photo as the landing's "Carbono e comunidades" tab (IMAGENS.md).
    imagem: '/images/plataforma/carbono-e-comunidades.webp',
  },

  // 18988:8741, the section with the red heading: pressure.{title,before,
  // comparison,after}; 18988:8747 is the comparison.
} as const
