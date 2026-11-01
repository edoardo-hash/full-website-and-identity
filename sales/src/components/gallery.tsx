"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The company site's gallery and lightbox: up to five photos in the grid, each opening the lightbox (a <dialog>),
 * arrows and keys to browse. Only the public photos are ever in the page: the rest come after registration.
 */
export function Gallery({ photos, alts, note, close }: { photos: string[]; alts: string[]; note?: string; close: string }) {
  const alt = (n: number) => alts[n - 1] ?? "";
  const [index, setIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const shown = photos.slice(0, 5);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (index === null) {
      if (d.open) d.close();
      return;
    }
    if (!d.open) d.showModal();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : (i + 1) % shown.length));
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : (i - 1 + shown.length) % shown.length));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, shown.length]);

  return (
    <>
      <div className="gallery gallery--sales">
        {shown.map((src, i) => (
          <button key={src} className={`gallery__item${i === 0 ? " gallery__item--main" : ""}`} type="button" onClick={() => setIndex(i)} aria-label={`${alt(i + 1)} (${i + 1}/${shown.length})`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt(i + 1)} loading={i ? "lazy" : "eager"} width="1600" height="1200" />
          </button>
        ))}
        {note ? <span className="gallery__all">{note}</span> : null}
      </div>
      <dialog ref={ref} className="lightbox" aria-label="Gallery" onClose={() => setIndex(null)} onClick={(e) => { if (e.target === e.currentTarget) setIndex(null); }}>
        {index !== null ? (
          <>
            <div className="lightbox__top">
              <span>{index + 1} / {shown.length}</span>
              <button className="lightbox__close" type="button" onClick={() => setIndex(null)}>{close}</button>
            </div>
            <div className="lightbox__stage">
              {shown.length > 1 ? <button className="lightbox__btn lightbox__btn--prev" type="button" aria-label="Previous photo" onClick={() => setIndex((index - 1 + shown.length) % shown.length)}>←</button> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown[index]} alt={alt(index + 1)} />
              {shown.length > 1 ? <button className="lightbox__btn lightbox__btn--next" type="button" aria-label="Next photo" onClick={() => setIndex((index + 1) % shown.length)}>→</button> : null}
            </div>
            <div className="lightbox__foot"><span>{alt(index + 1)}</span><span>← → · Esc</span></div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
