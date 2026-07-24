import { useRef, useState } from "react";
import OptionSelect from "../../components/OptionSelect";
import SignatureCreator, { type SignaturePadHandle } from "../../components/SignatureCreator";
import ToolShell from "../../components/ToolShell";
import { stampSignature } from "../../lib/pdf";
import { perFile, useToolRun } from "../../lib/useToolRun";
import { useThumbs } from "../../lib/useThumbs";

type Pos = { xFrac: number; yFrac: number };
type Where = "last" | "first" | "all";

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
      className="relative max-w-md cursor-crosshair touch-none overflow-hidden rounded-lg border select-none"
      onPointerDown={(e) => { dragging.current = true; ref.current!.setPointerCapture(e.pointerId); onPos(frac(e)); }}
      onPointerMove={(e) => { if (dragging.current) onPos(frac(e)); }}
      onPointerUp={() => { dragging.current = false; }}
    >
      <img src={page} className="pointer-events-none block w-full bg-white" alt="Page preview" draggable={false} />
      <img
        src={sig}
        alt=""
        draggable={false}
        className="pointer-events-none absolute w-[28%] -translate-x-1/2 -translate-y-1/2 drop-shadow"
        style={{ left: `${pos.xFrac * 100}%`, top: `${pos.yFrac * 100}%` }}
      />
    </div>
  );
}

export default function Sign() {
  const padRef = useRef<SignaturePadHandle>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [where, setWhere] = useState<Where>("last");
  const [pos, setPos] = useState<Pos>({ xFrac: 0.8, yFrac: 0.92 });

  const run = useToolRun(
    perFile("signed", (bytes) => {
      const png = padRef.current?.toPng();
      if (!png) throw new Error("Draw your signature first.");
      return stampSignature(bytes, png, { where, pos });
    }),
    { guard: () => (sigUrl ? null : "Draw your signature first.") }
  );

  const file = run.files[0];
  const { thumbs } = useThumbs(file, 440, [where === "last" ? -1 : 1]);
  const pageThumb = thumbs[0];

  return (
    <ToolShell
      slug="sign"
      sub="Draw, type, or upload a signature, then click on the preview to place it."
      verb="Sign"
      busy="Signing"
      label="Sign PDF"
      run={run}
      disabled={!sigUrl}
    >
      <SignatureCreator ref={padRef} onInk={(has) => setSigUrl(has ? padRef.current?.toDataUrl() ?? null : null)} />

      <OptionSelect
        label="Place on"
        value={where}
        onChange={setWhere}
        options={[
          { value: "last", label: "Last page" },
          { value: "first", label: "First page" },
          { value: "all", label: "Every page" },
        ]}
      />

      {sigUrl && pageThumb && (
        <div className="space-y-2">
          <Placer page={pageThumb} sig={sigUrl} pos={pos} onPos={setPos} />
          <p className="text-muted-foreground text-sm">
            {where === "all" ? "Same spot on every page." : `Previewing the ${where} page.`}
            {run.files.length > 1 && " Applied to all staged PDFs at the same relative spot."}
          </p>
        </div>
      )}
    </ToolShell>
  );
}
