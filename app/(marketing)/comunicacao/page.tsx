import type { Metadata } from "next";
import SiteHeader from "@/components/marketing/SiteHeader";
import PageIntro from "@/components/marketing/PageIntro";
import PhotoBand from "@/components/marketing/PhotoBand";
import SiteFooter from "@/components/marketing/SiteFooter";
import { COMUNICACAO_FAIXA, COMUNICACAO_INTRO } from "@/lib/content/paginas";

export const metadata: Metadata = { title: "Comunicação" };

// Comunicação, Figma frame 18978:2048. The publication grid between the intro
// and the band is issue #49.
export default function ComunicacaoPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageIntro {...COMUNICACAO_INTRO} />
        <PhotoBand {...COMUNICACAO_FAIXA} tone="dark" />
      </main>
      <SiteFooter />
    </>
  );
}
