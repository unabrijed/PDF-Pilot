import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { decryptPdf } from "../../lib/qpdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

export default function Unlock() {
  const [password, setPassword] = useState("");
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress, fail) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        try {
          out.push({ name: `${stem(files[i].name)}-unlocked.pdf`, data: await decryptPdf(await read(files[i]), password) });
        } catch (e) {
          fail(`✗ ${files[i].name} — ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      return out;
    }
  );

  return (
    <section className="tool">
      <h1>🔓 Unlock PDF</h1>
      <p className="tool-sub">Remove passwords or owner restrictions. Runs in your browser.</p>
      <FileStaging accepts="pdf" />
      <label className="field">
        <span>Password <em>(optional — leave empty for restriction-only PDFs)</em></span>
        <input
          type="password"
          value={password}
          placeholder="Applied to all files"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") start(); }}
        />
      </label>
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Unlocking ${progress}/${files.length}…` : files.length > 1 ? `Unlock ${files.length} PDFs` : "Unlock PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="unlock" />}
    </section>
  );
}
