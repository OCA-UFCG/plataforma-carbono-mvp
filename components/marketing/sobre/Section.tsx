import { Children, isValidElement, useId } from "react";
import Quote from "./Quote";
import styles from "./Section.module.css";

export type SectionProps = {
  title: string;
  children: React.ReactNode;
  // 'alert' sets the heading in red, as "Um bioma sob pressão" (18988:8744).
  tone?: "default" | "alert";
};

// A titled block of text on the Sobre pages, e.g. Figma 18988:8642 ("Por que
// criar uma plataforma para a Caatinga?"): an h2 over its body, which takes
// paragraphs, a Quote or IndicatorCards as children. Plain <p> children need
// no class; the body text style is the page default (app/globals.css).
// A Quote given last is not one of the body's blocks: the design sets it in
// the heading's 8px column, 8px under the text (18988:8700, 18988:8799), so
// it is rendered after the body. Anywhere else it stays in the body.
export default function Section({ title, children, tone = "default" }: SectionProps) {
  const titleId = useId();
  const blocks = Children.toArray(children);
  const last = blocks[blocks.length - 1];
  const quote = isValidElement(last) && last.type === Quote ? blocks.pop() : null;

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={`${styles.title} ${tone === "alert" ? styles.alert : ""}`}>
        {title}
      </h2>
      <div className={styles.body}>{blocks}</div>
      {quote}
    </section>
  );
}
