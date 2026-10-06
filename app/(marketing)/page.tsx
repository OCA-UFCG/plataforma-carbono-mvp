import SiteHeader from "@/components/marketing/SiteHeader";
import Hero from "@/components/marketing/Hero";
import Destaques from "@/components/marketing/Destaques";
import Plataforma from "@/components/marketing/Plataforma";
import Caminhos from "@/components/marketing/Caminhos";
import Comunicacao from "@/components/marketing/Comunicacao";
import SiteFooter from "@/components/marketing/SiteFooter";
import { getContentfulClient } from "@/lib/contentful";
import { getComunicacaoContent } from "@/lib/content/comunicacao";
import { INICIO_HERO } from "@/lib/content/inicio";
import { INICIO_DESTAQUES } from "@/lib/content/destaques";
import { INICIO_PLATAFORMA, abasPlataforma } from "@/lib/content/plataforma";
import { INICIO_CAMINHOS, caminhosCards } from "@/lib/content/caminhos";
import { loadSiteCopy } from "@/lib/content/site/fetch";

export default async function LandingPage() {
  const [conteudo, copy] = await Promise.all([
    getComunicacaoContent(getContentfulClient()),
    loadSiteCopy({
      hero: INICIO_HERO,
      destaques: INICIO_DESTAQUES,
      plataforma: INICIO_PLATAFORMA,
      caminhos: INICIO_CAMINHOS,
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero copy={copy.hero} />
        <Destaques copy={copy.destaques} />
        <Plataforma titulo={copy.plataforma.titulo} abas={abasPlataforma(copy.plataforma)} />
        <Caminhos
          chamada={copy.caminhos.chamada}
          titulo={copy.caminhos.titulo}
          cards={caminhosCards(copy.caminhos)}
        />
        <Comunicacao conteudo={conteudo} />
      </main>
      <SiteFooter />
    </>
  );
}
