"use client";

import dynamic from "next/dynamic";
import LeitorCarregando from "./LeitorCarregando";
import type { PdfViewerProps } from "./PdfViewer";

// pdf.js needs `window`, and is one of the heaviest client dependencies (spec
// §2.1: ~185 KB gzipped plus the worker). It loads in a chunk of its own, only
// on a page that has a PDF, while the skeleton holds the reader's footprint.
// `ssr: false` is only allowed inside a client component, hence this file.
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => <LeitorCarregando />,
});

export default function PdfViewerLoader(props: PdfViewerProps) {
  return <PdfViewer {...props} />;
}
