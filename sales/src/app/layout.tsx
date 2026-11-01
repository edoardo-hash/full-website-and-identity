import type { Metadata } from "next";
import { headers } from "next/headers";
import { isLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { default: "Invenio Homes Sales", template: "%s — Invenio Homes Sales" },
  // Hidden from search engines until launch: set SITE_INDEX=1 on the production project only (review 1 Nov 2026).
  robots: process.env.SITE_INDEX === "1" ? { index: true, follow: true } : { index: false, follow: false },
  icons: { icon: [{ url: "/assets/img/favicon.svg", type: "image/svg+xml" }, { url: "/assets/img/favicon-32.png", sizes: "32x32", type: "image/png" }], apple: "/assets/img/apple-touch-icon.png" },
};

/** Pages that open on a full-bleed photo: the header starts transparent over it (body[data-hero], as on the company site). */
const HERO_PAGES = new Set(["/", "/sell"]);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const lang = isLang(h.get("x-lang")) ? h.get("x-lang")! : "en";
  const path = (h.get("x-path") || "/").replace(/^\/(es|it|nl)(?=\/|$)/, "") || "/";
  const hero = HERO_PAGES.has(path.replace(/\/$/, "") || "/");
  return (
    <html lang={lang}>
      <body data-hero={hero ? "true" : undefined}>{children}</body>
    </html>
  );
}
