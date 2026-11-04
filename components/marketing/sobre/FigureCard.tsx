import { Children, type CSSProperties } from "react";
import { splitFigure } from "@/lib/marketing/figure";
import styles from "./FigureCard.module.css";

export type FigureCardProps = {
  label: string;
  // The figure as typed in Contentful ("410 Mt CO₂eq", "Até 58%"); the card
  // sets its number at display size and the unit, if any, beside it.
  value: string;
  // The law cards (19408:47968) have none.
  description?: string;
  // The share, 0 to 100, the progress bar fills (lib/marketing/figure.ts
  // `barFill`). Left out, the card draws no bar.
  bar?: number;
};

// A figure of the Sobre pages, Figma "Cards sobre" (19406:47719 with its bar,
// 19407:47762 without, 19408:47968 with no description): an uppercase label
// over the figure, its description and, on the climate and efficiency cards,
// a bar ending on an arrowhead. Renders a <div>; a pair of cards goes in a
// FigureList, which wraps each in its own <li>.
export default function FigureCard({ label, value, description, bar }: FigureCardProps) {
  const figure = splitFigure(value);

  return (
    <div className={styles.card}>
      <p className={`${styles.label} text-p-ui`}>{label}</p>
      <div className={styles.figure}>
        {/* Number, unit and description are split for layout, so they are
            hidden from assistive tech and read instead as the one phrase
            below, with the figure as the editor typed it. */}
        <p className={styles.line} aria-hidden="true">
          <span className={styles.value}>{figure.value}</span>
          {figure.unit && <span className={`${styles.unit} text-h4`}>{figure.unit}</span>}
        </p>
        {description && (
          <p className={`${styles.description} text-body`} aria-hidden="true">
            {description}
          </p>
        )}
        <span className="sr-only">{[value, description].filter(Boolean).join(" ")}</span>
      </div>
      {bar !== undefined && (
        // Decorative: the share is already in the card's words (38% in the
        // removal card's description, 58% in the efficiency figure).
        <div className={styles.bar} aria-hidden="true">
          <div className={styles.fill} style={{ "--fill": bar / 100 } as CSSProperties} />
          <span className={styles.arrow}>
            {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma asset (Polygon 15) */}
            <img src="/icons/sobre/barra-seta.svg" alt="" />
          </span>
        </div>
      )}
    </div>
  );
}

// A row of figure cards 16px apart (Figma 18988:8730, 19408:47967), stacked
// on narrow screens. role="list" restores the semantics `list-style: none`
// strips in Safari/VoiceOver, as in Destaques.tsx.
export function FigureList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ul className={className ? `${styles.list} ${className}` : styles.list} role="list">
      {Children.map(children, (child) => (
        <li role="listitem">{child}</li>
      ))}
    </ul>
  );
}
