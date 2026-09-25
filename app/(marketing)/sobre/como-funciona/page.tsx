import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import StepCard from "@/components/marketing/sobre/StepCard";
import { COMO_FUNCIONA as c } from "@/lib/content/sobre/como-funciona";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Como funciona" };

// "Como funciona", Figma frame 18988:8943 (content 18988:8972), under the
// shared intro band and sub-navigation of sobre/layout.tsx: the six steps of
// using the map, then the frequent questions. Copy lives in
// lib/content/sobre/como-funciona.ts.
export default function SobreComoFuncionaPage() {
  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        {/* role="list" restores the semantics `list-style: none` strips in
            Safari/VoiceOver, as in Destaques.tsx. */}
        <ol className={styles.passos} role="list">
          {c.passos.map((passo, i) => (
            <StepCard key={passo.titulo} numero={i + 1} passo={passo} />
          ))}
        </ol>

        {/* A description list: each question with its answer, 4px below it,
            8px between pairs (18988:8983). */}
        <Section title={c.duvidas.titulo}>
          <dl className={styles.duvidas}>
            {c.duvidas.itens.map((d) => (
              <div key={d.pergunta} className={styles.duvida}>
                <dt className={styles.pergunta}>{d.pergunta}</dt>
                <dd className={styles.resposta}>{d.resposta}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}
