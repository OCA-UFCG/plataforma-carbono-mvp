"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css";
import { formatZoom, nextZoomStep, parsePageInput } from "@/lib/marketing/pdfViewerControls";
import leitor from "./Leitor.module.css";
import styles from "./PdfViewer.module.css";

export type PdfViewerProps = {
  url: string;
  title: string;
  fileName: string;
  cover: string;
};

type Status = "loading" | "ready" | "error";

// Below this width the reader opens fitted to the width; Leitor.module.css and
// PdfViewer.module.css switch the toolbar at the same width.
const MOBILE_QUERY = "(max-width: 767px)";

// The publication reader, Figma node 19015:13068: pdf.js's own PDFViewer
// (lazy page rendering, text layer, links) driven by the design's toolbar,
// built as the spike validated it (spec §2.1, §5). Loaded only through
// PdfViewerLoader, never on the server.
export default function PdfViewer({ url, title, fileName, cover }: PdfViewerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerElementRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PDFViewer | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const scaleBeforeFullscreen = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageField, setPageField] = useState("1");
  const [scale, setScale] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Client-only component (ssr: false), so `document` exists on first render.
  // iPhone Safari has no element fullscreen, and there the button is left out.
  const [canFullscreen] = useState(() => document.fullscreenEnabled);

  useEffect(() => {
    let cancelled = false;
    let destroyTask: (() => Promise<void>) | undefined;

    async function open() {
      const pdfjs = await import("pdfjs-dist");
      // A same-origin worker the bundler emits next to the chunks, versioned
      // with the installed package: no CDN, no copy step.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      // pdf_viewer.mjs reads the core library from this global when imported.
      (globalThis as unknown as { pdfjsLib?: typeof pdfjs }).pdfjsLib = pdfjs;
      const { EventBus, LinkTarget, PDFLinkService, PDFViewer: Viewer } = await import(
        "pdfjs-dist/web/pdf_viewer.mjs"
      );

      const container = containerRef.current;
      const viewerElement = viewerElementRef.current;
      if (cancelled || !container || !viewerElement) return;

      const eventBus = new EventBus();
      const linkService = new PDFLinkService({
        eventBus,
        externalLinkTarget: LinkTarget.BLANK,
        externalLinkRel: "noopener noreferrer",
      });
      const viewer = new Viewer({
        container,
        viewer: viewerElement,
        eventBus,
        linkService,
        // Pages flush with the frame, and page-width uses the full width
        // (without it pdf.js reserves a scrollbar's padding: spare room at 390px).
        removePageBorders: true,
        // Links, but no form fields and no annotation editing (spec §5.2).
        annotationMode: pdfjs.AnnotationMode.ENABLE,
        annotationEditorMode: pdfjs.AnnotationEditorType.DISABLE,
      });
      linkService.setViewer(viewer);
      viewerRef.current = viewer;

      eventBus.on("pagesinit", () => {
        viewer.currentScaleValue = window.matchMedia(MOBILE_QUERY).matches ? "page-width" : "page-fit";
      });
      eventBus.on("pagechanging", ({ pageNumber }: { pageNumber: number }) => {
        setPage(pageNumber);
        setPageField(String(pageNumber));
      });
      eventBus.on("scalechanging", ({ scale: next }: { scale: number }) => setScale(next));

      // No eval hardening to pass: the font code path behind CVE-2024-4367
      // (code execution through a crafted font) no longer compiles code at all
      // in pdf.js 6, which dropped the `isEvalSupported` option with it.
      const task = pdfjs.getDocument({ url });
      destroyTask = () => task.destroy();
      const pdfDocument = await task.promise;
      if (cancelled) return;

      documentRef.current = pdfDocument;
      viewer.setDocument(pdfDocument);
      linkService.setDocument(pdfDocument, null);
      setPageCount(pdfDocument.numPages);
      setStatus("ready");
    }

    open().catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      viewerRef.current = null;
      documentRef.current = null;
      void destroyTask?.();
    };
  }, [url]);

  // Fullscreen fits the page to the new height; leaving restores the zoom the
  // reader had before.
  useEffect(() => {
    function onFullscreenChange() {
      const entered = document.fullscreenElement === frameRef.current;
      setFullscreen(entered);

      const viewer = viewerRef.current;
      if (!viewer) return;

      if (entered) {
        scaleBeforeFullscreen.current = viewer.currentScale;
        viewer.currentScaleValue = "page-fit";
      } else if (scaleBeforeFullscreen.current !== null) {
        viewer.currentScale = scaleBeforeFullscreen.current;
        scaleBeforeFullscreen.current = null;
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function zoom(direction: 1 | -1) {
    const viewer = viewerRef.current;
    const next = viewer ? nextZoomStep(viewer.currentScale, direction) : null;
    if (viewer && next !== null) viewer.currentScale = next;
  }

  function goToTypedPage() {
    const target = parsePageInput(pageField, pageCount);

    if (target === null || !viewerRef.current) {
      setPageField(String(page));
      return;
    }

    viewerRef.current.currentPageNumber = target;
    setPageField(String(target));
  }

  function onPageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToTypedPage();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen();
  }

  // The `download` attribute is ignored on a cross-origin URL (the PDF lives on
  // Contentful's CDN), so once pdf.js holds the bytes they are saved from
  // memory. Until then the link itself opens the file in a new tab.
  function download(event: MouseEvent<HTMLAnchorElement>) {
    const pdfDocument = documentRef.current;
    if (!pdfDocument) return;

    event.preventDefault();
    void pdfDocument.getData().then((data) => {
      const href = URL.createObjectURL(new Blob([data as BlobPart], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      // The click has handed the Blob to the download; revoke it after.
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    });
  }

  const ready = status === "ready";
  const zoomInStep = scale === null ? null : nextZoomStep(scale, 1);
  const zoomOutStep = scale === null ? null : nextZoomStep(scale, -1);

  return (
    <div ref={frameRef} className={leitor.frame}>
      <div className={leitor.toolbar}>
        <p className={`${leitor.title} text-p-ui`} title={title}>
          {title}
        </p>

        <div className={styles.controls}>
          <form className={styles.pages} onSubmit={onPageSubmit}>
            <input
              className={`${styles.field} ${styles.pageField}`}
              aria-label="Página"
              inputMode="numeric"
              autoComplete="off"
              value={pageField}
              onChange={(event) => setPageField(event.target.value)}
              onBlur={goToTypedPage}
              disabled={!ready}
            />
            <span className={styles.total}>
              <span aria-hidden="true">/</span>
              <span className="sr-only">de</span> {ready ? pageCount : "--"}
            </span>
          </form>

          {/* Zoom in first, then the level, then zoom out: the Figma's order. */}
          <div className={styles.zoom}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => zoom(1)}
              disabled={!ready || zoomInStep === null}
              aria-label="Aumentar zoom"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
              <img src="/icons/conteudo/zoom-in.svg" alt="" width={24} height={24} />
            </button>
            <output className={`${styles.field} ${styles.zoomField}`} aria-label="Zoom">
              {scale === null ? "--" : formatZoom(scale)}
            </output>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => zoom(-1)}
              disabled={!ready || zoomOutStep === null}
              aria-label="Diminuir zoom"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
              <img src="/icons/conteudo/zoom-out.svg" alt="" width={24} height={24} />
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          {canFullscreen && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
              <img src="/icons/conteudo/fullscreen.svg" alt="" width={24} height={24} />
            </button>
          )}
          <a href={url} target="_blank" rel="noreferrer" className={`${styles.download} text-body`} onClick={download}>
            {/* eslint-disable-next-line @next/next/no-img-element -- exported Figma icon */}
            <img src="/icons/conteudo/download.svg" alt="" width={16} height={16} />
            Baixar PDF
          </a>
        </div>
      </div>

      <div className={leitor.area}>
        {/* A labelled, focusable region, so keyboard users can scroll it. */}
        <div ref={containerRef} className={styles.container} role="region" tabIndex={0} aria-label="Documento PDF">
          <div ref={viewerElementRef} className="pdfViewer" />
        </div>

        {status === "loading" && (
          <p className={leitor.status} role="status">
            Carregando documento…
          </p>
        )}

        {status === "error" && (
          <div className={`${leitor.status} ${styles.error}`} role="alert">
            {/* eslint-disable-next-line @next/next/no-img-element -- static asset or Contentful URL, as in PublicationCard */}
            <img src={cover} alt="" className={styles.errorCover} />
            <p className={styles.errorText}>Não foi possível exibir o PDF.</p>
            <a href={url} target="_blank" rel="noreferrer" className={styles.errorLink}>
              Abrir o arquivo em outra aba
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
