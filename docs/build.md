# Build, checks and deploy

## `vite.config.ts`

Plugins in order: `react()` → custom `seo` → `tailwindcss()` (the v4 Vite plugin) → `VitePWA()`.

**`siteUrl`** is `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` when set, else `http://localhost:5173`. It reaches the app two ways: the `__SITE_URL__` define (used by `App.tsx` for canonical URLs) and HTML placeholder substitution.

**The `seo` plugin** does two jobs:

- `transformIndexHtml` (`order: "pre"`) replaces every literal `__SITE_URL__` in `index.html`. Hardcoding a domain there breaks local dev and Vercel previews.
- `generateBundle` emits `sitemap.xml` and `robots.txt` into `dist/`. Neither exists in the source tree; to change them, edit `vite.config.ts`.

Slugs come from a regex over the registry **source text**, not an import:

```js
readFileSync("src/tools/registry.ts", "utf8").matchAll(/slug: "([^"]+)"/g)
```

Switching to `slug: 'x'`, `"slug": "x"`, or wrapping the property across lines empties the sitemap silently. There is a `ponytail:` comment on the line naming this ceiling.

**PWA config**: `registerType: "autoUpdate"`. Precache globs are `**/*.{js,mjs,css,html,svg,wasm,woff2}` (`woff2` for offline brand fonts, `mjs` for the pdf.js worker). `globIgnores: ["tesseract/**", "tessdata/**"]` keeps the ~20MB OCR engine out of precache; it is runtime-cached instead by a single `CacheFirst` rule on `/\/(tesseract|tessdata)\//` under `cacheName: "ocr-assets"`. `maximumFileSizeToCacheInBytes` is raised to 5MB so qpdf.wasm (~1.3MB) and the pdf.js chunk (~1.7MB) still precache for offline use.

**`optimizeDeps: { include: ["@neslinesli93/qpdf-wasm"] }`** is required. The Emscripten glue is UMD and exports nothing in a browser, so serving it raw makes `import createModule from …` yield `undefined`. The optimizer's CJS interop supplies a real default export and resolves the dead-branch `require("fs")` to a browser shim. Removing this reproduces commit `4c3b736`, "Fix qpdf tools crashing on load".

**Chunking** is purely route-level `React.lazy()` in `App.tsx`. There is no `build` block and no `manualChunks`.

**One alias**, `@` → `./src`, mirrored in `tsconfig.json` `paths`. Source files still import relatively.

## Checks

`npm run check` = `node scripts/check.mjs && node scripts/check-clipboard.mjs`. `npm run verify` = that plus `tsc --noEmit && vite build`. Both scripts are plain `node:assert/strict` against the real `src/lib/*.ts` modules. **There is no test framework, no runner, no fixtures.** New logic goes into these two files.

### `scripts/check.mjs`

Builds a 5-object PDF by hand, then asserts, in order:

1. **qpdf round-trip.** Encrypt AES-256, `--is-encrypted` returns 0, a wrong password fails **and writes no output file**, the right one decrypts, `--is-encrypted` on the result returns exactly 2.
2. **Leading-dash passwords.** `--user-password=-secret` through to `--password=-secret`, guarding the argv-parsing edge case.
3. **`stem()`** strips only the last extension: `report.final.pdf` → `report.final`.
4. **pdf-lib surface.** Merge page counts, rotate angle, `extractPages("1,3")`, `explodePdf`, `parseRanges("4", 3)` **throws**, `imagesToPdf`, four `watermarkPdf` variants (text, image, tiled, cornered) preserving page count, `watermarkPdf(pdf, {})` **rejects**, `addPageNumbers`, `stampSignature` for `where: "last"` and `"all"`, `rebuildPdf(sized, [2,0])` yielding exactly 2 pages at widths 300 then 100 (proving order **and** deletion), `rebuildPdf(sized, [])` **rejects**, and `cropPdf({x:.25,y:.25,w:.5,h:.5})` on a 100×200 page yielding a CropBox of exactly `{x:25, y:50, width:50, height:100}`, which encodes the top-down to bottom-up y flip.
5. **Editor coordinates.** `imageBoxToRect` must map three fractional boxes to exact point rects. This is the preview-to-export contract; the numbers are exact, not tolerances.
6. **OCR is really searchable.** The `overlayTextLayer` output is re-parsed through `pdfjs-dist/legacy` and `getTextContent()` must contain both invisible words. A real extraction round-trip, not a shape check.
7. **Repair, both engines, in opposite directions.** Junk prepended before `%PDF` must be fixed by qpdf; a tail truncated before `xref` must **fail** under qpdf (this build has no xref reconstruction) and must be recovered by `salvagePdf`. Making one engine handle both fails the check.
8. **Compress flags** produce output.
9. **OCR assets present**, each over 1MB, with a message pointing at `sync-ocr-assets.mjs`.
10. **fflate zip round-trip.**
11. **`process.exitCode = 0` on the last line.** qpdf-wasm leaves `exitCode` set to the last qpdf return code (2 from `--is-encrypted`), which would fail the pre-push hook despite every assertion passing. Do not remove it.

### `scripts/check-clipboard.mjs`

Bundles `src/lib/clipboard.ts` with esbuild in memory (esbuild arrives transitively through Vite) and imports it as a data URL. It enforces: real OS-clipboard files win and keep their names; an unnamed screenshot becomes `pasted-1.png`; `startIndex` threads through to `pasted-7.png`; a named JPEG keeps `sign.jpg` while an unnamed one becomes `pasted-1.jpg` (extension follows MIME, not the placeholder); `text/plain`, `text/html` and non-image files are ignored, so copying a URL stages nothing; `null` / `{}` / empty input all return `[]` without throwing; and `isEditableTarget` is true for inputs and textareas, false for divs, `null`, and objects with no `closest()`, so pasting into a password field is never hijacked.

### `.githooks/pre-push`

Five lines, `set -e`, runs `npm run verify`. Wired by `package.json`'s `prepare` script (`git config core.hooksPath .githooks`), re-applied on every `npm install`, with `|| true` so it still works outside a git repo.

## Assets

**Committed**: `public/favicon.svg`, `logo.svg`, `og.png`, the four PNG icons, and all seven `public/fonts/*.woff2` (Clash Display 500/600/700, General Sans 400/500/600/700). Nothing generates the fonts. Adding a weight to `src/index.css` without committing the `.woff2` breaks offline use, and no check catches it.

**Generated and gitignored**: `public/tesseract/` (6 files, ~20MB) and `public/tessdata/eng.traineddata.gz` (2.9MB), copied out of `node_modules` by `scripts/sync-ocr-assets.mjs` from the npm `prepare` hook. The six core files are the cross product of `""` / `"-simd"` / `"-relaxedsimd"` × `.wasm` / `.wasm.js`; the tesseract worker picks one at runtime by SIMD support. A fresh clone must `npm install` before `check.mjs` will pass.

**Build-emitted**: `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `sw.js`, `registerSW.js`, `workbox-*.js`. All in `dist/`, none in source.

## Styling

Tailwind **v4**, CSS-first, entirely in `src/index.css`. There is no `tailwind.config.js` and no PostCSS config; `components.json` has `tailwind.config: ""` for that reason.

- `@import "tailwindcss"` plus `@import "tw-animate-css"`.
- Dark mode is `@custom-variant dark (&:is(.dark *))`, a class on `<html>` set **before first paint** by the inline script in `index.html` (`localStorage.theme`, else `prefers-color-scheme`), so there is no flash.
- Tokens are raw hex, not oklch, in `:root` and a full `.dark` override. Four non-shadcn tokens exist for the dark contrast band: `--ink`, `--ink-foreground`, `--ink-muted`, `--ink-accent`. `--ink-accent` is deliberately **not** redefined in `.dark`, so the band's accent stays bright blue in both themes.
- `@theme inline` maps every token to a Tailwind `--color-*` utility, plus the font stacks, radius scale, four warm shadows and `--ease-out-quart`.
- `@layer base` sets border and outline defaults, `font-display` on h1-h3, and one global `cursor: pointer` rule for `button:not(:disabled), [role="button"], label[for], summary`, restoring what Tailwind v4's preflight dropped. Done once here, not per call site, and it covers Radix triggers.
- `@utility surface` is the single card treatment. Do not hand-roll card classes.

`brand.md` holds the palette rationale, type scale, motion rules and the voice guide. Read it before writing copy.

## Deploy

`vercel.json` is an SPA rewrite and nothing else. **No headers block**, so the app is not cross-origin isolated: `SharedArrayBuffer` is unavailable and multithreaded wasm will not work without adding COOP/COEP first.

## Hazards

| Change | Consequence |
| --- | --- |
| Reformat `slug:` in `registry.ts` | Sitemap silently empties. No check catches it |
| Remove `optimizeDeps.include` | The four qpdf tools crash on load |
| Remove `process.exitCode = 0` from `check.mjs` | Every `git push` is blocked |
| Leave a stray import or unused param | `noUnusedLocals` / `noUnusedParameters` fail `tsc`, which fails the push |
| Edit geometry in `pdf.ts` | Crop box and `imageBoxToRect` are asserted at exact values |
| Add a font weight without the `.woff2` | Offline breakage, uncaught |
| Commit `public/tesseract` or `public/tessdata` | Both are gitignored and machine-generated |
| Mix package managers | `package-lock.json` and `yarn.lock` both exist while docs and scripts say npm. Pick one deliberately |
