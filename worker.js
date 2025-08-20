import { render } from "./dist-ssr/entry-server.js";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const html = render(url.pathname);

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};