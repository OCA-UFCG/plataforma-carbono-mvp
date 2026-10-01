import { lookup, type MapaText } from '@/lib/mapa/text'

export interface SubthemeInfo {
  id: string
  label: string
  /** A choice replaces the previous layer of this subtheme. */
  exclusive: boolean
}

export interface ThemeInfo {
  id: string
  label: string
  color: string
  image: string
  subthemes: SubthemeInfo[]
}

// The reference cuts (bioma, estados, municípios, territórios). "Limpar" in the
// layer panel spares them: they frame the analysis rather than being its subject.
export const TERRITORY_THEME_ID = 'territorio'

// The order of this structure is the default order of the panel and of the
// map's rasters (themes, then subthemes); the user can drag both in the panel
// (lib/mapa/layerOrder.ts). Layers declare only their theme and subtheme ids in
// layers.json.
export const THEMES: ThemeInfo[] = [
  {
    id: TERRITORY_THEME_ID, label: 'Território', color: '#597636', image: '/images/cards/recortes-territoriais.png',
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
      { id: 'degradacao', label: 'Degradação da terra', exclusive: true },
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

/** Panel label of a theme, in the user's language (the Portuguese `label` without a `MapaText`). */
export function themeLabel(theme: Pick<ThemeInfo, 'id' | 'label'>, tx?: MapaText): string {
  return lookup(tx, `MapaGroups.themes.${theme.id}.label`, theme.label)
}

/** Panel label of a subtheme, in the user's language (the Portuguese `label` without a `MapaText`). */
export function subthemeLabel(
  themeId: string,
  subtheme: Pick<SubthemeInfo, 'id' | 'label'>,
  tx?: MapaText,
): string {
  return lookup(tx, `MapaGroups.themes.${themeId}.subthemes.${subtheme.id}`, subtheme.label)
}

/** `THEMES` with every label translated: the panel navigation, ready to render. */
export function localizedThemes(tx?: MapaText): ThemeInfo[] {
  return THEMES.map((theme) => ({
    ...theme,
    label: themeLabel(theme, tx),
    subthemes: theme.subthemes.map((sub) => ({ ...sub, label: subthemeLabel(theme.id, sub, tx) })),
  }))
}

export function isExclusiveSubtheme(theme?: string, subtheme?: string) {
  return !!theme && !!subtheme && SUBTHEME_BY_KEY.get(`${theme}:${subtheme}`)?.exclusive
}
