import type { Passo } from "@/lib/content/sobre/como-funciona";
import styles from "./StepCard.module.css";

// One step of "Como funciona", Figma "Card Sobre" 18985:7140 and its variants:
// the step number in a dark disc, then the title, the text and, on step 2, the
// labelled groups of information. Rendered inside an <ol>, which announces the
// position, so the disc is hidden from assistive tech rather than read twice.
export default function StepCard({ numero, passo }: { numero: number; passo: Passo }) {
  return (
    <li className={styles.card} role="listitem">
      <span className={styles.numero} aria-hidden="true">
        {numero}
      </span>
      <div className={styles.corpo}>
        <h2 className={styles.titulo}>{passo.titulo}</h2>
        <div className={styles.texto}>
          {passo.paragrafos.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {passo.grupos?.map((grupo) => (
          <div key={grupo.rotulo} className={styles.grupo}>
            <p className={styles.rotulo}>{grupo.rotulo}</p>
            {/* role="list" restores the semantics `list-style: none` strips in
                Safari/VoiceOver, as in Destaques.tsx. */}
            <ul className={styles.etiquetas} role="list">
              {grupo.itens.map((item) => (
                <li key={item} className={`${styles.etiqueta} ${styles[grupo.tom]}`} role="listitem">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </li>
  );
}
