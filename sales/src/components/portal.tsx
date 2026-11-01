import Link from "next/link";
import { headers } from "next/headers";
import { roleFromAuthorization } from "@/lib/auth";

/** Signed in with the admin password: checked from the Authorization header, never from a header a browser can send. */
export async function isPortalAdmin(): Promise<boolean> {
  return roleFromAuthorization((await headers()).get("authorization")) === "admin";
}

/** Admins only: "Invenio name · real name" under a reference. Renders nothing for anyone else. */
export function VillaNames({ admin, invenioName, realName, block = true }: { admin: boolean; invenioName: string | null; realName: string | null; block?: boolean }) {
  if (!admin || (!invenioName && !realName)) return null;
  const same = invenioName && realName && invenioName.trim().toLowerCase() === realName.trim().toLowerCase();
  return (
    <span className="small" style={{ display: block ? "block" : "inline" }}>
      {invenioName ? <>Invenio: <span style={{ color: "var(--ink)" }}>{invenioName}</span></> : null}
      {realName && !same ? <>{invenioName ? " · " : ""}Real: <span style={{ color: "var(--ink)" }}>{realName}</span></> : null}
    </span>
  );
}

export function PortalShell({ current, children }: { current: "sale" | "requests"; children: React.ReactNode }) {
  return (
    <div className="pt">
      <aside className="pt-side">
        <Link href="/" aria-label="Invenio Homes sales website">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/invenio-logo.svg" alt="Invenio Homes" />
        </Link>
        <nav aria-label="Portal">
          <p className="h">Sales</p>
          <Link className="nav" href="/portal" aria-current={current === "sale" ? "page" : undefined}>For sale</Link>
          <Link className="nav" href="/portal/requests" aria-current={current === "requests" ? "page" : undefined}>Buyer requests</Link>
          <p className="h">Website</p>
          <Link className="nav" href="/">Sales website</Link>
          <Link className="nav" href="/properties">Properties for sale</Link>
        </nav>
        <p style={{ marginTop: "auto", padding: "22px 14px 0", borderTop: "1px solid rgba(244,243,238,.16)", fontSize: 12, color: "rgba(244,243,238,.66)", lineHeight: 1.5 }}>
          Prototype on the portal&apos;s dev/test database. Changes here show in the portal CRM.
        </p>
      </aside>
      <main className="pt-main"><div className="pt-in">{children}</div></main>
    </div>
  );
}

export function PageHead({ eyebrow = "Sales", title, intro, actions }: { eyebrow?: string; title: React.ReactNode; intro?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="inline" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
      <div className="stack" style={{ gap: 8 }}>
        <p className="eb">{eyebrow}</p>
        <h1 className="pt-title">{title}</h1>
        {intro ? <p className="meta" style={{ fontSize: 15 }}>{intro}</p> : null}
      </div>
      {actions ? <div className="inline" style={{ gap: 10 }}>{actions}</div> : null}
    </div>
  );
}

export function Thumb({ src }: { src?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="thumb" src={src} alt="" /> : <span className="thumb" aria-hidden="true" style={{ display: "inline-block" }} />;
}
