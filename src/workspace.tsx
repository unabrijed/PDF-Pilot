import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { filesFromClipboard, isEditableTarget } from "./lib/clipboard";

export interface WorkFile {
  id: string;
  name: string;
  source: File | Uint8Array;
}

export async function getBytes(f: WorkFile): Promise<Uint8Array> {
  return f.source instanceof File ? new Uint8Array(await f.source.arrayBuffer()) : f.source;
}

let seq = 0;
export function toWorkFiles(items: Array<File | { name: string; data: Uint8Array }>): WorkFile[] {
  return items.map((it) =>
    it instanceof File
      ? { id: `f${++seq}`, name: it.name, source: it }
      : { id: `f${++seq}`, name: it.name, source: it.data }
  );
}

interface WorkspaceApi {
  files: WorkFile[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  setFiles: (files: WorkFile[]) => void;
  clear: () => void;
}

const Ctx = createContext<WorkspaceApi | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<WorkFile[]>([]);
  const api = useMemo<WorkspaceApi>(
    () => ({
      files,
      setFiles,
      clear: () => setFiles([]),
      addFiles: (incoming) => setFiles((cur) => [...cur, ...toWorkFiles(incoming)]),
      removeFile: (id) => setFiles((cur) => cur.filter((f) => f.id !== id)),
    }),
    [files]
  );

  // Paste files or a screenshot anywhere on the page. Bound once here rather than
  // per tool, so every tool gets it through the same staging list.
  const pasteCount = useRef(1);
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (isEditableTarget(e.target)) return; // let password and text fields paste normally
      const incoming = filesFromClipboard(e.clipboardData, pasteCount.current);
      if (!incoming.length) return;
      e.preventDefault();
      pasteCount.current += incoming.length;
      setFiles((cur) => [...cur, ...toWorkFiles(incoming)]);
      toast.success(`Pasted ${incoming.length} file${incoming.length > 1 ? "s" : ""}`);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return api;
}
