import { useState } from "react";
import ColorPicker from "../../components/ColorPicker";
import OptionSelect from "../../components/OptionSelect";
import ToolShell from "../../components/ToolShell";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Slider } from "../../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Toggle } from "../../components/ui/toggle";
import { Button } from "../../components/ui/button";
import { dataUrlToBytes } from "../../lib/names";
import { watermarkPdf, type WatermarkPosition } from "../../lib/pdf";
import { perFile, useToolRun } from "../../lib/useToolRun";

const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

export default function Watermark() {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [color, setColor] = useState("#808080");
  const [angle, setAngle] = useState(45);
  const [opacity, setOpacity] = useState(0.25);
  const [size, setSize] = useState(0.125);
  const [position, setPosition] = useState<WatermarkPosition>("center");
  const [tile, setTile] = useState(false);
  const [image, setImage] = useState<string | null>(null); // data URL

  const ready = mode === "image" ? !!image : !!text.trim();

  const run = useToolRun(
    perFile("watermarked", (bytes) =>
      watermarkPdf(bytes, {
        text: mode === "text" ? text.trim() : undefined,
        image: mode === "image" && image ? dataUrlToBytes(image) : undefined,
        opacity, size, angle, color, position, tile,
      })
    ),
    { guard: () => (ready ? null : "Enter watermark text or pick an image.") }
  );

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(f);
  }

  return (
    <ToolShell
      slug="watermark"
      sub="Stamp text or a logo across every page."
      verb="Watermark"
      busy="Stamping"
      label={run.files.length > 1 ? undefined : "Add watermark"}
      run={run}
      disabled={!ready}
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as "text" | "image")}>
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="image">Image</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="space-y-3">
          <Input
            id="wm"
            value={text}
            placeholder="CONFIDENTIAL"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run.start(); }}
          />
          <ColorPicker value={color} onChange={setColor} />
        </TabsContent>

        <TabsContent value="image">
          <div className="surface border-dashed p-5 text-center">
            {image ? (
              <img src={image} alt="Watermark" className="mx-auto mb-3 max-h-40 max-w-full" />
            ) : (
              <p className="text-muted-foreground mb-2 text-sm">Pick a logo or stamp to overlay.</p>
            )}
            <Button type="button" variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                {image ? "Choose another" : "Choose image"}
                <input type="file" accept="image/*" hidden onChange={pickImage} />
              </label>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Label>
          Opacity <span className="text-muted-foreground font-normal">({Math.round(opacity * 100)}%)</span>
        </Label>
        <Slider min={0.05} max={1} step={0.05} value={[opacity]} onValueChange={([v]) => setOpacity(v)} />
      </div>

      <div className="space-y-2">
        <Label>
          Size <span className="text-muted-foreground font-normal">({Math.round(size * 100)}% of the page)</span>
        </Label>
        <Slider min={0.05} max={0.6} step={0.025} value={[size]} onValueChange={([v]) => setSize(v)} />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {/* Tiling covers the whole page, so a position would mean nothing. */}
        {!tile && (
          <div className="min-w-[10rem] flex-1">
            <OptionSelect label="Position" value={position} onChange={setPosition} options={POSITIONS} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="wm-angle">Angle</Label>
          <Input
            id="wm-angle"
            type="number"
            min={0}
            max={360}
            className="w-24"
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value) || 0)}
          />
        </div>
        <Toggle variant="outline" pressed={tile} onPressedChange={setTile} className="h-9">
          Tile across the page
        </Toggle>
      </div>
    </ToolShell>
  );
}
