/**
 * The platform tour's words, Portuguese like the rest of the platform's UI.
 * `{{current}}` and `{{total}}` are driver.js placeholders. Its own module so
 * the balloon's renderers (tourDom.ts) and the steps (tourSteps.ts) read it
 * without importing each other.
 */
export const TOUR_COPY = {
  start: 'Começar', next: 'Próximo', previous: 'Voltar', done: 'Concluir', close: 'Fechar tutorial',
  progress: 'Passo {{current}} de {{total}}',
  welcome:   { title: 'Boas-vindas à Caativar', description: 'Em menos de um minuto, mostramos como medir o carbono de um lugar da Caatinga.' },
  territory: { title: 'Escolha onde olhar', description: 'Escolha o recorte: o bioma, um estado, um município, um território tradicional ou uma unidade de conservação. Busque pelo nome ou clique direto no mapa.' },
  draw:      { title: 'Ou desenhe a sua área', description: 'Em Delimitar recorte, desenhe um polígono no mapa. Em Marcar ponto, veja o valor de um lugar exato e, nas camadas com série histórica, como ele mudou ao longo dos anos.' },
  layerCard: { title: 'Cada item é uma camada', description: 'O botão à esquerda liga a camada no mapa, e a legenda aparece no canto inferior direito. As camadas ficam agrupadas por tema.' },
  layerInfo: { title: 'O que a camada mostra', description: 'O “i” abre a ficha da camada: o que ela mede, a fonte, o período e como citar. Por exemplo:' },
  result:    {
    title: 'Veja o resultado',
    description: 'Com uma camada ligada, clique num recorte no mapa ou desenhe uma área. O painel Resultado se abre à direita com:',
    items: ['Os números da camada no recorte', 'Gráficos, conforme a camada', 'Download em CSV e JPEG'],
  },
  basemap:   { title: 'Mapa base', description: 'Troque o fundo do mapa: ruas, relevo ou imagem de satélite.' },
  replay:    { title: 'Tudo pronto', description: 'Agora é com você: ligue uma camada e clique num município. Para rever este passo a passo, use o botão “?” ao lado do mapa.' },
} as const
