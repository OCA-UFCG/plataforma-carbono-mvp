import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import Quote from "@/components/marketing/sobre/Quote";
import MediaText from "@/components/marketing/sobre/MediaText";
import IndicatorCard from "@/components/marketing/IndicatorCard";
import Paragrafos from "@/components/marketing/Paragrafos";
import { CAATINGA, CAATINGA_PESSOAS_IMAGEM } from "@/lib/content/sobre/caatinga";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Conheça a Caatinga" };

// "Conheça a Caatinga", Figma frame 18988:8667 (content 18988:8696), under the
// shared intro band and sub-navigation of sobre/layout.tsx. Copy lives in
// Contentful, shipped with lib/content/sobre/caatinga.ts.
export default async function SobreCaatingaPage() {
  const { c } = await loadSiteCopy({ c: CAATINGA });

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

        <Section title={c.climaTitulo}>
          <Paragrafos textos={[c.climaAntes]} />
          <div className={styles.indicador}>
            <IndicatorCard
              label={c.climaIndicadorRotulo}
              value={c.climaIndicadorValor}
              description={c.climaIndicadorTexto}
              variant="outlined"
            />
          </div>
          <Paragrafos textos={[c.climaDepois]} />
        </Section>

        <Section title={c.eficienciaTitulo}>
          <Paragrafos textos={[c.eficienciaAntes]} />
          <div className={styles.indicador}>
            <IndicatorCard
              label={c.eficienciaIndicadorRotulo}
              value={c.eficienciaIndicadorValor}
              description={c.eficienciaIndicadorTexto}
              variant="outlined"
            />
          </div>
          <Paragrafos textos={[c.eficienciaDepois]} />
        </Section>

        <Section title={c.armazenamentoTitulo}>
          <Paragrafos textos={[c.armazenamentoAntes]} />
          <ul className={styles.indicadores} role="list">
            <li role="listitem">
              <IndicatorCard
                label={c.armazenamentoIndicador1Rotulo}
                value={c.armazenamentoIndicador1Valor}
                description={c.armazenamentoIndicador1Texto}
                variant="outlined"
              />
            </li>
            <li role="listitem">
              <IndicatorCard
                label={c.armazenamentoIndicador2Rotulo}
                value={c.armazenamentoIndicador2Valor}
                description={c.armazenamentoIndicador2Texto}
                variant="outlined"
              />
            </li>
          </ul>
          <Paragrafos textos={c.armazenamentoDepois} />
        </Section>

        <MediaText
          image={CAATINGA_PESSOAS_IMAGEM.src}
          imageAlt={CAATINGA_PESSOAS_IMAGEM.alt}
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
