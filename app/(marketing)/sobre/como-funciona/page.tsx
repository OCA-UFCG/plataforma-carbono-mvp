import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import StepCard from "@/components/marketing/sobre/StepCard";
import Linhas from "@/components/marketing/Linhas";
import { COMO_FUNCIONA, duvidas, passos } from "@/lib/content/sobre/como-funciona";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Como funciona" };

// "Como funciona", Figma frame 18988:8943 (content 18988:8972), under the
// shared intro band and sub-navigation of sobre/layout.tsx: the six steps of
// using the map, then the frequent questions. Copy lives in Contentful,
// shipped with lib/content/sobre/como-funciona.ts.
export default async function SobreComoFuncionaPage() {
  const { c } = await loadSiteCopy({ c: COMO_FUNCIONA });

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        {/* role="list" restores the semantics `list-style: none` strips in
            Safari/VoiceOver, as in Destaques.tsx. */}
        <ol className={styles.passos} role="list">
          {passos(c).map((passo, i) => (
            <StepCard key={i} numero={i + 1} passo={passo} />
          ))}
        </ol>

        {/* A description list: each question with its answer, 4px below it,
            8px between pairs (18988:8983). */}
        <Section title={c.duvidasTitulo}>
          <dl className={styles.duvidas}>
            {duvidas(c).map((d, i) => (
              <div key={i} className={styles.duvida}>
                <dt className={styles.pergunta}>{d.pergunta}</dt>
                <dd className={styles.resposta}>
                  <Linhas texto={d.resposta} />
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}
