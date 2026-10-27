import type { Metadata } from "next";
import SiteHeader from "@/components/marketing/SiteHeader";
import PageIntro from "@/components/marketing/PageIntro";
import Glossario from "@/components/marketing/Glossario";
import SiteFooter from "@/components/marketing/SiteFooter";
import { GLOSSARIO_PAGINA } from "@/lib/content/paginas";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import { TERMO_PARAM, parseTermo } from "@/lib/glossario/termos";

export const metadata: Metadata = { title: "Glossário" };

// Glossário, Figma frames 19400:12092 (Fotossíntese open) to 19403:25701
// (Manejo agroecológico). The intro band's copy comes from Contentful
// (lib/content/paginas.ts) and the terms from the code (lib/glossario/termos.ts).
// ?termo=<slug> names the open term, so the server renders the one a shared
// link asks for; the former tab, /comunicacao?aba=glossario, redirects here.
export default async function GlossarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ pagina }, params] = await Promise.all([loadSiteCopy({ pagina: GLOSSARIO_PAGINA }), searchParams]);

  return (
    <>
      <SiteHeader />
      <main>
        <PageIntro title={pagina.introTitulo} intro={pagina.introTexto} />
        <Glossario inicial={parseTermo(params[TERMO_PARAM]).slug} />
      </main>
      <SiteFooter />
    </>
  );
}
