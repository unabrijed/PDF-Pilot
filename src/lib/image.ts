/**
 * Re-encode any image the browser can decode (WebP, GIF, AVIF, BMP, HEIC on
 * Safari, and CMYK/progressive JPEGs) as plain PNG bytes, which pdf-lib always
 * accepts. Browser-only: nothing here runs at import time, so Node can still
 * import the modules that use it.
 */
export async function toPngBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not read that image.");
  return new Uint8Array(await blob.arrayBuffer());
}
