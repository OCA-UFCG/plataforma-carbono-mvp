import type { Metadata } from "next";
import SiteHeader from "@/components/marketing/SiteHeader";
import PageIntro from "@/components/marketing/PageIntro";
import Publicacoes from "@/components/marketing/Publicacoes";
import PhotoBand from "@/components/marketing/PhotoBand";
import SiteFooter from "@/components/marketing/SiteFooter";
import { COMUNICACAO_FAIXA, COMUNICACAO_INTRO } from "@/lib/content/paginas";
import { getComunicacaoContent, listPublicacoes } from "@/lib/content/comunicacao";
import { getContentfulClient } from "@/lib/contentful";

export const metadata: Metadata = { title: "Comunicação" };

// Comunicação, Figma frame 18978:2048. The publications come from the same
// Contentful read as the landing's Comunicação section, with the same
// fallback to the shipped content when the CMS is not configured or fails.
export default async function ComunicacaoPage() {
  const conteudo = await getComunicacaoContent(getContentfulClient());

  return (
    <>
      <SiteHeader />
      <main>
        <PageIntro {...COMUNICACAO_INTRO} />
        <Publicacoes publicacoes={listPublicacoes(conteudo)} />
        <PhotoBand {...COMUNICACAO_FAIXA} tone="dark" />
      </main>
      <SiteFooter />
    </>
  );
}
