import { useId, type CSSProperties } from "react";
import type { FaseAno } from "@/lib/cenas/tipos";
import styles from "./Regua.module.css";

// Figma "Date-slider" (7076:46472) with its label on the left and its value on
// the right: "Velocidade", "Posição no ano" and the CUE's "Ajuste manual".
export type ReguaProps = {
  rotulo: string;
  min: number;
  max: number;
  passo: number;
  valor: number;
  onChange: (valor: number) => void;
  /** Shown on the right and, without descricaoValor, read by screen readers: "1×", "Primeiras chuvas", "0,31". */
  textoValor: string;
  /** Read by screen readers in place of textoValor, when the number alone says
   *  too little: "0,31, Área cristalina: 31 de cada 100 ficam". */
  descricaoValor?: string;
  desativada?: boolean;
  /** Coloured stretches of the track in place of the green fill: the phases of
   *  the year on the time slider. */
  faixas?: FaseAno[];
};

// The track's bands, laid out where the thumb's centre travels: half a thumb in
// from each end, as the green fill is.
function fundoFaixas(faixas: FaseAno[]): string {
  const em = (f: number) => `calc(var(--polegar) / 2 + (100% - var(--polegar)) * ${f})`;
  const paradas = faixas.map((f, i) => {
    const de = i === 0 ? "0%" : em(f.inicio);
    const ate = i === faixas.length - 1 ? "100%" : em(f.fim);
    return `${f.cor} ${de} ${ate}`;
  });
  return `linear-gradient(to right, ${paradas.join(", ")}) 0 50% / 100% var(--preenchimento) no-repeat`;
}

export default function Regua({ rotulo, min, max, passo, valor, onChange, textoValor, descricaoValor, desativada, faixas }: ReguaProps) {
  const id = useId();
  const fracao = max > min ? Math.min(1, Math.max(0, (valor - min) / (max - min))) : 0;
  return (
    <div className={`${styles.regua} ${faixas?.length ? styles.reguaFases : ""}`}>
      <label htmlFor={id} className={styles.texto}>{rotulo}</label>
      <input
        id={id}
        type="range"
        className={styles.trilha}
        min={min}
        max={max}
        step={passo}
        value={valor}
        disabled={desativada}
        aria-valuetext={descricaoValor ?? textoValor}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--fracao": fracao, ...(faixas?.length ? { "--fundo": fundoFaixas(faixas) } : {}) } as CSSProperties}
      />
      {/* A span, not an <output>: that is a live region, which would read the
          date out on every step while the scene plays. The slider already
          carries the value in aria-valuetext. */}
      <span className={`${styles.texto} ${styles.valor} ${faixas?.length ? styles.valorFase : ""}`} aria-hidden="true">{textoValor}</span>
    </div>
  );
}
