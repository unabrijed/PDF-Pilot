import {
  Combine, Crop, Droplets, FileImage, FolderTree, Hash, Images, Lock, LockOpen,
  Minimize2, PencilRuler, PenLine, RotateCw, ScanText, Scissors, Wrench,
  type LucideIcon,
} from "lucide-react";

export type ToolStatus = "ready" | "soon";
export type FileType = "pdf" | "image";
export type Category = "organize" | "convert" | "edit" | "secure";

export const categories: { id: Category; label: string }[] = [
  { id: "organize", label: "Organize" },
  { id: "convert", label: "Convert" },
  { id: "edit", label: "Edit & sign" },
  { id: "secure", label: "Secure & optimize" },
];

export interface Tool {
  slug: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  status: ToolStatus;
  category: Category;  // drives the home grid sections and footer columns
  accepts: FileType;   // what it takes as input
  produces: FileType;  // what it outputs (drives "Continue in →")
}

// Adding a tool = one entry here + a component + a lazy <Route> in App.tsx.
export const tools: Tool[] = [
  { slug: "unlock", title: "Unlock PDF", desc: "Remove a password or owner restrictions.", icon: LockOpen, status: "ready", category: "secure", accepts: "pdf", produces: "pdf" },
  { slug: "merge", title: "Merge PDF", desc: "Combine several PDFs into one.", icon: Combine, status: "ready", category: "organize", accepts: "pdf", produces: "pdf" },
  { slug: "split", title: "Split PDF", desc: "Extract page ranges or burst into single pages.", icon: Scissors, status: "ready", category: "organize", accepts: "pdf", produces: "pdf" },
  { slug: "rotate", title: "Rotate PDF", desc: "Rotate pages 90/180/270°, in bulk.", icon: RotateCw, status: "ready", category: "organize", accepts: "pdf", produces: "pdf" },
  { slug: "protect", title: "Protect PDF", desc: "Add a password and AES-256 encryption.", icon: Lock, status: "ready", category: "secure", accepts: "pdf", produces: "pdf" },
  { slug: "jpg-to-pdf", title: "JPG to PDF", desc: "Combine images into one PDF.", icon: Images, status: "ready", category: "convert", accepts: "image", produces: "pdf" },
  { slug: "pdf-to-jpg", title: "PDF to JPG", desc: "Turn each page into an image.", icon: FileImage, status: "ready", category: "convert", accepts: "pdf", produces: "image" },
  { slug: "compress", title: "Compress PDF", desc: "Shrink file size (light, lossless).", icon: Minimize2, status: "ready", category: "secure", accepts: "pdf", produces: "pdf" },
  { slug: "page-numbers", title: "Page numbers", desc: "Stamp page numbers onto a PDF.", icon: Hash, status: "ready", category: "edit", accepts: "pdf", produces: "pdf" },
  { slug: "watermark", title: "Watermark", desc: "Stamp text or a logo across every page.", icon: Droplets, status: "ready", category: "edit", accepts: "pdf", produces: "pdf" },
  { slug: "sign", title: "Sign PDF", desc: "Draw a signature and stamp it on.", icon: PenLine, status: "ready", category: "edit", accepts: "pdf", produces: "pdf" },
  { slug: "pdf-editor", title: "PDF Editor", desc: "Add text, images and signatures. Move, resize, crop, place on any page.", icon: PencilRuler, status: "ready", category: "edit", accepts: "pdf", produces: "pdf" },
  { slug: "organize", title: "Organize PDF", desc: "Reorder or delete pages.", icon: FolderTree, status: "ready", category: "organize", accepts: "pdf", produces: "pdf" },
  { slug: "crop", title: "Crop PDF", desc: "Trim page margins.", icon: Crop, status: "ready", category: "organize", accepts: "pdf", produces: "pdf" },
  { slug: "ocr", title: "OCR PDF", desc: "Make scanned text searchable.", icon: ScanText, status: "ready", category: "convert", accepts: "pdf", produces: "pdf" },
  { slug: "repair", title: "Repair PDF", desc: "Recover a damaged PDF.", icon: Wrench, status: "ready", category: "secure", accepts: "pdf", produces: "pdf" },
];

export const toolBySlug = (slug: string) => tools.find((t) => t.slug === slug);
