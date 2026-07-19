import { zipSync } from "fflate";

export interface NamedBytes {
  name: string;
  data: Uint8Array;
  mime?: string; // defaults to application/pdf where used
}

/** Zip files in-memory. level 0 = store (PDFs/images are already compressed). */
export function zipBlob(items: NamedBytes[]): Blob {
  const map: Record<string, Uint8Array> = {};
  for (const { name, data } of items) map[uniqueName(map, name)] = data;
  const zipped = zipSync(map, { level: 0 });
  return new Blob([new Uint8Array(zipped)], { type: "application/zip" });
}

function uniqueName(map: Record<string, unknown>, name: string): string {
  if (!(name in map)) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (`${stem} (${i})${ext}` in map) i++;
  return `${stem} (${i})${ext}`;
}
