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
│   └ timeseries/route.ts      # série anual num ponto
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
├ layers.json                  # 34 camadas + centro/zoom do mapa
├ platforms.ts                 # tema único "carbono" (verde-oliva OCA)
├ basemaps.ts                  # mapas base (CARTO exige NEXT_PUBLIC_CARTO_KEY)
└ layerMeta.ts                 # fichas das camadas
lib/
├ config.ts                    # MAPA_URL
├ contentful.ts                # cliente GraphQL do Contentful (server-only)
├ content/comunicacao.ts       # cartilhas, caderno e fotos da formação (+ padrão)
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
    ├ searchMatch.ts           # regra de casamento da busca de territórios
    ├ vectorDataUrl.ts         # versão na query dos GeoJSON (cache do navegador)
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
├ build-recortes.py            # baixa e recorta os recortes ao bioma
└ enrich-uf.py                 # grava a UF de cada feição dos recortes
next.config.ts                 # serverExternalPackages + Cache-Control dos GeoJSON
render.yaml                    # Web Service Node
.env.local                     # GOOGLE_APPLICATION_CREDENTIALS (não versionar)
```

Plataforma única: só o tema "Caativar". O seletor de plataformas e os layouts alternativos herdados do great-panini (SAP, PAE-PE, CRESCA, ATLAS, `BrandedHeader`/`BrandedFooter`, `PlatformSwitcher`) foram removidos.

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

## Conteúdo editorial da landing

Três blocos da landing vêm do Contentful, quando configurado: a coleção de cartilhas, o caderno temático em destaque e as fotos do carrossel da Formação cidadã. O restante da página segue no código, inclusive os cartões de números com as suas fontes, a seção de sazonalidade e as fotos do hero.

O acesso é server-side (`lib/contentful.ts`, com `import 'server-only'`), pela API GraphQL de entrega, e as credenciais nunca levam o prefixo `NEXT_PUBLIC_`. O repositório `lib/content/comunicacao.ts` traduz as entries para o formato que a página consome e aplica o padrão por seção: se a coleção de cartilhas vier vazia, entram as quatro cartilhas do código; se a requisição falhar, entra o conteúdo padrão inteiro e o erro vai para o log. É o que permite ao `npm run build` do CI rodar sem qualquer variável do Contentful.

Modelo de conteúdo, criado por `npm run contentful:provision` (IDs dos campos em inglês, como a query pede; nomes de exibição em português, que é o que o editor lê):

| Content type | Campos |
|---|---|
| `cartilha` | `volume`, `title`, `cover` (imagem), `pdf` (opcional), `order` |
| `caderno` | `title`, `description`, `cover` (imagem), `pdf` (opcional) |
| `fotoFormacao` | `caption`, `alt`, `photo` (imagem), `order` |

A ordem de exibição é do editor, pelo campo `order` (a query pede `order_ASC`), e não a data de criação da entry. O `pdf` é opcional: a capa da cartilha e o caderno só ganham link quando ele estiver publicado, o que é a forma de disponibilizar o material para download. `tests/scripts/contentfulProvision.test.ts` compara o modelo com a query e falha se um campo for renomeado em apenas um dos dois lados.

## Camadas

São 34 camadas, 6 vetoriais e 28 rasters, organizadas nos temas e subtemas de `config/mapa/groups.ts`. Todos os rasters recortam ao bioma (`clipToLayerId: "bioma"`).

### Recortes territoriais (vetoriais)

| id | Nome | Unidade | Rótulo (hover) | Contexto | Origem | Feições |
|---|---|---|---|---|---|---|
| `bioma` | Bioma Caatinga | Bioma | `Bioma` | — | `../vectors/limite_caatinga.geojson` | 1 |
| `estados` | Estados | Estado | `name_state` | `abbrev_state` | IBGE via geobr | 10 |
| `municipios` | Municípios | Município | `name_muni` | `abbrev_state` | IBGE via geobr | 1210 |
| `terras_indigenas` | Terras Indígenas | Terra Indígena | `name_indigenous_land` | `abbrev_state` | FUNAI via geobr | 50 |
| `quilombolas` | Territórios Quilombolas | Território Quilombola | `name_quilombo` | `abbrev_state` | INCRA via geobr | 86 |
| `assentamentos` | Assentamentos (INCRA) | Assentamento | `nome_proje` | `abbrev_state` | INSA (assentamentos SAB) | 1923 |

Os vetores ficam acima dos rasters na ordem do `layers.json`, condição para o clique em uma feição computar a estatística do raster abaixo.

Duas colunas existem só para a busca. A `Unidade` é o `unitName`, substantivo no
singular que descreve **uma** feição, usado como rótulo do resultado. O
`Contexto` é o `contextField`, a propriedade que desempata homônimos: nunca vira
resultado próprio, acompanha o rótulo e pode ser digitada junto dele. Ver
"Busca de territórios".

O contexto não vinha nos GeoJSONs originais, porque o `build-recortes.py`
guardava só a coluna do rótulo. Quem o grava é `scripts/enrich-uf.py`. O
`build-recortes.py` hoje preserva `abbrev_state` e `code_muni`, então uma
regeração não desfaz mais isso.

#### Entrega dos GeoJSON e cache do navegador

Os arquivos de `public/data/vector/` são servidos com `public, no-cache`
(`next.config.ts`): o navegador guarda o arquivo mas revalida antes de usá-lo, e
como o Next já manda ETag e Last-Modified um arquivo inalterado custa um 304 em
vez dos ~4,85 MB. O cabeçalho anterior era `max-age=86400,
stale-while-revalidate=604800`, que presumia arquivos imutáveis.

Trocar o cabeçalho não alcança o que os navegadores já guardaram sob o antigo:
essas entradas seguem válidas por um dia sem consultar o servidor, e utilizáveis
como stale por mais uma semana. Um redeploy também não as alcança — a cópia
velha está no navegador, não no servidor. Foi por isso que, depois do
`enrich-uf.py`, os estados continuaram sem nome mesmo em ambiente recém-buildado:
a geometria é idêntica entre as duas versões, então a camada desenhava
normalmente e só faltava `name_state`. Propriedade ausente não é erro em lugar
nenhum, então cada caminho caía num fallback diferente — o popup some, a busca
pula a feição, e o rótulo da análise e o relatório usam o nome da camada, com os
dez estados lidos como "Estados".

`lib/mapa/vectorDataUrl.ts` resolve isso anexando `?v=N` na URL. A query entra na
chave de cache do navegador e em mais nada: em particular não chega ao sistema de
arquivos, então `layer.url` continua sendo o caminho cru que `recorteRegistry` e
`clipRegistry` leem do disco e o radical que a preferência por `_clip` reescreve.
Essa dupla função é o que fazia o versionamento parecer inviável. Os três pontos
que buscam vetor no cliente passam por ela: a source do MapLibre, o lookup de
geometria completa (`MapView.tsx`) e o índice da busca (`FloatingSearchBar.tsx`);
o servidor nunca usa.

**A constante não deve ser incrementada a cada mudança de dado.** Com `no-cache`
todo uso revalida, então um GeoJSON editado é pego pelo ETag na carga seguinte.
A versão existe para desviar das entradas envenenadas pelo cabeçalho antigo, uma
vez só; incrementá-la de novo só custaria a todo mundo um download completo.

`tests/config/vectorLayerFields.test.ts` verifica que toda propriedade declarada
no `layers.json` existe de fato nos arquivos entregues — a falha é silenciosa por
natureza, e era a única classe de problema aqui sem nenhuma guarda.

### Carbono e ambiente (rasters GEE)

| id | Nome | Asset e banda | Estatística | Unidade |
|---|---|---|---|---|
| `estoque_carbono` | Estoque de Carbono (Quarto Inventário Nacional) | `ee-arturlourenco/assets/caatinga_estoques`, banda `b1` | contínua | t C/ha |
| `estoque_c_agb` a `estoque_c_solo` | Os cinco reservatórios do estoque acima, um por camada | idem, bandas `b2` a `b6` | contínua | t C/ha |
| `solo_carbono` | Carbono Orgânico do Solo (MapBiomas) | `mapbiomas-public/.../soil/collection2/mapbiomas_soil_collection2_soc_t_ha_000_030cm`, banda `prediction_2023` | contínua | t C/ha |
| `solo_carbono_embrapa` | Carbono Orgânico do Solo (Embrapa) | `ee-ulissesalencar17/assets/carbono_g_kg_2020`, banda `b1` | contínua, 2 a 16 | g/kg |
| `gpp_modis` | Produtividade Primária Bruta (GPP) | `MODIS/061/MOD17A2HGF`, banda `Gpp`, 2023 | Jenks 5 classes | kg C/m2/8d |
| `npp_modis` | Produtividade Primária Líquida (NPP) | `MODIS/061/MOD17A3HGF`, banda `Npp`, 2023 | Jenks 5 classes | kg C/m2/ano |
| `gpp_pml` | Produtividade Primária Bruta (GPP, PML-V2 2023) | `CAS/IGSNRR/PML/V2_v018`, banda `GPP`, 2023, média ×365 | contínua | g C/m2/ano |
| `biomassa_gedi` | Biomassa Aérea (GEDI L4B) | `LARSE/GEDI/GEDI04_B_002`, banda `MU` | contínua | Mg/ha |
| `biomassa_spawn` | Carbono na Biomassa Aérea (Spawn e Gibbs 2010) | `NASA/ORNL/biomass_carbon_density/v1`, banda `agb` | contínua | Mg C/ha |
| `biomassa_esa_lenhosa` | Biomassa Aérea, vegetação lenhosa (ESA CCI 2022) | `sat-io/.../ESA/ESA_CCI_AGB`, banda `AGB`, 2022 | contínua | Mg/ha |
| `biomassa_esa_territorial` | Biomassa Aérea, média territorial (ESA CCI 2022) | idem, com `unmaskValue: 0` | contínua | Mg/ha |
| `altura_dossel` | Altura do Dossel (Meta e WRI 2023) | `sat-io/.../facebook/meta-canopy-height`, banda `cover_code` | contínua | m |
| `gfw_netflux` | Fluxo Líquido de Carbono Florestal (GFW) | `sat-io/.../forest_carbon_fluxes/net_flux`, banda `b1` | contínua | Mg CO2e/ha |
| `gfw_emissions` | Emissões Brutas (GFW) | `.../gross_emissions`, banda `b1` | contínua | Mg CO2e/ha |
| `gfw_removals` | Remoções Brutas (GFW) | `.../gross_removals`, banda `b1` | contínua | Mg CO2/ha |
| `lulc_mapbiomas` | Uso e Cobertura (MapBiomas 2024) | `mapbiomas-public/.../lulc/collection10_1/...`, banda `classification_2024` | categórica (30 classes) | classe |
| `cobertura_ibge` | Cobertura da Terra (IBGE 2020) | `ee-ulissesalencar17/assets/cobertura_solo_IBGE_2020`, banda `b1` | categórica (12 classes) | classe |
| `fogo_frequencia` | Frequência de Fogo (1985-2023) | `mapbiomas-public/.../fire/collection3/mapbiomas_fire_collection3_fire_frequency_v1`, banda `fire_frequency_1985_2023` | contínua | anos com fogo |
| `degradacao_terra` | Índice de Degradação da Terra (2021) | `ee-arturlourenco/assets/id_2021_recode_mask_int`, banda `b1` | categórica (6 classes) | classe |
| `ndvi_modis` | NDVI (MODIS 2023) | `MODIS/061/MOD13Q1`, banda `NDVI`, ×0,0001 | contínua | NDVI |
| `evi_modis` | EVI (MODIS 2023) | `MODIS/061/MOD13Q1`, banda `EVI`, ×0,0001 | contínua | EVI |
| `chirps_precip` | Precipitação Anual (CHIRPS 2023) | `UCSB-CHG/CHIRPS/DAILY`, banda `precipitation`, soma anual | contínua | mm/ano |
| `lst_modis` | Temperatura de Superfície (MODIS 2023) | `MODIS/061/MOD11A2`, banda `LST_Day_1km`, ×0,02 − 273,15 | contínua | °C |
| `aridez` | Índice de Aridez (normal 1990-2020, Xavier et al. 2021) | `ee-ocaufcg/assets/IA_1990_2020`, banda `b1` | categórica (4 classes) | classe |

As camadas de índices/fenologia (NDVI, EVI) e clima (precipitação, temperatura) vêm do inventário `../Inventario_Camadas_Carbono_GEE_Caatinga.md`. Escala física via `multiplier`/`offset` no asset (aplicados à imagem, então tiles, estatística e valor pontual saem todos em unidade física). Faixas de min/máx calibradas medindo o dado real sobre a Caatinga.

O `gfw_netflux` é a única camada de valor com sinal: pela convenção
atmosférica dos dados de origem, o fluxo líquido é negativo onde as remoções
superam as emissões. Lido cru, portanto, um trecho que sequestrou carbono
aparece com um menos na frente. A camada declara `signedFlux: true`, e com isso
o painel de resultados descarta o sinal e leva a direção em três canais
redundantes: a magnitude sem menos, uma seta, e a palavra ("sequestrou" em
verde, "emitiu" em vermelho). O `lib/mapa/carbonFlux.ts` concentra essa regra.
A palavra não é redundância decorativa: vermelho contra verde é o pior par
possível para deuteranopia, e a WCAG 1.4.1 proíbe a cor como único portador de
significado. As duas tintas saem derivadas em `buildFluxInks`, aferidas a 4,5:1
contra o pior fundo dos doze meses nos dois modos, e o `npm run contrast`
quebra o build se alguma cair abaixo disso.

Nas estatísticas dessa camada, "Mínimo" e "Máximo" viram "Menor fluxo" e "Maior
fluxo". Sem o sinal, um mínimo de 45,2 pintado de verde não se lê; e chamá-lo
de "maior sequestro" seria falso sobre uma área que só emite, onde o próprio
mínimo é positivo. O desvio padrão fica neutro, sem cor: é dispersão, não
direção. O CSV exportado mantém o sinal, porque planilha precisa somar
sumidouro contra fonte e a cor não viaja para o Excel; a convenção sai escrita
numa linha de metadado do arquivo.

A paleta do `gfw_netflux` é divergente de nove paradas, não sete, e essa
contagem tem motivo. A faixa calibrada é assimétrica (−100 a 300), então o zero
cai a um quarto do caminho, não no meio. Com paradas distribuídas
uniformemente, nove colocam o neutro `#f7f7f7` exatamente na parada 2 = 25% = o
zero real. Com as sete anteriores, o branco marcava +100 Mg CO2e/ha, isto é,
emissão: a barra dizia "equilíbrio" onde o dado dizia fonte. O mesmo arranjo
serve à legenda, que monta o gradiente CSS com as mesmas paradas uniformes, de
modo que barra e mapa não podem divergir.

O GPP do PML-V2 entra como segunda estimativa independente da mesma variável já
coberta pelo MOD17, e não como camada nova de produtividade. A finalidade é
sustentar, mais à frente, uma leitura do erro possível a partir de várias bases.
Por isso sai contínua e anual, ao contrário do MOD17, que está classificado em
cinco classes de Jenks: para camada classificada a estatística zonal devolve
percentual de pixels por classe, que não se compara com nada. As duas se
aproximam na média sobre o bioma em 2023 e divergem nas caudas, com o PML-V2
chegando a zero em solo exposto e afloramento enquanto o MOD17 mantém um piso
diferente de zero em todo pixel, comportamento que é a limitação registrada no
inventário para o MOD17 em bioma semiárido. A versão é a `v018`, que vai até
27/12/2023; a `v017` que consta do inventário para em 26/12/2020.

A evapotranspiração do mesmo produto ficou de fora de propósito, e a ressalva
está registrada nos TODOs.

As duas camadas do ESA CCI saem do mesmo asset e da mesma banda, diferindo só
no tratamento dos pixels que o produto mascara por não haver vegetação lenhosa.
Como vem do asset, a média responde à pergunta "quanta biomassa há onde existe
lenhosa"; com `unmaskValue: 0` esses pixels entram como zero e a média responde
a "quanta biomassa há por hectare de território". Sobre o retângulo do bioma em
2022 a diferença é grande, 40,86 contra 26,50 Mg/ha na média e 30,63 contra
12,61 na mediana, com cerca de 30% dos pixels mascarados, de modo que declarar
qual das duas leituras está em uso é condição para o número ser comparável a
outra fonte. Como partem do mesmo `id::band`, a flag entra na chave do cache de
tiles em `app/api/gee/tile/route.ts`, sem o que as duas serviriam o mesmo tile.

`node scripts/verify-assets.mjs` confere se a service account lê cada asset
citado no `layers.json` e se os rasters categóricos têm pirâmide de moda (ver a
seção seguinte). Sai com erro quando algum falha.

O carbono do solo da Embrapa, em g/kg, vai de 2,1 a 33,9 sobre a Caatinga, com
mediana 7,3 e p99 14,1. A rampa vai de 2 a 16: com o limite de 50 da
especificação original, quase todo o mapa caía no primeiro quinto das cores. O
índice de degradação ganhou um subtema próprio, `degradacao`, em Uso do solo e
pressões.

### Rasters categóricos e a pirâmide do Earth Engine

O Earth Engine grava a política de pirâmide de cada asset na ingestão, e o padrão
é a média, qualquer que seja o tipo do pixel. Num raster de classes o efeito só
aparece quando a imagem é lida abaixo da resolução nativa, o que acontece com o
tile no zoom afastado e com um `reduceRegion` em escala grossa: a pirâmide tira a
média de códigos vizinhos e produz classes que não existem no dado. Medido no
`Index_Degradacao_v4_2021`, gravado em float com pirâmide de média, eram 6 valores
distintos a 500 m e 2.872 a 2.000 m; a 1.800 m, a escala do bioma inteiro na tela,
a classe 5 ocupava 10,2% da área, contra 0,03% no dado. Num asset inteiro o erro
não se vê, porque a média cai truncada num código que existe.

Arredondar na leitura não resolve, porque a média já aconteceu antes. No
`cobertura_solo_IBGE_2020`, um `.round().int()` ainda deixava entre 4% e 12% do
bioma nas classes 7 e 8, que não têm pixel nenhum na Caatinga. Toda camada
categórica usa, portanto, asset ingerido com `pyramidingPolicy: MODE`. A
degradação aponta para uma cópia reingerida com moda
(`ee-arturlourenco/assets/id_2021_recode_mask_int`), idêntica ao original pixel a
pixel na resolução nativa. A política não vem no `ee.data.getAsset` do cliente;
está no campo `bands[].pyramidingPolicy` da API REST, que é o que o
`verify-assets.mjs` lê.

### Relatório de estoque de carbono

A camada `estoque_carbono` é a única cujo clique abre um relatório em vez da
estatística da banda visível. Ligada ela, clicar numa feição ou desenhar um
polígono devolve o total em t C decomposto em dois eixos, por reservatório e
por fitofisionomia, e os dois têm que somar o mesmo total.

O que aciona isso é o bloco `gee.stocks` na configuração da camada, que declara
quais bandas são reservatórios, qual asset traz o código de fitofisionomia e
qual arquivo de legenda traduz o código em sigla. O padrão é o mesmo de
`gee.temporal` e `gee.classify`: a rota ramifica pela presença do bloco.

O cálculo vive em `lib/mapa/stockReport.ts` e sai numa consulta só, com
`Reducer.sum().repeat(n).group()` sobre uma imagem que empilha os
reservatórios, a área do pixel e a classe. A conta é densidade vezes
`ee.Image.pixelArea()`, que devolve área geodésica no elipsoide; assumir área
constante superestimaria o total em cerca de 0,7% num bioma que atravessa 13
graus de latitude.

Só o id da camada trafega do cliente para o servidor. Aceitar o bloco `stocks`
vindo do cliente abriria exatamente o buraco que a allowlist fecha, porque
`classAsset` poderia apontar para qualquer asset e usar a service account para
lê-lo. O servidor resolve a configuração em `lib/mapa/stocksRegistry.ts` e
recusa com 400 quando o `layerId` não corresponde ao asset enviado.

Os dados vêm do Quarto Inventário Nacional
(`Produtos_12_32_Caatinga_Final_08042020`), rasterizados a 100 m pelos scripts
`scripts/rasterizar_estoques.py` e `scripts/rasterizar_fitofisionomia.py` e
empilhados por `scripts/empilhar_estoques.py`. São dois assets porque o Earth
Engine aplica uma política de pirâmide por asset, e densidade contínua e código
de classe pedem políticas diferentes. A fitofisionomia é o campo `c_pret`, a
cobertura pretérita, com 32 classes codificadas de 1 a 32 por estoque
decrescente no bioma, o que mantém a legenda estável entre reprocessamentos.

A rasterização a 100 m é praticamente não enviesada: o total do bioma dá
4.760,1 MtC contra 4.761,37 MtC do vetor, desvio de 0,03%. A distribuição é
muito assimétrica, com `Ta` sozinha respondendo por 44% do carbono e doze
classes abaixo de 0,1% cada, por isso a rosca agrupa a cauda em "outras".

### Navegação no tempo

Doze das dezoito camadas raster são navegáveis por ano. O que torna uma camada
temporal é o bloco `gee.temporal` no `layers.json`, e o passo é sempre anual: a
camada num dado ano é exatamente o mesmo cálculo que a versão estática fazia,
só com o ano variando. Por isso ligar uma camada abre no ano mais recente, e não
no primeiro, mostrando o mesmo retrato de antes.

São duas formas de série, e a configuração diz qual é. Coleções filtradas por
data agregam o ano com o `reducer` da própria camada, o que faz o CHIRPS somar a
chuva do ano e o NDVI tirar a média das composições de 16 dias. Imagens com o ano
no nome da banda declaram `asset.bandPattern`, como `classification_{ano}` no
MapBiomas e `fire_frequency_1985_{ano}` no Fogo, e aí a data seleciona a banda em
vez de filtrar coleção, o que traz os assets do tipo `image` para o caminho
temporal. Séries com lacuna, como a do ESA CCI, listam as paradas reais em
`dates`, e a rota de série confere no GEE quais anos existem antes de montar,
para não pedir um ano vazio.

Dois pontos que quebram em silêncio se forem esquecidos. O primeiro é a
allowlist: ela casa por `id::band`, e uma camada com `bandPattern` pede banda
diferente a cada ano, então `geeAllowlist.ts` expande o intervalo no
carregamento. Sem isso, navegar bate em 403 na primeira parada que não for o ano
escrito em `asset.band`. O segundo é a unidade: a rota de série monta cada ano
pelo `buildEeImage`, e não por expressão própria, justamente para herdar
`multiplier`, `offset` e as máscaras de `validMin`/`validMax`. Uma implementação
que lesse o valor cru mostraria o LST perto de 15000 no gráfico enquanto o mapa
mostra graus Celsius.

A régua de anos é `components/mapa/overlays/TemporalSlider.tsx`, e as paradas
saem de `lib/mapa/temporal.ts`, compartilhado com o store.

## Busca de territórios

A barra de busca do mapa (`components/mapa/overlays/FloatingSearchBar.tsx`)
varre as propriedades de texto de todos os recortes vetoriais. O problema que
ela precisa resolver não é de desempenho, é de ambiguidade: o rótulo de uma
feição não é único. Dentro do recorte da Caatinga há 34 nomes de município
repetidos — três "Bom Jesus", em PI, RN e PB — e 213 nomes de assentamento.

Daí o `contextField`. O resultado aparece como "Bom Jesus · PI", e a UF também
pode ser digitada. A regra vive em `lib/mapa/searchMatch.ts` e aceita a consulta
quando o rótulo a contém, ou quando a última palavra nomeia a UF (sigla ou nome
por extenso) e o que vem antes está no rótulo: "bom jesus pi" e "bom jesus
piauí" chegam a um resultado só.

Uma palavra sozinha nunca é lida como UF. É essa restrição que impede um "PI"
solto de despejar os 140 municípios do Piauí que o recorte contém — ela casa os
110 nomes que contêm essas letras, Picos e Piripiri entre eles, e mais nada. Ler
a consulta inteira como nome antes de tudo é o que mantém "São Domingos" um
nome, e não um "São" num estado chamado "Domingos". O `contextField` é pulado no
laço de propriedades, senão a própria UF viraria linha de resultado: uma linha
escrita "PE" por município de Pernambuco.

A exceção é a camada Estados, onde a sigla não é contexto de nada — ela é a
feição. `contextIsUnique` deriva isso do próprio arquivo, em vez de declarar por
camada onde poderia divergir do dado: só onde os valores de contexto são um por
feição uma consulta de uma palavra casa o contexto. É o que faz "RN" encontrar
Rio Grande do Norte, cujo nome não contém essas letras. Vale notar que "rn"
devolve dois estados e os dois estão certos — o outro é Pernambuco, por
"Pe[rn]ambuco".

O descritor de cada linha é o `unitName`, o substantivo no singular para uma
feição. É declarado porque o português não tem regra que transforme "Territórios
Quilombolas" em "Território Quilombola". Antes ali aparecia o nome da camada
seguido da chave crua do GeoJSON ("Municípios › name_muni"), que não nomeava nem
uma coisa nem outra e ainda era informação nula: toda camada vetorial tem
exatamente uma propriedade de texto buscável, então o campo era função constante
da camada que já estava à esquerda dele.

O seletor de área do formulário de relatório usa a mesma regra e o mesmo
contexto, de modo que mapa e relatório respondem às mesmas consultas.

## Estatísticas zonais

Dois disparos, mesmo pipeline:

1. Clique em uma feição de recorte territorial. O código encontra a feição e o raster visível abaixo dela, e computa a estatística sobre a geometria da feição.
2. Desenho de um polígono com a ferramenta do mapa. Computa a área (km2) e a mesma estatística do raster visível.

Dois tipos de resultado, conforme a camada:

- Contínua: média, mediana, mínimo, máximo, desvio, contagem. Exibida em grade numérica. Para solo, biomassa, fluxo GFW e fogo.
- Categórica: percentual de pixels por classe, em barras. Para o uso da terra (MapBiomas) e para GPP/NPP (classificados em 5 classes por Jenks).

Os resultados são cacheados por chave `camada:estático:hashDaGeometria`, então reclicar a mesma feição é instantâneo.

## Relatório territorial

A unidade do relatório é fixa: uma feição de um recorte territorial, um ano de
referência, e até 8 das dez variáveis curadas em `config/mapa/reportLayers.ts`.
O formulário que gera esse link vive no mapa (`components/mapa/overlays/ReportForm.tsx`),
mas o documento em si é gerado e servido pela própria rota `/relatorio`, sem
depender do módulo de mapas estar aberto — o link pode ser copiado e colado em
outra aba, ou compartilhado.

O ponto que decidiu boa parte do desenho é que este projeto não tem nada
pré-computado. Seis variáveis significam por volta de doze reduções ao vivo no
Earth Engine (uma para a estatística e, para a maioria delas, outra para a
série anual). Isso não cabe numa única requisição sem estourar timeout do
servidor, ao contrário do projeto irmão que inspirou este (o SAP-frontend),
que lê agregações municipais já calculadas de antemão. A saída foi inverter a
granularidade: o cliente dispara uma requisição por análise (uma por
variável), não uma para o documento inteiro, e cada seção do relatório
resolve, renderiza e pode falhar de forma independente das outras.

O id de feição que entra na URL (`feicao=`) não é o código oficial do
IBGE/FUNAI/INCRA — é o slug do rótulo da feição com um sufixo ordinal, porque o
rótulo não é único (34 municípios homônimos, 213 assentamentos) e os GeoJSONs de
`public/data/vector` não carregam código oficial nenhum. O sufixo é
atribuído pela ordem do arquivo, então regenerar os vetores em outra ordem
(um novo `python scripts/build-recortes.py`, por exemplo) pode migrar o
sufixo de uma feição para outra e invalidar links antigos. O conserto de
verdade é indexar pelo código oficial em vez do slug. O `build-recortes.py` já
preserva `code_muni` e `abbrev_state`, então o que falta é o registro passar a
lê-los; fica em TODOs, junto com a ausência de um código estável para
`assentamentos`.

Os ids do recorte `estados` mudaram uma vez, quando o rótulo da camada passou de
`abbrev_state` para `name_state` para que "Pernambuco" fosse encontrável na
busca: `feicao=pb` virou `feicao=paraiba`. Foi uma quebra deliberada, restrita
aos dez estados.

O relatório mora em `app/(relatorio)/`, o quarto layout raiz do repositório.
Não dá para reaproveitar o layout de `(mapa)`: `mapa.css` zera o scroll do
`body` e fixa a altura na viewport para o MapLibre, e o relatório é um
documento longo, feito para rolar e para imprimir. Por ser um layout raiz
irmão, o link que o formulário do mapa abre cruza fronteira de grupo de rotas
e por isso é `window.open`, nunca `next/link` — um carregamento de página
inteiro, não uma navegação client-side.

O documento não usa o acento mensal do resto da plataforma. A cor do mês muda
o ano inteiro (é a cor do NDFI mediano daquele mês na série de 40 anos), então
o mesmo relatório gerado em janeiro e em julho, com a mesma feição e o mesmo
ano de referência, viraria dois documentos visualmente diferentes por um
acidente de quando alguém clicou em "Gerar relatório" — nada que tenha a ver
com o conteúdo analisado. O relatório usa uma paleta fixa por seção
(`sectionColor` em `reportLayers.ts`), independente do mês.

Nem toda variável curada ganha gráfico de série: `estoque_carbono` e
`gfw_netflux` são estáticas (a primeira não tem `gee.temporal`; a segunda é
cumulativa numa banda só), então a seção delas mostra só o retrato do ano
pedido. `lulc_mapbiomas` tem série de anos, mas declara `seriesKind: 'none'`
de propósito: a média zonal dos códigos de classe do MapBiomas não é uma
grandeza — a média entre a classe 3 e a classe 15 dá 9, que é uma terceira
classe sem sentido nenhum. Uma série de participação por classe seria a
resposta certa ali, e fica como TODO.

Quando a série existe, ela roda numa escala mais grosseira que o retrato do
ano: `seriesScale` em `reportLayers.ts` é um piso, nunca um valor fixo — a
escala efetiva é `max(seriesScale ?? 0, asset.scale ?? 500)`, então só pode
engrossar o pixel, nunca afiná-lo. Isso existe porque quarenta paradas
reduzidas em resolução nativa sobre um recorte grande (um estado inteiro, por
exemplo) não retornam a tempo. Perder a série por timeout ou por
indisponibilidade não derruba a seção inteira: o retrato do ano pedido já
veio numa chamada separada, e a seção aparece sem o gráfico em vez de não
aparecer.

## Rotas de API

As rotas de GEE (`/api/gee/*`) são todas `POST`, runtime Node, `force-dynamic`, e autenticam via `initGee()` (`lib/mapa/geeAuth.ts`); as três rotas do relatório (`/api/mapa/relatorio/{base,analise,feicoes}`) são `GET`, pelos motivos documentados em `app/api/mapa/relatorio/base/route.ts`. Ficam em `app/api/`, fora dos dois grupos de rotas, então não herdam layout nenhum.

Segurança: as rotas têm allowlist de assets (só os de `layers.json`), rate limiting por IP, teto de `numClasses`, validação de geometria/`lon`/`lat`/`visParams`, timeout nas chamadas GEE e mensagens de erro genéricas (não vazam o caminho das credenciais).

- `POST /api/gee/tile`: recebe `{ asset, clipId, visParams, classify }` e devolve `{ tileUrl }` (e `breaks` no modo Jenks). O servidor resolve o recorte localmente pelo `clipId` e cacheia o `tileUrl` (TTL 90 min).
- `POST /api/gee/stats`: recebe `{ asset, geometry, colorType, classify, breaks }` e devolve `{ kind: "categorical", counts }` ou `{ kind: "continuous", stats }`. Os `breaks` do bioma (vindos do tile) mantêm as classes do gráfico iguais às cores do mapa.
- `POST /api/gee/point` e `POST /api/gee/timeseries`: valor pontual e série anual. A série monta um ano por banda com o mesmo `buildEeImage` que serve o tile, e lê todas num `reduceRegion` só, de modo que o gráfico e o mapa saem na mesma unidade e com a mesma máscara.

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

- `node scripts/verify-assets.mjs`: autentica no GEE e confere cada asset citado no `layers.json`, avisando quando um raster categórico não tem pirâmide de moda; em seguida imprime as bandas de uma lista de candidatos. Sai com erro se algum asset em uso falhar.
- `node scripts/list-assets.mjs`: lista os filhos de um diretório de assets, para achar caminhos exatos.
- `npm run breaks`: calcula os breaks de Jenks sobre o bioma e grava em `config/mapa/layers.json`.
- `npm run clip`: gera as versões simplificadas das bordas usadas como recorte.
- `npm run prewarm`: aquece o cache de tile do servidor (rodar com o servidor no ar).
- `npm run trim`: arredonda as coordenadas dos GeoJSON para 5 casas decimais (~1,1 m, abaixo de um pixel em qualquer zoom do mapa). Não remove vértice nenhum, então o traço na tela não muda; o recorte do bioma caiu de 736 KB para 610 KB comprimido.
- `npm run contentful:provision`: imprime o modelo de conteúdo da landing e, com `CONTENTFUL_MANAGEMENT_TOKEN` no ambiente, compara com o space. Com `-- --apply` cria ou atualiza os três content types e os publica.
- `npm run contrast`: confere o contraste WCAG dos acentos gerados para os 12 meses nos 2 modos, e sai com erro se algum par ficar abaixo de 4,5:1.
- `python scripts/build-recortes.py`: baixa os recortes (IBGE, FUNAI, INCRA via geobr), recorta ao bioma com geopandas, simplifica e grava em `public/data/vector`. Preserva `abbrev_state` e `code_muni` quando a fonte os traz. Requer `pip install geobr geopandas`.
- `python scripts/enrich-uf.py`: grava a UF de cada feição dos recortes (`abbrev_state`) e o nome por extenso dos estados (`name_state`). Deriva a UF da geometria já em disco — cada feição vota com uma grade de pontos interiores contra `estados.geojson`, medindo área e não contorno, porque um vértice de feição de divisa É o contorno do estado, onde o ray cast é cara-ou-coroa. Para municípios a lista oficial do IBGE arbitra: nome registrado num único estado leva aquele estado, e nome que ela não conhece aborta a execução, porque UF errada é pior que UF nenhuma. Oito feições atravessam divisa de verdade e ficam como `PE/PB`; a busca aceita qualquer um dos lados. Só biblioteca padrão, mas precisa de rede. Idempotente: rodar de novo não muda os arquivos já enriquecidos.

## Deploy

Um Web Service Node no Render serve o site inteiro, marketing e módulo de mapas. Não dá mais para usar o Static Site gratuito: as rotas `/api/gee/*` rodam no servidor, e por isso `output: 'export'` e `trailingSlash` saíram do `next.config.ts`.

1. `render.yaml` já traz `runtime: node`, `buildCommand: npm ci && npm run build` e `startCommand: npm run start`.
2. No painel do serviço, Environment -> Secret Files: subir o JSON da service account com o nome `gee-service-account.json`. O Render monta em `/etc/secrets/`, caminho apontado por `GOOGLE_APPLICATION_CREDENTIALS` no `render.yaml`.
3. `NEXT_PUBLIC_MAPA_URL` não precisa ser definida: sem ela, `MAPA_URL` resolve para a rota interna `/mapa`.
4. `NEXT_PUBLIC_CARTO_KEY` precisa existir no momento do build, e não em tempo de execução. Sem ela os mapas base da CARTO chegam com a marca d'água "API KEY REQUIRED", exigida pelo provedor desde agosto de 2026. Ver a seção Mapas base (CARTO) do [`README.md`](README.md).

O GEE: a service account precisa estar registrada no Earth Engine e com a Earth Engine API habilitada no projeto GCP. Os assets sat-io e mapbiomas-public são públicos.

## TODOs

Camadas e dados:

- Assentamentos e municípios são pesados (1923 e 1210 feições). Se o desenho ficar lento, converter para PMTiles (o código de PMTiles do MapView já existe).
- O inventário `../Inventario_Camadas_Carbono_GEE_Caatinga.md` traz o caminho errado para a ESA CCI Biomass. O asset correto, já em uso nas duas camadas `biomassa_esa_*`, é `projects/sat-io/open-datasets/ESA/ESA_CCI_AGB`. Corrigir no inventário.
- A evapotranspiração do PML-V2 não fecha balanço hídrico sobre a Caatinga e por isso não entrou. Medido sobre o limite do bioma, a média de 18 anos (2003-2020) de `Ec+Es+Ei` dá 815 mm/ano contra 688 mm/ano de precipitação do CHIRPS, excesso de 18% sustentado em escala de bioma, com a transpiração isolada (`Ec`, 538 mm/ano) consumindo 78% da chuva num bioma caducifólio. Falta confrontar com a literatura se há superestimativa conhecida do PML-V2 em semiárido. Se for incluída, a ressalva tem que estar na ficha da camada.
- A ET total exigiria somar as bandas `Ec`, `Es` e `Ei`, aritmética entre bandas que o servidor ainda não faz. É o mesmo obstáculo do AGB mais BGB do Spawn e Gibbs, então uma implementação resolve os dois. A transpiração `Ec` sozinha é banda única e sairia sem código novo.
- A ESA CCI agora vai de 2007 a 2022. A coleção tem lacuna (só 2007, 2010 e 2015 em diante), declarada em `gee.temporal.dates`.
- A altura do dossel do Meta e WRI tem 1 m de resolução nativa, mas a estatística zonal roda a 30 m, para ficar comparável às demais camadas de 30 m e não estourar o tempo em municípios grandes. A média sobre o bioma praticamente não muda com isso; quem precisar do detalhe de árvore isolada deve baixar o dado direto.
- Spawn e Gibbs usa só a banda `agb`. A soma AGB mais BGB exige uma pequena edição no servidor (`lib/mapa/geeImage.ts` ou na rota) para somar bandas.
- Fogo: a camada mostra `min: 0`, então áreas nunca queimadas aparecem na cor mais clara. Para mostrar só o que queimou, mascarar o valor 0 (edição no servidor).
- Camadas do inventário ainda não incluídas: ERA5 e TerraClimate no bloco de clima e água, fenologia por Sentinel-2, gases e fluorescência (TROPOMI, SIF) e integridade de projetos. Ficam para fases seguintes. CHIRPS, NDVI e EVI, que constavam aqui, já estão na plataforma.
- O passo temporal é anual e só anual. Séries mensais e sazonais (composições de 8 ou 16 dias, CHIRPS diário) são agregadas ao ano pelo redutor da camada. Se a fenologia intra-anual virar escopo, o contrato precisa de um campo de granularidade e o gerador de paradas em `lib/mapa/temporal.ts` precisa saber gerar meses.
- Seis camadas seguem estáticas por não terem série: `biomassa_gedi`, `altura_dossel`, `biomassa_spawn` e as três do GFW. As do GFW são cumulativas numa banda só e as demais são imagem única.
- Dar um código estável para `assentamentos` e passar a identidade de feição do relatório a usar o código oficial em vez do sufixo ordinal do slug. O `build-recortes.py` já preserva `code_muni`/`abbrev_state`, então falta o `recorteRegistry.ts` indexar por eles — e migrar ou redirecionar os ids atuais.
- Uma série de participação por classe para `lulc_mapbiomas`, que custaria uma redução agrupada por ano.
- Medir a série zonal sobre um estado inteiro com as quarenta paradas. Se a escala-piso somada ao `bestEffort` não bastar, a série vira um artefato cacheado à parte em vez de fazer parte da chamada de análise.

Interface:

- Os banners dos acordeões são gradientes simples gerados. Trocar por arte definitiva se quiser.
- Reordenar camadas usa arrastar-e-soltar (HTML5), que funciona no desktop mas não em telas de toque. Adicionar botões subir/descer se o mobile virar alvo.
- O header do módulo traz "Dados" e "Metodologia" como rótulos inertes. Ligar às seções correspondentes da landing (`/#mapa`, `/#frentes`) ou remover.

Notas de ambiente:

- Nesta máquina o preview do Chrome reporta viewport 0x0 e não tira captura de tela; a verificação foi feita por leitura do DOM e das requisições de rede.

## Revisão técnica

Uma revisão de código completa (segurança, bugs, desempenho, UI, código morto) está em [`REVISAO_TECNICA.md`](REVISAO_TECNICA.md), com os itens P0-P3 já implementados e verificados e a limpeza P4 aplicada (plataformas herdadas, caminho TiTiler, código morto e dependências não usadas removidos). Os caminhos citados lá são os anteriores à mesclagem (`lib/`, `config/`, `components/`); hoje leia-os como `lib/mapa/`, `config/mapa/` e `components/mapa/`.
