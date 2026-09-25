import type { Publicacao } from "@/lib/content/comunicacao";
import styles from "./PublicationCard.module.css";

// One publication of the Comunicação page, Figma component instances
// 18978:2075–2079 (hover 18988:10598): the cover art in a bordered frame, a
// "PDF" badge on it, the publication type and its title.
//
// The cover shows the publication's cover ART (`cover`), unlike the landing's
// Comunicação cards, which use photographs (see FOTOS in Comunicacao.tsx):
// here the design frames the covers themselves, portrait. Its alt is empty
// because the art restates the title, which is right below it in text.
export default function PublicationCard({ publicacao }: { publicacao: Publicacao }) {
  const { key, tipo, title, cover, pdf } = publicacao;
  const titleId = `publicacao-${key}-title`;
  const tipoId = `publicacao-${key}-tipo`;
  const pdfId = `publicacao-${key}-pdf`;

  const content = (
    <>
      <div className={styles.cover}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset or Contentful URL, matches Comunicacao.tsx */}
        <img src={cover} alt="" className={styles.coverImage} loading="lazy" decoding="async" />
        {/* The badge promises a file to open, so only a card with a PDF has it. */}
        {pdf && (
          <span id={pdfId} className={styles.pdfBadge}>
            PDF
          </span>
        )}
      </div>
      <span id={tipoId} className={styles.tipo}>
        {tipo}
      </span>
      <h3 id={titleId} className={styles.title}>
        {title}
      </h3>
    </>
  );

  // Named from the title alone, with the type and the PDF badge as its
  // description, so a screen reader announces "<title>, link" and then
  // "Cartilha PDF" rather than reading the badge before the title.
  if (pdf) {
    return (
      <li className={styles.card} role="listitem">
        <a
          href={pdf}
          target="_blank"
          rel="noreferrer"
          className={styles.surface}
          aria-labelledby={titleId}
          aria-describedby={`${tipoId} ${pdfId}`}
        >
          {content}
        </a>
      </li>
    );
  }

  // No PDF: a cover with a caption, not a control.
  return (
    <li className={styles.card} role="listitem">
      <div className={styles.surface}>{content}</div>
    </li>
  );
}
