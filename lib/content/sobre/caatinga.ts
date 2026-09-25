// Content of "Conheça a Caatinga" (/sobre/caatinga), Figma frame 18988:8667,
// content node 18988:8696, copied verbatim. Image alt text is not in the
// design and is written here.

import type { IndicatorCardProps } from '@/components/marketing/IndicatorCard'

type Indicador = Pick<IndicatorCardProps, 'label' | 'value' | 'description'>

export const CAATINGA = {
  // 18988:8697: the opening text, with no heading of its own.
  abertura: [
    'A Caatinga abriga a maior e mais diversa Floresta Tropical Sazonalmente Seca do mundo. Ocupa cerca de 10% do território nacional e apresenta paisagens, espécies e formas de vida adaptadas às condições do clima semiárido.',
    'Mais do que um ambiente natural, a Caatinga é um território habitado. Suas cidades e comunidades reúnem diferentes modos de viver, produzir e conviver com os períodos de chuva e de seca.',
  ],

  // 18988:8700. The design sets the second and third lines together, with no
  // blank line between them; each inner array is one block.
  vegetacao: {
    titulo: 'Como funciona a vegetação?',
    blocos: [
      [
        'A vegetação da Caatinga acompanha o ritmo das chuvas. Durante a estação seca, muitas plantas perdem suas folhas para reduzir a perda de água. Esse comportamento faz parte de sua adaptação natural ao clima.',
      ],
      [
        'Quando a chuva retorna, novas folhas surgem rapidamente e a fotossíntese é retomada. Nesse período, aumentam as trocas de água, energia e carbono entre a vegetação e a atmosfera.',
        'Por isso, a paisagem pode mudar bastante ao longo do ano: os tons secos dão lugar ao verde poucos dias após as primeiras chuvas.',
      ],
    ],
    destaque: 'A Caatinga muda com as estações, mas permanece viva e produtiva.',
  },

  // 18988:8708
  clima: {
    titulo: 'Qual é a importância da Caatinga para o clima?',
    antes: 'Por meio da fotossíntese, a vegetação retira dióxido de carbono da atmosfera e armazena parte desse carbono nas plantas e no solo.',
    indicador: {
      label: 'Remoção de GEE',
      value: '410 Mt',
      description:
        'removidos em 2022 — cerca de 40% das remoções realizadas pelos biomas brasileiros naquele ano, mais do que qualquer outro bioma',
    } satisfies Indicador,
    depois:
      'Mesmo ocupando aproximadamente 10% do território nacional, a Caatinga apresentou uma contribuição expressiva para o balanço de carbono do país.',
  },

  // 18988:8716
  eficiencia: {
    titulo: 'O que é eficiência no uso do carbono?',
    antes:
      'Nem todo o carbono retirado da atmosfera permanece armazenado na vegetação. Uma parte retorna ao ambiente durante a respiração das plantas e do ecossistema.',
    indicador: {
      label: 'Eficiência de carbono',
      value: '60%',
      description:
        'indica quanto do carbono capturado é convertido e mantido na biomassa — um dos maiores valores entre os ecossistemas do Brasil e do mundo',
    } satisfies Indicador,
    depois:
      'Isso ajuda a explicar por que o bioma possui um papel tão importante na remoção de carbono, especialmente durante os períodos chuvosos.',
  },

  // 18988:8724
  armazenamento: {
    titulo: 'Onde o carbono fica armazenado?',
    antes:
      'Na Caatinga, o carbono não está apenas nos troncos, galhos e folhas. Uma parcela importante permanece armazenada nas raízes e no solo.',
    indicadores: [
      {
        label: 'Armazenamento',
        value: '125tC/ha',
        description: 'em áreas de vegetação mais densa, com a maior parcela retida no solo',
      },
      {
        label: 'Capacidade de remoção',
        value: '1,5–5tCO₂/ha/ano',
        description: 'conforme a densidade da vegetação, a fisionomia e o regime de chuvas',
      },
    ] satisfies Indicador[],
    depois: [
      'A Caatinga densa armazena mais carbono do que pastagens e agricultura convencional, e alguns sistemas de produção agroecológicos podem acumular carbono em ritmo até superior ao da vegetação nativa.',
      'Conhecer onde o carbono está armazenado é essencial para compreender a contribuição da Caatinga para o clima e acompanhar suas mudanças ao longo do tempo.',
    ],
  },

  // 18988:8734: text beside the photo. The last paragraph has no final full
  // stop in the design; kept verbatim and flagged to the content owner.
  pessoas: {
    titulo: 'Um bioma de natureza e pessoas',
    paragrafos: [
      'A Caatinga abriga cidades de diferentes portes e uma ampla rede de comunidades rurais. Agricultores e agricultoras familiares, povos indígenas, comunidades quilombolas, assentamentos da reforma agrária, comunidades de fundo e fecho de pasto e outros povos e comunidades tradicionais desenvolveram conhecimentos e práticas de convivência com o Semiárido.',
      'São essas populações que manejam os roçados, os quintais produtivos e as áreas de vegetação nativa. Qualquer discussão sobre carbono no bioma é também uma discussão sobre esses territórios e sobre quem os sustenta',
    ],
    // The same photo as the landing's "Carbono e comunidades" tab (IMAGENS.md).
    imagem: '/images/plataforma/carbono-e-comunidades.webp',
    imagemAlt: 'Casa de uma comunidade rural da Caatinga, com terreiro de chão batido e vegetação ao redor',
  },

  // 18988:8741, the section with the red heading.
  pressao: {
    titulo: 'Um bioma sob pressão',
    antes:
      'Apesar da capacidade de absorver e reter carbono, a Caatinga enfrenta um processo contínuo de degradação. Entre 2001 e 2021, as áreas conservadas diminuíram em todas as categorias fundiárias, com perdas maiores nos assentamentos e nas pequenas propriedades. Entre 2000 e 2020, a área afetada por desertificação severa cresceu de 74 mil para 107 mil km², mais do que o território de Pernambuco.',
    // 18988:8747
    comparacao: {
      titulo: 'Em desertificação severa',
      antes: { ano: '2000', valor: '74 mil km²' },
      depois: { ano: '2020', valor: '107 mil km²' },
    },
    depois:
      'Os territórios indígenas, quilombolas, os assentamentos e as pequenas propriedades guardam parte relevante da vegetação em pé e, ao mesmo tempo, estão entre os mais expostos à degradação e à insegurança fundiária. É por isso que a forma como o mercado de carbono tratar esses territórios definirá se ele remunera quem conservou o bioma ou aprofunda desigualdades.',
  },
}
