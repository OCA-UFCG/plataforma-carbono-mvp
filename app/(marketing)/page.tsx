import SiteHeader from "@/components/marketing/SiteHeader";
import Hero from "@/components/marketing/Hero";
import Destaques from "@/components/marketing/Destaques";
import Plataforma from "@/components/marketing/Plataforma";
import Ferramenta from "@/components/marketing/Ferramenta";
import Comunicacao from "@/components/marketing/Comunicacao";
import SiteFooter from "@/components/marketing/SiteFooter";
import { getContentfulClient } from "@/lib/contentful";
import { getComunicacaoContent } from "@/lib/content/comunicacao";

export default async function LandingPage() {
  const conteudo = await getComunicacaoContent(getContentfulClient());

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Destaques />
        <Plataforma />
        <Ferramenta />
        <Comunicacao conteudo={conteudo} />
      </main>
      <SiteFooter />
    </>
  );
}
