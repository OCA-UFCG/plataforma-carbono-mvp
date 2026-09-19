import type { ComunicacaoContent } from "@/lib/content/comunicacao";
import styles from "./Comunicacao.module.css";

type CardData = {
  key: string;
  label: string;
  title: string;
  cover: string;
  pdf?: string;
};

// Comunicação, Figma node 18862:8575, two 626x480 photo cards with a 24px
// gutter (card component 18862:7951, hover state 18916:9437). The module
// ships four cartilhas plus one caderno; the design shows exactly two cards,
// so the choice of which ones is fixed by the task brief rather than by this
// component: the caderno (labelled "CADERNO TEMÁTICO") and cartilhas[0]
// (labelled "CARTILHA"). The "Ver mais" link the header row shows next to
// the heading is omitted — same decision as Plataforma.tsx: there is no page
// for it to link to.
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
      cover: conteudo.caderno.cover,
      pdf: conteudo.caderno.pdf,
    },
    ...(primeiraCartilha
      ? [
          {
            key: "cartilha",
            label: "CARTILHA",
            title: primeiraCartilha.title,
            cover: primeiraCartilha.cover,
            pdf: primeiraCartilha.pdf,
          },
        ]
      : []),
  ];

  return (
    <section id="comunicacao" className={styles.comunicacao} aria-label="Comunicação">
      <div className={`container ${styles.inner}`}>
        <h2 className={`${styles.heading} text-h2`}>Comunicação</h2>

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
      <img src={card.cover} alt="" className={styles.photo} />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.text}>
        <p className={`${styles.label} text-subtle-semibold`} aria-hidden="true">
          {card.label}
        </p>
        <h3 id={titleId} className={`${styles.title} text-lead`}>
          {card.title}
        </h3>
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
  if (card.pdf) {
    return (
      <li className={styles.card} role="listitem">
        <a
          href={card.pdf}
          target="_blank"
          rel="noreferrer"
          aria-labelledby={titleId}
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
