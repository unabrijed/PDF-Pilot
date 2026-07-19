import { useNavigate } from "react-router-dom";
import { tools } from "../tools/registry";
import { toWorkFiles, useWorkspace } from "../workspace";
import { zipBlob, type NamedBytes } from "../lib/zip";

const mimeOf = (it: NamedBytes) => it.mime ?? "application/pdf";
const iconOf = (it: NamedBytes) => (mimeOf(it).startsWith("image/") ? "🖼️" : "📄");

export default function ResultsActions({ items, currentSlug }: { items: NamedBytes[]; currentSlug: string }) {
  const { setFiles } = useWorkspace();
  const navigate = useNavigate();

  // Only offer tools that accept what this tool produced.
  const produces = tools.find((t) => t.slug === currentSlug)?.produces ?? "pdf";
  const nexts = tools.filter((t) => t.status === "ready" && t.slug !== currentSlug && t.accepts === produces);

  function continueIn(slug: string) {
    setFiles(toWorkFiles(items.map((it) => ({ name: it.name, data: it.data }))));
    navigate(`/${slug}`);
  }

  return (
    <div className="results">
      <div className="results-head">
        <strong>✅ {items.length} file{items.length > 1 ? "s" : ""} ready</strong>
        {items.length > 1 && (
          <button className="primary sm" onClick={() => download(zipBlob(items), "bridge-results.zip")}>
            Download all (.zip)
          </button>
        )}
      </div>
      <ul className="result-list">
        {items.map((it, i) => (
          <li key={i}>
            <span className="fl-name">{iconOf(it)} {it.name}</span>
            <button className="link" onClick={() => download(new Blob([new Uint8Array(it.data)], { type: mimeOf(it) }), it.name)}>
              Download
            </button>
          </li>
        ))}
      </ul>
      {nexts.length > 0 && (
        <div className="continue">
          <span>Continue in:</span>
          {nexts.map((t) => (
            <button key={t.slug} className="chip" onClick={() => continueIn(t.slug)}>{t.icon} {t.title}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
