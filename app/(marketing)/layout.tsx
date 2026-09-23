import type { Metadata } from "next";
import { Archivo_Narrow, Rubik } from "next/font/google";
import { redirect } from "next/navigation";
import "../globals.css";
import { getAuthenticatedSession } from "@/lib/auth";
import { Analytics } from "@/components/Analytics";

// Root layout of the marketing pages. The maps module has its own root layout
// in app/(mapa)/, with a different font and a different global CSS, so neither
// of the two loads the other's style.
const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

// Self-hosted like Rubik above, rather than a Google Fonts @import in a CSS
// module: keeps every face on the same loading strategy. Named for its role
// (a display face for oversized headings) rather than the family, so a future
// face swap only touches this call, not Hero.module.css. Currently the only
// consumer is the hero h1 (Figma node 18862:8525), which has no bound Figma
// variable and reads weight 700 off that node.
const archivoNarrow = Archivo_Narrow({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Caativar",
    template: "%s | Caativar",
  },
  description:
    "Sistema integrado de monitoramento do carbono florestal do bioma Caatinga: dados espaciais, metodologia adaptada ao semiárido, governança e integridade dos mercados de carbono.",
  icons: { icon: "/logos/logo_oca.png" },
};

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getAuthenticatedSession())) redirect("/login?redirect=/");

  return (
    <html lang="pt-BR">
      <body className={`${rubik.variable} ${archivoNarrow.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
