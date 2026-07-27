"use client";

import { useEffect, useState } from "react";

// Cross-fading background for the hero. Auto-advances unless the user prefers
// reduced motion. Images sit behind the hero overlay and text.
export default function HeroBackground({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      6000
    );
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div className="hero-bg" aria-hidden>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="hero-imagem"
          style={{ opacity: i === index ? 1 : 0 }}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}
