# Bridge

**Bridge** — a fully client-side PDF tools suite. Every tool runs in the browser, files never leave your device (no backend, no uploads). Its signature move: files *cross the bridge* from one tool to the next ("Continue in →").

**Tools (15):** Unlock, Protect, Compress, Repair (qpdf-wasm) · Merge, Split, Rotate, Organize, JPG→PDF, Watermark, Page numbers, Sign (pdf-lib) · PDF→JPG (pdf.js) · OCR (tesseract.js, English). Files carry across tools via a shared workspace ("Continue in →"); bulk results download as a `.zip`. Installable as a PWA — everything works offline except OCR's first-use engine download. Light/dark theme.

```bash
npm install     # also wires the git pre-push hook (prepare script)
npm run dev      # http://localhost:5173
npm run verify   # checks + build — same thing the pre-push hook runs
npm run build    # production build (static, deployable anywhere)
```

Adding a tool: add an entry in `src/tools/registry.ts` (`status: "ready"`), a component in `src/tools/<slug>/` that reads the workspace and renders `<ResultsActions>`, and a lazy `<Route>` in `src/App.tsx`.

## Pre-push
`.githooks/pre-push` runs `npm run verify` and blocks the push on failure. It's wired via `git config core.hooksPath .githooks`, re-applied on every `npm install` by the `prepare` script.
