"use client";

import { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

export interface Photo {
  src: string;
  caption: string;
  alt: string;
}

export default function PhotoCarousel({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  const total = photos.length;

  const go = (n: number) => setIndex((i) => (i + n + total) % total);

  return (
    <div
      className="carrossel"
      role="group"
      aria-roledescription="carrossel"
      aria-label="Fotos das atividades de formação"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <div className="carrossel-viewport">
        <div
          className="carrossel-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {photos.map((p, i) => (
            <figure
              className="carrossel-slide"
              key={p.src}
              aria-hidden={i !== index}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} loading={i === 0 ? "eager" : "lazy"} />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
        </div>

        <button
          type="button"
          className="carrossel-btn carrossel-btn--prev"
          onClick={() => go(-1)}
          aria-label="Foto anterior"
        >
          <FaChevronLeft aria-hidden />
        </button>
        <button
          type="button"
          className="carrossel-btn carrossel-btn--next"
          onClick={() => go(1)}
          aria-label="Próxima foto"
        >
          <FaChevronRight aria-hidden />
        </button>
      </div>

      <div className="carrossel-dots" aria-label="Selecionar foto">
        {photos.map((p, i) => (
          <button
            type="button"
            key={p.src}
            className={i === index ? "dot dot--ativo" : "dot"}
            aria-label={`Ir para a foto ${i + 1} de ${total}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
