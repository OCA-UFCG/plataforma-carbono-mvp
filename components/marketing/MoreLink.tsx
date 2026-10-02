import Link from "next/link";
import { MdKeyboardArrowRight } from "react-icons/md";
import styles from "./MoreLink.module.css";

type MoreLinkProps = {
  // The internal page the section opens.
  href: string;
  // Read after "Ver mais" by assistive tech only, so the landing's two "Ver
  // mais" links do not share one name in a screen reader's list of links
  // ("Ver mais sobre a plataforma", "Ver mais materiais de comunicação").
  // Appended, not replacing the visible text, so the accessible name still
  // starts with what a sighted user sees (WCAG 2.5.3, label in name).
  contexto: string;
};

// The design's "Ver mais" control: a 114x40 link at the right end of a
// section's header row, in Figma both in "Conheça a plataforma" (node
// 18862:8546) and in "Comunicação" (node 18862:8578), opening that section's
// internal page. Its fill samples to #587c22 = --role-marca-ancora-padrao
// exactly — note that differs from the hero and map buttons, which the design
// binds to --role-marca-ancora-hover. The chevron is Material's
// keyboard_arrow_right, the glyph the design uses (I18862:8579;13:2244).
export default function MoreLink({ href, contexto }: MoreLinkProps) {
  return (
    <Link href={href} className={`${styles.moreLink} text-ui-medium`}>
      Ver mais
      <span className="sr-only"> {contexto}</span>
      <MdKeyboardArrowRight aria-hidden className={styles.icon} />
    </Link>
  );
}
