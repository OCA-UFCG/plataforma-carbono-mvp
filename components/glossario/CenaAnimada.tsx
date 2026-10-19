"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimacaoId } from "@/lib/glossario/termos";
import type { ControleCena, CriarCena, EstadoCena } from "@/lib/cenas/tipos";
import styles from "./CenaAnimada.module.css";

// Each scene is its own chunk (about 100 KB), loaded only when its block comes
// near the screen.
const CENAS: Record<AnimacaoId, () => Promise<{ criarCena: CriarCena }>> = {
  cicloAnual: () => import("@/lib/cenas/gerado/cicloAnual"),
};

// One glossary animation with its time controls, which live outside the
// canvas. The scene pauses drawing while off screen or in a hidden tab.
export default function CenaAnimada({ id, titulo, descricao }: { id: AnimacaoId; titulo: string; descricao: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const controle = useRef<ControleCena | null>(null);
  const [estado, setEstado] = useState<EstadoCena | null>(null);

  useEffect(() => {
    const box = caixa.current;
    const canvas = tela.current;
    if (!box || !canvas) return;
    let cancelado = false;
    let naTela = false;

    const aplicarVisibilidade = () => controle.current?.visivel(naTela && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        naTela = entry.isIntersecting;
        if (naTela && !controle.current) {
          void CENAS[id]().then(({ criarCena }) => {
            if (cancelado) return;
            controle.current = criarCena(canvas, {
              fonte: getComputedStyle(canvas).fontFamily,
              aoMudar: setEstado,
            });
            setEstado(controle.current.estado());
            aplicarVisibilidade();
          });
        }
        aplicarVisibilidade();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(box);
    document.addEventListener("visibilitychange", aplicarVisibilidade);

    return () => {
      cancelado = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", aplicarVisibilidade);
      controle.current?.encerrar();
      controle.current = null;
    };
  }, [id]);

  return (
    <figure className={styles.figura} ref={caixa}>
      <canvas ref={tela} className={styles.tela} width={960} height={540} role="img" aria-label={descricao} />
      <figcaption className={styles.legenda}>{titulo}</figcaption>
      <div className={styles.controles}>
        <button
          type="button"
          className={styles.botao}
          disabled={!estado}
          onClick={() => controle.current?.tocar(!estado?.tocando)}
        >
          {estado?.tocando ? "Pausar" : "Reproduzir"}
        </button>
        <label className={styles.campo}>
          Velocidade
          <input
            type="range" min={0.25} max={3} step={0.25}
            value={estado?.velocidade ?? 1}
            disabled={!estado}
            onChange={(e) => controle.current?.velocidade(Number(e.target.value))}
          />
          <output className={styles.valor}>{(estado?.velocidade ?? 1).toLocaleString("pt-BR")}×</output>
        </label>
        <label className={styles.campo}>
          Posição no ano
          <input
            type="range" min={0} max={999} step={1}
            value={Math.round((estado?.posicao ?? 0) * 1000)}
            disabled={!estado}
            onChange={(e) => controle.current?.posicao(Number(e.target.value) / 1000)}
          />
          <output className={styles.valor} aria-live="polite">{estado?.data ?? "1 nov"}</output>
        </label>
      </div>
    </figure>
  );
}
