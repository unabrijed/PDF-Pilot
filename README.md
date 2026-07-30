<img src="public/logo.svg" alt="PDFPilot" width="300">

**PDFPilot** — a fully client-side PDF tools suite. Every tool runs in the browser, files never leave your device (no backend, no uploads). Its signature move: PDFPilot *flies your files* from one tool to the next ("Continue in →").

**Tools (16):** Unlock, Protect, Compress, Repair (qpdf-wasm) · Merge, Split, Rotate, Organize, Crop, JPG→PDF, Watermark (text or logo), Page numbers, Sign, PDF Editor (pdf-lib) · PDF→JPG (pdf.js) · OCR (tesseract.js, English). Files carry across tools via a shared workspace ("Continue in →"); bulk results download as a `.zip`. Installable as a PWA — fully offline (the self-hosted OCR engine caches on first OCR use). Light/dark theme.

```bash
npm install     # also wires the git pre-push hook (prepare script)
npm run dev      # http://localhost:5173
npm run verify   # checks + build — same thing the pre-push hook runs
npm run build    # production build (static, deployable anywhere)
```

Adding a tool: add an entry in `src/tools/registry.ts` (`status: "ready"`), a component in `src/tools/<slug>/` that reads the workspace and renders `<ResultsActions>`, and a lazy `<Route>` in `src/App.tsx`.

Working on the codebase: [CLAUDE.md](CLAUDE.md) has the invariants and hazards, and [docs/](docs/) covers the [architecture](docs/architecture.md), the [tool contract](docs/tools.md) and the [build and checks](docs/build.md).

## Pre-push
`.githooks/pre-push` runs `npm run verify` and blocks the push on failure. It's wired via `git config core.hooksPath .githooks`, re-applied on every `npm install` by the `prepare` script.
