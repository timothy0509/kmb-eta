import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

export function render(url) {
  // You can pass `url` into React Router if you’re using it
  const appHtml = renderToString(<App />);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ETA</title>
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
}