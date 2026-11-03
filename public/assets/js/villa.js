/* Villa pages: the photo grid opens a lightbox (<dialog>) with every photo, arrows and keys to browse. */
(() => {
  "use strict";
  const box = document.querySelector("[data-lightbox]");
  if (!box || typeof box.showModal !== "function") return;
  let photos = [];
  try { photos = JSON.parse(box.dataset.photos || "[]"); } catch { photos = []; }
  if (!photos.length) return;
  const img = box.querySelector("[data-img]");
  const count = box.querySelector("[data-count]");
  const name = box.dataset.name || "";
  let i = 0;
  const show = (n) => {
    i = (n + photos.length) % photos.length;
    img.src = photos[i];
    img.alt = `${name}, photo ${i + 1} of ${photos.length}`;
    count.textContent = `${i + 1} / ${photos.length}`;
    const next = new Image();
    next.src = photos[(i + 1) % photos.length];
  };
  document.querySelectorAll("[data-gallery] [data-photo]").forEach((b) => {
    b.addEventListener("click", () => { show(Number(b.dataset.photo) || 0); box.showModal(); });
  });
  box.querySelector("[data-prev]").addEventListener("click", () => show(i - 1));
  box.querySelector("[data-next]").addEventListener("click", () => show(i + 1));
  box.querySelector("[data-close]").addEventListener("click", () => box.close());
  box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
  document.addEventListener("keydown", (e) => {
    if (!box.open) return;
    if (e.key === "ArrowRight") show(i + 1);
    if (e.key === "ArrowLeft") show(i - 1);
  });
})();
