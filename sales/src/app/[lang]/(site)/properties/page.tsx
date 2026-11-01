import type { Metadata } from "next";
import Link from "next/link";
import { publicListings } from "@/lib/data";
import { MUST_HAVES } from "@/lib/rules";
import { fmt, href, isLang, type Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/translate";
import { DbNotice, ExpertCard, Icon, ListingRow, SiteFooter, SiteHeader } from "@/components/site";
import { BriefForm } from "@/components/brief-form";
import { MustHaveChips } from "@/components/must-haves";
import { FEW_LISTINGS } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

type Params = Promise<{ lang: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const L = (s: string): Lang => (isLang(s) ? s : "en");

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getDict(L((await params).lang));
  return { title: t.list.title };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function Properties({ params, searchParams }: { params: Params; searchParams: SP }) {
  const lang = L((await params).lang);
  const sp = await searchParams;
  const [t, res] = await Promise.all([getDict(lang), publicListings()]);
  const all = res.ok ? res.data : [];
  // Few listings: no filters, which would mostly lead to empty pages (design critique, 30 Oct 2026).
  const showFilters = all.length >= FEW_LISTINGS;
  const areas = [...new Set(all.map((l) => l.area))].sort();
  const area = one(sp.area);
  const [lo, hi] = one(sp.price).split("-").map((x) => (x ? Number(x) * 1e6 : null));
  const beds = Number(one(sp.beds)) || 0;
  // ?licence=1 is the home page's "licensed villas" link.
  const must = MUST_HAVES.filter((m) => one(sp[`m_${m.key}`]) === "on" || (m.key === "licence" && one(sp.licence) === "1"));
  const sort = one(sp.sort) || "price";

  let list = all.filter(
    (l) =>
      (!area || l.area === area) &&
      (!beds || (l.legalBedrooms ?? l.bedrooms) >= beds) &&
      (lo === null || lo === undefined || (l.askingPrice ?? Infinity) >= lo) &&
      (hi === null || hi === undefined || (l.askingPrice ?? 0) <= hi) &&
      must.every((m) => m.match(l)),
  );
  if (sort === "price-desc") list = [...list].sort((a, b) => (b.askingPrice ?? 0) - (a.askingPrice ?? 0));
  else if (sort === "new") list = [...list].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  const updated = all.map((l) => l.updatedAt ?? "").sort().at(-1);
  const updatedLabel = updated ? `${MONTHS[new Date(updated).getUTCMonth()]} ${new Date(updated).getUTCFullYear()}` : null;
  const Li = t.list;

  return (
    <>
      <SiteHeader t={t} lang={lang} current="properties" />
      <main id="main">
        <section className="page-head">
          <div className="wrap">
            <div className="page-head__top">
              <div>
                <p className="eyebrow">{Li.eyebrow}</p>
                <h1>{Li.title}</h1>
                <p className="lede">{Li.lead}</p>
              </div>
              <div className="page-head__meta">
                {res.ok ? <span><strong>{list.length}</strong> {fmt(Li.ofShown, { total: all.length })}</span> : null}
                <span>{Li.addressesShort}</span>
                {updatedLabel ? <span>{fmt(Li.updated, { month: updatedLabel })}</span> : null}
              </div>
            </div>
          </div>
        </section>

        {showFilters ? (
          <div className="filter-bar">
            <div className="wrap">
              <form aria-label={Li.filterAria}>
                <div className="filter-bar__row">
                  <select className="filter-select" name="area" defaultValue={area} aria-label={t.search.area}>
                    <option value="">{t.search.anywhere}</option>
                    {areas.map((a) => <option key={a}>{a}</option>)}
                  </select>
                  <select className="filter-select" name="beds" defaultValue={one(sp.beds)} aria-label={t.search.bedrooms}>
                    <option value="">{t.search.anyBedrooms}</option><option value="4">4+</option><option value="5">5+</option><option value="6">6+</option><option value="7">7+</option>
                  </select>
                  <select className="filter-select" name="price" defaultValue={one(sp.price)} aria-label={t.search.budget}>
                    <option value="">{t.search.anyPrice}</option><option value="0-5">{t.search.upTo5}</option><option value="5-10">{t.search.from5to10}</option><option value="10-">{t.search.over10}</option>
                  </select>
                  <select className="filter-select" name="sort" defaultValue={sort} aria-label={Li.sortBy}>
                    <option value="price">{Li.priceLow}</option><option value="price-desc">{Li.priceHigh}</option><option value="new">{Li.newest}</option>
                  </select>
                  <button className="btn btn--small" type="submit">{Li.show}</button>
                  <Link className="filter-clear" href={href(lang, "/properties")}>{Li.clear}</Link>
                  <div className="filter-bar__spacer" />
                  <span className="filter-count"><strong>{list.length}</strong> {list.length === 1 ? Li.home : Li.homes}</span>
                </div>
                <MustHaveChips t={t} legend={Li.mustHaves} selected={must.map((m) => m.key)} />
              </form>
            </div>
          </div>
        ) : null}

        <section className="results results--sales">
          <div className="wrap">
            {!res.ok ? (
              <DbNotice reason={res.reason} t={t} />
            ) : list.length ? (
              <div className="results__grid results__grid--one">{list.map((l, i) => <ListingRow key={l.uuid} t={t} lang={lang} l={l} eager={i < 2} />)}</div>
            ) : (
              <div className="results__empty">
                <h3>{Li.nothingTitle}</h3>
                <p className="lede" style={{ marginInline: "auto" }}>{Li.nothing}</p>
                <a className="btn btn--ghost" href="#brief" style={{ marginTop: 24 }}>{t.nav.sendBrief}</a>
              </div>
            )}
          </div>
        </section>

        <section id="brief" className="section section--sand section--tight">
          <div className="wrap">
            <div className="brief-layout">
              <div>
                <p className="eyebrow">{t.brief.eyebrow}</p>
                <h2>{t.brief.offMarketTitle}</h2>
                <p>{t.brief.lead}</p>
                <ul className="tick-list">
                  {[t.home.tick1, t.home.tick2, t.home.tick3].map((x) => <li key={x}><Icon.tick />{x}</li>)}
                </ul>
              </div>
              <div className="brief-card">
                <p className="eyebrow eyebrow--plain">{t.brief.title}</p>
                <BriefForm t={t} lang={lang} compact error={one(sp.error) === "brief"} />
              </div>
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="wrap"><ExpertCard t={t} lang={lang} /></div>
        </section>
      </main>
      <SiteFooter t={t} lang={lang} />
    </>
  );
}

