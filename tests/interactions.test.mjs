import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.body.className = "";
  document.body.innerHTML = readFileSync(resolve("v1/index.html"), "utf8");
  await import("../app.js");
});

it("모바일 메뉴를 열고 이동하면 메뉴가 닫힌다", () => {
  const button = document.querySelector("#menu-toggle");
  button.click();
  expect(button.getAttribute("aria-expanded")).toBe("true");
  document.querySelector('#site-nav a[href="#collection"]').click();
  expect(button.getAttribute("aria-expanded")).toBe("false");
});

it("체류형쉼터를 선택하면 해당 주택만 보여준다", () => {
  document.querySelector('[data-filter="shelter"]').click();
  const visible = [...document.querySelectorAll("[data-project]")].filter(
    (card) => !card.hidden,
  );
  expect(visible).toHaveLength(1);
  expect(visible[0].dataset.category).toBe("shelter");
  expect(document.querySelector("#filter-status").textContent).toContain("1");
  document.querySelector('[data-filter="all"]').click();
  expect(
    [...document.querySelectorAll("[data-project]")].every(
      (card) => !card.hidden,
    ),
  ).toBe(true);
});

it("화면 테마를 전환하고 버튼 상태를 알려준다", () => {
  const button = document.querySelector("#theme-toggle");
  button.click();
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(button.getAttribute("aria-pressed")).toBe("true");
  button.click();
  expect(document.documentElement.dataset.theme).toBe("light");
});

it("사진 확대 시 선택한 주택 이미지와 이름을 전달한다", () => {
  const dialog = document.querySelector("#project-dialog");
  dialog.showModal = vi.fn();
  document.querySelector("[data-open-project]").click();
  expect(dialog.showModal).toHaveBeenCalledOnce();
  expect(document.querySelector("#dialog-title").textContent).toBe(
    "테라스가 있는 일상",
  );
  expect(document.querySelector("#dialog-image").getAttribute("src")).toBe(
    "/assets/project-1.png",
  );
});

it("모든 내부 이동과 상담 링크가 실제 목적지를 가진다", () => {
  for (const link of document.querySelectorAll('a[href^="#"]')) {
    expect(document.querySelector(link.getAttribute("href"))).not.toBeNull();
  }
  expect(
    document.querySelectorAll('a[href="tel:15519123"]').length,
  ).toBeGreaterThan(0);
  expect(
    document.querySelector('a[href^="mailto:dearceo@naver.com"]'),
  ).not.toBeNull();
});
