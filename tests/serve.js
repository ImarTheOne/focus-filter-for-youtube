/* A stand-in for YouTube and for the browser's extension APIs, so the real
   content script and settings page can be looked at without installing
   anything:

     node tests/serve.js     then open http://localhost:8780/watch?v=abc12345678

   (Not 8765: AnkiConnect listens there.)

   /watch and /shorts/… serve harness.html, a fake player page that loads the
   real content.js; / serves home.html, a fake home page of video tiles. options.html and popup.html are served with mock-ext.js in
   front. Query parameters on the harness set the settings and the verdict the
   fake background answers with — see mock-ext.js. */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8780;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json" };

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const page = /^\/(watch|shorts\/)/.test(url.pathname) ? "/tests/harness.html"
    : url.pathname === "/" ? "/tests/home.html" : url.pathname;
  const file = path.join(root, path.normalize(page));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  let body = fs.readFileSync(file);
  if (/^\/(options|popup)\.html$/.test(page)) {
    body = String(body).replace('<script src="common.js">', '<script src="/tests/mock-ext.js"></script>\n<script src="common.js">');
  }
  res.writeHead(200, { "content-type": `${types[path.extname(file)] || "text/plain"}; charset=utf-8`, "cache-control": "no-store" });
  res.end(body);
}).listen(PORT, () => console.log(`http://localhost:${PORT}/watch?v=abc12345678`));
