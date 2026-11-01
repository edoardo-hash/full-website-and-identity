import { arrangedPhotosFor } from "@/lib/photo-labels";
import { connection } from "next/server";
import { headers } from "next/headers";
import { brandForOfferHost, publicLicence } from "@/lib/brand";
import { GalleryV2 } from "../gallery-v2";
import { OfferTracker } from "@/components/offer-tracker";
import { areaInfoFor } from "@/lib/area-near";
import { mapPointsFor, villaMapData } from "@/lib/villa-map";
import { VillaAreaMap } from "@/components/area-map";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DATES_VISIBLE_OPENS, openOffer } from "@/lib/offers";
import { getVillasForClient } from "@/lib/villas";
import { offerAvailability } from "@/lib/offer-availability";
import { Arrow, ExpiredV2, eur, featureGroups, longDate, mergeSmallGroups, Shell, shortRange } from "../shared";

/** One villa of a client offer, v2 look. Not counted as an open. Same data and rules as /o/<code>/<uuid>. */
export const metadata = { title: "Villa", robots: { index: false, follow: false } };

export default function ClientVillaV2Page({ params, searchParams }: PageProps<"/o2/[code]/[uuid]">) {
  return (
    <Suspense fallback={<p className="p-8 text-sm">Loading…</p>}>
      <ClientVillaV2 params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** The back-office text as paragraphs, without its markdown bold markers ("**Welcome…**"). */
const paragraphs = (text: string) => text.replace(/\*+/g, "").split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean);
/** Long back-office texts (some run 1,200 words in one block): the first ~110 words, the rest behind "Read more". */
function Description({ text }: { text: string }) {
  const paras = paragraphs(text);
  const words = paras[0]?.split(/\s+/) ?? [];
  const long = paras.length > 1 || words.length > 150;
  if (!long) return <>{paras.map((para, i) => <p key={i} className="prose">{para}</p>)}</>;
  const cut = words.length > 150 ? words.slice(0, 110).join(" ").replace(/[,;:]$/, "") : paras[0];
  const rest = words.length > 150 ? [words.slice(110).join(" "), ...paras.slice(1)] : paras.slice(1);
  return (
    <details className="fold">
      <summary>
        <p className="prose">{cut}{words.length > 150 && <span className="fold__dots">…</span>}</p>
        <span className="fold__more">Read more</span>
      </summary>
      {rest.map((para, i) => <p key={i} className="prose">{para}</p>)}
    </details>
  );
}
const km = (n: number | null | undefined) => (n === null || n === undefined ? "" : `${n} km`);

async function ClientVillaV2({ params, searchParams }: { params: PageProps<"/o2/[code]/[uuid]">["params"]; searchParams: PageProps<"/o2/[code]/[uuid]">["searchParams"] }) {
  const { code, uuid } = await params;
  const sp = await searchParams;
  await connection();
  const data = await openOffer(code, false, brandForOfferHost((await headers()).get("host"))).catch(() => null);
  if (!data) notFound();
  const { offer, villas, expired } = data;
  if (expired) return <ExpiredV2 offer={offer} />;
  const index = villas.findIndex((v) => v.uuid.toLowerCase() === uuid.toLowerCase());
  if (index < 0) notFound();
  const ov = villas[index];
  const v = (await getVillasForClient([ov.uuid])).get(ov.uuid);
  if (!v) notFound();
  const gallery = (await arrangedPhotosFor([v], true)).get(v.uuid)!;
  const groups = mergeSmallGroups(gallery.groups);
  const preview = sp.preview === "1";
  const qs = preview ? "?preview=1" : "";
  const area = await areaInfoFor(v.uuid);
  const mapData = villaMapData((await mapPointsFor([v.uuid])).get(v.uuid.toLowerCase()) ?? v.approxGps, area);
  const nights = Math.round((Date.parse(offer.to_date) - Date.parse(offer.from_date)) / 86_400_000);
  const showDates = offer.opens <= DATES_VISIBLE_OPENS;
  const today = new Date().toISOString().slice(0, 10);
  const rented = offer.from_date.slice(0, 10) > today && (await offerAvailability([v], offer.from_date.slice(0, 10), offer.to_date.slice(0, 10), Number(offer.markup), today)).get(v.uuid.toLowerCase())?.banner.rented === true;
  const prev = index > 0 ? villas[index - 1] : null;
  const next = index < villas.length - 1 ? villas[index + 1] : null;
  const licence = publicLicence(v);
  const stay: [string, string | null][] = [
    ["Check in", v.checkInTime ? `from ${v.checkInTime}` : null],
    ["Check out", v.checkOutTime ? `by ${v.checkOutTime}` : null],
    ["Security deposit", v.securityDeposit ? eur(v.securityDeposit) : null],
  ];
  const features = featureGroups(v.features);
  const label = villas.length > 1 ? `Villa ${index + 1} of ${villas.length}` : showDates ? shortRange(offer.from_date, offer.to_date) : "Your villa";

  return (
    <Shell offer={offer} preview={preview} label={label} back={{ href: `/o2/${offer.code}${qs}`, text: villas.length > 1 ? "All villas" : "Overview" }}>
      {!preview && <OfferTracker uuid={ov.uuid} />}
      <main>
        <section className="villa-head">
          <div className="wrap">
            <p className="eyebrow">{villas.length > 1 ? `Villa ${index + 1} of ${villas.length} · ` : ""}{v.area}, Ibiza</p>
            <h1>{v.uniqueName}</h1>
            {v.tagline && <p className="lede">{v.tagline}</p>}
          </div>
        </section>

        <section className="section--tight">
          <div className="wrap">
            <GalleryV2 groups={groups} name={v.uniqueName} label="Show all {n} photos" />
          </div>
        </section>

        <section className="section--tight">
          <div className="wrap layout">
            <div>
              <div className="specs">
                <span><b>{v.bedrooms}</b> bedrooms</span>
                <span><b>{v.bathrooms}</b> bathrooms</span>
                <span>up to <b>{v.guests}</b> guests</span>
                {licence && <span className="licence">Licence no. {licence}</span>}
              </div>
              {v.description && (
                <div className="block">
                  <h2>About this villa</h2>
                  <Description text={v.description} />
                </div>
              )}
              {features.length > 0 && (
                <div className="block">
                  <h2>Features</h2>
                  <div className="feature-groups">
                    {features.map(([g, xs]) => (
                      <div key={g}>
                        <h3>{g}</h3>
                        <ul>{xs.map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="block">
                <h2>Location</h2>
                <p className="prose">{v.area}, Ibiza. The exact address is shared once the booking is confirmed.</p>
                {mapData && <div className="portal-ui" style={{ marginTop: 18 }}><VillaAreaMap data={mapData} villa={v.uniqueName} /></div>}
                <p className="map-note">Approximate area — about 1 km. Exact address shared after confirmation.</p>
                {area && (
                  <>
                    <div className="nearby">
                      {area.airportKm !== null && <div className="row"><span>Airport</span><b>{km(area.airportKm)}</b></div>}
                      {area.townKm !== null && <div className="row"><span>Ibiza town</span><b>{km(area.townKm)}</b></div>}
                      {area.beach && <div className="row"><span>Nearest beach · {area.beach.name}</span><b>{km(area.beach.km)}</b></div>}
                      {area.nearTown && <div className="row"><span>Nearest village · {area.nearTown.name}</span><b>{km(area.nearTown.km)}</b></div>}
                      {area.supermarket && <div className="row"><span>Supermarket · {area.supermarket.name}</span><b>{km(area.supermarket.km)}</b></div>}
                    </div>
                    {(area.restaurants.length > 0 || area.sights.length > 0) && (
                      <div className="nearby-lists">
                        {area.restaurants.length > 0 && (
                          <div>
                            <p className="eyebrow">Restaurants nearby</p>
                            <ul>{area.restaurants.slice(0, 3).map((r) => <li key={r.name}><div><b>{r.name}</b>{r.note && <p>{r.note}</p>}</div><span>{km(r.km)}</span></li>)}</ul>
                          </div>
                        )}
                        {area.sights.length > 0 && (
                          <div>
                            <p className="eyebrow">Worth seeing nearby</p>
                            <ul>{area.sights.slice(0, 3).map((r) => <li key={r.name}><div><b>{r.name}</b>{r.note && <p>{r.note}</p>}</div><span>{km(r.km)}</span></li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="map-note">Distances {area.road ? "by road" : "in a straight line"}. The map shows the area, not the exact address.</p>
                  </>
                )}
              </div>
            </div>

            <aside className="panel">
              <p className="eyebrow">Your stay</p>
              <p className="dates">{showDates ? `${longDate(offer.from_date)} — ${longDate(offer.to_date)}` : "Your dates"}</p>
              <p className="nights">{nights} nights</p>
              {rented && <p className="small" style={{ color: "#9e2e29", fontWeight: 600 }}>Rented: this villa has been booked for these dates since the selection was made.</p>}
              {offer.hide_prices ? (
                <p className="big" style={{ fontSize: "1.6rem" }}>Price on request</p>
              ) : (
                <>
                  <p className="big">{ov.price !== null ? eur(ov.price) : "Price on request"}</p>
                  {ov.price !== null && <p className="for">for the whole stay{ov.cleaning ? ", cleaning included" : ""}</p>}
                </>
              )}
              <div className="rows">
                {stay.filter(([, val]) => val).map(([k, val]) => (
                  <div key={k}><span>{k}</span><span>{val}</span></div>
                ))}
              </div>
              <p className="note">To book or ask a question, reply to the advisor who sent you this selection. Availability and prices are subject to confirmation.</p>
            </aside>
          </div>
        </section>

        <section className="band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {gallery.photos[1] && <img src={gallery.photos[1]} alt="" loading="lazy" />}
          <div className="wrap">
            <p className="eyebrow eyebrow--light">Your stay</p>
            <h2>Shall we hold it for your dates?</h2>
            <p>Reply to the advisor who sent you this selection. They will confirm availability, the rental terms and the next step — no obligation.</p>
          </div>
        </section>

        {(prev || next) && (
          <div className="wrap">
            <nav className="pager" aria-label="Other villas">
              {prev ? <a className="btn btn--ghost" href={`/o2/${offer.code}/${prev.uuid}${qs}`}>Previous villa</a> : <span />}
              {next && <a className="btn" href={`/o2/${offer.code}/${next.uuid}${qs}`}>Next villa <Arrow /></a>}
            </nav>
          </div>
        )}
      </main>
    </Shell>
  );
}
