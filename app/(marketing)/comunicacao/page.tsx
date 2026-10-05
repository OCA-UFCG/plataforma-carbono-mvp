import type { Metadata } from "next";
import SiteHeader from "@/components/marketing/SiteHeader";
import PageIntro from "@/components/marketing/PageIntro";
import Publicacoes from "@/components/marketing/Publicacoes";
import PhotoBand from "@/components/marketing/PhotoBand";
import SiteFooter from "@/components/marketing/SiteFooter";
import { COMUNICACAO_FAIXA_IMAGEM, COMUNICACAO_PAGINA } from "@/lib/content/paginas";
import { getComunicacaoContent, listPublicacoes } from "@/lib/content/comunicacao";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import { getContentfulClient } from "@/lib/contentful";

export const metadata: Metadata = { title: "Comunicação" };

// Comunicação, Figma frame 18978:2048. The publications come from the same
// Contentful read as the landing's Comunicação section, with the same
// fallback to the shipped content when the CMS is not configured or fails;
// so does the copy around them (lib/content/paginas.ts).
export default async function ComunicacaoPage() {
  const [conteudo, { pagina }] = await Promise.all([
    getComunicacaoContent(getContentfulClient()),
    loadSiteCopy({ pagina: COMUNICACAO_PAGINA }),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <PageIntro eyebrow={pagina.introChamada} title={pagina.introTitulo} intro={pagina.introTexto} />
        <Publicacoes publicacoes={listPublicacoes(conteudo)} />
        <PhotoBand
          image={COMUNICACAO_FAIXA_IMAGEM}
          eyebrow={pagina.faixaChamada}
          title={pagina.faixaTitulo}
          tone="dark"
        />
      </main>
      <SiteFooter />
    </>
  );
}
