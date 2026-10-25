const board = document.querySelector(".board");
if (board) {
  const cards = [...board.querySelectorAll("[data-board-card]")];
  const input = document.querySelector("#search-input");
  const pagination = document.querySelector("#board-pagination");
  const pageSize = 12;
  function render({ query = "", page = 1 }, updateUrl = false) {
    const term = query.trim().toLocaleLowerCase();
    const matches = cards.filter((card) =>
      card.dataset.title.toLocaleLowerCase().includes(term),
    );
    const count = Math.max(1, Math.ceil(matches.length / pageSize));
    const current = Math.max(1, Math.min(Number(page) || 1, count));
    cards.forEach((card) => {
      card.hidden = true;
    });
    matches
      .slice((current - 1) * pageSize, current * pageSize)
      .forEach((card) => {
        card.hidden = false;
      });
    input.value = query;
    document.querySelector("#board-count").textContent = term
      ? `검색 결과 ${matches.length}건 / 전체 ${cards.length}건`
      : `전체 ${cards.length}건`;
    document.querySelector("#board-empty").hidden = matches.length !== 0;
    pagination.replaceChildren();
    if (matches.length > pageSize)
      for (let number = 1; number <= count; number++) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = String(number);
        button.setAttribute("aria-label", `${number} 페이지`);
        if (number === current) button.setAttribute("aria-current", "page");
        button.addEventListener("click", () => {
          render({ query, page: number }, true);
          board.scrollIntoView({ block: "start" });
        });
        pagination.append(button);
      }
    if (updateUrl) {
      const url = new URL(location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      if (current > 1) url.searchParams.set("page", String(current));
      else url.searchParams.delete("page");
      history.pushState({}, "", url);
    }
  }
  function restore() {
    const params = new URLSearchParams(location.search);
    render({ query: params.get("q") || "", page: params.get("page") || 1 });
  }
  document
    .querySelector("#board-search")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      render({ query: input.value }, true);
    });
  document
    .querySelector("#reset-search")
    .addEventListener("click", () => render({}, true));
  input.addEventListener("search", () => {
    if (!input.value) render({}, true);
  });
  window.addEventListener("popstate", restore);
  restore();
}

const viewer = document.querySelector("#media-viewer");
if (viewer) {
  document.querySelectorAll("[data-article-image]").forEach((button) =>
    button.addEventListener("click", () => {
      const image = button.querySelector("img");
      const output = document.querySelector("#media-image");
      output.src = image.src;
      output.alt = image.alt;
      document.querySelector("#media-caption").textContent = image.alt;
      viewer.showModal();
    }),
  );
  document
    .querySelector("#media-close")
    .addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", (event) => {
    if (event.target !== viewer) return;
    const rect = viewer.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      viewer.close();
  });
}
const inquiry = document.querySelector("#inquiry-form");
if (inquiry)
  inquiry.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!inquiry.reportValidity()) return;
    const fields = new FormData(inquiry);
    const subject = `[${fields.get("category")}] ${fields.get("subject")}`;
    const body = `이름: ${fields.get("name")}\n이메일: ${fields.get("email")}\n홈페이지: ${fields.get("website") || "-"}\n제품 분류: ${fields.get("category")}\n\n${fields.get("message")}`;
    location.href = `mailto:dearceo@naver.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.querySelector("#inquiry-status").textContent =
      "이메일 앱에서 내용을 확인한 뒤 보내기를 눌러 주세요. 아직 홈페이지에 접수된 상태는 아닙니다.";
  });
