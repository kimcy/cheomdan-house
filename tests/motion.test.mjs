import { readFileSync } from "node:fs";
import { beforeEach, afterEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  localStorage.clear();
  document.body.className = "variant-two";
  document.body.innerHTML = readFileSync("index.html", "utf8");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("기본 주소에 2안과 내부 메뉴를 적용한다", async () => {
  await import("../app.js");
  expect(document.querySelector(".hero-image")).not.toBeNull();
  expect(document.querySelector(".brand").getAttribute("href")).toBe("/");
  const button = document.querySelector("#menu-toggle");
  button.click();
  expect(button.getAttribute("aria-expanded")).toBe("true");
  document.querySelector('#site-nav a[href="/pages/history.html"]').click();
  expect(button.getAttribute("aria-expanded")).toBe("false");
});

it("스크롤로 들어온 콘텐츠를 애니메이션 후 표시한다", async () => {
  let intersect;
  const disconnect = vi.fn();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(fn) {
        if (!intersect) intersect = fn;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnect;
    },
  );
  await import("../app.js");
  const section = document.querySelector(".intro");
  expect(section.classList.contains("reveal-pending")).toBe(true);
  intersect([{ target: section, isIntersecting: true }]);
  expect(section.classList.contains("is-visible")).toBe(true);
  expect(section.classList.contains("reveal-pending")).toBe(false);
  expect(document.documentElement.dataset.motion).toBe("full");
});

it("동작 줄이기와 이전 끄기 설정이 있어도 2안은 항상 모션을 실행한다", async () => {
  const observe = vi.fn();
  localStorage.setItem("cheomdan-motion", "reduced");
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  await import("../app.js");
  expect(observe).toHaveBeenCalled();
  expect(document.documentElement.dataset.motion).toBe("full");
  expect(document.querySelector(".reveal-pending")).not.toBeNull();
  expect(document.querySelector(".motion-toggle")).toBeNull();
});

it("원본 배경과 문구가 9초마다 전환되고 직접 선택 후에도 반복한다", async () => {
  const slides = [...document.querySelectorAll(".hero-slide")];
  expect(slides).toHaveLength(3);
  slides.forEach((slide) => {
    Object.defineProperty(slide, "complete", { value: true });
    Object.defineProperty(slide, "naturalWidth", { value: 1920 });
  });
  await import("../app.js");
  expect(slides[0].getAttribute("src")).toBe("/assets/hero.jpg");
  vi.advanceTimersByTime(9000);
  expect(slides[1].classList.contains("is-active")).toBe(true);
  expect(document.querySelector("[data-hero-caption]").textContent).toBe(
    slides[1].dataset.caption,
  );
  document.querySelector('[data-hero-select="0"]').click();
  expect(slides[0].classList.contains("is-active")).toBe(true);
  vi.advanceTimersByTime(9000);
  expect(slides[1].classList.contains("is-active")).toBe(true);
  document.querySelector('[data-hero-select="2"]').click();
  expect(slides[2].classList.contains("is-active")).toBe(true);
  expect(document.querySelector("[data-hero-caption]").textContent).toBe(
    slides[2].dataset.caption,
  );
  vi.advanceTimersByTime(9000);
  expect(slides[0].classList.contains("is-active")).toBe(true);
});

it("다음 이미지가 로드되지 않으면 빈 화면으로 전환하지 않는다", async () => {
  await import("../app.js");
  vi.advanceTimersByTime(18000);
  expect(
    document.querySelector(".hero-slide.is-active").getAttribute("src"),
  ).toBe("/assets/hero.jpg");
});
