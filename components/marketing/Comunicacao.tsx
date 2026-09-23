import type { ComunicacaoContent } from "@/lib/content/comunicacao";
import MoreLink from "./MoreLink";
import styles from "./Comunicacao.module.css";

type CardData = {
  key: string;
  label: string;
  title: string;
  description: string;
  cover: string;
  pdf?: string;
};

// The design fills these cards with PHOTOGRAPHS: Figma nodes 18862:8581 and
// 18862:8582 each carry a real image fill. The content module's `cover` field
// means something else — the publication's cover ART, portrait, with the title
// already typeset into it — so rendering `cover` here printed every title twice
// and centre-cropped a 0.75 portrait into a 1.30 landscape card, clipping it.
//
// These two photographs are the design's own, exported from the Figma file and
// cropped to the card ratio. They live in the repository rather than in
// Contentful because the content model has no field for a card photograph; when
// one is added, delete this map and read the photo from `conteudo` instead, so
// editors can change it without a deploy. Their authorship is NOT documented
// anywhere — see IMAGENS.md. If they turn out to be Artur Lourenço's, like the
// hero photos, they need the same mandatory credit.
const FOTOS: Record<string, string> = {
  caderno: "/images/comunicacao/caderno.webp",
  cartilha: "/images/comunicacao/cartilha.webp",
};

// The hover state (Figma 18916:9437) reveals a description under the title.
// The caderno carries one in the content model; cartilhas do not, so the
// cartilha card falls back to the design's own copy, which describes the
// series rather than any one volume. When the Cartilha model gains a
// description field, read it here instead.
const DESCRICAO_CARTILHA =
  "Uma cartilha introdutória, em linguagem simples, para comunidades e demais interessados em conhecer o tema.";

// Comunicação, Figma node 18862:8575, two 626x480 photo cards with a 24px
// gutter (card component 18862:7951, hover state 18916:9437). Hovering or
// focusing a linked card deepens its gradient and reveals the description
// and a "Ver material" button; on touch screens, which have no hover, that
// expanded state is the resting state (see Comunicacao.module.css). The module
// ships four cartilhas plus one caderno; the design shows exactly two cards,
// so the choice of which ones is fixed by the task brief rather than by this
// component: the caderno (labelled "CADERNO TEMÁTICO") and cartilhas[0]
// (labelled "CARTILHA"). The header row's "Ver mais" control is rendered but
// inert, the same as Plataforma.tsx: the internal page it would open does not
// exist yet. See MoreLink.
export default function Comunicacao({ conteudo }: { conteudo: ComunicacaoContent }) {
  const [primeiraCartilha] = conteudo.cartilhas;

  // Known content discrepancy, left for the content owner rather than
  // resolved here: the Figma card reads "Mercado de carbono: o que isso tem
  // a ver com a Caatinga?", which matches none of the four DEFAULT_CARTILHAS
  // volumes (the nearest is "A Caatinga e o carbono: qual a relação?",
  // volume 3). This renders whatever cartilhas[0] actually holds instead of
  // hardcoding the Figma string.
  const cards: CardData[] = [
    {
      key: "caderno",
      label: "CADERNO TEMÁTICO",
      title: conteudo.caderno.title,
      description: conteudo.caderno.description,
      // Falls back to the publication's cover art if the photograph is ever removed.
      cover: FOTOS.caderno ?? conteudo.caderno.cover,
      pdf: conteudo.caderno.pdf,
    },
    ...(primeiraCartilha
      ? [
          {
            key: "cartilha",
            label: "CARTILHA",
            title: primeiraCartilha.title,
            description: DESCRICAO_CARTILHA,
            cover: FOTOS.cartilha ?? primeiraCartilha.cover,
            pdf: primeiraCartilha.pdf,
          },
        ]
      : []),
  ];

  return (
    <section id="comunicacao" className={styles.comunicacao} aria-label="Comunicação">
      <div className={`container ${styles.inner}`}>
        {/* Heading left, "Ver mais" right — the 40px header row of Figma node
            18862:8576. The control is inert; see MoreLink. */}
        <div className={styles.headerRow}>
          <h2 className={`${styles.heading} text-h2`}>Comunicação</h2>
          <MoreLink />
        </div>

        {/* `role="list"`/`role="listitem"` restore the implicit list semantics
            that `list-style: none` strips from the accessibility tree in
            Safari/VoiceOver, matching Destaques.tsx/Ferramenta.tsx. */}
        <ul className={styles.grid} role="list">
          {cards.map((card) => (
            <ComunicacaoCard key={card.key} card={card} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// Kept below the default export, and rooted in an <li>, so the SECTION_IDS
// extractor (tests/lib/marketingNav.test.ts) sees exactly one wrapper tag —
// <section id="comunicacao"> — per this file.
function ComunicacaoCard({ card }: { card: CardData }) {
  const titleId = `comunicacao-${card.key}-title`;
  const descriptionId = `comunicacao-${card.key}-description`;
  const linked = Boolean(card.pdf);

  const content = (
    <>
      {/* Plain <img>, matching Hero.tsx/Destaques.tsx/Plataforma.tsx: a
          static content image, not a photo worth next/image's optimizer
          pipeline. Alt is empty: the photograph is dressing behind the
          gradient (a generic Caatinga/field photo, not something with
          information of its own), and the visible category label + title
          below already state everything a reader needs — which publication
          this is and what it covers. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.cover} alt="" className={styles.photo} loading="lazy" decoding="async" />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.overlayExpanded} aria-hidden="true" />
      <div className={styles.text}>
        <p className={`${styles.label} text-subtle-semibold`} aria-hidden="true">
          {card.label}
        </p>
        <h3 id={titleId} className={`${styles.title} text-lead`}>
          {card.title}
        </h3>
        {/* Collapsed rather than unmounted while not hovered, so the
            description stays in the accessibility tree: the link below
            points at it with aria-describedby. */}
        <div className={styles.extra}>
          <div className={styles.extraInner}>
            <p id={descriptionId} className={`${styles.description} text-body`}>
              {card.description}
            </p>
            {/* The whole card is the link; this is its visual call to
                action, not a second control, hence a <span> hidden from
                assistive tech (the link's name already says where it goes).
                The card without a PDF is not a control, so it gets none. */}
            {linked && (
              <span className={`${styles.cta} text-body`} aria-hidden="true">
                Ver material
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // The category label sits visually above the title inside the same
  // interactive surface. Left as plain text it would prefix the link's
  // accessible name ("CADERNO TEMÁTICO A aproximação..."), garbling the
  // title a screen reader announces. `aria-hidden` above removes the label
  // from the accessible tree, and the surface below is named from the title
  // node alone, so the reading order stays sensible: category first for
  // sighted users, title-only for the link's name.
  if (linked) {
    return (
      <li className={styles.card} role="listitem">
        <a
          href={card.pdf}
          target="_blank"
          rel="noreferrer"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={styles.surface}
        >
          {content}
        </a>
      </li>
    );
  }

  // No PDF: the card is a photograph with a caption, not a control — no
  // href to give an <a>, and no click handler bolted onto a <div> either.
  return (
    <li className={styles.card} role="listitem">
      <div className={styles.surface}>{content}</div>
    </li>
  );
}
