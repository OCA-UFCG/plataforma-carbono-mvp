"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { focusHolds, isPaused, shouldRotate, stepPhotoIndex } from "@/lib/marketing/heroRotation";
import { isMarketingRoute } from "@/lib/marketing/nav";
// Type only: lib/content/banners.ts is server-only, and this is a client
// component.
import type { Banner } from "@/lib/content/banners";
import Linhas from "./Linhas";
import styles from "./Hero.module.css";

// Each banner is a background photo and the card shown over it: the text, set
// like Figma nodes 18862:8525 (h1) and 18862:8526 (lead), and at most one
// button, filled like Figma's 18862:8529. Photos, words, buttons and how many
// banners there are come from Contentful (lib/content/banners.ts, which also
// holds the four shipped ones and their provenance). The dots name the photos
// by their position ("Hero.photoAlt" in messages/).

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

// The pause toggle's glyphs, drawn in the dots' tint: two bars while the
// photos rotate (the press will pause), a triangle while they are paused.
function PauseIcon({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 10 10" width={10} height={10} fill="currentColor" aria-hidden>
      {paused ? (
        <path d="M2 0L10 5L2 10Z" />
      ) : (
        <>
          <rect x="1" width="3" height="10" />
          <rect x="6" width="3" height="10" />
        </>
      )}
    </svg>
  );
}

// Long enough to read the longest cards (the first and the third, 27 words
// each as shipped) after their 0.8s fade-in.
const ROTATION_INTERVAL_MS = 10000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// Follows the reduced-motion setting live, so turning it on mid-visit pauses
// the hero unless the visitor has pressed the toggle.
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// Hero, Figma node 18862:8516 ("Background"), 495px tall under the 76px
// header. Rotation logic absorbed from the deleted components/HeroBackground.tsx:
// auto-advance every 10s, cross-fading between photos rather than swapping
// them abruptly, until the visitor presses the pause toggle beside the dots
// (2026-11-23, not drawn in Figma). Under reduced motion the hero starts
// paused and the toggle offers to start it.
export default function Hero({ banners }: { banners: Banner[] }) {
  const t = useTranslations("Hero");
  const [index, setIndex] = useState(0);
  // Bumped by every dot or arrow click, so a click restarts the wait in full
  // even when it picks the photo already showing.
  const [clicks, setClicks] = useState(0);
  // Set while keyboard focus is inside the hero, which holds the rotation: the
  // next card would make the focused button inert and drop the focus. A mouse
  // click on a dot or an arrow focuses it without :focus-visible, so it does
  // not hold, and neither does the pause toggle (see `focusHolds`).
  const [focusHeld, setFocusHeld] = useState(false);
  const pauseToggle = useRef<HTMLButtonElement>(null);
  // What the polite live region reads after a dot or an arrow changes the
  // photo. Only those set it, never the timer, so the rotation does not
  // interrupt a screen reader every 10s.
  const [announcement, setAnnouncement] = useState("");
  // The visitor's press of the pause toggle, `null` until the first one. A dot
  // or an arrow leaves it alone, so a paused hero stays paused.
  const [pauseChoice, setPauseChoice] = useState<boolean | null>(null);
  // `false` on the server, where the setting is unknown: the hero renders
  // rotating and a reduced-motion browser flips it to paused on hydration.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false
  );
  const paused = isPaused(pauseChoice, reducedMotion);

  // A timeout per photo rather than one interval, so the wait starts over
  // whenever the photo changes, by the timer, a dot or an arrow.
  useEffect(() => {
    if (!shouldRotate(banners.length, focusHeld, paused)) return;
    const id = setTimeout(
      () => setIndex((i) => stepPhotoIndex(i, 1, banners.length)),
      ROTATION_INTERVAL_MS
    );
    return () => clearTimeout(id);
  }, [index, clicks, focusHeld, paused, banners.length]);

  // The dots and the arrows both land here, so every manual change restarts
  // the wait.
  const goTo = (next: number) => {
    setIndex(next);
    setClicks((c) => c + 1);
    setAnnouncement(t("announcement", { number: next + 1, total: banners.length, title: banners[next].title }));
  };
  const step = (delta: number) => goTo(stepPhotoIndex(index, delta, banners.length));

  const activeBanner = banners[index];
  // With a single banner there is nothing to pick, step through or pause.
  const rotates = banners.length >= 2;

  return (
    <section
      id="inicio"
      className={styles.hero}
      aria-label={t("region")}
      onFocus={(event) => {
        const target = event.target as Element;
        setFocusHeld(focusHolds(target.matches(":focus-visible"), target === pauseToggle.current));
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusHeld(false);
      }}
    >
      <div className={styles.background} aria-hidden>
        {/* Keyed by position: two banners may share a photo. */}
        {banners.map((banner, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={banner.photo}
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
          {banners.map((banner, position) => {
            const active = position === index;
            const action = banner.action;
            const buttonClass = `${styles.primaryButton} text-ui-medium`;
            return (
              <div
                key={position}
                className={`${styles.card}${active ? ` ${styles.cardActive}` : ""}`}
                inert={!active}
              >
                {/* Figma groups the h1 and the lead in their own container
                    (19253:14755) with a 16px gap, tighter than the card's 24. */}
                <div className={styles.copy}>
                  <h1 className={styles.title}>{banner.title}</h1>
                  <p className={`${styles.lead} text-lead`}>
                    <Linhas texto={banner.text} />
                  </p>
                </div>
                {action && (
                  <div className={styles.actions}>
                    {/* A link outside the marketing pages crosses a route
                        group: a full page load, not next/link. */}
                    {isMarketingRoute(action.href) ? (
                      <Link href={action.href} className={buttonClass}>
                        {action.label}
                      </Link>
                    ) : (
                      <a href={action.href} className={buttonClass}>
                        {action.label}
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {rotates && (
        <div className={`container ${styles.dots}`}>
          <div className={styles.dotList} role="group" aria-label={t("photoPicker")}>
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot}${i === index ? ` ${styles.dotActive}` : ""}`}
                aria-label={t("showPhoto", { alt: t("photoAlt", { number: i + 1 }) })}
                aria-pressed={i === index}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          {/* Outside the photo picker: it picks no photo. The name says what a
              press will do, as the WAI carousel pattern does, rather than an
              aria-pressed "Pausar"; the one element swaps its label and glyph,
              so keyboard focus stays on it across presses. */}
          <button
            ref={pauseToggle}
            type="button"
            className={styles.pause}
            aria-label={t(paused ? "resume" : "pause")}
            onClick={() => setPauseChoice(!paused)}
          >
            <PauseIcon paused={paused} />
          </button>
        </div>
      )}

      {rotates && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrevious}`}
            aria-label={t("previous")}
            onClick={() => step(-1)}
          >
            <ArrowIcon className={styles.arrowIconPrevious} />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            aria-label={t("next")}
            onClick={() => step(1)}
          >
            <ArrowIcon className={styles.arrowIconNext} />
          </button>
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {activeBanner.credit && <p className={styles.credit}>{t("credit", { name: activeBanner.credit })}</p>}
    </section>
  );
}
