import { readFile, writeFile, mkdir } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { imageDimensions } from "./image-dimensions.mjs";

const data = JSON.parse(await readFile("content/site.json", "utf8"));
const report = JSON.parse(await readFile("content/import-report.json", "utf8"));
const missing = new Map(report.failures.map((f) => ["/" + f.path, f.url]));
const template = await readFile("templates/home-v1.html", "utf8");
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const groupEnglish = {
  회사소개: "ABOUT CHEOMDAN",
  "모듈러 주택": "MODULAR LIVING",
  "핵벙커·대피소제작": "SHELTER SYSTEMS",
  동영상: "IN MOTION",
  포트폴리오: "OUR PORTFOLIO",
  온라인문의: "LET’S TALK",
  이용안내: "INFORMATION",
};
const route = (page, prefix = "", id) =>
  `${prefix}/pages/${page.slug}${id ? "-" + id : ""}.html`;

function linkRewrite(html, prefix = "", isHome = false) {
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  for (const a of doc.querySelectorAll("a[href]")) {
    if (a.classList.contains("source-reference")) continue;
    const href = a.getAttribute("href");
    if (href.startsWith("#") && !isHome) {
      if (href !== "#main") a.setAttribute("href", `${prefix}/${href}`);
      continue;
    }
    if (href.startsWith("/pages/")) {
      a.setAttribute("href", prefix + href);
      continue;
    }
    if (href.startsWith(data.origin)) {
      const url = new URL(href);
      const key =
        url.searchParams.get("co_id") || url.searchParams.get("bo_table");
      const page = data.pages.find((p) => p.key === key);
      if (page) {
        a.setAttribute(
          "href",
          route(page, prefix, url.searchParams.get("wr_id")),
        );
        a.removeAttribute("target");
      }
    }
  }
  for (const el of doc.querySelectorAll('[src^="./"],[href^="./"]'))
    for (const attr of ["src", "href"])
      if (el.getAttribute(attr)?.startsWith("./"))
        el.setAttribute(attr, el.getAttribute(attr).slice(1));
  return doc.body.innerHTML;
}
function sourceContent(html) {
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  for (const img of doc.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (missing.has(src)) {
      const placeholder = doc.createElement("div");
      placeholder.className = "missing-media";
      placeholder.innerHTML =
        '<span aria-hidden="true">▧</span><p>원본 사이트에서 이미지를 불러올 수 없습니다.</p>';
      placeholder.setAttribute("data-source-image", missing.get(src));
      img.replaceWith(placeholder);
    } else {
      if (src?.startsWith("/assets/")) {
        const dimensions = imageDimensions(src.slice(1));
        if (dimensions) {
          img.setAttribute("width", dimensions[0]);
          img.setAttribute("height", dimensions[1]);
        }
      }
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "article-image";
      button.setAttribute(
        "aria-label",
        `${img.alt || "본문 이미지"} 크게 보기`,
      );
      button.setAttribute("data-article-image", "");
      const anchor = img.closest("a");
      if (anchor && !anchor.textContent.trim()) {
        anchor.replaceWith(button);
        button.append(img);
      } else {
        img.replaceWith(button);
        button.append(img);
      }
    }
  }
  return doc.body.innerHTML;
}
function timeline(page) {
  const doc = new JSDOM(`<body>${page.html}</body>`).window.document;
  const headings = [...doc.querySelectorAll("h3")].filter((h) =>
    /^\d{4}년$/.test(h.textContent.trim()),
  );
  return `<div class="timeline">${headings
    .map((h, i) => {
      const range = doc.createRange();
      range.setStartAfter(h);
      if (headings[i + 1]) range.setEndBefore(headings[i + 1]);
      else range.setEnd(doc.body, doc.body.childNodes.length);
      const wrap = doc.createElement("div");
      wrap.append(range.cloneContents());
      return `<section class="timeline-entry"><h2>${escape(h.textContent)}</h2><div class="rich-content">${sourceContent(wrap.innerHTML)}</div></section>`;
    })
    .join("")}</div>`;
}
function board(page, prefix) {
  const isCertificate = page.slug === "certificates";
  return `<section class="board" aria-labelledby="board-title"><div class="board-toolbar"><div><h2 id="board-title">${escape(page.title)}</h2><p id="board-count" role="status">전체 ${page.posts.length}건</p></div><form id="board-search" role="search"><label class="sr-only" for="search-input">${escape(page.title)} 검색</label><input id="search-input" type="search" placeholder="제목으로 검색" autocomplete="off"><button type="submit" aria-label="검색">검색 ↗</button></form></div>
  <div class="board-grid ${isCertificate ? "certificate-grid" : ""}">${page.posts.map((post, i) => `<article class="board-card" data-board-card data-title="${escape(post.title)}"><a href="${route(page, prefix, post.id)}"><div class="board-image">${post.thumbnail && !missing.has(post.thumbnail) ? `<img src="${escape(post.thumbnail)}" alt="${escape(post.title)}" loading="${i < 3 ? "eager" : "lazy"}" decoding="async">` : '<div class="board-placeholder">CHEOMDAN<br>DESIGN HOUSE</div>'}${page.slug === "videos" ? '<span class="video-play" aria-hidden="true">▶</span>' : '<span class="board-arrow" aria-hidden="true">↗</span>'}</div><div class="board-caption"><p>${escape(post.date || post.author || page.title)}</p><h3>${escape(post.title)}</h3><span>${isCertificate ? "인증서 보기" : "자세히 보기"} ↗</span></div></a></article>`).join("")}</div>
  <div id="board-empty" class="empty-state" hidden><h3>검색 결과가 없습니다.</h3><p>다른 검색어로 다시 찾아보세요.</p><button type="button" id="reset-search" class="button button-outline">전체 보기</button></div><nav id="board-pagination" class="pagination" aria-label="게시글 페이지"></nav></section>`;
}
function inquiry() {
  return `<div class="inquiry-layout"><div class="inquiry-info"><p class="eyebrow">CONTACT CHEOMDAN</p><h2>주택제작 관련해서<br>무엇이든 물어보세요!</h2><p>첨단디자인하우스가 함께하겠습니다.</p><a class="inquiry-phone" href="tel:15519123">1551-9123 ↗</a><p>09:00 — 18:00 · 공휴일 휴무</p><a class="text-link" href="mailto:dearceo@naver.com">dearceo@naver.com ↗</a></div><form id="inquiry-form" class="inquiry-form"><p class="form-intro">제품 분류를 선택해주세요!</p><label>제품 분류<select name="category" required><option value="">선택해주세요</option>모듈러 주택</option><option>이동식주택</option><option>체류형쉼터(농막)</option></select></label><div class="form-row"><label>이름 <span>필수</span><input name="name" autocomplete="name" required maxlength="80"></label><label>이메일 <span>필수</span><input name="email" type="email" autocomplete="email" required maxlength="200"></label></div><label>홈페이지<input name="website" type="url" placeholder="https://" maxlength="300"></label><label>제목 <span>필수</span><input name="subject" required maxlength="150"></label><label>내용 <span>필수</span><textarea name="message" rows="7" required maxlength="4000"></textarea></label><p class="form-help">입력한 내용으로 이메일 앱에서 문의 메일을 작성합니다. 메일을 직접 보내야 문의가 전달됩니다. 홈페이지 게시판 접수는 운영 서버 연동 후 이용할 수 있습니다.</p><button class="button" type="submit">이메일로 문의 작성 <span>↗</span></button><p id="inquiry-status" role="status"></p></form></div>`;
}
function sidebar(page, prefix) {
  const siblings = data.pages.filter((p) => p.group === page.group);
  return `<aside class="page-sidebar"><p class="eyebrow">${groupEnglish[page.group]}</p><nav aria-label="${escape(page.group)} 하위 메뉴">${siblings.map((p) => `<a href="${route(p, prefix)}" ${p.slug === page.slug ? 'aria-current="page"' : ""}>${escape(p.title)}<span aria-hidden="true">↗</span></a>`).join("")}</nav><div class="sidebar-contact"><span>제작 상담</span><a href="tel:15519123">1551-9123</a><small>09:00 — 18:00<br>공휴일 휴무</small></div></aside>`;
}
function pageBody(page, prefix, post) {
  let body;
  if (post)
    body = `<article class="post-detail"><div class="post-meta"><span>${escape(post.author)}</span><time>${escape(post.date)}</time><span>${escape(page.title)}</span></div>${post.videoIds?.map((id) => `<div class="video-frame"><iframe src="https://www.youtube.com/embed/${id}" title="${escape(post.title)}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">YouTube에서 보기 ↗</a></div>`).join("") || ""}<div class="rich-content">${sourceContent(post.html)}</div>${post.attachments?.length ? `<div class="attachments"><h2>첨부파일</h2>${post.attachments.map((a) => `<a href="${escape(a.url)}" target="_blank" rel="noopener noreferrer">${escape(a.title)} ↗</a>`).join("")}</div>` : ""}<div class="post-bottom"><a class="button button-outline" href="${route(page, prefix)}">← 목록으로</a><a class="button" href="${prefix}/pages/inquiry.html">이 제품 문의하기 ↗</a></div></article>`;
  else if (page.type === "board") body = board(page, prefix);
  else if (page.type === "inquiry") body = inquiry();
  else if (page.unavailable)
    body =
      '<div class="empty-state"><p class="eyebrow">INFORMATION</p><h2>등록된 내용이 없습니다.</h2><p>기존 홈페이지에 등록된 본문이 없습니다.<br>관련 문의는 대표번호로 연락해 주세요.</p><a class="button" href="tel:15519123">1551-9123 ↗</a></div>';
  else if (page.slug === "history") body = timeline(page);
  else if (page.slug === "company")
    body = `<div class="company-intro"><p class="eyebrow">CHEOMDAN DESIGN HOUSE</p><div class="rich-content company-welcome">${sourceContent(page.html)}</div><figure><img src="/assets/hero.jpg" alt="첨단디자인하우스 주택 소개 이미지"><figcaption>첨단디자인하우스</figcaption></figure><div class="company-facts"><div><span>회사명</span><p>첨단정보시스템 주식회사</p></div><div><span>사업자등록번호</span><p>560-87-02627</p></div><div><span>대표번호</span><a href="tel:15519123">1551-9123 ↗</a></div></div></div>`;
  else
    body = `<article class="rich-content content-${page.slug}">${sourceContent(page.html)}</article>${page.slug === "location" ? '<p class="source-note">원문에 기재된 주소와 교통안내를 그대로 옮겼습니다. 방문 전 대표번호로 위치를 확인해 주세요.</p>' : ""}`;
  const title = post?.title || page.title;
  return `<main id="main"><section class="subpage-hero wrap"><nav class="breadcrumbs" aria-label="현재 위치"><a href="${prefix}/">HOME</a><span>/</span><a href="${route(
    data.pages.find((p) => p.group === page.group),
    prefix,
  )}">${escape(page.group)}</a><span>/</span><span>${escape(post ? page.title : title)}</span></nav><div class="subpage-heading"><div><p class="eyebrow">${groupEnglish[page.group]}</p><h1>${escape(title)}</h1></div><span class="subpage-mark" aria-hidden="true">↗</span></div></section><div class="subpage-layout wrap">${sidebar(page, prefix)}<div class="page-content">${body}<div class="source-credit"><span>첨단디자인하우스 · ${data.importedOn} 원문 기준</span><a class="source-reference" href="${escape(post?.url || page.url)}" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></div></div></div><section class="page-cta wrap"><div><p class="eyebrow">YOUR NEXT CHAPTER</p><h2>당신의 공간을 이야기해 주세요.</h2></div><a href="${prefix}/pages/inquiry.html" class="button">제작 상담하기 ↗</a></section></main>`;
}
const doc = new JSDOM(template).window.document;
const originalHead = doc.head.innerHTML;
const header = doc.querySelector("header.site-header").outerHTML;
const footer = doc.querySelector("footer.site-footer").outerHTML;
const mobile = doc.querySelector(".mobile-contact").outerHTML;
const viewer = `<dialog id="media-viewer" aria-label="이미지 크게 보기"><button type="button" id="media-close" class="dialog-close" aria-label="이미지 닫기">×</button><img id="media-image" alt=""><p id="media-caption"></p></dialog>`;

await mkdir("pages", { recursive: true });
let pageCount = 0;
for (const prefix of ["/v1", "", "/v2"]) {
  const isVariantTwo = prefix !== "/v1";
  let variantDoc;
  if (isVariantTwo) {
    try {
      variantDoc = new JSDOM(await readFile("templates/home-v2.html", "utf8"))
        .window.document;
    } catch {
      continue;
    }
  }
  await mkdir(`${prefix ? prefix.slice(1) + "/" : ""}pages`, {
    recursive: true,
  });
  for (const page of data.pages)
    for (const post of [null, ...(page.posts || [])]) {
      const title = post?.title || page.title;
      let head = originalHead
        .replace(
          /<title>[\s\S]*?<\/title>/,
          `<title>${escape(title)} | 첨단디자인하우스</title>`,
        )
        .replace(/\.\/assets\//g, "/assets/")
        .replace("./styles.css", "/styles.css")
        .replace("./app.js", "/app.js");
      head += `<link rel="stylesheet" href="/pages.css"><script type="module" src="/pages.js"></script>${isVariantTwo ? '<link rel="stylesheet" href="/v2/theme.css"><link rel="stylesheet" href="/motion.css">' : ""}`;
      const pageHeader =
        variantDoc?.querySelector(".site-header")?.outerHTML || header;
      const pageFooter =
        variantDoc?.querySelector("footer")?.outerHTML || footer;
      const localHeader = isVariantTwo
        ? pageHeader.replaceAll('href="/v2/', `href="${prefix}/`)
        : pageHeader;
      const localFooter = isVariantTwo
        ? pageFooter.replaceAll('href="/v2/', `href="${prefix}/`)
        : pageFooter;
      const html = `<!doctype html><html lang="ko"${isVariantTwo ? ' data-motion="full"' : ""}><head>${head}</head><body class="subpage ${isVariantTwo ? "variant-two" : ""}"><a class="skip-link" href="#main">본문 바로가기</a>${linkRewrite(localHeader, prefix)}${linkRewrite(pageBody(page, prefix, post), prefix)}${linkRewrite(localFooter, prefix)}${isVariantTwo ? "" : mobile}${viewer}</body></html>`;
      await writeFile(route(page, prefix, post?.id).slice(1), html);
      pageCount++;
    }
}
// All homepage navigation stays in the redesigned site.
const home = new JSDOM(template);
home.window.document.body.innerHTML = linkRewrite(
  home.window.document.body.innerHTML,
  "/v1",
  true,
);
await writeFile("v1/index.html", home.serialize());
const mainHome = await readFile("v2/index.html", "utf8");
await writeFile(
  "index.html",
  mainHome
    .replaceAll('href="/v2/pages/', 'href="/pages/')
    .replaceAll('href="/v2/"', 'href="/"'),
);
console.log(
  `Generated ${pageCount} internal pages with preserved source content.`,
);
