import type { Metadata } from "next";
import Section from "@/components/marketing/sobre/Section";
import MediaText from "@/components/marketing/sobre/MediaText";
import IconCard from "@/components/marketing/sobre/IconCard";
import PhotoBand from "@/components/marketing/PhotoBand";
import { SOBRE_FAIXA } from "@/lib/content/paginas";
import { SOBRE_PLATAFORMA as p } from "@/lib/content/sobre/plataforma";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Conheça a plataforma" };

// "Conheça a plataforma", Figma frame 18988:8611 (content 18988:8640), under
// the shared intro band and sub-navigation of sobre/layout.tsx, closing on
// the "O que a plataforma não faz" band. Copy lives in
// lib/content/sobre/plataforma.ts.
export default function SobrePlataformaPage() {
  return (
    <>
      <div className={styles.page}>
        <div className={`container ${styles.inner}`}>
          <MediaText image={p.porQue.imagem} imageAlt={p.porQue.imagemAlt} imageSide="right">
            <Section title={p.porQue.titulo}>
              {p.porQue.blocos.map((linhas) => (
                <p key={linhas[0]}>
                  {linhas.map((linha, i) => (
                    <span key={linha}>
                      {i > 0 && <br />}
                      {linha}
                    </span>
                  ))}
                </p>
              ))}
            </Section>
          </MediaText>

          <div className={styles.cards}>
            {p.cards.map((card) => (
              <IconCard key={card.titulo} {...card} />
            ))}
          </div>
        </div>
      </div>
      <PhotoBand {...SOBRE_FAIXA} tone="warm" />
    </>
  );
}
