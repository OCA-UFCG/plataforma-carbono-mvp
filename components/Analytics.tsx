import { GoogleAnalytics } from "@next/third-parties/google";
import { GA_MEASUREMENT_ID } from "@/lib/config";

// Shared by the three root layouts (marketing, mapa, auth) since there is no
// single app/layout.tsx. Without NEXT_PUBLIC_GA_MEASUREMENT_ID (e.g. local dev),
// it renders nothing.
export function Analytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
