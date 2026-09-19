"use client";

import { useEffect, useState } from "react";
import { MAPA_LINK } from "@/lib/marketing/nav";
import styles from "./Hero.module.css";

// The five rotating background photos (Figma node 18862:8516, "Background";
// the design's own image fill is a single placeholder frame, so the rotation
// behaviour absorbed from the deleted components/HeroBackground.tsx drives
// these committed assets instead). `credit` is deliberately optional: the
// Figma overlay text "Foto: [nome da equipe]" is placeholder copy, not real
// copy, and none of these photos has a known credit yet. When one is known it
// goes here and the overlay renders itself — see the `activePhoto.credit`
// check below.
type HeroPhoto = {
  src: string;
  alt: string;
  credit?: string;
};

const PHOTOS: HeroPhoto[] = [
  { src: "/images/hero/hero1.jpg", alt: "Foto 1 da Caatinga" },
  { src: "/images/hero/hero2.jpg", alt: "Foto 2 da Caatinga" },
  { src: "/images/hero/hero3.jpg", alt: "Foto 3 da Caatinga" },
  { src: "/images/hero/hero4.jpg", alt: "Foto 4 da Caatinga" },
  { src: "/images/hero/hero5.jpg", alt: "Foto 5 da Caatinga" },
];

const ROTATION_INTERVAL_MS = 6000;

// Hero, Figma node 18862:8516 ("Background"), 495px tall under the 76px
// header. Rotation logic absorbed from the deleted components/HeroBackground.tsx:
// auto-advance every 6s unless the user prefers reduced motion, cross-fading
// between photos rather than swapping them abruptly.
export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (PHOTOS.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % PHOTOS.length),
      ROTATION_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, []);

  const activePhoto = PHOTOS[index];

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
          <p className={`${styles.eyebrow} text-subtle-semibold`}>
            Mercado de Carbono na Caatinga
          </p>
          <h1 className={styles.title}>
            Dados abertos e mapas para entender o carbono do bioma e decidir com
            mais segurança
          </h1>
          <p className={`${styles.lead} text-lead`}>
            Informação aberta para que comunidades e gestores avaliem projetos
            de carbono e negociem em condições mais justas.
          </p>
          <div className={styles.actions}>
            {/* MAPA_LINK crosses a route group: a full page load, not next/link. */}
            <a href={MAPA_LINK.href} className={`${styles.primaryButton} text-body`}>
              Abrir os mapas
            </a>
            <a href="#comunicacao" className={`${styles.secondaryButton} text-body`}>
              Ver materiais
            </a>
          </div>
        </div>
      </div>

      <div className={styles.dots} role="group" aria-label="Selecionar foto de fundo">
        {PHOTOS.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            className={`${styles.dot}${i === index ? ` ${styles.dotActive}` : ""}`}
            aria-label={`Mostrar ${photo.alt}`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>

      {activePhoto.credit && (
        <p className={`${styles.credit} text-subtle`}>Foto: {activePhoto.credit}</p>
      )}
    </section>
  );
}
