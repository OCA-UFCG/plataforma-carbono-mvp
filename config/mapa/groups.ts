export interface SubthemeInfo {
  id: string
  label: string
  /** Uma escolha substitui a camada anterior deste subtema. */
  exclusive: boolean
}

export interface ThemeInfo {
  id: string
  label: string
  color: string
  image: string
  subthemes: SubthemeInfo[]
}

// A ordem desta estrutura define a navegação do painel. As camadas declaram
// somente seus ids de tema e subtema em layers.json.
export const THEMES: ThemeInfo[] = [
  {
    id: 'territorio', label: 'Território', color: '#597636', image: '/images/cards/recortes-territoriais.png',
    subthemes: [
      { id: 'limites', label: 'Limites de referência', exclusive: false },
      { id: 'territorios', label: 'Territórios e assentamentos', exclusive: false },
    ],
  },
  {
    id: 'carbono', label: 'Carbono', color: '#4F791E', image: '/images/cards/estoques-carbono.png',
    subthemes: [
      { id: 'estoques', label: 'Estoque total', exclusive: true },
      { id: 'reservatorios', label: 'Reservatórios de carbono', exclusive: true },
      { id: 'solo', label: 'Carbono do solo', exclusive: true },
      { id: 'biomassa', label: 'Biomassa', exclusive: true },
      { id: 'estrutura', label: 'Estrutura da vegetação', exclusive: true },
      { id: 'gpp', label: 'Produtividade primária bruta (GPP)', exclusive: true },
      { id: 'npp', label: 'Produtividade primária líquida (NPP)', exclusive: true },
      { id: 'fluxos', label: 'Fluxos de carbono', exclusive: true },
    ],
  },
  {
    id: 'uso_solo', label: 'Uso do solo e pressões', color: '#DD8637', image: '/images/cards/pressoes-mudancas.png',
    subthemes: [
      { id: 'cobertura', label: 'Uso e cobertura da terra', exclusive: true },
      { id: 'fogo', label: 'Fogo', exclusive: true },
    ],
  },
  {
    id: 'ambiente', label: 'Ambiente', color: '#A78400', image: '/images/cards/clima-fenologia.png',
    subthemes: [
      { id: 'vegetacao', label: 'Vegetação e fenologia', exclusive: true },
      { id: 'clima', label: 'Clima', exclusive: true },
    ],
  },
]

export const SUBTHEME_BY_KEY = new Map(
  THEMES.flatMap((theme) => theme.subthemes.map((subtheme) => [`${theme.id}:${subtheme.id}`, subtheme])),
)

export function isExclusiveSubtheme(theme?: string, subtheme?: string) {
  return !!theme && !!subtheme && SUBTHEME_BY_KEY.get(`${theme}:${subtheme}`)?.exclusive
}
