import Image from "next/image";
import Link from "next/link";
import { FOOTER_LINKS } from "@/lib/marketing/nav";
import styles from "./SiteFooter.module.css";

// Partner logos credited in the Figma footer (node 18862:8583, symbol
// 16864:138883): Sudene, UFCG and OCA — INSA is committed at
// public/logos/logo_insa.png (and appears in the pre-redesign footer's
// institutional paragraph) but is not one of the three logos this design
// renders, so it is left out here rather than added back silently. Heights
// mirror the pre-redesign footer (components/SiteFooter usage recovered from
// git history), widths derived from each PNG's own aspect ratio so nothing
// stretches: OCA 230x117, UFCG 1472x462, SUDENE 752x358.
const PARTNERS = [
  { src: "/logos/logo_oca.png", alt: "OCA", width: 83, height: 42 },
  { src: "/logos/logo_ufcg.png", alt: "UFCG", width: 127, height: 40 },
  { src: "/logos/logo_sudene.png", alt: "SUDENE", width: 76, height: 36 },
];

// The site footer. Keeps rendering a bare <footer> (no id): the wrapper is
// what tests/lib/marketingNav.test.ts inspects, the same contract SiteHeader
// follows for <header>.
export default function SiteFooter() {
  return (
    <footer className={styles.siteFooter} aria-label="Rodapé">
      <div className={`container ${styles.inner}`}>
        <div className={styles.column}>
          <div className={styles.brand}>
            {/* Same institutional mark as the header's brand lockup
                (public/logos/logo_oca.png); the wordmark beside it already
                names the platform, so the mark itself is decorative here. */}
            <Image
              src="/logos/logo_oca.png"
              alt=""
              width={32}
              height={32}
              className={styles.brandMark}
            />
            <span className={`${styles.brandName} text-p-ui`}>Caativar</span>
          </div>

          {/* A second nav landmark exists on the page (SiteHeader's
              "Navegação principal"); this one needs its own accessible name
              so assistive tech can tell the two apart. `role="list"` /
              `role="listitem"` restore the implicit list semantics that the
              bullet-removing reset in app/globals.css strips from <ul>/<li>. */}
          <nav aria-label="Navegação do rodapé">
            <ul className={styles.navList} role="list">
              {FOOTER_LINKS.map((link) =>
                link.external ? (
                  // MAPA_LINK crosses a route group: a full page load, not next/link.
                  <li key={link.href} role="listitem">
                    <a href={link.href} className={`${styles.navLink} text-body`}>
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.href} role="listitem">
                    <Link href={link.href} className={`${styles.navLink} text-body`}>
                      {link.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>

        <div className={styles.column}>
          <h2 className={`${styles.heading} text-subtle-semibold`}>Parceiros e apoio</h2>
          <div className={styles.logos}>
            {/* External partner marks, not part of the app's own optimized asset
                pipeline; explicit width/height avoids the intrinsic-size blowup
                a bare `auto` would cause. Matches the <img> pattern already used
                for static marketing assets in Hero.tsx/Destaques.tsx. */}
            {PARTNERS.map((partner) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={partner.alt}
                src={partner.src}
                alt={partner.alt}
                width={partner.width}
                height={partner.height}
                className={styles.logo}
              />
            ))}
          </div>
        </div>

        <div className={styles.column}>
          <h2 className={`${styles.heading} text-subtle-semibold`}>CONTATO</h2>
          {/* The Figma copy ("E-mail (ex.: contato@Caativar.gov.br)") is
              placeholder text on a domain this project does not own, and no
              real contact address turned up in README.md, DOCUMENTACAO.md or
              the pre-redesign footer (recovered from git history). Shipping
              a fabricated mailto: would be worse than shipping nothing, so
              only the label renders — see the task report for the search
              performed and a flag to fill this in once a real address exists. */}
        </div>
      </div>
    </footer>
  );
}
