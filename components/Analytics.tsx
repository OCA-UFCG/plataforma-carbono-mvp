import { GoogleAnalytics } from "@next/third-parties/google";
import { GA_MEASUREMENT_ID } from "@/lib/config";

// Compartilhado pelos três root layouts (marketing, mapa, auth) já que não há
// um app/layout.tsx único. Sem NEXT_PUBLIC_GA_MEASUREMENT_ID (ex.: dev local),
// não renderiza nada.
export function Analytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
