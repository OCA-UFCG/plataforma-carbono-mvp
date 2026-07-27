import Link from "next/link";
import { PLATFORM_URL } from "@/lib/config";

export default function SiteHeader() {
  return (
    <header className="header">
      <Link href="/" className="header-marca" aria-label="Página inicial">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/logo_oca.png"
          alt="OCA, Observatório da Caatinga e Desertificação"
        />
        <span className="header-divisor" aria-hidden />
        <span className="header-wordmark">
          Plataforma
          <br />
          Carbono Caatinga
        </span>
      </Link>
      <nav className="header-nav" aria-label="Navegação principal">
        <Link href="/#bioma">O bioma</Link>
        <Link href="/#ameacas">Ameaças</Link>
        <Link href="/#plataforma">A plataforma</Link>
        <Link href="/#comunicacao">Comunicação</Link>
        <Link href="/#paleta">A paleta</Link>
        <a href={PLATFORM_URL} className="btn btn--primario btn--sm">
          Acessar a plataforma
        </a>
      </nav>
    </header>
  );
}
