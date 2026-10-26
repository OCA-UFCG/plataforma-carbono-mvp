"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { stepPhotoIndex } from "@/lib/marketing/heroRotation";
import { MAPA_LINK, TERRITORIOS_LINK, type NavLink } from "@/lib/marketing/nav";
import type { INICIO_HERO } from "@/lib/content/inicio";
import type { Copy } from "@/lib/content/site/model";
import Linhas from "./Linhas";
import styles from "./Hero.module.css";

// What a photo shows over it: the text, set like Figma nodes 18862:8525 (h1)
// and 18862:8526 (lead), and its own buttons, the first filled and the second
// outlined like Figma's 18862:8529 and 18862:8530.
type HeroCard = {
  title: string;
  lead: string;
  actions: NavLink[];
};

// The words come from Contentful (lib/content/inicio.ts); where each button
// leads stays here.
function heroCards(copy: Copy<typeof INICIO_HERO>): HeroCard[] {
  return [
    {
      title: copy.foto1Titulo,
      lead: copy.foto1Texto,
      actions: [{ href: "/sobre", label: copy.foto1Botao, external: false }],
    },
    // Spells out the name.
    {
      title: copy.foto2Titulo,
      lead: copy.foto2Texto,
      actions: [{ href: "/comunicacao", label: copy.foto2Botao, external: false }],
    },
    {
      title: copy.foto3Titulo,
      lead: copy.foto3Texto,
      actions: [{ ...TERRITORIOS_LINK, label: copy.foto3Botao }],
    },
    {
      title: copy.foto4Titulo,
      lead: copy.foto4Texto,
      actions: [{ ...MAPA_LINK, label: copy.foto4Botao }],
    },
  ];
}

// The four rotating background photos (Figma node 18862:8516, "Background";
// the design's own image fill is a single placeholder frame, so the rotation
// behaviour absorbed from the deleted components/HeroBackground.tsx drives
// these committed assets instead), each under the card of the same position.
// `credit` is deliberately optional: the Figma overlay text "Foto: [nome da
// equipe]" is placeholder copy, not real copy. The real, mandatory credit for
// these photos is documented in IMAGENS.md ("Fotos de Artur Lourenço" —
// "Crédito na página: 'Fotos: Artur Lourenço'"), the same wording the
// pre-redesign hero rendered; it is filled in below so the overlay renders it
// — see the `activePhoto.credit` check.
type HeroPhoto = {
  src: string;
  alt: string;
  credit?: string;
};

// `alt` numbers the photos in the order they show, which the dots announce;
// the file names keep their original numbering.
const PHOTOS: HeroPhoto[] = [
  { src: "/images/hero/hero2.jpg", alt: "Foto 1 da Caatinga", credit: "Artur Lourenço" },
  { src: "/images/hero/hero3.jpg", alt: "Foto 2 da Caatinga", credit: "Artur Lourenço" },
  { src: "/images/hero/hero1.jpg", alt: "Foto 3 da Caatinga", credit: "Artur Lourenço" },
  { src: "/images/hero/hero4.jpg", alt: "Foto 4 da Caatinga", credit: "Artur Lourenço" },
];

// The arrow of data-nordeste-frontend's banner carousel, the sprite symbol
// "arrow" inlined: it points up and to the right, and the arrows turn it to
// point left or right (see .arrowIconPrevious / .arrowIconNext).
function ArrowIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 13 12" width={8} height={8} fill="none" aria-hidden className={className}>
      <path
        d="M1.5 11L11.5 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.94434 1H11.4999V6.55556"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Long enough to read the longest cards (the first and the third, 27 words
// each as shipped) after their 0.8s fade-in.
const ROTATION_INTERVAL_MS = 10000;

// Hero, Figma node 18862:8516 ("Background"), 495px tall under the 76px
// header. Rotation logic absorbed from the deleted components/HeroBackground.tsx:
// auto-advance every 10s unless the user prefers reduced motion, cross-fading
// between photos rather than swapping them abruptly.
export default function Hero({ copy }: { copy: Copy<typeof INICIO_HERO> }) {
  const cards = heroCards(copy);
  const [index, setIndex] = useState(0);
  // Bumped by every dot or arrow click, so a click restarts the wait in full
  // even when it picks the photo already showing.
  const [clicks, setClicks] = useState(0);
  // Set while keyboard focus is inside the hero, which holds the rotation: the
  // next card would make the focused button inert and drop the focus. A mouse
  // click on a dot or an arrow focuses it without :focus-visible, so it does
  // not hold.
  const [focusHeld, setFocusHeld] = useState(false);
  // What the polite live region reads after a dot or an arrow changes the
  // photo. Only those set it, never the timer, so the rotation does not
  // interrupt a screen reader every 10s.
  const [announcement, setAnnouncement] = useState("");

  // A timeout per photo rather than one interval, so the wait starts over
  // whenever the photo changes, by the timer, a dot or an arrow.
  useEffect(() => {
    if (PHOTOS.length < 2 || focusHeld) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setTimeout(
      () => setIndex((i) => stepPhotoIndex(i, 1, PHOTOS.length)),
      ROTATION_INTERVAL_MS
    );
    return () => clearTimeout(id);
  }, [index, clicks, focusHeld]);

  // The dots and the arrows both land here, so every manual change restarts
  // the wait.
  const goTo = (next: number) => {
    setIndex(next);
    setClicks((c) => c + 1);
    setAnnouncement(`Foto ${next + 1} de ${PHOTOS.length}: ${cards[next].title}`);
  };
  const step = (delta: number) => goTo(stepPhotoIndex(index, delta, PHOTOS.length));

  const activePhoto = PHOTOS[index];

  return (
    <section
      id="inicio"
      className={styles.hero}
      aria-label="Apresentação"
      onFocus={(event) => setFocusHeld((event.target as Element).matches(":focus-visible"))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusHeld(false);
      }}
    >
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
        {/* Every card is rendered, stacked in one cell that takes the
            tallest one's height, so changing photo never resizes the hero and
            shifts the page below it. Only the active one is visible; the rest
            are inert, out of the accessibility tree and the tab order. */}
        <div className={styles.content}>
          {cards.map((card, position) => {
            const active = position === index;
            return (
              <div
                key={position}
                className={`${styles.card}${active ? ` ${styles.cardActive}` : ""}`}
                inert={!active}
              >
                {/* Figma groups the h1 and the lead in their own container
                    (19253:14755) with a 16px gap, tighter than the card's 24. */}
                <div className={styles.copy}>
                  <h1 className={styles.title}>{card.title}</h1>
                  <p className={`${styles.lead} text-lead`}>
                    <Linhas texto={card.lead} />
                  </p>
                </div>
                <div className={styles.actions}>
                  {card.actions.map((action, i) => {
                    const className = `${i === 0 ? styles.primaryButton : styles.secondaryButton} text-ui-medium`;
                    // An external link crosses a route group: a full page
                    // load, not next/link.
                    return action.external ? (
                      <a key={action.href} href={action.href} className={className}>
                        {action.label}
                      </a>
                    ) : (
                      <Link key={action.href} href={action.href} className={className}>
                        {action.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowPrevious}`}
        aria-label="Foto anterior"
        onClick={() => step(-1)}
      >
        <ArrowIcon className={styles.arrowIconPrevious} />
      </button>
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowNext}`}
        aria-label="Próxima foto"
        onClick={() => step(1)}
      >
        <ArrowIcon className={styles.arrowIconNext} />
      </button>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {activePhoto.credit && <p className={styles.credit}>Foto: {activePhoto.credit}</p>}
    </section>
  );
}
