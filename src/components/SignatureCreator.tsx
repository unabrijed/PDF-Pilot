import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Bold } from "lucide-react";
import { dataUrlToBytes } from "../lib/names";
import ColorPicker from "./ColorPicker";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Toggle } from "./ui/toggle";
import { cn } from "../lib/utils";

export interface SignaturePadHandle {
  toPng: () => Uint8Array | null; // null if empty
  toDataUrl: () => string | null;
}

type Mode = "draw" | "type" | "upload";

const TYPE_FONTS = [
  { value: "'Segoe Script','Snell Roundhand','Bradley Hand',cursive", label: "Script" },
  { value: "Georgia,'Times New Roman',serif", label: "Serif" },
  { value: "system-ui,-apple-system,sans-serif", label: "Sans" },
];

/** Render typed text onto a tightly sized transparent canvas → PNG data URL. */
function renderType(text: string, font: string, bold: boolean, color: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const fontPx = 96;
  const pad = 24;
  const weight = bold ? "700" : "400";
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${weight} ${fontPx}px ${font}`;
  const w = Math.ceil(measure.measureText(t).width) + pad * 2;
  const h = Math.ceil(fontPx * 1.5);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.font = `${weight} ${fontPx}px ${font}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(t, pad, h / 2);
  return c.toDataURL("image/png");
}

/**
 * Make a signature three ways: Draw, Type, or Upload. All export a PNG through
 * the same SignaturePadHandle, so callers (Sign, PDF Editor) stay unchanged.
 * `onInk(has)` fires whenever the signature content changes.
 */
const SignatureCreator = forwardRef<SignaturePadHandle, { onInk: (has: boolean) => void }>(
  function SignatureCreator({ onInk }, ref) {
    const [mode, setMode] = useState<Mode>("draw");
    const [color, setColor] = useState("#0f172a");
    const [text, setText] = useState("");
    const [font, setFont] = useState(TYPE_FONTS[0].value);
    const [bold, setBold] = useState(false);
    const [uploaded, setUploaded] = useState<string | null>(null); // PNG data URL

    const canvasRef = useRef<HTMLCanvasElement>(null); // draw surface
    const drawing = useRef(false);
    const dirty = useRef(false); // draw mode has strokes

    // Current signature as a PNG data URL, based on the active mode.
    const currentUrl = (): string | null => {
      if (mode === "draw") return canvasRef.current && dirty.current ? canvasRef.current.toDataURL("image/png") : null;
      if (mode === "type") return renderType(text, font, bold, color);
      return uploaded;
    };

    useImperativeHandle(ref, () => ({
      toDataUrl: currentUrl,
      toPng: () => {
        const url = currentUrl();
        return url ? dataUrlToBytes(url) : null;
      },
    }));

    // notify the parent that content may have changed
    const ping = () => onInk(!!currentUrl());

    function pos(e: React.PointerEvent<HTMLCanvasElement>) {
      const c = canvasRef.current!;
      const r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    }
    function down(e: React.PointerEvent<HTMLCanvasElement>) {
      drawing.current = true;
      canvasRef.current!.setPointerCapture(e.pointerId);
      const ctx = canvasRef.current!.getContext("2d")!;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
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
      // notify once when the first ink lands (avoid serializing the canvas every move)
      if (!dirty.current) { dirty.current = true; onInk(true); }
    }
    function up() {
      drawing.current = false;
      if (dirty.current) onInk(true);
    }
    function clearDraw() {
      const c = canvasRef.current!;
      c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
      dirty.current = false;
      ping();
    }

    function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d")!.drawImage(img, 0, 0);
          setUploaded(c.toDataURL("image/png")); // normalize JPG → PNG for embedPng
          onInk(true);
        };
        img.onerror = () => { setUploaded(null); onInk(false); };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(f);
    }

    const switchMode = (m: Mode) => {
      setMode(m);
      // recompute content for the mode we land on
      setTimeout(() => onInk(m === "draw" ? dirty.current : m === "type" ? !!text.trim() : !!uploaded), 0);
    };

    return (
      <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
        <TabsList>
          <TabsTrigger value="draw">Draw</TabsTrigger>
          <TabsTrigger value="type">Type</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-3">
          <canvas
            ref={canvasRef}
            width={520}
            height={180}
            className="block h-44 w-full cursor-crosshair touch-none rounded-lg border bg-white"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
          />
          <div className="flex flex-wrap items-center gap-3">
            <ColorPicker value={color} onChange={setColor} />
            <Button type="button" variant="ghost" size="sm" onClick={clearDraw}>Clear</Button>
          </div>
        </TabsContent>

        <TabsContent value="type" className="space-y-3">
          <Input
            value={text}
            placeholder="Type your name"
            className="h-16 text-center !text-2xl"
            style={{ fontFamily: font, fontWeight: bold ? 700 : 400, color }}
            onChange={(e) => { setText(e.target.value); onInk(!!e.target.value.trim()); }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {TYPE_FONTS.map((f) => (
                <Button
                  key={f.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(font === f.value && "border-primary ring-ring/40 ring-2")}
                  style={{ fontFamily: f.value }}
                  onClick={() => { setFont(f.value); ping(); }}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <Toggle
              size="sm"
              variant="outline"
              pressed={bold}
              onPressedChange={(v) => { setBold(v); ping(); }}
              aria-label="Bold"
            >
              <Bold />
            </Toggle>
            <ColorPicker value={color} onChange={(v) => { setColor(v); ping(); }} />
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div className="surface border-dashed p-5 text-center">
            {uploaded ? (
              <img src={uploaded} alt="Signature" className="mx-auto mb-3 max-h-40 max-w-full" />
            ) : (
              <p className="text-muted-foreground mb-2 text-sm">Pick an image of your signature.</p>
            )}
            <Button type="button" variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                {uploaded ? "Choose another" : "Choose image"}
                <input type="file" accept="image/*" hidden onChange={onUpload} />
              </label>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    );
  }
);

export default SignatureCreator;
