import { useEffect, useState } from "react";
import { getBytes, type WorkFile } from "../workspace";
import { pdfToThumbs } from "./render";

/**
 * Render page thumbnails for a staged file, re-running whenever the file (or
 * `pages`) changes. Guards against a slow render landing after the file was
 * swapped out. Crop, Organize and Sign all want exactly this.
 *
 * `pages` is 1-based; -1 means the last page. Omit it for every page.
 */
export function useThumbs(file: WorkFile | undefined, width?: number, pages?: number[]) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const key = pages?.join(",") ?? "";

  useEffect(() => {
    setThumbs([]);
    setError("");
    if (!file) return;
    let alive = true;
    getBytes(file)
      .then((b) => pdfToThumbs(b, width, pages))
      .then((t) => { if (alive) setThumbs(t); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [file?.id, width, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { thumbs, error, loading: !!file && !thumbs.length && !error };
}
