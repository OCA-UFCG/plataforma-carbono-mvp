import Link from "next/link";
import { FaAngleRight } from "react-icons/fa6";
import styles from "./MoreLink.module.css";

// The design's "Ver mais" control: a 114x40 button at the right end of a
// section's header row, in Figma both in "Conheça a plataforma" (node
// 18862:8546) and in "Comunicação" (node 18862:8578). Its fill samples to
// #587c22 = --role-marca-ancora-padrao exactly — note that differs from the
// hero and map buttons, which the design binds to --role-marca-ancora-hover.
//
// With an `href` it is a link to the internal page it opens. Without one it
// ships INERT, as it did before those pages existed: a <span> rather than a
// disabled <button>, matching how SiteHeader's PT-BR/En control handles the
// same problem (a disabled button announces as a broken control). A <span>
// has no role, so `aria-disabled` is documentation only; the visually-hidden
// suffix is what tells assistive tech it does nothing, and `title` is
// decorative, for a sighted mouse user who hovers.
export default function MoreLink({ href }: { href?: string }) {
  if (href) {
    return (
      <Link href={href} className={`${styles.moreLink} text-body`}>
        Ver mais
        <FaAngleRight aria-hidden className={styles.icon} />
      </Link>
    );
  }

  return (
    <span
      className={`${styles.moreLink} ${styles.inert} text-body`}
      aria-disabled="true"
      title="Disponível em breve"
    >
      Ver mais
      <span className="sr-only"> (disponível em breve)</span>
      <FaAngleRight aria-hidden className={styles.icon} />
    </span>
  );
}
