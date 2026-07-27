# Imagens da landing page

Inventário das imagens em uso, seus créditos obrigatórios e as substituições recomendadas. O layout segue o handoff de design em `../handoff_design`.

## Fotos de Artur Lourenço (public/images/)

Fotos de autoria de Artur Lourenço, originais no zip `../fotos/photos_caatinga.zip` (extraído em `../fotos/caatinga_artur`), otimizadas com Pillow. Crédito na página: "Fotos: Artur Lourenço".

| Arquivo | Onde aparece |
|---|---|
| `hero/hero1.jpg` a `hero5.jpg` | Carrossel automático do hero (rotação a cada 6 s) |
| `cta_caatinga.jpg` | Fundo da faixa CTA (pôr do sol, com overlay quente) |
| `sobre_caatinga.jpg` | Banner 16:6 na seção "Por que a plataforma existe" |
| `galeria/cg1.jpg` a `cg9.jpg` e `importa/imp1.jpg` a `imp3.jpg` | Galeria em mosaico (12 fotos) da seção "Conheça a Caatinga" |

A seção "Por que a Caatinga importa" voltou a ser só números, sem fotos; as `importa/imp1-3.jpg` migraram para a galeria. As imagens antigas de NASA e Wikimedia foram removidas do projeto. A pasta `../fotos/caatinga_artur` tem mais paisagens disponíveis para trocas.

## Cartilhas (public/images/cartilhas/)

Capas da coleção "Mercado de carbono: o que isso tem a ver com a Caatinga?", produzida por OCA, UFCG, INSA e SUDENE, usadas na seção Comunicação. Originais em `../cartilhas` (PNG de ~2,4 MB cada), reduzidos e convertidos para JPEG (largura 760 px, ~120 KB) por um passo com Pillow.

| Arquivo | Origem | Uso |
|---|---|---|
| `vol1.jpg` a `vol4.jpg` | `cartilhas/01.png` a `04.png` | Grade dos 4 volumes |
| `colecao_banner.jpg` | recorte de `cartilhas/todas.png` (título + capas em leque, sem o bloco de QR) | Remate da seção |
| `boletim.jpg` | `cartilhas/boletim.png` | Bloco de destaque do boletim temático |

Observação: a capa do Volume 1 tem um erro de digitação na arte ("O que é crédito de caborno?"). A legenda na landing usa a grafia correta ("carbono"). Para corrigir a imagem, é preciso editar o arquivo original da cartilha. O `todas.png` traz um quadrado de QR em branco (placeholder de impressão); por isso a landing usa o recorte sem essa área.

## Formação (public/images/formacao/)

Fotos das atividades de formação (oficinas, eventos, rodas de diálogo, encontros em assentamentos), usadas no carrossel da seção Formação. Originais na pasta `../fotos` (imagens de WhatsApp e uma foto DSC), selecionadas e otimizadas com Pillow para 1280 px de largura, JPEG progressivo (~90 a 280 KB).

Seis fotos em uso: `f1.jpg` (encontro em assentamento), `f2.jpg` (apresentação em evento), `f3.jpg` (oficina), `f4.jpg` (roda de diálogo), `f6.jpg` (foto de grupo), `f7.jpg` (oficina com a sociedade civil). A sétima selecionada era um momento cultural em orientação retrato (`f5`), removida porque o carrossel usa moldura paisagem 3:2 e a foto perdia metade do conteúdo no recorte. As legendas são provisórias (descrevem o que se vê); ajustar quando houver a identificação dos eventos. A pasta `../fotos` tem mais imagens disponíveis e um `photos_caatinga.zip` (não usado).

## Plataforma (public/images/)

| Arquivo | Onde aparece |
|---|---|
| `plataforma_preview.jpg` | Moldura da seção "A plataforma": captura de tela real do mapa, com a camada de produtividade primária bruta (GPP) ativa. |

## Hero

O hero usa um carrossel de cinco fotos de Artur Lourenço (`hero/hero1-5.jpg`), com rotação automática e fade, atrás do overlay em gradiente e do texto branco. O handoff sugeria uma composição Sentinel-2 do bioma; as fotos de campo foram preferidas pelo apelo visual. Para trocar ou reordenar, editar `HERO_FOTOS` em `app/page.tsx`.

## Tipografia

Fonte Raleway via `next/font/google`, pesos 300, 400 e 600, com `font-feature-settings: 'lnum' 1` global (a Raleway usa algarismos old-style por padrão; lnum alinha os números). Se o projeto adotar o padrão gov.br, a equivalente institucional é a Rawline.
