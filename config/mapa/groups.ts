// Grupos do painel de camadas. A ordem do array é a ordem na tela, e segue a
// mesma narrativa da landing: onde se está olhando, o que existe, o que ameaça.
//
// As cores não são escolha de paleta: são seis das doze cores medidas na série
// NDFI 1985-2024 sobre a vegetação nativa, as mesmas que pintam o acento
// sazonal da interface. Elas desenham um arco do verde de abril, o pico do
// ano, ao terracota de outubro, o fundo seco, acompanhando o sentido dos
// grupos. Quando entrarem as fotos de fundo, a cor por trás já será a certa.

export type GroupId =
  | 'territorio'
  | 'estoques'
  | 'biomassa'
  | 'produtividade'
  | 'clima'
  | 'pressoes'

export interface GroupInfo {
  id:    GroupId
  label: string
  color: string
  /** Mês da rampa sazonal de onde a cor veio, para rastrear a escolha. */
  origem: string
}

export const GROUPS: GroupInfo[] = [
  {
    id: 'territorio',
    label: 'Recortes territoriais',
    color: '#597636',
    origem: 'verde da marca',
  },
  {
    id: 'estoques',
    label: 'Estoques de carbono',
    color: '#4F791E',
    origem: 'abril, pico verde',
  },
  {
    id: 'biomassa',
    label: 'Biomassa e estrutura',
    color: '#577B14',
    origem: 'março',
  },
  {
    id: 'produtividade',
    label: 'Produtividade e fluxos',
    color: '#778100',
    origem: 'janeiro',
  },
  {
    id: 'clima',
    label: 'Clima e fenologia',
    color: '#A78400',
    origem: 'julho, transição',
  },
  {
    id: 'pressoes',
    label: 'Pressões e mudanças',
    color: '#DD8637',
    origem: 'outubro, fundo seco',
  },
]

export const GROUP_BY_ID = new Map(GROUPS.map((g) => [g.id, g]))
