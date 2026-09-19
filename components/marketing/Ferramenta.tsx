import { MAPA_LINK } from "@/lib/marketing/nav";
import styles from "./Ferramenta.module.css";

// The Figma export of this map (node 18862:8548) has not been pulled yet — the
// design file's API quota ran out mid-build, so it was later exported through
// Figma's REST API instead (node 18862:8548, PNG at 2x, then converted to WebP
// with Pillow — 1048 KB to 65 KB, no real transparency to preserve). The
// placeholder branch below stays: it is what renders if this is ever set back
// to null, and it shares the image's aspect ratio so neither reflows.
const MAPA_IMAGEM: { src: string; alt: string } | null = {
  src: "/images/ferramenta/mapa-caatinga.webp",
  alt: "Mapa do bioma Caatinga sobre o Nordeste do Brasil, com a cobertura vegetal em tons de verde e os estados identificados",
};

// The four-item list, Figma node 18862:8556.
const ITENS = [
  "Dados sobre carbono, vegetação, clima e uso da terra",
  "Consulta por municípios e outros territórios da Caatinga",
  "Comparação entre dados e períodos",
  "Geração de relatório com os dados do território escolhido",
];

// Ferramenta, Figma node 18862:8547, a full-bleed 560px band split into a map
// image (729/1436 of the frame) and a dark panel (707/1436) selling the map
// module. Unlike the sections above it, this one does NOT use the shared
// `container` utility: the design deliberately runs the image and the panel
// edge-to-edge with the viewport, and the panel's own content is inset 40px
// from the panel's left edge, not aligned to the page's content column.
export default function Ferramenta() {
  return (
    <section id="ferramenta" className={styles.ferramenta} aria-label="Ferramenta">
      <div className={styles.media}>
        {MAPA_IMAGEM ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={MAPA_IMAGEM.src}
            alt={MAPA_IMAGEM.alt}
            width={1458}
            height={1120}
            className={styles.image}
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
          A ferramenta central da plataforma
        </p>
        <h2 className={`${styles.title} text-h2`}>
          Explore os territórios da Caatinga em detalhes
        </h2>
        <p className={`${styles.body} text-body`}>
          Consulte informações sobre diferentes áreas da Caatinga. Localize o
          território de interesse, combine dados no mapa, acompanhe as
          mudanças ao longo do tempo e gere um relatório com as informações
          selecionadas.
        </p>
        {/* `role="list"`/`role="listitem"` restore the implicit list semantics
            that `list-style: none` strips from the accessibility tree in
            Safari/VoiceOver — the same defect already fixed in Destaques. */}
        <ul className={styles.list} role="list">
          {ITENS.map((item) => (
            <li key={item} className={`${styles.listItem} text-body`} role="listitem">
              {item}
            </li>
          ))}
        </ul>
        {/* MAPA_LINK crosses a route group: a full page load, not next/link. */}
        <a href={MAPA_LINK.href} className={`${styles.button} text-body`}>
          Explore os dados
        </a>
      </div>
    </section>
  );
}
