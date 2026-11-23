import { copyDefaults, defineCopy, line, paragraph, type Copy, type CopyType } from './site/model'

// Copy of the Territórios story (/territorios, the "Recorte Territorial"). Each
// tab has a content type, so an editor finds a tab's words in one entry: its
// question, the box on why the theme matters and its source, and its source in
// "Sobre os dados".
//
// LEGACY: each theme's `resumoTitulo`, the title of its card on the summary, is
// unread since the summary repeats the steps under their questions. It stays
// declared because `npm run contentful:provision -- --apply` puts the whole
// content type, and Contentful refuses to drop a field that was not omitted
// first (see GLOSSARIO_PAGINA in lib/content/paginas.ts). The presentation over the gallery of types and the shared part of
// "Sobre os dados" have a type each.
//
// Each tab's answer, the sentence under its big figure, is a set of fields
// named "Resposta · ...": the page picks one by the data (a dry or rainy year,
// a loss or a gain of native vegetation) and fills its placeholders.
//
// What stays in config/territorios/: interface labels (tabs, buttons, loading
// and error messages), the chart descriptions read by screen readers, the
// summary's badges and the grammar tables ("na Paraíba", "3ª"). The years of
// each series are placeholders, filled from config/territorios/story.ts by
// storyScript(), so that a data update does not leave the copy behind.

const ONE_ENTRY = 'Há uma única entrada deste tipo: edite-a, não crie outra.'

const ANO_INICIAL = { anoInicial: 'primeiro ano dos dados' }
const ANO_FINAL = { anoFinal: 'último ano dos dados' }
const ANOS = { ...ANO_INICIAL, ...ANO_FINAL }
const TIPO = { nome: 'nome do território', tipo: 'tipo com artigo, como "um município" ou "uma terra indígena"' }
const MEDIA = { media: 'média anual do território, em mm' }
const VARIACAO_CAATINGA = { variacaoCaatinga: 'variação da Caatinga em pontos percentuais' }
const TERMO = { termo: 'palavra com link para a Caatinga Interativa' }

function tabDescription(tab: string): string {
  return `Aba "${tab}" do Recorte Territorial (/territorios): a pergunta, a caixa "Por que importa?" com a fonte e a fonte em "Sobre os dados". O campo "Resumo · Título do cartão" não aparece mais na página. ${ONE_ENTRY}`
}

export const TERRITORIOS_APRESENTACAO = defineCopy({
  id: 'territoriosApresentacao',
  name: 'Territórios · Apresentação',
  description: `Abertura do Recorte Territorial (/territorios): o título, que fica também na escolha do território, o texto abaixo dele e o título da galeria de recortes. ${ONE_ENTRY}`,
  fields: {
    titulo: line('Título', 'Que território você quer conhecer?'),
    chamada: line(
      'Texto abaixo do título',
      'Conheça o território do seu interesse em um panorama rápido e acessível sobre estoque e fluxo de carbono, uso da terra, ocorrência de fogo e chuva.',
    ),
    recortesTitulo: line('Título da galeria de recortes', 'Escolha o recorte'),
  },
})

export const TERRITORIOS_TERRITORIO = defineCopy({
  id: 'territoriosTerritorio',
  name: 'Territórios · Território',
  description: `Aba "Território" do Recorte Territorial (/territorios): a pergunta e, em "Sobre os dados", a fonte do limite do bioma e a dos municípios, que entram inteiros. ${ONE_ENTRY}`,
  fields: {
    pergunta: line('Pergunta', 'Que território estamos conhecendo?'),
    respostaLocalizado: line('Resposta · Com o estado', '{nome} é {tipo} {localizado} {estado}.', {
      ...TIPO,
      localizado: '"localizado" ou "localizada", conforme o tipo',
      estado: 'estado com a preposição, como "na Paraíba"',
    }),
    respostaSemEstado: line('Resposta · Sem o estado', '{nome} é {tipo}.', TIPO),
    respostaEstado: line('Resposta · Estado', 'Área dentro da Caatinga, {parteBioma} do bioma.', {
      parteBioma: 'parte do bioma dentro do estado',
    }),
    respostaBioma: line('Resposta · Bioma', 'A Caatinga inteira, em nove estados.'),
    sobreTitulo: line('Sobre os dados · Título', 'Território'),
    sobreTexto: paragraph('Sobre os dados · Texto', 'Área dentro do limite da Caatinga, segundo o IBGE (2019).'),
    sobreTextoMunicipios: paragraph(
      'Sobre os dados · Texto dos municípios',
      'Município inteiro, segundo o IBGE (2022), inclusive fora da Caatinga.',
    ),
  },
})

export const TERRITORIOS_ESTOQUE = defineCopy({
  id: 'territoriosEstoque',
  name: 'Territórios · Estoque',
  description: tabDescription('Estoque'),
  fields: {
    pergunta: line('Pergunta', 'Quanto carbono a vegetação original e o solo guardariam aqui?'),
    unidade: line('Número · Unidade', '{toneladas} de carbono', {
      toneladas: '"toneladas", "de toneladas" ou "tonelada", conforme o número',
    }),
    respostaSemDado: line('Resposta · Sem dado', 'Sem dado de carbono para esta área.'),
    porqueTitulo: line('Por que importa · Título', 'Por que o estoque de carbono importa?'),
    porqueTexto: paragraph('Por que importa · Texto', 'O carbono está presente nos troncos, galhos, folhas e raízes das plantas, além da matéria orgânica do solo. Esses {termo} podem ser afetados pelas mudanças no uso da terra.', TERMO),
    porqueTermo: line('Por que importa · Palavra com link', 'reservatórios de carbono'),
    fonte: line('Fonte dos dados', 'Quarto Inventário Nacional (MCTI, 2020)'),
    // LEGACY, see the note at the top.
    resumoTitulo: line('Resumo · Título do cartão', 'Carbono da vegetação original'),
    sobreTitulo: line('Sobre os dados · Título', 'Estoque'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'Quarto Inventário Nacional, em quadrados de 100 m. Carbono que a vegetação original guardaria, sem descontar o uso atual da terra; inclui o carbono do solo.',
    ),
    sobreCobertura: line(
      'Sobre os dados · Cobertura parcial',
      'O inventário cobre {percentual} desta área; o total vale só para essa parte.',
      { percentual: 'parte do território com dado do inventário' },
    ),
  },
})

export const TERRITORIOS_FLUXO = defineCopy({
  id: 'territoriosFluxo',
  name: 'Territórios · Fluxo',
  description: tabDescription('Fluxo'),
  fields: {
    pergunta: line('Pergunta', 'As áreas com árvores tiraram ou lançaram carbono do ar?'),
    unidade: line('Número · Unidade', '{toneladas} de CO₂e', { toneladas: 'escala da tonelada, como "mil t"' }),
    respostaRemocao: line('Resposta · Remoção', 'Tiraram mais carbono do que lançaram.'),
    respostaEmissao: line('Resposta · Emissão', 'Lançaram mais carbono do que tiraram.'),
    respostaEquilibrio: line('Resposta · Equilíbrio', 'Tiraram e lançaram no ar a mesma quantidade de carbono.'),
    respostaParte: line('Resposta · Parte da área', 'Cobrem {percentual} da área, {posicao} dos {percentualCaatinga} da Caatinga.', {
      percentual: 'parte do território com árvores',
      posicao: '"acima", "abaixo" ou "perto"',
      percentualCaatinga: 'parte da Caatinga com árvores',
    }),
    respostaParteSemCaatinga: line('Resposta · Parte da área, sem comparação', 'Cobrem {percentual} da área.', {
      percentual: 'parte do território com árvores',
    }),
    respostaSemArvores: line('Resposta · Sem árvores', 'Não há áreas com árvores mapeadas aqui.'),
    porqueTitulo: line('Por que importa · Título', 'Por que o fluxo de carbono importa?'),
    porqueTexto: paragraph('Por que importa · Texto', 'A vegetação tira CO₂ do ar ao crescer e o devolve quando é desmatada, queimada ou degradada. Essas trocas são os {termo} do território.', TERMO),
    porqueTermo: line('Por que importa · Palavra com link', 'fluxos de carbono'),
    fonte: line('Fonte dos dados', 'Global Forest Watch (Harris et al., 2021)'),
    // LEGACY, see the note at the top.
    resumoTitulo: line('Resumo · Título do cartão', 'Carbono trocado com o ar'),
    sobreTitulo: line('Sobre os dados · Título', 'Fluxo'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'Global Forest Watch, versão 1.4.2, 30 m; saldo de {anoInicial} a {anoFinal}. Áreas com árvores: copas cobrindo mais de 30% do chão em 2000, ou ganho de copas de 2000 a 2020.',
      ANOS,
    ),
  },
})

export const TERRITORIOS_USO = defineCopy({
  id: 'territoriosUso',
  name: 'Territórios · Uso da terra',
  description: tabDescription('Uso da terra'),
  fields: {
    pergunta: line('Pergunta', 'Como estava a cobertura vegetal nativa?'),
    unidade: line('Número · Unidade', 'do território com vegetação nativa'),
    respostaDiminuiu: line(
      'Resposta · Perda',
      'Entre {anoInicial} e {anoFinal}, a área com vegetação nativa no território diminuiu {variacao} pontos percentuais (p.p.).',
      { ...ANOS, variacao: 'variação em pontos percentuais' },
    ),
    respostaAumentou: line(
      'Resposta · Ganho',
      'Entre {anoInicial} e {anoFinal}, a área com vegetação nativa no território aumentou {variacao} pontos percentuais (p.p.).',
      { ...ANOS, variacao: 'variação em pontos percentuais' },
    ),
    respostaEstavel: line(
      'Resposta · Sem variação',
      'Entre {anoInicial} e {anoFinal}, a área com vegetação nativa no território se manteve.',
      ANOS,
    ),
    respostaComparacaoPerda: line(
      'Resposta · Comparação, perda nos dois',
      'Esse valor é {comparacao} à redução que houve na Caatinga, de {variacaoCaatinga} p.p.',
      { comparacao: '"superior", "inferior" ou "próximo"', ...VARIACAO_CAATINGA },
    ),
    respostaComparacaoGanho: line(
      'Resposta · Comparação, ganho nos dois',
      'Esse valor é {comparacao} ao aumento que houve na Caatinga, de {variacaoCaatinga} p.p.',
      { comparacao: '"superior", "inferior" ou "próximo"', ...VARIACAO_CAATINGA },
    ),
    respostaCaatingaPerda: line(
      'Resposta · Perda só na Caatinga',
      'Na Caatinga, houve redução de {variacaoCaatinga} p.p.',
      VARIACAO_CAATINGA,
    ),
    respostaCaatingaGanho: line(
      'Resposta · Ganho só na Caatinga',
      'Na Caatinga, houve aumento de {variacaoCaatinga} p.p.',
      VARIACAO_CAATINGA,
    ),
    respostaSemDado: line('Resposta · Sem dado', 'Sem dado de uso da terra aqui.'),
    porqueTitulo: line('Por que importa · Título', 'Por que o uso da terra importa?'),
    porqueTexto: paragraph('Por que importa · Texto', 'A conversão da vegetação para outros usos, como pastagem, reduz os {termo}.', TERMO),
    porqueTermo: line('Por que importa · Palavra com link', 'estoques de carbono'),
    fonte: line('Fonte dos dados', 'MapBiomas, coleção 11'),
    // LEGACY, see the note at the top.
    resumoTitulo: line('Resumo · Título do cartão', 'Vegetação nativa'),
    sobreTitulo: line('Sobre os dados · Título', 'Uso da terra'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'MapBiomas, coleção 11, 30 m, {anoInicial} e {anoFinal}. Vegetação nativa: formações florestal, savânica, campestre e herbáceo-arbustiva, mangue, floresta alagável, restingas, campo alagado e apicum. Agropecuária inclui áreas de lavoura e pasto misturados.',
      ANOS,
    ),
  },
})

export const TERRITORIOS_FOGO = defineCopy({
  id: 'territoriosFogo',
  name: 'Territórios · Fogo',
  description: tabDescription('Fogo'),
  fields: {
    pergunta: line('Pergunta', 'Como o fogo afetou o território ao longo do tempo?'),
    unidade: line('Número · Unidade', 'da área queimou ao menos uma vez entre {anoInicial} e {anoFinal}', ANOS),
    respostaComparacao: line(
      'Resposta · Comparação',
      'Para esse mesmo período, {percentualCaatinga} da Caatinga queimou ao menos uma vez.',
      { percentualCaatinga: 'parte da Caatinga que queimou ao menos uma vez' },
    ),
    respostaNenhum: line('Resposta · Sem fogo', 'Nenhuma área queimada registrada de {anoInicial} a {anoFinal}.', ANOS),
    respostaSemDado: line('Resposta · Sem dado', 'Sem dado de fogo aqui.'),
    porqueTitulo: line('Por que importa · Título', 'Por que o fogo importa?'),
    porqueTexto: paragraph('Por que importa · Texto', 'O fogo é um dos principais fatores de mudança na cobertura vegetal e pode contribuir para a {termo}.', TERMO),
    porqueTermo: line('Por que importa · Palavra com link', 'liberação de CO₂ para a atmosfera'),
    fonte: line('Fonte dos dados', 'MapBiomas Fogo, coleção 3'),
    // LEGACY, see the note at the top.
    resumoTitulo: line('Resumo · Título do cartão', 'Área que já queimou'),
    sobreTitulo: line('Sobre os dados · Título', 'Fogo'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'MapBiomas Fogo, coleção 3, 30 m, {anoInicial} a {anoFinal}. Frequência: número de anos com cicatriz de fogo. Área queimada anual: área com cicatriz de fogo no ano.',
      ANOS,
    ),
  },
})

export const TERRITORIOS_CHUVA = defineCopy({
  id: 'territoriosChuva',
  name: 'Territórios · Chuva',
  description: tabDescription('Chuva'),
  fields: {
    pergunta: line('Pergunta', 'Como foi a chuva em {anoFinal}?', ANO_FINAL),
    unidade: line('Número · Unidade', 'mm de chuva'),
    unidadeMedia: line('Número · Unidade, sem dado do ano', 'mm por ano, em média'),
    respostaChuvoso: line(
      'Resposta · Ano chuvoso',
      'A chuva ficou {percentual} acima da média do território ({media} mm), sendo considerado um ano chuvoso.',
      { percentual: 'distância da média', ...MEDIA },
    ),
    respostaSeco: line(
      'Resposta · Ano seco',
      'A chuva ficou {percentual} abaixo da média do território ({media} mm), sendo considerado um ano seco.',
      { percentual: 'distância da média', ...MEDIA },
    ),
    respostaNormal: line(
      'Resposta · Ano normal',
      'A chuva ficou próxima da média do território ({media} mm), sendo considerado um ano normal.',
      MEDIA,
    ),
    respostaClasse: line(
      'Resposta · Chuvoso abaixo da média ou seco acima dela',
      'Ano considerado {classe}; a média do território é {media} mm.',
      { classe: '"seco" ou "chuvoso"', ...MEDIA },
    ),
    respostaSemAno: line('Resposta · Sem dado do ano', 'Sem dado de {anoFinal} aqui.', ANO_FINAL),
    respostaComparacao: line(
      'Resposta · Comparação',
      'Essa média é {comparacao} à da Caatinga ({mediaCaatinga} mm).',
      { comparacao: '"superior", "inferior" ou "próxima"', mediaCaatinga: 'média anual da Caatinga, em mm' },
    ),
    respostaSemDado: line('Resposta · Sem dado', 'Sem dado de chuva aqui.'),
    porqueTitulo: line('Por que importa · Título', 'Por que a chuva é relevante na absorção de carbono?'),
    porqueTexto: paragraph('Por que importa · Texto', 'Na Caatinga, a chuva é um dos principais fatores que regulam a {termo}.', TERMO),
    porqueTermo: line('Por que importa · Palavra com link', 'fotossíntese'),
    fonte: line('Fonte dos dados', 'BR-DWGD (Xavier et al., 2022)'),
    // LEGACY, see the note at the top.
    resumoTitulo: line('Resumo · Título do cartão', 'Chuva'),
    sobreTitulo: line('Sobre os dados · Título', 'Chuva'),
    sobreTexto: paragraph(
      'Sobre os dados · Texto',
      'BR-DWGD, 11 km, de {anoInicial} a {anoFinal}. Seco, normal e chuvoso: terços dos anos do próprio território.',
      ANOS,
    ),
  },
})

export const TERRITORIOS_SOBRE_DADOS = defineCopy({
  id: 'territoriosSobreDados',
  name: 'Territórios · Sobre os dados',
  description: `Parte comum de "Sobre os dados", no fim do Recorte Territorial; a fonte de cada aba fica no tipo da aba. As notas entram no fim da fonte de uma aba quando o valor vem de um ponto do território ou foi calculado em quadrados maiores que os da camada. ${ONE_ENTRY}`,
  fields: {
    titulo: line('Título', 'Sobre os dados'),
    unidadesTitulo: line('Unidades · Título', 'Unidades'),
    unidadesTexto: paragraph(
      'Unidades · Texto',
      't C é tonelada de carbono; 1 t C equivale a 3,67 t de CO₂. CO₂e soma ao CO₂ outros gases de efeito estufa, como metano e óxido nitroso.',
    ),
    comparacaoTitulo: line('Comparação · Título', 'Comparação com a Caatinga'),
    comparacaoTexto: paragraph(
      'Comparação · Texto',
      'Mesmas fontes e mesmo cálculo; no bioma, fluxo, uso da terra e fogo a 100 m. Perto: diferença menor que 10%.',
    ),
    ponto: line('Nota · Valor de um ponto', 'Aqui, valor de um ponto do território.'),
    escala: line('Nota · Cálculo em quadrados maiores', 'Aqui, calculado a {metros} m.', {
      metros: 'lado do quadrado usado no cálculo, em metros',
    }),
  },
})

// The story's types under the keys storyScript() reads them by, in the order
// of the tabs; lib/content/site/types.ts registers them for provisioning.
export const TERRITORIOS_COPY = {
  apresentacao: TERRITORIOS_APRESENTACAO,
  territorio: TERRITORIOS_TERRITORIO,
  chuva: TERRITORIOS_CHUVA,
  uso: TERRITORIOS_USO,
  fogo: TERRITORIOS_FOGO,
  estoque: TERRITORIOS_ESTOQUE,
  fluxo: TERRITORIOS_FLUXO,
  sobre: TERRITORIOS_SOBRE_DADOS,
}

export type TerritoriosCopy = { [Key in keyof typeof TERRITORIOS_COPY]: Copy<(typeof TERRITORIOS_COPY)[Key]> }

// The copy the story ships with: what it shows without Contentful.
export function territoriosCopyDefaults(): TerritoriosCopy {
  const copy = {} as Record<string, unknown>

  for (const [key, type] of Object.entries(TERRITORIOS_COPY)) copy[key] = copyDefaults(type as CopyType)

  return copy as TerritoriosCopy
}
