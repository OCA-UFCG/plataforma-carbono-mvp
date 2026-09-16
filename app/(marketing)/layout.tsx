import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import { redirect } from "next/navigation";
import "../globals.css";
import { getAuthenticatedSession } from "@/lib/auth";
import { Analytics } from "@/components/Analytics";

// Root layout of the marketing pages. The maps module has its own root layout
// in app/(mapa)/, with a different font and a different global CSS, so neither
// of the two loads the other's style.
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-sans",
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
      <body className={raleway.variable}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
