import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { activities, allListings, clause7State, getRequest, sentVillas } from "@/lib/data";
import { day, eur, matchRequest, mustHaveLabel, REQUEST_SOURCES, REQUEST_STATUSES, requestStatusLabel } from "@/lib/rules";
import { isPortalAdmin, PageHead, PortalShell, Thumb, VillaNames } from "@/components/portal";
import { DbNotice } from "@/components/site";
import { addActivity, ownerStep, sendVilla, setRequestStatus, viewingStep } from "@/app/actions";

export const dynamic = "force-dynamic";
type Params = Promise<{ id: string }>;
export const metadata: Metadata = { title: "Portal · Buyer request" };

export default async function RequestPage({ params }: { params: Params }) {
  const id = Number((await params).id);
  if (!id) notFound();
  const [req, listings, sent, acts, admin] = await Promise.all([getRequest(id), allListings(), sentVillas({ requestId: id }), activities({ requestId: id }), isPortalAdmin()]);
  if (!req.ok) return <PortalShell current="requests"><PageHead title="Buyer request" /><DbNotice reason={req.reason} message={req.message} /></PortalShell>;
  const r = req.data;
  if (!r) notFound();
  const all = listings.ok ? listings.data : [];
  const byUuid = new Map(all.map((l) => [l.uuid, l]));
  const sentList = sent.ok ? sent.data : [];
  const log = acts.ok ? acts.data : [];
  const matches = matchRequest(r, all).slice(0, 8);
  const tracked = [...new Set([...sentList.map((s) => s.uuid), ...log.filter((a) => a.uuid).map((a) => a.uuid as string)])].filter((u) => byUuid.has(u));

  return (
    <PortalShell current="requests">
      <nav className="small" aria-label="Breadcrumb"><Link href="/portal/requests">Buyer requests</Link> / #{r.id}</nav>
      <PageHead
        eyebrow={`${r.source ? REQUEST_SOURCES[r.source] ?? r.source : "Request"}${r.collaborator ? ` · via ${r.collaborator}` : ""} · opened ${day(r.createdAt)}`}
        title={<span className="inline" style={{ gap: 14 }}>{r.contactName} <span className="st neu">{requestStatusLabel(r.status)}</span></span>}
        actions={
          <form action={setRequestStatus} className="inline" style={{ alignItems: "flex-end" }}>
            <input type="hidden" name="id" value={r.id} />
            <div className="field" style={{ minWidth: 200 }}><label htmlFor="stt">Status</label><select id="stt" name="status" defaultValue={r.status}>{REQUEST_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
            <button className="btn" type="submit">Save</button>
          </form>
        }
      />

      <div className="inline" style={{ alignItems: "flex-start", gap: 24 }}>
        <div className="stack" style={{ flex: "1 1 320px", minWidth: 0, gap: 24 }}>
          <section className="panel" aria-labelledby="br-h">
            <div className="ph2"><h2 id="br-h">Brief</h2></div>
            <div className="pb">
              <div className="kv"><span>Budget</span><span>{r.budgetMin || r.budgetMax ? `${eur(r.budgetMin)} – ${eur(r.budgetMax)}` : "—"}</span></div>
              <div className="kv"><span>Areas</span><span style={{ textAlign: "right" }}>{r.areas.join(", ") || "—"}</span></div>
              <div className="kv"><span>Bedrooms</span><span>{r.minBedrooms ? `${r.minBedrooms} or more` : "—"}</span></div>
              <div className="kv"><span>Tourist licence</span><span>{r.licenceNeeded ? "Needed" : "Not needed"}</span></div>
              <div className="kv"><span>Timing</span><span>{r.timing ?? "—"}</span></div>
              {r.mustHaves.length ? <div style={{ paddingTop: 12 }}>{r.mustHaves.map((m) => <span key={m} className="tag">{mustHaveLabel(m)}</span>)}</div> : null}
              {r.notes ? <p className="small" style={{ paddingTop: 12, lineHeight: 1.6 }}>{r.notes}</p> : null}
            </div>
          </section>
          <section className="panel" aria-labelledby="ct-h">
            <div className="ph2"><h2 id="ct-h">Buyer</h2></div>
            <div className="pb">
              <div className="kv"><span>Name</span><span>{r.contactName}</span></div>
              <div className="kv"><span>Email</span><span>{r.contactEmail ? <a href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a> : "—"}</span></div>
              <div className="kv"><span>Phone</span><span>{r.contactPhone ?? "—"}</span></div>
              <div className="kv"><span>ID document</span><span className="inline" style={{ gap: 8 }}><span className="small">Upload in the portal</span><span className="new">New</span></span></div>
            </div>
          </section>
          <section className="panel" aria-labelledby="ca-h">
            <div className="ph2"><h2 id="ca-h">Outside our portfolio</h2><span className="new">New</span></div>
            <div className="pb stack" style={{ gap: 12, paddingTop: 16 }}>
              <p className="small" style={{ lineHeight: 1.6 }}>Search Casafari with this brief for homes other agencies list, to propose a collaboration.</p>
              <button className="btn sm" type="button" disabled title="Needs the Casafari connection">Search Casafari</button>
            </div>
          </section>
        </div>

        <div className="stack" style={{ flex: "999 1 560px", minWidth: 0, gap: 24 }}>
          <section className="panel hl" aria-labelledby="oc-h">
            <div className="ph2"><span className="inline" style={{ gap: 10 }}><h2 id="oc-h">Owner confirmation and viewings</h2><span className="new">New</span></span><span className="small">Mandate clause 7: the owner confirms each buyer and each viewing by email</span></div>
            <div className="pb">
              {tracked.length ? tracked.map((u) => {
                const l = byUuid.get(u)!;
                const c7 = clause7State(log, u);
                return (
                  <div key={u} className="item" style={{ alignItems: "flex-start" }}>
                    <div className="inline" style={{ gap: 14, flexWrap: "nowrap" }}>
                      <Thumb src={l.photos[0]} />
                      <div>
                        <Link href={`/portal/listings/${encodeURIComponent(l.ref)}`}><b style={{ fontWeight: 500 }}>{l.ref} · {l.area}</b></Link>
                        <VillaNames admin={admin} invenioName={l.invenioName} realName={l.realName} />
                        <p className="small">{c7.owner === "confirmed" ? `Owner confirmed${c7.ownerAct ? ` ${day(c7.ownerAct.happenedOn)}` : ""}` : c7.owner === "asked" ? `Name and ID sent to the owner${c7.ownerAct ? ` ${day(c7.ownerAct.happenedOn)}` : ""}` : "Buyer not registered with the owner yet"}</p>
                        {c7.viewing ? <p className="small">Viewing: {c7.viewing.text} · {c7.viewing.confirmed ? "confirmed by the owner" : "waiting for the owner"}</p> : null}
                      </div>
                    </div>
                    <div className="stack" style={{ gap: 8, alignItems: "flex-end" }}>
                      <span className={`st ${c7.owner === "confirmed" ? "ok" : c7.owner === "asked" ? "warn" : "neu"}`}>{c7.owner === "confirmed" ? "Owner confirmed" : c7.owner === "asked" ? "Waiting for owner" : "Not registered"}</span>
                      <div className="inline">
                        {c7.owner !== "confirmed" ? (
                          <form action={ownerStep} className="inline">
                            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="uuid" value={u} /><input type="hidden" name="ref" value={l.ref} />
                            {c7.owner === "none" ? <button className="btn sm" name="step" value="asked">Log: sent to owner</button> : null}
                            <button className="btn sm solid" name="step" value="confirmed">Log: owner confirmed</button>
                          </form>
                        ) : c7.viewing && !c7.viewing.confirmed ? (
                          <form action={viewingStep}>
                            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="uuid" value={u} /><input type="hidden" name="ref" value={l.ref} />
                            <button className="btn sm solid" name="step" value="confirmed">Log: owner confirmed viewing</button>
                          </form>
                        ) : (
                          <form action={viewingStep} className="inline">
                            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="uuid" value={u} /><input type="hidden" name="ref" value={l.ref} />
                            <label className="lab" htmlFor={`w-${u}`} style={{ position: "absolute", left: -9999 }}>Viewing date and time</label>
                            <input id={`w-${u}`} className="input" type="datetime-local" name="when" required style={{ minHeight: 36, width: 200 }} />
                            <input aria-label="Who attends" className="input" name="who" placeholder="Who attends" style={{ minHeight: 36, width: 150 }} />
                            <button className="btn sm solid" name="step" value="proposed">Propose viewing</button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : <p className="small" style={{ padding: "12px 0" }}>No villas sent yet. Pick one from the matches below: register the buyer with its owner first.</p>}
            </div>
          </section>

          <section className="panel" aria-labelledby="mt-h">
            <div className="ph2"><h2 id="mt-h">Matches</h2><span className="small">Price and bedrooms filter; area and must-haves rank</span></div>
            <div className="pb">
              {matches.length ? matches.map(({ listing: l, reasons }) => {
                const s = sentList.find((x) => x.uuid === l.uuid);
                const c7 = clause7State(log, l.uuid);
                return (
                  <div key={l.uuid} className="item">
                    <div className="inline" style={{ gap: 14, flexWrap: "nowrap" }}>
                      <Thumb src={l.photos[0]} />
                      <div><Link href={`/portal/listings/${encodeURIComponent(l.ref)}`}><b style={{ fontWeight: 500 }}>{l.ref} · {l.priceOnRequest ? "On request" : eur(l.askingPrice)}</b></Link><VillaNames admin={admin} invenioName={l.invenioName} realName={l.realName} /><p className="small">{l.area} · {l.legalBedrooms ?? l.bedrooms} bed · {reasons.join(", ")}</p></div>
                    </div>
                    <div className="inline">
                      {l.status === "under_offer" ? <span className="st acc">Under offer</span> : null}
                      {s ? <span className="st ok">{s.state}</span> : null}
                      {c7.owner === "none" ? (
                        <form action={ownerStep}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="uuid" value={l.uuid} /><input type="hidden" name="ref" value={l.ref} /><button className="btn sm" name="step" value="asked">Register with owner</button></form>
                      ) : null}
                      {c7.owner === "confirmed" && (!s || s.state === "sent") ? (
                        <form action={sendVilla}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="uuid" value={l.uuid} /><button className="btn sm solid" name="state" value={s ? "offered" : "sent"}>{s ? "Mark offered" : "Mark sent"}</button></form>
                      ) : null}
                    </div>
                  </div>
                );
              }) : <p className="small" style={{ padding: "12px 0" }}>No listing matches this brief yet.</p>}
            </div>
          </section>

          <section className="panel" aria-labelledby="ac-h">
            <div className="ph2"><h2 id="ac-h">Activity</h2></div>
            <form action={addActivity} className="inline" style={{ padding: "16px 22px 0", alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={r.id} />
              <div className="field" style={{ width: 150 }}><label htmlFor="ak">Type</label><select id="ak" name="kind"><option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="offer">Offer</option></select></div>
              <div className="field" style={{ flex: 1, minWidth: 220 }}><label htmlFor="ab">What happened</label><input id="ab" name="body" required /></div>
              <button className="btn solid" type="submit">Add</button>
            </form>
            <ol className="pb" style={{ listStyle: "none", margin: 0, paddingTop: 10 }}>
              {log.length ? log.map((a) => (
                <li key={a.id} className="kv" style={{ flexDirection: "column", gap: 2 }}><span style={{ color: "var(--ink)" }}>{a.kind[0].toUpperCase() + a.kind.slice(1)} · {a.body}</span><span className="small">{day(a.happenedOn)} · {a.author}</span></li>
              )) : <li className="small" style={{ padding: "12px 0" }}>Nothing logged yet.</li>}
            </ol>
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
