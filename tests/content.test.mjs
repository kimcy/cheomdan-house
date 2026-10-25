import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";

const data = JSON.parse(readFileSync("content/site.json", "utf8"));
const compact = (text) => text.replace(/\s+/g, "");

it("두 안의 모든 내부 페이지, 링크와 이미지 파일이 존재한다", () => {
  const paths = [
    "index.html",
    "v2/index.html",
    "v1/index.html",
    ...readdirSync("pages").map((f) => "pages/" + f),
    ...readdirSync("v2/pages").map((f) => "v2/pages/" + f),
    ...readdirSync("v1/pages").map((f) => "v1/pages/" + f),
  ];
  expect(paths).toHaveLength(360);
  const missing = [];
  for (const path of paths) {
    const html = readFileSync(path, "utf8");
    for (const match of html.matchAll(
      /(?:href|src)="(\/(?!\/)[^"#?]*)[^\"]*"/g,
    )) {
      let target = match[1];
      if (target.endsWith("/")) target += "index.html";
      if (!existsSync(resolve("." + target)))
        missing.push(`${path}: ${target}`);
    }
  }
  expect(missing).toEqual([]);
});

it("인증서 및 게시글을 전체 개수만큼 이관한다", () => {
  const counts = Object.fromEntries(
    data.pages.filter((p) => p.posts).map((p) => [p.slug, p.posts.length]),
  );
  expect(counts).toEqual({
    certificates: 15,
    "modular-housing": 35,
    "modular-village": 1,
    panels: 22,
    videos: 22,
    portfolio: 5,
  });
});

it("전체 소개 페이지와 상세 글 본문을 축약하거나 수정하지 않는다", () => {
  const sources = data.pages.flatMap((page) =>
    page.posts
      ? page.posts.map((post) => ({
          slug: page.slug,
          source: post,
          id: post.id,
        }))
      : page.type !== "inquiry" && !page.unavailable
        ? [{ slug: page.slug, source: page }]
        : [],
  );
  for (const { slug, source, id } of sources) {
    const doc = new JSDOM(
      readFileSync(`pages/${slug}${id ? "-" + id : ""}.html`, "utf8"),
    ).window.document;
    const content = doc.querySelector(
      slug === "history" ? ".timeline" : ".page-content .rich-content",
    );
    content.querySelectorAll(".missing-media").forEach((n) => n.remove());
    expect(compact(content.textContent), `${slug}-${id || "page"}`).toBe(
      compact(source.text),
    );
  }
}, 15000);

it("주요 메뉴는 이전 홈페이지가 아닌 같은 디자인의 내부 페이지로 이동한다", () => {
  for (const [path, prefix] of [
    ["index.html", "/pages/"],
    ["v2/index.html", "/v2/pages/"],
  ]) {
    const doc = new JSDOM(readFileSync(path, "utf8")).window.document;
    const links = [...doc.querySelectorAll("#site-nav a")].filter(
      (a) => !a.getAttribute("href").startsWith("#"),
    );
    expect(links.length).toBeGreaterThanOrEqual(16);
    expect(links.every((a) => a.getAttribute("href").startsWith(prefix))).toBe(
      true,
    );
  }
});
