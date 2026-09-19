import { DESTAQUES } from "@/lib/content/destaques";
import styles from "./Destaques.module.css";

// Destaques, Figma node 18862:8538 ("Background+HorizontalBorder"), four
// indicator cards fed by lib/content/destaques.ts. Marked up as a list
// (ul > li) rather than four sibling divs so a screen reader announces "list
// of 4 items" instead of a pile of unrelated cards.
export default function Destaques() {
  return (
    <section id="destaques" className={styles.destaques} aria-label="Destaques">
      <div className={styles.container}>
        <p className={`${styles.label} text-subtle-semibold`}>Destaques</p>
        <ul className={styles.grid}>
          {DESTAQUES.map((d) => (
            <li key={d.rotulo} className={styles.card}>
              <div className={styles.cardHeader}>
                {/* Decorative: the icon repeats what `rotulo` already says in
                    text, so it carries no information of its own. A plain
                    <img>, not next/image, matches Hero.tsx: these are small
                    static SVGs, not photos worth the optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.icone} alt="" width={18} height={18} className={styles.icon} />
                <p className={`${styles.rotulo} text-subtle-semibold`}>{d.rotulo}</p>
              </div>
              <div className={styles.cardBody}>
                {/* The visible number/unit/description are split across
                    three elements for layout (numero at display size,
                    unidade and texto at body/subtle size), so they are
                    hidden from assistive tech and replaced by one combined
                    statement below, read as a single coherent phrase. */}
                <p className={styles.statLine} aria-hidden="true">
                  <span className={`${styles.numero} text-h2`}>{d.numero}</span>
                  <span className={`${styles.unidade} text-body`}>{d.unidade}</span>
                </p>
                <p className={`${styles.texto} text-subtle`} aria-hidden="true">
                  {d.texto}
                </p>
                <span className={styles.srOnly}>
                  {d.numero} {d.unidade} {d.texto}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
