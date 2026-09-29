import { useTranslations } from "next-intl";
import { MAPA_LINK } from "@/lib/marketing/nav";
import styles from "./Ferramenta.module.css";

// The map image is committed: exported from Figma node 18862:8548 through the
// REST API (PNG at 2x, then converted to WebP with Pillow — 1048 KB down to
// 65 KB, no real transparency to preserve). The placeholder branch below is
// kept as the fallback for MAPA_IMAGEM === null, not a temporary state — it
// shares the image's aspect ratio so neither reflows.
const MAPA_IMAGEM: { src: string } | null = {
  src: "/images/ferramenta/mapa-caatinga.webp",
};

// The four-item list, Figma node 18862:8556; the copy is Ferramenta.json,
// items.<key>.
const ITENS = ["data", "query", "compare", "report"] as const;

// Ferramenta, Figma node 18862:8547, a full-bleed 560px band split into a map
// image (729/1436 of the frame) and a dark panel (707/1436) selling the map
// module. Unlike the sections above it, this one does NOT use the shared
// `container` utility: the design deliberately runs the image and the panel
// edge-to-edge with the viewport, and the panel's own content is inset 40px
// from the panel's left edge, not aligned to the page's content column.
export default function Ferramenta() {
  const t = useTranslations("Ferramenta");

  return (
    <section id="ferramenta" className={styles.ferramenta} aria-label={t("ariaLabel")}>
      <div className={styles.media}>
        {MAPA_IMAGEM ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={MAPA_IMAGEM.src}
            alt={t("mapAlt")}
            width={1458}
            height={1120}
            className={styles.image}
            loading="lazy"
            decoding="async"
          />
        ) : (
          // Neutral placeholder standing in for the map export (see the
          // MAPA_IMAGEM comment above): keeps the split layout complete and
          // reviewable without fabricating or substituting another image.
          <div className={styles.placeholder} aria-hidden="true" />
        )}
      </div>

      <div className={styles.panel}>
        <p className={`${styles.eyebrow} text-subtle-semibold`}>
          {t("eyebrow")}
        </p>
        <h2 className={`${styles.title} text-h2`}>
          {t("title")}
        </h2>
        <p className={`${styles.body} text-body`}>
          {t("body")}
        </p>
        {/* `role="list"`/`role="listitem"` restore the implicit list semantics
            that `list-style: none` strips from the accessibility tree in
            Safari/VoiceOver — the same defect already fixed in Destaques. */}
        <ul className={styles.list} role="list">
          {ITENS.map((item) => (
            <li key={item} className={`${styles.listItem} text-body`} role="listitem">
              {t(`items.${item}`)}
            </li>
          ))}
        </ul>
        {/* MAPA_LINK crosses a route group: a full page load, not next/link. */}
        <a href={MAPA_LINK.href} className={`${styles.button} text-body`}>
          {t("button")}
        </a>
      </div>
    </section>
  );
}
