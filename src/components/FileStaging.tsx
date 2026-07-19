import { useRef, useState } from "react";
import { useWorkspace } from "../workspace";
import { FILE_KIND, matches } from "../lib/filetypes";
import type { FileType } from "../tools/registry";

export default function FileStaging({ accepts = "pdf" }: { accepts?: FileType }) {
  const { files, addFiles, removeFile, clear } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const kind = FILE_KIND[accepts];

  function pick(list: FileList | null) {
    const arr = list ? Array.from(list) : [];
    if (arr.length) addFiles(arr);
  }

  const skipped = files.filter((f) => !matches(accepts, f.name)).length;

  return (
    <div className="staging">
      <div
        className={`dropzone${over ? " over" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={kind.accept}
          multiple
          hidden
          onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
        />
        <div className="dz-icon">⬆️</div>
        <div className="dz-name">Drop {kind.label} here, or click to browse</div>
        <div className="dz-hint">Files stay on this device</div>
      </div>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f) => {
            const ok = matches(accepts, f.name);
            return (
              <li key={f.id} className={ok ? "" : "bad"}>
                <span className="fl-name">{ok ? kind.icon : "⚠️"} {f.name}</span>
                <button className="fl-x" onClick={() => removeFile(f.id)} aria-label={`Remove ${f.name}`}>✕</button>
              </li>
            );
          })}
          <li className="fl-foot">
            <span>
              {files.length} file{files.length > 1 ? "s" : ""}
              {skipped > 0 && ` · ${skipped} skipped (not ${kind.label})`}
            </span>
            <button className="link" onClick={clear}>Clear all</button>
          </li>
        </ul>
      )}
    </div>
  );
}
