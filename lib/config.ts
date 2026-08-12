// O mapa exige sessão. Os layouts privados redirecionam visitantes ao login,
// portanto usuários autenticados podem navegar diretamente para este destino.
export const MAPA_URL = process.env.NEXT_PUBLIC_MAPA_URL ?? "/mapa";
