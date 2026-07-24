// Runnable self-check for the paste normalizer. No framework.
//   node scripts/check-clipboard.mjs
//
// src/lib/clipboard.ts is plain TS with no type-only runtime output, so strip the
// types with esbuild and import the result.
import { strict as assert } from "node:assert";
import { build } from "esbuild";

const { outputFiles } = await build({
  entryPoints: ["src/lib/clipboard.ts"],
  bundle: true,
  format: "esm",
  write: false,
});
const { filesFromClipboard, isEditableTarget } = await import(
  "data:text/javascript," + encodeURIComponent(outputFiles[0].text)
);

const file = (name, type = "application/pdf") => new File([new Uint8Array([1, 2, 3])], name, { type });
const item = (f, type = f?.type) => ({ kind: f ? "file" : "string", type, getAsFile: () => f });

// 1. Real files from the OS clipboard win outright.
assert.deepEqual(
  filesFromClipboard({ files: [file("a.pdf"), file("b.pdf")] }).map((f) => f.name),
  ["a.pdf", "b.pdf"]
);

// 2. A screenshot arrives only in items, unnamed → gets a generated name.
const shot = filesFromClipboard({ files: [], items: [item(file("image.png", "image/png"))] });
assert.equal(shot.length, 1);
assert.equal(shot[0].name, "pasted-1.png");
assert.equal(shot[0].type, "image/png");

// 3. startIndex keeps successive pastes distinct.
assert.equal(filesFromClipboard({ items: [item(file("image.png", "image/png"))] }, 7)[0].name, "pasted-7.png");

// 4. A JPEG keeps its own name when it has a real one, and gets the right extension when it doesn't.
assert.equal(filesFromClipboard({ items: [item(file("sign.jpg", "image/jpeg"))] })[0].name, "sign.jpg");
assert.equal(filesFromClipboard({ items: [item(file("image.png", "image/jpeg"))] })[0].name, "pasted-1.jpg");

// 5. Pasted text / HTML / non-image files are ignored, so a copied URL stages nothing.
assert.deepEqual(filesFromClipboard({ items: [item(null, "text/plain"), item(null, "text/html")] }), []);
assert.deepEqual(filesFromClipboard({ items: [item(file("notes.txt", "text/plain"))] }), []);

// 6. Empty / missing clipboards are safe.
assert.deepEqual(filesFromClipboard(null), []);
assert.deepEqual(filesFromClipboard({}), []);
assert.deepEqual(filesFromClipboard({ files: [], items: [] }), []);

console.log("✓ clipboard: OS files, screenshots, naming, and text-only pastes all handled.");

// 7. Editable targets are left alone so password fields still paste text.
const fake = (sel) => ({ closest: (q) => (q.split(",").some((p) => p.trim().startsWith(sel)) ? {} : null) });
assert.equal(isEditableTarget(fake("input")), true);
assert.equal(isEditableTarget(fake("textarea")), true);
assert.equal(isEditableTarget(fake("div")), false);
assert.equal(isEditableTarget(null), false);
assert.equal(isEditableTarget({}), false); // no closest() (e.g. document/window)

console.log("✓ clipboard: paste inside a text field is not hijacked.");
console.log("\nAll clipboard checks passed.");
