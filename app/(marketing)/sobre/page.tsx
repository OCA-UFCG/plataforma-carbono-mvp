import type { Metadata } from "next";
import PhotoBand from "@/components/marketing/PhotoBand";
import { SOBRE_FAIXA } from "@/lib/content/paginas";

export const metadata: Metadata = { title: "Conheça a plataforma" };

// "Conheça a plataforma", Figma frame 18988:8611. The page's content above the
// band is issue #47.
export default function SobrePlataformaPage() {
  return <PhotoBand {...SOBRE_FAIXA} tone="warm" />;
}
