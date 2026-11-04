"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TermoAberto from "@/components/glossario/TermoAberto";
import { TERMOS, TERMO_PARAM, abaFocavel, filtrarTermos, parseTermo } from "@/lib/glossario/termos";
import { useUrlTabs } from "./useUrlTabs";
import styles from "./Glossario.module.css";

const PANEL_ID = "glossario-painel";

const LISTA_ID = "glossario-termos";

// What the live region reads once the reader has typed in the search box.
function contagem(n: number) {
  if (n === 0) return "Nenhum termo encontrado";

  return n === 1 ? "1 termo encontrado" : `${n} termos encontrados`;
}

// The address of a term, keeping whatever else the current one carries.
function termoHref(current: URL, slug: string) {
  const url = new URL(current);
  url.searchParams.set(TERMO_PARAM, slug);
  return `${url.pathname}${url.search}${url.hash}`;
}

function tabId(slug: string) {
  return `glossario-tab-${slug}`;
}

// Scrolls the list, never the page, until the whole tab shows with the list's
// padding beside it. The list only scrolls on narrow screens, where it lies
// sideways; on wider ones it fits and this does nothing. focus() alone leaves
// a tab that already peeks in at the edge where it is.
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

// The Glossário page, Figma frame 19507:12478: a sidebar with the page's title
// (its h1) over the list of terms, and beside it the open term's title, text
// and animation (components/glossario/TermoAberto.tsx, which keys the
// animation by term). The list is an ARIA tablist after the WAI-ARIA tabs pattern,
// vertical, through useUrlTabs as ComunicacaoAbas.tsx does, except that only
// the open term is rendered: each term mounts its own scene, and
// lib/cenas/REGRAS_CENAS.md loads one at a time, so switching tabs unmounts
// the previous CenaAnimada, which ends its scene. The one panel is labelled by
// the open tab, the only one that points at it.
// The open term lives in the address (?termo=…), with no state of its own: a
// tab writes it with replaceState, which Next.js feeds back to
// useSearchParams, so a shared link opens the same term on the server, and a
// link back to the bare /glossario (the header's) opens the first term again
// even though the page stays mounted.
// The "Buscar termo" box filters the list as the reader types, and only the
// list: the open term stays open until a tab is chosen. A term the search
// leaves out is hidden rather than unmounted, so the panel keeps the label its
// tab gives it (aria-labelledby reads hidden elements), and the arrow keys
// move among the terms shown.
export default function Glossario({ titulo }: { titulo: string }) {
  const termo = parseTermo(useSearchParams()?.get(TERMO_PARAM) ?? null);
  const [busca, setBusca] = useState("");
  const visiveis = filtrarTermos(TERMOS, busca).map((t) => t.slug);
  const focavel = abaFocavel(visiveis, termo.slug);
  const { select, handleKeyDown, tabRef, tab } = useUrlTabs(visiveis, termoHref, { orientation: "vertical" });

  // A link may open a term past the list's edge on a narrow screen.
  useEffect(() => mostrarAba(tab(termo.slug)), [tab, termo.slug]);

  return (
    <div className={styles.glossario}>
      <div className={styles.linha}>
        <div className={styles.lateral}>
          <h1 className={`${styles.titulo} text-h3`}>{titulo}</h1>
          {/* 19507:16677: the design names it "select", but draws a search
              box, a magnifier where a select's arrow would be. */}
          <div className={styles.busca}>
            <input
              type="search"
              className={`${styles.buscaCampo} text-ui-regular`}
              placeholder="Buscar termo"
              aria-label="Buscar termo"
              aria-controls={LISTA_ID}
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
            <img className={styles.buscaIcone} src="/icons/mapa/search.svg" alt="" width={16} height={16} />
          </div>
          <div id={LISTA_ID} className={styles.termos} role="tablist" aria-orientation="vertical" aria-label="Termos do glossário">
            {TERMOS.map((t) => {
              const selected = t.slug === termo.slug;
              return (
                <button
                  key={t.slug}
                  ref={tabRef(t.slug)}
                  type="button"
                  role="tab"
                  id={tabId(t.slug)}
                  aria-selected={selected}
                  aria-controls={selected ? PANEL_ID : undefined}
                  tabIndex={t.slug === focavel ? 0 : -1}
                  hidden={!visiveis.includes(t.slug)}
                  className={`${styles.termo} text-ui-tab${selected ? ` ${styles.termoAtual}` : ""}`}
                  onClick={() => select(t.slug)}
                  onKeyDown={handleKeyDown}
                >
                  {t.titulo}
                </button>
              );
            })}
          </div>
          {visiveis.length === 0 && <p className={`${styles.semResultado} text-body`}>Nenhum termo encontrado</p>}
          {/* Live from the start and empty until the reader types: a region
              that turns live in the same render as its first text is often
              not read. */}
          <p className="sr-only" aria-live="polite">
            {busca.trim() ? contagem(visiveis.length) : ""}
          </p>
        </div>

        <section
          role="tabpanel"
          id={PANEL_ID}
          aria-labelledby={tabId(termo.slug)}
          className={styles.conteudo}
          tabIndex={0}
        >
          <TermoAberto termo={termo} />
        </section>
      </div>
    </div>
  );
}
