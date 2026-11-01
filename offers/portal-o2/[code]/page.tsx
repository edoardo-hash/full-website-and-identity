import { arrangedPhotosFor } from "@/lib/photo-labels";
import { connection } from "next/server";
import { headers } from "next/headers";
import { brandForOfferHost, publicLicence } from "@/lib/brand";
import { OfferTracker } from "@/components/offer-tracker";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DATES_VISIBLE_OPENS, openOffer } from "@/lib/offers";
import { getVillasForClient } from "@/lib/villas";
import { offerAvailability } from "@/lib/offer-availability";
import { askOwner } from "@/app/o/[code]/actions";
import { Arrow, ExpiredV2, eur, longDate, Shell, shortRange } from "./shared";

/**
 * Client offer, v2 look (Edo, 1 Nov 2026): the same offer as /o/<code> (same code, same opens, same expiry, same
 * rules) in the editorial design. Anonymous and brand-specific: Invenio Homes light, Lila Villas dark; white label by
 * default. Never shows owner data, original villa names, exact location, staff or net prices.
 */
export const metadata = { title: "Villa selection", robots: { index: false, follow: false } };

export default function ClientOfferV2Page({ params, searchParams }: PageProps<"/o2/[code]">) {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Loading…</p>}>
      <ClientOfferV2 params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClientOfferV2({ params, searchParams }: { params: PageProps<"/o2/[code]">["params"]; searchParams: PageProps<"/o2/[code]">["searchParams"] }) {
  const { code } = await params;
  const sp = await searchParams;
  await connection();
  const preview = sp.preview === "1";
  const data = await openOffer(code, !preview, brandForOfferHost((await headers()).get("host"))).catch(() => null);
  if (!data) notFound();
  const { offer, villas, expired } = data;
  if (expired) return <ExpiredV2 offer={offer} />;

  const info = await getVillasForClient(villas.map((v) => v.uuid));
  const arranged = await arrangedPhotosFor([...info.values()], true);
  for (const v of info.values()) v.photos = arranged.get(v.uuid)?.photos ?? v.photos;
  const showDates = offer.opens <= DATES_VISIBLE_OPENS;
  const nights = Math.round((Date.parse(offer.to_date) - Date.parse(offer.from_date)) / 86_400_000);
  const all = villas.map((ov) => ({ ov, v: info.get(ov.uuid) })).filter((x) => !!x.v);
  const list = [...all.filter((x) => !x.ov.ask_owner), ...all.filter((x) => !!x.ov.ask_owner)];
  const mainCount = all.filter((x) => !x.ov.ask_owner).length;
  const asked = typeof sp.asked === "string" ? sp.asked.toLowerCase() : null;
  const qs = preview ? "?preview=1" : "";
  const today = new Date().toISOString().slice(0, 10);
  const avail = offer.from_date.slice(0, 10) > today ? await offerAvailability(list.map((x) => x.v!), offer.from_date.slice(0, 10), offer.to_date.slice(0, 10), Number(offer.markup), today) : new Map();
  const rented = (uuid: string) => avail.get(uuid.toLowerCase())?.banner.rented === true;

  const one = list.length === 1 ? list[0] : null;
  const hero = list[0]?.v?.photos[0] ?? null;
  const range = showDates ? shortRange(offer.from_date, offer.to_date) : null;
  const prices = offer.hide_prices ? [] : list.map((x) => x.ov.price).filter((p): p is number => p !== null);
  const guests = Math.max(0, ...list.map((x) => x.v!.guests ?? 0));
  const label = `${list.length === 1 ? "A villa" : `${list.length} villas`}${range ? ` · ${range}` : ""}`;

  const card = ({ ov, v }: (typeof list)[number], i: number) => {
    const href = `/o2/${offer.code}/${ov.uuid}${qs}`;
    const vv = v!;
    const licence = publicLicence(vv);
    return (
      <article key={ov.uuid} id={`villa-${ov.uuid}`} className={`card${rented(ov.uuid) ? " dim" : ""}`}>
        <a className="media" href={href} aria-label={vv.uniqueName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {vv.photos[0] && <img src={vv.photos[0]} alt={`${vv.uniqueName}, main photo`} loading={i < 3 ? "eager" : "lazy"} />}
          {list.length > 1 && <span className="num" aria-hidden="true">{i + 1}</span>}
          {rented(ov.uuid) && <span className="rented">Rented</span>}
        </a>
        <div className="body">
          <h2>{vv.uniqueName}</h2>
          <p className="where">{vv.area}, Ibiza · {vv.bedrooms} bedrooms, {vv.bathrooms} baths, sleeps {vv.guests}</p>
          {vv.tagline && <p className="tag">{vv.tagline}</p>}
          {licence && <p className="licence">Licence no. {licence}</p>}
          <div className="price">
            {offer.hide_prices ? (
              <span>Price on request</span>
            ) : ov.price !== null ? (
              <>
                <b>{eur(ov.price)}</b>
                <span>for the stay{ov.cleaning ? ", cleaning included" : ""}</span>
              </>
            ) : (
              <span>Price on request</span>
            )}
          </div>
          <div className="actions">
            <a className="link" href={href}>View villa <Arrow /></a>
            {ov.ask_owner &&
              (ov.client_interest_at || asked === ov.uuid.toLowerCase() ? (
                <span className="asked">We&apos;ll ask the owner</span>
              ) : (
                <form action={askOwner}>
                  <input type="hidden" name="code" value={offer.code} />
                  <input type="hidden" name="uuid" value={ov.uuid} />
                  {preview && <input type="hidden" name="preview" value="1" />}
                  <button type="submit" className="ask">I&apos;m interested, ask the owner</button>
                </form>
              ))}
          </div>
        </div>
      </article>
    );
  };

  return (
    <Shell offer={offer} preview={preview} label={label}>
      {!preview && <OfferTracker />}
      <main>
        <section className={`hero${hero ? "" : " hero--plain"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {hero && <img src={hero} alt="" fetchPriority="high" />}
          <div className="wrap">
            <p className="eyebrow eyebrow--light">{offer.white_label ? "A selection prepared for you" : `Prepared for you by ${offer.brand === "LV" ? "Lila Villas" : "Invenio Homes"}`}</p>
            {one ? (
              <h1>
                {one.v!.uniqueName}
                <br />
                <em>{range ? `for ${nights} nights` : "for your stay"}</em>
              </h1>
            ) : (
              <h1>
                {list.length} villas
                <br />
                <em>{range ?? `for ${nights} nights`}</em>
              </h1>
            )}
            <p className="lede">
              {one
                ? `One house in ${one.v!.area}, ${nights} nights${range ? ` in ${MONTH(offer.from_date)}` : ""} — chosen for your dates and your group.`
                : `${list.length} houses in Ibiza for ${nights} nights, chosen for your dates and your group, in the order your advisor suggests.`}
            </p>
            {offer.note && <p className="note">{offer.note}</p>}
          </div>
        </section>

        <section className="facts" aria-label="Your stay">
          <div className="wrap">
            <div className="fact"><b>{range ? shortRange(offer.from_date, offer.to_date).split(" ").slice(0, -1).join(" ") : nights}</b><span>{range ? `${longDate(offer.from_date).split(" ").slice(-1)[0]} · ${nights} nights` : "nights"}</span></div>
            {guests > 0 && <div className="fact"><b>up to {guests}</b><span>guests</span></div>}
            {prices.length > 0 && <div className="fact"><b>{prices.length > 1 ? `from ${eur(Math.min(...prices))}` : eur(prices[0])}</b><span>for the whole stay</span></div>}
            <div className="fact"><b>On confirmation</b><span>availability</span></div>
          </div>
        </section>

        {mainCount > 0 && (
          <section className="section" id="villas">
            <div className="wrap">
              <div className="grid">{list.slice(0, mainCount).map((x, i) => card(x, i))}</div>
            </div>
          </section>
        )}
        {list.length > mainCount && (
          <section className="section section--sand" aria-label="Available if the owner agrees to your dates">
            <div className="wrap">
              <div className="section-head">
                <div>
                  <p className="eyebrow">If the owner agrees</p>
                  <h2>Available if the owner agrees to your dates</h2>
                </div>
                <p>These villas are free, but their owners usually rent Saturday to Saturday. Tick the ones you like and we&apos;ll ask the owner whether your dates are possible.</p>
              </div>
              <div className="grid">{list.slice(mainCount).map((x, i) => card(x, mainCount + i))}</div>
            </div>
          </section>
        )}

        <section className="band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {list[0]?.v?.photos[1] && <img src={list[0].v.photos[1]} alt="" loading="lazy" />}
          <div className="wrap">
            <p className="eyebrow eyebrow--light">Your stay</p>
            <h2>{one ? "Shall we hold the week?" : "Shall we hold one of them?"}</h2>
            <p>Reply to the advisor who sent you this selection. They will confirm availability, the rental terms and the next step — no obligation.</p>
          </div>
        </section>
      </main>
    </Shell>
  );
}

const MONTH = (iso: string) => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][new Date(iso.slice(0, 10) + "T00:00:00Z").getUTCMonth()];
