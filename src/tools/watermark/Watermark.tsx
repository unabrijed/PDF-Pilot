import { useState } from "react";
import ToolShell from "../../components/ToolShell";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Slider } from "../../components/ui/slider";
import { watermarkPdf } from "../../lib/pdf";
import { perFile, useToolRun } from "../../lib/useToolRun";

export default function Watermark() {
  const [text, setText] = useState("");
  const [opacity, setOpacity] = useState(0.25);
  const run = useToolRun(perFile("watermarked", (bytes) => watermarkPdf(bytes, text.trim(), opacity)), {
    guard: () => (text.trim() ? null : "Enter watermark text."),
  });

  return (
    <ToolShell
      slug="watermark"
      sub="Stamp text diagonally across every page."
      verb="Watermark"
      busy="Stamping"
      label={run.files.length > 1 ? undefined : "Add watermark"}
      run={run}
      disabled={!text.trim()}
    >
      <div className="space-y-2">
        <Label htmlFor="wm">Text</Label>
        <Input
          id="wm"
          value={text}
          placeholder="CONFIDENTIAL"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run.start(); }}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Opacity <span className="text-muted-foreground font-normal">({Math.round(opacity * 100)}%)</span>
        </Label>
        <Slider min={0.05} max={0.6} step={0.05} value={[opacity]} onValueChange={([v]) => setOpacity(v)} />
      </div>
    </ToolShell>
  );
}
