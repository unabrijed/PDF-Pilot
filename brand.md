# PDFPilot brand

PDFPilot is a set of PDF tools that run entirely in the browser. The identity is
expressive and premium but calm: bold display type, a signature gradient, warm
neutrals, and tactile motion. PDFPilot flies files from one tool to the
next ("Continue in →"), and nothing ever leaves the device.

## Voice

Short, plain, confident. No jargon. No em dashes anywhere in copy. Prefer a
period or a comma over a dash. One idea per line. Say what a tool does, not how
clever it is.

## Type

- Display (headings, wordmark): Clash Display, weights 500 to 700.
- Body and UI: General Sans, weights 400 to 700.
- Both are self-hosted as woff2 under `public/fonts/` and precached by the
  service worker, so they work offline. No external font requests.
- Headings use tight tracking (about -.02em) and a fluid `clamp()` scale.

## Color

Tokens live in `src/styles.css` as CSS variables, with full light and dark
parity. Core values:

- Primary violet `#5b3df5` (buttons, focus, active). Dark theme lightens the
  text and border accent but keeps the button fill vivid.
- Accent coral `#ff6b5e` (used mainly inside the gradient).
- Signature gradient `--grad`: violet to purple to coral, 115deg. Used on the
  hero glow, the wordmark accent, tool card icon tiles, and the favicon.
- Neutrals are warm: ivory background, near-white surfaces, deep indigo ink.
- Semantic: ok green, danger red, each with a soft background and border token.

## Shape and motion

- Radii: 18px cards, 12px panels, 9px controls, 999px pills.
- Two layered shadows: `--shadow` for rest, `--shadow-lg` for hover and popovers.
- Motion: `--t` .18s on `--ease` (a soft ease-out). Cards lift on hover,
  buttons nudge up, focus rings use the soft primary tint.

## Components

One dropdown everywhere (`src/components/Select.tsx`), built on the header
popover look. One signature creator (`src/components/SignatureCreator.tsx`) with
Draw, Type, and Upload. One error card (`src/components/ErrorBoundary.tsx`) so a
single tool can never take the app down. Tool pages share the same tokens and
classes, so the look stays consistent across all of them.
