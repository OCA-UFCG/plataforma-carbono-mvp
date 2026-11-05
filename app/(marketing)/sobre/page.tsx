import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Section from "@/components/marketing/sobre/Section";
import MediaText from "@/components/marketing/sobre/MediaText";
import Quote from "@/components/marketing/sobre/Quote";
import AudienceBand from "@/components/marketing/sobre/AudienceBand";
import LimitList from "@/components/marketing/sobre/LimitList";
import Linhas from "@/components/marketing/Linhas";
import Paragrafos from "@/components/marketing/Paragrafos";
import {
  SOBRE_LIMITES_IMAGEM,
  SOBRE_PLATAFORMA,
  SOBRE_PLATAFORMA_IMAGEM,
} from "@/lib/content/sobre/plataforma";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import { getSiteLocale } from "@/i18n/siteLocale";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Sobre"))("pages.plataforma") };
}

// "Conheça a plataforma", Figma frame 19538:11039 (content 19538:11069), under
// the shared intro band and sub-navigation of sobre/layout.tsx: why the
// platform exists and its mission, who it is for on a grey band, and what it
// does not do on a white one, which meets the footer. Copy lives in
// Contentful, shipped with lib/content/sobre/plataforma.ts.
export default async function SobrePlataformaPage() {
  const t = await getTranslations("Sobre");
  const { p } = await loadSiteCopy({ p: SOBRE_PLATAFORMA }, undefined, await getSiteLocale());

  return (
    <div className={styles.page}>
      <div className={`container ${styles.porQue}`}>
        <MediaText
          image={SOBRE_PLATAFORMA_IMAGEM.src}
          imageAlt={t("imageAlt.plataforma")}
          imageSide="right"
          imageRadius={8}
        >
          <Section title={p.porQueTitulo}>
            <Paragrafos textos={p.porQueTexto} />
          </Section>
        </MediaText>

        <section className={styles.missao} aria-labelledby="missao-titulo">
          <h2 id="missao-titulo" className={`${styles.titulo} text-h3`}>
            {p.missaoTitulo}
          </h2>
          <Quote size="large">
            <Linhas texto={p.missaoTexto} />
          </Quote>
        </section>
      </div>

      <AudienceBand titulo={p.publicoTitulo} perfis={p.publicoPerfis} textos={p.publicoTexto} />

      <div className={styles.limites}>
        <div className="container">
          <MediaText
            image={SOBRE_LIMITES_IMAGEM.src}
            imageAlt={t("imageAlt.limites")}
            imageSide="left"
            imageSize="wide"
            imageRadius={8}
          >
            <LimitList titulo={p.faixaTitulo} itens={p.faixaItens} />
          </MediaText>
        </div>
      </div>
    </div>
  );
}
