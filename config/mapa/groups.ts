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
  /** The 24px icon of the theme's header in the layer panel, exported from
   *  Figma (19430:58769); a theme the design does not draw has none. */
  icon?: string
  /** Fill of the theme's header in the layer panel (19430:58769, 58771, 58773). */
  tint: string
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
    // Not drawn as a theme by the design, which gives the recortes their own
    // section; its header takes the panel's neutral fill until then (#140).
    id: TERRITORY_THEME_ID, label: 'Territórios', color: '#597636', tint: 'var(--am-050)',
    subthemes: [
      { id: 'limites', label: 'Limites de referência', exclusive: false },
      { id: 'territorios', label: 'Territórios tradicionais e assentamentos', exclusive: false },
    ],
  },
  {
    id: 'carbono', label: 'Vegetação', color: '#4F791E',
    icon: '/icons/mapa/grass.svg', tint: 'var(--role-marca-ancora-container)',
    subthemes: [
      { id: 'estoques', label: 'Estoques de carbono', exclusive: true },
      { id: 'estrutura', label: 'Estrutura', exclusive: true },
      { id: 'fluxos', label: 'Fluxos de carbono', exclusive: true },
    ],
  },
  {
    id: 'uso_solo', label: 'Uso do solo e pressões', color: '#DD8637',
    icon: '/icons/mapa/landslide.svg', tint: 'var(--bg-superficie-variante)',
    subthemes: [
      { id: 'cobertura', label: 'Uso e cobertura da terra', exclusive: true },
      { id: 'fogo', label: 'Fogo', exclusive: true },
      { id: 'degradacao', label: 'Degradação da terra', exclusive: true },
      { id: 'emissoes', label: 'Emissões de gases de efeito estufa', exclusive: true },
    ],
  },
  {
    id: 'ambiente', label: 'Ambiente', color: '#A78400',
    icon: '/icons/mapa/nature.svg', tint: 'var(--role-categorica1-container)',
    subthemes: [
      { id: 'vegetacao', label: 'Índices de vegetação', exclusive: true },
      { id: 'clima', label: 'Clima', exclusive: true },
      // The one thematic exception, so the hillshade can be combined with
      // altitude or slope; layers.json order sets which one is drawn on top.
      { id: 'relevo', label: 'Relevo', exclusive: false },
    ],
  },
  {
    // Not in the design, which predates it: the panel's neutral fill, no icon.
    id: 'localidades', label: 'Localidades', color: '#8B5E34', tint: 'var(--am-050)',
    subthemes: [
      { id: 'monitoramento', label: 'Áreas de Monitoramento', exclusive: false },
    ],
  },
]

export const SUBTHEME_BY_KEY = new Map(
  THEMES.flatMap((theme) => theme.subthemes.map((subtheme) => [`${theme.id}:${subtheme.id}`, subtheme])),
)

export function isExclusiveSubtheme(theme?: string, subtheme?: string) {
  return !!theme && !!subtheme && SUBTHEME_BY_KEY.get(`${theme}:${subtheme}`)?.exclusive
}
