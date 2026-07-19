import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Emscripten glue doesn't survive esbuild pre-bundling.
  optimizeDeps: { exclude: ["@neslinesli93/qpdf-wasm"] },
});
