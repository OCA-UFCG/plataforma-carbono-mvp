"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Evento } from "@/lib/content/eventos";
import Linhas from "./Linhas";
import styles from "./EventoCard.module.css";

// One event of the "Eventos e articulações" tab, the Figma component "Card
// eventos" (19254:16478, expanded variant 19254:16488, both in frame
// 19254:16706): the photo on the left; the category badge, title, date and
// place, the text, and the photo's caption on the right. The text shows two
// lines until "Mostrar mais" opens it whole ("Mostrar menos" closes it).
//
// `data` is the event's date already formatted ("17 set 2026"), done on the
// server with the rest of the content.
export default function EventoCard({ evento, data }: { evento: Evento; data: string | null }) {
  const { categoria, title, date, local, description, photo, photoAlt, caption } = evento;
  const descricaoId = useId();
  const descricaoRef = useRef<HTMLParagraphElement>(null);
  const [aberto, setAberto] = useState(false);
  // Whether the closed text is cut short. Unknown until measured, and the
  // button is drawn meanwhile: most event texts run past two lines, as the
  // design's do, so the server's markup is right for them. One that fits is
  // shown whole and loses the button, which would have nothing to open.
  const [cortado, setCortado] = useState<boolean | null>(null);

  useEffect(() => {
    const descricao = descricaoRef.current;
    if (aberto || !descricao) return;

    const medir = () => {
      // Inside the hidden tab panel the text has no box to measure; the
      // observer measures it again once the tab opens.
      if (descricao.clientHeight === 0) return;
      setCortado(descricao.scrollHeight > descricao.clientHeight + 1);
    };
    medir();

    // The card's width, and so where the lines break, follows the viewport.
    const observer = new ResizeObserver(medir);
    observer.observe(descricao);
    return () => observer.disconnect();
  }, [aberto]);

  const meta = [data, local].filter(Boolean);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset or Contentful URL, matches Comunicacao.tsx */}
        <img src={photo} alt={photoAlt} className={styles.photo} loading="lazy" decoding="async" />
      </div>

      <div className={styles.body}>
        <span className={`${styles.badge} text-ui-badge`}>{categoria}</span>

        <div>
          <h3 className={styles.title}>{title}</h3>
          {meta.length > 0 && (
            <p className={`${styles.meta} text-body`}>
              {data ? <time dateTime={date.slice(0, 10)}>{data}</time> : null}
              {data && local ? " · " : null}
              {local}
            </p>
          )}
        </div>

        <div className={styles.texto}>
          <p
            ref={descricaoRef}
            id={descricaoId}
            className={`${styles.descricao} text-body${aberto ? "" : ` ${styles.descricaoFechada}`}`}
          >
            <Linhas texto={description} />
          </p>
          {(aberto || cortado !== false) && (
            <button
              type="button"
              className={`${styles.toggle} text-ui-medium`}
              aria-expanded={aberto}
              aria-controls={descricaoId}
              onClick={() => setAberto((valor) => !valor)}
            >
              {aberto ? "Mostrar menos" : "Mostrar mais"}
            </button>
          )}
        </div>

        {caption && <p className={`${styles.caption} text-body`}>{caption}</p>}
      </div>
    </article>
  );
}
