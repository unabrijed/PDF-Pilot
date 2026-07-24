import { FileText, Image, type LucideIcon } from "lucide-react";
import type { FileType } from "../tools/registry";

export const FILE_KIND: Record<FileType, { accept: string; label: string; icon: LucideIcon; match: (name: string) => boolean }> = {
  pdf: { accept: "application/pdf", label: "PDFs", icon: FileText, match: (n) => /\.pdf$/i.test(n) },
  image: { accept: "image/jpeg,image/png", label: "images", icon: Image, match: (n) => /\.(jpe?g|png)$/i.test(n) },
};

export const matches = (type: FileType, name: string) => FILE_KIND[type].match(name);
