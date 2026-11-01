import type { Metadata } from "next";
import { isLang, type Lang } from "@/lib/i18n";
import { getDict } from "@/lib/i18n/translate";
import { Arrow, ExpertCard, SiteFooter, SiteHeader } from "@/components/site";
import { submitValuation } from "@/app/actions";

export const dynamic = "force-dynamic";
type Params = Promise<{ lang: string }>;
const L = (s: string): Lang => (isLang(s) ? s : "en");

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getDict(L((await params).lang));
  return { title: t.sell.eyebrow };
}

export default async function Sell({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | undefined>> }) {
  const lang = L((await params).lang);
  const sp = await searchParams;
  const t = await getDict(lang);
  const S = t.sell;
  const docs = [S.doc1, S.doc2, S.doc3, S.doc4, S.doc5, S.doc6, S.doc7, S.doc8, S.doc9, S.doc10, S.doc11, S.doc12];
  return (
    <>
      <SiteHeader t={t} lang={lang} current="sell" />
      <main id="main">
        <section className="page-hero page-hero--image">
          <div className="page-hero__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/img/owners.webp" alt={t.home.ownersAlt} fetchPriority="high" width="1600" height="1067" />
          </div>
          <div className="wrap">
            <p className="eyebrow eyebrow--light">{S.eyebrow}</p>
            <h1>{S.title}</h1>
            <p className="lede">{S.lead}</p>
            <div className="btn-row page-hero__actions">
              <a className="btn btn--light" href="#valuation">{S.valuationCta}<Arrow /></a>
              <a className="btn btn--ghost-light" href="#how">{S.howCta}</a>
            </div>
          </div>
        </section>

        <section id="how" className="section section--tight">
          <div className="wrap">
            <div className="section-head">
              <div><p className="eyebrow">{S.howEyebrow}</p><h2>{S.howTitle}</h2></div>
            </div>
            <div className="steps">
              {[[S.p1Title, S.p1Text], [S.p2Title, S.p2Text], [S.p3Title, S.p3Text], [S.p4Title, S.p4Text]].map(([title, text], i) => (
                <div key={title} className="step"><p className="step__num">0{i + 1}</p><h3>{title}</h3><p>{text}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="wrap">
            <div className="section-head">
              <div><p className="eyebrow">{S.exposureEyebrow}</p><h2>{S.exposureTitle}</h2></div>
              <div className="section-head__aside"><p className="lede">{S.exposureLead}</p></div>
            </div>
            <div className="cards-grid cards-grid--four">
              {[[S.exp1, S.exp1Note], [S.exp2, S.exp2Note], [S.exp3, S.exp3Note], [S.exp4, S.exp4Note]].map(([title, text]) => (
                <div key={title} className="card-block"><h3>{title}</h3><p>{text}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="wrap">
            <div className="list-block">
              <div>
                <p className="eyebrow">{S.docsEyebrow}</p>
                <h2>{S.docsTitle}</h2>
                <p className="lede" style={{ marginBottom: 22 }}>{S.docsLead}</p>
              </div>
              <ul>{docs.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="wrap">
            <div className="section-head">
              <div><p className="eyebrow">{S.faqEyebrow}</p><h2>{S.faqTitle}</h2></div>
            </div>
            <div className="faq">
              {[[S.q1, S.a1], [S.q2, S.a2], [S.q3, S.a3], [S.q4, S.a4]].map(([q, a]) => (
                <details key={q}><summary>{q}</summary><div className="faq__a">{a}</div></details>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="valuation">
          <div className="wrap">
            <div className="brief-layout">
              <div>
                <p className="eyebrow">{S.valuationEyebrow}</p>
                <h2>{S.valuationTitle}</h2>
                <p className="lede">{S.valuationLead}</p>
              </div>
              <form action={submitValuation} aria-label={S.valuationAria} className="brief-form"><div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                <input type="hidden" name="lang" value={lang} />
                {sp.error ? <p className="note-err" role="alert">{t.brief.error}</p> : null}
                <div className="brief-form__grid">
                  <div className="field"><label htmlFor="v-name">{t.brief.name} <span aria-hidden="true">*</span></label><input id="v-name" name="name" autoComplete="name" required aria-required="true" /></div>
                  <div className="field"><label htmlFor="v-email">{t.brief.email}</label><input id="v-email" name="email" type="email" autoComplete="email" /></div>
                  <div className="field"><label htmlFor="v-phone">{t.brief.phone}</label><input id="v-phone" name="phone" type="tel" autoComplete="tel" /></div>
                  <div className="field"><label htmlFor="v-area">{t.search.area}</label><input id="v-area" name="area" placeholder={S.areaExample} /></div>
                  <div className="field"><label htmlFor="v-beds">{t.search.bedrooms}</label><select id="v-beds" name="beds" defaultValue=""><option value="">{S.select}</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7+</option></select></div>
                  <div className="field"><label htmlFor="v-rent">{S.rentedWithUs}</label><select id="v-rent" name="rented"><option value="yes">{t.property.yes}</option><option value="no">{t.property.no}</option></select></div>
                </div>
                <div className="field field--wide"><label htmlFor="v-msg">{S.anythingToKnow}</label><textarea id="v-msg" name="message" rows={3} placeholder={S.anythingExample} /></div>
                <label className="check-line"><input type="checkbox" name="consent" required /><span>{t.property.consent}</span></label>
                <div className="brief-form__submit">
                  <button className="btn" type="submit">{S.valuationCta}<Arrow /></button>
                  <span className="form-note">{S.davidWillCall}</span>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="section section--tight" style={{ paddingTop: 0 }}>
          <div className="wrap"><ExpertCard t={t} lang={lang} /></div>
        </section>
      </main>
      <SiteFooter t={t} lang={lang} />
    </>
  );
}

