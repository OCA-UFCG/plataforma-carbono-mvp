# Regras das animações do Glossário

Valem para tudo em `lib/cenas/` e para os componentes que mostram as cenas (`components/glossario/`). Origem: `animations/pacote_animacoes_caatinga/` (DECISOES.md, ARQUITETURA.md), versão de 19/10/2026.

## Estrutura

- `fonte/paisagem.js` é o motor: a paisagem da Caatinga em canvas de 960 × 540, em JavaScript puro, com o estado dentro da função que `scripts/montar-cenas.mjs` cria.
- Cada animação é um arquivo em `fonte/` com o código da cena e um objeto `cena` com os ganchos: `torre`, `primeiroPlano`, `interface`, `atualizar(dt)`, `reiniciar`. A cena compartilha o escopo do motor.
- `gerado/` sai de `node scripts/montar-cenas.mjs` e não se edita à mão. Depois de mudar o motor ou uma cena, rodar o script e o teste `tests/lib/cenas.test.ts`, que falha se `gerado/` estiver desatualizado.
- A página comanda a cena por `tocar`, `velocidade`, `posicao`, `visivel`, `etapa`, `definirValor`, `estado` e `encerrar` (`tipos.ts`). Os controles ficam fora do canvas e são todos da página: a cena entrega as etapas (`etapas()`) e o valor ajustável (`valor()`), e não monta botões nem réguas. `opcoes.painel` serve só para texto da cena (a legenda e os textos do manejo agroecológico).

## Convenções visuais

- Sempre tema claro, mesmo com o sistema em tema escuro.
- Cores do carbono: azul `#0b7a97` para o CO₂ que entra pela fotossíntese, laranja `#d2661a` para o que sai pela respiração e verde `#3f9a3a` para o carbono que fica no ecossistema.
- Sem emojis; ícones desenhados ou texto.
- Com `prefers-reduced-motion`, a cena fica parada e os elementos aparecem em posição estática.
- Celular: sem rolagem horizontal; rótulos e painéis não se sobrepõem.

## Rigor científico

- As animações são ilustrações: o rigor está em reproduzir corretamente os comportamentos e em escolher a representação mais didática, não em replicar dados medidos. Direção do vento, formas e posições podem ser escolhidas para ensinar melhor (o vento pode vir da esquerda mesmo que na torre real venha de leste).
- O estilo é sempre desenhado, como o da paisagem; nada de imagem de satélite ou fotografia na cena.
- Números e textos que aparecem na tela ou na página sempre com fonte. O comportamento representado segue a literatura, mesmo quando a forma de mostrá-lo é livre.
- O que é escolha de representação fica marcado como ilustração no código. A página não leva nota de "ilustração sem escala" abaixo da animação (decisão do Artur, 19/10/2026).
- Nada de dados inventados. Referência incompleta não vai para a página.

## Desempenho

- A cena só é carregada quando o bloco chega perto da tela, uma por vez.
- Para de desenhar fora da tela e com a aba oculta; no máximo 30 quadros por segundo; resolução de tela limitada a 2×.

## Fluxo de trabalho

- Conferir no navegador antes de entregar: erros no console, rolagem horizontal no celular, fundo claro com o sistema em tema escuro, os 12 meses e todas as etapas, a versão com movimento reduzido e textos tapando elementos da cena.
