import { JSDOM } from "jsdom";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname } from "node:path";

const origin = "http://www.xn--6j1bk21a14cu1h05l.com";
const definitions = [
  ["company", "회사소개", "회사소개", "content", "company", "02010000"],
  ["history", "연혁", "회사소개", "content", "history", "02020000"],
  ["certificates", "인증현황", "회사소개", "board", "Certificate", "02030000"],
  ["location", "본사위치", "회사소개", "content", "location", "02040000"],
  [
    "modular-housing",
    "이동식주택(모듈러주택) 고급",
    "모듈러 주택",
    "board",
    "modular_housing",
    "03010000",
  ],
  [
    "modular-village",
    "숙소형·주택단지",
    "모듈러 주택",
    "board",
    "modular_restarea",
    "03020000",
  ],
  [
    "panels",
    "건축자재인증패널",
    "모듈러 주택",
    "board",
    "modular_housing1",
    "03030000",
  ],
  [
    "underground-shelter",
    "지하 핵 대피소 시스템",
    "핵벙커·대피소제작",
    "content",
    "underground_nuclear",
    "04010000",
  ],
  [
    "safe-room",
    "지상 실내형 핵 세이프룸",
    "핵벙커·대피소제작",
    "content",
    "nuclear_safe_room",
    "04020000",
  ],
  [
    "nbc",
    "NBC 공기정화 시스템",
    "핵벙커·대피소제작",
    "content",
    "NBC",
    "04030000",
  ],
  [
    "large-shelter",
    "대형 핵 대피소 시스템",
    "핵벙커·대피소제작",
    "content",
    "Large_scale_Nuclear",
    "04040000",
  ],
  ["emp", "EMP 방호 시스템", "핵벙커·대피소제작", "content", "EMP", "04050000"],
  [
    "construction",
    "시공 절차",
    "핵벙커·대피소제작",
    "content",
    "Construction_Procedu",
    "04060000",
  ],
  [
    "blast-door",
    "방폭도어/방폭밸브",
    "핵벙커·대피소제작",
    "content",
    "Blast_Door",
    "04070000",
  ],
  ["videos", "동영상", "동영상", "board", "youtube", "05000000"],
  ["portfolio", "포트폴리오", "포트폴리오", "board", "gallery", "00000000"],
  ["inquiry", "온라인문의", "온라인문의", "inquiry", "qa", "06010000"],
  [
    "privacy",
    "개인정보처리방침",
    "이용안내",
    "content",
    "privacy_policy",
    "05030000",
  ],
  [
    "email-policy",
    "이메일수집거부",
    "이용안내",
    "content",
    "emailCollectRefusal",
    "05040000",
  ],
].map(([slug, title, group, type, key, pageNum]) => ({
  slug,
  title,
  group,
  type,
  key,
  pageNum,
  url: `${origin}/bbs/${type === "inquiry" ? "write" : type}.php?${type === "content" ? "co_id" : "bo_table"}=${key}&lang=Korean&pageNum=${pageNum}`,
}));

await mkdir("content", { recursive: true });
await mkdir("assets/imported", { recursive: true });
await mkdir("output/sources", { recursive: true });
const hash = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 20);
const errors = [];
async function pool(items, job, count = 4) {
  let cursor = 0;
  const output = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(count, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        output[index] = await job(items[index], index);
      }
    }),
  );
  return output;
}
async function getDocument(url) {
  const path = `output/sources/${hash(url)}.html`;
  let html;
  try {
    html = await readFile(path, "utf8");
  } catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error(`${response.status} ${url}`);
    html = await response.text();
    await writeFile(path, html);
  }
  return new JSDOM(html, { url }).window.document;
}
const cleanText = (text) => text.replace(/\s+/g, " ").trim();
const textFingerprint = (text) => text.replace(/\s+/g, "");
const assets = new Map();
function imagePath(url) {
  const absolute = new URL(url, origin).href;
  if (!/^https?:/.test(absolute)) return "";
  const extension = extname(new URL(absolute).pathname).toLowerCase();
  const local = `assets/imported/${hash(absolute)}${/^\.(jpe?g|png|webp|gif|svg)$/.test(extension) ? extension : ".jpg"}`;
  assets.set(absolute, local);
  return "/" + local;
}
function localLink(href) {
  const url = new URL(href, origin);
  if (url.hostname !== new URL(origin).hostname) return url.href;
  const key = url.searchParams.get("co_id") || url.searchParams.get("bo_table");
  const page = definitions.find((item) => item.key === key);
  if (page)
    return `/pages/${page.slug}${url.searchParams.has("wr_id") ? "-" + url.searchParams.get("wr_id") : ""}.html`;
  return url.href;
}
function sanitize(element, title) {
  const root = element.cloneNode(true);
  root
    .querySelectorAll(
      "script,style,link,meta,object,embed,form,input,button,textarea,select",
    )
    .forEach((node) => node.remove());
  const originalText = textFingerprint(root.textContent);
  for (const node of [...root.querySelectorAll("*")]) {
    const tag = node.tagName.toLowerCase();
    const keep = {};
    if (tag === "img") {
      const src = node.getAttribute("src");
      if (!src) {
        node.remove();
        continue;
      }
      keep.src = imagePath(src);
      keep.alt = node.getAttribute("alt") || title;
      keep.loading = "lazy";
      keep.decoding = "async";
      keep["data-enlarge"] = "";
    }
    if (tag === "a") {
      const href = node.getAttribute("href");
      if (href && /^(https?:|mailto:|tel:|\/|#)/i.test(href)) {
        keep.href = localLink(href);
        if (keep.href.startsWith("http")) {
          keep.target = "_blank";
          keep.rel = "noopener noreferrer";
        }
      }
    }
    if (tag === "iframe") {
      const src = node.getAttribute("src") || "";
      if (!/^https:\/\/(www\.)?(youtube(-nocookie)?\.com)\/embed\//.test(src)) {
        node.remove();
        continue;
      }
      keep.src = src;
      keep.title = node.getAttribute("title") || title;
      keep.loading = "lazy";
      keep.allowfullscreen = "";
      keep.referrerpolicy = "strict-origin-when-cross-origin";
    }
    if (["td", "th"].includes(tag))
      for (const attr of ["colspan", "rowspan"])
        if (node.hasAttribute(attr)) keep[attr] = node.getAttribute(attr);
    const cls = node.className;
    if (tag === "div" && /\blocation\b/.test(cls)) keep.class = "rich-columns";
    if (tag === "ul" && /\bpic[234]\b/.test(cls)) keep.class = "rich-gallery";
    for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
    for (const [key, value] of Object.entries(keep))
      node.setAttribute(key, value);
    if (["font", "span", "center"].includes(tag))
      node.replaceWith(...node.childNodes);
  }
  // Remove editor spacer blocks, keeping every non-whitespace character and all media.
  for (const node of [
    ...root.querySelectorAll("p,div,h1,h2,h3,h4,h5,h6,li,ul,strong,b,a"),
  ].reverse()) {
    if (
      !node.textContent.trim() &&
      !node.querySelector("img,iframe,video,table")
    )
      node.remove();
  }
  let html = root.innerHTML.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");
  const finalText = textFingerprint(
    new JSDOM(`<body>${html}</body>`).window.document.body.textContent,
  );
  if (originalText !== finalText)
    throw Error(`Text preservation failed: ${title}`);
  return {
    html,
    text: cleanText(root.textContent),
    textHash: hash(originalText),
  };
}
const pages = await pool(definitions, async (page) => {
  const doc = await getDocument(page.url);
  if (page.type === "content") {
    const content = doc.querySelector("#ctt_con");
    if (!content && ["privacy", "email-policy"].includes(page.slug))
      return { ...page, unavailable: true, html: "", text: "" };
    if (!content) throw Error(`Missing content: ${page.slug}`);
    return { ...page, ...sanitize(content, page.title) };
  }
  if (page.type === "inquiry") {
    const form = doc.querySelector('#fwrite,form[name="fwrite"]');
    return {
      ...page,
      fields: [...form.elements]
        .filter((e) => e.type !== "hidden")
        .map((e) => ({
          name: e.name,
          type: e.type,
          label: cleanText(
            doc.querySelector(`label[for="${e.id}"]`)?.textContent || "",
          ),
          options:
            e.tagName === "SELECT"
              ? [...e.options].map((o) => o.textContent)
              : undefined,
        })),
    };
  }
  const total = Number(
    doc
      .querySelector("#bo_list_total")
      ?.textContent.match(/Total\s*([\d,]+)/)?.[1]
      .replaceAll(",", "") || 0,
  );
  const documents = [doc];
  const pagination = new Set(
    [...doc.querySelectorAll(".pg_wrap a")]
      .map((a) => new URL(a.href).searchParams.get("page"))
      .filter(Boolean),
  );
  const lastPage = Math.max(1, ...[...pagination].map(Number));
  for (let number = 2; number <= lastPage; number++)
    documents.push(await getDocument(page.url + `&page=${number}`));
  const posts = new Map();
  for (const document of documents)
    for (const card of document.querySelectorAll(".gall_li")) {
      const anchor =
        card.querySelector("a.bo_tit") ||
        card.querySelector('a[href*="wr_id="]');
      if (!anchor) continue;
      const id = new URL(anchor.href).searchParams.get("wr_id");
      if (!id) continue;
      const url = new URL(anchor.href);
      url.searchParams.delete("iframehead");
      url.searchParams.delete("acate");
      const videoIds = [...card.innerHTML.matchAll(/ytIDs\s*=\s*"([^"]+)"/g)]
        .flatMap((m) => m[1].split("**"))
        .filter((id) => /^[\w-]{11}$/.test(id));
      const img = card.querySelector("img");
      posts.set(id, {
        id,
        url: url.href,
        title: cleanText(anchor.textContent),
        thumbnail: img
          ? imagePath(img.getAttribute("src"))
          : videoIds[0]
            ? `https://i.ytimg.com/vi/${videoIds[0]}/hqdefault.jpg`
            : null,
        videoIds,
      });
    }
  if (posts.size !== total)
    throw Error(`Incomplete board ${page.slug}: ${posts.size}/${total}`);
  console.log(`${page.slug}: ${posts.size} posts found`);
  return { ...page, total, posts: [...posts.values()] };
});

for (const page of pages.filter((p) => p.type === "board")) {
  page.posts = await pool(page.posts, async (post) => {
    const doc = await getDocument(post.url);
    const container = doc.createElement("div");
    const attached = doc.querySelector("#bo_v_img");
    if (attached) {
      // Keep full-resolution attachment images instead of the legacy popup route.
      for (const anchor of attached.querySelectorAll("a.view_image")) {
        const filename = new URL(anchor.href).searchParams.get("fn");
        if (filename && anchor.querySelector("img"))
          anchor.querySelector("img").src =
            `${origin}/data/file/${page.key}/${filename}`;
        anchor.replaceWith(...anchor.childNodes);
      }
      container.append(...attached.childNodes);
    }
    const article = doc.querySelector("#bo_v_con");
    if (
      !article &&
      page.slug === "portfolio" &&
      doc.body.textContent.includes("포인트")
    ) {
      // Only migrate the publicly available gallery preview; restricted bodies are not accessible.
      return {
        ...post,
        html: `<figure><img src="${post.thumbnail}" alt="${post.title}"></figure><p>기존 홈페이지에 공개된 포트폴리오 이미지입니다.</p>`,
        text: "기존 홈페이지에 공개된 포트폴리오 이미지입니다.",
        sourceStatus: "public-preview-only",
        author: "",
        date: "",
        attachments: [],
      };
    }
    if (!article) throw Error(`Missing article: ${post.url}`);
    container.append(article.cloneNode(true));
    const normalized = sanitize(container, post.title);
    const images = [
      ...new JSDOM(normalized.html).window.document.querySelectorAll("img"),
    ];
    return {
      ...post,
      ...normalized,
      title: cleanText(
        doc.querySelector("#bo_v_title")?.textContent || post.title,
      ),
      thumbnail: images[0]?.getAttribute("src") || post.thumbnail,
      author: cleanText(
        doc.querySelector("#bo_v_info .sv_member,#bo_v_info .sv_guest")
          ?.textContent || "",
      ),
      date: cleanText(
        doc.querySelector("#bo_v_info .if_date")?.textContent || "",
      ).replace(/^작성일\s*/, ""),
      attachments: [...doc.querySelectorAll("#bo_v_file a")]
        .map((a) => ({ title: cleanText(a.textContent), url: a.href }))
        .filter((a) => a.title),
    };
  });
  console.log(`${page.slug}: ${page.posts.length} full articles preserved`);
}
await writeFile(
  "content/site.json",
  JSON.stringify({ importedOn: "2026-10-25", origin, pages }, null, 2),
);
console.log(`Downloading ${assets.size} unique images`);
await pool(
  [...assets],
  async ([url, path], index) => {
    try {
      try {
        await access(path);
        return;
      } catch {
        /* Download once. */
      }
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("image/")
      )
        throw Error(`HTTP ${response.status}`);
      await writeFile(path, Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      errors.push({ url, path, error: error.message });
    }
    if ((index + 1) % 40 === 0)
      console.log(`Images processed: ${index + 1}/${assets.size}`);
  },
  6,
);
let previousReport = {};
try {
  previousReport = JSON.parse(
    await readFile("content/import-report.json", "utf8"),
  );
} catch {
  /* First import. */
}
await writeFile(
  "content/import-report.json",
  JSON.stringify(
    {
      pages: pages.length,
      posts: pages.reduce((sum, p) => sum + (p.posts?.length || 0), 0),
      images: assets.size,
      failures: errors,
      recovered: previousReport.recovered || [],
      recheckedOn: previousReport.recheckedOn,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    pages: pages.length,
    posts: pages.reduce((sum, p) => sum + (p.posts?.length || 0), 0),
    images: assets.size,
    failures: errors.length,
  }),
);
