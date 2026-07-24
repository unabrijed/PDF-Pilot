/** Filename without its extension: "report.final.pdf" → "report.final". */
export const stem = (name: string) => name.replace(/\.[^.]+$/, "");

/** Decode a `data:...;base64,...` URL into raw bytes. */
export function dataUrlToBytes(url: string): Uint8Array {
  const bin = atob(url.split(",")[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
