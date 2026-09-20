// Editorial content from the first landing page, parked here when the page was
// rebuilt to the Figma design in September 2026. The Figma home has no section
// for it; it is kept verbatim, citations included, for the internal pages the
// menu implies ("Conheça a plataforma"). Nothing imports this yet.
//
// The color values (cor) belong to the old palette (#5f7030 and friends), which
// this redesign replaces. Keep them as they are — this is archived content, and
// whoever builds the internal pages restyles it against the new tokens.

export type Dimensao = {
  cor: string
  num: string
  titulo: string
  texto: string
  fonte: string
}

export const DIMENSOES: Dimensao[] = [
  {
    cor: '#5f7030',
    num: '48%',
    titulo: 'Da remoção bruta de carbono do país',
    texto:
      'Em 2022 a Caatinga respondeu por quase metade da remoção bruta de carbono do Brasil, ocupando cerca de 10% do território. A vegetação reativa a fotossíntese rapidamente após a chuva, mesmo depois de estiagem prolongada, e é nesses pulsos que o bioma opera como sumidouro de alta eficiência.',
    fonte: 'DA COSTA et al. (2025); MENDES et al. (2023; 2025)',
  },
  {
    cor: '#6b7d34',
    num: '60%',
    titulo: 'De eficiência no uso do carbono',
    texto:
      'A eficiência do uso do carbono mede quanto do carbono captado pela fotossíntese é de fato convertido em biomassa vegetal. Na Caatinga ela alcança 60%, contra cerca de 30% na Amazônia, onde a captação é mais constante ao longo do ano mas a respiração do ecossistema consome parcela proporcionalmente maior do CO2 absorvido.',
    fonte: 'MENDES et al. (2025)',
  },
  {
    cor: '#4e5d26',
    num: '72%',
    titulo: 'Do carbono da Caatinga densa está no solo',
    texto:
      'A Caatinga densa preservada estoca cerca de 125 Mg C por hectare, permanecendo quase três quartos desse total abaixo da superfície, fração que as metodologias tradicionais de REDD+ não contabilizam. O estoque de carbono orgânico do solo do bioma alcança 2,5 gigatoneladas.',
    fonte: 'DE OLIVEIRA et al. (2021)',
  },
  {
    cor: '#6b7d34',
    num: '3.347',
    titulo: 'Espécies de plantas com flores',
    texto:
      'São 962 gêneros e 153 famílias, com 15% de endemismo na flora. Contudo, 80% das áreas do bioma foram mal amostradas e 41% nunca receberam coleta, indicando endemismo real superior ao catalogado.',
    fonte:
      'FERNANDES; CARDOSO; DE QUEIROZ (2020); SILVA; LEAL; TABARELLI (2017)',
  },
  {
    cor: '#ce8b44',
    num: '309 GW',
    titulo: 'De potencial eólico em terra no Nordeste',
    texto:
      'Estimativa do INPE para aerogeradores a 100 metros de altura, contra 32,1 GW hoje instalados, ou seja, cerca de um décimo do que o vento da região comporta. Soma-se a isso a maior irradiação solar do país, de 5,49 kWh por m² ao dia em média. O que já foi instalado sobre o bioma, e o que se projeta instalar, é tratado adiante.',
    fonte: 'PEREIRA (2016), via ETENE/BNB; ETENE/BNB (2025); PEREIRA et al. (2017)',
  },
  {
    cor: '#a66a2e',
    num: '1,66 milhão',
    titulo: 'De estabelecimentos de agricultura familiar',
    texto:
      'No bioma, 68% deles produzem para consumo próprio ou familiar, e a agricultura familiar responde por 72% dos caprinos e 61% do leite de vaca da região. Sistemas agroflorestais e de manejo agroecológico acumulam carbono no solo mantendo a vegetação em pé, prática que a Lei nº 14.119/2021 prioriza ao definir quem recebe por serviços ambientais.',
    fonte: 'IBGE, Censo Agropecuário (2017); IPEA; Brasil, Lei nº 14.119/2021',
  },
  {
    cor: '#7a4e1e',
    num: '27 milhões',
    titulo: 'De pessoas vivem no bioma',
    texto:
      'Dentre elas, 45 povos indígenas e boa parte das comunidades quilombolas do país, que a mesma lei nomeia junto aos agricultores familiares como beneficiários prioritários. O Parque Nacional Serra da Capivara, Patrimônio Mundial da UNESCO desde 1991, guarda a maior concentração de sítios pré-históricos das Américas.',
    fonte: 'SILVA; LEAL; TABARELLI (2017); IBGE (2022); CEDEFES; UNESCO (2021)',
  },
]
