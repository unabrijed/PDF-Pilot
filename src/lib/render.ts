import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { NamedBytes } from "./zip";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface RenderOpts {
  format: "jpg" | "png";
  scale: number;   // 1 = 72dpi; 2 ≈ 144dpi
  quality: number; // 0..1, jpg only
}

/** Render every page of a PDF to an image. `stem` names the outputs (stem-p1.jpg …). */
export async function pdfToImages(bytes: Uint8Array, stem: string, opts: RenderOpts): Promise<NamedBytes[]> {
  const mime = opts.format === "png" ? "image/png" : "image/jpeg";
  const ext = opts.format === "png" ? "png" : "jpg";
  // pdf.js can detach the buffer it's given; hand it a copy so callers keep theirs.
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  const out: NamedBytes[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: opts.scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available in this browser.");
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, opts.quality));
      if (!blob) throw new Error("Failed to encode page image.");
      out.push({ name: `${stem}-p${n}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()), mime });
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return out;
}
