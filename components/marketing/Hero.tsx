"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MAPA_LINK } from "@/lib/marketing/nav";
import styles from "./Hero.module.css";

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
  credit?: string;
};

const PHOTOS: HeroPhoto[] = [
  { src: "/images/hero/hero1.jpg", credit: "Artur Lourenço" },
  { src: "/images/hero/hero2.jpg", credit: "Artur Lourenço" },
  { src: "/images/hero/hero3.jpg", credit: "Artur Lourenço" },
  { src: "/images/hero/hero4.jpg", credit: "Artur Lourenço" },
  { src: "/images/hero/hero5.jpg", credit: "Artur Lourenço" },
];

const ROTATION_INTERVAL_MS = 6000;

// Hero, Figma node 18862:8516 ("Background"), 495px tall under the 76px
// header. Rotation logic absorbed from the deleted components/HeroBackground.tsx:
// auto-advance every 6s unless the user prefers reduced motion, cross-fading
// between photos rather than swapping them abruptly.
export default function Hero() {
  const t = useTranslations("Hero");
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
    <section id="inicio" className={styles.hero} aria-label={t("ariaLabel")}>
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
            {t("eyebrow")}
          </p>
          <h1 className={styles.title}>
            {t("title")}
          </h1>
          <p className={`${styles.lead} text-lead`}>
            {t("lead")}
          </p>
          <div className={styles.actions}>
            {/* MAPA_LINK crosses a route group: a full page load, not next/link. */}
            <a href={MAPA_LINK.href} className={`${styles.primaryButton} text-body`}>
              {t("openMaps")}
            </a>
            <a href="#comunicacao" className={`${styles.secondaryButton} text-body`}>
              {t("viewMaterials")}
            </a>
          </div>
        </div>
      </div>

      <div className={`container ${styles.dots}`} role="group" aria-label={t("photoPicker")}>
        {PHOTOS.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            className={`${styles.dot}${i === index ? ` ${styles.dotActive}` : ""}`}
            aria-label={t("showPhoto", { alt: t("photoAlt", { number: i + 1 }) })}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>

      <div className={`container ${styles.creditRow}`}>
        {activePhoto.credit && (
          <p className={`${styles.credit} text-subtle`}>{t("credit", { name: activePhoto.credit })}</p>
        )}
      </div>
    </section>
  );
}
