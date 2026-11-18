import { useTranslations } from "next-intl";
import leitor from "./Leitor.module.css";

// The reader while pdf.js's chunk downloads (PdfViewerLoader): the same frame,
// toolbar height and area, so the page does not jump when the reader mounts.
// Busy throughout, like the reader until its first page is drawn (PdfViewer).
export default function LeitorCarregando() {
  const t = useTranslations("PdfViewer");

  return (
    <div className={leitor.frame} aria-busy="true">
      <div className={leitor.toolbar} />
      <div className={leitor.area}>
        <p className={leitor.status} role="status">
          {t("loading")}
        </p>
      </div>
    </div>
  );
}
