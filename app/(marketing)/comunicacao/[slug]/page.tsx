import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";
import ConteudoHeader from "@/components/marketing/conteudo/ConteudoHeader";
import ConteudoSemPdf from "@/components/marketing/conteudo/ConteudoSemPdf";
import PdfViewerLoader from "@/components/marketing/conteudo/PdfViewerLoader";
import RelatedContent from "@/components/marketing/conteudo/RelatedContent";
import { findPublicacao, getComunicacaoContent, relatedPublicacoes } from "@/lib/content/comunicacao";
import { getContentfulClient } from "@/lib/contentful";
import { HTML_LANG, readSiteLocale, type SiteLocale } from "@/lib/locale";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

// One Contentful read per request, shared by generateMetadata and the page:
// the client POSTs, and fetch only dedupes GETs on its own. The address is
// the same in both languages; the title and the description follow the
// visitor's (the PDF itself is Portuguese only).
const loadConteudo = cache((locale: SiteLocale) => getComunicacaoContent(getContentfulClient(), locale));

async function siteLocale(): Promise<SiteLocale> {
  return readSiteLocale(await getLocale());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const publicacao = findPublicacao(await loadConteudo(await siteLocale()), (await params).slug);

  return publicacao ? { title: publicacao.title } : {};
}

// "Ver conteúdo", Figma frame 19015:13056: one publication, its reader and the
// others beside it. Content comes from the same Contentful read as the
// Comunicação page, with the same fallback to the shipped content.
export default async function ConteudoPage({ params }: Props) {
  const { slug } = await params;
  const locale = await siteLocale();
  const conteudo = await loadConteudo(locale);
  const publicacao = findPublicacao(conteudo, slug);

  if (!publicacao) notFound();

  return (
    <>
      <SiteHeader />
      <main lang={HTML_LANG[locale]}>
        <div className={`container ${styles.inner}`}>
          <ConteudoHeader publicacao={publicacao} />
          {publicacao.pdf ? (
            <PdfViewerLoader
              url={publicacao.pdf}
              title={publicacao.title}
              fileName={publicacao.pdfFileName ?? `${slug}.pdf`}
              cover={publicacao.cover}
            />
          ) : (
            <ConteudoSemPdf publicacao={publicacao} />
          )}
        </div>
        <RelatedContent publicacoes={relatedPublicacoes(conteudo, slug)} />
      </main>
      <SiteFooter />
    </>
  );
}
