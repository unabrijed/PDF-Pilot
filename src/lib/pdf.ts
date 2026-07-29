import { degrees, PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import { toPngBytes } from "./image.ts"; // explicit .ts so scripts/check.mjs can import this under Node

/**
 * Embed any image. PNG/JPG go straight in; anything else — or a CMYK/progressive
 * JPEG that pdf-lib rejects — is re-encoded to PNG on a canvas first. The fast
 * path matters: round-tripping a big JPEG through PNG would bloat the output.
 */
export async function embedImage(doc: PDFDocument, bytes: Uint8Array) {
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes); // \x89PNG
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes); // FFD8
  } catch { /* fall through to the canvas re-encode */ }
  return doc.embedPng(await toPngBytes(bytes));
}

/** Merge PDFs (in the given order) into one document. */
export async function mergePdfs(list: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of list) {
    const src = await PDFDocument.load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/** Rotate every page by `deg` (added to any existing rotation). */
export async function rotatePdf(bytes: Uint8Array, deg: number): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  for (const page of doc.getPages()) {
    const cur = page.getRotation().angle;
    page.setRotation(degrees(((cur + deg) % 360 + 360) % 360));
  }
  return doc.save();
}

/**
 * Parse a range string like "1-3,5,8-" into 0-based page indices.
 * 1-based and inclusive; throws a friendly error on bad or out-of-range input.
 */
export function parseRanges(str: string, pageCount: number): number[] {
  const out = new Set<number>();
  const parts = str.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error("Enter pages to extract, e.g. 1-3,5");
  for (const part of parts) {
    const m = /^(\d+)?\s*-\s*(\d+)?$|^(\d+)$/.exec(part);
    if (!m) throw new Error(`Couldn't read "${part}". Use pages like 1-3,5.`);
    let a: number, b: number;
    if (m[3] !== undefined) {
      a = b = Number(m[3]);
    } else {
      a = m[1] ? Number(m[1]) : 1;
      b = m[2] ? Number(m[2]) : pageCount;
    }
    if (a < 1 || b > pageCount || a > b)
      throw new Error(`Page ${a}-${b} is out of range (this PDF has ${pageCount} page${pageCount > 1 ? "s" : ""}).`);
    for (let p = a; p <= b; p++) out.add(p - 1);
  }
  return [...out].sort((x, y) => x - y);
}

/** Extract the given pages (range string) into one PDF. */
export async function extractPages(bytes: Uint8Array, ranges: string): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes);
  const idx = parseRanges(ranges, src.getPageCount());
  const out = await PDFDocument.create();
  (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
  return out.save();
}

/** Burst a PDF into one single-page PDF per page. */
export async function explodePdf(bytes: Uint8Array): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(bytes);
  const results: Uint8Array[] = [];
  for (const i of src.getPageIndices()) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    results.push(await out.save());
  }
  return results;
}

/** Draw `text` diagonally (45°) across every page at the given opacity. */
export async function watermarkPdf(bytes: Uint8Array, text: string, opacity = 0.25): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const theta = Math.PI / 4;
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.min(width, height) / 8;
    const tw = font.widthOfTextAtSize(text, size);
    // Centre the text's midpoint on the page centre (anchor is the text's start).
    page.drawText(text, {
      x: width / 2 - (tw / 2) * Math.cos(theta),
      y: height / 2 - (tw / 2) * Math.sin(theta),
      size,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(45),
    });
  }
  return doc.save();
}

export type NumberPosition = "bottom-left" | "bottom-center" | "bottom-right";
export type NumberFormat = "n" | "n/N" | "page";

/** Stamp a page number onto every page. */
export async function addPageNumbers(
  bytes: Uint8Array,
  opts: { position?: NumberPosition; format?: NumberFormat } = {}
): Promise<Uint8Array> {
  const position = opts.position ?? "bottom-center";
  const format = opts.format ?? "n";
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  const size = 10;
  const margin = 24;
  pages.forEach((page, i) => {
    const label = format === "n/N" ? `${i + 1} / ${total}` : format === "page" ? `Page ${i + 1}` : `${i + 1}`;
    const { width } = page.getSize();
    const tw = font.widthOfTextAtSize(label, size);
    const x = position === "bottom-right" ? width - margin - tw : position === "bottom-left" ? margin : width / 2 - tw / 2;
    page.drawText(label, { x, y: margin, size, font, color: rgb(0.2, 0.2, 0.2) });
  });
  return doc.save();
}

/**
 * Stamp a PNG signature on the chosen page(s).
 * `pos` = the signature's centre as fractions of the page (y from the top);
 * omitted → bottom-right with a 36pt margin.
 */
export async function stampSignature(
  pdfBytes: Uint8Array,
  pngBytes: Uint8Array,
  opts: { where?: "first" | "last" | "all"; widthFrac?: number; pos?: { xFrac: number; yFrac: number } } = {}
): Promise<Uint8Array> {
  const where = opts.where ?? "last";
  const widthFrac = opts.widthFrac ?? 0.28;
  const doc = await PDFDocument.load(pdfBytes);
  const png = await doc.embedPng(pngBytes);
  const pages = doc.getPages();
  const targets = where === "all" ? pages : where === "first" ? [pages[0]] : [pages[pages.length - 1]];
  const margin = 36;
  for (const page of targets) {
    const { width, height } = page.getSize();
    const w = width * widthFrac;
    const h = (png.height / png.width) * w;
    const x = opts.pos ? opts.pos.xFrac * width - w / 2 : width - margin - w;
    const y = opts.pos ? (1 - opts.pos.yFrac) * height - h / 2 : margin;
    page.drawImage(png, { x, y, width: w, height: h });
  }
  return doc.save();
}

/** Rebuild a PDF keeping only the pages in `order` (0-based indices), in that order. */
export async function rebuildPdf(bytes: Uint8Array, order: number[]): Promise<Uint8Array> {
  if (!order.length) throw new Error("Keep at least one page.");
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  (await out.copyPages(src, order)).forEach((p) => out.addPage(p));
  return out.save();
}

/**
 * Salvage a damaged PDF by re-parsing it leniently and re-serializing.
 * pdf-lib scans objects sequentially instead of trusting the xref, so this
 * recovers bad startxref offsets, junked trailers, and truncated tails —
 * cases the qpdf-wasm build can't (it ships without xref reconstruction).
 */
export async function salvagePdf(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { throwOnInvalidObject: false, updateMetadata: false });
  if (doc.getPageCount() === 0) throw new Error("No pages could be recovered.");
  return doc.save();
}

export interface CropRect { x: number; y: number; w: number; h: number } // fractions of page size, top-down

/**
 * Set every page's CropBox to `rect` (fractions of the page, y from the top).
 * Non-destructive: viewers clip to the CropBox, the full content stays in the file.
 * ponytail: assumes a 0-origin MediaBox (true for virtually all PDFs).
 */
export async function cropPdf(bytes: Uint8Array, rect: CropRect): Promise<Uint8Array> {
  if (rect.w <= 0 || rect.h <= 0) throw new Error("Draw a crop area first.");
  const doc = await PDFDocument.load(bytes);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.setCropBox(rect.x * width, (1 - rect.y - rect.h) * height, rect.w * width, rect.h * height);
  }
  return doc.save();
}

export interface OcrWord { text: string; x0: number; y0: number; x1: number; y1: number }

/**
 * Overlay invisible (opacity-0) text onto each page, making a scanned PDF
 * searchable. Word boxes are in rendered-image pixels, top-down; `scale` is
 * pixels per PDF point for that render.
 * ponytail: pages with /Rotate get a misplaced layer — handle rotation if
 * rotated scans show up in practice.
 */
export async function overlayTextLayer(
  bytes: Uint8Array,
  pages: { words: OcrWord[]; scale: number }[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((page, i) => {
    const layer = pages[i];
    if (!layer) return;
    const { height } = page.getSize();
    for (const w of layer.words) {
      const text = w.text.replace(/[^\x20-\x7e]/g, "").trim(); // Helvetica encodes WinAnsi only
      if (!text) continue;
      const size = Math.max(4, (w.y1 - w.y0) / layer.scale);
      page.drawText(text, { x: w.x0 / layer.scale, y: height - w.y1 / layer.scale, size, font, opacity: 0 });
    }
  });
  return doc.save();
}

// --- PDF Editor: bake movable/resizable image + text overlays onto pages ---

// ponytail: Helvetica ascent ≈ 0.8·em. The editor's on-screen text uses the same
// factor (line-height 1), so preview and export agree; nudge if text sits high/low.
const BASELINE = 0.8;

/** Top-left fractional box {x,y,w,h} → pdf-lib bottom-left rect in points. Pure, testable. */
export function imageBoxToRect(b: { x: number; y: number; w: number; h: number }, W: number, H: number) {
  return { x: b.x * W, y: (1 - b.y - b.h) * H, width: b.w * W, height: b.h * H };
}

const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export type BakeElement =
  | { kind: "image"; page: number; x: number; y: number; w: number; h: number; bytes: Uint8Array }
  | { kind: "text"; page: number; x: number; y: number; fontFrac: number; text: string; color: string; bold?: boolean };

/**
 * Stamp editor elements onto their pages. Elements carry a 0-based `page` and
 * top-left page fractions, so this maps 1:1 to what the on-screen overlay shows.
 */
export async function bakeEditorElements(pdfBytes: Uint8Array, elements: BakeElement[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  let font: PDFFont | undefined;
  let boldFont: PDFFont | undefined;
  for (const el of elements) {
    const page = pages[el.page];
    if (!page) continue;
    const { width: W, height: H } = page.getSize();
    if (el.kind === "image") {
      page.drawImage(await embedImage(doc, el.bytes), imageBoxToRect(el, W, H));
    } else {
      const face = el.bold
        ? (boldFont ??= await doc.embedFont(StandardFonts.HelveticaBold))
        : (font ??= await doc.embedFont(StandardFonts.Helvetica));
      const size = el.fontFrac * H;
      const text = el.text.replace(/[^\x20-\x7e]/g, ""); // Helvetica encodes WinAnsi only
      if (!text) continue;
      page.drawText(text, { x: el.x * W, y: (1 - el.y) * H - BASELINE * size, size, font: face, color: hexRgb(el.color) });
    }
  }
  return doc.save();
}

/** Combine images into one PDF, one image per page sized to the image. */
export async function imagesToPdf(items: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const { name, bytes } of items) {
    const img = await embedImage(doc, bytes).catch(() => {
      throw new Error(`${name}: could not read that image.`);
    });
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return doc.save();
}
