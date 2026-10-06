import { defineCopy, line, optionalLine, paragraph, text } from '../site/model'

// Content of "Conheça a Caatinga" (/sobre/caatinga), Figma frame 18988:8667,
// content node 18988:8696, copied verbatim; the opening and the vegetation
// section carry the content doc's 2026-10-05 meeting revision. Image alt text
// is not in the design and is written here.

export const CAATINGA = defineCopy({
  id: 'sobreCaatinga',
  name: 'Sobre · Conheça a Caatinga',
  description:
    'Textos da página /sobre/caatinga, abaixo da introdução comum às páginas de Sobre. Há uma única entrada deste tipo: edite-a, não crie outra.',
  fields: {
    // 18988:8697: the opening text, with no heading of its own.
    abertura: text('Abertura', [
      'A Caatinga abriga a maior e mais diversa Floresta Tropical Sazonalmente Seca do mundo e ocupa cerca de 10% do território nacional. Suas paisagens, espécies e formas de vida são marcadas pela adaptação às condições do clima semiárido.',
      'Nesse bioma vivem cerca de 26 milhões de pessoas, distribuídas entre cidades e comunidades que desenvolveram diferentes formas de viver, produzir e conviver com os ciclos de chuva e seca.',
    ]),

    // 18988:8700. The 2026-10-05 meeting rewrote the text as one paragraph and
    // dropped the design's highlight, "A Caatinga muda com as estações, mas
    // permanece viva e produtiva"; the field stays, empty, for an editor to
    // bring one back.
    vegetacaoTitulo: line('Vegetação · Título', 'Como funciona a vegetação?'),
    vegetacaoTexto: text(
      'Vegetação · Texto',
      'A vegetação da Caatinga tem dinâmica própria que depende dos ciclos da chuva. Durante a estação seca, muitas plantas perdem suas folhas para reduzir a perda de água. Quando a chuva retorna, novas folhas surgem rapidamente. Nesse período, aumentam as trocas de água, energia e carbono entre a vegetação e a atmosfera. Por isso, a paisagem pode mudar bastante ao longo do ano.',
    ),
    vegetacaoDestaque: optionalLine('Vegetação · Destaque'),

    // 18988:8708
    climaTitulo: line('Clima · Título', 'Qual é a importância da Caatinga para o clima?'),
    climaAntes: paragraph(
      'Clima · Texto antes do indicador',
      'Por meio da fotossíntese, a vegetação retira dióxido de carbono da atmosfera e armazena parte desse carbono nas plantas e no solo.',
    ),
    climaIndicadorRotulo: line('Clima · Indicador · Rótulo', 'Remoção de GEE'),
    climaIndicadorValor: line('Clima · Indicador · Valor', '410 Mt'),
    climaIndicadorTexto: line(
      'Clima · Indicador · Texto',
      'removidos em 2022 — cerca de 40% das remoções realizadas pelos biomas brasileiros naquele ano, mais do que qualquer outro bioma',
    ),
    climaDepois: paragraph(
      'Clima · Texto depois do indicador',
      'Mesmo ocupando aproximadamente 10% do território nacional, a Caatinga apresentou uma contribuição expressiva para o balanço de carbono do país.',
    ),

    // 18988:8716
    eficienciaTitulo: line('Eficiência · Título', 'O que é eficiência no uso do carbono?'),
    eficienciaAntes: paragraph(
      'Eficiência · Texto antes do indicador',
      'Nem todo o carbono retirado da atmosfera permanece armazenado na vegetação. Uma parte retorna ao ambiente durante a respiração das plantas e do ecossistema.',
    ),
    eficienciaIndicadorRotulo: line('Eficiência · Indicador · Rótulo', 'Eficiência de carbono'),
    eficienciaIndicadorValor: line('Eficiência · Indicador · Valor', '60%'),
    eficienciaIndicadorTexto: line(
      'Eficiência · Indicador · Texto',
      'indica quanto do carbono capturado é convertido e mantido na biomassa — um dos maiores valores entre os ecossistemas do Brasil e do mundo',
    ),
    eficienciaDepois: paragraph(
      'Eficiência · Texto depois do indicador',
      'Isso ajuda a explicar por que o bioma possui um papel tão importante na remoção de carbono, especialmente durante os períodos chuvosos.',
    ),

    // 18988:8724
    armazenamentoTitulo: line('Armazenamento · Título', 'Onde o carbono fica armazenado?'),
    armazenamentoAntes: paragraph(
      'Armazenamento · Texto antes dos indicadores',
      'Na Caatinga, o carbono não está apenas nos troncos, galhos e folhas. Uma parcela importante permanece armazenada nas raízes e no solo.',
    ),
    armazenamentoIndicador1Rotulo: line('Armazenamento · Indicador 1 · Rótulo', 'Armazenamento'),
    armazenamentoIndicador1Valor: line('Armazenamento · Indicador 1 · Valor', '125tC/ha'),
    armazenamentoIndicador1Texto: line(
      'Armazenamento · Indicador 1 · Texto',
      'em áreas de vegetação mais densa, com a maior parcela retida no solo',
    ),
    armazenamentoIndicador2Rotulo: line('Armazenamento · Indicador 2 · Rótulo', 'Capacidade de remoção'),
    armazenamentoIndicador2Valor: line('Armazenamento · Indicador 2 · Valor', '1,5–5tCO₂/ha/ano'),
    armazenamentoIndicador2Texto: line(
      'Armazenamento · Indicador 2 · Texto',
      'conforme a densidade da vegetação, a fisionomia e o regime de chuvas',
    ),
    armazenamentoDepois: text('Armazenamento · Texto depois dos indicadores', [
      'A Caatinga densa armazena mais carbono do que pastagens e agricultura convencional, e alguns sistemas de produção agroecológicos podem acumular carbono em ritmo até superior ao da vegetação nativa.',
      'Conhecer onde o carbono está armazenado é essencial para compreender a contribuição da Caatinga para o clima e acompanhar suas mudanças ao longo do tempo.',
    ]),

    // 18988:8734: text beside the photo. The last paragraph has no final full
    // stop in the design; kept verbatim and flagged to the content owner.
    pessoasTitulo: line('Natureza e pessoas · Título', 'Um bioma de natureza e pessoas'),
    pessoasTexto: text('Natureza e pessoas · Texto', [
      'A Caatinga abriga cidades de diferentes portes e uma ampla rede de comunidades rurais. Agricultores e agricultoras familiares, povos indígenas, comunidades quilombolas, assentamentos da reforma agrária, comunidades de fundo e fecho de pasto e outros povos e comunidades tradicionais desenvolveram conhecimentos e práticas de convivência com o Semiárido.',
      'São essas populações que manejam os roçados, os quintais produtivos e as áreas de vegetação nativa. Qualquer discussão sobre carbono no bioma é também uma discussão sobre esses territórios e sobre quem os sustenta',
    ]),

    // 18988:8741, the section with the red heading; the comparison is
    // 18988:8747.
    pressaoTitulo: line('Sob pressão · Título', 'Um bioma sob pressão'),
    pressaoAntes: paragraph(
      'Sob pressão · Texto antes da comparação',
      'Apesar da capacidade de absorver e reter carbono, a Caatinga enfrenta um processo contínuo de degradação. Entre 2001 e 2021, as áreas conservadas diminuíram em todas as categorias fundiárias, com perdas maiores nos assentamentos e nas pequenas propriedades. Entre 2000 e 2020, a área afetada por desertificação severa cresceu de 74 mil para 107 mil km², mais do que o território de Pernambuco.',
    ),
    comparacaoTitulo: line('Sob pressão · Comparação · Título', 'Em desertificação severa'),
    comparacaoAnoAntes: line('Sob pressão · Comparação · Ano inicial', '2000'),
    comparacaoValorAntes: line('Sob pressão · Comparação · Valor inicial', '74 mil km²'),
    comparacaoAnoDepois: line('Sob pressão · Comparação · Ano final', '2020'),
    comparacaoValorDepois: line('Sob pressão · Comparação · Valor final', '107 mil km²'),
    pressaoDepois: paragraph(
      'Sob pressão · Texto depois da comparação',
      'Os territórios indígenas, quilombolas, os assentamentos e as pequenas propriedades guardam parte relevante da vegetação em pé e, ao mesmo tempo, estão entre os mais expostos à degradação e à insegurança fundiária. É por isso que a forma como o mercado de carbono tratar esses territórios definirá se ele remunera quem conservou o bioma ou aprofunda desigualdades.',
    ),
  },
})

// The landing's "Carbono e comunidades" photo, cropped tighter to the window
// the design's fill shows here (18988:8735; IMAGENS.md).
export const CAATINGA_PESSOAS_IMAGEM = {
  src: '/images/sobre/natureza-pessoas.webp',
  alt: 'Casa de uma comunidade rural da Caatinga, com terreiro de chão batido e vegetação ao redor',
}
