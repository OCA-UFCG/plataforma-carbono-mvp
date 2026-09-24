import SiteHeader from "@/components/marketing/SiteHeader";
import PageIntro from "@/components/marketing/PageIntro";
import SobreSubnav from "@/components/marketing/SobreSubnav";
import SiteFooter from "@/components/marketing/SiteFooter";
import { SOBRE_INTRO } from "@/lib/content/paginas";

// Shared frame of the four Sobre pages (Figma 18988:8611, 8667, 8769, 8943):
// the same intro band and sub-navigation on every one, then the page's own
// content. A nested layout, not a root one: the session check, the fonts and
// globals.css all still come from app/(marketing)/layout.tsx.
export default function SobreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>
        <PageIntro {...SOBRE_INTRO} />
        <SobreSubnav />
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
