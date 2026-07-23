import { useEffect, useRef, useState } from "react";
import FileStaging from "../../components/FileStaging";
import RectSelect from "../../components/RectSelect";
import ResultsActions from "../../components/ResultsActions";
import SignatureCreator, { type SignaturePadHandle } from "../../components/SignatureCreator";
import { bakeEditorElements, type BakeElement, type CropRect } from "../../lib/pdf";
import { pageSizes, pdfToThumbs } from "../../lib/render";
import { stem } from "../../lib/names";
import { getBytes, useWorkspace } from "../../workspace";
import ElementBox from "./ElementBox";
import type { Dir, El, ImageEl } from "./types";

let uid = 0;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const MIN = 0.02; // smallest box, as a page fraction

function dataUrlToBytes(url: string): Uint8Array {
  const bin = atob(url.split(",")[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

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
    if (!(e.target as HTMLElement).closest(".el-box")) setSelectedId(null);
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

  return (
    <section className="tool tool-wide">
      <h1>🖊️ PDF Editor</h1>
      <p className="tool-sub">Add text, images, and signatures. Click a tool, then click a page to place it. Drag to move, drag a handle to resize.</p>
      <FileStaging accepts="pdf" />

      {error && <p className="msg error">⚠️ {error}</p>}

      {baked && previewThumbs ? (
        <>
          <p className="hint-line">Baked result. Check the placement, then download.</p>
          <div className="thumb-grid">
            {previewThumbs.map((t, i) => (
              <figure key={i} className="thumb"><img src={t} alt={`Page ${i + 1}`} /></figure>
            ))}
          </div>
          <button className="link" onClick={() => { setBaked(null); setPreviewThumbs(null); renderedRef.current = new Set(); setThumbs({}); }}>← Back to editing</button>
          <ResultsActions items={[{ name: outName, data: baked }]} currentSlug="pdf-editor" />
        </>
      ) : file && bytes && sizes.length ? (
        <>
          <div className="editor-toolbar">
            <button className={`chip${pending?.kind === "text" ? " on" : ""}`} onClick={() => setPending({ kind: "text" })}>➕ Text</button>
            <button className="chip" onClick={() => imgInput.current?.click()}>🖼️ Image</button>
            <input ref={imgInput} type="file" accept="image/png,image/jpeg" hidden onChange={armImage} />
            <details className="sig-disclosure">
              <summary>✍️ Signature</summary>
              <div className="sig-panel">
                <SignatureCreator ref={padRef} onInk={() => {}} />
                <button className="primary sm" onClick={armSignature}>Use signature</button>
              </div>
            </details>
          </div>

          {pending && <p className="hint-line accent">Click on a page to place the {pending.kind}. <button className="link" onClick={() => setPending(null)}>Cancel</button></p>}

          {crop && cropEl ? (
            <>
              <p className="hint-line">Drag a rectangle to keep just that part of the image.</p>
              <RectSelect src={cropEl.src} rect={crop.rect} onRect={(r) => setCrop({ ...crop, rect: r })} />
              <div className="editor-toolbar">
                <button className="primary sm" onClick={applyCrop}>Apply crop</button>
                <button className="link" onClick={() => setCrop(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              {sizes.length > 1 && (
                <div className="editor-topbar">
                  <span>Page</span>
                  <input
                    type="number"
                    min={1}
                    max={sizes.length}
                    value={current + 1}
                    onChange={(e) => scrollToPage(clamp(Number(e.target.value) - 1, 0, sizes.length - 1))}
                  />
                  <span>/ {sizes.length}</span>
                  <span className="spacer" />
                  <button className="pagebtn" disabled={current === 0} onClick={() => scrollToPage(current - 1)} aria-label="Previous page">↑</button>
                  <button className="pagebtn" disabled={current === sizes.length - 1} onClick={() => scrollToPage(current + 1)} aria-label="Next page">↓</button>
                </div>
              )}

              <div className={`editor-scroll${pending ? " placing" : ""}`} ref={scrollRef} onScroll={onScroll}>
                {sizes.map((s, i) => (
                  <div
                    key={i}
                    data-page={i}
                    ref={(el) => (stageRefs.current[i] = el)}
                    className="editor-page"
                    style={{ aspectRatio: `${s.width} / ${s.height}` }}
                    onPointerMove={onMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={(e) => onStageClick(i, e)}
                  >
                    {thumbs[i]
                      ? <img className="editor-page-img" src={thumbs[i]} alt={`Page ${i + 1}`} draggable={false} />
                      : <div className="editor-page-ph">Page {i + 1}</div>}
                    {els.filter((e) => e.page === i).map((el) => (
                      <ElementBox key={el.id} el={el} selected={el.id === selectedId} stageH={stageHeights[i] ?? 0} onBodyDown={onBodyDown} onHandleDown={onHandleDown} />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {selected && !crop && (
            <div className="editor-props">
              {selected.kind === "text" ? (
                <>
                  <input value={selected.text} onChange={(e) => setEls((es) => es.map((x) => (x.id === selected.id ? { ...x, text: e.target.value } : x)))} placeholder="Text" />
                  <label>Size
                    <input type="number" min={4} max={200} value={Math.round(selected.fontFrac * (sizes[selected.page]?.height ?? 1))}
                      onChange={(e) => setEls((es) => es.map((x) => (x.id === selected.id && x.kind === "text" ? { ...x, fontFrac: (Number(e.target.value) || 1) / (sizes[x.page]?.height ?? 1) } : x)))} />
                  </label>
                  <button className={`sig-b${selected.bold ? " on" : ""}`} aria-pressed={!!selected.bold} title="Bold"
                    onClick={() => setEls((es) => es.map((x) => (x.id === selected.id && x.kind === "text" ? { ...x, bold: !x.bold } : x)))}><b>B</b></button>
                  <input type="color" value={selected.color} onChange={(e) => setEls((es) => es.map((x) => (x.id === selected.id ? { ...x, color: e.target.value } : x)))} />
                </>
              ) : (
                <button className="link" onClick={() => setCrop({ id: selected.id, rect: null })}>✂️ Crop</button>
              )}
              <button className="link danger" onClick={deleteSelected}>🗑️ Delete</button>
            </div>
          )}

          <button className="primary" disabled={!els.length || running} onClick={bake}>
            {running ? "Baking…" : "Preview & download"}
          </button>
        </>
      ) : file ? (
        <p className="hint-line">Loading PDF…</p>
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
