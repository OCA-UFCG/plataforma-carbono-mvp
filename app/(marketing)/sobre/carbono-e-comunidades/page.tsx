import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import Section from "@/components/marketing/sobre/Section";
import Quote from "@/components/marketing/sobre/Quote";
import MediaText from "@/components/marketing/sobre/MediaText";
import StatTile from "@/components/marketing/sobre/StatTile";
import CautionCard from "@/components/marketing/sobre/CautionCard";
import QuestionTile from "@/components/marketing/sobre/QuestionTile";
import { CARBONO_E_COMUNIDADES as c } from "@/lib/content/sobre/carbono-e-comunidades";
import type { SecaoTexto } from "@/lib/content/sobre/carbono-e-comunidades";
import styles from "./page.module.css";

const NAMESPACE = "SobreCarbonoComunidadesPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SobreMetadata");
  return { title: t("relation") };
}

function Paragrafos({ secao }: { secao: SecaoTexto }) {
  const t = useTranslations(NAMESPACE);
  return secao.paragrafos.map((key) => <p key={key}>{t(`${secao.id}.${key}`)}</p>);
}

// "Entenda essa relação", Figma frame 18988:8769 (content 18988:8798), under
// the shared intro band and sub-navigation of sobre/layout.tsx. The copy lives
// in translations/<locale>/SobreCarbonoComunidadesPage.json, its structure in
// lib/content/sobre/carbono-e-comunidades.ts.
export default function SobreCarbonoComunidadesPage() {
  const t = useTranslations(NAMESPACE);

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <Section title={t(`${c.antesDeParticipar.id}.title`)}>
          <Paragrafos secao={c.antesDeParticipar} />
          <Quote>{t(`${c.antesDeParticipar.id}.highlight`)}</Quote>
        </Section>

        <Section title={t(`${c.renda.id}.title`)}>
          <Paragrafos secao={c.renda} />
        </Section>

        <MediaText image={c.direitoTerra.imagem} imageAlt={t(`${c.direitoTerra.id}.imageAlt`)} imageSide="right">
          <Section title={t(`${c.direitoTerra.id}.title`)}>
            <Paragrafos secao={c.direitoTerra} />
          </Section>
        </MediaText>

        <Section title={t(`${c.lei.id}.title`)}>
          <Paragrafos secao={c.lei} />
          <dl className={styles.garantias}>
            {c.lei.garantias.map((id) => (
              <StatTile
                key={id}
                rotulo={t(`${c.lei.id}.guarantees.${id}.label`)}
                valor={t(`${c.lei.id}.guarantees.${id}.value`)}
              />
            ))}
          </dl>
          <p>{t(`${c.lei.id}.closing`)}</p>
        </Section>

        <Section title={t(`${c.decisoes.id}.title`)}>
          <Paragrafos secao={c.decisoes} />
        </Section>

        <Section title={t(`${c.beneficios.id}.title`)}>
          <Paragrafos secao={c.beneficios} />
        </Section>

        <CautionCard
          titulo={t("cautions.title")}
          introducao={t("cautions.introduction")}
          itens={c.cuidados.itens.map((key) => t(`cautions.items.${key}`))}
          fechamento={t("cautions.closing")}
        />

        <Section title={t("questions.title")}>
          <p>{t("questions.introduction")}</p>
          <ol className={styles.perguntas} role="list">
            {c.perguntas.itens.map((item, i) => (
              <QuestionTile
                key={item.id}
                numero={i + 1}
                pergunta={t(`questions.items.${item.id}`)}
                icone={item.icone}
              />
            ))}
          </ol>
        </Section>

        <p>{t("closing")}</p>
      </div>
    </div>
  );
}
