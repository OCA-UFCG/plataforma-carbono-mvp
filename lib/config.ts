// O mapa exige sessão. O destino padrão dos CTAs abre o login, que preserva a
// rota interna /mapa após autenticar. A variável mantém suporte a um mapa em
// domínio próprio sem editar os componentes de marketing.
export const MAPA_URL = process.env.NEXT_PUBLIC_MAPA_URL ?? "/login?redirect=/mapa";
