import type { IconePergunta } from "@/lib/content/sobre/carbono-e-comunidades";
import styles from "./QuestionTile.module.css";

// One of the eight questions of "Antes de participar de um projeto", Figma
// 18988:8887 and siblings: the number in a green column, the question and its
// icon on a grey body. Rendered inside an <ol>, which already announces the
// position, so the visible number is hidden from assistive tech rather than
// read twice. The icon only illustrates the question and is decorative too.
export default function QuestionTile({
  numero,
  pergunta,
  icone,
}: {
  numero: number;
  pergunta: string;
  icone: IconePergunta;
}) {
  return (
    <li className={styles.tile} role="listitem">
      <span className={styles.numero} aria-hidden="true">
        {numero}
      </span>
      <div className={styles.corpo}>
        <p className={styles.pergunta}>{pergunta}</p>
        {/* Two of the design's icons are an empty 85px frame with the glyph
            inset in it; both layers are kept as exported. */}
        <span className={styles.icone} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
          <img src={icone.src} alt="" className={styles.camada} />
          {icone.glyph && (
            // eslint-disable-next-line @next/next/no-img-element -- exported Figma icon
            <img
              src={icone.glyph.src}
              alt=""
              className={styles.glyph}
              style={{ "--inset-y": icone.glyph.insetY, "--inset-x": icone.glyph.insetX } as React.CSSProperties}
            />
          )}
        </span>
      </div>
    </li>
  );
}
