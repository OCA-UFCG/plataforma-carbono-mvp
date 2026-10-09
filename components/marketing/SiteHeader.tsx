"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBars, FaXmark } from "react-icons/fa6";
import { HEADER_LINKS, MAPA_LINK, TERRITORIOS_LINK, activeNavHref } from "@/lib/marketing/nav";
import HeaderLogo from "./HeaderLogo";
import styles from "./SiteHeader.module.css";

// Below this width the inline nav/actions collapse into the hamburger panel.
// Measured, not inherited from the pre-redesign header: `.brand` + `.nav` +
// `.actions` are 188 + 584 + 107px with 16px gaps between them (911px),
// none of it allowed to shrink (`flex: none` on all three), plus `--gutter`
// (80px, still 80 in this range — it only drops to 24 at <=768px) on both
// sides. The wordmark overruns `.brand` by 9px, inside the 16px gap.
// 911 + 160 = 1071px is the narrowest viewport the inline header fits at;
// 1200 clears it with margin. This is the only JS/CSS breakpoint pair on
// the branch — this value, the `max-width: 1199px` / `min-width: 1200px` pair
// in SiteHeader.module.css, and the `.toggle`/`.panel` rules they gate must
// all move together, or the hamburger and the inline nav can both render, or
// both vanish.
const DESKTOP_QUERY = "(min-width: 1200px)";

const MOBILE_PANEL_ID = "site-header-mobile-panel";

// The PT-BR / En control from the Figma design (19272:44342),
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
  const territoriosActive = activeHref === TERRITORIOS_LINK.href;

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
          <HeaderLogo />
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
              load, not next/link. The story renders this header too and marks
              its own entry (Figma 19254:37327). */}
          <a
            href={TERRITORIOS_LINK.href}
            className={`${styles.navLink} ${territoriosActive ? `text-ui-bold ${styles.navLinkActive}` : "text-ui-medium"}`}
            aria-current={territoriosActive ? "page" : undefined}
          >
            {TERRITORIOS_LINK.label}
          </a>
          <a href={MAPA_LINK.href} className={`${styles.mapaButton} text-ui-medium`}>
            {MAPA_LINK.label}
          </a>
        </nav>

        <div className={styles.actions}>
          <LanguageSwitch className={styles.language} />
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
            aria-current={territoriosActive ? "page" : undefined}
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
        </div>
      </div>
    </header>
  );
}
