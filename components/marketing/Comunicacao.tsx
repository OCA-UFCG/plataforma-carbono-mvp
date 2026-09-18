import type { ComunicacaoContent } from "@/lib/content/comunicacao";
import styles from "./Comunicacao.module.css";

// Filled in by Task 8. The prop is declared now because page.tsx already passes it.
export default function Comunicacao({ conteudo }: { conteudo: ComunicacaoContent }) {
  void conteudo;
  return <section id="comunicacao" className={styles.comunicacao} aria-label="Comunicação" />;
}
