/** Filename without its extension: "report.final.pdf" → "report.final". */
export const stem = (name: string) => name.replace(/\.[^.]+$/, "");
