import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Section from "@/components/marketing/sobre/Section";
import Quote from "@/components/marketing/sobre/Quote";
import MediaText from "@/components/marketing/sobre/MediaText";
import FigureCard, { FigureList } from "@/components/marketing/sobre/FigureCard";
import Paragrafos from "@/components/marketing/Paragrafos";
import { CAATINGA, CAATINGA_PESSOAS_IMAGEM } from "@/lib/content/sobre/caatinga";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import { barFill } from "@/lib/marketing/figure";
import { getSiteLocale } from "@/i18n/siteLocale";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Sobre"))("pages.caatinga") };
}

// "Conheça a Caatinga", Figma frame 18988:8667 (content 18988:8696), under the
// shared intro band and sub-navigation of sobre/layout.tsx. Copy lives in
// Contentful, shipped with lib/content/sobre/caatinga.ts.
export default async function SobreCaatingaPage() {
  const t = await getTranslations("Sobre");
  const { c } = await loadSiteCopy({ c: CAATINGA }, undefined, await getSiteLocale());

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.abertura}>
          <Paragrafos textos={c.abertura} />
        </div>

        <Section title={c.vegetacaoTitulo}>
          <Paragrafos textos={c.vegetacaoTexto} />
          {c.vegetacaoDestaque && <Quote>{c.vegetacaoDestaque}</Quote>}
        </Section>

        {/* 18988:8708 and 18988:8716: each question's text beside its
            figure card, the text centred on the card. */}
        <div className={styles.linha}>
          <Section title={c.climaTitulo}>
            <Paragrafos textos={[c.climaAntes, c.climaDepois]} />
          </Section>
          <FigureCard
            label={c.climaIndicadorRotulo}
            value={c.climaIndicadorValor}
            description={c.climaIndicadorTexto}
            bar={barFill(c.climaIndicadorBarra)}
          />
        </div>

        <div className={styles.linha}>
          <Section title={c.eficienciaTitulo}>
            <Paragrafos textos={[c.eficienciaAntes, c.eficienciaDepois]} />
          </Section>
          <FigureCard
            label={c.eficienciaIndicadorRotulo}
            value={c.eficienciaIndicadorValor}
            description={c.eficienciaIndicadorTexto}
            bar={barFill(c.eficienciaIndicadorBarra)}
          />
        </div>

        <Section title={c.armazenamentoTitulo}>
          <Paragrafos textos={[c.armazenamentoAntes]} />
          <FigureList>
            <FigureCard
              label={c.armazenamentoIndicador1Rotulo}
              value={c.armazenamentoIndicador1Valor}
              description={c.armazenamentoIndicador1Texto}
            />
            <FigureCard
              label={c.armazenamentoIndicador2Rotulo}
              value={c.armazenamentoIndicador2Valor}
              description={c.armazenamentoIndicador2Texto}
            />
          </FigureList>
          <Paragrafos textos={c.armazenamentoDepois} />
        </Section>

        <MediaText
          image={CAATINGA_PESSOAS_IMAGEM.src}
          imageAlt={t("imageAlt.caatinga")}
          imageSide="left"
          imageSize="small"
        >
          <Section title={c.pessoasTitulo}>
            <Paragrafos textos={c.pessoasTexto} />
          </Section>
        </MediaText>
      </div>
    </div>
  );
}
