// Destino do botão "Acessar a plataforma". A plataforma mora na rota /plataforma
// desta mesma aplicação; a variável existe só para o caso de ele voltar a ser
// publicado em um domínio próprio, sem precisar editar componente por componente.
// Sempre use <a href> (não next/link): /plataforma tem outro layout raiz, então
// a navegação precisa ser um carregamento de página inteiro.
export const PLATFORM_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL ?? "/plataforma";
