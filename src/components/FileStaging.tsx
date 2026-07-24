import { useRef, useState } from "react";
import { AlertTriangle, Upload, X } from "lucide-react";
import { useWorkspace } from "../workspace";
import { FILE_KIND, matches } from "../lib/filetypes";
import type { FileType } from "../tools/registry";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const pasteKey = () => (/Mac|iP(hone|ad)/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl+");

export default function FileStaging({ accepts = "pdf" }: { accepts?: FileType }) {
  const { files, addFiles, removeFile, clear } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const kind = FILE_KIND[accepts];
  const Icon = kind.icon;

  function pick(list: FileList | null) {
    const arr = list ? Array.from(list) : [];
    if (arr.length) addFiles(arr);
  }

  const skipped = files.filter((f) => !matches(accepts, f.name)).length;

  return (
    <div>
      <div
        className={cn(
          "bg-card cursor-pointer rounded-xl border-2 border-dashed px-5 py-10 text-center transition-colors",
          over ? "border-primary bg-accent" : "hover:border-primary hover:bg-accent"
        )}
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
        <Upload className="text-primary mx-auto size-7" />
        <div className="mt-3 font-semibold">Drop {kind.label} here, or click to browse</div>
        <div className="text-muted-foreground mt-1 text-sm">
          You can paste with {pasteKey()}V too. Files stay on this device.
        </div>
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f) => {
            const ok = matches(accepts, f.name);
            return (
              <li
                key={f.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
                  ok ? "bg-card" : "border-destructive/40 bg-destructive/10 text-destructive"
                )}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  {ok ? <Icon className="text-muted-foreground size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
                  <span className="truncate">{f.name}</span>
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => removeFile(f.id)} aria-label={`Remove ${f.name}`}>
                  <X />
                </Button>
              </li>
            );
          })}
          <li className="text-muted-foreground flex items-center justify-between px-1 pt-1 text-xs">
            <span>
              {files.length} file{files.length > 1 ? "s" : ""}
              {skipped > 0 && ` · ${skipped} skipped (not ${kind.label})`}
            </span>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={clear}>Clear all</Button>
          </li>
        </ul>
      )}
    </div>
  );
}
