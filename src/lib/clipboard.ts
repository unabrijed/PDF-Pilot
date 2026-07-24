/** The bits of DataTransfer we read, so this stays testable outside a browser. */
export interface ClipboardLike {
  files?: ArrayLike<File> | null;
  items?: ArrayLike<{ kind: string; type: string; getAsFile(): File | null }> | null;
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Files from a paste. Copying a file in Finder/Explorer fills `files`; a
 * screenshot or copied image only shows up in `items`, unnamed, so those get a
 * generated `pasted-N.ext`. Non-image, non-file entries (plain text, HTML) are
 * dropped so pasting a URL never stages garbage.
 */
export function filesFromClipboard(dt: ClipboardLike | null | undefined, startIndex = 1): File[] {
  if (!dt) return [];

  const direct = Array.from(dt.files ?? []);
  if (direct.length) return direct;

  const out: File[] = [];
  let n = startIndex;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const f = item.getAsFile();
    if (!f) continue;
    // Clipboard images arrive as "image.png" or no name at all; make them distinct.
    out.push(f.name && f.name !== "image.png" ? f : renamed(f, `pasted-${n++}.${EXT[f.type] ?? "png"}`));
  }
  return out;
}

function renamed(f: File, name: string): File {
  return new File([f], name, { type: f.type, lastModified: f.lastModified });
}

/** True when the paste belongs to a text field and must not be hijacked. */
export function isEditableTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node || typeof node.closest !== "function") return false;
  return !!node.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");
}
