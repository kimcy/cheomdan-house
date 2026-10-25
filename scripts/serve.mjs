import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.argv.includes("--dist") ? "dist" : ".");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};
createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const relative =
      pathname === "/"
        ? "index.html"
        : /^\/v[12]\/?$/.test(pathname)
          ? pathname.replace(/^\//, "").replace(/\/$/, "") + "/index.html"
          : pathname.slice(1);
    const path = resolve(root, relative);
    const allowed =
      [
        "index.html",
        "styles.css",
        "app.js",
        "pages.css",
        "pages.js",
        "motion.css",
      ].includes(relative) ||
      relative.startsWith("assets/") ||
      relative.startsWith("pages/") ||
      relative.startsWith("v1/") ||
      relative.startsWith("v2/");
    if (
      !allowed ||
      !path.startsWith(root + sep) ||
      !(await stat(path)).isFile()
    ) {
      response.writeHead(404).end("Not found");
      return;
    }
    const content = await readFile(path);
    response.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Length": content.length,
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Local: http://localhost:${port}`),
);
