// Editorial content from the first landing page, parked here when the page was
// rebuilt to the Figma design in September 2026. The Figma home has no section
// for it; it is kept verbatim, citations included, for the internal pages the
// menu implies ("Conheça a plataforma"). Nothing imports this yet.
//
// Icon names are stored as strings (e.g. 'FaLayerGroup') rather than React
// components, to keep this data module free of React dependencies. A page that
// renders these maps the name back to a react-icons/fa6 component.
//
// The color values (color) belong to the old palette (#5f7030 and friends), which
// this redesign replaces. Keep them as they are — this is archived content, and
// whoever builds the internal pages restyles it against the new tokens.

export type Frente = {
  icon: string
  color: string
  title: string
  text: string
}

export const FRENTES: Frente[] = [
  {
    icon: 'FaLayerGroup',
    color: '#5f7030',
    title: 'Dados espaciais do bioma',
    text: 'Carbono do solo, biomassa aérea, produtividade primária, fogo, precipitação, temperatura e uso da terra, com dados de campo e de torres de fluxo, que medem a troca de carbono entre a vegetação e a atmosfera.',
  },
  {
    icon: 'FaScaleBalanced',
    color: '#7a4e1e',
    title: 'Governança dos mercados',
    text: 'Acompanhamento das decisões e normas que afetam a Caatinga, incluindo o Sistema Brasileiro de Comércio de Emissões (SBCE) e as resoluções de REDD+ no país.',
  },
  {
    icon: 'FaBullhorn',
    color: '#ce8b44',
    title: 'Comunicação',
    text: 'Boletins e cartilhas em linguagem acessível para agricultores familiares, assentamentos e demais territórios.',
  },
  {
    icon: 'FaFlaskVial',
    color: '#4e5d26',
    title: 'Metodologia e MRV digital',
    text: 'Método de estimativa desenhado para o semiárido, com sistema digital de mensuração, relato e verificação (MRV) da prática de restauração e manutenção.',
  },
  {
    icon: 'FaShieldHalved',
    color: '#a66a2e',
    title: 'Integridade dos projetos',
    text: 'Avaliação da consistência científica e social dos projetos de carbono em operação no bioma.',
  },
  {
    icon: 'FaPeopleGroup',
    color: '#6b7d34',
    title: 'Formação cidadã',
    text: 'Oficinas, participação em eventos e rodas de diálogo que levam formação à sociedade civil e escutam a visão dos territórios.',
  },
]
