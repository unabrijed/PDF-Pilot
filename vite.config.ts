import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// On Vercel this is the production domain (flips to the custom domain once one
// is added), so the sitemap, robots.txt, canonical and OG URLs follow along.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:5173";

// ponytail: slugs regex-parsed from the registry so the sitemap can't drift;
// breaks only if the `slug: "…"` key style in registry.ts changes.
const slugs = [...readFileSync("src/tools/registry.ts", "utf8").matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const seo: Plugin = {
  name: "seo-files",
  transformIndexHtml: { order: "pre", handler: (html) => html.replaceAll("__SITE_URL__", siteUrl) },
  generateBundle() {
    const urls = ["", ...slugs].map((s) => `  <url><loc>${siteUrl}/${s}</loc></url>`).join("\n");
    this.emitFile({
      type: "asset",
      fileName: "sitemap.xml",
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    });
    this.emitFile({
      type: "asset",
      fileName: "robots.txt",
      source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
    });
  },
};

export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  define: { __SITE_URL__: JSON.stringify(siteUrl) },
  plugins: [
    react(),
    seo,
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // 512px icons stay out of the precache (heavy, only fetched on install).
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "icon-192.png"],
      manifest: {
        name: "PDFPilot PDF tools",
        short_name: "PDFPilot",
        description: "Every PDF tool, entirely in your browser. Nothing uploaded.",
        theme_color: "#5b3df5",
        background_color: "#f5f4ef",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,svg,wasm,woff2}"], // woff2: self-hosted brand fonts for offline; mjs: pdf.js worker
        // The self-hosted OCR engine (~12MB) is cached on first OCR use instead of
        // being precached for every visitor.
        globIgnores: ["tesseract/**", "tessdata/**"],
        runtimeCaching: [
          {
            urlPattern: /\/(tesseract|tessdata)\//,
            handler: "CacheFirst",
            options: { cacheName: "ocr-assets", expiration: { maxEntries: 8 } },
          },
        ],
        // qpdf.wasm (~1.3MB) and the pdf.js chunk (~1.7MB) must precache for offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  // qpdf-wasm MUST be pre-bundled: the Emscripten glue is UMD and exports nothing
  // in a browser, so serving it raw breaks `import createModule from …`. The
  // optimizer's CJS interop gives it a real default export, and the require("fs")
  // in its dead node branch resolves to a lazy browser-external shim.
  optimizeDeps: { include: ["@neslinesli93/qpdf-wasm"] },
});
