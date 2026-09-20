// Editorial content from the first landing page, parked here when the page was
// rebuilt to the Figma design in September 2026. The Figma home has no section
// for it; it is kept verbatim, citations included, for the internal pages the
// menu implies ("Conheça a plataforma"). Nothing imports this yet.

export type Ameaca = {
  num: string
  texto: string
  fonte: string
}

export const AMEACAS: Ameaca[] = [
  {
    num: '8,6 mi ha',
    texto:
      'De vegetação nativa perdidos entre 1985 e 2023, o equivalente a 14,4% da cobertura nativa que havia em 1985. Restam 51,4 milhões de hectares, ou 59,6% da área do bioma. Em 2023, 67,4% da supressão ocorreu em vegetação primária, nunca antes desmatada.',
    fonte: 'MAPBIOMAS, Coleção 9 (2025)',
  },
  {
    num: '+9,9%',
    texto:
      'De incremento no desmatamento em 2024 sobre 2023. Junto ao Pantanal, a Caatinga foi o único bioma no qual a supressão aumentou, tendo Amazônia, Cerrado, Mata Atlântica e Pampa registrado queda.',
    fonte: 'INPE/PRODES, Programa BiomasBR (2026)',
  },
  {
    num: '99,81%',
    texto:
      'Dos alertas de desmatamento registrados na Caatinga em 2020 apresentavam indícios de ilegalidade.',
    fonte: 'MAPBIOMAS / SAD Caatinga (2020)',
  },
  {
    num: '170 mil km²',
    texto:
      'De expansão das áreas suscetíveis à desertificação e do seu entorno entre 2000 e 2020, tendo a área em desertificação severa passado de 74 mil para 107 mil km². Nessas áreas vivem 39 milhões de brasileiros.',
    fonte: 'SUDENE, INSA, OCA e UFCG, Boletim Temático: Desertificação (2025)',
  },
  {
    num: '40%',
    texto:
      'Da água de superfície de origem natural do bioma desapareceu ao longo de 35 anos.',
    fonte: 'MAPBIOMAS (2021)',
  },
  {
    num: '88%',
    texto:
      'Do domínio da Caatinga já registrou extinções locais de aves florestais endêmicas, estando dez das treze espécies endêmicas avaliadas mais ameaçadas do que sugeria a Lista Vermelha.',
    fonte: 'LIMA; PERES; ARAUJO (2025)',
  },
  {
    num: '9%',
    texto:
      'Do bioma sob unidades de conservação, e menos de 2% em proteção integral. Já a Amazônia mantém cerca de metade do território protegido.',
    fonte: 'MAPBIOMAS (2025); ICMBio',
  },
  {
    num: 'US$ 0,50',
    texto:
      'Por hectare ao ano, excluída a regularização fundiária, foi o orçamento médio de 20 unidades de conservação federais da Caatinga entre 2008 e 2014, cerca de treze vezes inferior ao que o próprio MMA declara necessário. Dentre elas, doze não dispunham de conselho gestor e onze não tinham plano de manejo.',
    fonte: 'DE OLIVEIRA; BERNARD (2017)',
  },
  {
    num: '1995',
    texto:
      'Ano da proposta de emenda que incluiria a Caatinga dentre os biomas reconhecidos como Patrimônio Nacional, a qual permanece em tramitação. Amazônia, Mata Atlântica, Serra do Mar, Pantanal e Zona Costeira constam do art. 225 da Constituição desde 1988.',
    fonte: 'Constituição Federal de 1988; Câmara dos Deputados',
  },
  {
    num: '180 GW',
    texto:
      'Em projetos eólicos e solares planejados sobre o bioma, contra 35,35 GW já instalados. Em 2024 a Caatinga concentrou 62% das áreas ocupadas por usinas solares de médio e grande porte do país. A literatura sobre esses empreendimentos no Nordeste documenta violação de direitos humanos, conflitos fundiários, arrendamentos de longa duração com cláusulas assimétricas, supressão de vegetação nativa, perda de habitat e pressão sobre territórios já vulneráveis pela desertificação.',
    fonte:
      'ANEEL; MAPBIOMAS (2025); SILVA et al. (2026); SANTOS et al. (2026); MPF (2024)',
  },
]
