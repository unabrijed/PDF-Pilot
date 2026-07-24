import { useRef } from "react";
import type { CropRect } from "../lib/pdf";

/** Drag on the preview to draw a selection rectangle, reported as page fractions (top-down). */
export default function RectSelect({ src, rect, onRect }: {
  src: string;
  rect: CropRect | null;
  onRect: (r: CropRect | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const frac = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };
  const down = (e: React.PointerEvent) => {
    boxRef.current!.setPointerCapture(e.pointerId);
    start.current = frac(e);
    onRect(null);
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    const p = frac(e), s = start.current;
    onRect({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const up = () => { start.current = null; };

  return (
    <div
      ref={boxRef}
      className="relative max-w-md cursor-crosshair touch-none overflow-hidden rounded-lg border select-none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      <img src={src} alt="Page preview" draggable={false} className="pointer-events-none block w-full bg-white" />
      {rect && rect.w > 0 && (
        <div
          className="border-primary pointer-events-none absolute border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
        />
      )}
    </div>
  );
}
