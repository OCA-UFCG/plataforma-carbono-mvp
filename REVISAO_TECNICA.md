# Revisão técnica da plataforma, Caativar

Revisão de código completa da Fase 1 (MVP). Cobre segurança, bugs de correção, desempenho, funcionamento, interface/design, código morto e documentação. Foram 61 achados confirmados por verificação dupla (um revisor propõe, um verificador adversarial tenta refutar lendo o código). Itens já listados como TODO/fora de escopo na `DOCUMENTACAO.md` (camadas temporais, deploy Render, PMTiles, seletor de plataformas herdado, banners definitivos) não entram, salvo quando há um problema adicional não descrito lá.

O typecheck (`tsc --noEmit`) passa sem erros, nenhum dos achados abaixo é erro de tipo; são de lógica, arquitetura, desempenho ou UX.

Prioridades sugeridas:

- **P0, antes de expor a plataforma publicamente.** Segurança das rotas GEE.
- **P1, corrigir na Fase 1.** Bugs que produzem números errados ou deixam o usuário sem feedback.
- **P2, desempenho e velocidade.**
- **P3, interface, design e acessibilidade.**
- **P4, limpeza de código morto, config e documentação.**

---

## Carregamento de camadas GEE, ~50-88 s -> ~2 s (2026-07-06)

Diagnóstico a partir da comparação com um app Flask/Leaflet mais rápido. O carregamento de uma camada raster levava 50-88 s. Isolando o custo, descobrimos **dois gargalos**, ambos no `getMap` da rota `tile`:

1. **Recorte à borda detalhada (dominante):** clipar ao `limite_caatinga.geojson` (~108 mil vértices) fazia o GEE processar a geometria inteira a cada `getMap`. Medição: GEDI **com** clip = 51,6 s; **sem** clip = 0,83 s; clipado a um polígono de 6 vértices = 2,0 s. -> **Solução:** `scripts/simplify-clip.mjs` (`npm run clip`) gera uma borda grosseira offline (2,5 MB -> 75 KB), e o `clipRegistry` usa o `*_clip.geojson` quando existe. A rota também simplifica menos (100 -> 500 m).
2. **Amostragem do Jenks ao vivo (GPP/NPP):** `sample(5000)` + `evaluate` antes do `getMap` custava ~26 s. -> **Solução:** `scripts/compute-breaks.mjs` (`npm run breaks`) calcula os breaks uma vez sobre o bioma e grava em `gee.classify.breaks` no `layers.json`; a rota usa esses breaks e pula a amostragem (com fallback ao vivo quando ausentes, para experimentar nº de classes).
3. **Pré-aquecer o cache:** `scripts/prewarm.mjs` (`npm run prewarm`) dispara todas as camadas uma vez após o start, para o primeiro usuário também pegar tudo do cache (D5).

**Resultado medido (`next start`):** as 10 camadas carregam em 1,6-2,5 s a frio e 0,0-0,1 s do cache. **Fase 2 (quando puder subir assets no GEE):** referenciar a borda como asset nativo e computar estatística por `{ nível, código }` filtrando o asset, geometria só no desenho.

---

## P0, Segurança (bloqueia deploy público), IMPLEMENTADO E VERIFICADO (2026-07-06)

As quatro rotas `/api/gee/*` autenticam com a service account e não têm nenhuma barreira. Hoje só rodam com segurança em `localhost`; expostas na internet (o M7 prevê publicar no Render), viram um backend GEE gratuito e derrubável por terceiros.

> **Status:** todo o bloco S1-S9 foi corrigido e testado contra o servidor de produção (`next build` + `next start`). Módulos novos: `lib/geeAllowlist.ts` (allowlist de assets a partir de `layers.json`) e `lib/rateLimit.ts` (rate limiter em memória, 60 req/min por IP). Validadores novos em `lib/geeValidation.ts`; timeout em `lib/geeEvaluate.ts` (`withTimeout` + `ee.data.setDeadline(60s)` em `geeAuth.ts`); mensagens de erro genéricas nas quatro rotas. Verificação: asset arbitrário -> 403, `numClasses=9999` -> 400, geometria/visParams/clipGeometry inválidos -> 400, `lon/lat` fora de faixa/`Infinity` -> 400, `dateRange` invertido -> 400, >60 req/min -> 429 com `Retry-After`; requisição válida segue retornando 200 sem vazar o caminho das credenciais. Typecheck e lint limpos.

### S1. A API aceita qualquer asset do GEE, proxy aberto da service account `[alta]`
`lib/geeValidation.ts:8`, `isValidAsset` só exige `type ∈ {image, imageCollection}` e `id` string não vazia; `band`, `reducer`, `scale`, `filterDate` nem são validados. As rotas repassam o `asset` direto ao Earth Engine autenticado. Qualquer um que descubra a URL pode `POST { asset: { type:'image', id:'qualquer/asset' } }` e usar a cota e as permissões da service account para renderizar tiles e computar estatísticas de **qualquer** asset, inclusive privados aos quais a conta tenha acesso.
**Correção:** allowlist derivada de `config/layers.json` (aceitar só `asset.id`/`band`/`scale` que casem com uma camada configurada), ou o cliente envia apenas `layerId` e o servidor resolve o asset internamente.

### S2. `numClasses` do Jenks sem teto, DoS que congela ou mata o servidor `[alta]`
`app/api/gee/tile/route.ts:102` e `stats/route.ts:78` só exigem `numClasses >= 2`. O `sample` retorna até 5000 pixels, então `numClasses=4999` passa o único freio (`values.length < numClasses`) e executa `jenksBreaks`, algoritmo O(n²*k) **síncrono** que aloca duas matrizes `Float64` `(n+1)×(k+1)` ≈ 400 MB e faz ~6×10¹⁰ iterações, bloqueando o event loop do Node por minutos (ou OOM). Um único POST com polígono válido e `numClasses` alto derruba o serviço para todos.
**Correção:** validar `Number.isInteger(numClasses) && numClasses >= 2 && numClasses <= 10` **antes** de qualquer computação, nas duas rotas.

### S3. Nenhum rate limiting nem autenticação `[alta]`
Não existe `middleware.ts` nem verificação de origem/token/taxa. Cada POST em `/stats` dispara `reduceRegion` com `maxPixels: 1e9` e sete reducers; `/tile` dispara `sample` de 5000 pixels + `getMap`. Um script em loop esgota a cota da service account (compartilhada com o great-panini) e derruba o serviço.
**Correção:** rate limiting por IP (token bucket em memória, suficiente para instância única no Render) e checagem de mesma-origem antes de despachar trabalho ao GEE.

### S4. Validação de geometria só checa `type`; payload e vértices ilimitados `[média]`
`app/api/gee/stats/route.ts:26`, `isValidGeometry` aceita `{ type:'Polygon' }` sem `coordinates`, com `coordinates` não-array ou milhões de vértices; tudo passa e só explode dentro do `ee.Geometry` (500 em vez de 400). Na rota `tile` é pior: `clipGeometry` aceita **qualquer** objeto (`typeof === 'object'`). Route Handlers não têm limite de body por padrão, então um MultiPolygon de dezenas de MB é lido inteiro na memória.
**Correção:** validar `coordinates` como array aninhado de números, impor teto de vértices (ex.: 100 mil) e rejeitar bodies acima de um tamanho máximo (`content-length`) antes de tocar o GEE.

### S5. Resposta 500 vaza o caminho do arquivo de credenciais `[média]`
`lib/geeAuth.ts:36` interpola `GOOGLE_APPLICATION_CREDENTIALS` na mensagem de erro (o nome do arquivo contém o ID do projeto GCP), e as quatro rotas devolvem essa string ao cliente com status 500. Os catches finais também devolvem `err.message` do GEE verbatim, erros de permissão do GEE costumam incluir o e-mail da service account e o ID do projeto.
**Correção:** devolver mensagens genéricas ao cliente ("Erro ao processar no Earth Engine") e manter o detalhe só no `console.error` do servidor.

### S6. Chamadas ao GEE sem timeout, requisição pendurada indefinidamente `[média]`
`lib/geeEvaluate.ts:13` e `promisifyGetMap` (`tile/route.ts:33`) envolvem callbacks do GEE em Promises sem deadline. `ee.data.setDeadline` nunca é chamado, não há `Promise.race`. Um `reduceRegion` pesado ou instabilidade do GEE deixa a conexão HTTP aberta para sempre, segurando workers no Render e o spinner girando no cliente.
**Correção:** `ee.data.setDeadline(60000)` após `initGee()`, ou `Promise.race` com timeout que devolve 504.

### S7. Rota `/api/gee/timeseries` exposta sem validação de intervalo `[média]`
`app/api/gee/timeseries/route.ts:44`, a rota está publicamente acessível mesmo dormente. A checagem só valida `Array.isArray && length===2`; os elementos podem ser datas inválidas ou `['0001-01-01','9999-12-31']`, que vão direto para `filterDate` + `getRegion` sobre a coleção inteira, com `scale` também controlado pelo cliente. Dispara computações enormes por uma rota que nenhuma parte da UI usa.
**Correção:** enquanto a fase temporal não chega, devolver 404/501 (ou remover do build). Ao ativar, validar as datas ISO, exigir `start < end` e impor intervalo máximo.

### S8. `lon`/`lat` aceitam `NaN`/`Infinity` `[baixa]`
`point/route.ts:28` e `timeseries/route.ts:41` usam só `typeof === 'number'`, então `"lon": 1e999` (que o JSON vira `Infinity`) passa, sem checagem de faixa. Valores inválidos chegam a `ee.Geometry.Point` e voltam como 500. O padrão correto com `Number.isFinite` já existe em `lib/geeValidation.ts:28` (`isValidBbox`).
**Correção:** `Number.isFinite` + validar faixas geográficas, devolvendo 400.

### S9. `visParams` sem validação em runtime `[baixa]`
`app/api/gee/tile/route.ts:167`, `visParams` só é tipado, não checado. `{ palette: [42] }` faz `c.replace` lançar `TypeError`, capturado como 500. `min`/`max` também não são verificados como finitos.
**Correção:** validar `palette` como array de hex (`/^#?[0-9a-fA-F]{6}$/`) e `min`/`max` com `Number.isFinite`, devolvendo 400.

---

## P1, Bugs de correção e funcionamento, IMPLEMENTADO (2026-07-06)

> **Status:** B1-B14 corrigidos. Typecheck, lint e build de produção limpos. As mudanças de servidor foram testadas em execução (`next start`): stats contínuo sem "Moda" (B11); tile GPP com máscara de fill + Jenks retorna `breaks` (B4); e a **consistência de Jenks (B2) foi comprovada**, a mesma feição, com os breaks do bioma, dá distribuição `{1:370,2:3540,3:7796,4:688,5:2}` (igual ao mapa), enquanto sem os breaks a reamostragem por feição dava `{1:463,2:2169,3:4241,4:3979,5:1543}` com cortes diferentes. As mudanças de interação (B1 geometria completa, B3 loading/erro, B5 valor pontual, B7 race, B8 selectedGeomRef, B9 reorder, B10 stats obsoletos, B12 drawMode, B13 basemap, B14 busca) passaram por typecheck/lint/build; **faltam um teste de clique manual no navegador** (o `next dev` é instável nesta máquina). Módulos novos: `lib/resolvePixelValue.ts`; campos novos no store (`jenksBreaks`, `statsLoading`, `statsError`, `analysisLabel`) e no asset (`validMin`/`validMax`/`scaleFactor`).

### B1. Clique em feição usa geometria recortada aos tiles, área e estatística parciais `[alta]`
`components/MapView.tsx:781`, o clique pega a feição de `map.queryRenderedFeatures` (L629), cuja geometria o MapLibre **recorta às fronteiras dos tiles**. Esse `geom` vai direto para `turfArea` (área em km²) e para `getRasterStats` (região de redução no GEE). Ao clicar num estado ou município grande com zoom baixo, a feição ocupa vários tiles e só o fragmento sob o ponto clicado é retornado, a área exibida e a estatística zonal saem calculadas **sobre um pedaço da feição, não sobre ela inteira**. O GEE recorta ao polígono enviado, então não recompõe o que falta. A `DOCUMENTACAO.md:117` promete cálculo "sobre a geometria da feição" (completa).
**Correção:** não usar a geometria de `queryRenderedFeatures` para cálculo. Para as camadas GeoJSON (todas as atuais), localizar a feição completa pelo `feature.id`/`promoteId` no GeoJSON de origem e usar essa geometria em `turfArea` e `getRasterStats`.

### B2. Classes do gráfico (por feição) divergem das cores/legenda do mapa (bioma inteiro) em GPP/NPP `[alta]`
`app/api/gee/stats/route.ts:81`, os breaks de Jenks são recalculados em dois lugares sobre regiões diferentes. O tile (cor do mapa e legenda) amostra o **bioma inteiro** (`tile/route.ts`), mas a estatística categórica amostra **só a geometria clicada** e refaz `jenksBreaks` sobre ela. Como os cortes diferem, um pixel pintado como classe 5 ("Muito alto") no mapa pode ser contado como classe 2 no gráfico "Pixels por classe". Os percentuais não correspondem às cores nem à legenda.
**Correção:** calcular os breaks uma única vez (sobre a região que pinta o tile, o bioma) e reutilizá-los na estatística zonal, em vez de reclassificar por feição.

### B3. Falha de estatística é silenciosa e não há indicador de carregamento `[alta]`
`components/MapView.tsx:831` (e L524-534, L884, L1163, L1198), ao clicar numa feição ou desenhar, a estatística do GEE leva vários segundos, mas nenhum caminho seta `loadingLayers`, então o `SkeletonChart` (que só aparece com `loadingLayers[id]`) nunca surge para stats. O usuário clica num município, vê só "Área" e nada mais acontece. Se a chamada falhar (rede, GEE fora, 422 "sem pixels"), o `catch` só faz `console.error`, o painel fica mudo, sem mensagem.
**Correção:** setar um flag `statsLoading` antes do fetch (ativa o skeleton) e, no `catch`, gravar uma mensagem pt-BR num estado de erro exibido no `ResultsSidebar`, distinguindo "sem pixels válidos" de erro de servidor.

### B4. Valores de preenchimento do MODIS não são mascarados antes de `mean()`/Jenks `[média]`
`lib/geeImage.ts:44`, `buildEeImage` reduz a coleção com `.mean()` sem máscara. As bandas `Gpp`/`Npp` usam valores de preenchimento 32761-32767 (água, nuvem, nodata) que o GEE **não mascara** sozinho. Esses valores gigantes entram na média e na amostra do Jenks, dominando os cortes, corpos d'água podem virar "Muito alto", corrompendo classes e percentuais de `gpp_modis` e `npp_modis`.
**Correção:** mascarar a faixa inválida antes de reduzir/classificar (ex.: `img.updateMask(img.gte(0).and(img.lt(32761)))` para GPP), idealmente parametrizando `validRange` no asset em `layers.json`.

### B5. Fator de escala 0,0001 do MODIS não aplicado, valor pontual de GPP/NPP mostra DN cru `[média]`
`components/MapView.tsx:876` (e L576, L1188), as bandas `Gpp`/`Npp` são inteiros com fator 0,0001 (valor físico = DN × 0,0001). `/api/gee/point` devolve o pixel cru; o código faz `Math.trunc(raw)` e procura `raster.classes` (valores 1-5). Como o DN cru é da ordem de centenas, nunca casa com 1-5: o painel "Valor do pixel" mostra um número cru sem rótulo (ex.: "823"), fisicamente errado (~10000× fora da unidade) e incoerente com a coloração Jenks do mapa.
**Correção:** aplicar o `scaleFactor` do asset ao valor pontual e, para camadas Jenks, exibir a classe reclassificando o valor pelos breaks, não tentar casar o DN cru com 1-5.

### B6. Unidade da NPP errada: `MOD17A3HGF` é produto anual, rotulado como `/8day` `[média]`
`config/layers.json:207`, `npp_modis` usa `MODIS/061/MOD17A3HGF` (NPP **anual**, sufixo A3) mas declara `unit: "kg*C/m²/8day"`, idêntica à do GPP (`MOD17A2HGF`, este sim de 8 dias). A `DOCUMENTACAO.md:102` replica o erro.
**Correção:** trocar para `"kg C/m²/ano"` em `layers.json` e na tabela da doc.

### B7. Respostas assíncronas de estatística sobrescrevem umas às outras (race condition) `[média]`
`components/MapView.tsx:830` (e L883, L1162, L1197), o handler `map.on('click', async...)` não é serializado; cliques rápidos deixam fetches concorrentes em voo e cada um faz `setRasterStats(stats)` incondicional. Se o clique A (lento) resolver depois do B, as stats de A sobrescrevem as de B enquanto a feição destacada é B, a sidebar mostra números de A para a feição B. O `statsCache` protege o cache, não o estado visível.
**Correção:** token de sequência (`const seq = ++clickSeqRef.current`) capturado no início e conferido após cada `await` antes de escrever o estado; ou `AbortController` por clique.

### B8. `selectedGeomRef` nunca é limpo ao desenhar ou buscar, feição antiga ressuscita `[média]`
`components/MapView.tsx:493`, `handleDrawCommit` e `selectFeatureFromSearch` não limpam `selectedGeomRef` (só o realce visual). Cenário: clica na feição A -> desenha o polígono B -> troca a camada raster visível; o efeito reativo (L1119-1203) lê `selectedGeomRef=A` obsoleto e recomputa as stats de A, sobrescrevendo o resultado do desenho B, que continua visível no mapa.
**Correção:** `selectedGeomRef.current = null` em `handleDrawCommit` (ao iniciar o desenho) e em `selectFeatureFromSearch`, como já se faz no clique em mapa vazio (L768).

### B9. Reordenação de camadas tem off-by-one ao arrastar para baixo `[média]`
`lib/store.ts:140`, `reorderLayer` faz `splice(fromIndex,1)` antes de `splice(toIndex,0,moved)` sem ajustar `toIndex`. Arrastando A (idx 0) sobre C (idx 2): o indicador (`borderTop`) sugere "A acima de C" = `[B,A,C,D]`, mas o resultado é `[B,C,A,D]`, cai uma posição além do indicado. Vale para qualquer arraste para baixo.
**Correção:** `const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex` antes do `splice` de inserção.

### B10. Ao trocar de raster, as stats da camada anterior ficam visíveis durante o novo cálculo `[média]`
`components/MapView.tsx:1151`, no recompute reativo de polígono, `getRasterStats` é chamado sem limpar `rasterStats` antes (o caminho de ponto limpa, L1186; o de polígono não). Trocar de "Carbono do Solo" para "Biomassa GEDI" com feição selecionada mostra, por segundos, os números do solo como se fossem da biomassa. O cartão usa o título genérico "Estatísticas do raster" (`StatsChart.tsx:336`), sem nomear camada nem feição, o usuário não percebe a defasagem.
**Correção:** `setRasterStats(null)` no início do recompute de polígono (mostra o skeleton) e exibir no cartão o nome da camada e da feição analisada.

### B11. "Moda" exibida para rasters contínuos, fora da spec e sem sentido para float `[baixa]`
`components/StatsChart.tsx:279` e `stats/route.ts:161`, a `DOCUMENTACAO.md:122` define a saída contínua como média, mediana, mín, máx, desvio e contagem, sem moda. Para dados float (solo, GEDI, GFW) a moda é quase sem significado (cada valor é único) e ainda custa um reducer extra.
**Correção:** remover a moda do `combine` e do grid; alinhar com a doc.

### B12. `drawMode` do store fica dessincronizado após concluir uma forma `[baixa]`
`components/MapView.tsx:589`, `handleDrawCommit` nunca chama `setDrawMode(null)`. Ao terminar o desenho, o mapbox-gl-draw volta a `simple_select` internamente, mas o store mantém `drawMode` não-nulo, então o `FloatingDrawToolbar` continua destacando a ferramenta como ativa quando ela já não está.
**Correção:** listener `map.on('draw.modechange', ...)` que chama `setDrawMode(null)` ao voltar a `simple_select`, ou `setDrawMode(null)` ao fim de `handleDrawCommit` (definir `drawMode=null` não reexecuta `deleteAll`, então o desenho é preservado).

### B13. Auto-pareamento do basemap com dark mode reverte a escolha do usuário `[baixa]`
`components/MapView.tsx:1310`, o efeito depende de `basemapId` e roda a cada troca de basemap, sem distinguir escolha explícita de incompatibilidade. Efeitos: (1) quem está no escuro com `carto-dark` e desliga o dark mode tem o basemap forçado de volta a `carto-positron`; (2) pior, no modo claro, clicar em `carto-dark` no seletor é revertido no render seguinte, `carto-dark` fica **inselecionável** no claro (opção morta).
**Correção:** fazer o efeito depender só de `[darkMode]`, lendo `basemapId` via `getState()` dentro dele, para que o pareamento só ocorra no toggle de tema.

### B14. Busca mostra "Nenhum resultado encontrado" enquanto os GeoJSON ainda carregam `[média]`
`components/overlays/FloatingSearchBar.tsx:353`, o cache-warming busca os GeoJSON sem estado de loading; o efeito de busca faz `if (!cached) continue`, então digitar dentro da janela de download deixa `results` vazio e a UI mostra "Nenhum resultado encontrado" (falso negativo) em vez de "Carregando...". Também não avisa que a busca só cobre **camadas visíveis**.
**Correção:** rastrear um estado de loading do cache e mostrar "Carregando dados..." enquanto houver camada visível sem cache; adicionar nota de que a busca cobre só camadas visíveis.

---

## P2, Desempenho e velocidade, IMPLEMENTADO (2026-07-06, exceto D11 -> movido para o P3)

> **Status:** D1-D10 feitos; D11 (fonte via `next/font`) foi agrupado com o U8 do P3 (mesmas strings de fonte). Build/typecheck/lint limpos. Testado em `next start`: **D5, cache de tile no servidor** deu o maior ganho: 1ª requisição do tile de GPP (sample+Jenks+getMap) = 74 s, 2ª idêntica = 0,034 s (~2172× mais rápido, mesma resposta); **D1, `clipId`** elimina o upload de 2,5 MB (servidor lê o recorte local via `lib/clipRegistry.ts`, `clipId` inexistente -> 400); **D4, `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`** confirmado nos GeoJSON. Client (build-verificado, falta olhar no navegador): D2 vetores carregam sob demanda (só o bioma no load), D3 busca só aquece o cache ao abrir, D6 dedup de requisições em voo (`getRasterStats`), D7 z-order só quando a ordem muda, D8 hover com uma consulta só + throttle rAF, D9 `CursorCoordinates` com throttle rAF, D10 Recharts fora do bundle inicial (`next/dynamic`). Módulos novos: `lib/clipRegistry.ts`, `lib/tileCache.ts`.

### D1. Geometria de recorte de ~2,5 MB enviada no POST a cada ativação de camada `[alta]`
`lib/store.ts:235`, o `FeatureCollection` do bioma (`limite_caatinga.geojson`, 2,52 MB, o strip de properties quase não reduz, pois é 1 feição e o peso está nas coordenadas) é serializado e enviado como `clipGeometry` no POST `/api/gee/tile`. As 10 camadas raster têm `clipToLayerId: "bioma"`, então cada primeira ativação custa ~2,5 MB de upload (~4 s em 5 Mbps antes de o GEE começar). O servidor ainda refaz `fc.geometry().simplify(100)` a cada request.
**Correção:** enviar só um `clipId: "bioma"` e a rota lê o GeoJSON local e cacheia a geometria simplificada em memória; ou simplificar no cliente uma vez antes de guardar em `vectorGeometries`.

### D2. Todos os 6 GeoJSON (~4,85 MB) baixados no load inicial, mesmo com 5 camadas invisíveis `[média]`
`components/MapView.tsx:176`, o efeito de sync chama `addLayerToMap` para **todas** as camadas sem checar `visible`, e `addSource({ data: l.url })` faz o MapLibre baixar e indexar o GeoJSON na hora. No load, o navegador baixa bioma (2,52 MB) + municípios (1,15 MB) + assentamentos (784 KB) + estados + quilombolas + terras indígenas ≈ 4,85 MB, competindo com os tiles do basemap, sendo que só o bioma está visível.
**Correção:** adiar `addSource`/`addLayer` de camadas vetoriais até a primeira vez que `visible === true` (mesmo padrão lazy das camadas GEE).

### D3. `FloatingSearchBar` re-baixa o GeoJSON que o MapLibre já baixou `[média]`
`components/overlays/FloatingSearchBar.tsx:94`, o cache-warming roda no mount e faz `fetch(layer.url)` para todo vetor visível, sem esperar a busca abrir (`open` não participa do efeito). Como o bioma é visível por padrão, o load baixa `limite_caatinga.geojson` **duas vezes** em paralelo (MapLibre + busca) e faz um segundo `JSON.parse` de 2,5 MB no thread principal. `activateDynamicLayer` faz ainda um terceiro fetch do bioma para o clip.
**Correção:** só aquecer o cache quando `open === true`, e compartilhar um cache único de `FeatureCollection` no store (reusado pelo clip), evitando parse triplo.

### D4. GeoJSON servidos sem `Cache-Control` de longa duração `[média]`
`next.config.ts:3`, não há `headers()` customizados; o Next serve `public/` com `Cache-Control: public, max-age=0`, então os 4,85 MB de GeoJSON são revalidados a cada visita (com ETag geram 304, mas ainda pagam round-trips).
**Correção:** `async headers()` com `Cache-Control: public, max-age=31536000, immutable` para `/data/vector/:path*` (versionar o nome do arquivo se forem regenerados) e confirmar gzip/brotli no deploy.

### D5. Sem cache server-side de `tileUrl`, cada reload/usuário refaz sample de 5000 px + Jenks `[média]`
`app/api/gee/tile/route.ts:102`, o cache de `tileUrl` só existe no cliente (`fetchedTileUrls`, perdido a cada reload). No servidor, cada POST para GPP/NPP refaz `image.sample` de 5000 pixels (segundos) e roda `jenksBreaks` (100-300 ms bloqueando o event loop). Como os parâmetros são idênticos entre usuários (mesmo asset, mesmo bioma, mesma classificação), o trabalho é repetido à toa.
**Correção:** cache LRU em memória no servidor (TTL de ~90 min, pois URLs de `getMap` do GEE expiram) keyed por `{asset.id, band, classify, clipId}`, devolvendo `{tileUrl, breaks}`.

### D6. Duplo-clique numa feição dispara duas requisições idênticas a `/api/gee/stats` `[média]`
`components/MapView.tsx:814`, o cache só é preenchido depois do `await`; o MapLibre emite dois `click` num duplo-clique, e cada um passa pelo cache vazio e dispara um `reduceRegion` completo. Mesmo problema no `pixelCache`.
**Correção:** um `Map<cacheKey, Promise>` de requisições em voo, se já houver promise para a chave, aguardá-la em vez de refazer o fetch. (A mesma mudança do B7 pode cobrir isto.)

### D7. Resync de z-order roda inteiro a cada tick do slider de opacidade `[média]`
`components/MapView.tsx:925`, o efeito depende de `layers` e re-executa em qualquer mudança do array, inclusive cada `onChange` do slider de opacidade (dezenas por segundo, `Sidebar.tsx:186` sem debounce). A cada vez chama `updateLayer` para todas as 16 camadas, refaz ~25 `moveLayer` e chama `map.getStyle()` (serializa o style inteiro) só para achar as camadas `gl-draw-`.
**Correção:** separar em dois efeitos, um de visibilidade/opacidade que aplica só na camada alterada, outro de ordem que só roda quando a sequência de ids muda (comparar `layers.map(l=>l.id).join()` com um ref). Opcional: throttle por `requestAnimationFrame` no slider.

### D8. `mousemove` sem throttle faz uma consulta espacial por camada visível `[média]`
`components/MapView.tsx:622`, `pickHoveredVector`, chamado a cada `mousemove` (~60-120 Hz), itera as camadas visíveis e faz um `queryRenderedFeatures` separado por camada. Com os 6 recortes ligados (assentamentos 1923, municípios 1210 feições), são até 6 consultas espaciais por evento no thread principal, jank de hover.
**Correção:** uma única `queryRenderedFeatures(e.point, { layers: [todas as sublayers visíveis] })` escolhendo o hit da camada mais alta; e throttle por `requestAnimationFrame` (processar só o último evento por frame).

### D9. `CursorCoordinates` faz `setState` a cada `mousemove` `[baixa]`
`components/overlays/CursorCoordinates.tsx:23`, `onMove` chama `setCoords` com array novo a cada evento, sem throttle, re-renderizando o overlay a 60-120 Hz.
**Correção:** throttle por `requestAnimationFrame` (guardar o último `lngLat` num ref, um `setCoords` por frame) ou escrever direto no DOM via ref.

### D10. Recharts entra no bundle inicial do mapa `[baixa]`
`components/ResultsSidebar.tsx:5`, `StatsChart` importa Recharts (+ d3, ~100 KB gzip) estaticamente, e o `ResultsSidebar` o importa estaticamente, então o Recharts entra no chunk do `WebGIS` carregado no primeiro render, mesmo que o usuário nunca clique numa feição.
**Correção:** carregar `StatsChart` com `next/dynamic` (`ssr:false`) dentro do `ResultsSidebar`, com `SkeletonChart` como fallback, Recharts baixa só na primeira análise.

### D11. Fonte Raleway via `<link>` externo render-blocking `[baixa]`
`app/layout.tsx:19`, injeta o CSS do Google Fonts com `<link rel="stylesheet">`, requisição render-blocking a terceiros (dois domínios), baixando 5 pesos (300-700). O Next 16 tem `next/font/google`, que self-hosta no build e elimina o bloqueio.
**Correção:** `Raleway({ subsets:['latin'], weight:['300','400','500','600','700'] })` e aplicar `raleway.className` no `<body>`.

---

## P3, Interface, design e acessibilidade, IMPLEMENTADO (2026-07-06)

> **Status:** U1-U12 feitos + D11 (fonte). Build/typecheck/lint limpos; D11 verificado em runtime (HTML sem `fonts.googleapis.com`, woff2 self-hosted em `/_next/static/media`). U13 (reordenar por toque) documentado como desktop-only (o drag-and-drop HTML5 funciona no desktop; up/down por índice foi avaliado como risco desproporcional para item de baixa prioridade). Demais itens visuais passaram por build, falta olhar no navegador. Resumo: U1 legenda contínua com paleta/min/máx/unidade reais (`ContinuousLegend`); U2 painel de resultados fechável + drawer sobreposto abaixo de 768px + `100dvh`; U3 acessibilidade (role/aria-checked/aria-label no toggle, role=button/aria-expanded/onKeyDown no acordeão, aria-label no slider); U4 slider nativo com `accent-color` (removidos os estilos webkit hard-coded); U5 controles do MapLibre em pt-BR (`locale`); U6 toggle ligado usa o verde da identidade; U7 splash claro; U8 numerais tabulares globais (`"tnum" 1`); U9 scrollbar translúcida neutra + Firefox; U10 bússola nativa removida (`showCompass:false`); U11 legenda com `maxHeight: min(400px, calc(100vh-320px))`; U12 formatação pt-BR nas medições/estatísticas; D11 Raleway via `next/font/google` (self-hosted, sem link render-blocking).

### U1. Legenda de rasters contínuos mostra gradiente falso, sem min/máx nem unidade `[alta]`
`components/overlays/FloatingLegend.tsx:199`, para camadas contínuas (solo, biomassa, fluxos GFW, fogo) a legenda renderiza um gradiente fixo `accent (#5f7030) -> text (#333)` que **não corresponde à paleta real** do raster no mapa (ex.: solo usa `#ffffe5->#005a32`), e não mostra rótulos de mín/máx nem unidade (t C/ha, Mg CO2e/ha). Numa plataforma científica de carbono, a legenda fica inutilizável para interpretar valores. O próprio código admite `(future)`.
**Correção:** construir o gradiente a partir de `layer.gee.visParams.palette` (cores reais) e exibir os extremos de `visParams.min/max` com `layer.unit` abaixo da barra.

### U2. `ResultsSidebar` de 300px fixos sem botão de fechar; em telas pequenas o mapa colapsa `[alta]`
`components/ResultsSidebar.tsx:72`, painel com `width/minWidth: 300` e nenhum controle de fechar. Auto-aparece sempre que um raster está visível, então num celular de 375px ocupa ~80% da tela ao ligar uma camada de carbono, sem como dispensar. Com a Sidebar aberta (270px) a soma 570px estoura telas <600px e o mapa fica com largura ~0. Não há **nenhuma** media query no app. `WebGIS.tsx:51` usa `100vh`, que em mobile esconde overlays atrás da barra de URL.
**Correção:** botão de fechar/minimizar no cabeçalho "Resultados"; abaixo de ~768px renderizar as sidebars como drawer/overlay sobre o mapa; trocar `100vh` por `100dvh`.

### U3. Controle principal (toggle de camada) e acordeões sem acessibilidade `[média]`
`components/Sidebar.tsx:107`, o botão que liga/desliga cada camada é um `<button>` sem texto, `title`, `aria-label` ou `role="switch"` (leitores anunciam só "botão"). O cabeçalho dos acordeões (L242) é uma `<div onClick>` sem `role`, `tabIndex` ou `aria-expanded`, impossível abrir a lista por teclado. O slider de opacidade também não tem `aria-label`. O `DarkModeToggle` já tem `aria-label` correto, então o padrão existe no projeto.
**Correção:** `aria-label`/`role="switch"`/`aria-checked` no toggle; `<button>` ou `role="button"`+`tabIndex`+`onKeyDown`+`aria-expanded` no acordeão; `aria-label` no range.

### U4. Slider de opacidade com cores hard-coded que ignoram a identidade e o dark mode `[média]`
`app/globals.css:121`, o CSS força `-webkit-appearance:none` e pinta o thumb de `#10b981` (verde-esmeralda do great-panini) e o trilho de `#374151`, anulando o `accentColor: theme.colors.accent` do `Sidebar.tsx:190` no Chromium/WebKit. O usuário vê um verde que não é o oliva `#5f7030`, e o trilho escuro fixo destoa e não reage ao dark mode.
**Correção:** remover os estilos custom de `::-webkit-slider-*` (deixar `accent-color` funcionar) ou derivá-los de variáveis CSS do tema.

### U5. Controles nativos do MapLibre com tooltips/aria em inglês `[média]`
`components/MapView.tsx:432`, `NavigationControl`, `GeolocateControl` e `FullscreenControl` são adicionados sem `locale`, então os botões mostram "Zoom in", "Find my location", "Enter fullscreen" no meio da UI toda em português.
**Correção:** passar `locale` no `new maplibregl.Map({...})` com as chaves pt-BR.

### U6. Estados ligado/desligado do toggle usam dois cinzas quase iguais `[baixa]`
`components/Sidebar.tsx:118`, `background: layer.visible ? theme.colors.text : theme.colors.textDim` (dois cinzas, `#333` e `#6b6a60`). É difícil ver quais camadas estão ativas; o oliva `#5f7030` da identidade não é usado no controle principal.
**Correção:** `accent` no estado ligado e cinza claro/borda no desligado (padrão universal de switch).

### U7. Splash de carregamento usa paleta escura herdada (`#0d1117`, GitHub dark) `[baixa]`
`app/page.tsx:13`, o fallback do `dynamic import` usa fundo `#0d1117` com texto `#6b7280`. Como o tema padrão do carbono é claro (`#ffffff`), há um flash escuro antes da UI branca a cada carga.
**Correção:** usar as cores do tema carbono no splash (fundo `#ffffff`, texto `#6b6a60`, detalhe `#5f7030`).

### U8. Pilha de fonte `"'Raleway', monospace"` não é monoespaçada, números não alinham `[baixa]`
`components/overlays/CursorCoordinates.tsx:55` (e `StatsChart`, `ResultsSidebar`, `Header`), Raleway sempre resolve, então o fallback `monospace` nunca atua e os dígitos são proporcionais. No box de coordenadas (`nowrap` + `translateX(-50%)`, atualizado a cada `mousemove`) a largura muda e o box **treme**; na grade de stats os valores não alinham.
**Correção:** `fontVariantNumeric: 'tabular-nums'` (Raleway suporta) nesses elementos e trocar a pilha por `"'Raleway', sans-serif"`.

### U9. Scrollbar com cor fixa `#30363d` herdada do tema escuro `[baixa]`
`app/globals.css:78`, o thumb é sempre `#30363d` (cinza-azulado do GitHub-dark), destoa da paleta bege/oliva no claro e do fundo esverdeado no escuro; só cobre WebKit.
**Correção:** cor translúcida neutra via variável de tema + `scrollbar-color` para Firefox.

### U10. Bússola duplicada `[baixa]`
`components/MapView.tsx:432`, `NavigationControl` sem opções mantém o compass padrão (com tooltip em inglês), e o app ainda renderiza o `NorthArrow` customizado logo abaixo, com a mesma função. Dois controles redundantes na mesma coluna.
**Correção:** `{ showCompass: false }` no `NavigationControl`, mantendo o `NorthArrow` (que segue o estilo dos demais botões).

### U11. Legenda expandida sobrepõe o painel do toolbar de desenho em telas baixas `[baixa]`
`components/overlays/FloatingLegend.tsx:54`, com muitas classes (ex.: MapBiomas 30 classes) a legenda chega ao teto de 400px; num viewport de ~768px de altura, com o painel do `FloatingDrawToolbar` aberto (top:277 a ~452px), os dois se sobrepõem na borda direita (ambos `zIndex 5`). (O achado original apontava colisão com a bússola/atribuição, que **não** ocorre, os cantos são deliberadamente reservados.)
**Correção:** `maxHeight: 'min(400px, calc(100vh - 320px))'` na legenda, ou elevar o `zIndex`/reposicionar o painel de desenho.

### U12. Formatação numérica não é pt-BR nas estatísticas e medições `[baixa]`
`components/StatsChart.tsx:271` e `ResultsSidebar.tsx:99/107/128`, os valores usam `toFixed` (ponto decimal), enquanto a contagem no mesmo cartão usa `toLocaleString('pt-BR')`. O usuário vê "Média: 12.3" (ponto) ao lado de "1.234 px", e "12345.67 km²" em vez de "12.345,67 km²".
**Correção:** `Intl.NumberFormat('pt-BR', ...)` consistente em todo o painel (stats, área, comprimento, valor de pixel).

### U13. Reordenação de camadas usa HTML5 drag-and-drop, que não funciona em toque `[baixa]`
`components/Sidebar.tsx:315`, a reordenação usa só `draggable`/`onDragStart`/`onDrop` (HTML5 DnD), sem pointer/touch events, então é inoperável em tablet/celular. A Sidebar abre em qualquer viewport pelo hamburger, então não fica bloqueada em telas pequenas. Severidade baixa: reordenar é conveniência secundária; toggle e opacidade funcionam por toque.
**Correção (se mobile for alvo):** botões de subir/descer em cada linha (funcionam igual em desktop e toque e tornam a reordenação descobrível), ou trocar por pointer events / `@dnd-kit`.

---

## P4, Código morto, configuração e documentação (herança do great-panini), IMPLEMENTADO (2026-07-06)

> **Status:** C1-C9 feitos, **mais a remoção completa das outras plataformas** (a pedido). Build/typecheck/lint limpos; smoke test em `next start` OK (home 200, tile por `clipId` 200, stats 200), e o bundle de produção não contém mais nenhuma das plataformas removidas (PAE-PE/CRESCA/SAP/ATLAS = 0 ocorrências).
>
> **Plataforma única:** `config/platforms.ts` agora exporta um único `theme` (Caativar). Removidos: as 4 plataformas herdadas, `PlatformSwitcher.tsx`, `BrandedHeader.tsx`, `BrandedFooter.tsx`, o estado `platformId`/`setPlatform` do store, e os campos `layout`/`branded`/`iconName` dos tipos. `WebGIS`/`Header`/`Sidebar` simplificados; `PlatformIcon` reduzido à folha.
>
> **P4 (C1-C9):** C1 removidas as deps não usadas (terra-draw, terra-draw-maplibre-gl-adapter, geojson-vt, vt-pbf, stream-chain, stream-json) + `package-lock` sincronizado; C2 caminho TiTiler removido (`buildTileUrl.ts` deletado, `getTiTilerStats`/`getTiTilerPointValue` removidos, branch não-GEE do MapView); C3 `featureCenter` + CSS `.floating-results-popup` órfão removidos; C4 `titiler_cors.py` + `filter-otto-bacias-pe.mjs` deletados; C5 `page.module.css` deletado; C6 campo `map.basemap` morto removido; C7 `verify-assets.mjs` agora inclui os assets de solo/fogo em uso; C8/C9 `DOCUMENTACAO.md` atualizada (libs, plataforma única, unidade NPP, API) e `dev` fixado em `-p 3100`.

### C1. Dependências não usadas no `package.json` `[baixa]`
`package.json:23`, `terra-draw` e `terra-draw-maplibre-gl-adapter` (o desenho usa `@mapbox/mapbox-gl-draw`), `geojson-vt` e `vt-pbf` (o maplibre usa os seus `@maplibre/*` transitivos, diferentes) não são importados em lugar nenhum. `stream-chain`/`stream-json` só servem ao script morto `filter-otto-bacias-pe.mjs`. Engordam `npm ci`/deploy.
**Correção:** `npm uninstall terra-draw terra-draw-maplibre-gl-adapter geojson-vt vt-pbf` (e `stream-chain`/`stream-json` junto com o script).

### C2. Caminho TiTiler/COG é código morto que aponta para `localhost:8000` `[baixa]`
`lib/buildTileUrl.ts:3`, `lib/getRasterStats.ts:76` (`getTiTilerStats`), `lib/getRasterPointValue.ts` (`getTiTilerPointValue`), todas as 10 camadas têm `source:'gee'`, então o branch TiTiler (usado em `MapView.tsx:283` como "default") nunca executa. As envs `NEXT_PUBLIC_TITILER_URL`/`NEXT_PUBLIC_DATA_DIR` (default `localhost:8000`) são inlinadas no bundle do cliente. A `DOCUMENTACAO.md` não menciona TiTiler.
**Correção:** remover os ramos TiTiler dessas 3 libs (mantendo só o caminho GEE) e fazer o caso não-GEE lançar erro explícito de configuração.

### C3. `featureCenter` é código morto e o CSS `.floating-results-popup` está órfão `[baixa]`
`components/MapView.tsx:115`, `featureCenter` é definido mas nunca chamado; a regra `.floating-results-popup` (`globals.css:62`) não é aplicada por nenhum JSX. (A classe `.hover-label-popup` **é** usada em L660, não remover.)
**Correção:** remover `featureCenter` (L115-141) e a regra CSS órfã.

### C4. Scripts herdados não documentados `[baixa]`
`scripts/titiler_cors.py` (wrapper CORS do TiTiler) e `scripts/filter-otto-bacias-pe.mjs` (filtra bacias de PE) não aparecem na doc, não são referenciados pelo código nem pelo `package.json`, e não têm relação com a plataforma de carbono.
**Correção:** remover ambos, ou documentá-los como herdados se houver intenção de reuso.

### C5. `app/page.module.css` é código morto do template create-next-app `[baixa]`
Não é importado por nenhum componente e referencia `var(--font-geist-sans)` (fonte que não existe aqui) e classes `.ctas/.intro/.logo` sem correspondência.
**Correção:** excluir `app/page.module.css`.

### C6. Campo `map.basemap` em `layers.json` é config morta `[baixa]`
`config/layers.json:8`, define `map.basemap` (style.json do Carto Positron), mas nada o consome: `MapView.tsx` só usa `mapConfig.center` e `mapConfig.zoom`; o basemap efetivo vem de `config/basemaps.ts`.
**Correção:** remover o campo, ou passar a usá-lo como fonte única do basemap inicial.

### C7. `verify-assets.mjs` não verifica os assets de solo e fogo realmente usados `[média]`
`scripts/verify-assets.mjs:24`, a `DOCUMENTACAO.md:111` afirma que "todos os asset IDs foram confirmados por `verify-assets.mjs`", mas o `CANDIDATES` do script **não** inclui o solo `soc_t_ha_000_030cm` nem o fogo `fire_frequency_v1` que estão em `layers.json`, testa outros IDs. A checagem da doc não é reproduzível para essas duas camadas.
**Correção:** atualizar `CANDIDATES` para os assets/bandas exatos de `layers.json` e rodar o script; ou ajustar a afirmação da doc.

### C8. `DOCUMENTACAO.md` omite 6 arquivos de `lib/` em uso `[baixa]`
A árvore lista só 5 arquivos em `lib/`, mas há 11. Faltam `buildTileUrl.ts`, `computeBbox.ts`, `drawRectangleMode.ts`, `geeEvaluate.ts`, `geeValidation.ts`, `getRasterPointValue.ts`, todos importados e usados.
**Correção:** acrescentar os 6 à árvore, descrevendo cada um.

### C9. Instrução de setup diverge da porta real de `npm run dev` `[baixa]`
`DOCUMENTACAO.md:77` diz que `npm run dev` sobe em `localhost:3100`, mas `package.json` define `"dev": "next dev"` sem `-p` (porta padrão 3000). A 3100 só existe no `launch.json` da ferramenta de preview.
**Correção:** fixar `"dev": "next dev -p 3100"`, ou ajustar a doc para 3000.

---

## Refutados na verificação (não são problemas)

Registrados para você não reabri-los depois:

- **Múltiplos rasters / `pickStatsTarget`:** as quatro regras de seleção de raster concordam (todas pegam o topmost visível); resultado internamente consistente.
- **XSS no `hoverPopup` via `setHTML`:** o `setHTML` sem escape existe, mas só recebe propriedades de GeoJSON estáticos e confiáveis (IBGE/FUNAI/INCRA), sem upload nem fetch de terceiros, não acionável. É prática defensiva ruim, não vulnerabilidade.
- **Caminho WFS morto:** é morto, mas a doc já declara código dormente do great-panini como mantido de propósito.
- **Protocolo pmtiles duplicado no cleanup:** `addProtocol` é atribuição por chave (não append), idempotente; sem duplicação nem vazamento.
- **Gradiente branco no cabeçalho dos acordeões:** é um scrim de legibilidade sobre a imagem de banner (PNG fixo), apropriado nos dois modos, não é o fundo do cabeçalho e não vaza sobre superfície escura.
- **`temporalDate`/`timeseries` inválidos gerando 500:** só acionável pelo modo temporal, que a doc declara fora de escopo nesta fase.
