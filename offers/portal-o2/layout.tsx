import type { ReactNode } from "react";

/** Fonts of the v2 client offer pages (Cormorant Garamond + Jost), loaded only under /o2. */
export default function OfferV2Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400;500&display=swap" />
      {children}
    </>
  );
}
