"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBars, FaXmark } from "react-icons/fa6";
import { signOut as firebaseSignOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { HEADER_LINKS, MAPA_LINK, TERRITORIOS_LINK, activeNavHref } from "@/lib/marketing/nav";
import styles from "./SiteHeader.module.css";

// Below this width the inline nav/actions collapse into the hamburger panel.
// Measured, not inherited from the pre-redesign header: `.brand` + `.nav` +
// `.actions` are 153 + 584 + 189px with 16px gaps between them (958px),
// none of it allowed to shrink below content (`flex: none` on `.nav` and
// `.actions`, deliberately — only `.brand` may shrink), plus `--gutter` (80px,
// still 80 in this range — it only drops to 24 at <=768px) on both sides.
// 958 + 160 = 1118px is the narrowest viewport the inline header fits at full
// size; 1200 clears it with margin. This is the only JS/CSS breakpoint pair on
// the branch — this value, the `max-width: 1199px` / `min-width: 1200px` pair
// in SiteHeader.module.css, and the `.toggle`/`.panel` rules they gate must
// all move together, or the hamburger and the inline nav can both render, or
// both vanish.
const DESKTOP_QUERY = "(min-width: 1200px)";

const MOBILE_PANEL_ID = "site-header-mobile-panel";

// The session slot standing in for the Figma "Entrar" button (node 18862:8515,
// button I18862:8515;2810:3921). The marketing layout redirects unauthenticated
// visitors to /login (app/(marketing)/layout.tsx), so anyone who reaches this
// header is already signed in and "Entrar" could never be the right label —
// "Sair" is rendered instead, in the same button: 1px border, 6px radius, 16px
// side padding, hugging its label. Figma's "people" icon is left out: it
// stands for signing in, not out.
//
// This is a plain client component, not AuthProvider: the marketing route group
// deliberately does not mount AuthProvider (it is the one group that doesn't),
// and only the logout action is needed here, not the user object. The two-step
// sequence mirrors components/auth/AuthProvider.tsx's signOut (cookie first,
// then Firebase client state), with the same try/finally discipline so a failed
// fetch still clears client state.
function SessionAction({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await fetch("/api/session", { method: "DELETE" });
    } finally {
      try {
        await firebaseSignOut(getFirebaseAuth());
      } finally {
        window.location.replace("/login");
      }
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => void handleSignOut()}
      disabled={pending}
    >
      Sair
    </button>
  );
}

// The PT-BR / En control from the Figma design (I18862:8515;16825:136014),
// rendered as designed but inert: internationalisation is out of scope, so
// selecting "En" does nothing. --role-neutro-texto-desabilitado is the token
// for that disabled state; it measures 2.50:1 against the background, which
// WCAG allows for an inactive control but not for informative text, so it is
// used only here. `aria-disabled` is documentation for the next developer,
// not something assistive tech consumes — the <span> has no role (it maps
// to `generic`, which does not support `aria-disabled`), so without the
// visually-hidden suffix below it would announce as plain "En", giving no
// indication it does nothing. `title` is not announced on a non-focusable
// element and does not exist on touch, so it is decorative only.
function LanguageSwitch({ className }: { className?: string }) {
  return (
    <div className={className} role="group" aria-label="Idioma">
      <span className={`${styles.languageOption} ${styles.languageOptionActive} text-ui-tab`}>
        PT-BR
      </span>
      <span
        className={`${styles.languageOption} text-ui-tab`}
        aria-disabled="true"
        title="Disponível em breve"
      >
        En
        <span className="sr-only"> (disponível em breve)</span>
      </span>
    </div>
  );
}

// The site header. Keeps rendering a bare <header> (no id): the wrapper is
// what tests/lib/marketingNav.test.ts inspects, and Hero.tsx already owns the
// "inicio" id on its own <section>.
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const activeHref = activeNavHref(usePathname());

  // Auto-close the mobile panel when the viewport widens past the inline nav's
  // breakpoint, so it does not linger over the desktop layout.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Locks page scroll while the panel is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Closes the panel on Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className={styles.siteHeader} aria-label="Cabeçalho">
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label="Página inicial da Caativar">
          {/* The Caativar lockup, Figma I18862:8515;19090:30266 (153x38). The
              header places it as a raster PNG; public/logos/caativar.svg is
              the same artwork exported as vectors from the logo board on the
              "Área trabalho" page (node 19099:6670); rendered at the PNG's
              1381px width, its bounds match the PNG's to the pixel. The
              link's aria-label names it, so the image itself is decorative. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma logo */}
          <img
            src="/logos/caativar.svg"
            alt=""
            width={153}
            height={38}
            className={styles.brandLogo}
          />
        </Link>

        <nav className={styles.nav} aria-label="Navegação principal">
          {HEADER_LINKS.map((link) => {
            // The entry that owns the current route (activeNavHref): "Início"
            // on the landing, "Sobre" on every /sobre/* page, as in Figma node
            // 18988:8612.
            const active = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${active ? `text-ui-bold ${styles.navLinkActive}` : "text-ui-medium"}`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          {/* TERRITORIOS_LINK and MAPA_LINK cross a route group: a full page
              load, not next/link. Neither is ever active, as the header only
              renders inside the marketing group. */}
          <a href={TERRITORIOS_LINK.href} className={`${styles.navLink} text-ui-medium`}>
            {TERRITORIOS_LINK.label}
          </a>
          <a href={MAPA_LINK.href} className={`${styles.mapaButton} text-ui-medium`}>
            {MAPA_LINK.label}
          </a>
        </nav>

        <div className={styles.actions}>
          <LanguageSwitch className={styles.language} />
          <SessionAction className={`${styles.sessionButton} text-ui-medium`} />

          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={MOBILE_PANEL_ID}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <FaXmark aria-hidden /> : <FaBars aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile panel, styled after the Figma "Menu expandido mobile"
          component (8702:48799): a white, rounded, shadowed card holding the
          nav stacked vertically, adapted to this header's own three links
          instead of that component's unrelated example content. */}
      <div id={MOBILE_PANEL_ID} className={styles.panel} hidden={!open}>
        <nav className={styles.panelNav} aria-label="Navegação móvel">
          {HEADER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.panelLink} text-p-ui`}
              aria-current={link.href === activeHref ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={TERRITORIOS_LINK.href}
            className={`${styles.panelLink} text-p-ui`}
            onClick={() => setOpen(false)}
          >
            {TERRITORIOS_LINK.label}
          </a>
          <a
            href={MAPA_LINK.href}
            className={`${styles.panelMapaButton} text-body`}
            onClick={() => setOpen(false)}
          >
            {MAPA_LINK.label}
          </a>
        </nav>
        <div className={styles.panelActions}>
          <LanguageSwitch className={styles.language} />
          <SessionAction className={`${styles.sessionButton} text-ui-medium`} />
        </div>
      </div>
    </header>
  );
}
