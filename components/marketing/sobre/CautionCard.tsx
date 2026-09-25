import styles from "./CautionCard.module.css";

type CautionCardProps = {
  titulo: string;
  introducao: string;
  itens: string[];
  fechamento: string;
};

// "Quais cuidados devem ser observados?", Figma "Card Sobre" 18988:8852: the
// red card listing what a project must not do. The ✕ icons are decorative; the
// introduction ("Um projeto de carbono não deve:") already says each item is
// a prohibition.
export default function CautionCard({ titulo, introducao, itens, fechamento }: CautionCardProps) {
  return (
    <section className={styles.card} aria-labelledby="cuidados-titulo">
      <h2 id="cuidados-titulo" className={styles.titulo}>
        {titulo}
      </h2>
      <p className={styles.forte}>{introducao}</p>
      {/* role="list" restores the semantics `list-style: none` strips in
          Safari/VoiceOver, as in Destaques.tsx. */}
      <ul className={styles.itens} role="list">
        {itens.map((item) => (
          <li key={item} className={styles.item} role="listitem">
            {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
            <img src="/icons/sobre/close-negativo.svg" alt="" width={26} height={26} className={styles.icone} />
            {item}
          </li>
        ))}
      </ul>
      <p className={styles.forte}>{fechamento}</p>
    </section>
  );
}
