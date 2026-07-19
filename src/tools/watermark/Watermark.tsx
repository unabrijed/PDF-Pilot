import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { watermarkPdf } from "../../lib/pdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

export default function Watermark() {
  const [text, setText] = useState("");
  const [opacity, setOpacity] = useState(0.25);
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push({ name: `${stem(files[i].name)}-watermarked.pdf`, data: await watermarkPdf(await read(files[i]), text.trim(), opacity) });
      }
      return out;
    },
    { guard: () => (text.trim() ? null : "Enter watermark text.") }
  );

  return (
    <section className="tool">
      <h1>💧 Watermark</h1>
      <p className="tool-sub">Stamp text diagonally across every page.</p>
      <FileStaging accepts="pdf" />
      <label className="field">
        <span>Text</span>
        <input
          type="text"
          value={text}
          placeholder="CONFIDENTIAL"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") start(); }}
        />
      </label>
      <label className="field">
        <span>Opacity <em>({Math.round(opacity * 100)}%)</em></span>
        <input type="range" min={0.05} max={0.6} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
      </label>
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Stamping ${progress}/${files.length}…` : files.length > 1 ? `Watermark ${files.length} PDFs` : "Add watermark"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="watermark" />}
    </section>
  );
}
