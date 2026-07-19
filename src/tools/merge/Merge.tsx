import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { mergePdfs } from "../../lib/pdf";
import { useToolRun } from "../../lib/useToolRun";

export default function Merge() {
  const { files, running, error, outputs, start } = useToolRun(
    async (files, read) => [{ name: "merged.pdf", data: await mergePdfs(await Promise.all(files.map(read))) }],
    { min: 2 }
  );

  return (
    <section className="tool">
      <h1>🧩 Merge PDF</h1>
      <p className="tool-sub">Combine PDFs into one, in the order listed.</p>
      <FileStaging accepts="pdf" />
      <button className="primary" disabled={files.length < 2 || running} onClick={start}>
        {running ? "Merging…" : "Merge PDFs"}
      </button>
      {files.length === 1 && <p className="hint-line">Add at least one more PDF to merge.</p>}
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="merge" />}
    </section>
  );
}
