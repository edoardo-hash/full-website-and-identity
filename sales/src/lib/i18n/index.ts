export const LANGS = ["en", "es", "it", "nl"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAMES: Record<Lang, string> = { en: "English", es: "Español", it: "Italiano", nl: "Nederlands" };
export const LANG_ENGLISH: Record<Lang, string> = { en: "English", es: "Spanish (Spain)", it: "Italian", nl: "Dutch" };
export const isLang = (s: string | undefined | null): s is Lang => !!s && (LANGS as readonly string[]).includes(s);

/** English stays at the plain URLs; the other languages live under /es, /it, /nl. */
export const href = (lang: Lang, path: string) => (lang === "en" ? path : `/${lang}${path === "/" ? "" : path}`);

/** Fills {name} placeholders. */
export const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
