const menuButton = document.querySelector("#menu-toggle");
const navigation = document.querySelector("#site-nav");
function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "메뉴 열기");
  navigation.classList.remove("is-open");
  navigation.querySelectorAll(".nav-group").forEach((group) => {
    group.open = false;
  });
}
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  navigation.classList.toggle("is-open", open);
});
navigation
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));

navigation.querySelectorAll(".nav-group").forEach((group) => {
  group.querySelector("summary").addEventListener("click", () => {
    if (!group.open)
      navigation.querySelectorAll(".nav-group").forEach((other) => {
        if (other !== group) other.open = false;
      });
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});

const themeButton = document.querySelector("#theme-toggle");
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton?.setAttribute("aria-pressed", String(theme === "dark"));
  themeButton?.setAttribute(
    "aria-label",
    theme === "dark" ? "라이트 모드" : "다크 모드",
  );
}
try {
  const saved = localStorage.getItem("cheomdan-theme");
  setTheme(
    saved === "dark" || saved === "light"
      ? saved
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
  );
} catch {
  setTheme("light");
}
themeButton?.addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(theme);
  try {
    localStorage.setItem("cheomdan-theme", theme);
  } catch {
    /* Storage is optional. */
  }
});

const filters = document.querySelectorAll("[data-filter]");
const projects = document.querySelectorAll("[data-project]");
filters.forEach((button) =>
  button.addEventListener("click", () => {
    filters.forEach((filter) =>
      filter.setAttribute("aria-pressed", String(filter === button)),
    );
    let count = 0;
    projects.forEach((card) => {
      card.hidden =
        button.dataset.filter !== "all" &&
        button.dataset.filter !== card.dataset.category;
      if (!card.hidden) {
        count++;
        card.classList.remove("reveal-pending");
        card.classList.add("is-visible");
      }
    });
    document.querySelector("#filter-status").textContent = `${count}개의 공간`;
  }),
);

const dialog = document.querySelector("#project-dialog");
document.querySelectorAll("[data-open-project]").forEach((button) =>
  button.addEventListener("click", () => {
    const source = button.querySelector("img");
    const image = document.querySelector("#dialog-image");
    image.src = source.getAttribute("src");
    image.alt = source.alt;
    document.querySelector("#dialog-title").textContent = button.dataset.title;
    dialog.showModal();
  }),
);
document
  .querySelector("#dialog-close")
  ?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close();
});

const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const heroSlideshow = document.querySelector("[data-hero-slideshow]");
if (heroSlideshow) {
  const slides = [...heroSlideshow.querySelectorAll(".hero-slide")];
  const selectors = heroSlideshow.querySelectorAll("[data-hero-select]");
  const caption = heroSlideshow.querySelector("[data-hero-caption]");
  const progress = heroSlideshow.querySelector(".hero-progress i");
  let current = 0;
  let timer;
  let fadeTimer;

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => show((current + 1) % slides.length), 9000);
  }

  function show(index) {
    const next = slides[index];
    if (index !== current && next.complete && next.naturalWidth > 0) {
      heroSlideshow.classList.add("has-transitioned");
      clearTimeout(fadeTimer);
      slides.forEach((slide) => slide.classList.remove("is-leaving"));
      slides[current].classList.add("is-leaving");
      current = index;
      slides.forEach((slide, position) => {
        slide.classList.toggle("is-active", position === current);
        slide.setAttribute("aria-hidden", String(position !== current));
      });
      selectors.forEach((button, position) =>
        button.setAttribute("aria-pressed", String(position === current)),
      );
      if (caption) {
        caption.textContent = next.dataset.caption;
        caption.getAnimations?.().forEach((animation) => {
          animation.cancel();
          animation.play();
        });
      }
      fadeTimer = setTimeout(() => {
        slides.forEach((slide) => slide.classList.remove("is-leaving"));
      }, 1100);
    }
    progress?.getAnimations?.().forEach((animation) => {
      animation.cancel();
      animation.play();
    });
    schedule();
  }

  selectors.forEach((button) =>
    button.addEventListener("click", () =>
      show(Number(button.dataset.heroSelect)),
    ),
  );
  heroSlideshow.querySelector(".hero-slideshow-controls").hidden = false;
  heroSlideshow.classList.add("is-ready");
  schedule();
}
if (document.body.classList.contains("variant-two")) {
  const targets = document.querySelectorAll(
    ".board-card, .timeline-entry, .company-intro, .inquiry-info, .inquiry-form, .page-cta, .post-meta, .article-image, .rich-content > p, .rich-content > h2, .rich-content > h3, .rich-content > figure, .rich-content > table, .rich-content > ul, .process ol li, .evidence-links > a, .contact > h2, .contact-actions",
  );
  targets.forEach((element) => {
    if (
      !element.parentElement.closest(".reveal, .timeline-entry, .company-intro")
    )
      element.classList.add("reveal");
  });
  document
    .querySelectorAll(".board-card, .model-card, .portfolio-card")
    .forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${(index % 3) * 90}ms`);
    });
}
let observer;
const forceMotion =
  Boolean(heroSlideshow) || document.body.classList.contains("variant-two");
function applyMotion(reduce = reducedMotion?.matches) {
  const enabled = forceMotion || !reduce;
  document.documentElement.dataset.motion = enabled ? "full" : "reduced";
  observer?.disconnect();
  document.querySelectorAll(".reveal").forEach((element) => {
    element.classList.remove("reveal-pending");
    element.classList.add("is-visible");
  });
  if (!enabled || !("IntersectionObserver" in window)) return;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("reveal-pending");
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px -35px 0px" },
  );
  document.querySelectorAll(".reveal").forEach((element) => {
    element.classList.remove("is-visible");
    element.classList.add("reveal-pending");
    observer.observe(element);
  });
}
applyMotion();
// Keep slow editorial image movement active only while the scene is visible.
const scenes = document.querySelectorAll(".drift-scene");
if ("IntersectionObserver" in window && scenes.length) {
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) =>
        entry.target.classList.toggle("is-inview", entry.isIntersecting),
      );
    },
    { rootMargin: "50px" },
  );
  scenes.forEach((scene) => sceneObserver.observe(scene));
} else {
  scenes.forEach((scene) => scene.classList.add("is-inview"));
}
if (!forceMotion)
  reducedMotion?.addEventListener?.("change", (event) =>
    applyMotion(event.matches),
  );
