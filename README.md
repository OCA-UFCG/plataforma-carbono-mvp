# Caativar

Aplicação única, em Next.js, que reúne a página institucional do projeto Floresta em pé, Renda justa e o módulo de mapas e análises do carbono florestal do bioma Caatinga.

- `/` e demais páginas de marketing: apresentação do projeto, indicadores, cartilhas, formação e galeria.
- `/mapa`: o módulo de mapas e análises, em tela cheia, protegido por autenticação Firebase, com camadas de carbono, recortes territoriais e estatística zonal calculada no Google Earth Engine.

O inventário técnico completo (camadas, pipeline GEE, rotas de API, estrutura de pastas) está em [`DOCUMENTACAO.md`](DOCUMENTACAO.md).

## Stack

Next.js 16.2.3 (App Router), React 19, TypeScript strict. MapLibre GL JS 5, Zustand, Recharts, `@mapbox/mapbox-gl-draw` e `@google/earthengine` no lado do módulo de mapas.

## Execução

```bash
npm install
npm run dev
```

Sobe em http://localhost:3000. Configure `.env.local` a partir de `.env.example`. As rotas `/api/gee/*` precisam da credencial da service account do Earth Engine; sem ela o mapa autenticado carrega só os vetores locais.

## Autenticação

Todas as páginas, incluindo a landing (`/`) e o mapa, exigem uma sessão Firebase válida. A única página pública é `/login`; as rotas `/api/gee/*` também exigem sessão. O login usa e-mail e senha, sem cadastro público: os usuários são criados manualmente no Firebase Console.

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/) e registre uma aplicação Web.
2. Em **Authentication > Sign-in method**, habilite somente **Email/Password**.
3. Em **Authentication > Users**, crie os usuários autorizados.
4. Em **Authentication > Settings > Authorized domains**, inclua o domínio de produção. `localhost` atende o desenvolvimento local.
5. Copie a configuração da aplicação Web para as variáveis `NEXT_PUBLIC_FIREBASE_*` em `.env.local`.
6. Em **Project settings > Service accounts**, gere uma chave privada. Preencha `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` com os campos do JSON; use também `FIREBASE_PROJECT_ID` se ele for diferente do público. Em provedores que não preservam quebras de linha, use `FIREBASE_PRIVATE_KEY_BASE64`.

As credenciais `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` e `FIREBASE_PRIVATE_KEY_BASE64` são exclusivas do servidor. Nunca as exponha com o prefixo `NEXT_PUBLIC_`, em arquivos versionados ou no navegador.

Após o Firebase validar o e-mail e senha, a aplicação cria uma cookie `session` com `HttpOnly`, `SameSite=Lax` e validade de 24 horas. O servidor verifica essa cookie antes de renderizar `/mapa` e antes de iniciar qualquer operação no Earth Engine.

## Mapas base (CARTO)

Os dois mapas base padrão, Positron (claro) e Dark Matter (escuro), vêm da CARTO. Desde agosto de 2026 a CARTO exige uma chave nos endpoints raster: a requisição sem chave ainda responde HTTP 200, mas o PNG chega estampado com a marca d'água "API KEY REQUIRED". A mudança é do provedor, não do código.

1. Peça a chave em [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey). É gratuita para uso não comercial — pesquisa, ensino e organizações sem fins lucrativos —, sem fila de aprovação, com uso justo de 5 milhões de requisições de tile por mês.
2. Preencha `NEXT_PUBLIC_CARTO_KEY` em `.env.local` e crie a variável de mesmo nome em **Settings -> Secrets and variables -> Actions**, para os workflows a passarem como build arg. No Render, defina-a em **Environment**.
3. Como toda `NEXT_PUBLIC_*`, o valor é embutido no bundle durante `npm run build`. Trocar a chave exige um build novo, não só um restart.

Sem a chave a aplicação continua de pé e os tiles continuam chegando, só marcados. `config/mapa/basemaps.ts` omite o parâmetro `key` quando não há valor, porque um `key=` vazio recebe exatamente o mesmo tile marcado. Os outros seis mapas base do seletor — OpenStreetMap, três da Esri e Google Satélite — não usam chave e não são afetados.

A CARTO considera os mapas base raster em fim de vida, em favor do serviço vetorial. A mesma chave cobre os dois formatos, então migrar depois não pede credencial nova; pede tratar estilo vetorial no `MapView`, que hoje trata todo mapa base como raster XYZ uniforme.

## Conteúdo editorial (Contentful)

A seção Comunicação (coleção de cartilhas e caderno temático em destaque) e o carrossel da Formação cidadã são lidos do Contentful pelo servidor. A integração é opcional: sem as variáveis abaixo, `lib/content/comunicacao.ts` devolve o conteúdo que acompanha o código, que é o mesmo hoje exibido na página. É assim que o build do CI roda.

1. Em **Settings > API keys**, gere uma chave; ela entrega o Space ID, o Content Delivery token e o Content Preview token.
2. Preencha `CONTENTFUL_SPACE_ID` e `CONTENTFUL_ACCESS_TOKEN` em `.env.local` e no ambiente do serviço em produção. `CONTENTFUL_ENVIRONMENT` é opcional e assume `master`.
3. Para uma sessão de prévia do editor, use `CONTENTFUL_PREVIEW=true` junto de `CONTENTFUL_PREVIEW_TOKEN`. Sem o token de prévia a configuração é tratada como ausente, e a página volta ao conteúdo padrão.
4. Crie os três content types com `CONTENTFUL_MANAGEMENT_TOKEN=... npm run contentful:provision -- --apply`. Sem `--apply` o comando só imprime o modelo, e sem o token do management ele imprime o modelo sem consultar o space.

As credenciais do Contentful são exclusivas do servidor, como as do Firebase: o prefixo `NEXT_PUBLIC_` embutiria o token no bundle do navegador. Elas são lidas a cada requisição, com cache de 3600 s (60 s em prévia), e não são necessárias no build nem nos secrets do GitHub Actions. Isso muda se a landing deixar de exigir sessão e passar a ser gerada estaticamente: aí o build também vai precisar delas.

`tests/lib/contentfulSpace.test.ts` consulta o space configurado pelo mesmo caminho de código da página e se ignora sozinho quando não há credencial, então `npm test` passa igual em máquina sem acesso e no CI.

Publicar uma entry não basta: a imagem referenciada também precisa estar publicada. Uma referência pendente é registrada no log do servidor como `contentful_unresolvable_link` e a entry incompleta é descartada, mantendo a seção de pé com o restante.

## Docker

A imagem usa Node 22 e a saída standalone do Next.js. Ela não contém credenciais: em produção, forneça o JSON da service account como um secret de arquivo e a variável `GOOGLE_APPLICATION_CREDENTIALS` com o caminho onde ele foi montado.

Build e execução sem Earth Engine (landing e vetores locais):

```bash
docker build -t caativar .
docker run --rm -p 3000:3000 caativar
```

Para executar localmente com as camadas e estatísticas do Earth Engine, informe o caminho absoluto da sua chave no host. O Compose monta o arquivo somente para leitura dentro do container, sem incluí-lo na imagem:

```bash
docker compose --env-file .env.local up --build
```

Além de `GEE_CREDENTIALS_FILE`, o `.env.local` deve conter as variáveis Firebase descritas em [Autenticação](#autenticação). O Compose usa as variáveis públicas `NEXT_PUBLIC_FIREBASE_*` como argumentos de build, pois o Next.js as inclui no JavaScript do navegador durante `npm run build`; as credenciais Firebase Admin ficam somente no ambiente do container em execução.

Para encerrar, execute `docker compose down`. Em qualquer provedor, use a mesma imagem, monte o JSON como secret e defina `GOOGLE_APPLICATION_CREDENTIALS` para esse ponto de montagem. A porta pode ser ajustada pela variável `PORT`.

## CI/CD

Os workflows do GitHub Actions ficam separados em `.github/workflows/`:

- `ci.yml` executa em pull requests e em pushes para `main`; instala as dependências, gera o build de produção e confere o contraste do tema mensal.
- `deploy-beta.yml` é acionado somente quando o CI de um push na `main` termina com sucesso. Ele publica a imagem no Docker Hub e o runner auto-hospedado `beta-runner` atualiza o container na VPS beta.

Configure estes valores em **Settings -> Secrets and variables -> Actions** do repositório:

| Tipo | Nome | Finalidade |
| --- | --- | --- |
| Variable | `DOCKER_IMAGE_BETA` | Imagem no Docker Hub, por exemplo `oca/caativar-beta` |
| Variable | `DOCKER_USERNAME` | Usuário do Docker Hub |
| Secret | `DOCKER_PASSWORD` | Token ou senha do Docker Hub para publicar a imagem |
| Variable | `CONTAINER_NAME_BETA` | Nome do container na VPS beta |
| Variable | `HOST_PORT_BETA` | Porta exposta pela VPS beta |
| Variable | `CONTAINER_PORT` | Porta interna da aplicação, normalmente `3000` |
| Variable | `NETWORK_NAME` | Rede Docker compartilhada com o proxy reverso |
| Variable | `GEE_SERVICE_ACCOUNT_PATH_BETA` | Caminho absoluto, na VPS beta, para o JSON da service account |
| Variable | `NEXT_PUBLIC_CARTO_KEY` | Chave dos mapas base da CARTO; sem ela os tiles saem com marca d'água |

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
├ (auth)/               layout raiz e página pública de login
│   └ login/page.tsx
├ api/gee/              rotas server-side protegidas (tile, stats, point, timeseries)
├ api/session/          criação e remoção da cookie de sessão
├ globals.css           estilos das páginas de marketing
└ mapa.css             estilos do módulo de mapas
components/             SiteHeader, PhotoCarousel, HeroBackground, Sazonalidade
components/mapa/        mapa, sidebars, gráficos, overlays
config/mapa/            layers.json, platforms.ts, basemaps.ts, layerMeta.ts
lib/config.ts           MAPA_URL (destino dos botões de acesso)
lib/contentful.ts       cliente do Contentful (server-only)
lib/content/            conteúdo editorial da landing, com padrão no código
lib/auth.ts             validação de sessão e guard de requests
lib/firebase*.ts        inicializadores Firebase cliente e Admin
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
