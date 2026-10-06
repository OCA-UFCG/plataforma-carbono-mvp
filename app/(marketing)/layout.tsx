import type { Metadata } from "next";
import "../globals.css";
import { Analytics } from "@/components/Analytics";
import { FAVICON } from "@/lib/favicon";
import { archivo, archivoNarrow, inter, rubik } from "../fonts/marketing";

// Root layout of the marketing pages. The maps module has its own root layout
// in app/(mapa)/, with a different font and a different global CSS, so neither
// of the two loads the other's style.
//
// These pages are public: the login only opens the platform (/mapa and
// /relatorio), whose layouts check the session.

// Rendered per request, as they were while this layout read the session
// cookie. Prerendered at build time, they would need the Contentful
// credentials in the build and would keep the fallback copy without them.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Caativar",
    template: "%s | Caativar",
  },
  description:
    "Sistema integrado de monitoramento do carbono florestal do bioma Caatinga: dados espaciais, metodologia adaptada ao semiárido, governança e integridade dos mercados de carbono.",
  icons: FAVICON,
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${rubik.variable} ${archivoNarrow.variable} ${inter.variable} ${archivo.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
