import { serveStatic } from "wrangler";

export default {
  async fetch(request, env, ctx) {
    try {
      // Try to serve static assets from dist/
      return await serveStatic(request, {
        root: "./dist"
      });
    } catch (e) {
      // Fallback to index.html for SPA routes
      return await serveStatic(request, {
        root: "./dist",
        path: "index.html"
      });
    }
  }
};