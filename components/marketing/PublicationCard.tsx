import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Publicacao } from "@/lib/content/comunicacao";
import styles from "./PublicationCard.module.css";

// The type as lib/content/comunicacao.ts spells it -> its key in the translations.
const TIPOS: Record<Publicacao["tipo"], "notebook" | "booklet"> = {
  "Caderno temático": "notebook",
  Cartilha: "booklet",
};

// One publication of the Comunicação page, Figma component instances
// 18978:2075–2079 (hover 18988:10598): the cover art in a bordered frame, a
// "PDF" badge on it, the publication type and its title.
//
// The cover shows the publication's cover ART (`cover`), unlike the landing's
// Comunicação cards, which use photographs (see FOTOS in Comunicacao.tsx):
// here the design frames the covers themselves, portrait. Its alt is empty
// because the art restates the title, which is right below it in text. The
// type label and the badge are UI text, translated here; the title comes from
// Contentful and is shown as delivered.
export default function PublicationCard({ publicacao }: { publicacao: Publicacao }) {
  const t = useTranslations("ComunicacaoPagePublicationCard");
  const { key, slug, tipo, title, cover, pdf } = publicacao;
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
            {t("pdfBadge")}
          </span>
        )}
      </div>
      <span id={tipoId} className={styles.tipo}>
        {t(`types.${TIPOS[tipo]}`)}
      </span>
      <h3 id={titleId} className={styles.title}>
        {title}
      </h3>
    </>
  );

  // Every publication with an address has a page (app/(marketing)/comunicacao/
  // [slug]), which reads the PDF in place when there is one; the card leads
  // there, in the same tab. Named from the title alone, with the type (and the
  // PDF badge, when there is a file) as its description, so a screen reader
  // announces "<title>, link" rather than reading the badge first.
  if (slug) {
    return (
      <li className={styles.card} role="listitem">
        <Link
          href={`/comunicacao/${slug}`}
          className={styles.surface}
          aria-labelledby={titleId}
          aria-describedby={pdf ? `${tipoId} ${pdfId}` : tipoId}
        >
          {content}
        </Link>
      </li>
    );
  }

  // No address yet (spec §3.2): a cover with a caption, not a control.
  return (
    <li className={styles.card} role="listitem">
      <div className={styles.surface}>{content}</div>
    </li>
  );
}
