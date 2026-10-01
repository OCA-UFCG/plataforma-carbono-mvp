// Structure of "Entenda essa relação" (/sobre/carbono-e-comunidades), Figma
// frame 18988:8769, content node 18988:8798. The copy (verbatim from the design,
// image alt text written by us) lives in
// translations/<locale>/SobreCarbonoComunidadesPage.json, one object per
// section named by its `id`; this module holds the ids, the images and the
// shape of the text. Three terms carry an "ⓘ" in the design ("consulta livre,
// prévia e informada", "adicionais", "permanência") for a glossary it does not
// define (issue #44, question 3); the marker is left out until that content
// exists, rather than rendering an icon that does nothing.

// A section of plain paragraphs: `id` is its key in the messages, `paragrafos`
// the keys of its paragraphs (<id>.<key>) and `destaque` says it closes on the
// bold line <id>.highlight.
export type SecaoTexto = {
  id: string
  paragrafos: string[]
  destaque?: true
}

// A question tile's icon, as the design composes it: most are one SVG; "paid"
// and "calendar month" are an empty 85px frame with the glyph inset in it, by
// the percentages of the frame the design gives (vertical, horizontal).
export type IconePergunta = {
  src: string
  glyph?: { src: string; insetY: string; insetX: string }
}

// `id` is the key of the question in questions.items.
export type Pergunta = { id: string; icone: IconePergunta }

const ICONES = '/icons/sobre'

export const CARBONO_E_COMUNIDADES = {
  // 18988:8799
  antesDeParticipar: { id: 'before', paragrafos: ['p1', 'p2'], destaque: true } satisfies SecaoTexto,

  // 18988:8806
  renda: { id: 'income', paragrafos: ['p1', 'p2', 'p3'] } satisfies SecaoTexto,

  // 18988:8811, text beside the photo
  direitoTerra: {
    id: 'landRights',
    paragrafos: ['p1', 'p2', 'p3'],
    imagem: '/images/sobre/lago-serra.webp',
  } satisfies SecaoTexto & { imagem: string },

  // 18988:8818
  lei: {
    id: 'law',
    paragrafos: ['p1', 'p2'],
    // 18988:8824: keys of the figures under law.guarantees.
    garantias: ['removal', 'deforestation'],
  } satisfies SecaoTexto & { garantias: string[] },

  // 18988:8842
  decisoes: { id: 'decisions', paragrafos: ['p1', 'p2', 'p3'] } satisfies SecaoTexto,

  // 18988:8847
  beneficios: { id: 'benefits', paragrafos: ['p1', 'p2', 'p3'] } satisfies SecaoTexto,

  // 18988:8852: cautions.{title,introduction,items.<key>,closing}
  cuidados: {
    itens: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
  },

  // 18988:8883 (heading) and 18988:8886 (tiles): questions.{title,introduction,
  // items.<id>}. The heading repeats the first section's title word for word;
  // flagged to the content owner.
  perguntas: {
    itens: [
      {
        id: 'funder',
        icone: { src: `${ICONES}/paid.svg`, glyph: { src: `${ICONES}/paid-glyph.svg`, insetY: '8.33%', insetX: '8.33%' } },
      },
      { id: 'rights', icone: { src: `${ICONES}/home-work.svg` } },
      {
        id: 'duration',
        icone: {
          src: `${ICONES}/calendar-month.svg`,
          glyph: { src: `${ICONES}/calendar-month-glyph.svg`, insetY: '8.33%', insetX: '12.5%' },
        },
      },
      { id: 'sharing', icone: { src: `${ICONES}/calculate.svg` } },
      { id: 'costs', icone: { src: `${ICONES}/insert-chart.svg` } },
      { id: 'activities', icone: { src: `${ICONES}/real-estate-agent.svg` } },
      { id: 'monitoring', icone: { src: `${ICONES}/monitoring.svg` } },
      { id: 'refusal', icone: { src: `${ICONES}/group-off.svg` } },
    ] satisfies Pergunta[],
  },

  // 18988:8941: the closing paragraph, key `closing` in the messages.
}
