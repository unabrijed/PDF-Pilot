# PDFPilot brand

PDFPilot is a set of PDF tools that run entirely in the browser. The identity is
"ink on paper": warm paper surfaces, warm near-black ink, one flight-blue
accent, big editorial display type, and quiet motion. PDFPilot flies files from
one tool to the next ("Continue in →"), and nothing ever leaves the device.

## Voice

Short, plain, confident. No jargon. No em dashes anywhere in copy. Prefer a
period or a comma over a dash. One idea per line. Say what a tool does, not how
clever it is. Copy leans on the real differentiators: private, offline, free.

## Type

- Display (headings, wordmark): Clash Display, weights 500 to 700.
- Body and UI: General Sans, weights 400 to 700.
- Both are self-hosted as woff2 under `public/fonts/` and precached by the
  service worker, so they work offline. No external font requests.
- Scale: hero `clamp(3rem, 8vw, 6.5rem)` at tracking -0.03em and leading 0.95,
  section heads text-4xl/5xl, page h1 text-3xl/4xl, body text-base/lg,
  captions text-xs. Headings get -0.02em tracking from the base layer.

## Color

Tokens live in `src/index.css` (`:root`, `.dark`, `@theme inline`), full light
and dark parity. Core values:

- Paper background `#faf9f6`, ink foreground `#171511` (light). Dark inverts:
  background `#141310`, foreground `#f0eee7`. Never pure black or white text.
- One accent, flight blue: `#2547f4` light, `#5c7bff` dark. Buttons, links,
  focus, active states. Budget: blue appears about once per viewport.
- Ink surface tokens (`--ink`, `--ink-foreground`, `--ink-muted`,
  `--ink-accent`): the dark contrast surface used by the landing band and the
  footer. Identical in both themes, so its accent is always the bright blue.
- Semantic: `--success` green, `--destructive` red.
- No gradients. The old violet-coral gradient system is retired.

## Shape, depth, motion

- Radius by role: controls 10px (`rounded-md`), cards 14 to 16px
  (`rounded-lg`/`rounded-xl`), the ink band 24px (`rounded-3xl`), pills and
  primary CTAs `rounded-full`.
- Shadows are warm and low-opacity (4 to 10 percent), layered small-plus-large:
  `shadow-xs` rest, `shadow-sm` cards, `shadow-md` hover, `shadow-lg` overlays.
  Dark mode leans on borders instead.
- The one card treatment is the `surface` utility
  (`bg-card rounded-xl border shadow-sm`). No hand-rolled card classes.
- Easing: `--ease-out-quart` (`cubic-bezier(0.25, 1, 0.5, 1)`). Buttons press
  with `active:scale-[0.98]`. Cards lift 2px on hover with a shadow step.
- Scroll reveals: `useReveal()` (`src/lib/useReveal.ts`) + `[data-reveal]`
  elements, staggered with `--reveal-delay`. Route mounts use `.page-in`.
  Everything respects `prefers-reduced-motion`.

## Components

One dropdown everywhere (`src/components/OptionSelect.tsx`). One signature
creator (`src/components/SignatureCreator.tsx`) with Draw, Type, and Upload.
One error card (`src/components/ErrorBoundary.tsx`) so a single tool can never
take the app down. Every tool page opens through `ToolShell`/`ToolHeader`
(category eyebrow, editorial h1, dropzone centerpiece), so the look stays
consistent across all of them.
