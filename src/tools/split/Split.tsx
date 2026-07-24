import { useState } from "react";
import ToolShell from "../../components/ToolShell";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { explodePdf, extractPages } from "../../lib/pdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";
import type { NamedBytes } from "../../lib/zip";

export default function Split() {
  const [mode, setMode] = useState<"range" | "each">("range");
  const [ranges, setRanges] = useState("");
  const run = useToolRun(
    async (files, read) => {
      const out: NamedBytes[] = [];
      for (const f of files) {
        const bytes = await read(f);
        if (mode === "range") {
          out.push({ name: `${stem(f.name)}-pages.pdf`, data: await extractPages(bytes, ranges) });
        } else {
          (await explodePdf(bytes)).forEach((data, i) => out.push({ name: `${stem(f.name)}-p${i + 1}.pdf`, data }));
        }
      }
      return out;
    },
    { guard: () => (mode === "range" && !ranges.trim() ? "Enter pages to extract, e.g. 1-3,5" : null) }
  );

  return (
    <ToolShell slug="split" sub="Extract specific pages, or burst into single pages." verb="Split" busy="Splitting" run={run}>
      <div className="space-y-2">
        <Label>Mode</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "range" | "each")} className="flex flex-wrap gap-2">
          {[
            { value: "range", label: "Extract pages" },
            { value: "each", label: "Every page separately" },
          ].map((o) => (
            <Label
              key={o.value}
              className="bg-card hover:border-primary has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-normal transition-colors"
            >
              <RadioGroupItem value={o.value} /> {o.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {mode === "range" && (
        <div className="space-y-2">
          <Label htmlFor="ranges">
            Pages <span className="text-muted-foreground font-normal">(e.g. 1-3,5,8-)</span>
          </Label>
          <Input
            id="ranges"
            value={ranges}
            placeholder="1-3,5"
            onChange={(e) => setRanges(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run.start(); }}
          />
        </div>
      )}
    </ToolShell>
  );
}
