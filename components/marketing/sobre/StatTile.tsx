import styles from "./StatTile.module.css";

// One figure of "O que a lei já garante?", Figma "Card Sobre" 18988:8825 /
// 18988:8833: a label over its value. A <div> of dt + dd, so a row of tiles
// sits inside one <dl> and reads as label/value pairs.
export default function StatTile({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className={styles.tile}>
      <dt className={styles.rotulo}>{rotulo}</dt>
      <dd className={styles.valor}>{valor}</dd>
    </div>
  );
}
