import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return api;
}
