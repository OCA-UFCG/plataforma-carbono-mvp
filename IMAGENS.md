# Imagens da landing page

Inventário das imagens em uso, seus créditos obrigatórios e as substituições recomendadas. O layout segue o handoff de design em `../handoff_design`.

## Fotos de Artur Lourenço (public/images/)

Fotos de autoria de Artur Lourenço, originais no zip `../fotos/photos_caatinga.zip` (extraído em `../fotos/caatinga_artur`), otimizadas com Pillow. Crédito na página: "Fotos: Artur Lourenço".

| Arquivo | Onde aparece |
|---|---|
| `hero/hero1.jpg` a `hero5.jpg` | Carrossel automático do hero (rotação a cada 6 s) |

`cta_caatinga.jpg`, `sobre_caatinga.jpg` e a galeria em mosaico (`galeria/cg1.jpg` a `cg9.jpg`, `importa/imp1.jpg` a `imp3.jpg`) foram removidos do projeto junto com as seções que os usavam; nenhum desses arquivos, nem as pastas `galeria/` e `importa/`, existe mais em `public/images/`. As imagens antigas de NASA e Wikimedia também já haviam sido removidas. A pasta `../fotos/caatinga_artur` tem mais paisagens disponíveis para trocas.

## Cartilhas (public/images/cartilhas/)

Capas da coleção "Mercado de carbono: o que isso tem a ver com a Caatinga?", produzida por OCA, UFCG, INSA e SUDENE, usadas na seção Comunicação. Originais em `../cartilhas` (PNG de ~2,4 MB cada), reduzidos e convertidos para JPEG (largura 760 px, ~120 KB) por um passo com Pillow.

| Arquivo | Origem | Uso |
|---|---|---|
| `vol1.jpg` a `vol4.jpg` | `cartilhas/01.png` a `04.png` | Grade dos 4 volumes |
| `caderno.jpg` | `cartilhas/boletim.png` | Bloco de destaque do caderno temático |

`colecao_banner.jpg` (recorte de `cartilhas/todas.png`, usado no remate da seção) foi removido junto com o trecho que o usava; o arquivo não existe mais em `public/images/cartilhas/`.

Observação: a capa do Volume 1 tem um erro de digitação na arte ("O que é crédito de caborno?"). A legenda na landing usa a grafia correta ("carbono"). Para corrigir a imagem, é preciso editar o arquivo original da cartilha. O `todas.png` traz um quadrado de QR em branco (placeholder de impressão); por isso a landing usa o recorte sem essa área.

Observação: a arte da capa do caderno ainda traz o rótulo "Boletim temático", nome anterior da publicação. O rótulo na landing e o content type no Contentful já usam "Caderno Temático"; a imagem discorda porque o texto está embutido no design. Para alinhar, é preciso editar o original, regerar o JPEG e substituir o asset no Contentful — a página usa o asset do CMS, e o `caderno.jpg` só entra no fallback, então as duas cópias precisam ser trocadas.

## Comunicação (public/images/comunicacao/)

Os dois cards da seção "Comunicação" usam fotografias, não as capas das publicações.
O campo `cover` do módulo de conteúdo (alimentado pelo Contentful) traz a **arte de capa**:
retrato, com o título já tipografado dentro. Renderizá-la no card imprimia cada título duas
vezes e recortava um retrato de proporção 0,75 num card de 1,30, decepando a arte.

| Arquivo | Onde aparece | Origem |
|---|---|---|
| `cartilha.webp` | Card "CARTILHA" | Figma, nó 18862:8581 (preenchimento de imagem do card) |
| `caderno.webp` | Card "CADERNO TEMÁTICO" | Figma, nó 18862:8582 |

Exportadas pela API REST do Figma, recortadas para a proporção do card (626×480) e convertidas
para WebP com Pillow: 940×720 (206 KB) e 960×736 (197 KB). O nó do caderno usa
`scaleMode: STRETCH` no design, o que distorce um retrato num quadro paisagem; aqui foi usado
recorte, que preserva a proporção.

Sobre a âncora do recorte: a `cartilha` é paisagem e perde só as laterais. O `caderno` é retrato
(960×1280) e perde mais da metade da altura, então a âncora decide o que sobra. Ancorar no topo
— a convenção usada para arte de capa, onde o título fica em cima — deixava apenas céu e copas,
cortando a casa, que é o assunto. As duas são recortadas pelo **centro**. Para fotografia, topo
é quase sempre a escolha errada.

**Autoria não documentada.** Nem este documento nem o arquivo do Figma registram quem fez estas
duas fotos. Não foram atribuídas para evitar crédito incorreto. Se forem de Artur Lourenço, como
as cinco do hero, valem o mesmo crédito obrigatório.

Elas vivem no repositório porque o modelo de conteúdo não tem campo para "foto do card" — só
`cover`. Quando esse campo existir, remover o mapa `FOTOS` em `components/marketing/Comunicacao.tsx`
e ler a foto do conteúdo, para que a edição não dependa de deploy.

## Logos do rodapé (public/logos/rodape/)

O rodapé assenta sobre `--bg-fundo-inverso` (#000f15), e o design usa marcas **brancas
monocromáticas** — não os PNG coloridos de `public/logos/`, que continuam servindo o cabeçalho e
foram o que o rodapé anterior usava sobre fundo claro.

| Arquivo | Instituição | Exibição | Nó do Figma |
|---|---|---|---|
| `sudene.webp` | SUDENE | 149×60 | I18862:8583;18862:8286 |
| `ufcg.webp` | UFCG | 191×60 | I18862:8583;18862:8873 |
| `oca.webp` | OCA | 108×60 | I18862:8583;18862:8288 |

Exportadas pela API REST do Figma a 3×, reduzidas para 2× e salvas em WebP com alfa (5 a 10 KB
cada). A ordem no design é **Sudene, UFCG, OCA** (x=470, 643 e 858 dentro do frame de 1436).

O logo do INSA (`public/logos/logo_insa.png`) não aparece: o design credita três instituições, o
rodapé anterior creditava quatro. Decisão de conteúdo a confirmar.

## Formação (public/images/formacao/)

Fotos das atividades de formação (oficinas, eventos, rodas de diálogo, encontros em assentamentos). A seção Formação e seu carrossel foram removidos na reconstrução da landing; as fotos sobrevivem em `DEFAULT_FOTOS_FORMACAO` mas nada as renderiza hoje. Originais na pasta `../fotos` (imagens de WhatsApp e uma foto DSC), selecionadas e otimizadas com Pillow para 1280 px de largura, JPEG progressivo (~90 a 280 KB).

Seis fotos em uso: `f1.jpg` (encontro em assentamento), `f2.jpg` (apresentação em evento), `f3.jpg` (oficina), `f4.jpg` (roda de diálogo), `f6.jpg` (foto de grupo), `f7.jpg` (oficina com a sociedade civil). A sétima selecionada era um momento cultural em orientação retrato (`f5`), removida porque o carrossel usa moldura paisagem 3:2 e a foto perdia metade do conteúdo no recorte. As legendas são provisórias (descrevem o que se vê); ajustar quando houver a identificação dos eventos. A pasta `../fotos` tem mais imagens disponíveis e um `photos_caatinga.zip` (não usado).

## Plataforma (public/images/)

`plataforma_preview.jpg` (captura de tela do mapa, camada de GPP ativa) foi removido junto com a versão anterior da seção "A plataforma"; o arquivo não existe mais. A seção reconstruída usa `plataforma/o-que-e.webp` (680×500, 72 KB), exportada pela API REST do
Figma a partir do preenchimento de imagem do quadro "Background+Border" (nó
I18862:8546;18846:7574), recortada pelo centro para a proporção 340/250 do quadro e convertida
com Pillow. O quadro tem 340×250 no design; uma versão anterior foi construída em 200×130 por
erro de leitura do brief, o que encurtava a seção inteira em 36 px e mudava a proporção de 1,36
para 1,54.

Origem e crédito desta foto não estão registrados em lugar nenhum — nem aqui, nem no arquivo do
Figma. Não preenchido para evitar atribuição incorreta.

As outras três abas ganharam foto na atualização do design de setembro de 2026:
`plataforma/a-caatinga.webp`, `plataforma/carbono-e-comunidades.webp` e
`plataforma/como-funciona.webp` (680×500, 60 a 90 KB), dos quadros "Background+Border" das
instâncias 18916:9520, 18916:9585 e 18916:9650. Os originais no Figma são JPEGs de celular
4000×3000 (Samsung SM-S901E, agosto de 2023 a julho de 2024), e dois deles traziam coordenadas
GPS no EXIF. A conversão (recorte central para 340/250 e Pillow, WebP qualidade 80) descarta
todos os metadados; **ao substituir essas fotos, não publicar os originais**, porque a de
"Carbono e comunidades" mostra uma casa em comunidade. Autoria também não registrada.

`carbono-e-comunidades.webp` também aparece em "Conheça a Caatinga", ao lado de "Um bioma de
natureza e pessoas" (nó 18988:8735, 298×219): é o mesmo preenchimento no Figma (asset 46b29) e o
quadro tem a mesma proporção 1,36, então o arquivo é reaproveitado em vez de duplicado.

## Faixas das páginas internas (public/images/faixas/)

Fotos de fundo das faixas acima do rodapé nas páginas internas (componente `PhotoBand`):
`sobre.webp` (2000×605, 60 KB), da faixa "O que a plataforma não faz" (nó 18988:8651), e
`comunicacao.webp` (1600×640, 200 KB), da faixa "Esse espaço está crescendo" (nó 18978:2080).
Os originais no Figma são fotos de celular: a primeira em 4000×3000 (Samsung SM-S901E, com EXIF
mas sem GPS), a segunda em 3000×4000 (retrato, sem EXIF).

O design mostra só uma tira de cada foto (1436×219 e 1436×209). Os recortes guardam uma tira mais
alta, centrada no mesmo ponto que o design centraliza, para que `object-fit: cover` ainda tenha
imagem quando a faixa cresce em telas estreitas. A conversão (Pillow, WebP) descarta todos os
metadados. Autoria não registrada.

## Páginas Sobre (public/images/sobre/)

`lago-serra.webp` (928×682, 115 KB): a mesma foto, com o mesmo enquadramento, aparece em duas
páginas: ao lado de "Por que criar uma plataforma para a Caatinga?" em "Conheça a plataforma" (nó
18988:8647) e ao lado de "Por que o direito sobre a terra importa?" em "Entenda essa relação" (nó
18988:8817). É o mesmo preenchimento no Figma (asset 4cf5c) nos dois nós, então o arquivo é um só. O original no Figma é uma foto de celular 3000×4000
(retrato, sem EXIF), de um lago ao pé de um morro rochoso. O recorte é a largura inteira na
proporção 464/341 do quadro, a partir da linha 900, enquadrando céu, morro e água como a tela do
design mostra; as porcentagens de posição que o Figma exporta para esse preenchimento não
correspondem a um recorte sem distorção, então não foram seguidas ao pé da letra. Autoria não
registrada.

Os ícones das perguntas numeradas (`public/icons/sobre/`) são os SVGs exportados do Figma sem
alteração. Dois deles ("paid" e "calendar month") vêm em duas camadas, um quadro vazio de 85 px e
o glifo posicionado dentro dele; as duas são usadas como o design as compõe.

## Hero

O hero usa um carrossel de cinco fotos de Artur Lourenço (`hero/hero1-5.jpg`), com rotação automática e fade, atrás do overlay em gradiente e do texto branco. O handoff sugeria uma composição Sentinel-2 do bioma; as fotos de campo foram preferidas pelo apelo visual. Para trocar ou reordenar, editar a constante `PHOTOS` em `components/marketing/Hero.tsx`; o crédito exibido ("Foto: Artur Lourenço") vem do campo `credit` de cada entrada dessa constante e só aparece quando ele está preenchido.

## Tipografia

Fonte Rubik (texto) e Archivo Narrow (o h1 do hero), ambas servidas do próprio repositório via `next/font/local` em `app/fonts/marketing.ts`, sem baixar nada do Google Fonts no build. Sem `font-feature-settings: 'lnum' 1`: a Rubik já usa algarismos lining por padrão, então a regra que a Raleway precisava foi removida. Se o projeto adotar o padrão gov.br, a equivalente institucional é a Rawline.
