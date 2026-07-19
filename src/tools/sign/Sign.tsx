import { useRef, useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import SignaturePad, { type SignaturePadHandle } from "../../components/SignaturePad";
import { stampSignature } from "../../lib/pdf";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

export default function Sign() {
  const padRef = useRef<SignaturePadHandle>(null);
  const [hasInk, setHasInk] = useState(false);
  const [where, setWhere] = useState<"last" | "first" | "all">("last");
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress) => {
      const png = padRef.current?.toPng();
      if (!png) throw new Error("Draw your signature first.");
      const out = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1);
        out.push({ name: `${stem(files[i].name)}-signed.pdf`, data: await stampSignature(await read(files[i]), png, { where }) });
      }
      return out;
    },
    { guard: () => (hasInk ? null : "Draw your signature first.") }
  );

  return (
    <section className="tool">
      <h1>✍️ Sign PDF</h1>
      <p className="tool-sub">Draw a signature and stamp it on the page. Runs in your browser.</p>
      <FileStaging accepts="pdf" />
      <SignaturePad ref={padRef} onInk={setHasInk} />
      <label className="field">
        <span>Place on</span>
        <select value={where} onChange={(e) => setWhere(e.target.value as "last" | "first" | "all")}>
          <option value="last">Last page</option>
          <option value="first">First page</option>
          <option value="all">Every page</option>
        </select>
      </label>
      <button className="primary" disabled={!files.length || !hasInk || running} onClick={start}>
        {running ? `Signing ${progress}/${files.length}…` : "Sign PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="sign" />}
    </section>
  );
}
