import { useEffect, useRef, useState } from "react";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { rebuildPdf } from "../../lib/pdf";
import { pdfToThumbs } from "../../lib/render";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";
import { getBytes } from "../../workspace";

// ponytail: works on the first staged PDF only; per-page rotate and multi-file
// organize wait until someone actually asks for them.
export default function Organize() {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [thumbErr, setThumbErr] = useState("");
  const dragFrom = useRef(-1);

  const { files, running, error, outputs, start } = useToolRun(
    async (files, read) => [
      { name: `${stem(files[0].name)}-organized.pdf`, data: await rebuildPdf(await read(files[0]), order) },
    ],
    { guard: () => (order.length ? null : "Keep at least one page.") }
  );
  const file = files[0];

  useEffect(() => {
    if (!file) { setThumbs([]); setOrder([]); return; }
    let alive = true;
    setThumbs([]); setOrder([]); setThumbErr("");
    getBytes(file)
      .then((b) => pdfToThumbs(b))
      .then((t) => { if (alive) { setThumbs(t); setOrder(t.map((_, i) => i)); } })
      .catch((e) => { if (alive) setThumbErr(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (from: number, to: number) => {
    if (from < 0 || from === to) return;
    setOrder((o) => { const n = [...o]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; });
  };
  const untouched = order.length === thumbs.length && order.every((p, i) => p === i);

  return (
    <section className="tool">
      <h1>🗂️ Organize PDF</h1>
      <p className="tool-sub">Drag pages to reorder, ✕ to delete, then apply.</p>
      <FileStaging accepts="pdf" />
      {files.length > 1 && <p className="hint-line">Organize works on the first staged PDF. Remove the others or run it once per file.</p>}
      {file && !thumbs.length && !thumbErr && <p className="hint-line">Rendering pages…</p>}
      {thumbErr && <p className="msg error">⚠️ {thumbErr}</p>}

      {thumbs.length > 0 && (
        <>
          <div className="thumb-grid">
            {order.map((p, idx) => (
              <figure
                key={p}
                className="thumb"
                draggable
                onDragStart={() => { dragFrom.current = idx; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { move(dragFrom.current, idx); dragFrom.current = -1; }}
              >
                <button className="thumb-x" onClick={() => setOrder((o) => o.filter((_, i) => i !== idx))} aria-label={`Delete page ${p + 1}`}>✕</button>
                <img src={thumbs[p]} alt={`Page ${p + 1}`} draggable={false} />
                <figcaption>{p + 1}</figcaption>
              </figure>
            ))}
          </div>
          <div className="fl-foot">
            <span>{order.length} of {thumbs.length} pages kept</span>
            {!untouched && <button className="link" onClick={() => setOrder(thumbs.map((_, i) => i))}>Reset</button>}
          </div>
        </>
      )}

      <button className="primary" disabled={!file || running || !thumbs.length} onClick={start}>
        {running ? "Applying…" : "Apply changes"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="organize" />}
    </section>
  );
}
