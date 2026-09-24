import type { PageIntroContent } from "@/lib/content/paginas";
import styles from "./PageIntro.module.css";

// The grey band that opens every internal page, under the site header: Figma
// nodes 18988:8613 (the four Sobre pages) and 18978:2050 (Comunicação). The
// title is the page's h1; the landing's own h1 lives in its hero.
export default function PageIntro({ eyebrow, title, intro }: PageIntroContent) {
  return (
    <div className={styles.pageIntro}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.heading}>
          <p className={`${styles.eyebrow} text-subtle-medium`}>{eyebrow}</p>
          <h1 className={`${styles.title} text-h2`}>{title}</h1>
        </div>
        <p className={`${styles.intro} text-body`}>{intro}</p>
      </div>
    </div>
  );
}
