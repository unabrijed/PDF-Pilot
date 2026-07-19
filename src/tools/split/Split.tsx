import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { explodePdf, extractPages } from "../../lib/pdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";
import type { NamedBytes } from "../../lib/zip";

export default function Split() {
  const [mode, setMode] = useState<"range" | "each">("range");
  const [ranges, setRanges] = useState("");
  const { files, running, error, outputs, start } = useToolRun(
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
    <section className="tool">
      <h1>✂️ Split PDF</h1>
      <p className="tool-sub">Extract specific pages, or burst into single pages.</p>
      <FileStaging accepts="pdf" />
      <div className="field">
        <span>Mode</span>
        <div className="radios">
          <label><input type="radio" name="mode" checked={mode === "range"} onChange={() => setMode("range")} /> Extract pages</label>
          <label><input type="radio" name="mode" checked={mode === "each"} onChange={() => setMode("each")} /> Every page separately</label>
        </div>
      </div>
      {mode === "range" && (
        <label className="field">
          <span>Pages <em>(e.g. 1-3,5,8-)</em></span>
          <input
            type="text"
            value={ranges}
            placeholder="1-3,5"
            onChange={(e) => setRanges(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") start(); }}
          />
        </label>
      )}
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? "Splitting…" : "Split PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="split" />}
    </section>
  );
}
