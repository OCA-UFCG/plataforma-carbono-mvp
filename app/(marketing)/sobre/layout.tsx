import SiteHeader from "@/components/marketing/SiteHeader";
import PageIntro from "@/components/marketing/PageIntro";
import SobreSubnav from "@/components/marketing/SobreSubnav";
import SiteFooter from "@/components/marketing/SiteFooter";
import { SOBRE_INTRO } from "@/lib/content/paginas";
import { loadSiteCopy } from "@/lib/content/site/fetch";

// Shared frame of the four Sobre pages (Figma 18988:8611, 8667, 8769, 8943):
// the same intro band and sub-navigation on every one, then the page's own
// content. A nested layout, not a root one: the session check, the fonts and
// globals.css all still come from app/(marketing)/layout.tsx.
export default async function SobreLayout({ children }: { children: React.ReactNode }) {
  const { intro } = await loadSiteCopy({ intro: SOBRE_INTRO });

  return (
    <>
      <SiteHeader />
      <main>
        <PageIntro eyebrow={intro.chamada} title={intro.titulo} intro={intro.texto} />
        <SobreSubnav />
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
