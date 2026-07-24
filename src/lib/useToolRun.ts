import { useState } from "react";
import { getBytes, useWorkspace, type WorkFile } from "../workspace";
import { matches } from "./filetypes";
import type { FileType } from "../tools/registry";
import { stem } from "./names";
import type { NamedBytes } from "./zip";

export interface RunApi {
  files: WorkFile[]; // compatible files — what will actually be processed
  running: boolean;
  progress: number; // 1-based index of the file being processed
  error: string;
  outputs: NamedBytes[];
  start: () => void;
}

type Process = (
  files: WorkFile[],
  read: (f: WorkFile) => Promise<Uint8Array>,
  setProgress: (n: number) => void,
  fail: (msg: string) => void // report a per-file soft failure; successes still ship
) => Promise<NamedBytes[]>;

/**
 * The common shape: run `fn` over each file in turn, naming the output
 * `<stem>-<suffix>.pdf`. A file that throws is reported and skipped, so one bad
 * PDF never sinks the rest of the batch.
 */
export function perFile(
  suffix: string,
  fn: (bytes: Uint8Array, file: WorkFile) => Promise<Uint8Array>,
  message: (name: string, e: unknown) => string = (name, e) =>
    `${name}: ${e instanceof Error ? e.message : String(e)}`
): Process {
  return async (files, read, setProgress, fail) => {
    const out: NamedBytes[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(i + 1);
      try {
        out.push({ name: `${stem(files[i].name)}-${suffix}.pdf`, data: await fn(await read(files[i]), files[i]) });
      } catch (e) {
        fail(message(files[i].name, e));
      }
    }
    return out;
  };
}

/**
 * Shared tool state machine: staged files → sequential processing → outputs/error.
 * Only files matching `accepts` are passed on; `min` gates the count; `guard`
 * lets a tool add its own precondition (e.g. a required password).
 */
export function useToolRun(
  process: Process,
  opts: { accepts?: FileType; min?: number; guard?: () => string | null } = {}
): RunApi {
  const accepts = opts.accepts ?? "pdf";
  const min = opts.min ?? 1;
  const { files: staged } = useWorkspace();
  const files = staged.filter((f) => matches(accepts, f.name));

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [outputs, setOutputs] = useState<NamedBytes[]>([]);

  async function start() {
    if (running) return;
    const g = opts.guard?.();
    if (g) { setError(g); return; }
    if (files.length < min) { setError(min > 1 ? `Add at least ${min} files.` : "Add a file first."); return; }
    setRunning(true); setError(""); setOutputs([]); setProgress(0);
    const failures: string[] = [];
    try {
      setOutputs(await process(files, getBytes, setProgress, (m) => failures.push(m)));
      if (failures.length) setError(failures.join("\n"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setRunning(false);
  }

  return { files, running, progress, error, outputs, start };
}
