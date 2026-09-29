import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import Section from "@/components/marketing/sobre/Section";
import MediaText from "@/components/marketing/sobre/MediaText";
import IconCard from "@/components/marketing/sobre/IconCard";
import PhotoBand from "@/components/marketing/PhotoBand";
import { SOBRE_FAIXA } from "@/lib/content/paginas";
import { SOBRE_PLATAFORMA as p } from "@/lib/content/sobre/plataforma";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SobreMetadata");
  return { title: t("platform") };
}

// "Conheça a plataforma", Figma frame 18988:8611 (content 18988:8640), under
// the shared intro band and sub-navigation of sobre/layout.tsx, closing on
// the "O que a plataforma não faz" band. The copy lives in
// translations/<locale>/SobrePlataformaPage.json, its structure in
// lib/content/sobre/plataforma.ts.
export default function SobrePlataformaPage() {
  const t = useTranslations("SobrePlataformaPage");

  return (
    <>
      <div className={styles.page}>
        <div className={`container ${styles.inner}`}>
          <MediaText image={p.porQue.imagem} imageAlt={t("why.imageAlt")} imageSide="right">
            <Section title={t("why.title")}>
              {p.porQue.blocos.map((linhas) => (
                <p key={linhas[0]}>
                  {linhas.map((linha, i) => (
                    <span key={linha}>
                      {i > 0 && <br />}
                      {t(`why.blocks.${linha}`)}
                    </span>
                  ))}
                </p>
              ))}
            </Section>
          </MediaText>

          <div className={styles.cards}>
            {p.cards.map((card) => (
              <IconCard
                key={card.id}
                titulo={t(`cards.${card.id}.title`)}
                icone={card.icone}
                paragrafos={card.paragrafos.map((key) => t(`cards.${card.id}.${key}`))}
              />
            ))}
          </div>
        </div>
      </div>
      <PhotoBand
        image={SOBRE_FAIXA.image}
        title={t("band.title")}
        items={SOBRE_FAIXA.itens.map((key) => t(`band.items.${key}`))}
        tone="warm"
      />
    </>
  );
}
