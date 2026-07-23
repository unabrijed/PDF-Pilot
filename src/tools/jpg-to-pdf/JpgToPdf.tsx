import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { imagesToPdf } from "../../lib/pdf";
import { useToolRun } from "../../lib/useToolRun";

export default function JpgToPdf() {
  const { files, running, error, outputs, start } = useToolRun(
    async (files, read) => {
      const items = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: await read(f) })));
      return [{ name: "images.pdf", data: await imagesToPdf(items) }];
    },
    { accepts: "image" }
  );

  return (
    <section className="tool">
      <h1>🖼️ JPG to PDF</h1>
      <p className="tool-sub">Combine images into one PDF, one image per page, in the order listed.</p>
      <FileStaging accepts="image" />
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? "Building…" : "Create PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="jpg-to-pdf" />}
    </section>
  );
}
