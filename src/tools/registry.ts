export type ToolStatus = "ready" | "soon";
export type FileType = "pdf" | "image";

export interface Tool {
  slug: string;
  title: string;
  desc: string;
  icon: string;
  status: ToolStatus;
  accepts: FileType;   // what it takes as input
  produces: FileType;  // what it outputs (drives "Continue in →")
}

// Adding a tool = one entry here + a component + a lazy <Route> in App.tsx.
export const tools: Tool[] = [
  { slug: "unlock", title: "Unlock PDF", desc: "Remove a password or owner restrictions.", icon: "🔓", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "merge", title: "Merge PDF", desc: "Combine several PDFs into one.", icon: "🧩", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "split", title: "Split PDF", desc: "Extract page ranges or burst into single pages.", icon: "✂️", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "rotate", title: "Rotate PDF", desc: "Rotate pages 90/180/270°, in bulk.", icon: "🔄", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "protect", title: "Protect PDF", desc: "Add a password and AES-256 encryption.", icon: "🔒", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "jpg-to-pdf", title: "JPG to PDF", desc: "Combine images into one PDF.", icon: "🖼️", status: "ready", accepts: "image", produces: "pdf" },
  { slug: "pdf-to-jpg", title: "PDF to JPG", desc: "Turn each page into an image.", icon: "🏞️", status: "ready", accepts: "pdf", produces: "image" },
  { slug: "compress", title: "Compress PDF", desc: "Shrink file size (light, lossless).", icon: "🗜️", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "page-numbers", title: "Page numbers", desc: "Stamp page numbers onto a PDF.", icon: "🔢", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "watermark", title: "Watermark", desc: "Overlay text across every page.", icon: "💧", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "sign", title: "Sign PDF", desc: "Draw a signature and stamp it on.", icon: "✍️", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "pdf-editor", title: "PDF Editor", desc: "Add text, images and signatures. Move, resize, crop, place on any page.", icon: "🖊️", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "organize", title: "Organize PDF", desc: "Reorder or delete pages.", icon: "🗂️", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "crop", title: "Crop PDF", desc: "Trim page margins.", icon: "🔲", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "ocr", title: "OCR PDF", desc: "Make scanned text searchable.", icon: "🔎", status: "ready", accepts: "pdf", produces: "pdf" },
  { slug: "repair", title: "Repair PDF", desc: "Recover a damaged PDF.", icon: "🩹", status: "ready", accepts: "pdf", produces: "pdf" },
];
