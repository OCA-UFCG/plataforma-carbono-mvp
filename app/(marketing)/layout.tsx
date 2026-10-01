import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "../globals.css";
import { getAuthenticatedSession, loginRedirect } from "@/lib/auth";
import { REQUEST_PATH_HEADER } from "@/lib/marketing/requestPath";
import { Analytics } from "@/components/Analytics";
import { HTML_LANG, type Locale } from "@/translations/config";
import { CLIENT_NAMESPACES, pickMessages } from "@/translations/clientNamespaces";
import { archivoNarrow, rubik } from "../fonts/marketing";

// Root layout of the marketing pages. The maps module has its own root layout
// in app/(mapa)/, with a different font and a different global CSS, so neither
// of the two loads the other's style.

// The description follows the language cookie. The default title is the brand;
// each page sets its own translated title, which the template completes.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    title: {
      default: "Caativar",
      template: "%s | Caativar",
    },
    description: t("description"),
    icons: { icon: "/logos/logo_oca.png" },
  };
}

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

  // The language comes from the cookie the header's switch writes (see
  // translations/request.ts), so this layout, like the session check above,
  // renders per request. Every route group does the same, each in its own root
  // layout, since there is no shared one.
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();

  return (
    <html lang={HTML_LANG[locale]}>
      <body className={`${rubik.variable} ${archivoNarrow.variable}`}>
        <NextIntlClientProvider messages={pickMessages(messages, CLIENT_NAMESPACES.marketing)}>{children}</NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
