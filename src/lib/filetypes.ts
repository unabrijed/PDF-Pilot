import { FileText, Image, type LucideIcon } from "lucide-react";
import type { FileType } from "../tools/registry";

export const FILE_KIND: Record<FileType, { accept: string; label: string; icon: LucideIcon; match: (name: string) => boolean }> = {
  pdf: { accept: "application/pdf", label: "PDFs", icon: FileText, match: (n) => /\.pdf$/i.test(n) },
  // Anything the browser can decode: non-PNG/JPG is re-encoded on a canvas (see lib/image.ts).
  // heic/heif only decode on Safari; anything the browser can't read fails with a named error.
  image: { accept: "image/*", label: "images", icon: Image, match: (n) => /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(n) },
};

export const matches = (type: FileType, name: string) => FILE_KIND[type].match(name);
