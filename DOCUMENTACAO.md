# Plataforma de Carbono da Caatinga

Plataforma de monitoramento do carbono florestal do bioma Caatinga. Exibe camadas de dados espaciais (carbono do solo, biomassa, produtividade, fluxo, fogo e uso da terra) e calcula estatísticas zonais por recorte territorial e por polígono desenhado. As estatísticas de raster são processadas no servidor via Google Earth Engine (GEE).

Esta é a Fase 1, focada em três coisas: as camadas presentes, os recortes territoriais e as estatísticas por recorte e por desenho. Sem camadas temporais nesta fase.

O módulo de mapas e as páginas institucionais são uma aplicação Next.js só, num repositório só. O módulo ocupa a rota `/mapa`; as páginas de marketing ocupam `/`. O botão "Abrir os mapas" usa `MAPA_URL` (`lib/config.ts`), que resolve para `/mapa` a menos que `NEXT_PUBLIC_MAPA_URL` diga outra coisa.

## Stack

O módulo de mapas foi clonado do projeto `great-panini` (`C:\Users\artur\Documents\sig_gen\websig\.claude\worktrees\great-panini`), reaproveitando o pipeline GEE, o mapa e o store, e depois mesclada nesta aplicação.

- Next.js 16.2.3 (App Router), React 19, TypeScript strict
- MapLibre GL JS 5 (renderização WebGL)
- Zustand (estado global)
- Recharts (gráficos de estatística)
- @mapbox/mapbox-gl-draw e @turf/area (desenho e medição)
- @google/earthengine (SDK server-side, nas rotas de API)
- Libre Franklin no módulo de mapas, Raleway nas páginas de marketing

## Estrutura

```
app/
├ (marketing)/
│   ├ layout.tsx               # layout raiz: Raleway, metadata, globals.css
│   └ page.tsx                 # a landing
├ (mapa)/
│   ├ layout.tsx               # layout raiz: Libre Franklin, tela cheia, mapa.css
│   └ mapa/page.tsx            # entrada do módulo (dynamic import ssr:false)
├ api/gee/                     # rotas server-side
│   ├ tile/route.ts            # URL de tile do GEE (clip por clipId)
│   ├ stats/route.ts           # estatística zonal (categórica e contínua)
│   ├ point/route.ts           # valor de pixel pontual
│   └ timeseries/route.ts      # série temporal (dormente nesta fase)
├ globals.css                  # estilos das páginas de marketing
└ mapa.css                     # estilos do módulo de mapas
components/                    # marketing: SiteHeader, PhotoCarousel, HeroBackground,
                               # Sazonalidade (matriz, paleta e climatologias)
components/mapa/
├ Mapa.tsx                     # orquestrador (tema, dark mode, sidebars)
├ MapView.tsx                  # mapa, desenho, clique-para-estatística
├ Sidebar.tsx                  # acordeões de camadas
├ ResultsSidebar.tsx           # painel de resultados (fechável)
├ StatsChart.tsx               # gráficos Recharts (carregado sob demanda)
├ Header.tsx                   # barra superior (marca, estação, dark mode)
├ Welcome.tsx                  # tela de entrada sazonal
├ icons.tsx                    # ícones da interface
└ overlays/                    # busca, legenda, ferramentas, mapa base, coords
config/mapa/
├ layers.json                  # 20 camadas + centro/zoom do mapa
├ platforms.ts                 # tema único "carbono" (verde-oliva OCA)
├ basemaps.ts                  # mapas base
└ layerMeta.ts                 # fichas das camadas
lib/
├ config.ts                    # MAPA_URL
└ mapa/
    ├ geeAuth.ts               # autenticação da service account (+ setDeadline)
    ├ geeImage.ts              # construção do ee.Image (máscara de fill, reducers)
    ├ geeEvaluate.ts           # promisify de evaluate + timeout
    ├ geeValidation.ts         # validadores de entrada das rotas
    ├ geeAllowlist.ts          # allowlist de assets a partir de layers.json
    ├ rateLimit.ts             # rate limiter em memória por IP
    ├ clipRegistry.ts          # cache do recorte local por clipId
    ├ tileCache.ts             # cache de tileUrl no servidor (TTL 90 min)
    ├ getRasterStats.ts        # cliente da rota de estatística (+ dedup)
    ├ getRasterPointValue.ts   # cliente da rota de valor pontual
    ├ resolvePixelValue.ts     # escala + classe do valor pontual
    ├ computeBbox.ts           # bbox de GeoJSON
    ├ drawRectangleMode.ts     # modo retângulo do mapbox-gl-draw
    ├ jenks.ts                 # classificação Jenks
    └ store.ts                 # store Zustand
lib/phenology.ts               # os 12 meses do ciclo, cores e NDFI mediano
lib/color.ts                   # mistura, luminância e contraste WCAG
lib/ndfi-series.json           # matriz 40 anos x 12 meses do NDFI mediano
types/mapa.ts                  # tipos do módulo de mapas
public/
├ images/ e logos/             # marketing
├ data/vector/                 # GeoJSON dos recortes
├ banners/                     # banners dos acordeões
├ welcome/                     # fotos das fases do ciclo, na tela de entrada
└ videos/                      # climatologias mensais (cor real, chuva, GPP)
scripts/
├ verify-assets.mjs            # autentica no GEE e verifica asset IDs
├ list-assets.mjs              # lista diretórios de assets no GEE
├ compute-breaks.mjs           # Jenks offline, grava em config/mapa/layers.json
├ simplify-clip.mjs            # gera os recortes simplificados
├ prewarm.mjs                  # aquece o cache de tile do servidor
└ build-recortes.py            # baixa e recorta os recortes ao bioma
next.config.ts                 # serverExternalPackages + Cache-Control dos GeoJSON
render.yaml                    # Web Service Node
.env.local                     # GOOGLE_APPLICATION_CREDENTIALS (não versionar)
```

Plataforma única: só o tema "Carbono Caatinga". O seletor de plataformas e os layouts alternativos herdados do great-panini (SAP, PAE-PE, CRESCA, ATLAS, `BrandedHeader`/`BrandedFooter`, `PlatformSwitcher`) foram removidos.

### Por que dois layouts raiz

`app/(marketing)/layout.tsx` e `app/(mapa)/layout.tsx` são layouts raiz irmãos, cada um com o seu `<html>`, o seu `<body>` e o seu CSS global. Não existe `app/layout.tsx`.

O motivo é CSS. O `mapa.css` zera a rolagem (`html, body { overflow: hidden }`), pinta o fundo com `--paper` e troca a família tipográfica; aplicado às páginas de marketing, mataria a rolagem da landing. O `globals.css` define `.btn`, `.container`, `body { font-size: 15px; line-height: 1.75 }` e a paleta `--verde`/`--laranja`, que não têm uso no mapa. Com layouts raiz separados, o Next.js emite um chunk de CSS por grupo e nenhum dos dois alcança o outro. Verificado no build: o CSS de `/` não contém `--paper`, `--acc` nem `overflow:hidden` no `body`; o de `/mapa` não contém `.btn`, `--verde` nem Raleway.

O preço é que navegar entre os dois grupos é um carregamento de página inteiro, não uma transição de cliente. Por isso todo link que cruza a fronteira usa `<a href>`, não `next/link`: os botões "Abrir os mapas" e a marca no header do módulo, que volta para `/`.

## Configuração e execução

Pré-requisito: uma service account do GEE registrada no Earth Engine. Esta instalação reaproveita a do great-panini. O arquivo `.env.local` aponta para o JSON:

```
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\artur\Documents\sig_gen\websig\gen-lang-client-0860544184-d00630c502f2.json
```

Rodar em desenvolvimento:

```
npm install
npm run dev
```

O servidor sobe em http://localhost:3000. O mapa abre centralizado na Caatinga (centro `[-40, -9]`, zoom `5.2`). As camadas vetoriais carregam de `public/data`; as de carbono geram tiles do GEE ao serem ligadas.

## Camadas

São 20 camadas em dois acordeões. Todos os rasters recortam ao bioma (`clipToLayerId: "bioma"`).

### Recortes territoriais (vetoriais)

| id | Nome | Rótulo (hover) | Origem | Feições |
|---|---|---|---|---|
| `bioma` | Bioma Caatinga | `Bioma` | `../vectors/limite_caatinga.geojson` | 1 |
| `estados` | Estados | `abbrev_state` | IBGE via geobr | 10 |
| `municipios` | Municípios | `name_muni` | IBGE via geobr | 1210 |
| `terras_indigenas` | Terras Indígenas | `name_indigenous_land` | FUNAI via geobr | 50 |
| `quilombolas` | Territórios Quilombolas | `name_quilombo` | INCRA via geobr | 86 |
| `assentamentos` | Assentamentos (INCRA) | `nome_proje` | INSA (assentamentos SAB) | 1923 |

Os vetores ficam acima dos rasters na ordem do `layers.json`, condição para o clique em uma feição computar a estatística do raster abaixo.

### Carbono e ambiente (rasters GEE)

| id | Nome | Asset e banda | Estatística | Unidade |
|---|---|---|---|---|
| `solo_carbono` | Carbono Orgânico do Solo (0-30 cm) | `mapbiomas-public/.../soil/collection2/mapbiomas_soil_collection2_soc_t_ha_000_030cm`, banda `prediction_2023` | contínua | t C/ha |
| `gpp_modis` | Produtividade Primária Bruta (GPP) | `MODIS/061/MOD17A2HGF`, banda `Gpp`, 2023 | Jenks 5 classes | kg C/m2/8d |
| `npp_modis` | Produtividade Primária Líquida (NPP) | `MODIS/061/MOD17A3HGF`, banda `Npp`, 2023 | Jenks 5 classes | kg C/m2/ano |
| `biomassa_gedi` | Biomassa Aérea (GEDI L4B) | `LARSE/GEDI/GEDI04_B_002`, banda `MU` | contínua | Mg/ha |
| `biomassa_spawn` | Carbono na Biomassa Aérea (Spawn e Gibbs 2010) | `NASA/ORNL/biomass_carbon_density/v1`, banda `agb` | contínua | Mg C/ha |
| `gfw_netflux` | Fluxo Líquido de Carbono Florestal (GFW) | `sat-io/.../forest_carbon_fluxes/net_flux`, banda `b1` | contínua | Mg CO2e/ha |
| `gfw_emissions` | Emissões Brutas (GFW) | `.../gross_emissions`, banda `b1` | contínua | Mg CO2e/ha |
| `gfw_removals` | Remoções Brutas (GFW) | `.../gross_removals`, banda `b1` | contínua | Mg CO2/ha |
| `lulc_mapbiomas` | Uso e Cobertura (MapBiomas 2024) | `mapbiomas-public/.../lulc/collection10_1/...`, banda `classification_2024` | categórica (30 classes) | classe |
| `fogo_frequencia` | Frequência de Fogo (1985-2023) | `mapbiomas-public/.../fire/collection3/mapbiomas_fire_collection3_fire_frequency_v1`, banda `fire_frequency_1985_2023` | contínua | anos com fogo |
| `ndvi_modis` | NDVI (MODIS 2023) | `MODIS/061/MOD13Q1`, banda `NDVI`, ×0,0001 | contínua | NDVI |
| `evi_modis` | EVI (MODIS 2023) | `MODIS/061/MOD13Q1`, banda `EVI`, ×0,0001 | contínua | EVI |
| `chirps_precip` | Precipitação Anual (CHIRPS 2023) | `UCSB-CHG/CHIRPS/DAILY`, banda `precipitation`, soma anual | contínua | mm/ano |
| `lst_modis` | Temperatura de Superfície (MODIS 2023) | `MODIS/061/MOD11A2`, banda `LST_Day_1km`, ×0,02 − 273,15 | contínua | °C |

As camadas de índices/fenologia (NDVI, EVI) e clima (precipitação, temperatura) vêm do inventário `../Inventario_Camadas_Carbono_GEE_Caatinga.md`. Escala física via `multiplier`/`offset` no asset (aplicados à imagem, então tiles, estatística e valor pontual saem todos em unidade física). Faixas de min/máx calibradas medindo o dado real sobre a Caatinga.

Todos os asset IDs foram confirmados no catálogo do GEE por `scripts/verify-assets.mjs`.

## Estatísticas zonais

Dois disparos, mesmo pipeline:

1. Clique em uma feição de recorte territorial. O código encontra a feição e o raster visível abaixo dela, e computa a estatística sobre a geometria da feição.
2. Desenho de um polígono com a ferramenta do mapa. Computa a área (km2) e a mesma estatística do raster visível.

Dois tipos de resultado, conforme a camada:

- Contínua: média, mediana, mínimo, máximo, desvio, contagem. Exibida em grade numérica. Para solo, biomassa, fluxo GFW e fogo.
- Categórica: percentual de pixels por classe, em barras. Para o uso da terra (MapBiomas) e para GPP/NPP (classificados em 5 classes por Jenks).

Os resultados são cacheados por chave `camada:estático:hashDaGeometria`, então reclicar a mesma feição é instantâneo.

## Rotas de API

Todas `POST`, runtime Node, `force-dynamic`. Autenticam via `initGee()` (`lib/mapa/geeAuth.ts`). Ficam em `app/api/`, fora dos dois grupos de rotas, então não herdam layout nenhum.

Segurança: as rotas têm allowlist de assets (só os de `layers.json`), rate limiting por IP, teto de `numClasses`, validação de geometria/`lon`/`lat`/`visParams`, timeout nas chamadas GEE e mensagens de erro genéricas (não vazam o caminho das credenciais).

- `POST /api/gee/tile`: recebe `{ asset, clipId, visParams, classify }` e devolve `{ tileUrl }` (e `breaks` no modo Jenks). O servidor resolve o recorte localmente pelo `clipId` e cacheia o `tileUrl` (TTL 90 min).
- `POST /api/gee/stats`: recebe `{ asset, geometry, colorType, classify, breaks }` e devolve `{ kind: "categorical", counts }` ou `{ kind: "continuous", stats }`. Os `breaks` do bioma (vindos do tile) mantêm as classes do gráfico iguais às cores do mapa.
- `POST /api/gee/point` e `POST /api/gee/timeseries`: valor pontual e série temporal. A série fica dormente nesta fase.

## Identidade visual

Cores do logo OCA nos dois lados: verde-oliva `#5f7030` e laranja `#ce8b44`. A tipografia difere por grupo de rotas: as páginas de marketing usam Raleway (pesos 300/400/600), o módulo de mapas usa Libre Franklin (400 a 800), ambas self-hosted via `next/font/google` e com numerais alinhados e tabulares (`lnum`/`tnum`).

### A paleta mensal

O acento da interface não é fixo: é a cor do mês corrente. As doze cores saem da série Landsat de 1985 a 2024 sobre a vegetação nativa do bioma, desmisturada em NDFI (fracções GV, NPV, solo e sombra), com a mediana de cada mês traduzida numa rampa ancorada nas duas cores do logo. Abril é o pico verde (NDFI mediano +0,56) e outubro o fundo seco (-0,56). O estudo que originou a rampa está em `prototipos/sazonalidade.html`, e os scripts que produziram a série em `../gee`.

- `lib/phenology.ts`: os doze meses (`MONTHS`), as quatro fases do ciclo (`PHASES`), `resolveMonth`, a faixa `CYCLE_GRADIENT` e a série mediana por mês. Compartilhado entre a landing e o módulo de mapas, por isso fica em `lib/` e não em `lib/mapa/`.
- `lib/color.ts`: matemática de cor (mistura sRGB, luminância e contraste WCAG) usada para derivar os acentos.
- `config/mapa/platforms.ts`: `buildAccent(cor, escuro)` calcula fundo suave, borda, tinta e cor sobre o sólido a partir da cor do mês, em vez de 24 conjuntos escritos à mão. `npm run contrast` roda esse mesmo código nos 12 meses e nos 2 modos e falha se algum par cair abaixo de 4,5:1.

O módulo abre no mês de hoje e escreve as CSS vars `--acc*` inline na sua raiz, junto com `data-month`. O `mapa.css` guarda só um valor de repouso; não há blocos `[data-month]` no CSS, que seriam 24 e sairiam de sincronia com o tema em JS. O usuário pode fixar outro mês pelo chip do header ou pela rampa do welcome, e a escolha persiste em `cc_month_v2`.

Na landing, a mesma paleta aparece na seção `/#paleta` (componente `components/Sazonalidade.tsx`): a matriz de 40 anos por 12 meses, a tira dos doze tons e as três climatologias mensais em vídeo (cor real, precipitação e GPP), em `public/videos`. Os vídeos só baixam quando a seção chega perto da tela.

## Scripts utilitários

- `node scripts/verify-assets.mjs`: autentica no GEE e imprime as bandas de cada asset candidato, ou o erro. Serve para confirmar IDs e bandas antes de configurar uma camada.
- `node scripts/list-assets.mjs`: lista os filhos de um diretório de assets, para achar caminhos exatos.
- `npm run breaks`: calcula os breaks de Jenks sobre o bioma e grava em `config/mapa/layers.json`.
- `npm run clip`: gera as versões simplificadas das bordas usadas como recorte.
- `npm run prewarm`: aquece o cache de tile do servidor (rodar com o servidor no ar).
- `npm run trim`: arredonda as coordenadas dos GeoJSON para 5 casas decimais (~1,1 m, abaixo de um pixel em qualquer zoom do mapa). Não remove vértice nenhum, então o traço na tela não muda; o recorte do bioma caiu de 736 KB para 610 KB comprimido.
- `npm run contrast`: confere o contraste WCAG dos acentos gerados para os 12 meses nos 2 modos, e sai com erro se algum par ficar abaixo de 4,5:1.
- `python scripts/build-recortes.py`: baixa os recortes (IBGE, FUNAI, INCRA via geobr), recorta ao bioma com geopandas, simplifica e grava em `public/data/vector`. Requer `pip install geobr geopandas`.

## Deploy

Um Web Service Node no Render serve o site inteiro, marketing e módulo de mapas. Não dá mais para usar o Static Site gratuito: as rotas `/api/gee/*` rodam no servidor, e por isso `output: 'export'` e `trailingSlash` saíram do `next.config.ts`.

1. `render.yaml` já traz `runtime: node`, `buildCommand: npm ci && npm run build` e `startCommand: npm run start`.
2. No painel do serviço, Environment -> Secret Files: subir o JSON da service account com o nome `gee-service-account.json`. O Render monta em `/etc/secrets/`, caminho apontado por `GOOGLE_APPLICATION_CREDENTIALS` no `render.yaml`.
3. `NEXT_PUBLIC_MAPA_URL` não precisa ser definida: sem ela, `MAPA_URL` resolve para a rota interna `/mapa`.

O GEE: a service account precisa estar registrada no Earth Engine e com a Earth Engine API habilitada no projeto GCP. Os assets sat-io e mapbiomas-public são públicos.

## TODOs

Camadas e dados:

- Assentamentos e municípios são pesados (1923 e 1210 feições). Se o desenho ficar lento, converter para PMTiles (o código de PMTiles do MapView já existe).
- ESA CCI Biomass não foi incluída (o caminho do inventário não existe no GEE). A biomassa está coberta por GEDI e Spawn e Gibbs. Localizar o asset correto se quiser incluir.
- Spawn e Gibbs usa só a banda `agb`. A soma AGB mais BGB exige uma pequena edição no servidor (`lib/mapa/geeImage.ts` ou na rota) para somar bandas.
- Fogo: a camada mostra `min: 0`, então áreas nunca queimadas aparecem na cor mais clara. Para mostrar só o que queimou, mascarar o valor 0 (edição no servidor).
- Camadas do inventário ainda não incluídas: clima e água (CHIRPS, ERA5, TerraClimate), índices e fenologia (NDVI/EVI, Sentinel-2), gases e fluorescência (TROPOMI, SIF), e integridade de projetos. Ficam para fases seguintes.
- Camadas temporais (slider e série) estão fora do escopo desta fase. O código temporal foi deixado dormente, não removido.

Interface:

- Os banners dos acordeões são gradientes simples gerados. Trocar por arte definitiva se quiser.
- Reordenar camadas usa arrastar-e-soltar (HTML5), que funciona no desktop mas não em telas de toque. Adicionar botões subir/descer se o mobile virar alvo.
- O header do módulo traz "Dados" e "Metodologia" como rótulos inertes. Ligar às seções correspondentes da landing (`/#mapa`, `/#frentes`) ou remover.

Notas de ambiente:

- Nesta máquina o preview do Chrome reporta viewport 0x0 e não tira captura de tela; a verificação foi feita por leitura do DOM e das requisições de rede.

## Revisão técnica

Uma revisão de código completa (segurança, bugs, desempenho, UI, código morto) está em [`REVISAO_TECNICA.md`](REVISAO_TECNICA.md), com os itens P0-P3 já implementados e verificados e a limpeza P4 aplicada (plataformas herdadas, caminho TiTiler, código morto e dependências não usadas removidos). Os caminhos citados lá são os anteriores à mesclagem (`lib/`, `config/`, `components/`); hoje leia-os como `lib/mapa/`, `config/mapa/` e `components/mapa/`.
