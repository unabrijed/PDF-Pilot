import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
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
      <label className="field">
        <span>Rotation</span>
        <select value={deg} onChange={(e) => setDeg(Number(e.target.value))}>
          <option value={90}>90° clockwise</option>
          <option value={180}>180°</option>
          <option value={270}>270° (90° counter-clockwise)</option>
        </select>
      </label>
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Rotating ${progress}/${files.length}…` : files.length > 1 ? `Rotate ${files.length} PDFs` : "Rotate PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="rotate" />}
    </section>
  );
}
