import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import Section from "@/components/marketing/sobre/Section";
import Quote from "@/components/marketing/sobre/Quote";
import MediaText from "@/components/marketing/sobre/MediaText";
import Comparison from "@/components/marketing/sobre/Comparison";
import IndicatorCard from "@/components/marketing/IndicatorCard";
import { CAATINGA as c } from "@/lib/content/sobre/caatinga";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SobreMetadata");
  return { title: t("caatinga") };
}

// "Conheça a Caatinga", Figma frame 18988:8667 (content 18988:8696), under the
// shared intro band and sub-navigation of sobre/layout.tsx. The copy lives in
// translations/<locale>/SobreCaatingaPage.json, its structure in
// lib/content/sobre/caatinga.ts.
export default function SobreCaatingaPage() {
  const t = useTranslations("SobreCaatingaPage");

  // The text of an indicator card: label, figure and description.
  const indicator = (path: string) => ({
    label: t(`${path}.label`),
    value: t(`${path}.value`),
    description: t(`${path}.description`),
  });

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.abertura}>
          {c.abertura.map((key) => (
            <p key={key}>{t(`opening.${key}`)}</p>
          ))}
        </div>

        <Section title={t("vegetation.title")}>
          {c.vegetacao.blocos.map((linhas) => (
            <p key={linhas[0]}>
              {linhas.map((linha, i) => (
                <span key={linha}>
                  {i > 0 && <br />}
                  {t(`vegetation.blocks.${linha}`)}
                </span>
              ))}
            </p>
          ))}
          <Quote>{t("vegetation.highlight")}</Quote>
        </Section>

        <Section title={t("climate.title")}>
          <p>{t("climate.before")}</p>
          <div className={styles.indicador}>
            <IndicatorCard {...indicator("climate.indicator")} variant="outlined" />
          </div>
          <p>{t("climate.after")}</p>
        </Section>

        <Section title={t("efficiency.title")}>
          <p>{t("efficiency.before")}</p>
          <div className={styles.indicador}>
            <IndicatorCard {...indicator("efficiency.indicator")} variant="outlined" />
          </div>
          <p>{t("efficiency.after")}</p>
        </Section>

        <Section title={t("storage.title")}>
          <p>{t("storage.before")}</p>
          <ul className={styles.indicadores} role="list">
            {c.armazenamento.indicadores.map((id) => (
              <li key={id} role="listitem">
                <IndicatorCard {...indicator(`storage.indicators.${id}`)} variant="outlined" />
              </li>
            ))}
          </ul>
          {c.armazenamento.depois.map((key) => (
            <p key={key}>{t(`storage.after.${key}`)}</p>
          ))}
        </Section>

        <MediaText image={c.pessoas.imagem} imageAlt={t("people.imageAlt")} imageSide="left" imageSize="small">
          <Section title={t("people.title")}>
            {c.pessoas.paragrafos.map((key) => (
              <p key={key}>{t(`people.paragraphs.${key}`)}</p>
            ))}
          </Section>
        </MediaText>

        <Section title={t("pressure.title")} tone="alert">
          <p>{t("pressure.before")}</p>
          <Comparison
            titulo={t("pressure.comparison.title")}
            antes={{ ano: t("pressure.comparison.beforeYear"), valor: t("pressure.comparison.beforeValue") }}
            depois={{ ano: t("pressure.comparison.afterYear"), valor: t("pressure.comparison.afterValue") }}
          />
          <p>{t("pressure.after")}</p>
        </Section>
      </div>
    </div>
  );
}
