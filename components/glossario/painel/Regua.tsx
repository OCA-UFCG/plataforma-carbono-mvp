import { useId, type CSSProperties } from "react";
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
  /** Shown on the right and, without descricaoValor, read by screen readers: "1×", "9 fev", "0,31". */
  textoValor: string;
  /** Read by screen readers in place of textoValor, when the number alone says
   *  too little: "0,31, Área cristalina: 31 de cada 100 ficam". */
  descricaoValor?: string;
  desativada?: boolean;
};

export default function Regua({ rotulo, min, max, passo, valor, onChange, textoValor, descricaoValor, desativada }: ReguaProps) {
  const id = useId();
  const fracao = max > min ? Math.min(1, Math.max(0, (valor - min) / (max - min))) : 0;
  return (
    <div className={styles.regua}>
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
        style={{ "--fracao": fracao } as CSSProperties}
      />
      {/* A span, not an <output>: that is a live region, which would read the
          date out on every step while the scene plays. The slider already
          carries the value in aria-valuetext. */}
      <span className={`${styles.texto} ${styles.valor}`} aria-hidden="true">{textoValor}</span>
    </div>
  );
}
