// Editor elements are stored as TOP-LEFT fractions of the page, so the same
// numbers drive CSS % on screen and points on export (see bakeEditorElements).
export type Base = { id: string; page: number; x: number; y: number };
export type ImageEl = Base & { kind: "image"; w: number; h: number; src: string };
export type TextEl = Base & { kind: "text"; fontFrac: number; text: string; color: string; bold?: boolean };
export type El = ImageEl | TextEl;

export type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
