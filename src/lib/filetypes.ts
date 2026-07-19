import type { FileType } from "../tools/registry";

export const FILE_KIND: Record<FileType, { accept: string; label: string; icon: string; match: (name: string) => boolean }> = {
  pdf: { accept: "application/pdf", label: "PDFs", icon: "📄", match: (n) => /\.pdf$/i.test(n) },
  image: { accept: "image/jpeg,image/png", label: "images", icon: "🖼️", match: (n) => /\.(jpe?g|png)$/i.test(n) },
};

export const matches = (type: FileType, name: string) => FILE_KIND[type].match(name);
