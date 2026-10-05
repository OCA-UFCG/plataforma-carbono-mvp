"use client";

import { useEffect, useState } from "react";
import { MAPA_LINK } from "@/lib/marketing/nav";
import styles from "./Hero.module.css";

type HeroCopy = {
  title: string;
  lead: string;
};

// The text over the photos, set like Figma nodes 18862:8525 (h1) and
// 18862:8526 (lead); the design's eyebrow, "Mercado de Carbono na Caatinga",
// is gone. The first three photos each bring one; the rest show DEFAULT_COPY.

// Spells out the name: Caatinga, Valorização, Autonomia e Renda.
const VALORIZACAO_COPY: HeroCopy = {
  title:
    "Informação que valoriza a Caatinga e fortalece autonomia e renda dos territórios",
  lead: "Caativar: Caatinga, Valorização, Autonomia e Renda",
};

const CAATINGA_COPY: HeroCopy = {
  title:
    "Dados abertos e mapas para entender o carbono da Caatinga e decidir com mais segurança",
  lead: "Informação aberta para que comunidades e gestores avaliem projetos de carbono e negociem em condições mais justas.",
};

// The design's own copy: CAATINGA_COPY about "o bioma".
const DEFAULT_COPY: HeroCopy = {
  title:
    "Dados abertos e mapas para entender o carbono do bioma e decidir com mais segurança",
  lead: CAATINGA_COPY.lead,
};

const COPIES = [VALORIZACAO_COPY, CAATINGA_COPY, DEFAULT_COPY];

// The five rotating background photos (Figma node 18862:8516, "Background";
// the design's own image fill is a single placeholder frame, so the rotation
// behaviour absorbed from the deleted components/HeroBackground.tsx drives
// these committed assets instead). `credit` is deliberately optional: the
// Figma overlay text "Foto: [nome da equipe]" is placeholder copy, not real
// copy. The real, mandatory credit for these five photos is documented in
// IMAGENS.md ("Fotos de Artur Lourenço" — "Crédito na página: 'Fotos: Artur
// Lourenço'"), the same wording the pre-redesign hero rendered; it is filled
// in below so the overlay renders it — see the `activePhoto.credit` check.
type HeroPhoto = {
  src: string;
  alt: string;
  credit?: string;
  copy?: HeroCopy;
};

// `alt` numbers the photos in the order they show, which the dots announce;
// the file names keep their original numbering.
const PHOTOS: HeroPhoto[] = [
  {
    src: "/images/hero/hero2.jpg",
    alt: "Foto 1 da Caatinga",
    credit: "Artur Lourenço",
    copy: VALORIZACAO_COPY,
  },
  {
    src: "/images/hero/hero3.jpg",
    alt: "Foto 2 da Caatinga",
    credit: "Artur Lourenço",
    copy: CAATINGA_COPY,
  },
  { src: "/images/hero/hero1.jpg", alt: "Foto 3 da Caatinga", credit: "Artur Lourenço" },
  { src: "/images/hero/hero4.jpg", alt: "Foto 4 da Caatinga", credit: "Artur Lourenço" },
  { src: "/images/hero/hero5.jpg", alt: "Foto 5 da Caatinga", credit: "Artur Lourenço" },
];

// Long enough to read the longer copies (CAATINGA_COPY and DEFAULT_COPY, 32
// words each) after their 0.8s fade-in.
const ROTATION_INTERVAL_MS = 10000;

// Hero, Figma node 18862:8516 ("Background"), 495px tall under the 76px
// header. Rotation logic absorbed from the deleted components/HeroBackground.tsx:
// auto-advance every 10s unless the user prefers reduced motion, cross-fading
// between photos rather than swapping them abruptly.
export default function Hero() {
  const [index, setIndex] = useState(0);
  // Bumped by every dot click, so a click restarts the wait in full even when
  // it picks the photo already showing.
  const [clicks, setClicks] = useState(0);

  // A timeout per photo rather than one interval, so the wait starts over
  // whenever the photo changes, by the timer or by a dot.
  useEffect(() => {
    if (PHOTOS.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % PHOTOS.length),
      ROTATION_INTERVAL_MS
    );
    return () => clearTimeout(id);
  }, [index, clicks]);

  const activePhoto = PHOTOS[index];
  const activeCopy = activePhoto.copy ?? DEFAULT_COPY;

  return (
    <section id="inicio" className={styles.hero} aria-label="Apresentação">
      <div className={styles.background} aria-hidden>
        {PHOTOS.map((photo, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.src}
            src={photo.src}
            alt=""
            className={styles.backgroundImage}
            style={{ opacity: i === index ? 1 : 0 }}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        <div className={styles.gradient} />
      </div>

      <div className={`container ${styles.contentArea}`}>
        <div className={styles.content}>
          {/* Every copy is rendered, stacked in one cell that takes the
              tallest one's height, so changing photo never resizes the hero
              and shifts the page below it. Only the active one is visible
              (and in the accessibility tree). */}
          <div className={styles.copyStack}>
            {COPIES.map((copy) => {
              const active = copy === activeCopy;
              return (
                <div
                  key={copy.title}
                  className={`${styles.copy}${active ? ` ${styles.copyActive}` : ""}`}
                  aria-hidden={!active}
                >
                  <h1 className={styles.title}>{copy.title}</h1>
                  <p className={`${styles.lead} text-lead`}>{copy.lead}</p>
                </div>
              );
            })}
          </div>
          <div className={styles.actions}>
            {/* MAPA_LINK crosses a route group: a full page load, not next/link. */}
            <a href={MAPA_LINK.href} className={`${styles.primaryButton} text-ui-medium`}>
              Acessar plataforma
            </a>
            <a href="#comunicacao" className={`${styles.secondaryButton} text-ui-medium`}>
              Ver materiais
            </a>
          </div>
        </div>
      </div>

      <div className={`container ${styles.dots}`} role="group" aria-label="Selecionar foto de fundo">
        {PHOTOS.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            className={`${styles.dot}${i === index ? ` ${styles.dotActive}` : ""}`}
            aria-label={`Mostrar ${photo.alt}`}
            aria-pressed={i === index}
            onClick={() => {
              setIndex(i);
              setClicks((c) => c + 1);
            }}
          />
        ))}
      </div>

      {activePhoto.credit && <p className={styles.credit}>Foto: {activePhoto.credit}</p>}
    </section>
  );
}
