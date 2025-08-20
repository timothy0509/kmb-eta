import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/eta/",
  build: {
    ssr: "src/entry-server.jsx", // SSR entry
    outDir: "dist-ssr"
  }
});