import type { Metadata } from "next";
import Link from "next/link";
import { allListings, docProgress, listRequests, sheetOnly } from "@/lib/data";
import { eur, PUBLISH_KEYS, REQUEST_STATUSES, SALE_STATUSES, saleStatus } from "@/lib/rules";
import { isPortalAdmin, PageHead, PortalShell, Thumb, VillaNames } from "@/components/portal";
import { DbNotice } from "@/components/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portal · For sale" };

export default async function ForSale({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [res, sheet, reqs, admin] = await Promise.all([allListings(), sheetOnly(), listRequests(), isPortalAdmin()]);
  if (!res.ok) return <PortalShell current="sale"><PageHead title="For sale" /><DbNotice reason={res.reason} message={res.message} /></PortalShell>;

  const listings = res.data;
  const docs = await docProgress(listings.map((l) => l.uuid));
  const status = sp.status && SALE_STATUSES.some((s) => s.key === sp.status) ? sp.status : null;
  const q = (sp.q ?? "").toLowerCase().trim();
  const hit = (l: (typeof listings)[number]) =>
    l.ref.toLowerCase().includes(q) || l.area.toLowerCase().includes(q) ||
    (admin && [l.invenioName, l.realName].some((n) => n?.toLowerCase().includes(q)));
  const rows = listings.filter((l) => (!status || l.status === status) && (!q || hit(l)));
  const open = reqs.ok ? reqs.data.filter((r) => REQUEST_STATUSES.find((s) => s.key === r.status)?.open).length : 0;

  return (
    <PortalShell current="sale">
      <PageHead
        title="For sale"
        intro={`${listings.length} listings with the "for sale" switch on. Listings go live for agents and on the website once David approves them. ${open} open buyer requests.`}
        actions={<><Link className="btn" href="/">View website</Link><Link className="btn solid" href="/portal/requests">Buyer requests</Link></>}
      />

      <div className="kpis">
        {SALE_STATUSES.map((s) => (
          <Link key={s.key} href={status === s.key ? "/portal" : `/portal?status=${s.key}`} className="panel kpi" style={{ borderColor: status === s.key ? "var(--ink)" : undefined }}>
            <span className="small">{s.label}</span>
            <b>{listings.filter((l) => l.status === s.key).length}</b>
          </Link>
        ))}
      </div>

      <div className="panel">
        <form className="cols" style={{ padding: "18px 20px", borderBottom: "1px solid var(--hair)" }}>
          <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" type="search" placeholder={admin ? "Reference, area or villa name" : "Reference or area"} defaultValue={sp.q ?? ""} /></div>
          <div className="field">
            <label htmlFor="s">Status</label>
            <select id="s" name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{SALE_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
          </div>
          <button className="btn solid" type="submit">Filter</button>
        </form>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th scope="col">Reference</th><th scope="col" style={{ textAlign: "right" }}>Asking price</th><th scope="col">Beds</th><th scope="col">Status</th><th scope="col">Before publishing</th><th scope="col">Mandate</th></tr></thead>
            <tbody>
              {rows.map((l) => {
                const st = saleStatus(l.status);
                const p = docs.get(l.uuid)?.publish ?? 0;
                return (
                  <tr key={l.uuid}>
                    <td>
                      <Link href={`/portal/listings/${encodeURIComponent(l.ref)}`} className="inline" style={{ gap: 12, flexWrap: "nowrap" }}>
                        <Thumb src={l.photos[0]} />
                        <span><b style={{ fontWeight: 500, display: "block" }}>{l.ref}</b><VillaNames admin={admin} invenioName={l.invenioName} realName={l.realName} /><span className="small">{l.area}</span></span>
                      </Link>
                    </td>
                    <td style={{ textAlign: "right" }}>{l.priceOnRequest ? "On request" : eur(l.askingPrice)}</td>
                    <td>{l.legalBedrooms ?? l.bedrooms}</td>
                    <td><span className={`st ${st.tone}`}>{st.label}</span></td>
                    <td><div className="inline" style={{ gap: 10, flexWrap: "nowrap" }}><div className="bar"><span style={{ width: `${Math.round((p / PUBLISH_KEYS.length) * 100)}%` }} /></div><span className="small">{p}/{PUBLISH_KEYS.length}</span></div></td>
                    <td className="small">{l.mandateType === "exclusive" ? "Exclusive" : l.mandateType === "non_exclusive" ? "Non-exclusive" : l.mandateType === "none" ? "Not signed" : "—"}</td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={6} className="small">No listings match.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {sheet.ok && sheet.data.length ? (
        <section className="panel" aria-labelledby="sheet-h">
          <div className="ph2"><h2 id="sheet-h">On the sheet, no listing yet</h2><span className="small">Flagged for sale in "Villas for sale – status &amp; price": recheck before listing</span></div>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th scope="col">Reference</th><th scope="col">Area</th><th scope="col">Beds</th><th scope="col" style={{ textAlign: "right" }}>Sheet price</th><th scope="col">Sales contact</th><th scope="col">Action</th></tr></thead>
              <tbody>
                {sheet.data.map((r) => (
                  <tr key={r.uuid}>
                    <td><Link href={`/portal/listings/V-${r.uuid.replace(/-/g, "").slice(0, 6)}`} style={{ fontWeight: 500, display: "block" }}>V-{r.uuid.replace(/-/g, "").slice(0, 6)}</Link><VillaNames admin={admin} invenioName={r.invenio_name} realName={r.real_name} /></td>
                    <td>{r.area ?? "—"}</td>
                    <td>{r.bedrooms ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>{eur(r.price === null ? null : Number(r.price))}</td>
                    <td>{r.sales_contact ?? "—"}</td>
                    <td className="small">{r.action ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </PortalShell>
  );
}
