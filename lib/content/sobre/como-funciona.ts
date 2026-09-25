// Content of "Como funciona" (/sobre/como-funciona), Figma frame 18988:8943,
// content node 18988:8972, copied verbatim. The steps are the six variants of
// the "Card Sobre" component (18985:7140 and siblings).

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

export const COMO_FUNCIONA = {
  passos: [
    {
      titulo: 'Encontre a área de interesse',
      paragrafos: [
        'Busque um município ou estado pelo nome ou ative no mapa os limites territoriais que deseja visualizar. A plataforma apresenta os limites da Caatinga, estados, municípios, terras indígenas, territórios quilombolas e assentamentos.',
        'Também é possível marcar ou delimitar locais no mapa usando pontos, linhas, retângulos, polígonos ou coordenadas.',
      ],
    },
    {
      titulo: 'Escolha as informações',
      paragrafos: ['As informações estão organizadas em quatro grupos:'],
      grupos: [
        {
          rotulo: 'Território',
          tom: 'territorio',
          itens: ['limites da Caatinga', 'estados', 'municípios', 'terras indígenas', 'territórios quilombolas', 'assentamentos'],
        },
        {
          rotulo: 'Carbono',
          tom: 'carbono',
          itens: ['estoque por reservatório (solo, biomassa)', 'estrutura da vegetação', 'produtividade', 'fluxos de carbono'],
        },
        {
          rotulo: 'Uso da terra e pressões',
          tom: 'pressoes',
          itens: ['uso e cobertura da terra', 'ocorrência de fogo'],
        },
        {
          rotulo: 'Ambiente',
          tom: 'ambiente',
          itens: ['vegetação', 'mudanças da vegetação ao longo do tempo', 'clima'],
        },
      ],
    },
    {
      titulo: 'Visualize no mapa',
      paragrafos: [
        'Ative as informações que deseja consultar. Você pode visualizar uma camada por vez ou combinar diferentes dados no mesmo mapa.',
        'Também é possível ajustar a transparência das camadas e consultar na legenda os valores, as cores e as unidades de medida de cada informação.',
      ],
    },
    {
      titulo: 'Escolha o período',
      paragrafos: [
        'Quando houver informações para mais de um ano, utilize a linha do tempo para consultar diferentes períodos e acompanhar as mudanças na área selecionada.',
      ],
    },
    {
      titulo: 'Consulte os detalhes',
      paragrafos: [
        'Consulte a descrição, a unidade de medida, o período de referência e os anos disponíveis para cada dado. A plataforma também apresenta informações sobre as fontes e as metodologias utilizadas.',
        'As informações disponíveis podem variar conforme o território, o dado e o período selecionados.',
      ],
    },
    {
      titulo: 'Gere um relatório territorial',
      paragrafos: [
        'Reúna, em um único documento, as principais informações sobre o território escolhido. Defina o ano, escolha os dados que deseja incluir e baixe o relatório.',
      ],
    },
  ] satisfies Passo[],

  // 18988:8979
  duvidas: {
    titulo: 'Dúvidas frequentes',
    itens: [
      {
        pergunta: 'Todos os dados estão disponíveis para todos os territórios?',
        resposta: 'Não. A disponibilidade depende da área coberta, da fonte e do período de cada dado.',
      },
      {
        pergunta: 'Posso baixar as informações?',
        resposta:
          'Sim. Os dados disponíveis na plataforma podem ser baixados para consulta e uso em outras análises. As opções de download variam conforme o dado selecionado.',
      },
      {
        pergunta: 'De onde vêm os dados?',
        resposta:
          'Os dados são produzidos por instituições públicas, centros de pesquisa e outras fontes identificadas na plataforma. Também é possível consultar informações sobre as metodologias utilizadas.',
      },
    ],
  },
}
