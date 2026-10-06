import Link from "next/link";
import { FOOTER_LINKS } from "@/lib/marketing/nav";
import styles from "./SiteFooter.module.css";

// The three partner logos the Figma footer shows (node 18862:8583, symbol
// 16864:138883), in the design's own order and at its own sizes: Sudene at
// x=470 (149x60), UFCG at x=643 (191x60) and OCA at x=858 (108x60).
//
// These are WHITE monochrome lockups, not the colour PNGs in public/logos/.
// The footer sits on --bg-fundo-inverso (#000f15), and the design uses white
// marks against it. They were produced by exporting the footer's own nodes
// through Figma's REST API at 3x, resizing to 2x, and saving as WebP with
// alpha (5-10 KB each).
//
// The colour PNGs in public/logos/ are not orphaned by this: logo_oca.png,
// logo_ufcg.png, logo_sudene.png and logo_insa.png are kept alive by
// components/mapa/Welcome.tsx. Do not delete them as unused.
//
// INSA is committed at public/logos/logo_insa.png and was credited in the
// pre-redesign footer's institutional paragraph, but is deliberately not one
// of the three logos this design renders — a content decision worth
// confirming, since the pre-redesign footer credited all four institutions.
const PARTNERS = [
  { src: "/logos/rodape/sudene.webp", alt: "SUDENE", width: 149, height: 60 },
  { src: "/logos/rodape/ufcg.webp", alt: "UFCG", width: 191, height: 60 },
  { src: "/logos/rodape/oca.webp", alt: "OCA", width: 108, height: 60 },
];

// The site footer. Keeps rendering a bare <footer> (no id): the wrapper is
// what tests/lib/marketingNav.test.ts inspects, the same contract SiteHeader
// follows for <header>.
export default function SiteFooter() {
  return (
    <footer className={styles.siteFooter} aria-label="Rodapé">
      <div className={`container ${styles.inner}`}>
        <div className={`${styles.column} ${styles.columnBrand}`}>
          <div className={styles.brand}>
            {/* The design's footer still holds the empty "logo" placeholder
                (the Caativar lockup reached only the header). This fills it
                with the Caativar symbol in white, like the partner marks: the
                logo board's monochrome outline variant (Figma 19083:7621),
                which is public/logos/caativar-simbolo.svg with every colour
                set to white. The full-colour symbol would lose its dark trunk
                against this background. The wordmark beside it already names
                the platform, so the mark itself is decorative here. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma logo */}
            <img
              src="/logos/caativar-simbolo-branco.svg"
              alt=""
              width={36}
              height={36}
              className={styles.brandMark}
            />
            <span className={styles.brandName}>Caativar</span>
          </div>

          {/* A second nav landmark exists on the page (SiteHeader's
              "Navegação principal"); this one needs its own accessible name
              so assistive tech can tell the two apart. `role="list"` /
              `role="listitem"` restore the implicit list semantics that
              `list-style: none` on `.navList` (SiteFooter.module.css) strips
              from <ul>/<li> in most browsers. */}
          <nav aria-label="Navegação do rodapé">
            <ul className={styles.navList} role="list">
              {FOOTER_LINKS.map((link) =>
                link.external ? (
                  // TERRITORIOS_LINK and MAPA_LINK cross a route group: a full
                  // page load, not next/link.
                  <li key={link.href} role="listitem">
                    <a href={link.href} className={styles.navLink}>
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.href} role="listitem">
                    <Link href={link.href} className={styles.navLink}>
                      {link.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>

        {/* No heading: the design's partner column is the logo row alone. */}
        <div className={`${styles.column} ${styles.columnPartners}`}>
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
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        </div>

        <div className={`${styles.column} ${styles.columnContact}`}>
          <h2 className={`${styles.heading} text-p-ui`}>CONTATO</h2>
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
