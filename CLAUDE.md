# PDFPilot

A PDF tools suite that runs entirely in the browser. 16 tools, no backend, no uploads: files are read with `FileReader`, processed in wasm or JS, and handed back as blobs. React 18 + Vite 5 + TypeScript + Tailwind v4 + shadcn/ui, deployed as a static site and installable as an offline PWA.

The signature feature is the shared workspace: results from one tool carry straight into the next through a "Continue in →" button, so files never round-trip through disk.

## Non-negotiables

- **Never add an upload or network path for user files.** Privacy is the product. No analytics on file contents either.
- **Adding a tool is exactly 3 edits**: a `registry.ts` entry, a component, a lazy `<Route>` in `App.tsx`. See [docs/tools.md](docs/tools.md).
- **Errors are strings in `RunApi.error`**, rendered by `ToolShell` in a destructive `<Alert>`. Sonner toasts are used exactly once in the whole app, for paste confirmation in `src/workspace.tsx`. Do not add error toasts.
- **Hooks live in `src/lib/`**, not a `src/hooks/` directory. Imports inside `src/` are relative (`../../lib/pdf`) even though an `@` alias exists.
- **Geometry crossing a component boundary is top-left page fractions** (`CropRect`, editor elements, `stampSignature.pos`), converted to PDF points at the pdf-lib edge only.
- **Always hand pdf.js a copy**: `bytes.slice()`. It detaches the underlying buffer.
- **Helvetica is WinAnsi-only.** Strip with `/[^\x20-\x7e]/g` before `drawText` or pdf-lib throws on any non-Latin character.
- **No em dashes in user-facing copy.** Period or comma instead. See `brand.md`.
- **Reuse the single implementations**: one dropdown (`OptionSelect`), one colour swatch (`ColorPicker`), one signature creator (`SignatureCreator`), one card treatment (the `surface` utility). Do not hand-roll a second.
- **Deliberate corner-cuts get a `// ponytail:` comment** naming the ceiling and the upgrade path. Seven exist today; keep the convention.

## Do not touch without reading [docs/build.md](docs/build.md)

Three lines are load-bearing and their failure modes are not obvious:

| Line | Breaks if removed |
| --- | --- |
| `optimizeDeps: { include: ["@neslinesli93/qpdf-wasm"] }` in `vite.config.ts:80` | Unlock, Protect, Compress and Repair crash on load |
| `process.exitCode = 0` at `scripts/check.mjs:179` | Every `git push` is blocked, despite all assertions passing |
| The `slug: "…"` literal style in `src/tools/registry.ts` | `sitemap.xml` silently empties. No check catches it |

## Commands

```bash
npm install      # also installs the pre-push hook and syncs the OCR assets
npm run dev      # http://localhost:5173
npm run check    # the two assert scripts, ~20s
npm run verify   # check + tsc --noEmit + vite build. What pre-push runs
npm run build    # production build, static output in dist/
```

Node >= 23 is required: the check scripts import `.ts` files directly and rely on native type stripping. There is no test framework; new logic goes into `scripts/check.mjs`. `.githooks/pre-push` runs `verify` and blocks the push on failure.

## Where things are

- [docs/architecture.md](docs/architecture.md): boot chain, the workspace, the one data flow, full `src/lib` and `src/components` maps, engine-to-tool mapping.
- [docs/tools.md](docs/tools.md): the 16 tools, the authoring contract, `useToolRun`/`perFile`/`ToolShell`, per-tool conventions.
- [docs/build.md](docs/build.md): Vite and PWA config, what the check scripts enforce, assets, styling, deploy, hazards.
- `brand.md`: palette, type scale, motion, voice. Read before writing copy or UI.

## Commit style

Sentence case, single line, no `feat:`/`fix:` prefixes, no scopes, no trailing period, no em dashes. Phrased as the user-visible outcome, not the mechanism: "Give every control a cursor again", "Paste files or a screenshot anywhere on the site".
