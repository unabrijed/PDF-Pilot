import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

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

/** Stamp a PNG signature at the bottom-right of the chosen page(s). */
export async function stampSignature(
  pdfBytes: Uint8Array,
  pngBytes: Uint8Array,
  opts: { where?: "first" | "last" | "all"; widthFrac?: number } = {}
): Promise<Uint8Array> {
  const where = opts.where ?? "last";
  const widthFrac = opts.widthFrac ?? 0.28;
  const doc = await PDFDocument.load(pdfBytes);
  const png = await doc.embedPng(pngBytes);
  const pages = doc.getPages();
  const targets = where === "all" ? pages : where === "first" ? [pages[0]] : [pages[pages.length - 1]];
  const margin = 36;
  for (const page of targets) {
    const { width } = page.getSize();
    const w = width * widthFrac;
    const h = (png.height / png.width) * w;
    page.drawImage(png, { x: width - margin - w, y: margin, width: w, height: h });
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

/**
 * Combine images (JPG/PNG) into one PDF, one image per page sized to the image.
 * Note: pdf-lib's embedJpg can't handle CMYK or progressive JPEGs — those throw
 * (caught upstream and shown as a friendly error).
 */
export async function imagesToPdf(items: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const { name, bytes } of items) {
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50; // \x89PNG
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8; // FFD8
    if (!isPng && !isJpg) throw new Error(`${name}: only JPG and PNG images are supported.`);
    const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return doc.save();
}
