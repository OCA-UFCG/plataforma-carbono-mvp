import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";
import ConteudoHeader from "@/components/marketing/conteudo/ConteudoHeader";
import ConteudoSemPdf from "@/components/marketing/conteudo/ConteudoSemPdf";
import { findPublicacao, getComunicacaoContent } from "@/lib/content/comunicacao";
import { getContentfulClient } from "@/lib/contentful";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

// One Contentful read per request, shared by generateMetadata and the page:
// the client POSTs, and fetch only dedupes GETs on its own.
const loadConteudo = cache(() => getComunicacaoContent(getContentfulClient()));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const publicacao = findPublicacao(await loadConteudo(), (await params).slug);

  return publicacao ? { title: publicacao.title } : {};
}

// "Ver conteúdo", Figma frame 19015:13056: one publication, its reader and the
// others beside it. Content comes from the same Contentful read as the
// Comunicação page, with the same fallback to the shipped content.
export default async function ConteudoPage({ params }: Props) {
  const { slug } = await params;
  const conteudo = await loadConteudo();
  const publicacao = findPublicacao(conteudo, slug);

  if (!publicacao) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <div className={`container ${styles.inner}`}>
          <ConteudoHeader publicacao={publicacao} />
          <ConteudoSemPdf publicacao={publicacao} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
