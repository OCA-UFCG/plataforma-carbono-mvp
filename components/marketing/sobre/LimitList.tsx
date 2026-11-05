import { useId } from "react";
import styles from "./LimitList.module.css";

type LimitListProps = {
  titulo: string;
  itens: string[];
};

// "O que a plataforma não faz", Figma 19551:11429: a red heading over the
// platform's limits, each beside a red ✕ and split from the next by a rule.
// The ✕ is decorative: the heading and each item already say "não".
export default function LimitList({ titulo, itens }: LimitListProps) {
  const titleId = useId();

  return (
    <section className={styles.limites} aria-labelledby={titleId}>
      <h2 id={titleId} className={`${styles.titulo} text-h3`}>
        {titulo}
      </h2>
      {/* role="list" restores the semantics `list-style: none` strips in
          Safari/VoiceOver, as in CautionCard.tsx. */}
      <ul className={styles.itens} role="list">
        {itens.map((item, i) => (
          <li key={i} className={`${styles.item} text-body`} role="listitem">
            {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
            <img src="/icons/sobre/close-negativo-24.svg" alt="" width={24} height={24} className={styles.icone} />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
