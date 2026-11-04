"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaBars, FaXmark } from "react-icons/fa6";
import { useAuth } from "@/components/auth/AuthProvider";
import { HEADER_LINKS, MAPA_LINK, TERRITORIOS_LINK, activeNavHref } from "@/lib/marketing/nav";
import { HTML_LANG, type SiteLocale } from "@/lib/locale";
import styles from "./SiteHeader.module.css";
import { useSiteLocale } from "./useSiteLocale";

// Below this width the inline nav/actions collapse into the hamburger panel.
// Measured, not inherited from the pre-redesign header: `.brand` + `.nav` +
// `.actions` are 188 + 696 + 107px with 16px gaps between them (1023px), plus
// `--gutter` (80px, still 80 in this range — it only drops to 24 at <=768px)
// on both sides. The wordmark overruns `.brand` by 18px, 2px more than the
// gap. 1023 + 2 + 160 = 1185px is the narrowest viewport the marketing header
// fits at. The platform's header is wider: the ring of the active
// "Plataforma" adds 6px to `.nav`, and the account slot adds 16 + 58px of
// "Sair" to `.actions`, 1265px in all; 1280 clears both. The account e-mail
// is not counted: it is the one thing in the bar that shrinks, and it only
// shows from 1400px (SiteHeader.module.css). This is the only JS/CSS
// breakpoint pair on the branch — this value, the `max-width: 1279px` /
// `min-width: 1280px` pair in SiteHeader.module.css, and the
// `.toggle`/`.panel` rules they gate must all move together, or the hamburger
// and the inline nav can both render, or both vanish.
const DESKTOP_QUERY = "(min-width: 1280px)";

const MOBILE_PANEL_ID = "site-header-mobile-panel";

// Each language names itself, so these two labels are not translated.
const LANGUAGES: { locale: SiteLocale; label: string }[] = [
  { locale: "pt", label: "PT-BR" },
  { locale: "en", label: "En" },
];

// The PT-BR / En control from the Figma design (19272:44342). Each option is a
// toggle button, the chosen one pressed and filled; `lang` makes a screen
// reader say "En" in English. Choosing writes the NEXT_LOCALE cookie and
// renders the page again. So far only the landing page is in English: the
// other pages keep their Portuguese under this header.
function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("SiteHeader");
  const [locale, chooseLocale] = useSiteLocale();

  return (
    <div className={className} role="group" aria-label={t("language")}>
      {LANGUAGES.map((option) => {
        const active = option.locale === locale;

        return (
          <button
            key={option.locale}
            type="button"
            lang={HTML_LANG[option.locale]}
            className={`${styles.languageOption} ${active ? styles.languageOptionActive : ""} text-ui-tab`}
            aria-pressed={active}
            onClick={() => {
              if (!active) chooseLocale(option.locale);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// The platform's session slot (Figma 19414:55016, in the "Menu-superior"
// instance 19413:54303 of the platform frame): the account's e-mail and
// "Sair". Its own component because it reads the session, which only the
// platform's header asks for.
function AccountSlot({ className }: { className?: string }) {
  const t = useTranslations("SiteHeader");
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    setLeaving(true);
    await signOut();
    window.location.replace("/login");
  }

  return (
    <div className={`${styles.account} ${className ?? ""}`}>
      {user?.email && (
        <span className={`${styles.accountEmail} text-ui-regular`} title={user.email}>
          {user.email}
        </span>
      )}
      <button type="button" className={`${styles.signOut} text-ui-medium`} onClick={leave} disabled={leaving}>
        {t("signOut")}
      </button>
    </div>
  );
}

// The site header. Keeps rendering a bare <header> (no id): the wrapper is
// what tests/lib/marketingNav.test.ts inspects, and Hero.tsx already owns the
// "inicio" id on its own <section>.
//
// `account` adds the session slot; the platform passes it, the marketing pages
// and the story do not.
export default function SiteHeader({ account = false }: { account?: boolean }) {
  const t = useTranslations("SiteHeader");
  const nav = useTranslations("Nav");
  const [locale] = useSiteLocale();
  const [open, setOpen] = useState(false);
  const activeHref = activeNavHref(usePathname());
  const territoriosActive = activeHref === TERRITORIOS_LINK.href;
  const mapaActive = activeHref === MAPA_LINK.href;

  const mapaLink = (
    <a
      href={MAPA_LINK.href}
      className={`${styles.mapaButton} text-ui-medium`}
      aria-current={mapaActive ? "page" : undefined}
    >
      {nav(MAPA_LINK.key)}
    </a>
  );

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
    <header className={styles.siteHeader} aria-label={t("region")} lang={HTML_LANG[locale]}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={t("home")}>
          {/* Decorative: the link's aria-label already names the brand. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
          <img src="/logos/caativar-cabecalho.svg" alt="" width={232} height={95} className={styles.brandLogo} />
        </Link>

        <nav className={styles.nav} aria-label={t("mainNav")}>
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
                {nav(link.key)}
              </Link>
            );
          })}
          {/* TERRITORIOS_LINK and MAPA_LINK cross a route group: a full page
              load, not next/link. The story and the platform render this
              header too and mark their own entries (Figma 19254:37327,
              19413:54915). */}
          <a
            href={TERRITORIOS_LINK.href}
            className={`${styles.navLink} ${territoriosActive ? `text-ui-bold ${styles.navLinkActive}` : "text-ui-medium"}`}
            aria-current={territoriosActive ? "page" : undefined}
          >
            {nav(TERRITORIOS_LINK.key)}
          </a>
          {mapaActive ? <span className={styles.mapaRing}>{mapaLink}</span> : mapaLink}
        </nav>

        <div className={styles.actions}>
          <LanguageSwitch className={styles.language} />
          {account && <AccountSlot />}
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
          nav stacked vertically, adapted to this header's own links instead
          of that component's unrelated example content. */}
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
              {nav(link.key)}
            </Link>
          ))}
          <a
            href={TERRITORIOS_LINK.href}
            className={`${styles.panelLink} text-p-ui`}
            aria-current={territoriosActive ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {nav(TERRITORIOS_LINK.key)}
          </a>
          <a
            href={MAPA_LINK.href}
            className={`${styles.panelMapaButton} text-body`}
            aria-current={mapaActive ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {nav(MAPA_LINK.key)}
          </a>
        </nav>
        <div className={styles.panelActions}>
          <LanguageSwitch className={styles.language} />
          {account && <AccountSlot />}
        </div>
      </div>
    </header>
  );
}
