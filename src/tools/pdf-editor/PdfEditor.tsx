import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Bold, ChevronDown, ChevronUp, Crop as CropIcon, Image as ImageIcon, Loader2, PenLine, Plus, Trash2 } from "lucide-react";
import FileStaging from "../../components/FileStaging";
import RectSelect from "../../components/RectSelect";
import ResultsActions from "../../components/ResultsActions";
import SignatureCreator, { type SignaturePadHandle } from "../../components/SignatureCreator";
import ToolHeader from "../../components/ToolHeader";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Toggle } from "../../components/ui/toggle";
import { bakeEditorElements, type BakeElement, type CropRect } from "../../lib/pdf";
import { pageSizes, pdfToThumbs } from "../../lib/render";
import { dataUrlToBytes, stem } from "../../lib/names";
import { cn } from "../../lib/utils";
import { getBytes, useWorkspace } from "../../workspace";
import ElementBox from "./ElementBox";
import type { Dir, El, ImageEl } from "./types";

let uid = 0;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const MIN = 0.02; // smallest box, as a page fraction

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error("Could not read that image."));
    i.src = src;
  });

/** Crop `src` to a fractional rect on an offscreen canvas → new PNG data URL. */
async function cropDataUrl(src: string, r: CropRect): Promise<string> {
  const img = await loadImg(src);
  const sw = r.w * img.naturalWidth, sh = r.h * img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(sw));
  c.height = Math.max(1, Math.round(sh));
  c.getContext("2d")!.drawImage(img, r.x * img.naturalWidth, r.y * img.naturalHeight, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

type Drag = { mode: "move" | "resize"; id: string; page: number; handle?: Dir; sx: number; sy: number; box: El };
type Pending = { kind: "text" } | { kind: "image"; src: string };

export default function PdfEditor() {
  const { files } = useWorkspace();
  const file = files[0];

  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [sizes, setSizes] = useState<{ width: number; height: number }[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [stageHeights, setStageHeights] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0); // 0-based page in view

  const [els, setEls] = useState<El[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [crop, setCrop] = useState<{ id: string; rect: CropRect | null } | null>(null);
  const [sigOpen, setSigOpen] = useState(false);

  const [baked, setBaked] = useState<Uint8Array | null>(null);
  const [previewThumbs, setPreviewThumbs] = useState<string[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const renderedRef = useRef<Set<number>>(new Set());
  const drag = useRef<Drag | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);
  const imgInput = useRef<HTMLInputElement>(null);

  const selected = els.find((e) => e.id === selectedId) ?? null;

  // Load bytes + page sizes when the staged file changes.
  useEffect(() => {
    if (!file) { setBytes(null); setSizes([]); return; }
    let alive = true;
    setEls([]); setSelectedId(null); setCrop(null); setPending(null); setBaked(null); setPreviewThumbs(null);
    setThumbs({}); setStageHeights({}); setCurrent(0); setError(null);
    renderedRef.current = new Set();
    getBytes(file)
      .then(async (b) => { const s = await pageSizes(b); if (alive) { setBytes(b); setSizes(s); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render each page backdrop lazily as it scrolls near view.
  useEffect(() => {
    if (!bytes || !sizes.length || baked) return;
    const root = scrollRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.page);
          if (renderedRef.current.has(i)) continue;
          renderedRef.current.add(i);
          pdfToThumbs(bytes, 900, [i + 1])
            .then(([t]) => setThumbs((m) => ({ ...m, [i]: t })))
            .catch(() => renderedRef.current.delete(i));
        }
      },
      { root, rootMargin: "400px 0px" }
    );
    stageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [bytes, sizes.length, baked]);

  // Keep each stage's pixel height current (drives text font-size).
  useEffect(() => {
    const measure = () => {
      const next: Record<number, number> = {};
      stageRefs.current.forEach((el, i) => { if (el) next[i] = el.getBoundingClientRect().height; });
      setStageHeights(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [thumbs, crop, baked, sizes.length]);

  function onScroll() {
    const root = scrollRef.current;
    if (!root) return;
    const mid = root.scrollTop + root.clientHeight / 2;
    let idx = 0;
    for (let i = 0; i < stageRefs.current.length; i++) {
      const el = stageRefs.current[i];
      if (!el) continue;
      if (el.offsetTop <= mid) idx = i;
      else break;
    }
    setCurrent(idx);
  }

  function scrollToPage(i: number) {
    const el = stageRefs.current[i];
    const root = scrollRef.current;
    if (el && root) root.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  }

  const frac = (e: React.PointerEvent, page: number) => {
    const r = stageRefs.current[page]!.getBoundingClientRect();
    return { fx: clamp((e.clientX - r.left) / r.width, 0, 1), fy: clamp((e.clientY - r.top) / r.height, 0, 1) };
  };

  const onBodyDown = (el: El, e: React.PointerEvent) => {
    setSelectedId(el.id);
    const { fx, fy } = frac(e, el.page);
    drag.current = { mode: "move", id: el.id, page: el.page, sx: fx, sy: fy, box: el };
    stageRefs.current[el.page]?.setPointerCapture(e.pointerId);
  };

  const onHandleDown = (el: El, handle: Dir, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedId(el.id);
    const { fx, fy } = frac(e, el.page);
    drag.current = { mode: "resize", handle, id: el.id, page: el.page, sx: fx, sy: fy, box: el };
    stageRefs.current[el.page]?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { fx, fy } = frac(e, d.page);
    const dx = fx - d.sx, dy = fy - d.sy;
    setEls((es) => es.map((el) => (el.id === d.id ? patch(el, d, dx, dy) : el)));
  };

  const endDrag = () => { drag.current = null; };

  function addEl(el: El) {
    setEls((es) => [...es, el]);
    setSelectedId(el.id);
  }

  function addText(page: number, cx: number, cy: number) {
    const p = sizes[page];
    if (!p) return;
    addEl({ id: `e${++uid}`, kind: "text", page, x: clamp(cx, 0, 0.98), y: clamp(cy, 0.02, 1), fontFrac: 18 / p.height, text: "Text", color: "#111111", bold: false });
  }

  async function addImageFromSrc(page: number, src: string, cx: number, cy: number) {
    const p = sizes[page];
    if (!p) return;
    const img = await loadImg(src);
    const w = 0.3;
    const h = w * (p.width / p.height) * (img.naturalHeight / img.naturalWidth); // keep pixel aspect on the page
    addEl({ id: `e${++uid}`, kind: "image", page, x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h, src });
  }

  function armImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPending({ kind: "image", src: reader.result as string });
    reader.readAsDataURL(f);
  }

  function armSignature() {
    const url = padRef.current?.toDataUrl();
    if (!url) { setError("Make a signature first."); return; }
    setError(null);
    setSigOpen(false);
    setPending({ kind: "image", src: url });
  }

  function onStageClick(page: number, e: React.MouseEvent) {
    if (pending) {
      const r = stageRefs.current[page]!.getBoundingClientRect();
      const cx = clamp((e.clientX - r.left) / r.width, 0, 1);
      const cy = clamp((e.clientY - r.top) / r.height, 0, 1);
      if (pending.kind === "text") addText(page, cx, cy);
      else addImageFromSrc(page, pending.src, cx, cy).catch((err) => setError(err.message));
      setPending(null);
      return;
    }
    if (!(e.target as HTMLElement).closest("[data-el]")) setSelectedId(null);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setEls((es) => es.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }

  async function applyCrop() {
    if (!crop || !crop.rect || crop.rect.w < 0.01 || crop.rect.h < 0.01) { setCrop(null); return; }
    const el = els.find((e) => e.id === crop.id) as ImageEl | undefined;
    const p = el && sizes[el.page];
    if (!el || !p) { setCrop(null); return; }
    try {
      const src = await cropDataUrl(el.src, crop.rect);
      const img = await loadImg(src);
      const h = el.w * (p.width / p.height) * (img.naturalHeight / img.naturalWidth);
      setEls((es) => es.map((e) => (e.id === crop.id ? { ...(e as ImageEl), src, h } : e)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setCrop(null);
  }

  async function bake() {
    if (!bytes || !els.length) return;
    setRunning(true); setError(null);
    try {
      const bakeEls: BakeElement[] = els.map((el) =>
        el.kind === "image"
          ? { kind: "image", page: el.page, x: el.x, y: el.y, w: el.w, h: el.h, bytes: dataUrlToBytes(el.src) }
          : { kind: "text", page: el.page, x: el.x, y: el.y, fontFrac: el.fontFrac, text: el.text, color: el.color, bold: el.bold }
      );
      const out = await bakeEditorElements(bytes, bakeEls);
      const affected = [...new Set(els.map((e) => e.page + 1))].sort((a, b) => a - b);
      const previews = await pdfToThumbs(out, 440, affected);
      setBaked(out); setPreviewThumbs(previews);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const outName = file ? `${stem(file.name)}-edited.pdf` : "edited.pdf";
  const cropEl = crop ? (els.find((e) => e.id === crop.id) as ImageEl | undefined) : undefined;
  const patchSel = (fn: (x: El) => El) => setEls((es) => es.map((x) => (x.id === selectedId ? fn(x) : x)));

  return (
    <section className="mx-auto w-full max-w-4xl">
      <ToolHeader
        slug="pdf-editor"
        sub="Add text, images, and signatures. Click a tool, then click a page to place it. Drag to move, drag a handle to resize."
      />

      <FileStaging accepts="pdf" />

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertTriangle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {baked && previewThumbs ? (
        <>
          <p className="text-muted-foreground mt-6 text-sm">Baked result. Check the placement, then download.</p>
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3.5">
            {previewThumbs.map((t, i) => (
              <figure key={i} className="bg-card m-0 rounded-lg border p-2">
                <img src={t} alt={`Page ${i + 1}`} className="block w-full rounded border bg-white" />
              </figure>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => { setBaked(null); setPreviewThumbs(null); renderedRef.current = new Set(); setThumbs({}); }}
          >
            <ArrowLeft /> Back to editing
          </Button>
          <ResultsActions items={[{ name: outName, data: baked }]} currentSlug="pdf-editor" />
        </>
      ) : file && bytes && sizes.length ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button
              variant={pending?.kind === "text" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setPending({ kind: "text" })}
            >
              <Plus /> Text
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => imgInput.current?.click()}>
              <ImageIcon /> Image
            </Button>
            <input ref={imgInput} type="file" accept="image/png,image/jpeg" hidden onChange={armImage} />
            <Button
              variant={sigOpen ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setSigOpen((o) => !o)}
            >
              <PenLine /> Signature
            </Button>
          </div>

          {sigOpen && (
            <div className="bg-card mt-3 space-y-4 rounded-xl border p-4">
              <SignatureCreator ref={padRef} onInk={() => {}} />
              <Button size="sm" onClick={armSignature}>Use signature</Button>
            </div>
          )}

          {pending && (
            <p className="text-primary mt-3 flex items-center gap-2 text-sm font-medium">
              Click on a page to place the {pending.kind}.
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setPending(null)}>Cancel</Button>
            </p>
          )}

          {crop && cropEl ? (
            <div className="mt-4 space-y-3">
              <p className="text-muted-foreground text-sm">Drag a rectangle to keep just that part of the image.</p>
              <RectSelect src={cropEl.src} rect={crop.rect} onRect={(r) => setCrop({ ...crop, rect: r })} />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={applyCrop}>Apply crop</Button>
                <Button variant="ghost" size="sm" onClick={() => setCrop(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              {sizes.length > 1 && (
                <div className="bg-card text-muted-foreground sticky top-[70px] z-5 mt-3 flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-sm">
                  <span>Page</span>
                  <Input
                    type="number"
                    min={1}
                    max={sizes.length}
                    value={current + 1}
                    className="h-8 w-16 text-center"
                    onChange={(e) => scrollToPage(clamp(Number(e.target.value) - 1, 0, sizes.length - 1))}
                  />
                  <span>/ {sizes.length}</span>
                  <span className="flex-1" />
                  <Button variant="outline" size="icon-sm" className="rounded-full" disabled={current === 0} onClick={() => scrollToPage(current - 1)} aria-label="Previous page">
                    <ChevronUp />
                  </Button>
                  <Button variant="outline" size="icon-sm" className="rounded-full" disabled={current === sizes.length - 1} onClick={() => scrollToPage(current + 1)} aria-label="Next page">
                    <ChevronDown />
                  </Button>
                </div>
              )}

              <div
                ref={scrollRef}
                onScroll={onScroll}
                className={cn(
                  "bg-background relative mt-3 flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-xl border p-1.5",
                  pending && "cursor-crosshair"
                )}
              >
                {sizes.map((s, i) => (
                  <div
                    key={i}
                    data-page={i}
                    ref={(el) => { stageRefs.current[i] = el; }}
                    className="relative mx-auto w-full max-w-3xl touch-none overflow-hidden rounded-lg bg-white shadow select-none"
                    style={{ aspectRatio: `${s.width} / ${s.height}` }}
                    onPointerMove={onMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={(e) => onStageClick(i, e)}
                  >
                    {thumbs[i] ? (
                      <img className="block w-full" src={thumbs[i]} alt={`Page ${i + 1}`} draggable={false} />
                    ) : (
                      <div className="text-muted-foreground grid h-full w-full place-items-center bg-[repeating-linear-gradient(45deg,#f3f2ee,#f3f2ee_12px,#eeece6_12px,#eeece6_24px)] text-xs">
                        Page {i + 1}
                      </div>
                    )}
                    {els.filter((e) => e.page === i).map((el) => (
                      <ElementBox key={el.id} el={el} selected={el.id === selectedId} stageH={stageHeights[i] ?? 0} onBodyDown={onBodyDown} onHandleDown={onHandleDown} />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {selected && !crop && (
            <div className="bg-card mt-4 flex flex-wrap items-center gap-2.5 rounded-lg border p-3">
              {selected.kind === "text" ? (
                <>
                  <Input
                    value={selected.text}
                    placeholder="Text"
                    className="min-w-[150px] flex-1"
                    onChange={(e) => patchSel((x) => ({ ...x, text: e.target.value }))}
                  />
                  <label className="text-muted-foreground inline-flex items-center gap-2 text-xs">
                    Size
                    <Input
                      type="number"
                      min={4}
                      max={200}
                      className="h-9 w-20"
                      value={Math.round(selected.fontFrac * (sizes[selected.page]?.height ?? 1))}
                      onChange={(e) =>
                        patchSel((x) => (x.kind === "text" ? { ...x, fontFrac: (Number(e.target.value) || 1) / (sizes[x.page]?.height ?? 1) } : x))
                      }
                    />
                  </label>
                  <Toggle
                    variant="outline"
                    pressed={!!selected.bold}
                    onPressedChange={() => patchSel((x) => (x.kind === "text" ? { ...x, bold: !x.bold } : x))}
                    aria-label="Bold"
                  >
                    <Bold />
                  </Toggle>
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(e) => patchSel((x) => ({ ...x, color: e.target.value }))}
                    className="size-9 cursor-pointer rounded-md border bg-transparent p-0"
                  />
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setCrop({ id: selected.id, rect: null })}>
                  <CropIcon /> Crop
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={deleteSelected}>
                <Trash2 /> Delete
              </Button>
            </div>
          )}

          <Button size="lg" className="mt-6 w-full" disabled={!els.length || running} onClick={bake}>
            {running && <Loader2 className="animate-spin" />}
            {running ? "Baking…" : "Preview & download"}
          </Button>
        </>
      ) : file ? (
        <p className="text-muted-foreground mt-6 text-sm">Loading PDF…</p>
      ) : null}
    </section>
  );
}

/** Compute an element's next state from the frozen start box + pointer delta (fractions). */
function patch(el: El, d: Drag, dx: number, dy: number): El {
  const box = d.box;
  if (d.mode === "move") {
    if (box.kind === "image") return { ...el, x: clamp(box.x + dx, 0, 1 - box.w), y: clamp(box.y + dy, 0, 1 - box.h) };
    return { ...el, x: clamp(box.x + dx, 0, 0.99), y: clamp(box.y + dy, 0.01, 1) };
  }
  // resize
  if (box.kind === "text" && el.kind === "text") return { ...el, fontFrac: clamp(box.fontFrac + dy, 0.01, 0.4) };
  if (box.kind !== "image" || el.kind !== "image") return el;
  const dir = d.handle!;
  let { x, y, w, h } = box;
  if (dir.includes("e")) w = box.w + dx;
  if (dir.includes("s")) h = box.h + dy;
  if (dir.includes("w")) { x = box.x + dx; w = box.w - dx; }
  if (dir.includes("n")) { y = box.y + dy; h = box.h - dy; }
  if (w < MIN) { if (dir.includes("w")) x = box.x + box.w - MIN; w = MIN; }
  if (h < MIN) { if (dir.includes("n")) y = box.y + box.h - MIN; h = MIN; }
  return { ...el, x, y, w, h };
}
