import type { Metadata } from "next";
import Link from "next/link";
import { listRequests } from "@/lib/data";
import { eurShort, mustHaveLabel, REQUEST_SOURCES, REQUEST_STATUSES } from "@/lib/rules";
import { PageHead, PortalShell } from "@/components/portal";
import { DbNotice } from "@/components/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portal · Buyer requests" };

export default async function Requests({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const res = await listRequests();
  if (!res.ok) return <PortalShell current="requests"><PageHead title="Buyer requests" /><DbNotice reason={res.reason} message={res.message} /></PortalShell>;
  const q = (sp.q ?? "").toLowerCase().trim();
  const src = sp.source ?? "";
  const list = res.data.filter((r) => (!q || r.contactName.toLowerCase().includes(q)) && (!src || r.source === src));
  const openCols = REQUEST_STATUSES.filter((s) => s.open);
  const closed = REQUEST_STATUSES.filter((s) => !s.open);

  return (
    <PortalShell current="requests">
      <PageHead
        title="Buyer requests"
        intro={`${list.filter((r) => openCols.some((c) => c.key === r.status)).length} open · each matched against our listings by price, bedrooms, area and must-haves.`}
        actions={<a className="btn solid" href="https://ihtest.invenio.tools/sales/requests/new">New request</a>}
      />
      <form className="cols">
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" type="search" placeholder="Buyer" defaultValue={sp.q ?? ""} /></div>
        <div className="field">
          <label htmlFor="src">Source</label>
          <select id="src" name="source" defaultValue={src}><option value="">All sources</option>{Object.entries(REQUEST_SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <button className="btn solid" type="submit">Filter</button>
      </form>

      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <div className="board">
          {openCols.map((c) => {
            const items = list.filter((r) => r.status === c.key);
            return (
              <section key={c.key} className="col" aria-label={c.label}>
                <div className="colh"><b>{c.label}</b><span className="small">{items.length}</span></div>
                {items.length ? items.map((r) => (
                  <Link key={r.id} href={`/portal/requests/${r.id}`} className="rq">
                    <b>{r.contactName}</b>
                    <span>{r.budgetMin || r.budgetMax ? `${eurShort(r.budgetMin)} – ${eurShort(r.budgetMax)}` : "Budget not set"}{r.minBedrooms ? ` · ${r.minBedrooms}+ bed` : ""}</span>
                    {r.areas.length ? <span className="small">{r.areas.join(", ")}</span> : null}
                    {r.mustHaves.length ? <span>{r.mustHaves.map((m) => <span key={m} className="tag">{mustHaveLabel(m)}</span>)}</span> : null}
                    <span className="foot"><span>{r.source ? REQUEST_SOURCES[r.source] ?? r.source : "—"}{r.collaborator ? ` · ${r.collaborator}` : ""}</span><span>#{r.id}</span></span>
                  </Link>
                )) : <p className="empty">Nothing here</p>}
              </section>
            );
          })}
        </div>
      </div>
      <p className="small">Closed: {closed.map((c) => `${c.label} ${list.filter((r) => r.status === c.key).length}`).join(" · ")}</p>
    </PortalShell>
  );
}
