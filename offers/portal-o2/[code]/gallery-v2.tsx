"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoGroup } from "@/lib/photo-order";

/**
 * The gallery of the v2 villa page, the same as the sales site's: five photos in the grid (large one left), "Show
 * all N photos" and every photo (max 40, grouped by room) in a lightbox with arrows and keys. Captions name the room.
 */
export function GalleryV2({ groups, name, label }: { groups: PhotoGroup[]; name: string; label: string }) {
  const all = groups.flatMap((g) => g.photos.map((src) => ({ src, room: g.label })));
  const shown = all.slice(0, 5);
  const [index, setIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (index === null) {
      if (d.open) d.close();
      return;
    }
    if (!d.open) d.showModal();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : (i + 1) % all.length));
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : (i - 1 + all.length) % all.length));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, all.length]);

  if (!all.length) return null;
  const caption = (i: number) => `${name} · ${all[i].room} · ${i + 1}/${all.length}`;
  return (
    <>
      <div className="gallery">
        {shown.map((p, i) => (
          <button key={p.src} className={`gallery__item${i === 0 ? " gallery__item--main" : ""}`} type="button" onClick={() => setIndex(i)} aria-label={caption(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={`${name}, ${p.room.toLowerCase()}`} loading={i ? "lazy" : "eager"} />
          </button>
        ))}
        {all.length > 5 && (
          <button type="button" className="gallery__all" onClick={() => setIndex(5)}>{label.replace("{n}", String(all.length))}</button>
        )}
      </div>
      <dialog ref={ref} className="lightbox" aria-label={name} onClose={() => setIndex(null)} onClick={(e) => { if (e.target === e.currentTarget) setIndex(null); }}>
        {index !== null && (
          <>
            <div className="lightbox__top">
              <span>{all[index].room} · {index + 1} / {all.length}</span>
              <button className="lightbox__close" type="button" onClick={() => setIndex(null)}>Close</button>
            </div>
            <div className="lightbox__stage">
              <button className="lightbox__btn lightbox__btn--prev" type="button" aria-label="Previous photo" onClick={() => setIndex((index - 1 + all.length) % all.length)}>←</button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={all[index].src} alt={`${name}, ${all[index].room.toLowerCase()}`} />
              <button className="lightbox__btn lightbox__btn--next" type="button" aria-label="Next photo" onClick={() => setIndex((index + 1) % all.length)}>→</button>
            </div>
            <div className="lightbox__foot"><span>{name}</span><span>← → · Esc</span></div>
          </>
        )}
      </dialog>
    </>
  );
}
