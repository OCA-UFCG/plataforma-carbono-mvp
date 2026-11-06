import { useId } from "react";
import Paragrafos from "../Paragrafos";
import styles from "./AudienceBand.module.css";

type AudienceBandProps = {
  titulo: string;
  perfis: string[];
  textos: string[];
};

// "Para quem é a plataforma?", Figma 19538:11415: a full-width grey band with
// the heading, the audiences as chips and a line on who else the platform
// serves. The chips only name the audiences (nothing to click), so they are a
// list; an empty list draws nothing rather than an empty <ul>.
export default function AudienceBand({ titulo, perfis, textos }: AudienceBandProps) {
  const titleId = useId();

  return (
    <section className={styles.band} aria-labelledby={titleId}>
      <div className={`container ${styles.inner}`}>
        <h2 id={titleId} className={`${styles.titulo} text-h3`}>
          {titulo}
        </h2>
        {perfis.length > 0 && (
          // role="list" restores the semantics `list-style: none` strips in
          // Safari/VoiceOver, as in CautionCard.tsx.
          <ul className={styles.chips} role="list">
            {/* Keyed by position, as in CautionCard: an editor may type the
                same audience twice. */}
            {perfis.map((perfil, i) => (
              <li key={i} className={`${styles.chip} text-body`} role="listitem">
                {perfil}
              </li>
            ))}
          </ul>
        )}
        <Paragrafos textos={textos} />
      </div>
    </section>
  );
}
