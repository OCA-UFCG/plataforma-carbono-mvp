import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "../globals.css";
import { Analytics } from "@/components/Analytics";
import { FAVICON } from "@/lib/favicon";
import { MARKETING_NAMESPACES, clientMessages } from "@/i18n/clientMessages";
import { Announcer } from "@/components/a11y/Announcer";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    title: {
      default: "Caativar",
      template: "%s | Caativar",
    },
    description: t("description"),
    icons: FAVICON,
  };
}

// <html> stays "pt-BR" in either language: not every page is translated yet,
// so the header, the footer and a translated page's <main> each declare the
// language they render in.
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${rubik.variable} ${archivoNarrow.variable} ${inter.variable} ${archivo.variable}`}>
        <NextIntlClientProvider messages={await clientMessages(MARKETING_NAMESPACES)}>{children}</NextIntlClientProvider>
        <Analytics />
        <Announcer />
      </body>
    </html>
  );
}
