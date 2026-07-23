import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import Select from "../../components/Select";
import { pdfToImages } from "../../lib/render";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";
import type { NamedBytes } from "../../lib/zip";

export default function PdfToJpg() {
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const out: NamedBytes[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push(...(await pdfToImages(await read(files[i]), stem(files[i].name), { format, scale: 2, quality: 0.92 })));
      }
      return out;
    }
  );

  return (
    <section className="tool">
      <h1>🏞️ PDF to JPG</h1>
      <p className="tool-sub">Turn each page into an image. Multiple pages download as a .zip.</p>
      <FileStaging accepts="pdf" />
      <div className="field">
        <span>Format</span>
        <Select
          ariaLabel="Format"
          value={format}
          onChange={(v) => setFormat(v as "jpg" | "png")}
          options={[
            { value: "jpg", label: "JPG" },
            { value: "png", label: "PNG" },
          ]}
        />
      </div>
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Rendering ${progress}/${files.length}…` : "PDF to images"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="pdf-to-jpg" />}
    </section>
  );
}
