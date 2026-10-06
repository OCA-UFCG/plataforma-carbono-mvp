/* eslint-disable @next/next/no-img-element -- exported Figma logo pieces, each drawn at its own size */
import styles from "./HeaderLogo.module.css";

// The Caativar lockup of the site header, Figma 19272:44346 inside the
// "Menu-superior" component (19272:44333): the symbol ("Logo-1", 19272:44347)
// as a hexagonal badge that hangs below the bar, and the "CaatiVAR" wordmark
// beside it (19272:44364). The header draws its own simplified tree, not the
// one of the logo board's lockups, so this is built from the component's own
// layers rather than from a board export: each SVG in public/logos/cabecalho/
// is one of those layers as Figma exports it, placed and transformed here as
// the design does (HeaderLogo.module.css).
//
// Decorative: the brand link in SiteHeader carries the accessible name.

const DIR = "/logos/cabecalho";

// The four roots under the trunk ("Rectangle 2362", "2364", "2363" and
// "2360"), in the design's paint order. Each is a rotated, skewed rectangle
// whose path sits inset inside its own box.
const ROOTS = [
  { src: `${DIR}/raiz-1.svg`, className: styles.root1 },
  { src: `${DIR}/raiz-2.svg`, className: styles.root2 },
  { src: `${DIR}/raiz-3.svg`, className: styles.root3 },
  { src: `${DIR}/raiz-4.svg`, className: styles.root4 },
];

export default function HeaderLogo() {
  return (
    <span className={styles.lockup} aria-hidden="true">
      <span className={styles.symbol}>
        <img src={`${DIR}/selo-fundo.svg`} alt="" className={styles.halo} />
        <span className={styles.mask} />
        {ROOTS.map(({ src, className }) => (
          <span key={src} className={`${styles.rootBox} ${className}`}>
            <span className={styles.rootShape}>
              <img src={src} alt="" />
            </span>
          </span>
        ))}
        <img src={`${DIR}/tronco.svg`} alt="" className={styles.trunk} />
        <img src={`${DIR}/copa.svg`} alt="" className={styles.canopy} />
        <img src={`${DIR}/selo-hexagono.svg`} alt="" className={styles.outline} />
      </span>
      <img src={`${DIR}/caativar.svg`} alt="" className={styles.wordmark} />
    </span>
  );
}
