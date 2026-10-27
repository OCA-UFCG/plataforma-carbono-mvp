import styles from "./BotaoEtapa.module.css";

// Figma "toggle" (164:1573), outline variant: one step of an animation told in
// steps. Its three states (Default, Hover, Selecionado) are 19403:26571.
export type BotaoEtapaProps = {
  rotulo: string;
  /** The step's colour, drawn as a 16 px swatch before the label. */
  cor?: string | null;
  selecionado: boolean;
  onClick: () => void;
};

export default function BotaoEtapa({ rotulo, cor, selecionado, onClick }: BotaoEtapaProps) {
  return (
    <button type="button" className={`${styles.botao} text-ui-tab`} aria-pressed={selecionado} onClick={onClick}>
      {/* The swatch comes from the scene (EtapaCena.cor), not from the tokens. */}
      {cor && <span className={styles.amostra} style={{ background: cor }} aria-hidden="true" />}
      {rotulo}
    </button>
  );
}
