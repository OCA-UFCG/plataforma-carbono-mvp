import { useId } from "react";
import styles from "./IconCard.module.css";

type IconCardProps = {
  titulo: string;
  icone: string;
  paragrafos: string[];
};

// An icon beside a heading and its text on a green panel, Figma "Card Sobre"
// 18988:8649 / 18988:8650 on "Conheça a plataforma". The icon illustrates the
// heading and says nothing the heading doesn't, so it is decorative.
export default function IconCard({ titulo, icone, paragrafos }: IconCardProps) {
  const titleId = useId();

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
      <img src={icone} alt="" width={100} height={100} className={styles.icone} />
      <div className={styles.texto}>
        <h2 id={titleId} className={styles.titulo}>
          {titulo}
        </h2>
        {/* The design sets a card's paragraphs on consecutive lines, with no
            gap between them. */}
        <div>
          {paragrafos.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
