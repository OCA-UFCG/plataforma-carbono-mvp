import { Fragment } from "react";

// One paragraph of copy read from Contentful (lib/content/site/model.ts), with
// each line break the editor typed rendered as a <br>. Most paragraphs have
// none; the few the design breaks on purpose keep their breaks this way.
export default function Linhas({ texto }: { texto: string }) {
  return texto.split("\n").map((linha, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {linha}
    </Fragment>
  ));
}
