import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { compressPdf } from "../../lib/qpdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

export default function Compress() {
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push({ name: `${stem(files[i].name)}-compressed.pdf`, data: await compressPdf(await read(files[i])) });
      }
      return out;
    }
  );

  return (
    <section className="tool">
      <h1>🗜️ Compress PDF</h1>
      <p className="tool-sub">Light, lossless recompression. Savings vary and already optimized PDFs may not shrink.</p>
      <FileStaging accepts="pdf" />
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Compressing ${progress}/${files.length}…` : files.length > 1 ? `Compress ${files.length} PDFs` : "Compress PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="compress" />}
    </section>
  );
}
