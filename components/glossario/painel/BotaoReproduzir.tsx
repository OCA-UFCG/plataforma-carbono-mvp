import styles from "./BotaoReproduzir.module.css";

// Figma "button" (1:85), type "primary with icon": "Reproduzir" with the
// "Play circle filled" icon (19401:22940) while the scene is paused, "Pausar"
// with Material Symbols' pause_circle while it plays.
export type BotaoReproduzirProps = {
  tocando: boolean;
  onClick: () => void;
  desativado?: boolean;
};

export default function BotaoReproduzir({ tocando, onClick, desativado }: BotaoReproduzirProps) {
  return (
    <button type="button" className={`${styles.botao} text-ui-medium`} disabled={desativado} onClick={onClick}>
      {/* Both labels share one grid cell, so the button keeps the width of the
          longer one and the sliders beside it do not shift on each press.
          The hidden one is left out of the accessible name. */}
      <span className={styles.rotulos}>
        <span className={tocando ? styles.oculto : undefined}>Reproduzir</span>
        <span className={tocando ? undefined : styles.oculto}>Pausar</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- exported icon */}
      <img
        src={tocando ? "/icons/glossario/pause-circle.svg" : "/icons/glossario/play-circle-filled.svg"}
        alt=""
        width={16}
        height={16}
      />
    </button>
  );
}
