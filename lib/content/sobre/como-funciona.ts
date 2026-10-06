import { defineCopy, line, list, paragraph, text, type Copy } from '../site/model'

// Content of "Como funciona" (/sobre/como-funciona), Figma frame 18988:8943,
// content node 18988:8972, copied verbatim. The steps are the six variants of
// the "Card Sobre" component (18985:7140 and siblings). Ten of step 2's labels
// end in a space in the design ("limites da Caatinga ", …), which makes those
// badges 3px wider there; the space is a copy artefact, which HTML would drop
// at the end of the line anyway, so it is left out.

// Colour of a group of step 2's labels. The four mirror the four themes of the
// map's layer panel (config/mapa/groups.ts); the design words the third one
// "Uso da terra e pressões" where the panel says "Uso do solo e pressões".
export type TomGrupo = 'territorio' | 'carbono' | 'pressoes' | 'ambiente'

export type GrupoInformacao = { rotulo: string; tom: TomGrupo; itens: string[] }

export type Passo = {
  titulo: string
  paragrafos: string[]
  grupos?: GrupoInformacao[]
}

export type Duvida = { pergunta: string; resposta: string }

export const COMO_FUNCIONA = defineCopy({
  id: 'sobreComoFunciona',
  name: 'Sobre · Como funciona',
  description:
    'Textos da página /sobre/como-funciona: os seis passos de uso do mapa, na ordem em que aparecem, e as dúvidas frequentes. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    passo1Titulo: line('Passo 1 · Título', 'Encontre a área de interesse'),
    passo1Texto: text('Passo 1 · Texto', [
      'Busque um município ou estado pelo nome ou ative no mapa os limites territoriais que deseja visualizar. A plataforma apresenta os limites da Caatinga, estados, municípios, terras indígenas, territórios quilombolas e assentamentos.',
      'Também é possível marcar ou delimitar locais no mapa usando pontos, linhas, retângulos, polígonos ou coordenadas.',
    ]),

    // Step 2 adds the four groups of labels, each in its theme's colour (the
    // colours stay here, in GRUPOS_TONS).
    passo2Titulo: line('Passo 2 · Título', 'Escolha as informações'),
    passo2Texto: text('Passo 2 · Texto', 'As informações estão organizadas em quatro grupos:'),
    grupo1Rotulo: line('Passo 2 · Grupo 1 · Nome', 'Território'),
    grupo1Itens: list('Passo 2 · Grupo 1 · Itens', [
      'limites da Caatinga',
      'estados',
      'municípios',
      'terras indígenas',
      'territórios quilombolas',
      'assentamentos',
    ]),
    grupo2Rotulo: line('Passo 2 · Grupo 2 · Nome', 'Carbono'),
    grupo2Itens: list('Passo 2 · Grupo 2 · Itens', [
      'estoque por reservatório (solo, biomassa)',
      'estrutura da vegetação',
      'produtividade',
      'fluxos de carbono',
    ]),
    grupo3Rotulo: line('Passo 2 · Grupo 3 · Nome', 'Uso da terra e pressões'),
    grupo3Itens: list('Passo 2 · Grupo 3 · Itens', ['uso e cobertura da terra', 'ocorrência de fogo']),
    grupo4Rotulo: line('Passo 2 · Grupo 4 · Nome', 'Ambiente'),
    grupo4Itens: list('Passo 2 · Grupo 4 · Itens', [
      'vegetação',
      'mudanças da vegetação ao longo do tempo',
      'clima',
    ]),

    passo3Titulo: line('Passo 3 · Título', 'Visualize no mapa'),
    passo3Texto: text('Passo 3 · Texto', [
      'Ative as informações que deseja consultar. Você pode visualizar uma camada por vez ou combinar diferentes dados no mesmo mapa.',
      'Também é possível ajustar a transparência das camadas e consultar na legenda os valores, as cores e as unidades de medida de cada informação.',
    ]),
    passo4Titulo: line('Passo 4 · Título', 'Escolha o período'),
    passo4Texto: text(
      'Passo 4 · Texto',
      'Quando houver informações para mais de um ano, utilize a linha do tempo para consultar diferentes períodos e acompanhar as mudanças na área selecionada.',
    ),
    passo5Titulo: line('Passo 5 · Título', 'Consulte os detalhes'),
    passo5Texto: text('Passo 5 · Texto', [
      'Consulte a descrição, a unidade de medida, o período de referência e os anos disponíveis para cada dado. A plataforma também apresenta informações sobre as fontes e as metodologias utilizadas.',
      'As informações disponíveis podem variar conforme o território, o dado e o período selecionados.',
    ]),
    passo6Titulo: line('Passo 6 · Título', 'Gere um relatório territorial'),
    passo6Texto: text(
      'Passo 6 · Texto',
      'Reúna, em um único documento, as principais informações sobre o território escolhido. Defina o ano, escolha os dados que deseja incluir e baixe o relatório.',
    ),

    // 18988:8979
    duvidasTitulo: line('Dúvidas frequentes · Título', 'Dúvidas frequentes'),
    duvida1Pergunta: line(
      'Dúvida 1 · Pergunta',
      'Todos os dados estão disponíveis para todos os territórios?',
    ),
    duvida1Resposta: paragraph(
      'Dúvida 1 · Resposta',
      'Não. A disponibilidade depende da área coberta, da fonte e do período de cada dado.',
    ),
    duvida2Pergunta: line('Dúvida 2 · Pergunta', 'Posso baixar as informações?'),
    duvida2Resposta: paragraph(
      'Dúvida 2 · Resposta',
      'Sim. Os dados disponíveis na plataforma podem ser baixados para consulta e uso em outras análises. As opções de download variam conforme o dado selecionado.',
    ),
    duvida3Pergunta: line('Dúvida 3 · Pergunta', 'De onde vêm os dados?'),
    duvida3Resposta: paragraph(
      'Dúvida 3 · Resposta',
      'Os dados são produzidos por instituições públicas, centros de pesquisa e outras fontes identificadas na plataforma. Também é possível consultar informações sobre as metodologias utilizadas.',
    ),
  },
})

// One per group of step 2, in order.
export const GRUPOS_TONS: TomGrupo[] = ['territorio', 'carbono', 'pressoes', 'ambiente']

export function passos(copy: Copy<typeof COMO_FUNCIONA>): Passo[] {
  const grupos: GrupoInformacao[] = [
    { rotulo: copy.grupo1Rotulo, itens: copy.grupo1Itens },
    { rotulo: copy.grupo2Rotulo, itens: copy.grupo2Itens },
    { rotulo: copy.grupo3Rotulo, itens: copy.grupo3Itens },
    { rotulo: copy.grupo4Rotulo, itens: copy.grupo4Itens },
  ].map((grupo, i) => ({ ...grupo, tom: GRUPOS_TONS[i] }))

  return [
    { titulo: copy.passo1Titulo, paragrafos: copy.passo1Texto },
    { titulo: copy.passo2Titulo, paragrafos: copy.passo2Texto, grupos },
    { titulo: copy.passo3Titulo, paragrafos: copy.passo3Texto },
    { titulo: copy.passo4Titulo, paragrafos: copy.passo4Texto },
    { titulo: copy.passo5Titulo, paragrafos: copy.passo5Texto },
    { titulo: copy.passo6Titulo, paragrafos: copy.passo6Texto },
  ]
}

export function duvidas(copy: Copy<typeof COMO_FUNCIONA>): Duvida[] {
  return [
    { pergunta: copy.duvida1Pergunta, resposta: copy.duvida1Resposta },
    { pergunta: copy.duvida2Pergunta, resposta: copy.duvida2Resposta },
    { pergunta: copy.duvida3Pergunta, resposta: copy.duvida3Resposta },
  ]
}
