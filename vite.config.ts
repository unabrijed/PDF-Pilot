import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Bridge PDF tools",
        short_name: "Bridge",
        description: "Every PDF tool, entirely in your browser. Nothing uploaded.",
        theme_color: "#5b3df5",
        background_color: "#f5f4ef",
        icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml" }],
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
