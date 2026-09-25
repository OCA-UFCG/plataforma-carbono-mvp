import { useId } from "react";
import styles from "./Comparison.module.css";

type Medida = { ano: string; valor: string };

type ComparisonProps = { titulo: string; antes: Medida; depois: Medida };

// "EM DESERTIFICAÇÃO SEVERA", Figma 18988:8747 on "Conheça a Caatinga": a
// figure then and now, an arrow between them. The two are a <dl> of year and
// value, named by the title; the arrow only draws the passage of time, which
// the years already state, so it is decorative.
export default function Comparison({ titulo, antes, depois }: ComparisonProps) {
  const titleId = useId();

  return (
    <div className={styles.comparison}>
      <p id={titleId} className={styles.titulo}>
        {titulo}
      </p>
      <dl className={styles.linha} aria-labelledby={titleId}>
        <div className={`${styles.medida} ${styles.antes}`}>
          <dt>{antes.ano}</dt>
          <dd className={styles.valor}>{antes.valor}</dd>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
        <img src="/icons/sobre/arrow.svg" alt="" width={115} height={15} className={styles.seta} />
        <div className={`${styles.medida} ${styles.depois}`}>
          <dt>{depois.ano}</dt>
          <dd className={styles.valor}>{depois.valor}</dd>
        </div>
      </dl>
    </div>
  );
}
