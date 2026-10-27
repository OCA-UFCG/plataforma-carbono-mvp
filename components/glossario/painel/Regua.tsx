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
  /** Shown on the right and read by screen readers: "1×", "9 fev", "0,31". */
  textoValor: string;
  desativada?: boolean;
};

export default function Regua({ rotulo, min, max, passo, valor, onChange, textoValor, desativada }: ReguaProps) {
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
        aria-valuetext={textoValor}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--fracao": fracao } as CSSProperties}
      />
      <output htmlFor={id} className={`${styles.texto} ${styles.valor}`}>{textoValor}</output>
    </div>
  );
}
