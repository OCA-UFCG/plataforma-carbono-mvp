import Linhas from "./Linhas";

// The paragraphs of a Contentful text field (lib/content/site/model.ts), each
// a <p> with the line breaks the editor typed, and no wrapper of their own:
// the containers that hold them space them as siblings.
export default function Paragrafos({ textos }: { textos: string[] }) {
  return textos.map((texto, i) => (
    <p key={i}>
      <Linhas texto={texto} />
    </p>
  ));
}
