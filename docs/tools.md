# Tools

`src/tools/registry.ts` is the source of truth. It drives the home grid, the header dropdown, the footer columns, `ToolHeader`, the `accepts` filter, the "Continue in →" candidates, and the generated sitemap.

## The 16 tools

| Slug | Category | Engine | In → Out | What it does |
| --- | --- | --- | --- | --- |
| `unlock` | secure | qpdf | pdf → pdf | Remove a password or owner restrictions |
| `merge` | organize | pdf-lib | pdf → pdf | Combine several PDFs into one |
| `split` | organize | pdf-lib | pdf → pdf | Extract page ranges or burst into single pages |
| `rotate` | organize | pdf-lib | pdf → pdf | Rotate every page 90/180/270 |
| `protect` | secure | qpdf | pdf → pdf | Add a password, AES-256 |
| `jpg-to-pdf` | convert | pdf-lib | **image** → pdf | Combine images into one PDF |
| `pdf-to-jpg` | convert | pdf.js | pdf → **image** | Render each page to an image |
| `compress` | secure | qpdf | pdf → pdf | Lossless shrink via object streams and flate |
| `page-numbers` | edit | pdf-lib | pdf → pdf | Stamp page numbers, 3 positions, 3 formats |
| `watermark` | edit | pdf-lib | pdf → pdf | Stamp text or a logo, tiled or positioned |
| `sign` | edit | pdf-lib | pdf → pdf | Draw, type or upload a signature and stamp it |
| `pdf-editor` | edit | pdf-lib + pdf.js | pdf → pdf | Place text, images and signatures on any page |
| `organize` | organize | pdf-lib | pdf → pdf | Reorder or delete pages |
| `crop` | organize | pdf-lib | pdf → pdf | Trim margins by dragging a rectangle |
| `ocr` | convert | tesseract + pdf-lib | pdf → pdf | Invisible searchable text layer, English |
| `repair` | secure | qpdf → pdf-lib | pdf → pdf | Recover a damaged PDF, two engines |

Every tool is `accepts: "pdf"` / `produces: "pdf"` except the two conversions. Registry order drives the header dropdown; category drives the grid and footer.

## Adding a tool

Three edits, no more:

**1. `src/tools/registry.ts`**

```ts
{ slug: "flatten", title: "Flatten PDF", desc: "Merge annotations into the page.",
  icon: Layers, status: "ready", category: "edit", accepts: "pdf", produces: "pdf" },
```

Keep the `slug: "…"` literal on one line with double quotes. `vite.config.ts` regex-parses this exact shape to build the sitemap.

**2. `src/tools/<slug>/<PascalName>.tsx`** with a default export. Directory is the kebab-case slug (`page-numbers/`, `jpg-to-pdf/`), file is PascalCase matching the export (`PageNumbers.tsx`, `JpgToPdf.tsx`).

**3. `src/App.tsx`**

```tsx
const Flatten = lazy(() => retry(() => import("./tools/flatten/Flatten")));
// ...
<Route path="/flatten" element={<Flatten />} />
```

Put shared PDF work in `src/lib/pdf.ts` rather than the component, and add an assertion for it in `scripts/check.mjs`.

## `useToolRun`

The shared state machine. A tool never keeps its own `running` / `error` / `outputs` state.

```ts
interface RunApi {
  files: WorkFile[];    // compatible files only, post-filter
  running: boolean;
  progress: number;     // 1-based index of the file being processed
  error: string;
  outputs: NamedBytes[];
  start: () => void;
}

useToolRun(process: Process, opts?: {
  accepts?: FileType;          // default "pdf"
  min?: number;                // default 1
  guard?: () => string | null; // extra precondition, return the error text
}): RunApi

type Process = (
  files: WorkFile[],
  read: (f: WorkFile) => Promise<Uint8Array>,
  setProgress: (n: number) => void,
  fail: (msg: string) => void  // soft per-file failure, successes still ship
) => Promise<NamedBytes[]>
```

`start()` no-ops while running, runs `guard` first, then the `min` check, then clears state and awaits `process`. Soft failures collected through `fail` are joined with `\n` into `error`, which `ToolShell` renders `whitespace-pre-line`, so a batch shows one line per bad file.

`perFile` covers the common case:

```ts
perFile(suffix: string,
        fn: (bytes: Uint8Array, file: WorkFile) => Promise<Uint8Array>,
        message?: (name: string, e: unknown) => string): Process
```

It runs `fn` over each file in turn, names outputs `<stem>-<suffix>.pdf`, and converts a throw into a soft failure so one bad PDF never sinks the batch.

Use your own `Process` when the tool aggregates (Merge, JpgToPdf: many in, one out) or fans out (Split, PdfToJpg, Ocr: one in, many out).

## `ToolShell`

```tsx
<ToolShell
  slug="rotate"        // pulls title, icon, category, accepts from the registry
  sub="…"              // optional, defaults to the registry desc
  verb="Rotate"        // → "Rotate PDF" / "Rotate 3 PDFs"
  busy="Rotating"      // → "Rotating 2/3…"
  label="…"            // optional full override when the verb pattern does not fit
  run={run}
  disabled={!ready}    // extra precondition on top of "has files" and "not running"
  wide                 // max-w-4xl instead of max-w-2xl
>
  {/* options and previews go here, between the dropzone and the button */}
</ToolShell>
```

It renders `ToolHeader` → `FileStaging` → children → run button → `<Progress>` (only when more than one file) → destructive `<Alert>` for `run.error` → `<ResultsActions>` once there are outputs. Never mount `FileStaging` or `ResultsActions` yourself when using `ToolShell`.

## The canonical tool

`src/tools/rotate/Rotate.tsx`, 25 lines, is the whole pattern:

```tsx
export default function Rotate() {
  const [deg, setDeg] = useState("90");
  const run = useToolRun(perFile("rotated", (bytes) => rotatePdf(bytes, Number(deg))));

  return (
    <ToolShell slug="rotate" sub="Rotate all pages. Applies to every file you add."
               verb="Rotate" busy="Rotating" run={run}>
      <OptionSelect label="Rotation" value={deg} onChange={setDeg} options={[
        { value: "90", label: "90° clockwise" },
        { value: "180", label: "180°" },
        { value: "270", label: "270° (90° counter-clockwise)" },
      ]} />
    </ToolShell>
  );
}
```

`src/tools/watermark/Watermark.tsx` is the full-featured version: local `useState` per option, a `const ready = …` precondition, `guard: () => ready ? null : "message"`, and `disabled={!ready}` on the shell. Set **both**: `disabled` greys out the button, `guard` supplies the error text if `start()` is reached another way (the Enter key).

## Conventions

- Text `<Input>` options wire `onKeyDown={(e) => { if (e.key === "Enter") run.start(); }}` (Unlock, Protect, Split, Watermark).
- File-picker inputs set `e.target.value = ""` right after reading, so re-picking the same file fires again.
- Error text is what the user reads. Write `Error.message` user-facing: "Wrong password, or this PDF needs a password to open.", "Draw a crop area first."
- Previews come from `useThumbs`, not a hand-rolled pdf.js call. Crop uses `(440, [1])`, Sign `(440, [-1])`, Organize renders all pages.
- Do not add a toast. Errors belong in `RunApi.error`; `useThumbs().error` gets its own `<Alert>` in the tool.

`pdf-editor` is the one deliberate exception. It bypasses `ToolShell` and `useToolRun` and composes `ToolHeader` + `FileStaging` + `ResultsActions` itself with its own `running` / `error` / `baked` state, because it is a canvas surface rather than a one-shot form. Its coordinate contract (fractional top-left boxes → `imageBoxToRect` → bottom-left points) is asserted with exact numbers in `scripts/check.mjs`.
