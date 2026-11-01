"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ACTOR, hasDb, q } from "@/lib/db";
import { isRequestStatus, MUST_HAVES, OWNER_ASKED, OWNER_CONFIRMED, VIEWING_CONFIRMED, VIEWING_PROPOSED } from "@/lib/rules";
import { href, isLang, type Lang } from "@/lib/i18n";
import { roleFromAuthorization, userFromAuthorization, type PortalRole } from "@/lib/auth";
import { findByRef, publicListings } from "@/lib/data";
import { money } from "@/lib/money";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
/** The page the visitor came from was in this language: send them back in it. */
const loc = (f: FormData, path: string) => href(isLang(s(f, "lang")) ? (s(f, "lang") as Lang) : "en", path);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
const LANG_LABEL: Record<string, string> = { es: "Spanish", it: "Italian", nl: "Dutch" };
/** Staff notes stay in English; the visitor's own words and site language are added as they are. */
const note = (f: FormData, base: string) => {
  const lang = LANG_LABEL[s(f, "lang")];
  return [base, lang ? `Site language: ${lang}.` : "", s(f, "message")].filter(Boolean).join(" ") || null;
};

/** Hidden "website" field: people never see it, bots fill it in. Their post is thanked and dropped. */
const isBot = (f: FormData) => s(f, "website") !== "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function newContact(kind: "buyer" | "owner", f: FormData, notes: string | null): Promise<number> {
  const rows = await q<{ id: string }>(
    `insert into sale_contact (kind, name, email, phone, source, notes, created_by) values ($1, $2, $3, $4, 'website', $5, $6) returning id::text`,
    [kind, s(f, "name"), s(f, "email") || null, s(f, "phone") || null, notes, ACTOR.email],
  );
  return Number(rows[0].id);
}

/** Website: buyer brief → a buyer contact and a new request, source "website". */
export async function submitBrief(f: FormData) {
  if (isBot(f)) redirect(`${loc(f, "/thanks")}?kind=brief`);
  if (!s(f, "name") || (!s(f, "email") && !s(f, "phone"))) redirect(`${loc(f, "/properties")}?error=brief#brief`);
  if (!hasDb()) redirect(`${loc(f, "/thanks")}?offline=1`);
  const contactId = await newContact("buyer", f, null);
  const areas = s(f, "areas").split(",").map((a) => a.trim()).filter(Boolean);
  const must = MUST_HAVES.map((m) => m.key).filter((k) => f.get(`m_${k}`) === "on");
  const beds = Number(s(f, "beds")) || null;
  await q(
    `insert into sale_request (contact_id, budget_min_eur, budget_max_eur, areas, min_bedrooms, must_haves, licence_needed, timing, source, notes, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'website', $9, $10)`,
    [contactId, money(s(f, "min")), money(s(f, "max")), areas, beds, must, must.includes("licence"), s(f, "timing") || null, note(f, s(f, "message")), ACTOR.email],
  );
  redirect(`${loc(f, "/thanks")}?kind=brief`);
}

/** Website: "Request details" / "Arrange a viewing" on a property → buyer, request and a note on the villa. */
export async function submitEnquiry(f: FormData) {
  const ref = s(f, "ref");
  if (isBot(f)) redirect(`${loc(f, "/thanks")}?kind=enquiry`);
  if (!s(f, "name") || (!s(f, "email") && !s(f, "phone"))) redirect(`${loc(f, `/properties/${encodeURIComponent(ref)}`)}?error=1#enquire`);
  if (!hasDb()) redirect(`${loc(f, "/thanks")}?offline=1`);
  // The page sends only the reference (review 1 Nov 2026: the villa uuid in the form tied V-codes to villa names).
  const listings = await publicListings();
  const listing = listings.ok ? await findByRef(listings.data, ref) : null;
  if (!listing || !UUID.test(listing.uuid)) redirect(`${loc(f, `/properties/${encodeURIComponent(ref)}`)}?error=1#enquire`);
  const uuid = listing.uuid;
  const contactId = await newContact("buyer", f, null);
  const what = s(f, "what") === "viewing" ? "Would like a viewing" : "Asked for details";
  const req = await q<{ id: string }>(
    `insert into sale_request (contact_id, source, notes, created_by) values ($1, 'website', $2, $3) returning id::text`,
    [contactId, note(f, `${what} of ${ref}.`), ACTOR.email],
  );
  await q(
    `insert into sale_activity (request_id, villa_uuid, contact_id, kind, body, happened_on, author_email, author_name)
     values ($1, $2::uuid, $3, 'note', $4, $5, $6, $7)`,
    [Number(req[0].id), uuid, contactId, `Website enquiry: ${what.toLowerCase()} of ${ref}`, today(), ACTOR.email, ACTOR.name],
  );
  redirect(`${loc(f, "/thanks")}?kind=enquiry`);
}

/** Website: owner valuation request → an owner contact with the details in its notes. */
export async function submitValuation(f: FormData) {
  if (isBot(f)) redirect(`${loc(f, "/thanks")}?kind=valuation`);
  if (!s(f, "name") || (!s(f, "email") && !s(f, "phone"))) redirect(`${loc(f, "/sell")}?error=1#valuation`);
  if (!hasDb()) redirect(`${loc(f, "/thanks")}?offline=1`);
  const notes = `Valuation request from the website. Area: ${s(f, "area") || "?"}. Bedrooms: ${s(f, "beds") || "?"}. Rented with Invenio: ${s(f, "rented") === "no" ? "No" : "Yes"}.`;
  await newContact("owner", f, note(f, notes));
  redirect(`${loc(f, "/thanks")}?kind=valuation`);
}

// ---- portal ----------------------------------------------------------------------------------------------------

/**
 * Who is acting in the portal, from the password itself (src/lib/auth.ts). Every portal action starts here:
 * server actions can be posted to any page that imports this file, public pages included (review 1 Nov 2026).
 */
async function portalUser(need: PortalRole): Promise<{ role: PortalRole; email: string; name: string } | null> {
  const auth = (await headers()).get("authorization");
  const role = roleFromAuthorization(auth);
  if (!role || (need === "admin" && role !== "admin")) return null;
  const user = userFromAuthorization(auth);
  return { role, email: user || `sales-portal-${role}`, name: `${user || (role === "admin" ? "Admin" : "Agent")} (sales portal)` };
}

/** Admin portal login only. */
async function portalAdmin(): Promise<string | null> {
  return (await portalUser("admin"))?.name ?? null;
}

/** Any portal login (admin or agent); otherwise the request goes nowhere. */
async function portalAny() {
  const u = await portalUser("agent");
  if (!u) redirect("/portal");
  return u;
}

async function history(uuid: string, field: string, oldValue: unknown, newValue: unknown, by: string) {
  await q(`insert into villa_sale_history (villa_uuid, field, old_value, new_value, changed_by) values ($1::uuid, $2, $3::jsonb, $4::jsonb, $5)`, [
    uuid, field, JSON.stringify(oldValue), JSON.stringify(newValue), by,
  ]);
}

/**
 * Owner-sheet villa → a draft listing (Edo, 31 Oct 2026: admins see every villa flagged for sale, listed or not).
 * Starts from the sheet's answers, as the portal's Sale tab does; never overwrites a listing that already exists.
 */
export async function createListing(f: FormData) {
  const by = await portalAdmin();
  const uuid = s(f, "uuid").toLowerCase();
  const ref = s(f, "ref");
  if (!by || !/^[0-9a-f-]{36}$/.test(uuid) || !hasDb()) redirect(`/portal/listings/${encodeURIComponent(ref)}?error=create`);
  const rows = await q<{ villa_uuid: string }>(
    `insert into villa_sale (villa_uuid, for_sale, status, asking_price_eur, negotiable, exclusive_agent, off_market, rentable_while_on_sale, created_by, updated_by)
     select s.villa_uuid, true, 'draft', coalesce(s.confirmed_price_eur, s.price_for_portal_eur, s.current_price_eur), s.negotiable, s.exclusive_agent,
            coalesce(s.off_market, false), s.rentable_while_on_sale, $2, $2
       from villa_sale_status s where s.villa_uuid = $1::uuid and s.removed_at is null
     on conflict (villa_uuid) do nothing
     returning villa_uuid::text`,
    [uuid, by],
  );
  if (rows.length) {
    await history(uuid, "forSale", false, true, by);
    await history(uuid, "status", null, "draft", by);
  }
  revalidatePath("/portal");
  redirect(`/portal/listings/${encodeURIComponent(ref)}`);
}

/**
 * Admins approve a listing themselves (Edo, 31 Oct 2026), or take it back to draft. Approval puts it on the public
 * site; the page lists what is still missing and asks for an explicit "approve anyway" when something is.
 */
export async function setListingStatus(f: FormData) {
  const by = await portalAdmin();
  const uuid = s(f, "uuid").toLowerCase();
  const ref = s(f, "ref");
  const to = s(f, "to");
  if (!by || !/^[0-9a-f-]{36}$/.test(uuid) || !["approved", "draft"].includes(to) || !hasDb()) redirect(`/portal/listings/${encodeURIComponent(ref)}?error=status`);
  if (to === "approved" && s(f, "missing") && f.get("anyway") !== "on") redirect(`/portal/listings/${encodeURIComponent(ref)}?error=anyway#approval`);
  const cur = await q<{ status: string }>("select status from villa_sale where villa_uuid = $1::uuid and for_sale", [uuid]);
  if (!cur.length) redirect(`/portal/listings/${encodeURIComponent(ref)}?error=status`);
  const from = cur[0].status;
  const allowed = to === "approved" ? ["draft", "review"].includes(from) : ["review", "approved"].includes(from);
  if (allowed) {
    await q(
      to === "approved"
        ? "update villa_sale set status = 'approved', approved_by = $2, approved_at = now(), updated_by = $2, updated_at = now() where villa_uuid = $1::uuid"
        : "update villa_sale set status = 'draft', approved_by = null, approved_at = null, updated_by = $2, updated_at = now() where villa_uuid = $1::uuid",
      [uuid, by],
    );
    await history(uuid, "status", from, to, by);
  }
  revalidatePath("/portal");
  revalidatePath(`/portal/listings/${encodeURIComponent(ref)}`);
  redirect(`/portal/listings/${encodeURIComponent(ref)}#approval`);
}

export async function setRequestStatus(f: FormData) {
  const me = await portalAny();
  const id = Number(s(f, "id"));
  const status = s(f, "status");
  if (id && isRequestStatus(status) && hasDb()) {
    await q("update sale_request set status = $2, updated_at = now() where id = $1", [id, status]);
    await q(
      `insert into sale_activity (request_id, kind, body, happened_on, author_email, author_name) values ($1, 'note', $2, $3, $4, $5)`,
      [id, `Status changed to ${status}`, today(), me.email, me.name],
    );
  }
  revalidatePath(`/portal/requests/${id}`);
  redirect(`/portal/requests/${id}`);
}

/** Mandate clause 7: log that the buyer's name and ID went to the owner, or that the owner confirmed by email. */
export async function ownerStep(f: FormData) {
  const me = await portalAny();
  const id = Number(s(f, "id"));
  const uuid = s(f, "uuid");
  const ref = s(f, "ref");
  const step = s(f, "step");
  if (id && UUID.test(uuid) && hasDb()) {
    const body = step === "confirmed" ? `${OWNER_CONFIRMED}${ref}` : `${OWNER_ASKED}${ref}`;
    await q(
      `insert into sale_activity (request_id, villa_uuid, kind, body, happened_on, author_email, author_name) values ($1, $2::uuid, 'email', $3, $4, $5, $6)`,
      [id, uuid, body, today(), me.email, me.name],
    );
  }
  revalidatePath(`/portal/requests/${id}`);
  redirect(`/portal/requests/${id}`);
}

export async function viewingStep(f: FormData) {
  const me = await portalAny();
  const id = Number(s(f, "id"));
  const uuid = s(f, "uuid");
  const ref = s(f, "ref");
  if (id && UUID.test(uuid) && hasDb()) {
    const body =
      s(f, "step") === "confirmed"
        ? `${VIEWING_CONFIRMED}${ref}`
        : `${VIEWING_PROPOSED}${ref}, ${s(f, "when").replace("T", " ")}${s(f, "who") ? `, ${s(f, "who")}` : ""}`;
    await q(
      `insert into sale_activity (request_id, villa_uuid, kind, body, happened_on, author_email, author_name) values ($1, $2::uuid, 'viewing', $3, $4, $5, $6)`,
      [id, uuid, body, today(), me.email, me.name],
    );
  }
  revalidatePath(`/portal/requests/${id}`);
  redirect(`/portal/requests/${id}`);
}

/** Matches → "Send": records the villa as sent to the request (only after the owner confirmed the buyer). */
export async function sendVilla(f: FormData) {
  const me = await portalAny();
  const id = Number(s(f, "id"));
  const uuid = s(f, "uuid");
  if (id && UUID.test(uuid) && hasDb()) {
    await q(
      `insert into sale_request_villa (request_id, villa_uuid, state, noted_by) values ($1, $2::uuid, $3, $4)
       on conflict (request_id, villa_uuid) do update set state = excluded.state, noted_by = excluded.noted_by, noted_at = now()`,
      [id, uuid, s(f, "state") === "offered" ? "offered" : "sent", me.email],
    );
  }
  revalidatePath(`/portal/requests/${id}`);
  redirect(`/portal/requests/${id}`);
}

export async function addActivity(f: FormData) {
  const me = await portalAny();
  const id = Number(s(f, "id"));
  const body = s(f, "body");
  const kind = ["note", "call", "email", "whatsapp", "viewing", "offer"].includes(s(f, "kind")) ? s(f, "kind") : "note";
  if (id && body && hasDb()) {
    await q(
      `insert into sale_activity (request_id, kind, body, happened_on, author_email, author_name) values ($1, $2, $3, $4, $5, $6)`,
      [id, kind, body, today(), me.email, me.name],
    );
  }
  revalidatePath(`/portal/requests/${id}`);
  redirect(`/portal/requests/${id}`);
}
