import styles from "./Quote.module.css";

export type QuoteProps = {
  // "body" (the default) is the 14px bold line of 18988:8705; "large" the
  // 18px semibold mission of "Conheça a plataforma" (19538:11413).
  size?: "body" | "large";
  children: React.ReactNode;
};

// A line of text with a rule on its left. At the body size it is the bold
// line that closes a block of text: Figma 18988:8705 on the Sobre pages, and
// the `destaque` of every tab of the landing's "Conheça a plataforma"
// (18862:8546), where it came from. At the large size it stands on its own
// under a heading: the mission of /sobre (19538:11413). A <p> rather than a
// <blockquote>: it is the page's own statement, not a quotation of anyone.
export default function Quote({ size = "body", children }: QuoteProps) {
  const sizeClass = size === "large" ? styles.large : "text-body";
  return <p className={`${styles.quote} ${sizeClass}`}>{children}</p>;
}
