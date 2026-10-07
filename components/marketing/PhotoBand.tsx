import type { PhotoBandContent } from "@/lib/content/paginas";
import styles from "./PhotoBand.module.css";

// Full-width photo band above the footer of the Sobre page, on a red-to-clear
// gradient (Figma 18988:8651). The photograph is dressing behind the gradient,
// so its alt is empty; the heading and the list carry everything the band
// says. Comunicação's dark band (18978:2080) was taken out on 2026-10-06.
export default function PhotoBand({ image, title, items }: PhotoBandContent) {
  return (
    <div className={styles.photoBand}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, matches Hero.tsx/Destaques.tsx */}
      <img src={image} alt="" className={styles.photo} loading="lazy" decoding="async" />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={`container ${styles.content}`}>
        <h2 className={`${styles.title} text-h2`}>{title}</h2>
        {items && items.length > 0 && (
          <ul className={styles.items} role="list">
            {items.map((item, i) => (
              <li key={i} className={`${styles.item} text-body`} role="listitem">
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
