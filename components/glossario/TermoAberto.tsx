import { useLocale, useTranslations } from "next-intl";
import type { Termo } from "@/lib/glossario/termos";
import { readSiteLocale } from "@/lib/locale";
import CenaAnimada from "./CenaAnimada";
import styles from "./TermoAberto.module.css";

// The open term of the Glossário, in the column beside the sidebar (Figma
// 19507:16686): its title (in the global .text-h3) and text, its animation
// with the control panel, the text written for under it, then the way into
// the platform and the sources. Glossario.tsx wraps it in the tab panel,
// which spaces these blocks 24px apart, as it does the paragraphs under the
// scene: the frame draws a single one (19507:16694), so the gap between two
// is a guess. Every text is in the reader's language.
export default function TermoAberto({ termo }: { termo: Termo }) {
  const t = useTranslations("Glossario");
  const locale = readSiteLocale(useLocale());

  return (
    <>
      <div className={styles.texto}>
        <h2 className={`${styles.titulo} text-h3`}>{termo.titulo[locale]}</h2>
        {termo.paragrafos[locale].map((p, i) => (
          <p key={i} className={`${styles.paragrafo} text-body`}>{p}</p>
        ))}
      </div>
      {termo.animacao && (
        <CenaAnimada
          key={termo.slug}
          id={termo.animacao.id}
          titulo={termo.animacao.titulo[locale]}
          descricao={termo.animacao.descricao[locale]}
        />
      )}
      {termo.paragrafosAposCena?.[locale].map((p, i) => (
        <p key={i} className={`${styles.paragrafo} text-body`}>{p}</p>
      ))}
      {termo.acesso && (
        // The platform is another root layout: a plain link, a full page load.
        <a className={styles.acesso} href={termo.acesso.href}>{termo.acesso.rotulo[locale]}</a>
      )}
      {termo.fontes && termo.fontes.length > 0 && (
        <div className={styles.fontesBloco}>
          <h3 className={styles.fontesTitulo}>{t("fontes")}</h3>
          <ol className={styles.fontes}>
            {termo.fontes.map((f) => <li key={f}>{f}</li>)}
          </ol>
        </div>
      )}
    </>
  );
}
