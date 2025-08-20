import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // ensure client build outputs to dist
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html"
    }
  }
});