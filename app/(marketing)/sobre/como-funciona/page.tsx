import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import Section from "@/components/marketing/sobre/Section";
import StepCard from "@/components/marketing/sobre/StepCard";
import { COMO_FUNCIONA as c } from "@/lib/content/sobre/como-funciona";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SobreMetadata");
  return { title: t("howItWorks") };
}

// "Como funciona", Figma frame 18988:8943 (content 18988:8972), under the
// shared intro band and sub-navigation of sobre/layout.tsx: the six steps of
// using the map, then the frequent questions. The copy lives in
// translations/<locale>/SobreComoFuncionaPage.json, its structure in
// lib/content/sobre/como-funciona.ts.
export default function SobreComoFuncionaPage() {
  const t = useTranslations("SobreComoFuncionaPage");

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        {/* role="list" restores the semantics `list-style: none` strips in
            Safari/VoiceOver, as in Destaques.tsx. */}
        <ol className={styles.passos} role="list">
          {c.passos.map((passo, i) => (
            <StepCard
              key={passo.id}
              numero={i + 1}
              passo={{
                titulo: t(`steps.${passo.id}.title`),
                paragrafos: passo.paragrafos.map((key) => t(`steps.${passo.id}.${key}`)),
                grupos: passo.grupos?.map((grupo) => ({
                  id: grupo.id,
                  rotulo: t(`steps.${passo.id}.groups.${grupo.id}.label`),
                  tom: grupo.tom,
                  itens: grupo.itens.map((item) => t(`steps.${passo.id}.groups.${grupo.id}.items.${item}`)),
                })),
              }}
            />
          ))}
        </ol>

        {/* A description list: each question with its answer, 4px below it,
            8px between pairs (18988:8983). */}
        <Section title={t("faq.title")}>
          <dl className={styles.duvidas}>
            {c.duvidas.map((id) => (
              <div key={id} className={styles.duvida}>
                <dt className={styles.pergunta}>{t(`faq.items.${id}.question`)}</dt>
                <dd className={styles.resposta}>{t(`faq.items.${id}.answer`)}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}
