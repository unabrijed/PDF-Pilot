import type { Dir, El } from "./types";

// Handle position (as % of the box) + resize cursor, keyed by direction.
const HANDLES: { dir: Dir; left: string; top: string; cursor: string }[] = [
  { dir: "nw", left: "0", top: "0", cursor: "nwse-resize" },
  { dir: "n", left: "50%", top: "0", cursor: "ns-resize" },
  { dir: "ne", left: "100%", top: "0", cursor: "nesw-resize" },
  { dir: "e", left: "100%", top: "50%", cursor: "ew-resize" },
  { dir: "se", left: "100%", top: "100%", cursor: "nwse-resize" },
  { dir: "s", left: "50%", top: "100%", cursor: "ns-resize" },
  { dir: "sw", left: "0", top: "100%", cursor: "nesw-resize" },
  { dir: "w", left: "0", top: "50%", cursor: "ew-resize" },
];

/**
 * One overlay element. Pointer-DOWN only wires into the parent (which owns pointer
 * capture + the move/resize math); handles stopPropagation so a resize never also
 * starts a body-move. Text gets a single SE handle (uniform font scale).
 */
export default function ElementBox({
  el, selected, stageH, onBodyDown, onHandleDown,
}: {
  el: El;
  selected: boolean;
  stageH: number; // px height of the stage, to size text
  onBodyDown: (el: El, e: React.PointerEvent) => void;
  onHandleDown: (el: El, dir: Dir, e: React.PointerEvent) => void;
}) {
  const handles = selected ? (el.kind === "image" ? HANDLES : HANDLES.filter((h) => h.dir === "se")) : [];

  const style: React.CSSProperties =
    el.kind === "image"
      ? { left: `${el.x * 100}%`, top: `${el.y * 100}%`, width: `${el.w * 100}%`, height: `${el.h * 100}%` }
      : { left: `${el.x * 100}%`, top: `${el.y * 100}%`, fontSize: `${el.fontFrac * stageH}px`, color: el.color };

  return (
    <div
      className={`el-box ${el.kind}${selected ? " sel" : ""}`}
      style={style}
      onPointerDown={(e) => onBodyDown(el, e)}
    >
      {el.kind === "image" ? <img src={el.src} alt="" draggable={false} /> : <span className="el-text">{el.text || " "}</span>}
      {handles.map((h) => (
        <div
          key={h.dir}
          className="el-handle"
          style={{ left: h.left, top: h.top, cursor: h.cursor }}
          onPointerDown={(e) => onHandleDown(el, h.dir, e)}
        />
      ))}
    </div>
  );
}
