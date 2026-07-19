import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { addPageNumbers, type NumberFormat, type NumberPosition } from "../../lib/pdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

export default function PageNumbers() {
  const [position, setPosition] = useState<NumberPosition>("bottom-center");
  const [format, setFormat] = useState<NumberFormat>("n");
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push({ name: `${stem(files[i].name)}-numbered.pdf`, data: await addPageNumbers(await read(files[i]), { position, format }) });
      }
      return out;
    }
  );

  return (
    <section className="tool">
      <h1>🔢 Page numbers</h1>
      <p className="tool-sub">Stamp page numbers onto every page.</p>
      <FileStaging accepts="pdf" />
      <label className="field">
        <span>Position</span>
        <select value={position} onChange={(e) => setPosition(e.target.value as NumberPosition)}>
          <option value="bottom-center">Bottom center</option>
          <option value="bottom-right">Bottom right</option>
          <option value="bottom-left">Bottom left</option>
        </select>
      </label>
      <label className="field">
        <span>Format</span>
        <select value={format} onChange={(e) => setFormat(e.target.value as NumberFormat)}>
          <option value="n">1</option>
          <option value="n/N">1 / N</option>
          <option value="page">Page 1</option>
        </select>
      </label>
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Numbering ${progress}/${files.length}…` : "Add page numbers"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="page-numbers" />}
    </section>
  );
}
