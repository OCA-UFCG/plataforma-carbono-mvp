import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import Quote from "@/components/marketing/sobre/Quote";
import MediaText from "@/components/marketing/sobre/MediaText";
import Comparison from "@/components/marketing/sobre/Comparison";
import IndicatorCard from "@/components/marketing/IndicatorCard";
import { CAATINGA as c } from "@/lib/content/sobre/caatinga";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Conheça a Caatinga" };

// "Conheça a Caatinga", Figma frame 18988:8667 (content 18988:8696), under the
// shared intro band and sub-navigation of sobre/layout.tsx. Copy lives in
// lib/content/sobre/caatinga.ts.
export default function SobreCaatingaPage() {
  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.abertura}>
          {c.abertura.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <Section title={c.vegetacao.titulo}>
          {c.vegetacao.blocos.map((linhas) => (
            <p key={linhas[0]}>
              {linhas.map((linha, i) => (
                <span key={linha}>
                  {i > 0 && <br />}
                  {linha}
                </span>
              ))}
            </p>
          ))}
          <Quote>{c.vegetacao.destaque}</Quote>
        </Section>

        <Section title={c.clima.titulo}>
          <p>{c.clima.antes}</p>
          <div className={styles.indicador}>
            <IndicatorCard {...c.clima.indicador} variant="outlined" />
          </div>
          <p>{c.clima.depois}</p>
        </Section>

        <Section title={c.eficiencia.titulo}>
          <p>{c.eficiencia.antes}</p>
          <div className={styles.indicador}>
            <IndicatorCard {...c.eficiencia.indicador} variant="outlined" />
          </div>
          <p>{c.eficiencia.depois}</p>
        </Section>

        <Section title={c.armazenamento.titulo}>
          <p>{c.armazenamento.antes}</p>
          <ul className={styles.indicadores} role="list">
            {c.armazenamento.indicadores.map((i) => (
              <li key={i.label} role="listitem">
                <IndicatorCard {...i} variant="outlined" />
              </li>
            ))}
          </ul>
          {c.armazenamento.depois.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Section>

        <MediaText image={c.pessoas.imagem} imageAlt={c.pessoas.imagemAlt} imageSide="left" imageSize="small">
          <Section title={c.pessoas.titulo}>
            {c.pessoas.paragrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Section>
        </MediaText>

        <Section title={c.pressao.titulo} tone="alert">
          <p>{c.pressao.antes}</p>
          <Comparison {...c.pressao.comparacao} />
          <p>{c.pressao.depois}</p>
        </Section>
      </div>
    </div>
  );
}
