import Link from "next/link";
import { href, isLang, type Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/translate";
import { Arrow, SiteFooter, SiteHeader } from "@/components/site";

export const dynamic = "force-dynamic";
const L = (s: string): Lang => (isLang(s) ? s : "en");

export default async function Thanks({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const lang = L((await params).lang);
  const sp = await searchParams;
  const t = await getDict(lang);
  const T = t.thanks;
  const [h, p] = sp.offline
    ? [T.offlineTitle, T.offlineText]
    : sp.kind === "enquiry"
      ? [T.enquiryTitle, T.enquiryText]
      : sp.kind === "valuation"
        ? [T.valuationTitle, T.valuationText]
        : [T.briefTitle, T.briefText];
  return (
    <>
      <SiteHeader t={t} lang={lang} />
      <main id="main" className="wrap thanks">
        <p className="eyebrow">{t.home.eyebrow}</p>
        <h1>{h}</h1>
        <p className="lede">{p}</p>
        <div className="btn-row">
          <Link className="btn" href={href(lang, "/properties")}>{T.back}<Arrow /></Link>
          <Link className="btn btn--ghost" href={href(lang, "/")}>{T.home}</Link>
        </div>
      </main>
      <SiteFooter t={t} lang={lang} />
    </>
  );
}
