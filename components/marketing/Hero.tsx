import styles from "./Hero.module.css";

// Filled in by Task 4. The wrapper and its id ship now so the nav anchors resolve.
export default function Hero() {
  return <section id="inicio" className={styles.hero} aria-label="Apresentação" />;
}
