import { useEffect, useState } from "react";
import FileStaging from "../../components/FileStaging";
import RectSelect from "../../components/RectSelect";
import ResultsActions from "../../components/ResultsActions";
import { cropPdf, type CropRect } from "../../lib/pdf";
import { pdfToThumbs } from "../../lib/render";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";
import { getBytes } from "../../workspace";

export default function Crop() {
  const [preview, setPreview] = useState("");
  const [rect, setRect] = useState<CropRect | null>(null);
  const [prevErr, setPrevErr] = useState("");

  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push({ name: `${stem(files[i].name)}-cropped.pdf`, data: await cropPdf(await read(files[i]), rect!) });
      }
      return out;
    },
    { guard: () => (rect && rect.w > 0.01 && rect.h > 0.01 ? null : "Drag on the preview to draw a crop area.") }
  );
  const file = files[0];

  useEffect(() => {
    if (!file) { setPreview(""); setRect(null); return; }
    let alive = true;
    setPreview(""); setRect(null); setPrevErr("");
    getBytes(file)
      .then((b) => pdfToThumbs(b, 440, [1]))
      .then(([t]) => { if (alive) setPreview(t); })
      .catch((e) => { if (alive) setPrevErr(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="tool">
      <h1>🔲 Crop PDF</h1>
      <p className="tool-sub">Drag a rectangle on the preview — the same crop (as a fraction of each page) applies to every page and file.</p>
      <FileStaging accepts="pdf" />
      {file && !preview && !prevErr && <p className="hint-line">Rendering preview…</p>}
      {prevErr && <p className="msg error">⚠️ {prevErr}</p>}
      {preview && (
        <>
          <RectSelect src={preview} rect={rect} onRect={setRect} />
          {rect && rect.w > 0.01 && (
            <div className="fl-foot">
              <span>Keeping {Math.round(rect.w * 100)}% × {Math.round(rect.h * 100)}% of each page</span>
              <button className="link" onClick={() => setRect(null)}>Reset</button>
            </div>
          )}
        </>
      )}
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Cropping ${progress}/${files.length}…` : files.length > 1 ? `Crop ${files.length} PDFs` : "Crop PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="crop" />}
    </section>
  );
}
