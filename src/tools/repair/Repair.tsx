import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { repairPdf } from "../../lib/qpdf";
import { salvagePdf } from "../../lib/pdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

// Two engines: qpdf rewrite fixes what it tolerates (shifted offsets, minor damage);
// pdf-lib's lenient sequential parse salvages broken xref/startxref/truncated tails.
async function repair(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    return await repairPdf(bytes);
  } catch {
    return await salvagePdf(bytes);
  }
}

export default function Repair() {
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress, fail) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        try {
          out.push({ name: `${stem(files[i].name)}-repaired.pdf`, data: await repair(await read(files[i])) });
        } catch {
          fail(`${files[i].name}: couldn't recover this file. Its content may be lost beyond repair.`);
        }
      }
      return out;
    }
  );

  return (
    <section className="tool">
      <h1>🩹 Repair PDF</h1>
      <p className="tool-sub">Rebuild a damaged PDF's structure and recover broken cross-reference tables where possible.</p>
      <FileStaging accepts="pdf" />
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Repairing ${progress}/${files.length}…` : files.length > 1 ? `Repair ${files.length} PDFs` : "Repair PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="repair" />}
    </section>
  );
}
