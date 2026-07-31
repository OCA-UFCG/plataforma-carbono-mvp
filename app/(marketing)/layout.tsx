import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "../globals.css";

// Layout raiz das páginas de marketing. O módulo de mapas tem o seu próprio
// layout raiz em app/(mapa)/, com outra fonte e outro CSS global, então nenhum
// dos dois carrega o estilo do outro.
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Plataforma Carbono Caatinga",
    template: "%s | Plataforma Carbono Caatinga",
  },
  description:
    "Sistema integrado de monitoramento do carbono florestal do bioma Caatinga: dados espaciais, metodologia adaptada ao semiárido, governança e integridade dos mercados de carbono.",
  icons: { icon: "/logos/logo_oca.png" },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={raleway.variable}>{children}</body>
    </html>
  );
}
