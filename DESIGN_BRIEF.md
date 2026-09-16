# Brief de design, Plataforma de Carbono da Caatinga

Documento autossuficiente para trabalho de design. Descreve **o que a plataforma faz, como a interface está organizada hoje, cada componente e seus estados, os fluxos do usuário e a identidade visual**, para embasar uma versão mais profissional do design. Não cobre backend/GEE (irrelevante para o visual).

---

## 1. O que é

WebGIS (mapa web interativo) de **monitoramento do carbono florestal do bioma Caatinga**. O usuário liga camadas de dados espaciais sobre o mapa (carbono do solo, biomassa, produtividade, fluxo de carbono, fogo, uso da terra) e obtém **estatísticas por recorte territorial** (clicando num município/estado) ou **por área desenhada** (polígono/retângulo/linha/ponto).

- **Público:** pesquisadores, gestores ambientais, técnicos, contexto científico/institucional (projeto OCA / UFCG / INSA). Uso primário em **desktop**.
- **Idioma:** português do Brasil, em toda a interface.
- **Fase atual:** MVP funcional. É **uma única plataforma** (Caativar), não há troca de plataformas nem múltiplos temas.
- **Objetivo do redesign:** deixar mais **profissional e coeso** sem perder a identidade (verde-oliva OCA) nem a densidade de informação que um WebGIS exige.

---

## 2. Layout geral

Aplicação de tela cheia (`100dvh`), sem rolagem da página. Três faixas:

```
┌ ┐
│  HEADER (56px):  [ícone] Caativar                [lua dark mode] │
├ ┬ ┬ ┤
│              │                                 │              │
│  SIDEBAR     │            MAPA                 │  RESULTADOS  │
│  ESQUERDA    │      (MapLibre + overlays)      │  (direita)   │
│  (270px)     │                                 │  (300px)     │
│  camadas     │                                 │  aparece sob │
│  colapsável  │                                 │  demanda     │
│              │                                 │              │
└ ┴ ┴ ┘
```

- **Header** (56px, fixo): marca à esquerda (ícone de folha num quadrado com a cor de destaque + nome "Caativar" + subtítulo "Plataforma de Carbono da Caatinga"), e à direita o **toggle de dark mode**.
- **Sidebar esquerda** (270px): painel de camadas. Colapsável por um botão hambúrguer flutuante no canto superior esquerdo do mapa. Começa aberta em desktop (≥1280px), fechada em telas menores.
- **Mapa** (ocupa o resto): MapLibre GL, com vários overlays flutuantes (ver seção 4).
- **Sidebar direita "Resultados"** (300px): só aparece quando há algo para mostrar (uma análise feita, ou um raster ativo). Tem botão de fechar. Abaixo de 768px vira um **drawer** sobreposto ao mapa (não empurra o mapa).

---

## 3. Sidebar esquerda, painel de camadas

Conteúdo, de cima para baixo:

1. Rótulo **"Temas"**.
2. Dois **acordeões**, cada um com um cabeçalho que é uma **imagem de banner** (60px de altura) com um selo (badge) do nome sobreposto e uma seta (chevron):
   - **"Recortes territoriais"**, camadas vetoriais: Bioma Caatinga, Estados, Municípios, Terras Indígenas, Territórios Quilombolas, Assentamentos (INCRA).
   - **"Carbono e ambiente"**, camadas raster: Carbono do Solo, GPP, NPP, Biomassa (GEDI), Biomassa (Spawn & Gibbs), Fluxo/Emissões/Remoções (GFW), Uso da Terra (MapBiomas), Frequência de Fogo.
3. Ao expandir um acordeão, a lista de **linhas de camada** (cards):

**Cada linha de camada (LayerRow):**
- alça de arrastar (para reordenar) + ícone do tipo (vetor/raster) + **nome** + **interruptor (toggle)** liga/desliga.
- Quando ligada: aparece um **slider de opacidade** + valor `%`.
- Estados: *carregando* (texto "Carregando..." no lugar do toggle), *erro* (faixa vermelha com mensagem e botão para dispensar).
- Reordenação por **arrastar-e-soltar** (funciona em desktop; sem suporte a toque).

> **Observação de design:** os banners dos acordeões são **gradientes provisórios gerados**, candidatos óbvios a arte definitiva. Os selos/badges e a hierarquia visual da lista podem ser repensados.

---

## 4. Mapa e overlays flutuantes

O mapa preenche o centro. Sobre ele, controles flutuantes:

- **Canto superior esquerdo:** botão de **busca** de feição (expande para um campo de texto com dropdown de resultados) e, logo abaixo, o **hambúrguer** que abre/fecha a sidebar esquerda.
- **Canto superior direito (pilha vertical):** controles nativos do MapLibre (zoom +/−, geolocalização, tela cheia), **seletor de mapa base**, **seta de norte**, e o **toolbar de desenho**.
- **Toolbar de desenho:** um botão (lápis) que expande um painel com 5 ferramentas, **Polígono, Retângulo, Linha, Ponto, Limpar**.
- **Canto inferior direito:** **legenda** flutuante (colapsável), lista as camadas ativas com suas cores/classes; para rasters contínuos mostra uma barra de gradiente com mín/máx e unidade.
- **Base inferior central:** **coordenadas** do cursor (lat/lon), um readout que segue o mouse.
- **Canto inferior esquerdo:** escala e atribuição do mapa.

**Interações no mapa:**
- **Hover** numa feição vetorial: realça a feição e mostra um popup com o nome (ex.: nome do município).
- **Clique** numa feição vetorial que esteja sobre um raster visível: calcula a **estatística zonal** daquele raster naquela feição -> abre/atualiza a sidebar de resultados.
- **Desenho** (polígono/retângulo/linha/ponto): mede área/comprimento e calcula a estatística do raster visível na área desenhada.

---

## 5. Sidebar direita, "Resultados"

Aparece quando há conteúdo. Cabeçalho **"Resultados"** + botão de **fechar**. Conteúdo, conforme o caso:

- **Área** (km²), quando o usuário clicou/desenhou um polígono.
- **Comprimento** (km), quando desenhou uma linha.
- **Valor do pixel**, quando clicou/desenhou um ponto (mostra o valor, a cor e o rótulo da classe).
- **Gráfico de estatística** (StatsChart), que tem três formatos:
  - **Área por classe** (barras horizontais): para camadas categóricas (Uso da Terra) e classificadas (GPP/NPP). Mostra a **área em hectares** e a porcentagem por classe, cada barra na cor da classe.
  - **Estatísticas do raster** (grade numérica): para camadas contínuas (solo, biomassa, fluxos, fogo). Mostra Média, Mediana, Mínimo, Máximo, Desvio, mais a contagem de pixels e a unidade (t C/ha, Mg CO2e/ha, etc.).
  - **Valor ao longo do tempo** (série temporal): existe no código, mas está **dormente** nesta fase.
- **Estados:** *carregando* (esqueleto animado enquanto o cálculo roda no servidor), *erro* (card vermelho "Falha ao calcular..."), *vazio* (dica: "Clique num município ou desenhe um polígono para ver estatísticas desta camada").
- O cartão de resultado **nomeia a camada e a feição** analisada (ex.: "Carbono do Solo, Campina Grande").

---

## 6. Identidade visual (tokens atuais)

Segue a **landing page** do projeto (identidade OCA). Preservar esta base no redesign.

**Fonte:** **Raleway** (Google Fonts, self-hosted), pesos 300-700. Numerais alinhados e **tabulares** (`lnum`/`tnum`) para os dados não "tremerem".

**Cores, modo claro:**
| token | cor | uso |
|---|---|---|
| accent | `#5f7030` | verde-oliva OCA, cor principal (toggles ligados, barras, ferramenta ativa, destaques) |
| accentBg | `#eef1e6` | fundo suave dos cartões de destaque |
| bg | `#ffffff` | fundo de header/sidebars |
| bgCard | `#ffffff` | fundo de cards (linhas de camada, botões) |
| border | `#e8e7e0` | bordas |
| text | `#333333` | texto principal |
| textDim | `#6b6a60` | texto secundário/atenuado |

**Cores, modo escuro:**
| token | cor |
|---|---|
| accent | `#8aa04f` |
| accentBg | `#1c2410` |
| bg | `#12140d` |
| bgCard | `#1b1e14` |
| border | `#2c3020` |
| text | `#f1f2ea` |
| textDim | `#a8ab98` |

O tema (claro/escuro) troca o conjunto `colors` inteiro; os componentes só leem os tokens, então o dark mode é consistente.

**Ícone da marca:** folha (representa carbono/vegetação). Há também um **logo da OCA** na landing (paleta verde-oliva) que pode inspirar o refinamento.

---

## 7. Conteúdo, tom e restrições

- **Tudo em pt-BR.** Tom técnico-institucional, mas acessível.
- **Densidade de dados alta**, é um WebGIS científico: muitos controles precisam coexistir com o mapa sem poluir. O desafio de design está em dar hierarquia e respiro a essa densidade.
- **Desktop-first.** Deve funcionar em telas menores (as sidebars viram drawer/colapsam), mas o alvo é desktop.
- **Dark mode** é requisito (mapas escuros para trabalho noturno / contraste).
- **MapLibre** é o mapa, o design dos overlays deve conviver com os controles nativos do MapLibre (zoom, escala, atribuição).

---

## 8. O que melhorar (oportunidades de design)

Pontos onde o visual atual é funcional mas pouco profissional:

- **Banners dos acordeões:** gradientes provisórios -> arte/ilustração definitiva coerente (ou um cabeçalho mais sóbrio, sem imagem).
- **Sistema visual coeso:** espaçamentos, raios de borda, sombras e tipografia estão razoáveis mas ad-hoc, vale um **design system** leve (tokens de espaçamento/elevação, estados de hover/foco consistentes).
- **Hierarquia da sidebar de camadas:** a lista pode ficar mais legível (agrupamento, ícones, contagem, estados ligado/desligado mais claros).
- **Sidebar de resultados:** os cartões (área, gráfico, grade de estatísticas) podem ganhar um layout mais editorial/apresentável, é o "produto" que o pesquisador leva.
- **Overlays do mapa:** hoje são vários botões flutuantes soltos; podem ser organizados em clusters mais intencionais.
- **Header:** simples demais, há espaço para marca, contexto do projeto (OCA/UFCG/INSA) e navegação futura.
- **Estados vazios / onboarding:** a primeira impressão (mapa vazio + "ligue uma camada") pode guiar melhor o usuário novo.
- **Acessibilidade:** manter/expandir contraste, foco por teclado e rótulos (já há `aria` nos controles principais).

> Ao redesenhar, os pontos de partida mais valiosos para preservar: a **fonte Raleway**, o **verde-oliva `#5f7030`**, o **dark mode** e a **densidade funcional** de um WebGIS (o design não pode "esconder" os controles que o trabalho exige).
