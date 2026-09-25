import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import Quote from "@/components/marketing/sobre/Quote";
import MediaText from "@/components/marketing/sobre/MediaText";
import StatTile from "@/components/marketing/sobre/StatTile";
import CautionCard from "@/components/marketing/sobre/CautionCard";
import QuestionTile from "@/components/marketing/sobre/QuestionTile";
import { CARBONO_E_COMUNIDADES as c } from "@/lib/content/sobre/carbono-e-comunidades";
import type { SecaoTexto } from "@/lib/content/sobre/carbono-e-comunidades";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Entenda essa relação" };

function Paragrafos({ secao }: { secao: SecaoTexto }) {
  return secao.paragrafos.map((p) => <p key={p}>{p}</p>);
}

// "Entenda essa relação", Figma frame 18988:8769 (content 18988:8798), under
// the shared intro band and sub-navigation of sobre/layout.tsx. Copy lives in
// lib/content/sobre/carbono-e-comunidades.ts.
export default function SobreCarbonoComunidadesPage() {
  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <Section title={c.antesDeParticipar.titulo}>
          <Paragrafos secao={c.antesDeParticipar} />
          <Quote>{c.antesDeParticipar.destaque}</Quote>
        </Section>

        <Section title={c.renda.titulo}>
          <Paragrafos secao={c.renda} />
        </Section>

        <MediaText image={c.direitoTerra.imagem} imageAlt={c.direitoTerra.imagemAlt} imageSide="right">
          <Section title={c.direitoTerra.titulo}>
            <Paragrafos secao={c.direitoTerra} />
          </Section>
        </MediaText>

        <Section title={c.lei.titulo}>
          <Paragrafos secao={c.lei} />
          <dl className={styles.garantias}>
            {c.lei.garantias.map((g) => (
              <StatTile key={g.rotulo} rotulo={g.rotulo} valor={g.valor} />
            ))}
          </dl>
          <p>{c.lei.fechamento}</p>
        </Section>

        <Section title={c.decisoes.titulo}>
          <Paragrafos secao={c.decisoes} />
        </Section>

        <Section title={c.beneficios.titulo}>
          <Paragrafos secao={c.beneficios} />
        </Section>

        <CautionCard {...c.cuidados} />

        <Section title={c.perguntas.titulo}>
          <p>{c.perguntas.introducao}</p>
          <ol className={styles.perguntas} role="list">
            {c.perguntas.itens.map((item, i) => (
              <QuestionTile key={item.pergunta} numero={i + 1} pergunta={item.pergunta} icone={item.icone} />
            ))}
          </ol>
        </Section>

        <p>{c.fechamento}</p>
      </div>
    </div>
  );
}
