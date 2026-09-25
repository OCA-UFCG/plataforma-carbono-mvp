import type { Publicacao } from "@/lib/content/comunicacao";
import PublicationCard from "./PublicationCard";
import styles from "./Publicacoes.module.css";

// The "Conteúdo" grid of the Comunicação page, Figma node 18978:2072. No id
// on the wrapper: it is not a landing section, and tests/lib/marketingNav.test.ts
// counts every wrapper id under components/marketing as one.
export default function Publicacoes({ publicacoes }: { publicacoes: Publicacao[] }) {
  return (
    <section className={styles.publicacoes} aria-labelledby="publicacoes-heading">
      <div className={`container ${styles.inner}`}>
        <h2 id="publicacoes-heading" className={styles.heading}>
          Conteúdo
        </h2>
        {/* role="list" restores the list semantics `list-style: none` strips in
            Safari/VoiceOver, as in Destaques.tsx and Comunicacao.tsx. */}
        <ul className={styles.grid} role="list">
          {publicacoes.map((publicacao) => (
            <PublicationCard key={publicacao.key} publicacao={publicacao} />
          ))}
        </ul>
      </div>
    </section>
  );
}
