import { useEffect, useRef, useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import SignaturePad, { type SignaturePadHandle } from "../../components/SignaturePad";
import { stampSignature } from "../../lib/pdf";
import { pdfToThumbs } from "../../lib/render";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";
import { getBytes } from "../../workspace";

type Pos = { xFrac: number; yFrac: number };

/** Page preview with the signature overlaid; click or drag to place it. */
function Placer({ page, sig, pos, onPos }: { page: string; sig: string; pos: Pos; onPos: (p: Pos) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const clamp = (v: number) => Math.min(0.98, Math.max(0.02, v));
  const frac = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { xFrac: clamp((e.clientX - r.left) / r.width), yFrac: clamp((e.clientY - r.top) / r.height) };
  };
  return (
    <div
      ref={ref}
      className="placer"
      onPointerDown={(e) => { dragging.current = true; ref.current!.setPointerCapture(e.pointerId); onPos(frac(e)); }}
      onPointerMove={(e) => { if (dragging.current) onPos(frac(e)); }}
      onPointerUp={() => { dragging.current = false; }}
    >
      <img src={page} className="placer-page" alt="Page preview" draggable={false} />
      <img src={sig} className="placer-sig" alt="" draggable={false} style={{ left: `${pos.xFrac * 100}%`, top: `${pos.yFrac * 100}%` }} />
    </div>
  );
}

export default function Sign() {
  const padRef = useRef<SignaturePadHandle>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [where, setWhere] = useState<"last" | "first" | "all">("last");
  const [pageThumb, setPageThumb] = useState("");
  const [pos, setPos] = useState<Pos>({ xFrac: 0.8, yFrac: 0.92 });

  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const png = padRef.current?.toPng();
      if (!png) throw new Error("Draw your signature first.");
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push({ name: `${stem(files[i].name)}-signed.pdf`, data: await stampSignature(await read(files[i]), png, { where, pos }) });
      }
      return out;
    },
    { guard: () => (sigUrl ? null : "Draw your signature first.") }
  );
  const file = files[0];

  useEffect(() => {
    if (!file) { setPageThumb(""); return; }
    let alive = true;
    setPageThumb("");
    getBytes(file)
      .then((b) => pdfToThumbs(b, 440, [where === "last" ? -1 : 1]))
      .then(([t]) => { if (alive) setPageThumb(t); })
      .catch(() => { if (alive) setPageThumb(""); }); // preview is optional; stamping still works
    return () => { alive = false; };
  }, [file?.id, where]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="tool">
      <h1>✍️ Sign PDF</h1>
      <p className="tool-sub">Draw a signature, then click or drag on the preview to place it.</p>
      <FileStaging accepts="pdf" />
      <SignaturePad ref={padRef} onInk={(has) => setSigUrl(has ? padRef.current?.toDataUrl() ?? null : null)} />
      <label className="field">
        <span>Place on</span>
        <select value={where} onChange={(e) => setWhere(e.target.value as "last" | "first" | "all")}>
          <option value="last">Last page</option>
          <option value="first">First page</option>
          <option value="all">Every page</option>
        </select>
      </label>
      {sigUrl && pageThumb && (
        <>
          <Placer page={pageThumb} sig={sigUrl} pos={pos} onPos={setPos} />
          <p className="hint-line">
            {where === "all" ? "Same spot on every page." : `Previewing the ${where} page.`}
            {files.length > 1 && " Applied to all staged PDFs at the same relative spot."}
          </p>
        </>
      )}
      <button className="primary" disabled={!files.length || !sigUrl || running} onClick={start}>
        {running ? `Signing ${progress}/${files.length}…` : "Sign PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="sign" />}
    </section>
  );
}
