"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimacaoId } from "@/lib/glossario/termos";
import type { ControleCena, CriarCena, EstadoCena, EtapaCena } from "@/lib/cenas/tipos";
import BotaoEtapa from "./painel/BotaoEtapa";
import BotaoReproduzir from "./painel/BotaoReproduzir";
import Regua from "./painel/Regua";
import styles from "./CenaAnimada.module.css";

// Each scene is its own chunk (about 100 KB), loaded only when its block comes
// near the screen.
const CENAS: Record<AnimacaoId, () => Promise<{ criarCena: CriarCena }>> = {
  cicloAnual: () => import("@/lib/cenas/gerado/cicloAnual"),
  torreFluxo: () => import("@/lib/cenas/gerado/torreFluxo"),
  estoques: () => import("@/lib/cenas/gerado/estoques"),
  cisterna: () => import("@/lib/cenas/gerado/cisterna"),
  fluxos: () => import("@/lib/cenas/gerado/fluxos"),
  cue: () => import("@/lib/cenas/gerado/cue"),
  degradacao: () => import("@/lib/cenas/gerado/degradacao"),
  agroecologia: () => import("@/lib/cenas/gerado/agroecologia"),
};

// One glossary animation with its control panel, which lives outside the
// canvas (Figma "Painel de controle glossário", 19401:22996): a row of step
// buttons for a scene told in steps, a row of time controls for a scene that
// plays a year, both rows when it has both. The scene pauses drawing while off
// screen or in a hidden tab.
export default function CenaAnimada({ id, titulo, descricao }: { id: AnimacaoId; titulo: string; descricao: string }) {
  const caixa = useRef<HTMLElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const controle = useRef<ControleCena | null>(null);
  const [estado, setEstado] = useState<EstadoCena | null>(null);
  const [etapas, setEtapas] = useState<EtapaCena[] | null>(null);
  const [tempo, setTempo] = useState(false);

  useEffect(() => {
    const box = caixa.current;
    const canvas = tela.current;
    const cenaPainel = painel.current;
    if (!box || !canvas) return;
    let cancelado = false;
    let naTela = false;
    // Set before the chunk arrives: a block that leaves and comes back while it
    // loads would otherwise start a second scene on the same canvas, which
    // nothing would ever end.
    let iniciada = false;

    const aplicarVisibilidade = () => controle.current?.visivel(naTela && !document.hidden);
    const observer = new IntersectionObserver(
      (entries) => {
        // One callback may carry several changes (the block leaving and coming
        // back); the last one is where it is now.
        naTela = entries[entries.length - 1].isIntersecting;
        if (naTela && !iniciada) {
          iniciada = true;
          void CENAS[id]().then(({ criarCena }) => {
            if (cancelado) return;
            controle.current = criarCena(canvas, {
              fonte: getComputedStyle(canvas).fontFamily,
              aoMudar: setEstado,
              painel: cenaPainel ?? undefined,
            });
            setEstado(controle.current.estado());
            setEtapas(controle.current.etapas());
            setTempo(controle.current.tempo());
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
      // What the scene built in its panel is not React's, so React would leave
      // it behind for the next scene.
      cenaPainel?.replaceChildren();
    };
  }, [id]);

  return (
    <figure className={styles.figura} ref={caixa}>
      <canvas ref={tela} className={styles.tela} width={960} height={540} role="img" aria-label={descricao} />
      {/* The design shows no caption under the animation. */}
      <figcaption className="sr-only">{titulo}</figcaption>
      <div className={styles.caixa}>
        {estado && etapas && (
          <div className={`${styles.linha} ${styles.etapas}`} role="group" aria-label={`Etapas de ${titulo}`}>
            {etapas.map((etapa, i) => (
              <BotaoEtapa
                key={etapa.nome}
                rotulo={etapa.nome}
                cor={etapa.cor}
                selecionado={estado.etapa === i}
                onClick={() => controle.current?.etapa(i)}
              />
            ))}
          </div>
        )}
        {/* Controls a scene builds itself (the CUE value, the stage texts of
            the two farming systems), until they move to the components above. */}
        <div ref={painel} className={styles.painel} />
        {estado && tempo && (
          <div className={styles.linha}>
            <BotaoReproduzir tocando={estado.tocando} onClick={() => controle.current?.tocar(!estado.tocando)} />
            <Regua
              rotulo="Velocidade"
              min={0.25}
              max={3}
              passo={0.25}
              valor={estado.velocidade}
              onChange={(v) => controle.current?.velocidade(v)}
              textoValor={`${estado.velocidade.toLocaleString("pt-BR")}×`}
            />
            {/* One step per day, the unit of the date the scene reports (day d
                is floor(posicao × 365)): a finer step could land on the same
                day, which the scene does not report, and the slider would snap
                back. Mid-day keeps the position clear of the day's edges. */}
            <Regua
              rotulo="Posição no ano"
              min={0}
              max={364}
              passo={1}
              valor={Math.floor(estado.posicao * 365)}
              onChange={(v) => controle.current?.posicao((v + 0.5) / 365)}
              textoValor={estado.data}
            />
          </div>
        )}
        {etapas && <p className="sr-only" aria-live="polite">{estado?.textoEtapa ?? ""}</p>}
      </div>
    </figure>
  );
}
