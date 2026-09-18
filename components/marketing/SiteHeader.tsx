import styles from "./SiteHeader.module.css";

// Filled in by Task 3. The wrapper ships now so the nav links and page shell
// can be composed against a stable component tree.
export default function SiteHeader() {
  return <header className={styles.siteHeader} aria-label="Cabeçalho" />;
}
