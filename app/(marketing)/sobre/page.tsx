import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import MediaText from "@/components/marketing/sobre/MediaText";
import IconCard from "@/components/marketing/sobre/IconCard";
import PhotoBand from "@/components/marketing/PhotoBand";
import Paragrafos from "@/components/marketing/Paragrafos";
import { SOBRE_FAIXA_IMAGEM } from "@/lib/content/paginas";
import {
  SOBRE_PLATAFORMA,
  SOBRE_PLATAFORMA_ICONES,
  SOBRE_PLATAFORMA_IMAGEM,
} from "@/lib/content/sobre/plataforma";
import { loadSiteCopy } from "@/lib/content/site/fetch";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Conheça a plataforma" };

// "Conheça a plataforma", Figma frame 18988:8611 (content 18988:8640), under
// the shared intro band and sub-navigation of sobre/layout.tsx, closing on
// the "O que a plataforma não faz" band. Copy lives in Contentful, shipped
// with lib/content/sobre/plataforma.ts.
export default async function SobrePlataformaPage() {
  const { p } = await loadSiteCopy({ p: SOBRE_PLATAFORMA });

  return (
    <>
      <div className={styles.page}>
        <div className={`container ${styles.inner}`}>
          <MediaText image={SOBRE_PLATAFORMA_IMAGEM.src} imageAlt={SOBRE_PLATAFORMA_IMAGEM.alt} imageSide="right">
            <Section title={p.porQueTitulo}>
              <Paragrafos textos={p.porQueTexto} />
            </Section>
          </MediaText>

          <div className={styles.cards}>
            <IconCard titulo={p.missaoTitulo} icone={SOBRE_PLATAFORMA_ICONES.missao} paragrafos={p.missaoTexto} />
            <IconCard titulo={p.publicoTitulo} icone={SOBRE_PLATAFORMA_ICONES.publico} paragrafos={p.publicoTexto} />
          </div>
        </div>
      </div>
      <PhotoBand image={SOBRE_FAIXA_IMAGEM} title={p.faixaTitulo} items={p.faixaItens} tone="warm" />
    </>
  );
}
