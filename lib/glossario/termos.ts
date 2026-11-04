// Terms of the Glossário page (/glossario), one tab each, in the order of
// the design's sidebar (Figma 19507:16678), followed by the terms the
// design does not draw yet: "Sequestro de carbono", then "Inventário de
// carbono". `animacao` names a scene assembled in lib/cenas/gerado/
// (scripts/montar-cenas.mjs). Each text is written in both of the site's
// languages side by side; the address (`slug`) is the same in both.

import { ABA_PARAM } from '@/lib/marketing/comunicacaoAbas'
import { normalizeSearch } from '@/lib/mapa/normalizeSearch'
import type { SiteLocale } from '@/lib/locale'

/** A text in each of the site's languages. */
export type Bilingue = Record<SiteLocale, string>

export type AnimacaoId = 'cicloAnual' | 'torreFluxo' | 'estoques' | 'cisterna' | 'fluxos' | 'cue' | 'degradacao' | 'agroecologia' | 'medirCarbono'

export interface Termo {
  slug: string
  titulo: Bilingue
  paragrafos: Record<SiteLocale, string[]>
  animacao?: {
    id: AnimacaoId
    titulo: Bilingue
    /** Read by screen readers in place of the canvas. */
    descricao: Bilingue
  }
  /**
   * Text under the animation's control panel, which the redesign (Figma
   * 19507:16694) adds below the scene; `paragrafos` stay above it. No term
   * has it yet: the frame repeats the Fotossíntese paragraph as a placeholder.
   */
  paragrafosAposCena?: Record<SiteLocale, string[]>
  /** References in APA, in the order they are cited; the same in both languages. */
  fontes?: string[]
  /** A way into the platform from the term, under the animation. */
  acesso?: { href: string; rotulo: Bilingue }
}

// Opens the platform on one layer. Through /login, which sends a visitor with
// a session straight on and brings one without back here after logging in;
// /mapa itself would drop the parameter on its way to the login page.
function naPlataforma(camada: string): string {
  return `/login?redirect=${encodeURIComponent(`/mapa?camada=${camada}`)}`
}

export const TERMOS: Termo[] = [
  {
    slug: 'fotossintese',
    titulo: { pt: 'Fotossíntese', en: 'Photosynthesis' },
    // Placeholder until the team writes the entry and its sources.
    paragrafos: {
      pt: [
        'Fotossíntese é o processo pelo qual as plantas usam a energia da luz para transformar o gás carbônico (CO₂) do ar e a água em açúcares, liberando oxigênio (O₂). Esses açúcares viram folhas, galhos, raízes e frutos, e sustentam quase toda a vida do ecossistema. É por esse caminho que o carbono da atmosfera entra na vegetação e, mais tarde, no solo.',
      ],
      en: [
        'Photosynthesis is the process by which plants use the energy of light to turn carbon dioxide (CO₂) from the air and water into sugars, releasing oxygen (O₂). These sugars become leaves, branches, roots and fruits, and sustain almost all the life of the ecosystem. It is by this route that carbon from the atmosphere enters the vegetation and, later, the soil.',
      ],
    },
    animacao: {
      id: 'cicloAnual',
      titulo: { pt: 'Um ano na Caatinga', en: 'A year in the Caatinga' },
      descricao: { pt: 'Paisagem de Caatinga em corte, animada ao longo de um ano: o CO₂ entra nas plantas pela fotossíntese e sai pela respiração de plantas, serapilheira e solo; o saldo muda com a chuva.', en: 'Cross-section of a Caatinga landscape, animated over a year: CO₂ enters the plants through photosynthesis and leaves through the respiration of plants, litter and soil; the balance changes with the rain.' },
    },
  },
  {
    slug: 'estoque-de-carbono',
    titulo: { pt: 'Estoque de carbono', en: 'Carbon stock' },
    paragrafos: { pt: [], en: [] },
    animacao: {
      id: 'estoques',
      titulo: { pt: 'Onde o carbono fica guardado', en: 'Where carbon is stored' },
      descricao: { pt: 'Paisagem de Caatinga em corte mostrando onde o carbono fica guardado: solo, parte aérea, raízes, madeira morta, serapilheira e herbáceas. Os botões destacam cada compartimento.', en: 'Cross-section of a Caatinga landscape showing where carbon is stored: soil, aboveground, roots, deadwood, litter and herbaceous plants. The buttons highlight each pool.' },
    },
    acesso: { href: naPlataforma('estoque_carbono'), rotulo: { pt: 'Acesse os dados de estoque no bioma Caatinga', en: 'Access stock data for the Caatinga biome' } },
  },
  {
    slug: 'torre-de-fluxo',
    titulo: { pt: 'Torre de fluxo', en: 'Flux tower' },
    paragrafos: { pt: [], en: [] },
    animacao: {
      id: 'torreFluxo',
      titulo: { pt: 'Como a torre mede o carbono', en: 'How the tower measures carbon' },
      descricao: { pt: 'Paisagem de Caatinga com a torre de fluxo: o vento em redemoinhos, os sensores no topo, o ar que sobe e desce de dia, à noite e na seca, e a área de onde vem o ar medido. Os botões avançam as etapas.', en: 'Caatinga landscape with the flux tower: the wind in eddies, the sensors at the top, the air rising and sinking by day, at night and in the dry season, and the area the measured air comes from. The buttons step through the stages.' },
    },
  },
  {
    slug: 'fluxos-de-carbono',
    titulo: { pt: 'Fluxos de carbono', en: 'Carbon fluxes' },
    paragrafos: { pt: [], en: [] },
    animacao: {
      id: 'fluxos',
      titulo: { pt: 'Os nomes dos fluxos: GPP, Ra, NPP, Rh, Reco e NEE', en: 'The names of the fluxes: GPP, Ra, NPP, Rh, Reco and NEE' },
      descricao: { pt: 'Paisagem de Caatinga com a torre de fluxo, animada ao longo de um ano, mostrando GPP, respiração das plantas, NPP, respiração do solo, Reco e NEE. Os botões destacam cada fluxo.', en: 'Caatinga landscape with the flux tower, animated over a year, showing GPP, plant respiration, NPP, soil respiration, Reco and NEE. The buttons highlight each flux.' },
    },
  },
  {
    slug: 'eficiencia-de-uso-do-carbono',
    titulo: { pt: 'Eficiência de uso do carbono', en: 'Carbon use efficiency' },
    paragrafos: { pt: [], en: [] },
    animacao: {
      id: 'cue',
      titulo: { pt: 'Eficiência de uso do carbono (CUE)', en: 'Carbon use efficiency (CUE)' },
      descricao: { pt: 'Paisagem de Caatinga com a torre de fluxo mostrando, de cada 100 unidades de carbono fixadas pela fotossíntese, quantas ficam no ecossistema, e por que a CUE da Caatinga é alta. Os botões escolhem a explicação.', en: "Caatinga landscape with the flux tower showing, of every 100 units of carbon fixed by photosynthesis, how many stay in the ecosystem, and why the Caatinga's CUE is high. The buttons choose the explanation." },
    },
  },
  {
    slug: 'degradacao',
    titulo: { pt: 'Degradação', en: 'Degradation' },
    paragrafos: { pt: [], en: [] },
    animacao: {
      id: 'degradacao',
      titulo: { pt: 'Caatinga degradada', en: 'Degraded Caatinga' },
      descricao: { pt: 'Paisagem de Caatinga passando por etapas de degradação, de conservada a erodida, com o carbono que resta no ecossistema. Os botões escolhem a etapa.', en: 'Caatinga landscape going through stages of degradation, from conserved to eroded, with the carbon that remains in the ecosystem. The buttons choose the stage.' },
    },
  },
  {
    slug: 'manejo-agroecologico',
    titulo: { pt: 'Manejo agroecológico', en: 'Agroecological management' },
    paragrafos: { pt: [], en: [] },
    animacao: {
      id: 'agroecologia',
      titulo: { pt: 'Agroecológico e tradicional exploratório', en: 'Agroecological and traditional exploitative' },
      descricao: { pt: 'A mesma área de Caatinga com dois manejos separados por uma cerca: à esquerda, raleamento, cobertura morta e consórcio; à direita, corte raso, queima e roça em solo nu. Os botões avançam as etapas, e o painel compara o carbono dos dois lados.', en: 'The same area of Caatinga under two kinds of management, separated by a fence: on the left, thinning, mulch and intercropping; on the right, clear-cutting, burning and a crop plot on bare soil. The buttons step through the stages, and the panel compares the carbon on the two sides.' },
    },
  },
  {
    slug: 'sequestro-de-carbono',
    titulo: { pt: 'Sequestro de carbono', en: 'Carbon sequestration' },
    paragrafos: { pt: [], en: [] },
    animacao: {
      id: 'cisterna',
      titulo: { pt: 'Guardar água, guardar carbono', en: 'Store water, store carbon' },
      descricao: { pt: 'Casa do sertão com uma cisterna em corte ao lado de uma Caatinga com o solo em corte, comparando a água guardada na cisterna com o carbono guardado na vegetação e no solo: o que entra, o que sai, o saldo, como proteger, o vazamento e onde a comparação para. Os botões avançam as etapas.', en: 'A house in the sertão with a cistern in cross-section beside a Caatinga with its soil in cross-section, comparing the water stored in the cistern with the carbon stored in the vegetation and the soil: what comes in, what goes out, the balance, how to protect it, leakage and where the comparison stops. The buttons step through the stages.' },
    },
  },
  {
    slug: 'inventario-de-carbono',
    titulo: { pt: 'Inventário de carbono', en: 'Carbon inventory' },
    paragrafos: { pt: [], en: [] },
    animacao: {
      id: 'medirCarbono',
      titulo: { pt: 'Medir o carbono de uma área', en: 'Measuring the carbon of an area' },
      descricao: { pt: 'Paisagem de Caatinga com três estratos, densa, aberta e degradada, mostrando o inventário em campo: o mapa dos estratos, as parcelas, a medição da circunferência dos caules a 1,30 m, a equação alométrica, a coleta de serapilheira, madeira morta e solo, a conversão da biomassa em carbono e a extrapolação para a área com a faixa de incerteza. Os botões avançam as etapas, e a régua muda o número de parcelas.', en: 'Caatinga landscape with three strata, dense, open and degraded, showing the field inventory: the map of the strata, the plots, measuring stem circumference at 1.30 m, the allometric equation, collecting litter, deadwood and soil, converting biomass into carbon and extrapolating to the area with the uncertainty range. The buttons step through the stages, and the slider changes the number of plots.' },
    },
  },
]

export const TERMO_PARAM = 'termo'

/** The term the address names; anything else opens the first one. */
export function parseTermo(value: string | null): Termo {
  return TERMOS.find((t) => t.slug === value) ?? TERMOS[0]
}

/**
 * The terms whose title, in the reader's language, holds what the reader
 * typed in the sidebar's "Buscar termo" box, in their order; every term while
 * the box is blank. Case and accents fold away on both sides, as in the
 * platform's territory search, so "fotossintese" finds "Fotossíntese".
 */
export function filtrarTermos(termos: readonly Termo[], busca: string, locale: SiteLocale = 'pt'): Termo[] {
  const alvo = normalizeSearch(busca.trim())
  if (!alvo) return [...termos]

  return termos.filter((t) => normalizeSearch(t.titulo[locale]).includes(alvo))
}

/**
 * The one tab of the sidebar that Tab reaches (the roving tabindex of the
 * WAI-ARIA tabs pattern): the open term while the search shows it, otherwise
 * the first term shown, so a search that hides the open term does not leave
 * the list with no way in. undefined when the search shows none.
 */
export function abaFocavel(visiveis: readonly string[], aberto: string): string | undefined {
  return visiveis.includes(aberto) ? aberto : visiveis[0]
}

// The Glossário was a third tab of the Comunicação page while it was tested,
// and links to it (/comunicacao?aba=glossario&termo=<slug>) went around. That
// page sends them to /glossario with everything else they carry (the term,
// utm_* tags), all but `aba`; a repeated term goes along as it came, and the
// page opens its first value, as it does for a direct link. A repeated `aba`
// counts by its first value too, the one the Comunicação tabs would open.
// null for every other address. Here rather than in lib/marketing/comunicacaoAbas.ts, which
// the Comunicação tabs load on the client: importing the terms there pulled
// every term's text into that page's bundle.
export function glossarioAntigoHref(params: Record<string, string | string[] | undefined>): string | null {
  if ([params[ABA_PARAM]].flat()[0] !== 'glossario') return null

  const busca = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === ABA_PARAM || value === undefined) continue
    for (const v of [value].flat()) busca.append(key, v)
  }
  return busca.size > 0 ? `/glossario?${busca}` : '/glossario'
}
