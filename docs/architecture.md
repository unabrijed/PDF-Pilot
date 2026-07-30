# Architecture

## Boot chain

`src/main.tsx` mounts:

```
createRoot → BrowserRouter → WorkspaceProvider → App
```

`src/App.tsx` renders the header, footer, theme toggle and:

```
ErrorBoundary key={pathname} → Suspense fallback="Loading…" → div.page-in → Routes
```

Routes are flat and hand-written: one `<Route path="/<slug>">` per tool, plus `/` for `Home` and `*` for an inline `NotFound`. No nested routes, no route params, no config array. Each tool is `lazy(() => retry(() => import(...)))`, where `retry` re-runs a failed dynamic import once (a stale hashed chunk after a PWA autoUpdate) before falling through to the boundary. Keying the boundary by `pathname` resets a crashed tool on navigation.

`App.tsx` also owns SEO side effects on `pathname`: `document.title`, `meta[name=description]` and `link[rel=canonical]`, built from the Vite-injected `__SITE_URL__` global. Theme is a `dark` class on `<html>` plus `localStorage.theme`, and is passed to `<Toaster theme={…} />`.

## The workspace

`src/workspace.tsx` is the shared staging list, and the reason "Continue in →" works.

```ts
interface WorkFile { id: string; name: string; source: File | Uint8Array }

getBytes(f: WorkFile): Promise<Uint8Array>
toWorkFiles(items: Array<File | { name: string; data: Uint8Array }>): WorkFile[]
useWorkspace(): { files, addFiles, removeFile, setFiles, clear }   // throws outside the provider
```

It holds **only** `files: WorkFile[]`. No per-tool state, no localStorage, no persistence across reloads. IDs come from a module-level counter (`f1`, `f2`, …). A `WorkFile` is either a `File` straight from the picker or a `Uint8Array` produced by a previous tool; `getBytes` normalises both.

The global paste listener is bound here, once, on `window`. It skips `isEditableTarget(e.target)` so password and text fields paste normally, converts clipboard items through `filesFromClipboard`, appends them, and fires the app's only toast.

## The one data flow

Every tool page follows the same path:

1. **Stage.** `FileStaging` (dropzone plus list) writes into the workspace. It marks files that do not match the tool's `accepts` in red and counts them as "N skipped", but never filters the workspace itself.
2. **Filter.** `useToolRun` derives `files` by `matches(accepts, f.name)`. That filtered list is what `RunApi.files` exposes, so button counts and progress reflect only what will actually be processed.
3. **Process.** The tool's `Process` function receives `(files, read, setProgress, fail)` and returns `NamedBytes[]`. A throw becomes `RunApi.error`; a `fail(msg)` call is a soft per-file failure, and the surviving outputs still ship.
4. **Deliver.** `ResultsActions` renders the list with per-file download, a "Download all (.zip)" button whenever `items.length > 1`, and the "Continue in:" row.

"Continue in →" is `ResultsActions.tsx:19-22`: it **replaces** the staging list with the just-produced bytes and navigates. Candidates are `status === "ready" && slug !== currentSlug && t.accepts === <this tool's produces>`, so a PDF→JPG result only ever offers JPG→PDF, and image outputs never offer PDF tools.

Tools never zip and never download. They return `NamedBytes[]` and let `ResultsActions` do both. Non-PDF outputs must set `mime` on their `NamedBytes` (only `pdfToImages` does today); it drives the download blob type and the list icon.

## `src/lib`

Hooks and helpers both live here. There is no `src/hooks/`.

| File | Exports |
| --- | --- |
| `pdf.ts` | Everything pdf-lib, ~346 lines. `embedImage`, `mergePdfs`, `rotatePdf`, `parseRanges(str, pageCount)`, `extractPages`, `explodePdf`, `watermarkPdf(bytes, WatermarkOpts)`, `addPageNumbers`, `stampSignature`, `rebuildPdf(bytes, order)`, `salvagePdf`, `cropPdf(bytes, CropRect)`, `overlayTextLayer`, `imageBoxToRect(b, W, H)`, `hexRgb`, `bakeEditorElements`, `imagesToPdf`. Types: `WatermarkPosition`, `WatermarkOpts`, `NumberPosition`, `NumberFormat`, `CropRect`, `OcrWord`, `BakeElement` |
| `qpdf.ts` | `decryptPdf`, `encryptPdf`, `compressPdf`, `repairPdf`. A private `runQpdf` builds a fresh Emscripten module per call, captures patched `console.log/error` output, and treats return codes 0 and 3 as success. `classify()` turns qpdf log text into user-facing messages |
| `render.ts` | The only pdfjs-dist consumer. Sets `GlobalWorkerOptions.workerSrc` at module scope. `pdfToThumbs(bytes, width = 150, pages?)`, `pageSizes(bytes)`, `pdfToImages(bytes, stem, RenderOpts)`. Always passes `bytes.slice()` to pdf.js |
| `zip.ts` | `NamedBytes { name, data, mime? }`, `zipBlob(items): Blob`. fflate `zipSync` at `{ level: 0 }` (store) with `"name (2).pdf"` dedup |
| `names.ts` | `stem(name)` strips the last extension only, `dataUrlToBytes(url)` |
| `image.ts` | `toPngBytes(bytes)`, a canvas re-encode so any browser-decodable format works where pdf-lib only accepts PNG and JPEG |
| `filetypes.ts` | `FILE_KIND: Record<FileType, { accept, label, icon, match }>`, `matches(type, name)` |
| `clipboard.ts` | `filesFromClipboard(dt, startIndex = 1)`, `isEditableTarget(el)`. Deliberately import-safe under Node so `check-clipboard.mjs` can bundle it |
| `utils.ts` | `cn(...)` = `twMerge(clsx(...))` |
| `useToolRun.ts` | `useToolRun(process, opts?)`, `perFile(suffix, fn, message?)`, `RunApi`. See [tools.md](tools.md) |
| `useThumbs.ts` | `useThumbs(file, width?, pages?) → { thumbs, error, loading }`. `pages` is 1-based, `-1` means last page. Cancels stale renders with an `alive` flag |
| `useReveal.ts` | `useReveal<T>()` adds `is-visible` to `[data-reveal]` children once. Home page only |

## `src/components`

| File | Purpose |
| --- | --- |
| `ToolShell.tsx` | The frame every simple tool page shares. Header, dropzone, options slot, run button with derived label, progress, error alert, results |
| `ToolHeader.tsx` | Category eyebrow, icon tile, title and subtitle pulled from the registry. Throws on an unknown slug |
| `FileStaging.tsx` | Dropzone and staged-file list. `{ accepts?: FileType }`, defaults to `"pdf"` |
| `ResultsActions.tsx` | Results list, per-file download, zip-all, "Continue in →" |
| `OptionSelect.tsx` | The only labelled `<Select>` in the app. Use it for every dropdown |
| `ColorPicker.tsx` | The only colour swatch, a native `input[type=color]` |
| `RectSelect.tsx` | Drag a rectangle over an `<img>`, emits top-down page fractions. Used by Crop and by the editor's image crop |
| `SignatureCreator.tsx` | Draw / Type / Upload tabs producing a PNG. `forwardRef<SignaturePadHandle>` with `toPng()` and `toDataUrl()`. Uploads are normalised to PNG so `embedPng` always works |
| `ErrorBoundary.tsx` | Class boundary catching render throws and failed lazy chunks |
| `Home.tsx` | Landing page: hero plus a tool grid built from registry categories |
| `ui/*` | Stock shadcn "new-york" primitives (Radix + CVA). `alert`, `badge`, `button`, `dropdown-menu`, `input`, `label`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `slider`, `sonner`, `tabs`, `toggle`, `toggle-group`, `tooltip` |

## Engines

| Engine | Wrapper | Tools |
| --- | --- | --- |
| qpdf-wasm | `lib/qpdf.ts` | unlock, protect, compress, repair (first attempt) |
| pdf-lib | `lib/pdf.ts` | merge, split, rotate, organize, crop, jpg-to-pdf, watermark, page-numbers, sign, pdf-editor, ocr (text layer), repair (fallback) |
| pdfjs-dist | `lib/render.ts` only | pdf-to-jpg, ocr (rasterisation), plus previews via `useThumbs` in crop / organize / sign, and directly in pdf-editor |
| tesseract.js | none, imported directly in `src/tools/ocr/Ocr.tsx` | ocr only. Assets are self-hosted under `public/` |
| fflate | `lib/zip.ts` only | every tool indirectly, through "Download all (.zip)" |

Repair is the one tool that chains two engines: `repairPdf` (qpdf), and on throw, `salvagePdf` (pdf-lib lenient parse). `scripts/check.mjs` asserts each engine handles the damage the other cannot, so "improving" one to cover both fails the check.
