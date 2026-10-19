"use client";

import { useState } from "react";
import CenaAnimada from "@/components/glossario/CenaAnimada";
import { TERMOS, TERMO_PARAM } from "@/lib/glossario/termos";
import styles from "./Glossario.module.css";

// The "Glossário" panel of the Comunicação page: the terms down the left, the
// open term on the right with its text, its animation and its sources. The
// open term goes into the address (?aba=glossario&termo=…) with replaceState,
// like the tabs, so a link from the platform's layer sheet opens it directly.
// A term without a page yet is listed as "em breve".
export default function Glossario({ inicial }: { inicial: string }) {
  const [slug, setSlug] = useState(inicial);
  const termo = TERMOS.find((t) => t.slug === slug) ?? TERMOS[0];

  function abrir(novo: string) {
    setSlug(novo);
    const url = new URL(window.location.href);
    url.searchParams.set(TERMO_PARAM, novo);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <section className={styles.glossario} aria-labelledby="glossario-heading">
      <div className={`container ${styles.inner}`}>
        <h2 id="glossario-heading" className={styles.heading}>Glossário</h2>
        <div className={styles.grade}>
          <nav aria-label="Termos do glossário">
            <ul className={styles.termos} role="list">
              {TERMOS.map((t) => {
                const aberto = t.slug === termo.slug;
                return (
                  <li key={t.slug}>
                    {t.paragrafos ? (
                      <button
                        type="button"
                        className={`${styles.termo}${aberto ? ` ${styles.termoAberto}` : ""}`}
                        aria-current={aberto ? "true" : undefined}
                        onClick={() => abrir(t.slug)}
                      >
                        {t.titulo}
                      </button>
                    ) : (
                      <span className={`${styles.termo} ${styles.termoEmBreve}`}>
                        {t.titulo}
                        <span className={styles.emBreve}>em breve</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <article className={styles.conteudo} aria-labelledby={`termo-${termo.slug}`}>
            <h3 id={`termo-${termo.slug}`} className={`${styles.titulo} text-h2`}>{termo.titulo}</h3>
            {termo.paragrafos?.map((p, i) => (
              <p key={i} className={styles.paragrafo}>{p}</p>
            ))}
            {termo.animacao && (
              <div className={styles.animacao}>
                <CenaAnimada key={termo.slug} id={termo.animacao.id} titulo={termo.animacao.titulo} descricao={termo.animacao.descricao} />
                <p className={styles.nota}>{termo.animacao.nota}</p>
              </div>
            )}
            {termo.fontes && termo.fontes.length > 0 && (
              <>
                <h4 className={styles.fontesTitulo}>Fontes</h4>
                <ol className={styles.fontes}>
                  {termo.fontes.map((f) => <li key={f}>{f}</li>)}
                </ol>
              </>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
