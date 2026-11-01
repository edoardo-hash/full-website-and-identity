import type { Metadata } from "next";
import Link from "next/link";
import { publicListings } from "@/lib/data";
import { fmt, href, isLang, type Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/translate";
import { Arrow, COMPANY_SITE, DbNotice, ExpertCard, firstSentence, Icon, ListingCard, listingPrice, listingTitle, SiteFooter, SiteHeader, Specs, whatsapp } from "@/components/site";
import { BriefForm } from "@/components/brief-form";
import { Em } from "@/components/em";
import { FEW_LISTINGS, SEARCH_FORM_FROM } from "@/lib/catalogue";

export const dynamic = "force-dynamic";
type Params = Promise<{ lang: string }>;
const L = (s: string): Lang => (isLang(s) ? s : "en");

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getDict(L((await params).lang));
  return { title: { absolute: `${t.meta.title} — Invenio Homes Sales` }, description: t.meta.description };
}

export default async function Home({ params }: { params: Params }) {
  const lang = L((await params).lang);
  const [t, res] = await Promise.all([getDict(lang), publicListings()]);
  const all = res.ok ? res.data : [];
  const count = all.length;
  // Few listings: the brief and off-market access lead, what we have is "featured" (design critique, 30 Oct 2026).
  const few = count < FEW_LISTINGS;
  const featured = few ? all : all.filter((l) => l.status === "approved");
  const first = featured[0] ?? null;
  const more = featured.slice(1, 4);
  const areas = [...new Set(all.map((l) => l.area))].sort();
  const h = t.home;
  const P = t.property;
  const wa = whatsapp(h.whatsappText);

  return (
    <>
      <SiteHeader t={t} lang={lang} />
      <main id="main">
        <section className="hero hero--sales">
          <div className="hero__media">
            <picture>
              <source media="(max-width: 760px)" srcSet="/assets/img/hero-mobile.webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/img/hero.webp" alt={h.heroAlt} width="2100" height="965" fetchPriority="high" decoding="async" />
            </picture>
          </div>
          <div className="hero__inner wrap">
            <p className="eyebrow eyebrow--light">{h.eyebrow}</p>
            <h1 className="hero__title hero__title--sales"><Em text={h.title} /></h1>
            <p className="hero__lede">{h.lead}</p>
            <div className="hero__actions">
              <a className="btn btn--light" href={few ? "#brief" : `${href(lang, "/properties")}#brief`}>{t.nav.sendBrief}<Arrow /></a>
              <Link className="btn btn--ghost-light" href={href(lang, "/properties")}>{h.seeProperties}</Link>
            </div>
          </div>
          <div className="hero__facts">
            <div className="wrap">
              {count >= 3 ? (
                <div className="hero-fact"><span className="hero-fact__value">{count}</span><span className="hero-fact__label">{h.factPublic}</span></div>
              ) : (
                <div className="hero-fact"><span className="hero-fact__value">{h.factPrivateValue}</span><span className="hero-fact__label">{h.factPrivate}</span></div>
              )}
              <div className="hero-fact"><span className="hero-fact__value">6</span><span className="hero-fact__label">{h.factChecked}</span></div>
              <div className="hero-fact"><span className="hero-fact__value">1</span><span className="hero-fact__label">{h.factTeam}</span></div>
            </div>
          </div>
        </section>

        {count >= SEARCH_FORM_FROM ? (
          <div className="search-panel search-panel--static">
            <form action={href(lang, "/properties")} aria-label={t.search.aria}>
              <div className="search-field">
                <label htmlFor="h-area">{t.search.area}</label>
                <select id="h-area" name="area" defaultValue="">
                  <option value="">{t.search.anywhere}</option>
                  {areas.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="search-field">
                <label htmlFor="h-price">{t.search.budget}</label>
                <select id="h-price" name="price" defaultValue="">
                  <option value="">{t.search.anyPrice}</option><option value="0-5">{t.search.upTo5}</option><option value="5-10">{t.search.from5to10}</option><option value="10-">{t.search.over10}</option>
                </select>
              </div>
              <div className="search-field">
                <label htmlFor="h-beds">{t.search.bedrooms}</label>
                <select id="h-beds" name="beds" defaultValue="">
                  <option value="">{t.search.any}</option><option value="4">4+</option><option value="5">5+</option><option value="6">6+</option>
                </select>
              </div>
              <button className="btn" type="submit">{t.search.go}<Arrow /></button>
            </form>
          </div>
        ) : null}

        <section className="section intro-section">
          <div className="wrap">
            <div className="intro-grid">
              <div className="intro-grid__media intro-grid__media--wide">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/img/about.webp" alt={h.aboutAlt} loading="lazy" width="1600" height="1067" />
              </div>
              <div>
                <h2>{h.differenceTitle}</h2>
                <p>{h.differenceP1}</p>
                <p>{h.differenceP2}</p>
                <a className="link" href="#about">{h.moreAboutUs}<Arrow /></a>
              </div>
            </div>
            <div className="cards-grid cards-grid--three">
              {[[h.pillar1Title, h.pillar1Text], [h.pillar2Title, h.pillar2Text], [h.pillar3Title, h.pillar3Text]].map(([title, text]) => (
                <div key={title} className="card-block"><h3>{title}</h3><p>{text}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="featured">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">{few && count ? h.featured : h.forSaleNow}</p>
                <h2>{h.checkedTitle}</h2>
              </div>
              <div className="section-head__aside">
                <p className="lede">{h.checkedLead}</p>
                <Link className="link" href={href(lang, "/properties")}>{h.allProperties}<Arrow /></Link>
              </div>
            </div>
            {!res.ok ? (
              <DbNotice reason={res.reason} t={t} />
            ) : first ? (
              <>
                <article className="property-feature">
                  <Link className="property-feature__media" href={href(lang, `/properties/${encodeURIComponent(first.ref)}`)} aria-label={listingTitle(t, first)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {first.photos[0] ? <img src={first.photos[0]} alt={`${listingTitle(t, first)}, ${first.area}`} loading="eager" width="1600" height="1200" /> : null}
                    <span className="property-badge">{first.status === "under_offer" ? t.card.underOffer : P.forSale} · Ref. {first.ref}</span>
                  </Link>
                  <div className="property-feature__body">
                    <div className="property-feature__top">
                      <div>
                        <p className="eyebrow">Ref. {first.ref} · {first.area}</p>
                        <h2>{listingTitle(t, first)}</h2>
                        <p className="property-loc">{first.area}{first.district && first.district !== first.area ? `, ${first.district}` : ""} · {P.locationLine}</p>
                      </div>
                      <div className="property-price"><span>{P.askingPriceLabel}</span><strong>{listingPrice(t, first)}</strong></div>
                    </div>
                    {first.publicSummary ? <p className="lede">{firstSentence(first.publicSummary)}</p> : null}
                    <Specs t={t} l={first} />
                    <div className="property-feature__foot">
                      <Link className="link" href={href(lang, `/properties/${encodeURIComponent(first.ref)}`)}>{t.card.view}<Arrow /></Link>
                      {first.photos.length > 5 ? <span className="property-note"><Icon.camera /> {fmt(P.morePhotos, { n: first.photos.length })}</span> : null}
                    </div>
                  </div>
                </article>
                {more.length ? <div className="villa-grid" style={{ marginTop: "clamp(40px, 5vw, 72px)" }}>{more.map((l) => <ListingCard key={l.uuid} t={t} lang={lang} l={l} />)}</div> : null}
              </>
            ) : (
              <p className="lede">{h.noneYet}</p>
            )}
          </div>
        </section>

        <section className="section section--sand" id="brief">
          <div className="wrap">
            <div className="brief-layout">
              <div>
                <p className="eyebrow">{h.privateEyebrow}</p>
                <h2>{h.privateTitle}</h2>
                <p>{h.privateLead}</p>
                <p>{h.privateP2}</p>
                <ul className="tick-list">
                  {[h.tick1, h.tick2, h.tick3].map((x) => <li key={x}><Icon.tick />{x}</li>)}
                </ul>
                {!few && areas.length ? (
                  <nav aria-label={h.browseByArea} style={{ marginTop: 28 }}>
                    <p className="eyebrow">{h.browseByArea}</p>
                    <div className="btn-row">{areas.map((a) => <Link key={a} className="btn btn--small btn--ghost" href={`${href(lang, "/properties")}?area=${encodeURIComponent(a)}`}>{a}</Link>)}</div>
                  </nav>
                ) : null}
              </div>
              <div className="brief-card">
                <p className="eyebrow eyebrow--plain">{t.brief.title}</p>
                <BriefForm t={t} lang={lang} compact />
              </div>
            </div>
          </div>
        </section>

        <section className="section section--dark">
          <div className="wrap">
            <div className="section-head section-head--light">
              <div><p className="eyebrow eyebrow--light">{h.howEyebrow}</p><h2>{h.howTitle}</h2></div>
              <div className="section-head__aside"><p className="lede">{h.howLead}</p></div>
            </div>
            <div className="steps steps--light">
              {[[h.step1Title, h.step1Text], [h.step2Title, h.step2Text], [h.step3Title, h.step3Text], [h.step4Title, h.step4Text]].map(([title, text], i) => (
                <div key={title} className="step"><p className="step__num">0{i + 1}</p><h3>{title}</h3><p>{text}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="split">
              <div className="split__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/img/owners.webp" alt={h.ownersAlt} loading="lazy" width="1600" height="1067" />
              </div>
              <div className="split__text">
                <p className="eyebrow">{h.ownersEyebrow}</p>
                <h2>{h.ownersTitle}</h2>
                <p>{h.ownersLead}</p>
                <Link className="link" href={href(lang, "/sell")}>{t.nav.sell}<Arrow /></Link>
                <p className="muted" style={{ marginTop: 22, fontSize: 14 }}>{h.rentalsNote} <a className="link" href={COMPANY_SITE} target="_blank" rel="noopener">{t.footer.villaRentals}<Arrow /></a></p>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--tight" id="about">
          <div className="wrap"><ExpertCard t={t} lang={lang} text={h.contactLead} cta={false} /></div>
        </section>

        <section className="cta">
          <div className="cta__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/img/property-05.webp" alt="" loading="lazy" width="1600" height="1200" />
          </div>
          <div className="wrap">
            <div className="cta__inner">
              <h2><Em text={h.ctaTitle} /></h2>
              <p>{h.ctaText}</p>
              <div className="btn-row">
                <a className="btn btn--light" href="#brief">{t.nav.sendBrief}<Arrow /></a>
                <a className="btn btn--ghost-light" href={wa} target="_blank" rel="noopener">{h.whatsappDavid}</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter t={t} lang={lang} />
    </>
  );
}
