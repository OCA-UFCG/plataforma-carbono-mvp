import { useTranslations } from "next-intl";
import { DESTAQUES } from "@/lib/content/destaques";
import IndicatorCard from "./IndicatorCard";
import styles from "./Destaques.module.css";

// Destaques, Figma node 18862:8538 ("Background+HorizontalBorder"), four
// IndicatorCards fed by lib/content/destaques.ts. Marked up as a list (ul > li)
// rather than four sibling divs so a screen reader announces "list of 4 items"
// instead of a pile of unrelated cards.
export default function Destaques() {
  const t = useTranslations("Destaques");

  return (
    <section id="destaques" className={styles.destaques} aria-label={t("ariaLabel")}>
      <div className={`container ${styles.container}`}>
        <p className={`${styles.label} text-p-ui-semibold`}>{t("label")}</p>
        {/* `role="list"`/`role="listitem"` restore the implicit list semantics
            that `list-style: none` strips from the accessibility tree in
            Safari/VoiceOver — without them the cards stop being announced as
            a list of four items. */}
        <ul className={styles.grid} role="list">
          {DESTAQUES.map((d) => (
            <li key={d.id} role="listitem">
              <IndicatorCard
                icon={d.icone}
                label={t(`items.${d.id}.label`)}
                value={t(`items.${d.id}.value`)}
                unit={t(`items.${d.id}.unit`)}
                description={t(`items.${d.id}.text`)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
