"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { AbaPlataforma, ConteudoAba } from "@/lib/content/plataforma";
import Linhas from "./Linhas";
import MoreLink from "./MoreLink";
import Quote from "./sobre/Quote";
import styles from "./Plataforma.module.css";

function tabId(id: string) {
  return `plataforma-tab-${id}`;
}

function panelId(id: string) {
  return `plataforma-panel-${id}`;
}

// Plataforma, Figma node 18862:8546 ("Sobre"), the tabbed section the design
// labels "Conheça a plataforma" and the 2026-10-05 meeting "Conheça a
// iniciativa"; the other three tabs are its variant instances 18916:9520,
// 18916:9585 and 18916:9650, and the tab hover is frame 18916:9468. The
// Figma file does not specify keyboard behaviour, so it follows the WAI-ARIA
// tabs pattern (automatic activation: moving focus with the arrow keys also
// selects the tab and swaps the panel). "Ver mais" opens the longer
// version of this section, the /sobre pages. The words come from Contentful
// through the landing page (lib/content/plataforma.ts).
export default function Plataforma({ titulo, abas }: { titulo: string; abas: AbaPlataforma[] }) {
  const [activeId, setActiveId] = useState(abas[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeIndex = abas.findIndex((aba) => aba.id === activeId);

  function selectAndFocus(index: number) {
    const aba = abas[index];
    setActiveId(aba.id);
    tabRefs.current[aba.id]?.focus();
  }

  // Automatic activation per the WAI-ARIA tabs pattern: arrow keys move focus
  // and select in one step, Home/End jump to the first/last tab, and only the
  // active tab ever sits in the page tab order (tabIndex below), so focus
  // never lands on a hidden panel.
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        selectAndFocus((activeIndex + 1) % abas.length);
        break;
      case "ArrowLeft":
        event.preventDefault();
        selectAndFocus((activeIndex - 1 + abas.length) % abas.length);
        break;
      case "Home":
        event.preventDefault();
        selectAndFocus(0);
        break;
      case "End":
        event.preventDefault();
        selectAndFocus(abas.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <section id="plataforma" className={styles.plataforma} aria-label="Plataforma">
      <div className={`container ${styles.inner}`}>
        {/* Label left, "Ver mais" right — the 40px header row of Figma node
            18862:8546. */}
        <div className={styles.headerRow}>
          <p className={`${styles.label} text-subtle-medium`}>{titulo}</p>
          <MoreLink href="/sobre" contexto="sobre a plataforma" />
        </div>

        <div className={styles.tablist} role="tablist" aria-label={titulo}>
          {abas.map((aba) => {
            const selected = aba.id === activeId;
            return (
              <button
                key={aba.id}
                ref={(el) => {
                  tabRefs.current[aba.id] = el;
                }}
                type="button"
                role="tab"
                id={tabId(aba.id)}
                aria-selected={selected}
                aria-controls={panelId(aba.id)}
                tabIndex={selected ? 0 : -1}
                className={`${styles.tab}${selected ? ` ${styles.tabActive}` : ""}`}
                onClick={() => setActiveId(aba.id)}
                onKeyDown={handleKeyDown}
              >
                {aba.label}
              </button>
            );
          })}
        </div>

        {/* Every tab gets its own always-mounted panel, hidden via the
            `hidden` attribute rather than swapping a single panel's content.
            The APG's own tab examples (manual and automatic activation
            alike) always mount every panel this way; a single dynamic panel
            leaves the three inactive tabs' `aria-controls` pointing at an id
            absent from the DOM, which axe-core/Lighthouse/WAVE all flag. */}
        {abas.map((aba) => (
          <div
            key={aba.id}
            role="tabpanel"
            id={panelId(aba.id)}
            aria-labelledby={tabId(aba.id)}
            className={styles.panel}
            tabIndex={0}
            hidden={aba.id !== activeId}
          >
            <PanelConteudo conteudo={aba.conteudo} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Kept below the default export, and rooted in a <div>, so the
// SECTION_IDS extractor (tests/lib/marketingNav.test.ts) sees exactly one
// wrapper tag — <section id="plataforma"> — per this file.
function PanelConteudo({ conteudo }: { conteudo: ConteudoAba }) {
  return (
    <div className={styles.conteudo}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, matches Hero.tsx/Destaques.tsx */}
      <img
        src={conteudo.imagem}
        alt={conteudo.imagemAlt}
        width={680}
        height={500}
        className={styles.imagem}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.texto}>
        <h2 className={`${styles.titulo} text-h2`}>{conteudo.titulo}</h2>
        <div className={styles.corpo}>
          {conteudo.paragrafos.map((paragrafo, i) => (
            <p key={i} className={`${styles.paragrafo} text-body`}>
              <Linhas texto={paragrafo} />
            </p>
          ))}
          <Quote>{conteudo.destaque}</Quote>
        </div>
      </div>
    </div>
  );
}
