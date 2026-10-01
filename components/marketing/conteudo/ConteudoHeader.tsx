import { useLocale, useTranslations } from "next-intl";
import { formatPublicationDate, type Publicacao } from "@/lib/content/comunicacao";
import type { Locale } from "@/translations/config";
import BackButton from "./BackButton";
import styles from "./ConteudoHeader.module.css";

// The head of a publication page, Figma node 19015:13059: "Voltar" and the
// publication date on one row (19015:13060), the title (19015:13065) and the
// description (19015:13067). Below 768px it also carries "Baixar PDF", which
// the reader's toolbar drops at that width: a plain link to the file, since a
// phone browser hands a PDF to its own viewer or downloads it (spec §5.4).
// A <div>, not a <header>: tests/lib/marketingNav.test.ts reads wrapper
// elements under components/marketing as landing sections.
export default function ConteudoHeader({ publicacao }: { publicacao: Publicacao }) {
  const t = useTranslations("ComunicacaoConteudoHeader");
  const locale = useLocale() as Locale;
  const data = formatPublicationDate(publicacao.publicationDate, locale);

  return (
    <div className={styles.header}>
      <div className={styles.topRow}>
        <BackButton />
        {data && publicacao.publicationDate && (
          <p className={`${styles.date} text-body`}>
            {t("publishedOn")} <time dateTime={publicacao.publicationDate.slice(0, 10)}>{data}</time>
          </p>
        )}
      </div>

      <h1 className={`${styles.title} text-h2`}>{publicacao.title}</h1>
      <p className={`${styles.description} text-body`}>{publicacao.description}</p>

      {publicacao.pdf && (
        <a href={publicacao.pdf} target="_blank" rel="noreferrer" className={`${styles.downloadMobile} text-body`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
          <img src="/icons/conteudo/download.svg" alt="" width={16} height={16} />
          {t("download")}
        </a>
      )}
    </div>
  );
}
