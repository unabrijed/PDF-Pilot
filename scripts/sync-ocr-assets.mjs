// Copy the OCR engine + language data from node_modules into public/ so OCR is
// fully self-hosted (no CDN). Runs from the npm `prepare` hook; dirs are gitignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = (pkg) => require.resolve(`${pkg}/package.json`).replace(/package\.json$/, "");
const core = dir("tesseract.js-core");
const eng = dir("@tesseract.js-data/eng");

mkdirSync("public/tesseract", { recursive: true });
mkdirSync("public/tessdata", { recursive: true });

// LSTM-only core variants — the worker picks one at runtime by SIMD support.
for (const variant of ["", "-simd", "-relaxedsimd"]) {
  for (const ext of [".wasm.js", ".wasm"]) {
    const f = `tesseract-core${variant}-lstm${ext}`;
    copyFileSync(core + f, "public/tesseract/" + f);
  }
}
copyFileSync(eng + "4.0.0_best_int/eng.traineddata.gz", "public/tessdata/eng.traineddata.gz");
console.log("✓ OCR assets synced to public/ (tesseract core + eng traineddata).");
