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
        name: "Bridge — PDF tools",
        short_name: "Bridge",
        description: "Every PDF tool, entirely in your browser — nothing uploaded.",
        theme_color: "#4f46e5",
        background_color: "#f8fafc",
        icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,svg,wasm}"], // mjs: the pdf.js worker asset
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
  // Emscripten glue doesn't survive esbuild pre-bundling.
  optimizeDeps: { exclude: ["@neslinesli93/qpdf-wasm"] },
});
