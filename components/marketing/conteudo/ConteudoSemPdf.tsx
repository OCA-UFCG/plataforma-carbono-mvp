import type { Publicacao } from "@/lib/content/comunicacao";
import leitor from "./Leitor.module.css";

// The reader with no PDF to read, which is every publication until the files
// are uploaded (spec §1): PdfViewer's frame, a toolbar reduced to the title,
// and the cover where the first page would be. pdf.js is never loaded for it.
// Below 768px the toolbar would hold nothing (the title is the h1 above), so
// `titleOnly` hides it there.
export default function ConteudoSemPdf({ publicacao }: { publicacao: Publicacao }) {
  return (
    <div className={leitor.frame}>
      <div className={`${leitor.toolbar} ${leitor.titleOnly}`}>
        <p className={`${leitor.title} text-p-ui`}>{publicacao.title}</p>
      </div>
      <div className={`${leitor.area} ${leitor.still}`}>
        {/* Empty alt: the cover art restates the title, which is the page's h1. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset or Contentful URL, as in PublicationCard */}
        <img src={publicacao.cover} alt="" className={leitor.cover} />
      </div>
    </div>
  );
}
