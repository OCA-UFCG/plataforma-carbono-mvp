"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  ABAS_COMUNICACAO,
  abaHref,
  type AbaComunicacao,
} from "@/lib/marketing/comunicacaoAbas";
import styles from "./TabStrip.module.css";

function tabId(id: AbaComunicacao) {
  return `comunicacao-tab-${id}`;
}

function panelId(id: AbaComunicacao) {
  return `comunicacao-panel-${id}`;
}

// The Comunicação page's tabs, Figma node 19254:16031: "Conteúdo" (frame
// 19254:15623) and "Eventos e articulações" (19254:16041). The strip looks
// like the Sobre sub-navigation and shares its stylesheet, but these swap
// panels within one page, so this one is an ARIA tablist, following the
// WAI-ARIA tabs pattern as Plataforma.tsx does (automatic activation, arrow
// keys, Home/End). Both panels arrive rendered from the server and stay
// mounted, hidden with the `hidden` attribute, so every aria-controls points
// at an element in the DOM. The open tab is written into the address
// (lib/marketing/comunicacaoAbas.ts) with replaceState: a shared link opens
// the same tab, and switching tabs adds no history entry.
export default function ComunicacaoAbas({
  inicial,
  paineis,
}: {
  inicial: AbaComunicacao;
  paineis: Record<AbaComunicacao, ReactNode>;
}) {
  const [activeId, setActiveId] = useState<AbaComunicacao>(inicial);
  const tabRefs = useRef<Partial<Record<AbaComunicacao, HTMLButtonElement | null>>>({});

  const activeIndex = ABAS_COMUNICACAO.findIndex((aba) => aba.id === activeId);

  function select(id: AbaComunicacao) {
    setActiveId(id);
    window.history.replaceState(window.history.state, "", abaHref(new URL(window.location.href), id));
  }

  function selectAndFocus(index: number) {
    const { id } = ABAS_COMUNICACAO[index];
    select(id);
    tabRefs.current[id]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const count = ABAS_COMUNICACAO.length;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        selectAndFocus((activeIndex + 1) % count);
        break;
      case "ArrowLeft":
        event.preventDefault();
        selectAndFocus((activeIndex - 1 + count) % count);
        break;
      case "Home":
        event.preventDefault();
        selectAndFocus(0);
        break;
      case "End":
        event.preventDefault();
        selectAndFocus(count - 1);
        break;
      default:
        break;
    }
  }

  return (
    <>
      <div className={styles.subnav}>
        <div className={`container ${styles.list}`} role="tablist" aria-label="Comunicação">
          {ABAS_COMUNICACAO.map((aba) => {
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
                className={`${styles.item} text-ui-tab${selected ? ` ${styles.itemCurrent}` : ""}`}
                onClick={() => select(aba.id)}
                onKeyDown={handleKeyDown}
              >
                {aba.label}
              </button>
            );
          })}
        </div>
      </div>

      {ABAS_COMUNICACAO.map((aba) => (
        <div
          key={aba.id}
          role="tabpanel"
          id={panelId(aba.id)}
          aria-labelledby={tabId(aba.id)}
          className={styles.panel}
          tabIndex={0}
          hidden={aba.id !== activeId}
        >
          {paineis[aba.id]}
        </div>
      ))}
    </>
  );
}
