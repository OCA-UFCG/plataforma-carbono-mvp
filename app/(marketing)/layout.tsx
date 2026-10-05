import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "../globals.css";
import { getAuthenticatedSession, loginRedirect } from "@/lib/auth";
import { REQUEST_PATH_HEADER } from "@/lib/marketing/requestPath";
import { Analytics } from "@/components/Analytics";
import { FAVICON } from "@/lib/favicon";
import { archivo, archivoNarrow, inter, rubik } from "../fonts/marketing";

// Root layout of the marketing pages. The maps module has its own root layout
// in app/(mapa)/, with a different font and a different global CSS, so neither
// of the two loads the other's style.

export const metadata: Metadata = {
  title: {
    default: "Caativar",
    template: "%s | Caativar",
  },
  description:
    "Sistema integrado de monitoramento do carbono florestal do bioma Caatinga: dados espaciais, metodologia adaptada ao semiárido, governança e integridade dos mercados de carbono.",
  icons: FAVICON,
};

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The requested path comes from proxy.ts; without it the visitor would be
  // sent back to "/" after logging in, whichever page they had asked for.
  if (!(await getAuthenticatedSession())) {
    redirect(loginRedirect((await headers()).get(REQUEST_PATH_HEADER)));
  }

  return (
    <html lang="pt-BR">
      <body className={`${rubik.variable} ${archivoNarrow.variable} ${inter.variable} ${archivo.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
