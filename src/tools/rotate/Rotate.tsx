import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import Select from "../../components/Select";
import { rotatePdf } from "../../lib/pdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

export default function Rotate() {
  const [deg, setDeg] = useState(90);
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push({ name: `${stem(files[i].name)}-rotated.pdf`, data: await rotatePdf(await read(files[i]), deg) });
      }
      return out;
    }
  );

  return (
    <section className="tool">
      <h1>🔄 Rotate PDF</h1>
      <p className="tool-sub">Rotate all pages. Applies to every file you add.</p>
      <FileStaging accepts="pdf" />
      <div className="field">
        <span>Rotation</span>
        <Select
          ariaLabel="Rotation"
          value={String(deg)}
          onChange={(v) => setDeg(Number(v))}
          options={[
            { value: "90", label: "90° clockwise" },
            { value: "180", label: "180°" },
            { value: "270", label: "270° (90° counter-clockwise)" },
          ]}
        />
      </div>
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Rotating ${progress}/${files.length}…` : files.length > 1 ? `Rotate ${files.length} PDFs` : "Rotate PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="rotate" />}
    </section>
  );
}
