// O mapa exige sessão. Os layouts privados redirecionam visitantes ao login,
// portanto usuários autenticados podem navegar diretamente para este destino.
export const MAPA_URL = process.env.NEXT_PUBLIC_MAPA_URL ?? "/mapa";

// ID de métrica do Google Analytics (GA4, formato "G-XXXXXXXXXX"). Ausente em
// desenvolvimento local por padrão; sem ele o componente <Analytics> não renderiza nada.
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
