"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  ABAS_COMUNICACAO,
  ABA_PARAM,
  abaHref,
  parseAba,
  type AbaComunicacao,
} from "@/lib/marketing/comunicacaoAbas";
import { useUrlTabs } from "./useUrlTabs";
import styles from "./TabStrip.module.css";

const IDS = ABAS_COMUNICACAO.map((aba) => aba.id);

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
// WAI-ARIA tabs pattern through useUrlTabs, as the Glossário does. Both panels
// arrive rendered from the server and stay mounted, hidden with the `hidden`
// attribute, so every aria-controls points at an element in the DOM. The open
// tab lives in the address (lib/marketing/comunicacaoAbas.ts), with no state
// of its own: a shared link opens the same tab, switching tabs adds no
// history entry, and the header's "Comunicação" link opens "Conteúdo" again
// even though the page stays mounted.
export default function ComunicacaoAbas({ paineis }: { paineis: Record<AbaComunicacao, ReactNode> }) {
  const activeId = parseAba(useSearchParams()?.get(ABA_PARAM) ?? null);
  const { select, handleKeyDown, tabRef } = useUrlTabs(IDS, abaHref);

  return (
    <>
      <div className={styles.subnav}>
        <div className={`container ${styles.list}`} role="tablist" aria-label="Comunicação">
          {ABAS_COMUNICACAO.map((aba) => {
            const selected = aba.id === activeId;
            return (
              <button
                key={aba.id}
                ref={tabRef(aba.id)}
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
