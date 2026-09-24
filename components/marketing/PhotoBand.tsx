import type { PhotoBandContent } from "@/lib/content/paginas";
import styles from "./PhotoBand.module.css";

type PhotoBandProps = PhotoBandContent & {
  // "warm": the red-to-clear gradient of the Sobre band (Figma 18988:8651).
  // "dark": the near-black gradient of the Comunicação band (18978:2080).
  tone: "warm" | "dark";
};

// Full-width photo band above the footer of an internal page. The photograph
// is dressing behind the gradient, so its alt is empty; the heading and the
// list carry everything the band says.
export default function PhotoBand({ image, eyebrow, title, items, tone }: PhotoBandProps) {
  return (
    <div className={`${styles.photoBand} ${tone === "warm" ? styles.warm : styles.dark}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, matches Hero.tsx/Destaques.tsx */}
      <img src={image} alt="" className={styles.photo} loading="lazy" decoding="async" />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={`container ${styles.content}`}>
        <div className={styles.heading}>
          {eyebrow && <p className={`${styles.eyebrow} text-subtle-medium`}>{eyebrow}</p>}
          <h2 className={`${styles.title} text-h2`}>{title}</h2>
        </div>
        {items && items.length > 0 && (
          <ul className={styles.items} role="list">
            {items.map((item) => (
              <li key={item} className={`${styles.item} text-body`} role="listitem">
                {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
                <img src="/icons/close.svg" alt="" width={26} height={26} className={styles.icon} />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
