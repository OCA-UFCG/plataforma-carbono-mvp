import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/marketing/SiteHeader";
import PageIntro from "@/components/marketing/PageIntro";
import Publicacoes from "@/components/marketing/Publicacoes";
import PhotoBand from "@/components/marketing/PhotoBand";
import SiteFooter from "@/components/marketing/SiteFooter";
import { COMUNICACAO_FAIXA } from "@/lib/content/paginas";
import { getComunicacaoContent, listPublicacoes } from "@/lib/content/comunicacao";
import { getContentfulClient } from "@/lib/contentful";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ComunicacaoPageMetadata");
  return { title: t("title") };
}

// Comunicação, Figma frame 18978:2048. The publications come from the same
// Contentful read as the landing's Comunicação section, with the same
// fallback to the shipped content when the CMS is not configured or fails.
// Their titles and descriptions are the CMS's, in Portuguese; the labels
// around them are translated.
export default async function ComunicacaoPage() {
  const t = await getTranslations("ComunicacaoPage");
  const conteudo = await getComunicacaoContent(getContentfulClient());

  return (
    <>
      <SiteHeader />
      <main>
        <PageIntro eyebrow={t("intro.eyebrow")} title={t("intro.title")} intro={t("intro.intro")} />
        <Publicacoes publicacoes={listPublicacoes(conteudo)} />
        <PhotoBand
          image={COMUNICACAO_FAIXA.image}
          eyebrow={t("band.eyebrow")}
          title={t("band.title")}
          tone="dark"
        />
      </main>
      <SiteFooter />
    </>
  );
}
