import type { Metadata } from "next";
import SiteHeader from "@/components/marketing/SiteHeader";
import PageIntro from "@/components/marketing/PageIntro";
import ComunicacaoAbas from "@/components/marketing/ComunicacaoAbas";
import Publicacoes from "@/components/marketing/Publicacoes";
import Eventos from "@/components/marketing/Eventos";
import SiteFooter from "@/components/marketing/SiteFooter";
import { COMUNICACAO_PAGINA } from "@/lib/content/paginas";
import { getComunicacaoContent, listPublicacoes } from "@/lib/content/comunicacao";
import { getEventos } from "@/lib/content/eventos";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import { getContentfulClient } from "@/lib/contentful";
import { ABA_PARAM, parseAba } from "@/lib/marketing/comunicacaoAbas";

export const metadata: Metadata = { title: "Comunicação" };

// Comunicação, Figma frames 19254:15623 (the "Conteúdo" tab) and 19254:16041
// ("Eventos e articulações"). The publications come from the same Contentful
// read as the landing's Comunicação section, and the events from one of their
// own, each with its fallback to the shipped content when the CMS is not
// configured or fails; so does the copy around them (lib/content/paginas.ts).
// The intro band is the same on both tabs. The design's photo band above the
// footer, "Esse espaço está crescendo", was taken out on 2026-10-06; an "Em
// breve" slot closes the grid instead (Publicacoes.tsx). ?aba=eventos opens
// the second tab (lib/marketing/comunicacaoAbas.ts).
export default async function ComunicacaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const getContent = getContentfulClient();
  const [conteudo, eventos, { pagina }, params] = await Promise.all([
    getComunicacaoContent(getContent),
    getEventos(getContent),
    loadSiteCopy({ pagina: COMUNICACAO_PAGINA }),
    searchParams,
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <PageIntro title={pagina.introTitulo} intro={pagina.introTexto} />
        <ComunicacaoAbas
          inicial={parseAba(params[ABA_PARAM])}
          paineis={{
            conteudo: <Publicacoes publicacoes={listPublicacoes(conteudo)} />,
            eventos: <Eventos eventos={eventos} />,
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
