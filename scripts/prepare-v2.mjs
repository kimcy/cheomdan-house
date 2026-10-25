import { readFile, writeFile, mkdir } from "node:fs/promises";
import { JSDOM } from "jsdom";
const data = JSON.parse(await readFile("content/site.json", "utf8"));
const arrow =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>';
const link = (slug) => `/v2/pages/${slug}.html`;
const groups = [
  ["회사소개", data.pages.filter((p) => p.group === "회사소개")],
  ["모듈러 주택", data.pages.filter((p) => p.group === "모듈러 주택")],
  [
    "핵벙커 · 대피소",
    data.pages.filter((p) => p.group === "핵벙커·대피소제작"),
  ],
  ["미디어", data.pages.filter((p) => ["videos", "inquiry"].includes(p.slug))],
];
const nav = groups
  .map(
    ([label, pages]) =>
      `<details class="nav-group"><summary>${label}<svg class="nav-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg></summary><div class="dropdown">${pages.map((p) => `<a href="${link(p.slug)}">${p.title}${arrow}</a>`).join("")}</div></details>`,
  )
  .join("");
const portfolio = data.pages.find((page) => page.slug === "portfolio");
const portfolioNav =
  '<a class="nav-direct" href="' + link("portfolio") + '">포트폴리오</a>';
const housing = data.pages.find((page) => page.slug === "modular-housing");
const models = [
  ["01", "STAY", "39", "체류형 쉼터 S-38", "약 6평형의 체류형 쉼터"],
  ["02", "MODULAR", "55", "모듈러 주택 AP-10", "25평형 모듈러 주택"],
  ["03", "CABIN", "4", "캐빈형 주택 G-54", "10평 캐빈형 이동식주택"],
].map(([number, type, id, title, description]) => {
  const post = housing.posts.find((item) => item.id === id);
  return [
    number,
    type,
    title,
    description,
    post.thumbnail,
    "modular-housing-" + id,
  ];
});
const heroSlides = [
  ["/assets/hero.jpg", "모던 주택 전경", "일상에 여백을.&#10;공간에 가능성을."],
  [
    "/assets/house-secondary.jpg",
    "테라스와 수영장이 있는 주택 전경",
    "좋은 공간에서,&#10;새로운 일상으로.",
  ],
  [
    "/assets/figma/reference-4.jpg",
    "이전 2안 메인에 사용한 숲속 주택 이미지",
    "머무는 순간이,&#10;삶이 되는 집.",
  ],
];
// Reuse the requested comparison, FAQ and contact copy without shortening it.
const legacyHome = new JSDOM(await readFile("templates/home-v1.html", "utf8"))
  .window.document;
const closingContent = [
  ["pricing", "v2-pricing"],
  ["faq", "v2-faq"],
  ["contact", "v2-closing"],
]
  .map(([id, className]) => {
    const section = legacyHome.querySelector("#" + id);
    section.className = className;
    section.querySelectorAll("img").forEach((img) => {
      img.src = img.getAttribute("src").replace("./assets/", "/assets/");
    });
    if (id === "contact")
      section
        .querySelector(".contact-image")
        .classList.add("reveal", "image-reveal");
    return section.outerHTML;
  })
  .join("\n");
const html = `<!doctype html><html lang="ko" data-motion="full"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#272d26"><title>첨단디자인하우스 | 머무는 순간이 삶이 되는 집</title><meta name="description" content="첨단디자인하우스의 모듈러 주택, 체류형 쉼터와 방호 시스템을 만나보세요. 상담 1551-9123."><link rel="icon" href="/assets/favicon.svg"><link rel="preload" as="image" href="/assets/hero.jpg"><link rel="stylesheet" href="/v2/figma.css"><link rel="stylesheet" href="/v2/home.css"><link rel="stylesheet" href="/motion.css"><script type="module" src="/app.js"></script></head><body class="variant-two figma-home"><a class="skip-link" href="#main">본문 바로가기</a>
<header class="site-header"><a class="brand" href="/v2/" aria-label="첨단디자인하우스 홈"><span class="brand-mark">尖</span><span><b>첨단 디자인 하우스</b><small>ADVANCED DESIGN HOUSE</small></span></a><nav id="site-nav" aria-label="주요 메뉴">${nav}${portfolioNav}</nav><a class="header-cta" href="${link("inquiry")}">프로젝트 문의 ${arrow}</a><button id="menu-toggle" class="menu-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="메뉴 열기"><svg class="menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true" focusable="false"><path class="menu-line-one" d="M4 12h16"/><path class="menu-line-two" d="M4 12h16"/></svg></button></header>
<main id="main"><section class="hero original-hero editorial-hero" id="home" data-hero-slideshow aria-label="첨단디자인하우스 소개">${heroSlides.map(([src, alt, caption], index) => `<img class="hero-image hero-slide${index === 0 ? " is-active" : ""}" src="${src}" alt="${alt}" fetchpriority="${index === 0 ? "high" : "low"}" decoding="async" data-caption="${caption}" aria-hidden="${index !== 0}">`).join("")}<div class="hero-shade"></div><div class="hero-content"><p class="hero-kicker">ARCHITECTURE FOR YOUR EVERYDAY</p><h1 class="original-caption" data-hero-caption>일상에 여백을.&#10;공간에 가능성을.</h1><p class="hero-description">머물고 싶은 집, 나만의 쉼터.<br>당신의 일상에 맞는 공간을 만듭니다.</p><div class="hero-actions"><a class="hero-primary" href="#models">공간 둘러보기 ${arrow}</a><a class="hero-secondary" href="${link("inquiry")}">프로젝트 상담 ${arrow}</a></div></div><a class="hero-scroll" href="#portfolio" aria-label="포트폴리오 둘러보기"><span class="scroll-mouse"></span><span>SCROLL TO DISCOVER</span></a><div class="hero-slideshow-controls" hidden aria-label="메인 이미지 선택"><span class="hero-progress" aria-hidden="true"><i></i></span>${heroSlides.map((slide, index) => `<button type="button" data-hero-select="${index}" aria-label="${index + 1}번 이미지: ${slide[1]}" aria-pressed="${index === 0}">0${index + 1}</button>`).join("")}</div></section>
<section class="intro reveal" id="about"><div><p class="section-kicker">OUR PHILOSOPHY</p><h2>집의 시작은,<br><span>당신의 일상입니다.</span></h2></div><div class="intro-copy"><p>매일의 생활을 담는 집부터 주말의 여유를 위한 쉼터까지. 공간의 쓰임에서 출발해 당신에게 맞는 주거를 제안합니다.</p><p>모듈러 주택과 체류형 쉼터, 서로 다른 가능성을 첨단 디자인 하우스에서 만나보세요.</p><a href="${link("company")}">우리의 이야기 ${arrow}</a></div></section>
<section class="living-story" aria-labelledby="living-title"><div class="living-main reveal image-reveal"><a class="drift-scene" href="${link("modular-housing-39")}"><img src="/assets/imported/064acd4cafb316b0e9d1.jpg" width="800" height="450" loading="lazy" alt="S-38 체류형 쉼터의 저녁 외관"><span class="image-caption">S-38 · STAY SHELTER ${arrow}</span></a></div><div class="living-aside"><div class="living-copy reveal"><p class="section-kicker">A LITTLE CLOSER TO LIFE</p><h2 id="living-title">온전히,<br>나를 위한 시간.</h2><p>문을 열면 이어지는 풍경.<br>잠시 쉬어가도, 오래 머물러도 좋은 공간.</p></div><a class="living-detail reveal image-reveal" href="${link("modular-housing-39")}"><div class="drift-scene"><img src="/assets/imported/d24f7e4b87ffd9f46d4d.jpg" width="800" height="435" alt="S-38 쉼터의 주방과 실내 공간" loading="lazy"></div><span>작은 공간에 담은 일상의 편안함 ${arrow}</span></a></div></section>
<section class="model-section" id="models"><div class="section-head reveal"><div><p class="section-kicker">SELECTED MODELS</p><h2>사는 방식에 맞춘 선택</h2></div><p>작은 쉼터부터 일상을 담는 주택까지.</p></div><div class="model-grid">${models.map(([n, type, title, desc, img, slug]) => `<article class="model-card reveal"><a class="model-image-wrap" href="${link(slug)}"><img src="${img}" alt="${title} 원본 제품 이미지" loading="lazy"><span>${n}</span></a><p class="model-type">${type}</p><h3><a href="${link(slug)}">${title}</a></h3><p>${desc}</p><a class="model-detail" href="${link(slug)}" aria-label="${title} 자세히 보기">${arrow}</a></article>`).join("")}</div><p class="model-disclaimer">모델별 이미지와 구성, 상세 사양을 확인해 보세요.</p></section>
<section class="portfolio-section" id="portfolio"><div class="section-head reveal"><div><p class="section-kicker">OUR PORTFOLIO</p><h2>다양한 삶, 다양한 공간</h2></div><a class="portfolio-all" href="${link("portfolio")}">포트폴리오 전체보기 ${arrow}</a></div><div class="portfolio-grid">${portfolio.posts
  .slice(0, 4)
  .map(
    (post, index) =>
      `<article class="portfolio-card reveal"><a href="${link("portfolio-" + post.id)}"><div class="portfolio-image"><img src="/assets/project-${index + 1}.png" width="1536" height="1024" alt="${post.title} 포트폴리오 ${index + 1}" loading="lazy"></div><div class="portfolio-label"><span>0${index + 1}</span><h3>${post.title}</h3>${arrow}</div></a></article>`,
  )
  .join("")}</div></section>
<section class="process" id="process"><div class="process-image reveal image-reveal"><div class="drift-scene"><img src="/assets/imported/5d73455d633d18c68749.jpg" width="800" height="447" alt="AP-10 모듈러 주택의 테라스와 조감도" loading="lazy"></div><span class="process-photo-label">AP-10 / MODULAR HOUSE</span></div><div class="process-content reveal"><p class="section-kicker">HOW WE BUILD</p><h2>생각한 공간이<br>삶이 되기까지.</h2><p class="process-lead">대지를 살피고, 쓰임을 계획하고, 공간을 완성합니다. 첫 상담부터 현장 설치까지 필요한 과정을 함께합니다.</p><ol>${[
  ["01", "상담 및 대지 분석", "예산과 목적, 설치 환경을 세심하게 확인합니다."],
  [
    "02",
    "맞춤 설계 및 제작",
    "취향을 반영한 설계 후 전문 공정에서 제작합니다.",
  ],
  ["03", "운송 및 현장 설치", "안전하게 운송하고 빠르고 정확하게 설치합니다."],
]
  .map(
    ([n, t, d]) =>
      `<li><span>${n}</span><div><b>${t}</b><p>${d}</p></div></li>`,
  )
  .join("")}</ol></div></section>
<section class="v2-evidence reveal"><div><p class="section-kicker">BUILT FOR TRUST</p><h2>좋은 선택에는<br>분명한 기준이 있습니다.</h2></div><div class="evidence-links"><a href="${link("history")}"><span>OUR HISTORY</span><strong>연혁</strong>${arrow}</a><a href="${link("certificates")}"><span>CERTIFICATION</span><strong>인증현황</strong>${arrow}</a><a href="${link("videos")}"><span>IN MOTION</span><strong>동영상</strong>${arrow}</a></div></section>
${closingContent}</main>
<footer class="v2-footer"><a class="footer-brand" href="/v2/" aria-label="첨단디자인하우스 홈"><span class="brand-mark">尖</span><div><b>첨단 디자인 하우스</b><p>CHEOMDAN DESIGN HOUSE</p></div></a><div class="footer-info"><p>첨단정보시스템 주식회사 · 사업자등록번호 560-87-02627</p><p>회사: 경기도 하남시 검단산로 239, 6층(하남시 벤처집적시설)<br>공장: 경기도 남양주시 진접읍 부평리 430-7</p><p><a href="tel:15519123">1551-9123</a> · <a href="mailto:dearceo@naver.com">dearceo@naver.com</a></p></div><div><p class="copyright">© CHEOMDAN DESIGN HOUSE. ALL RIGHTS RESERVED.</p><a class="back-top" href="#home">BACK TO TOP ↑</a><div class="proposal-links"><a href="/v2/">2안 보기 ↗</a><a href="https://map.naver.com/p/search/경기도%20남양주시%20진접읍%20부평리%20430-7" target="_blank" rel="noopener noreferrer">공장 찾아오시는 길 ↗</a><a href="${link("email-policy")}">이메일수집거부</a><a href="${link("privacy")}">개인정보처리방침</a></div></div></footer></body></html>`;
await mkdir("v2", { recursive: true });
await writeFile("templates/home-v2.html", html);
await writeFile("v2/index.html", html);
console.log("Figma-based proposal 2 homepage generated.");
