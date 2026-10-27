"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import CenaAnimada from "@/components/glossario/CenaAnimada";
import { TERMOS, TERMO_PARAM, parseTermo } from "@/lib/glossario/termos";
import tabs from "./TabStrip.module.css";
import styles from "./Glossario.module.css";

const PANEL_ID = "glossario-painel";

function tabId(slug: string) {
  return `glossario-tab-${slug}`;
}

// Scrolls the strip, never the page, until the whole tab shows with the
// strip's padding beside it. focus() alone leaves a tab that already peeks
// in at the edge where it is.
function mostrarAba(tab: HTMLButtonElement | null | undefined) {
  const strip = tab?.parentElement;
  if (!tab || !strip) return;

  const { paddingLeft, paddingRight } = getComputedStyle(strip);
  const caixa = strip.getBoundingClientRect();
  const aba = tab.getBoundingClientRect();
  const direita = aba.right + parseFloat(paddingRight) - caixa.right;
  const esquerda = aba.left - parseFloat(paddingLeft) - caixa.left;

  if (direita > 0) strip.scrollLeft += direita;
  else if (esquerda < 0) strip.scrollLeft += esquerda;
}

// The Glossário page's terms, Figma frames 19400:12092 to 19403:25701: a strip
// of tabs drawn like the Comunicação ones (19400:12117, TabStrip.module.css),
// then the open term's title, text and animation. An ARIA tablist after the
// WAI-ARIA tabs pattern, like ComunicacaoAbas.tsx (automatic activation, arrow
// keys, Home/End), except that only the open term is rendered: each term
// mounts its own scene, and lib/cenas/REGRAS_CENAS.md loads one at a time, so
// switching tabs unmounts the previous CenaAnimada, which ends its scene. The
// one panel is labelled by the open tab, the only one that points at it.
// The open term lives in the address (?termo=…), with no state of its own: a
// tab writes it with replaceState, which Next.js feeds back to
// useSearchParams, so switching adds no history entry, a shared link opens
// the same term on the server, and a link back to the bare /glossario (the
// header's) opens the first term again even though the page stays mounted.
// Eight terms do not fit 1276px at the design's spacing, so the strip scrolls
// sideways.
export default function Glossario() {
  const termo = parseTermo(useSearchParams()?.get(TERMO_PARAM) ?? undefined);
  const activeIndex = TERMOS.indexOf(termo);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // A link may open a term past the strip's right edge.
  useEffect(() => mostrarAba(tabRefs.current[termo.slug]), [termo.slug]);

  // `null`, not window.history.state: Next.js copies its own entry state over,
  // and skips syncing useSearchParams for a call that already carries it.
  function select(novo: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(TERMO_PARAM, novo);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function selectAndFocus(index: number) {
    const { slug: novo } = TERMOS[index];
    select(novo);
    tabRefs.current[novo]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const count = TERMOS.length;

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
      <div className={tabs.subnav}>
        <div className={`container ${tabs.list}`} role="tablist" aria-label="Termos do glossário">
          {TERMOS.map((t) => {
            const selected = t.slug === termo.slug;
            return (
              <button
                key={t.slug}
                ref={(el) => {
                  tabRefs.current[t.slug] = el;
                }}
                type="button"
                role="tab"
                id={tabId(t.slug)}
                aria-selected={selected}
                aria-controls={selected ? PANEL_ID : undefined}
                tabIndex={selected ? 0 : -1}
                className={`${tabs.item} text-ui-tab${selected ? ` ${tabs.itemCurrent}` : ""}`}
                onClick={() => select(t.slug)}
                onKeyDown={handleKeyDown}
              >
                {t.titulo}
              </button>
            );
          })}
        </div>
      </div>

      <section
        role="tabpanel"
        id={PANEL_ID}
        aria-labelledby={tabId(termo.slug)}
        className={`${tabs.panel} ${styles.glossario}`}
        tabIndex={0}
      >
        <div className={`container ${styles.inner}`}>
          <div className={styles.texto}>
            <h2 className={styles.titulo}>{termo.titulo}</h2>
            {termo.paragrafos.map((p, i) => (
              <p key={i} className={`${styles.paragrafo} text-body`}>{p}</p>
            ))}
          </div>
          {termo.animacao && (
            <CenaAnimada key={termo.slug} id={termo.animacao.id} titulo={termo.animacao.titulo} descricao={termo.animacao.descricao} />
          )}
          {termo.acesso && (
            // The platform is another root layout: a plain link, a full page load.
            <a className={styles.acesso} href={termo.acesso.href}>{termo.acesso.rotulo}</a>
          )}
          {termo.fontes && termo.fontes.length > 0 && (
            <div className={styles.fontesBloco}>
              <h3 className={styles.fontesTitulo}>Fontes</h3>
              <ol className={styles.fontes}>
                {termo.fontes.map((f) => <li key={f}>{f}</li>)}
              </ol>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
