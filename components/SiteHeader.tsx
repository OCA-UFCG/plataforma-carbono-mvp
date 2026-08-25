"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaBars, FaXmark } from "react-icons/fa6";
import { MAPA_URL } from "@/lib/config";

// Navigation links, shared between the inline nav (desktop) and the overlay
// panel (mobile). Keep the order in sync with the landing page sections.
const LINKS = [
  { href: "/#bioma", label: "O bioma" },
  { href: "/#ameacas", label: "Ameaças" },
  { href: "/#mapa", label: "Mapas e análises" },
  { href: "/#comunicacao", label: "Comunicação" },
  { href: "/#paleta", label: "A paleta" },
];

export default function SiteHeader() {
  const [aberto, setAberto] = useState(false);

  // Closes the panel when resizing out of the mobile range, so it does not stay
  // open on top of the inline nav when the user widens the window.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const aoMudar = () => {
      if (mq.matches) setAberto(false);
    };
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  // Locks body scrolling while the panel is open, the usual mobile menu pattern.
  useEffect(() => {
    if (!aberto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [aberto]);

  // Closes the panel with the Escape key.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

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
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
        <a href={MAPA_URL} className="btn btn--primario btn--sm">
          Abrir os mapas
        </a>
      </nav>

      <button
        type="button"
        className="header-hamburguer"
        aria-expanded={aberto}
        aria-controls="header-painel"
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? <FaXmark aria-hidden /> : <FaBars aria-hidden />}
      </button>

      <div
        id="header-painel"
        className={`header-painel${aberto ? " header-painel--aberto" : ""}`}
        hidden={!aberto}
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setAberto(false)}
          >
            {l.label}
          </Link>
        ))}
        <a
          href={MAPA_URL}
          className="btn btn--primario btn--sm"
          onClick={() => setAberto(false)}
        >
          Abrir os mapas
        </a>
      </div>
    </header>
  );
}
