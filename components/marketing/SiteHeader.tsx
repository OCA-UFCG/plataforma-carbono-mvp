"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaBars, FaXmark } from "react-icons/fa6";
import { signOut as firebaseSignOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { LANGUAGE_OPTIONS } from "@/translations/config";
import { useLocaleSwitch } from "@/translations/useLocaleSwitch";
import { HEADER_LINKS, MAPA_LINK, activeNavHref } from "@/lib/marketing/nav";
import styles from "./SiteHeader.module.css";

// Below this width the inline nav/actions collapse into the hamburger panel.
// Measured, not inherited from the pre-redesign header: `.brand` + `.nav` +
// `.actions` are 153 + 466 + 247px with 16px gaps between them (898px),
// none of it allowed to shrink below content (`flex: none` on `.nav` and
// `.actions`, deliberately — only `.brand` may shrink), plus `--gutter` (80px, still 80 in this range — it only drops
// to 24 at <=768px) on both sides. 898 + 160 = 1058px is the narrowest
// viewport the inline header actually fits; 1200 clears it with margin. This
// is the only JS/CSS breakpoint pair on the branch — this value, the
// `max-width: 1199px` / `min-width: 1200px` pair in SiteHeader.module.css,
// and the `.toggle`/`.panel` rules they gate must all move together, or the
// hamburger and the inline nav can both render, or both vanish.
const DESKTOP_QUERY = "(min-width: 1200px)";

const MOBILE_PANEL_ID = "site-header-mobile-panel";

// The session slot standing in for the Figma "Entrar" button (node 18862:8515,
// button I18862:8515;2810:3921). The marketing layout redirects unauthenticated
// visitors to /login (app/(marketing)/layout.tsx), so anyone who reaches this
// header is already signed in and "Entrar" could never be the right label —
// "Sair" is rendered instead, at the same 114x40 geometry.
//
// This is a plain client component, not AuthProvider: the marketing route group
// deliberately does not mount AuthProvider (it is the one group that doesn't),
// and only the logout action is needed here, not the user object. The two-step
// sequence mirrors components/auth/AuthProvider.tsx's signOut (cookie first,
// then Firebase client state), with the same try/finally discipline so a failed
// fetch still clears client state.
function SessionAction({ className }: { className?: string }) {
  const t = useTranslations("SiteHeader");
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
      {t("signOut")}
    </button>
  );
}

// The PT-BR / En control from the Figma design (I18862:8515;16825:136014).
// Choosing a language stores it in the NEXT_LOCALE cookie (server action), then
// refreshes the route so the server components re-render in that language;
// client state, like an open mobile panel, survives the refresh. Both
// instances (desktop and mobile panel) read the same active locale, so they
// stay in sync without sharing state.
function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("SiteHeader");
  const { active, pending, choose } = useLocaleSwitch();

  return (
    <div className={className} role="group" aria-label={t("languageSwitch")}>
      {LANGUAGE_OPTIONS.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.languageOption}${isActive ? ` ${styles.languageOptionActive}` : ""} text-subtle-semibold`}
            aria-pressed={isActive}
            lang={option.lang}
            disabled={pending}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// The site header. Keeps rendering a bare <header> (no id): the wrapper is
// what tests/lib/marketingNav.test.ts inspects, and Hero.tsx already owns the
// "inicio" id on its own <section>.
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("SiteHeader");
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
    <header className={styles.siteHeader} aria-label={t("ariaLabel")}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={t("homeAria")}>
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

        <nav className={styles.nav} aria-label={t("mainNav")}>
          {HEADER_LINKS.map((link) => {
            // The entry that owns the current route (activeNavHref): "Início"
            // on the landing, "Sobre a plataforma" on every /sobre/* page, as
            // in Figma node 18988:8612.
            const active = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} text-body${active ? ` ${styles.navLinkActive}` : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {t(`nav.${link.key}`)}
              </Link>
            );
          })}
          {/* MAPA_LINK crosses a route group: a full page load, not next/link. */}
          <a href={MAPA_LINK.href} className={`${styles.mapaButton} text-body`}>
            {t(`nav.${MAPA_LINK.key}`)}
          </a>
        </nav>

        <div className={styles.actions}>
          <LanguageSwitch className={styles.language} />
          <SessionAction className={`${styles.sessionButton} text-subtle-semibold`} />

          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={MOBILE_PANEL_ID}
            aria-label={open ? t("closeMenu") : t("openMenu")}
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
        <nav className={styles.panelNav} aria-label={t("mobileNav")}>
          {HEADER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.panelLink} text-p-ui`}
              aria-current={link.href === activeHref ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {t(`nav.${link.key}`)}
            </Link>
          ))}
          <a
            href={MAPA_LINK.href}
            className={`${styles.panelMapaButton} text-body`}
            onClick={() => setOpen(false)}
          >
            {t(`nav.${MAPA_LINK.key}`)}
          </a>
        </nav>
        <div className={styles.panelActions}>
          <LanguageSwitch className={styles.language} />
          <SessionAction className={`${styles.sessionButton} text-subtle-semibold`} />
        </div>
      </div>
    </header>
  );
}
