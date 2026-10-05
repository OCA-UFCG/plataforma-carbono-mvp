"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MAPA_LINK, TERRITORIOS_LINK, type NavLink } from "@/lib/marketing/nav";
import styles from "./Hero.module.css";

// What a photo shows over it: the text, set like Figma nodes 18862:8525 (h1)
// and 18862:8526 (lead), and its own buttons, the first filled and the second
// outlined like Figma's 18862:8529 and 18862:8530.
type HeroCard = {
  title: string;
  lead: string;
  actions: NavLink[];
};

const INICIATIVA_CARD: HeroCard = {
  title: "Dados abertos e mapas para entender o carbono na Caatinga",
  lead: "Informação aberta para que comunidades e gestores avaliem projetos de carbono e negociem em condições mais justas",
  actions: [{ href: "/sobre", label: "Sobre a iniciativa", external: false }],
};

// Spells out the name.
const VALORIZACAO_CARD: HeroCard = {
  title: "Caativar: Caatinga, Valorização, Autonomia e Renda",
  lead: "Informação que valoriza a Caatinga e fortalece autonomia e renda dos territórios",
  actions: [{ href: "/comunicacao", label: "Acesse os materiais", external: false }],
};

const RESUMO_CARD: HeroCard = {
  title: "Uma forma simplificada de conhecer mais sobre diferentes territórios",
  lead: "Obtenha um panorama resumido com dados sobre carbono, pressões ambientais e clima para o território do seu interesse",
  actions: [{ ...TERRITORIOS_LINK, label: "Acesse o resumo territorial" }],
};

const PLATAFORMA_CARD: HeroCard = {
  title: "Em breve: Plataforma de dados ambientais",
  lead: "Uma plataforma que reúne dados de carbono, vegetação, solo e clima para diferentes áreas da Caatinga",
  actions: [{ ...MAPA_LINK, label: "Acesse a plataforma" }],
};

const CARDS = [INICIATIVA_CARD, VALORIZACAO_CARD, RESUMO_CARD, PLATAFORMA_CARD];

// The four rotating background photos (Figma node 18862:8516, "Background";
// the design's own image fill is a single placeholder frame, so the rotation
// behaviour absorbed from the deleted components/HeroBackground.tsx drives
// these committed assets instead). `credit` is deliberately optional: the
// Figma overlay text "Foto: [nome da equipe]" is placeholder copy, not real
// copy. The real, mandatory credit for these photos is documented in
// IMAGENS.md ("Fotos de Artur Lourenço" — "Crédito na página: 'Fotos: Artur
// Lourenço'"), the same wording the pre-redesign hero rendered; it is filled
// in below so the overlay renders it — see the `activePhoto.credit` check.
type HeroPhoto = {
  src: string;
  alt: string;
  credit?: string;
  card: HeroCard;
};

// `alt` numbers the photos in the order they show, which the dots announce;
// the file names keep their original numbering.
const PHOTOS: HeroPhoto[] = [
  { src: "/images/hero/hero2.jpg", alt: "Foto 1 da Caatinga", credit: "Artur Lourenço", card: INICIATIVA_CARD },
  { src: "/images/hero/hero3.jpg", alt: "Foto 2 da Caatinga", credit: "Artur Lourenço", card: VALORIZACAO_CARD },
  { src: "/images/hero/hero1.jpg", alt: "Foto 3 da Caatinga", credit: "Artur Lourenço", card: RESUMO_CARD },
  { src: "/images/hero/hero4.jpg", alt: "Foto 4 da Caatinga", credit: "Artur Lourenço", card: PLATAFORMA_CARD },
];

// Long enough to read the longest cards (INICIATIVA_CARD and RESUMO_CARD, 27
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
  // Set while keyboard focus is inside the hero, which holds the rotation: the
  // next card would make the focused button inert and drop the focus. A mouse
  // click on a dot focuses it without :focus-visible, so it does not hold.
  const [focusHeld, setFocusHeld] = useState(false);

  // A timeout per photo rather than one interval, so the wait starts over
  // whenever the photo changes, by the timer or by a dot.
  useEffect(() => {
    if (PHOTOS.length < 2 || focusHeld) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % PHOTOS.length),
      ROTATION_INTERVAL_MS
    );
    return () => clearTimeout(id);
  }, [index, clicks, focusHeld]);

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
          {CARDS.map((card) => {
            const active = card === activePhoto.card;
            return (
              <div
                key={card.title}
                className={`${styles.card}${active ? ` ${styles.cardActive}` : ""}`}
                inert={!active}
              >
                {/* Figma groups the h1 and the lead in their own container
                    (18862:8524) with a 16px gap, tighter than the card's 21. */}
                <div className={styles.copy}>
                  <h1 className={styles.title}>{card.title}</h1>
                  <p className={`${styles.lead} text-lead`}>{card.lead}</p>
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
