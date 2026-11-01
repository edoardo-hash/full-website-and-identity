/* Private villa selection (client offer pages) */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header ------------------------------------------------------------- */
  const header = $("[data-header]");
  if (header) {
    const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Reveal ------------------------------------------------------------- */
  const revealEls = $$(".reveal");
  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    const groups = new Map();
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      const position = groups.get(parent) || 0;
      groups.set(parent, position + 1);
      el.style.setProperty("--d", `${Math.min(position * 70, 280)}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* Gallery + lightbox ------------------------------------------------- */
  const lightbox = $("[data-lightbox]");
  const galleryEl = $("#villa-gallery");
  let photos = [];
  if (galleryEl) {
    try {
      photos = JSON.parse(galleryEl.textContent || "[]");
    } catch {
      photos = [];
    }
  }

  let index = 0;
  let trigger = null;

  const paint = () => {
    if (!lightbox || !photos.length) return;
    const item = photos[index];
    const image = $("[data-lightbox-img]", lightbox);
    image.src = item.src;
    image.alt = item.alt || "";
    $("[data-lightbox-count]", lightbox).textContent = `${index + 1} / ${photos.length}`;
    $("[data-lightbox-caption]", lightbox).textContent = item.caption || "";
  };

  const open = (i, el) => {
    if (!lightbox || !photos.length) return;
    index = Math.max(0, Math.min(Number(i) || 0, photos.length - 1));
    trigger = el || null;
    paint();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    body.classList.add("lightbox-open");
    $("[data-lightbox-close]", lightbox).focus();
  };

  const close = () => {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    body.classList.remove("lightbox-open");
    if (trigger) trigger.focus();
  };

  const step = (delta) => {
    if (!photos.length) return;
    index = (index + delta + photos.length) % photos.length;
    paint();
  };

  $$("[data-gallery-open]").forEach((el) => {
    el.addEventListener("click", () => open(Number(el.dataset.galleryOpen) || 0, el));
  });
  $$("[data-gallery-start]").forEach((el) => {
    el.addEventListener("click", () => open(Number(el.dataset.galleryStart) || 0, el));
  });

  if (lightbox) {
    $("[data-lightbox-close]", lightbox).addEventListener("click", close);
    $("[data-lightbox-prev]", lightbox).addEventListener("click", () => step(-1));
    $("[data-lightbox-next]", lightbox).addEventListener("click", () => step(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });
    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    });
  }
})();
