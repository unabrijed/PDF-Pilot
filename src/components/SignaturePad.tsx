import { forwardRef, useImperativeHandle, useRef } from "react";

export interface SignaturePadHandle {
  toPng: () => Uint8Array | null; // null if nothing drawn
  toDataUrl: () => string | null;
}

/** A small canvas you draw a signature on (mouse/touch). Transparent background. */
const SignaturePad = forwardRef<SignaturePadHandle, { onInk: (has: boolean) => void }>(
  function SignaturePad({ onInk }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const dirty = useRef(false);

    useImperativeHandle(ref, () => ({
      toPng: () => {
        const c = canvasRef.current;
        if (!c || !dirty.current) return null;
        const b64 = c.toDataURL("image/png").split(",")[1];
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
      },
      toDataUrl: () => {
        const c = canvasRef.current;
        return c && dirty.current ? c.toDataURL("image/png") : null;
      },
    }));

    function pos(e: React.PointerEvent<HTMLCanvasElement>) {
      const c = canvasRef.current!;
      const r = c.getBoundingClientRect();
      // canvas is CSS-stretched to 100%; scale pointer coords to the drawing buffer.
      return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    }

    function down(e: React.PointerEvent<HTMLCanvasElement>) {
      drawing.current = true;
      canvasRef.current!.setPointerCapture(e.pointerId);
      const ctx = canvasRef.current!.getContext("2d")!;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      const ctx = canvasRef.current!.getContext("2d")!;
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!dirty.current) { dirty.current = true; onInk(true); }
    }

    // Re-notify after every stroke so listeners can refresh a live preview.
    function up() {
      drawing.current = false;
      if (dirty.current) onInk(true);
    }

    function clear() {
      const c = canvasRef.current!;
      c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
      dirty.current = false;
      onInk(false);
    }

    return (
      <div className="field">
        <span>Signature <em>(draw below)</em></span>
        <canvas
          ref={canvasRef}
          className="sigpad"
          width={520}
          height={180}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
        <button type="button" className="link" onClick={clear}>Clear</button>
      </div>
    );
  }
);

export default SignaturePad;
