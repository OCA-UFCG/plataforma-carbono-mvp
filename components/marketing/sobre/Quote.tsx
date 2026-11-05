import styles from "./Quote.module.css";

export type QuoteProps = {
  // "body" (the default) is the 14px bold line of 18988:8705; "large" the
  // 18px semibold mission of "Conheça a plataforma" (19538:11413).
  size?: "body" | "large";
  children: React.ReactNode;
};

// The bold line with a rule on its left that closes a block of text: Figma
// 18988:8705 on the Sobre pages, and the `destaque` of every tab of the
// landing's "Conheça a plataforma" (18862:8546), where it came from. A <p>
// rather than a <blockquote>: it is the page's own takeaway, not a quotation
// of anyone.
export default function Quote({ size = "body", children }: QuoteProps) {
  const sizeClass = size === "large" ? styles.large : "text-body";
  return <p className={`${styles.quote} ${sizeClass}`}>{children}</p>;
}
