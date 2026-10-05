import SiteHeader from "@/components/marketing/SiteHeader";
import Hero from "@/components/marketing/Hero";
import Destaques from "@/components/marketing/Destaques";
import Plataforma from "@/components/marketing/Plataforma";
import Ferramenta from "@/components/marketing/Ferramenta";
import Comunicacao from "@/components/marketing/Comunicacao";
import SiteFooter from "@/components/marketing/SiteFooter";
import { getContentfulClient } from "@/lib/contentful";
import { getComunicacaoContent } from "@/lib/content/comunicacao";
import { INICIO_FERRAMENTA, INICIO_HERO } from "@/lib/content/inicio";
import { INICIO_DESTAQUES } from "@/lib/content/destaques";
import { INICIO_PLATAFORMA, abasPlataforma } from "@/lib/content/plataforma";
import { loadSiteCopy } from "@/lib/content/site/fetch";

export default async function LandingPage() {
  const [conteudo, copy] = await Promise.all([
    getComunicacaoContent(getContentfulClient()),
    loadSiteCopy({
      hero: INICIO_HERO,
      destaques: INICIO_DESTAQUES,
      plataforma: INICIO_PLATAFORMA,
      ferramenta: INICIO_FERRAMENTA,
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero copy={copy.hero} />
        <Destaques copy={copy.destaques} />
        <Plataforma titulo={copy.plataforma.titulo} abas={abasPlataforma(copy.plataforma)} />
        <Ferramenta copy={copy.ferramenta} />
        <Comunicacao conteudo={conteudo} />
      </main>
      <SiteFooter />
    </>
  );
}
