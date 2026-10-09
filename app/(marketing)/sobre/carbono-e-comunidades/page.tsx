import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import Quote from "@/components/marketing/sobre/Quote";
import MediaText from "@/components/marketing/sobre/MediaText";
import CautionCard from "@/components/marketing/sobre/CautionCard";
import Paragrafos from "@/components/marketing/Paragrafos";
import { CARBONO_E_COMUNIDADES, CARBONO_E_COMUNIDADES_IMAGEM } from "@/lib/content/sobre/carbono-e-comunidades";
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
          <Paragrafos textos={[c.leiFechamento]} />
        </Section>

        <CautionCard
          titulo={c.cuidadosTitulo}
          introducao={c.cuidadosIntroducao}
          itens={c.cuidadosItens}
          fechamento={c.cuidadosFechamento}
        />
      </div>
    </div>
  );
}
