// Terms of the Glossário tab (Comunicação page). A term with `paragrafos`
// has its own page; one without is listed as "em breve". `animacao` names a
// scene assembled in lib/cenas/gerado/ (scripts/montar-cenas.mjs).

export type AnimacaoId = 'cicloAnual' | 'torreFluxo'

export interface Termo {
  slug: string
  titulo: string
  paragrafos?: string[]
  animacao?: {
    id: AnimacaoId
    titulo: string
    /** Read by screen readers in place of the canvas. */
    descricao: string
    /** What the animation simplifies; shown under it. */
    nota: string
  }
  /** References in APA, in the order they are cited. */
  fontes?: string[]
}

export const TERMOS: Termo[] = [
  {
    slug: 'fotossintese',
    titulo: 'Fotossíntese',
    // First draft (2026-10-19), to be checked against the articles the
    // team will provide.
    paragrafos: [
      'Fotossíntese é o processo pelo qual as plantas usam a energia da luz para transformar o gás carbônico (CO₂) do ar e a água em açúcares, liberando oxigênio (O₂). Esses açúcares viram folhas, galhos, raízes e frutos, e sustentam quase toda a vida do ecossistema. É por esse caminho que o carbono da atmosfera entra na vegetação e, mais tarde, no solo.',
      'Quando se soma a fotossíntese de todas as plantas de uma área, o resultado recebe o nome de produtividade primária bruta, ou GPP (do inglês gross primary productivity), expressa em gramas de carbono por metro quadrado (Chapin et al., 2006). Em campo, a GPP é estimada a partir de torres de fluxo, que medem continuamente as trocas de CO₂ entre a vegetação e o ar pela técnica de covariância de vórtices turbulentos (Baldocchi, 2003). Para cobrir territórios inteiros, usam-se modelos alimentados por satélite. O MOD17, do sensor MODIS, calcula a GPP com base na eficiência de uso da radiação absorvida pelas folhas, com pixels de 500 m (Running & Zhao, 2021). O PML-V2 estima a GPP junto com a evapotranspiração, também a 500 m, e foi calibrado com medições de 95 torres de fluxo (Zhang et al., 2019).',
      'Na Caatinga, a fotossíntese acompanha a chuva. Grande parte das árvores e arbustos perde as folhas na seca e rebrota com as primeiras chuvas. No pau-branco (Cordia oncocalyx), a desfolha foi total nos meses mais secos, e uma chuva ocasional em novembro bastou para provocar uma brotação fora de época (Silveira et al., 2013). Câmeras fenológicas instaladas em sete áreas ao longo de um gradiente de aridez mostraram que a chuva se relaciona com a duração da estação de crescimento e com a produtividade da vegetação (Ramos et al., 2023). Numa torre de fluxo no Seridó, as trocas de CO₂ variaram com a quantidade e a distribuição das chuvas e com o estado da vegetação (Mendes et al., 2020).',
      'O mandacaru e o facheiro fazem um tipo diferente de fotossíntese, chamado CAM (metabolismo ácido das crassuláceas). Esses cactos abrem os estômatos, pequenos poros da superfície verde, durante a noite, fixam o CO₂ na forma de ácido málico e o guardam até o dia seguinte. Com a luz do sol, os estômatos ficam fechados e o carbono armazenado é convertido em açúcar. Como a abertura ocorre à noite, a perda de água é muito menor: para cada mol de água perdida, a absorção noturna nas plantas CAM fica entre 6 e 30 milimols de CO₂, contra 0,6 a 1,3 nas plantas C3 e 1,7 a 2,4 nas C4. Todos os cactos fazem CAM (Lüttge, 2004).',
      'Ao mesmo tempo, plantas, serrapilheira e microrganismos do solo respiram e devolvem CO₂ ao ar. O saldo entre o que entra pela fotossíntese e o que sai pela respiração chama-se troca líquida do ecossistema (NEE), e valores negativos indicam que a área retirou carbono da atmosfera. No Seridó, a NEE anual foi de -169 g C/m² em 2014 e de -145 g C/m² em 2015. Entre 41% e 43% do carbono fixado ficou no ecossistema, e a respiração devolveu o restante. Mesmo na estação seca o saldo ficou próximo do equilíbrio, e a área funcionou como sumidouro de carbono nos dois anos (Mendes et al., 2020).',
    ],
    animacao: {
      id: 'cicloAnual',
      titulo: 'Um ano na Caatinga',
      descricao: 'Paisagem de Caatinga em corte, animada ao longo de um ano: o CO₂ entra nas plantas pela fotossíntese e sai pela respiração de plantas, serapilheira e solo; o saldo muda com a chuva.',
      nota: 'Ilustração sem escala, sobre um modelo conceitual em valores relativos, sem medições. A respiração anual em torno de 60% da fotossíntese segue Mendes et al. (2020); os demais valores são escolhas de representação. Na natureza, a resposta à chuva muda de espécie para espécie e de um ano para outro, e os cactos CAM absorvem CO₂ sobretudo à noite.',
    },
    fontes: [
      'Baldocchi, D. D. (2003). Assessing the eddy covariance technique for evaluating carbon dioxide exchange rates of ecosystems: Past, present and future. Global Change Biology, 9(4), 479-492. https://doi.org/10.1046/j.1365-2486.2003.00629.x',
      'Chapin, F. S., III, Woodwell, G. M., Randerson, J. T., Rastetter, E. B., Lovett, G. M., Baldocchi, D. D., et al. (2006). Reconciling carbon-cycle concepts, terminology, and methods. Ecosystems, 9(7), 1041-1050. https://doi.org/10.1007/s10021-005-0105-7',
      'Lüttge, U. (2004). Ecophysiology of Crassulacean Acid Metabolism (CAM). Annals of Botany, 93(6), 629-652. https://doi.org/10.1093/aob/mch087',
      'Mendes, K. R., Campos, S., da Silva, L. L., Mutti, P. R., Ferreira, R. R., Medeiros, S. S., Perez-Marin, A. M., Marques, T. V., Ramos, T. M., de Lima Vieira, M. M., Oliveira, C. P., Gonçalves, W. A., Costa, G. B., Antonino, A. C. D., Menezes, R. S. C., Bezerra, B. G., & Santos e Silva, C. M. (2020). Seasonal variation in net ecosystem CO2 exchange of a Brazilian seasonally dry tropical forest. Scientific Reports, 10, 9454. https://doi.org/10.1038/s41598-020-66415-w',
      'Ramos, D. M., Andrade, J. M., Alberton, B. C., Moura, M. S. B., Domingues, T. F., Neves, N., Lima, J. R. S., Souza, R., Souza, E., Silva, J. R., Espírito-Santo, M. M., Morellato, L. P. C., & Cunha, J. (2023). Multiscale phenology of seasonally dry tropical forests in an aridity gradient. Frontiers in Environmental Science, 11, 1275844. https://doi.org/10.3389/fenvs.2023.1275844',
      'Running, S., & Zhao, M. (2021). MODIS/Terra Net Primary Production Gap-Filled Yearly L4 Global 500m SIN Grid V061. NASA Land Processes Distributed Active Archive Center. https://doi.org/10.5067/MODIS/MOD17A3HGF.061',
      'Silveira, A. P., Martins, F. R., & Araújo, F. S. (2013). Do vegetative and reproductive phenophases of deciduous tropical species respond similarly to rainfall pulses? Journal of Forestry Research, 24(4), 643-651. https://doi.org/10.1007/s11676-013-0366-5',
      'Zhang, Y., Kong, D., Gan, R., Chiew, F. H. S., McVicar, T. R., Zhang, Q., & Yang, Y. (2019). Coupled estimation of 500 m and 8-day resolution global evapotranspiration and gross primary production in 2002-2017. Remote Sensing of Environment, 222, 165-182. https://doi.org/10.1016/j.rse.2018.12.031',
    ],
  },
  { slug: 'estoque-de-carbono', titulo: 'Estoque de carbono' },
  {
    slug: 'torre-de-fluxo',
    titulo: 'Torre de fluxo',
    paragrafos: [],
    animacao: {
      id: 'torreFluxo',
      titulo: 'Como a torre mede o carbono',
      descricao: 'Paisagem de Caatinga com a torre de fluxo: o vento vertical e o CO₂ medidos no topo mostram se a vegetação absorve ou libera carbono. Os botões escolhem o caso.',
      nota: 'Ilustração sem escala. As diferenças de CO₂ entre o ar que sobe e o que desce estão exageradas para ficarem visíveis; cores, pontos e velocidades são escolhas de representação.',
    },
  },
  { slug: 'fluxos-de-carbono', titulo: 'Fluxos de carbono' },
  { slug: 'eficiencia-de-uso-do-carbono', titulo: 'Eficiência de uso do carbono' },
  { slug: 'degradacao', titulo: 'Degradação' },
]

export const TERMO_PARAM = 'termo'

/** The term the address names, or the first one with a page. */
export function parseTermo(value: string | string[] | undefined): Termo {
  const comPagina = TERMOS.filter((t) => t.paragrafos)
  return comPagina.find((t) => t.slug === value) ?? comPagina[0]
}
