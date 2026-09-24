import { DESTAQUES } from "@/lib/content/destaques";
import IndicatorCard from "./IndicatorCard";
import styles from "./Destaques.module.css";

// Destaques, Figma node 18862:8538 ("Background+HorizontalBorder"), four
// IndicatorCards fed by lib/content/destaques.ts. Marked up as a list (ul > li)
// rather than four sibling divs so a screen reader announces "list of 4 items"
// instead of a pile of unrelated cards.
export default function Destaques() {
  return (
    <section id="destaques" className={styles.destaques} aria-label="Destaques">
      <div className={`container ${styles.container}`}>
        <p className={`${styles.label} text-p-ui-semibold`}>Destaques</p>
        {/* `role="list"`/`role="listitem"` restore the implicit list semantics
            that `list-style: none` strips from the accessibility tree in
            Safari/VoiceOver — without them the cards stop being announced as
            a list of four items. */}
        <ul className={styles.grid} role="list">
          {DESTAQUES.map((d) => (
            <li key={d.rotulo} role="listitem">
              <IndicatorCard
                icon={d.icone}
                label={d.rotulo}
                value={d.numero}
                unit={d.unidade}
                description={d.texto}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
