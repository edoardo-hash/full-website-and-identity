import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { href, isLang, LANGS } from "@/lib/i18n";
import "@/app/globals.css";

/**
 * Canonical and hreflang for every public page (review 1 Nov 2026), on SITE_URL (the sales site's own address, e.g.
 * https://sales.inveniohomes.com). Without SITE_URL, the address the page was opened on.
 */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const h = await headers();
  const base = (process.env.SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "localhost"}`).replace(/\/+$/, "");
  const path = h.get("x-path") || "/";
  const languages = Object.fromEntries(LANGS.map((l) => [l, href(l, path)]));
  return { metadataBase: new URL(base), alternates: { canonical: href(lang, path), languages: { ...languages, "x-default": href("en", path) } } };
}

/** Only en (rewritten from the plain URLs), es, it and nl exist. */
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <>
      <link rel="preload" href="/assets/fonts/cormorant-garamond-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/assets/fonts/jost-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      <meta name="theme-color" content="#f6f1e7" />
      {children}
    </>
  );
}
