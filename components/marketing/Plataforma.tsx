"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ABAS_PLATAFORMA } from "@/lib/content/plataforma";
import type { ConteudoAba } from "@/lib/content/plataforma";
import styles from "./Plataforma.module.css";

function tabId(id: string) {
  return `plataforma-tab-${id}`;
}

function panelId(id: string) {
  return `plataforma-panel-${id}`;
}

// Plataforma, Figma node 18862:8546 ("Sobre"), the "Conheça a plataforma"
// tabbed section. The Figma file specifies neither keyboard behaviour nor
// three of the four tabs' content, so both follow recorded decisions rather
// than the design node itself:
//   - keyboard interaction follows the WAI-ARIA tabs pattern (automatic
//     activation: moving focus with the arrow keys also selects the tab and
//     swaps the panel), since the design has no interaction spec at all;
//   - "A Caatinga", "Carbono e comunidades" and "Como funciona" render a
//     quiet empty state instead of invented scientific copy — see
//     lib/content/plataforma.ts.
// The "Ver mais" button the design shows next to the section label is
// omitted: there is no page for it to link to.
export default function Plataforma() {
  const [activeId, setActiveId] = useState(ABAS_PLATAFORMA[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeIndex = ABAS_PLATAFORMA.findIndex((aba) => aba.id === activeId);
  const activeAba = ABAS_PLATAFORMA[activeIndex];

  function selectAndFocus(index: number) {
    const aba = ABAS_PLATAFORMA[index];
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
        selectAndFocus((activeIndex + 1) % ABAS_PLATAFORMA.length);
        break;
      case "ArrowLeft":
        event.preventDefault();
        selectAndFocus((activeIndex - 1 + ABAS_PLATAFORMA.length) % ABAS_PLATAFORMA.length);
        break;
      case "Home":
        event.preventDefault();
        selectAndFocus(0);
        break;
      case "End":
        event.preventDefault();
        selectAndFocus(ABAS_PLATAFORMA.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <section id="plataforma" className={styles.plataforma} aria-label="Plataforma">
      <div className={`container ${styles.inner}`}>
        <p className={`${styles.label} text-subtle-semibold`}>Conheça a plataforma</p>

        <div className={styles.tablist} role="tablist" aria-label="Conheça a plataforma">
          {ABAS_PLATAFORMA.map((aba) => {
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
                className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
                onClick={() => setActiveId(aba.id)}
                onKeyDown={handleKeyDown}
              >
                {aba.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={panelId(activeAba.id)}
          aria-labelledby={tabId(activeAba.id)}
          className={styles.panel}
          tabIndex={0}
        >
          {activeAba.conteudo ? (
            <PanelConteudo conteudo={activeAba.conteudo} />
          ) : (
            <p className={`${styles.vazio} text-subtle`}>Conteúdo em preparação.</p>
          )}
        </div>
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
        width={200}
        height={130}
        className={styles.imagem}
      />
      <div className={styles.texto}>
        <h2 className={`${styles.titulo} text-h2`}>{conteudo.titulo}</h2>
        {conteudo.paragrafos.map((paragrafo) => (
          <p key={paragrafo} className={`${styles.paragrafo} text-body`}>
            {paragrafo}
          </p>
        ))}
        <p className={`${styles.destaque} text-subtle-semibold`}>{conteudo.destaque}</p>
      </div>
    </div>
  );
}
