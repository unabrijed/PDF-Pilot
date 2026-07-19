import { useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { encryptPdf } from "../../lib/qpdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

export default function Protect() {
  const [password, setPassword] = useState("");
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push({ name: `${stem(files[i].name)}-protected.pdf`, data: await encryptPdf(await read(files[i]), password) });
      }
      return out;
    },
    { guard: () => (password ? null : "Set a password first.") }
  );

  return (
    <section className="tool">
      <h1>🔒 Protect PDF</h1>
      <p className="tool-sub">Add a password and AES-256 encryption. Runs in your browser.</p>
      <FileStaging accepts="pdf" />
      <label className="field">
        <span>Password <em>(required)</em></span>
        <input
          type="password"
          value={password}
          placeholder="Set a password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") start(); }}
        />
      </label>
      <button className="primary" disabled={!files.length || !password || running} onClick={start}>
        {running ? `Protecting ${progress}/${files.length}…` : files.length > 1 ? `Protect ${files.length} PDFs` : "Protect PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="protect" />}
    </section>
  );
}
