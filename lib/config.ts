// Destino dos botões que levam ao módulo de mapas e análises. "Plataforma"
// designa o conjunto (site institucional mais os módulos); o módulo geoespacial
// mora na rota /mapa desta mesma aplicação. A variável existe só para o caso de
// ele voltar a ser publicado em domínio próprio, sem editar componente a
// componente. Sempre use <a href> (não next/link): /mapa tem outro layout raiz,
// então a navegação precisa ser um carregamento de página inteiro.
export const MAPA_URL = process.env.NEXT_PUBLIC_MAPA_URL ?? "/mapa";
