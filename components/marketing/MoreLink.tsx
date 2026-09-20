import { FaAngleRight } from "react-icons/fa6";
import styles from "./MoreLink.module.css";

// The design's "Ver mais" control: a 114x40 button at the right end of a
// section's header row, in Figma both in "Conheça a plataforma" (node
// 18862:8546) and in "Comunicação" (node 18862:8578). Its fill samples to
// #587c22 = --role-marca-ancora-padrao exactly — note that differs from the
// hero and map buttons, which the design binds to --role-marca-ancora-hover.
//
// It ships INERT. The internal pages it would open ("Sobre", "Comunicação") do
// not exist yet, so there is nothing to link to. Rendered as a <span> with
// aria-disabled rather than a disabled <button>, matching how SiteHeader's
// PT-BR/En control handles the same problem: a disabled button announces as a
// broken control, while this announces as unavailable text.
//
// When the pages exist, give this an `href` and render an <a> — one change,
// both sections. That is why it is shared rather than written twice.
export default function MoreLink({ className }: { className?: string }) {
  return (
    <span
      className={`${styles.moreLink} text-body${className ? ` ${className}` : ""}`}
      aria-disabled="true"
      title="Disponível em breve"
    >
      Ver mais
      <FaAngleRight aria-hidden className={styles.icon} />
    </span>
  );
}
