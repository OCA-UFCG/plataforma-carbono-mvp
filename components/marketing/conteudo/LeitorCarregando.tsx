import leitor from "./Leitor.module.css";

// The reader while pdf.js's chunk downloads (PdfViewerLoader): the same frame,
// toolbar height and area, so the page does not jump when the reader mounts.
export default function LeitorCarregando() {
  return (
    <div className={leitor.frame}>
      <div className={leitor.toolbar} />
      <div className={leitor.area}>
        <p className={leitor.status} role="status">
          Carregando documento…
        </p>
      </div>
    </div>
  );
}
