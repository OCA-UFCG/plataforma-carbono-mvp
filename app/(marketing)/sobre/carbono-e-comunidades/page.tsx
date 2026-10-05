import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import Quote from "@/components/marketing/sobre/Quote";
import MediaText from "@/components/marketing/sobre/MediaText";
import StatTile from "@/components/marketing/sobre/StatTile";
import CautionCard from "@/components/marketing/sobre/CautionCard";
import QuestionTile from "@/components/marketing/sobre/QuestionTile";
import Paragrafos from "@/components/marketing/Paragrafos";
import {
  CARBONO_E_COMUNIDADES,
  CARBONO_E_COMUNIDADES_IMAGEM,
  perguntas,
} from "@/lib/content/sobre/carbono-e-comunidades";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Entenda essa relação" };

// "Entenda essa relação", Figma frame 18988:8769 (content 18988:8798), under
// the shared intro band and sub-navigation of sobre/layout.tsx. Copy lives in
// Contentful, shipped with lib/content/sobre/carbono-e-comunidades.ts.
export default async function SobreCarbonoComunidadesPage() {
  const { c } = await loadSiteCopy({ c: CARBONO_E_COMUNIDADES });

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <Section title={c.antesTitulo}>
          <Paragrafos textos={c.antesTexto} />
          <Quote>{c.antesDestaque}</Quote>
        </Section>

        <Section title={c.rendaTitulo}>
          <Paragrafos textos={c.rendaTexto} />
        </Section>

        <MediaText
          image={CARBONO_E_COMUNIDADES_IMAGEM.src}
          imageAlt={CARBONO_E_COMUNIDADES_IMAGEM.alt}
          imageSide="right"
        >
          <Section title={c.terraTitulo}>
            <Paragrafos textos={c.terraTexto} />
          </Section>
        </MediaText>

        <Section title={c.leiTitulo}>
          <Paragrafos textos={c.leiTexto} />
          <dl className={styles.garantias}>
            <StatTile rotulo={c.garantia1Rotulo} valor={c.garantia1Valor} />
            <StatTile rotulo={c.garantia2Rotulo} valor={c.garantia2Valor} />
          </dl>
          <Paragrafos textos={[c.leiFechamento]} />
        </Section>

        <Section title={c.decisoesTitulo}>
          <Paragrafos textos={c.decisoesTexto} />
        </Section>

        <Section title={c.beneficiosTitulo}>
          <Paragrafos textos={c.beneficiosTexto} />
        </Section>

        <CautionCard
          titulo={c.cuidadosTitulo}
          introducao={c.cuidadosIntroducao}
          itens={c.cuidadosItens}
          fechamento={c.cuidadosFechamento}
        />

        <Section title={c.perguntasTitulo}>
          <p>{c.perguntasIntroducao}</p>
          <ol className={styles.perguntas} role="list">
            {perguntas(c).map((item, i) => (
              <QuestionTile key={item.icone.src} numero={i + 1} pergunta={item.pergunta} icone={item.icone} />
            ))}
          </ol>
        </Section>

        <Paragrafos textos={[c.fechamento]} />
      </div>
    </div>
  );
}
