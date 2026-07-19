import createModule from "@neslinesli93/qpdf-wasm";
import wasmUrl from "@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url"; // Vite hashes + bundles the binary

// The shipped types omit writeFile/unlink; the real Emscripten FS has them.
type FS = {
  writeFile(path: string, data: Uint8Array): void;
  readFile(path: string): Uint8Array;
  unlink(path: string): void;
};

/**
 * Run qpdf on `bytes` with `args` (which read /in.pdf and write /out.pdf).
 * Returns the exit code, output (when written), and captured messages.
 *
 * ponytail: fresh module per call — Emscripten exit() can leave a reused runtime
 * aborted; cache the compiled WASM only if per-call compile (~1MB) ever bites.
 */
async function runQpdf(bytes: Uint8Array, args: string[]): Promise<{ rc: number; out?: Uint8Array; log: string }> {
  const qpdf = await createModule({ locateFile: () => wasmUrl });
  const fs = qpdf.FS as unknown as FS;
  fs.writeFile("/in.pdf", bytes);

  // This build hard-binds qpdf output to console.log/error, so capture it there.
  // The patch → callMain → restore section is fully synchronous (no await), so it's
  // atomic even if two calls interleave — console is always restored via finally.
  const log: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a: unknown[]) => log.push(a.join(" "));
  console.error = (...a: unknown[]) => log.push(a.join(" "));
  let rc: number;
  try {
    rc = qpdf.callMain(args); // 0 = ok, 3 = warnings-but-written, else fail
  } finally {
    console.log = origLog;
    console.error = origErr;
  }

  const out = rc === 0 || rc === 3 ? fs.readFile("/out.pdf") : undefined;
  return { rc, out, log: log.join("\n") };
}

/**
 * Decrypt / unlock a PDF entirely in the browser via qpdf-wasm.
 * - empty password: strips owner/permission restrictions on owner-only PDFs
 * - correct password: decrypts a user-password PDF
 */
export async function decryptPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const args = ["--decrypt"];
  if (password) args.push(`--password=${password}`); // one token: safe even if password starts with "-"
  args.push("/in.pdf", "/out.pdf");
  const { rc, out, log } = await runQpdf(bytes, args);
  if (out) return out;
  throw new Error(classify(log, rc));
}

/** Add a password + AES-256 encryption to a PDF (both user & owner password = `password`). */
export async function encryptPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  // Modern --encrypt syntax (qpdf 11.7+): single-token --user-password= / --owner-password=,
  // so a password starting with "-" is handled literally (the positional form mis-parses it).
  const args = ["--encrypt", `--user-password=${password}`, `--owner-password=${password}`, "--bits=256", "--", "/in.pdf", "/out.pdf"];
  const { rc, out, log } = await runQpdf(bytes, args);
  if (out) return out;
  throw new Error(`Couldn't protect this PDF (qpdf exit ${rc}).${log ? ` Details: ${log.trim()}` : ""}`);
}

/** Light, lossless recompression (object streams + recompress flate). Savings vary. */
export async function compressPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const args = ["--object-streams=generate", "--recompress-flate", "--compression-level=9", "--decode-level=generalized", "/in.pdf", "/out.pdf"];
  const { rc, out, log } = await runQpdf(bytes, args);
  if (out) return out;
  throw new Error(`Couldn't compress this PDF (qpdf exit ${rc}).${log ? ` Details: ${log.trim()}` : ""}`);
}

/** Repair a damaged PDF: a plain qpdf rewrite reconstructs the xref table and object structure. */
export async function repairPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const { rc, out, log } = await runQpdf(bytes, ["/in.pdf", "/out.pdf"]);
  if (out) return out;
  throw new Error(`Couldn't repair this PDF (qpdf exit ${rc}).${log ? ` Details: ${log.trim()}` : ""}`);
}

function classify(text: string, rc: number): string {
  const t = text.toLowerCase();
  if (t.includes("invalid password") || t.includes("password"))
    return "Wrong password — or this PDF needs a password to unlock. Check it and try again.";
  if (t.includes("not a pdf") || t.includes("damaged") || t.includes("can't find") || t.includes("unable"))
    return "This file couldn't be read as a PDF. Make sure it's a valid, non-corrupt PDF.";
  return `Couldn't unlock this PDF (qpdf exit ${rc}).${text ? ` Details: ${text.trim()}` : ""}`;
}
