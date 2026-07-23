import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import Select from "../../components/Select";
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
      <div className="field">
        <span>Position</span>
        <Select
          ariaLabel="Position"
          value={position}
          onChange={(v) => setPosition(v as NumberPosition)}
          options={[
            { value: "bottom-center", label: "Bottom center" },
            { value: "bottom-right", label: "Bottom right" },
            { value: "bottom-left", label: "Bottom left" },
          ]}
        />
      </div>
      <div className="field">
        <span>Format</span>
        <Select
          ariaLabel="Format"
          value={format}
          onChange={(v) => setFormat(v as NumberFormat)}
          options={[
            { value: "n", label: "1" },
            { value: "n/N", label: "1 / N" },
            { value: "page", label: "Page 1" },
          ]}
        />
      </div>
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Numbering ${progress}/${files.length}…` : "Add page numbers"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="page-numbers" />}
    </section>
  );
}
