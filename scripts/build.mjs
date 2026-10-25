import { mkdir, copyFile, cp, readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import "./prepare-v2.mjs";
await import("./generate-pages.mjs");

const html = await readFile("index.html", "utf8");
const dependencies = [
  ...html.matchAll(/(?:src|href)="\.\/([^"?#]+)[^"]*"/g),
].map((match) => match[1]);
await Promise.all(dependencies.map((file) => access(resolve(file))));
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "styles.css",
  "app.js",
  "pages.css",
  "pages.js",
  "motion.css",
])
  await copyFile(file, `dist/${file}`);
await cp("assets", "dist/assets", { recursive: true });
await cp("pages", "dist/pages", { recursive: true });
await cp("v1", "dist/v1", { recursive: true });
try {
  await access("v2/index.html");
  await cp("v2", "dist/v2", { recursive: true });
} catch {
  /* Second proposal is generated when its template is available. */
}
console.log(
  "Build complete: dist/ — proposal 2 at the root, /v2/ alias, /v1/ archive.",
);
