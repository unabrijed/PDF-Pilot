// Runnable self-check for the qpdf unlock path. No framework.
// Encrypt a sample PDF, prove wrong-password fails, decrypt it, prove it's unlocked.
//   node scripts/check.mjs   (or: npm run check)
import mod from "@neslinesli93/qpdf-wasm";
import { strict as assert } from "node:assert";
import path from "node:path";

const createModule = typeof mod === "function" ? mod : mod.default;
const WASM = path.join(process.cwd(), "node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm");

function minimalPdf() {
  const stream = "BT /F1 18 Tf 20 60 Td (Hello PDF) Tj ET";
  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = pdf.length;
  const n = objs.length + 1;
  pdf += `xref\n0 ${n}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { pdf += String(o).padStart(10, "0") + " 00000 n \n"; });
  pdf += `trailer\n<</Size ${n}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

async function qpdfRun(inputs, args, outName) {
  const qpdf = await createModule({ locateFile: () => WASM });
  for (const [name, data] of Object.entries(inputs)) qpdf.FS.writeFile("/" + name, data);
  const rc = qpdf.callMain(args);
  let out;
  if (outName) { try { out = qpdf.FS.readFile("/" + outName); } catch { /* not written */ } }
  return { rc, out };
}

const ok = (rc) => rc === 0 || rc === 3; // 0 = clean, 3 = warnings but output written

const sample = minimalPdf();

const enc = await qpdfRun({ "in.pdf": sample }, ["--encrypt", "secret", "secret", "256", "--", "/in.pdf", "/enc.pdf"], "enc.pdf");
assert.ok(ok(enc.rc) && enc.out?.length, `encrypt failed rc=${enc.rc}`);

const isEnc = await qpdfRun({ "enc.pdf": enc.out }, ["--is-encrypted", "--password=secret", "/enc.pdf"]);
assert.equal(isEnc.rc, 0, "sample should be encrypted");

const wrong = await qpdfRun({ "enc.pdf": enc.out }, ["--decrypt", "--password=nope", "/enc.pdf", "/out.pdf"], "out.pdf");
assert.ok(!ok(wrong.rc) && !wrong.out, `wrong password should fail, got rc=${wrong.rc}`);

const dec = await qpdfRun({ "enc.pdf": enc.out }, ["--decrypt", "--password=secret", "/enc.pdf", "/out.pdf"], "out.pdf");
assert.ok(ok(dec.rc) && dec.out?.length, `decrypt failed rc=${dec.rc}`);

const notEnc = await qpdfRun({ "out.pdf": dec.out }, ["--is-encrypted", "/out.pdf"]);
assert.equal(notEnc.rc, 2, "unlocked output should NOT be encrypted");

console.log("✓ qpdf round-trip OK: encrypt → wrong-pw rejected → decrypt → unlocked.");

// leading-dash password: encrypt (positional) → decrypt (--password=) must round-trip
const dEnc = await qpdfRun({ "in.pdf": sample }, ["--encrypt", "--user-password=-secret", "--owner-password=-secret", "--bits=256", "--", "/in.pdf", "/d.pdf"], "d.pdf");
assert.ok(ok(dEnc.rc) && dEnc.out?.length, `dash-pw encrypt rc=${dEnc.rc}`);
const dDec = await qpdfRun({ "d.pdf": dEnc.out }, ["--decrypt", "--password=-secret", "/d.pdf", "/o.pdf"], "o.pdf");
assert.ok(ok(dDec.rc) && dDec.out?.length, `dash-pw decrypt rc=${dDec.rc}`);
console.log("✓ leading-dash password round-trips.");

// ---- pdf-lib tools (exercise the real src/lib/pdf.ts) ----
const { PDFDocument } = await import("pdf-lib");
const { stem } = await import("../src/lib/names.ts");
assert.equal(stem("report.final.pdf"), "report.final", "stem strips last extension");
assert.equal(stem("noext"), "noext", "stem leaves extensionless names");
const { mergePdfs, rotatePdf, extractPages, explodePdf, parseRanges, imagesToPdf, watermarkPdf, addPageNumbers, stampSignature, rebuildPdf, overlayTextLayer, cropPdf } = await import("../src/lib/pdf.ts");
const pages = async (n) => { const d = await PDFDocument.create(); for (let i = 0; i < n; i++) d.addPage(); return d.save(); };

assert.equal((await PDFDocument.load(await mergePdfs([await pages(1), await pages(1)]))).getPageCount(), 2, "merge → 2 pages");
assert.equal((await PDFDocument.load(await rotatePdf(await pages(1), 90))).getPage(0).getRotation().angle, 90, "rotate → 90°");

const three = await pages(3);
assert.equal((await PDFDocument.load(await extractPages(three, "1,3"))).getPageCount(), 2, "extract 1,3 → 2 pages");
assert.equal((await explodePdf(three)).length, 3, "explode 3-page → 3 files");
assert.throws(() => parseRanges("4", 3), "parseRanges out-of-range throws");

const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
assert.equal((await PDFDocument.load(await imagesToPdf([{ name: "a.png", bytes: png }]))).getPageCount(), 1, "imagesToPdf → 1 page");
assert.equal((await PDFDocument.load(await watermarkPdf(await pages(1), "DRAFT", 0.3))).getPageCount(), 1, "watermark keeps page count");
assert.equal((await PDFDocument.load(await addPageNumbers(three, { position: "bottom-right", format: "n/N" }))).getPageCount(), 3, "page numbers keep page count");
assert.equal((await PDFDocument.load(await stampSignature(await pages(1), png, { where: "last" }))).getPageCount(), 1, "signature keeps page count");
assert.equal((await PDFDocument.load(await stampSignature(await pages(1), png, { where: "all", pos: { xFrac: 0.5, yFrac: 0.5 } }))).getPageCount(), 1, "positioned signature keeps page count");
// organize: pages sized 100/200/300 so the result proves both order and deletion
const sized = await (async () => { const d = await PDFDocument.create(); for (const w of [100, 200, 300]) d.addPage([w, w]); return d.save(); })();
const rb = await PDFDocument.load(await rebuildPdf(sized, [2, 0]));
assert.equal(rb.getPageCount(), 2, "rebuild [2,0] → 2 pages");
assert.equal(Math.round(rb.getPage(0).getWidth()), 300, "rebuild puts page 3 first");
assert.equal(Math.round(rb.getPage(1).getWidth()), 100, "rebuild puts page 1 second");
await assert.rejects(() => rebuildPdf(sized, []), "rebuild with no pages rejects");

// crop: centre quarter of a 100×200 page → CropBox (25, 50, 50, 100); top-down y flips
const single = await (async () => { const d = await PDFDocument.create(); d.addPage([100, 200]); return d.save(); })();
const cropped = await PDFDocument.load(await cropPdf(single, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }));
assert.deepEqual(cropped.getPage(0).getCropBox(), { x: 25, y: 50, width: 50, height: 100 }, "crop box placed exactly");
await assert.rejects(() => cropPdf(single, { x: 0, y: 0, w: 0, h: 0 }), "empty crop rect rejects");
console.log("✓ pdf-lib tools OK: merge / rotate / split / images / watermark / page-numbers / sign / organize / crop.");

// ocr overlay: invisible words must come back out via pdf.js text extraction (real searchability)
const ocrOut = await overlayTextLayer(await pages(1), [
  { words: [{ text: "hello", x0: 100, y0: 100, x1: 300, y1: 140 }, { text: "bridge", x0: 320, y0: 100, x1: 500, y1: 140 }], scale: 2 },
]);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const task = pdfjs.getDocument({ data: ocrOut.slice() });
const ocrDoc = await task.promise;
const tc = await (await ocrDoc.getPage(1)).getTextContent();
const extracted = tc.items.map((it) => it.str).join(" ");
await task.destroy();
assert.ok(extracted.includes("hello") && extracted.includes("bridge"), `text layer not extractable, got "${extracted}"`);
console.log("✓ OCR overlay round-trips: invisible words are extractable text.");

// repair, engine 1 (qpdf rewrite): junk before %PDF shifts every xref offset — qpdf re-anchors
const shifted = new Uint8Array(Buffer.concat([Buffer.from("GARBAGE-HEADER\n"), sample]));
const rep = await qpdfRun({ "in.pdf": shifted }, ["/in.pdf", "/out.pdf"], "out.pdf");
assert.ok(ok(rep.rc) && rep.out?.length, `qpdf repair failed rc=${rep.rc}`);
assert.equal((await PDFDocument.load(rep.out)).getPageCount(), 1, "qpdf-repaired PDF loads");

// repair, engine 2 (pdf-lib salvage): tail truncated before the xref — qpdf-wasm can't
// (no xref reconstruction in this build), pdf-lib's sequential parse can
const { salvagePdf } = await import("../src/lib/pdf.ts");
const truncated = sample.slice(0, Buffer.from(sample).indexOf("xref"));
const failed = await qpdfRun({ "in.pdf": truncated }, ["/in.pdf", "/out.pdf"], "out.pdf");
assert.ok(!ok(failed.rc), `qpdf should fail on a truncated tail, got rc=${failed.rc}`);
assert.equal((await PDFDocument.load(await salvagePdf(truncated))).getPageCount(), 1, "salvage recovers a truncated tail");
console.log("✓ repair OK: qpdf fixes shifted offsets, pdf-lib salvages a truncated tail.");

// compress (qpdf flags) → valid output
const comp = await qpdfRun({ "in.pdf": sample }, ["--object-streams=generate", "--recompress-flate", "--compression-level=9", "--decode-level=generalized", "/in.pdf", "/c.pdf"], "c.pdf");
assert.ok(ok(comp.rc) && comp.out?.length, `compress failed rc=${comp.rc}`);
console.log("✓ qpdf compress OK.");

// ---- zip (fflate) ----
const { zipSync, unzipSync } = await import("fflate");
const payload = new Uint8Array([1, 2, 3, 4, 5]);
const back = unzipSync(zipSync({ "a.bin": payload }))["a.bin"];
assert.deepEqual([...back], [...payload], "fflate zip → unzip round-trips bytes");
console.log("✓ fflate zip round-trip OK.");

console.log("\nAll checks passed.");
// qpdf-wasm leaves process.exitCode set to the last qpdf return code (e.g. 2 from
// --is-encrypted). All assertions passed, so force a clean exit for the pre-push hook.
process.exitCode = 0;
