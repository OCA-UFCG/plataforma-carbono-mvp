import { useTranslations } from "next-intl";
import type { Publicacao } from "@/lib/content/comunicacao";
import PublicationCard from "../PublicationCard";
import grid from "../Publicacoes.module.css";
import styles from "./RelatedContent.module.css";

// "Conteúdos Relacionados", Figma node 19015:13091: the heading, then the same
// cards on the same auto-fill grid as the Comunicação page (Publicacoes): five
// 236px tracks at the 1276px container. With four publications the cards keep
// the design's width and the fifth track stays empty, since the grid fills
// tracks rather than stretching cards; narrower, it reflows down to one column.
// The id sits on the heading, not the wrapper (tests/lib/marketingNav.test.ts).
export default function RelatedContent({ publicacoes }: { publicacoes: Publicacao[] }) {
  const t = useTranslations("ComunicacaoConteudoRelated");

  if (publicacoes.length === 0) return null;

  return (
    <section className={styles.related} aria-labelledby="relacionados-heading">
      <div className={`container ${styles.inner}`}>
        <h2 id="relacionados-heading" className={styles.heading}>
          {t("heading")}
        </h2>
        <ul className={grid.grid} role="list">
          {publicacoes.map((publicacao) => (
            <PublicationCard key={publicacao.key} publicacao={publicacao} />
          ))}
        </ul>
      </div>
    </section>
  );
}
