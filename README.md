# Plataforma Carbono Caatinga

Aplicação única, em Next.js, que reúne a página institucional do projeto Floresta em pé, Renda justa e o módulo de mapas e análises do carbono florestal do bioma Caatinga.

- `/` e demais páginas de marketing: apresentação do projeto, indicadores, cartilhas, formação e galeria.
- `/mapa`: o módulo de mapas e análises, em tela cheia, com camadas de carbono, recortes territoriais e estatística zonal calculada no Google Earth Engine.

O inventário técnico completo (camadas, pipeline GEE, rotas de API, estrutura de pastas) está em [`DOCUMENTACAO.md`](DOCUMENTACAO.md).

## Stack

Next.js 16.2.3 (App Router), React 19, TypeScript strict. MapLibre GL JS 5, Zustand, Recharts, `@mapbox/mapbox-gl-draw` e `@google/earthengine` no lado do módulo de mapas.

## Execução

```bash
npm install
npm run dev
```

Sobe em http://localhost:3000. As rotas `/api/gee/*` precisam da credencial da service account do Earth Engine em `.env.local` (modelo em `.env.example`); sem ela as páginas de marketing funcionam normalmente e o mapa carrega só os vetores locais.

## Docker

A imagem usa Node 22 e a saída standalone do Next.js. Ela não contém credenciais: em produção, forneça o JSON da service account como um secret de arquivo e a variável `GOOGLE_APPLICATION_CREDENTIALS` com o caminho onde ele foi montado.

Build e execução sem Earth Engine (landing e vetores locais):

```bash
docker build -t carbono-caatinga .
docker run --rm -p 3000:3000 carbono-caatinga
```

Para executar localmente com as camadas e estatísticas do Earth Engine, informe o caminho absoluto da sua chave no host. O Compose monta o arquivo somente para leitura dentro do container, sem incluí-lo na imagem:

```bash
GEE_CREDENTIALS_FILE=/caminho/absoluto/service-account.json docker compose up --build
```

Para encerrar, execute `docker compose down`. Em qualquer provedor, use a mesma imagem, monte o JSON como secret e defina `GOOGLE_APPLICATION_CREDENTIALS` para esse ponto de montagem. A porta pode ser ajustada pela variável `PORT`.

## CI/CD

Os workflows do GitHub Actions ficam separados em `.github/workflows/`:

- `ci.yml` executa em pull requests e em pushes para `main`; instala as dependências, gera o build de produção e confere o contraste do tema mensal.
- `deploy-beta.yml` é acionado somente quando o CI de um push na `main` termina com sucesso. Ele publica a imagem no Docker Hub e o runner auto-hospedado `beta-runner` atualiza o container na VPS beta.

Configure estes valores em **Settings -> Secrets and variables -> Actions** do repositório:

| Tipo | Nome | Finalidade |
| --- | --- | --- |
| Variable | `DOCKER_IMAGE_BETA` | Imagem no Docker Hub, por exemplo `oca/carbono-caatinga-beta` |
| Variable | `DOCKER_USERNAME` | Usuário do Docker Hub |
| Secret | `DOCKER_PASSWORD` | Token ou senha do Docker Hub para publicar a imagem |
| Variable | `CONTAINER_NAME_BETA` | Nome do container na VPS beta |
| Variable | `HOST_PORT_BETA` | Porta exposta pela VPS beta |
| Variable | `CONTAINER_PORT` | Porta interna da aplicação, normalmente `3000` |
| Variable | `NETWORK_NAME` | Rede Docker compartilhada com o proxy reverso |
| Variable | `GEE_SERVICE_ACCOUNT_PATH_BETA` | Caminho absoluto, na VPS beta, para o JSON da service account |

O arquivo da service account deve existir apenas na VPS beta e ser legível pelo Docker. Para imagens privadas, configure previamente o login no Docker Hub para o usuário do `beta-runner`, que executa o `docker pull`.

## Estrutura

```
app/
├ (marketing)/          layout raiz de marketing (Raleway, globals.css)
│   ├ layout.tsx
│   └ page.tsx          a landing
├ (mapa)/               layout raiz do módulo (Libre Franklin, mapa.css)
│   ├ layout.tsx
│   └ mapa/page.tsx
├ api/gee/              rotas server-side (tile, stats, point, timeseries)
├ globals.css           estilos das páginas de marketing
└ mapa.css             estilos do módulo de mapas
components/             SiteHeader, PhotoCarousel, HeroBackground, Sazonalidade
components/mapa/        mapa, sidebars, gráficos, overlays
config/mapa/            layers.json, platforms.ts, basemaps.ts, layerMeta.ts
lib/config.ts           MAPA_URL (destino dos botões de acesso)
lib/phenology.ts        os 12 meses do ciclo e suas cores
lib/color.ts            mistura e contraste WCAG, base dos acentos
lib/mapa/               autenticação GEE, store, estatística, utilitários
types/mapa.ts           tipos do módulo de mapas
public/                 images, logos, data/vector, banners, welcome, videos
scripts/                utilitários GEE, recortes e verificações
```

Os dois grupos de rotas têm layouts raiz irmãos, e não um layout comum. É isso que mantém o `overflow: hidden` e os tokens do mapa fora das páginas de marketing, e o header/rodapé institucionais fora do módulo. A consequência é que navegar entre `/` e `/mapa` é um carregamento de página inteiro: use `<a href>`, nunca `next/link`.

## Identidade visual

Paleta do logo OCA: verde-oliva `#5f7030` e laranja `#ce8b44`, sobre neutros de cinza-areia. As páginas de marketing usam Raleway (pesos 300/400/600) com numerais lining; o módulo de mapas usa Libre Franklin (400 a 800).

O acento acompanha o mês: as doze cores vêm da série Landsat 1985-2024 do bioma, desmisturada em NDFI, e ficam em `lib/phenology.ts`. O módulo abre no mês de hoje e deixa fixar outro. A seção `/#paleta` da landing mostra o estudo que originou a rampa. Ver a seção Identidade visual da [`DOCUMENTACAO.md`](DOCUMENTACAO.md).

## Deploy

Web Service Node no Render, descrito em `render.yaml`. Não pode ser Static Site: as rotas `/api/gee/*` precisam de servidor. Ver a seção Deploy da `DOCUMENTACAO.md`.
