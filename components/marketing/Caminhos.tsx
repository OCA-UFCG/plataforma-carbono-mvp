import type { CaminhoCard } from "@/lib/content/caminhos";
import Linhas from "./Linhas";
import styles from "./Caminhos.module.css";

// "Duas formas de explorar os dados", Figma node 19253:14778, which replaced
// the Ferramenta band: a heading over two 626x483 cards (component "Cards de
// chamada produtos digitais"), the territorial summary and the data platform.
// Hovering a card (or focusing it) reveals its list, hover state 19253:15506;
// on touch screens, which have no hover, that expanded state is the resting
// one (see Caminhos.module.css). The words come from Contentful
// (lib/content/caminhos.ts).
export default function Caminhos({
  chamada,
  titulo,
  cards,
}: {
  chamada: string;
  titulo: string;
  cards: CaminhoCard[];
}) {
  return (
    <section id="caminhos" className={styles.caminhos} aria-labelledby="caminhos-title">
      <div className={`container ${styles.inner}`}>
        <div className={styles.header}>
          <p className={`${styles.eyebrow} text-subtle-medium`}>{chamada}</p>
          <h2 id="caminhos-title" className={`${styles.title} text-h2`}>
            {titulo}
          </h2>
        </div>

        {/* `role="list"`/`role="listitem"` restore the implicit list semantics
            that `list-style: none` strips from the accessibility tree in
            Safari/VoiceOver, matching Destaques.tsx/Comunicacao.tsx. */}
        <ul className={styles.grid} role="list">
          {cards.map((card) => (
            <CaminhoItem key={card.id} card={card} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// Kept below the default export, and rooted in an <li>, so the SECTION_IDS
// extractor (tests/lib/marketingNav.test.ts) sees exactly one wrapper tag —
// <section id="caminhos"> — per this file.
function CaminhoItem({ card }: { card: CaminhoCard }) {
  const titleId = `caminhos-${card.id}-title`;
  const descriptionId = `caminhos-${card.id}-description`;

  return (
    <li className={styles.card} role="listitem">
      {/* The whole card is the link, named by its title. Both destinations
          cross a route group: a full page load, not next/link. */}
      <a
        href={card.href}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={styles.surface}
      >
        <div className={styles.media}>
          {/* Alt is empty: the photo and the map dress the card, and its
              title and text already say where it leads. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imagem} alt="" className={styles.image} loading="lazy" decoding="async" />
        </div>

        <div className={styles.panel}>
          <div className={styles.text}>
            <p className={`${styles.badge} text-ui-badge`}>{card.selo}</p>
            <h3 id={titleId} className={`${styles.cardTitle} text-h4`}>
              {card.titulo}
            </h3>
            <p id={descriptionId} className={`${styles.description} text-body`}>
              <Linhas texto={card.texto} />
            </p>
          </div>

          {/* Collapsed rather than unmounted while not hovered, so the list
              stays in the DOM and the accessibility tree. */}
          <div className={styles.extra}>
            <div className={styles.extraInner}>
              <ul className={styles.list} role="list">
                {card.itens.map((item, i) => (
                  <li key={i} className={`${styles.item} text-body`} role="listitem">
                    {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
                    <img src="/icons/caminhos/check-circle.svg" alt="" width={16} height={16} className={styles.check} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The card's visual call to action, not a second control, hence a
              <span> hidden from assistive tech: the link's name already says
              where it goes. */}
          <span className={`${styles.cta} text-ui-medium`} aria-hidden="true">
            {card.botao}
          </span>
        </div>
      </a>
    </li>
  );
}
