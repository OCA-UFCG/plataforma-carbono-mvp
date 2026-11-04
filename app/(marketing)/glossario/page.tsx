import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/marketing/SiteHeader";
import Glossario from "@/components/marketing/Glossario";
import SiteFooter from "@/components/marketing/SiteFooter";
import { GLOSSARIO_PAGINA } from "@/lib/content/paginas";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import { getSiteLocale } from "@/i18n/siteLocale";
import { HTML_LANG } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Nav"))("glossario") };
}

// Glossário, Figma frame 19507:12478 (Fotossíntese open). The page has no
// intro band: its title heads the sidebar, from Contentful
// (lib/content/paginas.ts), and the terms come from the code
// (lib/glossario/termos.ts).
// ?termo=<slug> names the open term, which Glossario reads from the address,
// so the server renders the one a shared link asks for; the former tab,
// /comunicacao?aba=glossario, redirects here. Glossario calls
// useSearchParams() with no Suspense boundary, which builds only because the
// marketing layout is force-dynamic. If that changes, read `searchParams`
// here and pass the term down instead: a Suspense boundary would stop the
// server rendering the linked term.
export default async function GlossarioPage() {
  const locale = await getSiteLocale();
  const { pagina } = await loadSiteCopy({ pagina: GLOSSARIO_PAGINA }, undefined, locale);

  return (
    <>
      <SiteHeader />
      <main lang={HTML_LANG[locale]}>
        <Glossario titulo={pagina.introTitulo} />
      </main>
      <SiteFooter />
    </>
  );
}
