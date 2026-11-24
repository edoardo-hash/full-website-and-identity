import "server-only";
import { hasDb, q } from "./db";
import { OWNER_ASKED, OWNER_CONFIRMED, PUBLISH_KEYS, VIEWING_CONFIRMED, VIEWING_PROPOSED, type MatchListing } from "./rules";
import type { FeatureSet } from "./features";
import { scrubVillaNames } from "./villa-names";
import road from "@/data/road-km.json";

/** A villa_sale row joined with its villa_snapshot record. Sales always use the reference, never the villa name. */
export interface Listing extends MatchListing {
  uuid: string;
  ref: string;
  brand: string;
  bathrooms: number;
  photos: string[];
  publicSummary: string | null;
  builtM2: number | null;
  rentableWhileOnSale: boolean | null;
  offMarket: boolean;
  /** Villa or apartment (Edo, 17 Nov 2026): the public site shows both and says which; the portal has more types. */
  propertyType: string;
  /**
   * The villa's tagline from the portal (Information tab; the newest portal edit wins over the feed's, so what the head
   * of sales types shows at once): the listing's headline (David #381, Edo 24 Nov 2026). Null = the generic title.
   */
  tagline: string | null;
  websiteOnly: boolean;
  negotiable: boolean | null;
  commissionPct: number | null;
  mandateType: string | null;
  mandateSignedOn: string | null;
  mandateEndsOn: string | null;
  listingPartner: string | null;
  exclusiveAgent: string | null;
  cadastralRef: string | null;
  licenceTransferable: boolean | null;
  notes: string | null;
  approvedBy: string | null;
  updatedAt: string | null;
  /** Sale features (portal migration 072): yes = present. */
  saleFeatures: FeatureSet;
  /** Road km (OSRM, as the portal's area data), never minutes. */
  road: RoadKm | null;
  /** The portal's stored approximate point, 1–2 km from the house (never the exact GPS): the area map's centre. */
  approxGps: { lat: number; lng: number } | null;
  /**
   * Admins only (Edo, 30 Oct 2026): Invenio's public name for the villa and the owner's real name.
   * Never on the public site (publicListings drops them) and never for agent logins (see isPortalAdmin).
   */
  invenioName: string | null;
  realName: string | null;
}

export interface RoadKm {
  beach: { name: string | null; km: number } | null;
  village: { name: string | null; km: number } | null;
  town: number | null;
  airport: number | null;
}
const ROAD = (road as unknown as { villas: Record<string, { beach: [string | null, number] | null; village: [string | null, number] | null; town: number | null; airport: number | null }> }).villas;
export function roadKm(uuid: string): RoadKm | null {
  const r = ROAD[uuid.toLowerCase()];
  if (!r) return null;
  return {
    beach: r.beach ? { name: r.beach[0], km: r.beach[1] } : null,
    village: r.village ? { name: r.village[0], km: r.village[1] } : null,
    town: r.town,
    airport: r.airport,
  };
}

interface Row {
  v: Record<string, unknown> | null;
  uuid: string;
  status: string;
  property_type: string | null;
  tagline_edit: string | null;
  price: string | null;
  price_on_request: boolean;
  negotiable: boolean | null;
  commission_pct: string | null;
  mandate_type: string | null;
  mandate_signed_on: string | null;
  mandate_ends_on: string | null;
  listing_partner: string | null;
  exclusive_agent: string | null;
  off_market: boolean;
  rentable_while_on_sale: boolean | null;
  website_only: boolean;
  legal_bedrooms: number | null;
  built_m2: string | null;
  plot_m2: string | null;
  cadastral_ref: string | null;
  licence_transferable: boolean | null;
  public_summary: string | null;
  notes: string | null;
  approved_by: string | null;
  updated_at: string | null;
}

const num = (s: string | null) => (s === null ? null : Number(s));
const str = (x: unknown) => (typeof x === "string" ? x : null);
const gps = (x: unknown) => {
  const o = x && typeof x === "object" ? (x as { lat?: unknown; lng?: unknown }) : null;
  const lat = Number(o?.lat), lng = Number(o?.lng);
  return o && Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : null;
};
export const refOf = (uuid: string, ref?: unknown) => (typeof ref === "string" && ref ? ref : `V-${uuid.replace(/-/g, "").slice(0, 6).toLowerCase()}`);

function toListing(r: Row): Listing {
  const v = r.v ?? {};
  const uuid = r.uuid.toLowerCase();
  return {
    uuid,
    ref: refOf(uuid, v.ref),
    brand: str(v.brand) ?? "IH",
    area: str(v.area) ?? "Ibiza",
    district: str(v.district) ?? "",
    invenioName: str(v.uniqueName),
    realName: str(v.originalName),
    bedrooms: Number(v.bedrooms ?? 0),
    bathrooms: Number(v.bathrooms ?? 0),
    licence: str(v.licence),
    photos: Array.isArray(v.photos) ? (v.photos as unknown[]).filter((p): p is string => typeof p === "string") : [],
    status: r.status,
    askingPrice: num(r.price),
    priceOnRequest: r.price_on_request,
    legalBedrooms: r.legal_bedrooms,
    plotM2: num(r.plot_m2),
    builtM2: num(r.built_m2),
    publicSummary: r.public_summary,
    rentableWhileOnSale: r.rentable_while_on_sale,
    offMarket: r.off_market,
    propertyType: r.property_type ?? "villa",
    tagline: (r.tagline_edit ?? str(v.tagline))?.trim() || null,
    websiteOnly: r.website_only,
    negotiable: r.negotiable,
    commissionPct: num(r.commission_pct),
    mandateType: r.mandate_type,
    mandateSignedOn: r.mandate_signed_on,
    mandateEndsOn: r.mandate_ends_on,
    listingPartner: r.listing_partner,
    exclusiveAgent: r.exclusive_agent,
    cadastralRef: r.cadastral_ref,
    licenceTransferable: r.licence_transferable,
    notes: r.notes,
    approvedBy: r.approved_by,
    updatedAt: r.updated_at,
    saleFeatures: new Map(),
    road: roadKm(uuid),
    approxGps: gps(v.approxGps),
  };
}

/** Fills each listing's features from villa_sale_feature (empty when the portal migration isn't there yet). */
async function withFeatures(list: Listing[]): Promise<Listing[]> {
  if (!list.length) return list;
  try {
    const rows = await q<{ uuid: string; item_key: string; detail: string | null }>(
      "select villa_uuid::text as uuid, item_key, detail from villa_sale_feature where villa_uuid = any($1::uuid[])",
      [list.map((l) => l.uuid)],
    );
    const by = new Map(list.map((l) => [l.uuid, l]));
    for (const r of rows) by.get(r.uuid.toLowerCase())?.saleFeatures.set(r.item_key, r.detail);
  } catch {
    // no features table yet
  }
  return list;
}

/**
 * Where the villa's own record (area, photos, counts) is read from. The portal's database has two copies: the netcup
 * replica's (`dev_src.villa_snapshot`, every villa in IMpulse, refreshed through the day) and the older import
 * (`public.villa_snapshot`), which doesn't have villas created since or never published for rental — a new property
 * for sale only showed "Villa in Ibiza" with no photo (Edo, 17 Nov 2026, V-0e4dc5). The replica's copy wins, the import
 * is the fallback; where the replica isn't there (production) only the import is read. Asked once per server instance.
 */
let replica: Promise<boolean> | null = null;
let replicaAskedAt = 0;
/**
 * A failed or negative answer is asked again after a minute, never kept for the life of the instance: one slow first
 * query (cold start) left an instance reading the old import only, so 4 of David's listings showed "Villa in Ibiza",
 * 0 bedrooms and no photo (23 Nov 2026) while the next instance showed them right.
 */
const hasReplica = () => {
  if (!replica || Date.now() - replicaAskedAt > 60_000) {
    replicaAskedAt = Date.now();
    const asked = q<{ has: boolean }>("select to_regclass('dev_src.villa_snapshot') is not null as has")
      .then((r) => !!r[0]?.has)
      .catch(() => false);
    replica = asked.then((has) => {
      if (has) replicaAskedAt = Number.POSITIVE_INFINITY; // a yes is kept
      return has;
    });
  }
  return replica;
};

/**
 * A property still being prepared in the portal (its `property_draft`, not yet in IMpulse's feed): the Sarana flats and
 * penthouse (23 Nov 2026) showed "Apartment in Ibiza", no photo and no bathrooms. Its own record is built from the draft:
 * area, district, counts, approximate point, licence, names (only to scrub them) and its photos, served by
 * /api/draft-photo/<id> (this app's route, public only while the listing is). Open drafts and drafts sent to IMpulse;
 * once the villa is in the feed, the feed's record wins.
 */
const DRAFT_JOIN = (idExpr: string) =>
  `left join property_draft pd on pd.uuid = ${idExpr} and pd.status in ('DRAFT', 'SUBMITTED')`;
const DRAFT_DATA = `case when pd.id is null then null else jsonb_build_object(
    'area', pd.data->'area', 'district', pd.data->'district', 'bedrooms', pd.data->'bedrooms', 'bathrooms', pd.data->'bathrooms',
    'approxGps', pd.data->'approxGps', 'licence', pd.data->'licence', 'uniqueName', pd.data->'uniqueName',
    'originalName', pd.data->'originalName', 'tagline', pd.data->'tagline',
    'photos', coalesce((select jsonb_agg('/api/draft-photo/' || ph.id order by ph.position, ph.id)
                          from property_draft_photo ph where ph.draft_id = pd.id and ph.deleted_at is null), '[]'::jsonb)) end`;

let drafts: Promise<boolean> | null = null;
const hasDrafts = () =>
  (drafts ??= q<{ has: boolean }>("select to_regclass('public.property_draft_photo') is not null and to_regclass('public.property_draft') is not null as has")
    .then((r) => !!r[0]?.has)
    .catch(() => {
      drafts = null; // asked again next time
      return false;
    }));

/** The joins and the expression giving one villa's record, for a query whose villa id is `idExpr`. */
async function villaRecord(idExpr: string): Promise<{ joins: string; data: string }> {
  const [rep, dr] = await Promise.all([hasReplica(), hasDrafts()]);
  const joins = [
    rep ? `left join dev_src.villa_snapshot vd on vd.uuid = ${idExpr}` : "",
    `left join villa_snapshot vp on vp.uuid = ${idExpr}`,
    dr ? DRAFT_JOIN(idExpr) : "",
  ].filter(Boolean).join(" ");
  const parts = [rep ? "vd.data" : "", "vp.data", dr ? DRAFT_DATA : ""].filter(Boolean);
  return { joins, data: parts.length > 1 ? `coalesce(${parts.join(", ")})` : parts[0] };
}

const listingSql = async () => {
  const v = await villaRecord("vs.villa_uuid");
  return `
  select ${v.data} as v, vs.villa_uuid::text as uuid, vs.status, to_jsonb(vs)->>'property_type' as property_type,
         (select e.new_value #>> '{}' from villa_edit e where e.villa_uuid = vs.villa_uuid and e.field = 'tagline' order by e.edited_at desc limit 1) as tagline_edit,
         vs.asking_price_eur::text as price, vs.price_on_request, vs.negotiable,
         vs.commission_pct::text, vs.mandate_type, vs.mandate_signed_on::text, vs.mandate_ends_on::text, vs.listing_partner,
         vs.exclusive_agent, vs.off_market, vs.rentable_while_on_sale, vs.website_only, vs.legal_bedrooms, vs.built_m2::text,
         vs.plot_m2::text, vs.cadastral_ref, vs.licence_transferable, vs.public_summary, vs.notes, vs.approved_by, vs.updated_at::text
    from villa_sale vs
    ${v.joins}
   where vs.for_sale`;
};

/**
 * Villas, apartments and plots (Edo, 24 Nov 2026, David #399: plots too, each decided by its own "Off market" switch;
 * villas and apartments from 17 Nov, villas only from 13 Nov): the portal's villa_sale.property_type (its migrations
 * 094 / 095), read through to_jsonb so the query still runs on a database where the column isn't there yet. An
 * apartment is always shown as an apartment and a plot as a plot, never as a villa (listingTitle in
 * components/site.tsx). The other types (townhouse, hotel, commercial) stay in the portal.
 */
export const PUBLIC_TYPES = ["villa", "apartment", "plot", "plot_licence"];
const PUBLIC_TYPES_SQL = `coalesce(to_jsonb(vs)->>'property_type', 'villa') in (${PUBLIC_TYPES.map((t) => `'${t}'`).join(", ")})`;

export type Loaded<T> = { ok: true; data: T } | { ok: false; reason: "no-db" | "error"; message?: string };

async function load<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  if (!hasDb()) return { ok: false, reason: "no-db" };
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

/** Every listing with the "for sale" switch on (portal view). */
export const allListings = () => load(async () => withFeatures((await q<Row>(`${await listingSql()} order by vs.updated_at desc`)).map(toListing)));

/**
 * The public site: approved or under offer, not off-market. The tourist licence plays no part in sales (Edo,
 * 17 Nov 2026: "licenza o non licenza non c'entra niente, si possono far vedere tutte le ville") — the Invenio Homes /
 * Lila Villas split is for rentals only, so there is no brand filter here.
 */
export const publicListings = () =>
  load(async () =>
    withFeatures(
      (await q<Row>(`${await listingSql()} and vs.status in ('approved', 'under_offer') and not vs.off_market and ${PUBLIC_TYPES_SQL} order by vs.asking_price_eur nulls last`))
        .map(toListing)
        // The public site never gets villa names: not as fields, not inside the sale text (Edo, 1 Nov 2026).
        .map((l) => ({ ...l, publicSummary: scrubVillaNames(l.publicSummary, [l.invenioName, l.realName]) ?? null, tagline: scrubVillaNames(l.tagline, [l.invenioName, l.realName]) ?? null, invenioName: null, realName: null })),
    ),
  );

export async function findByRef(list: Listing[], ref: string) {
  return list.find((l) => l.ref.toLowerCase() === decodeURIComponent(ref).toLowerCase()) ?? null;
}

/** Villas the HAM sheet flags for sale with no portal listing yet (to be rechecked). */
export const sheetOnly = () =>
  load(async () =>
    q<{ uuid: string; invenio_name: string | null; real_name: string | null; area: string | null; bedrooms: number | null; price: string | null; sales_contact: string | null; action: string | null }>(
      `select s.villa_uuid::text as uuid, s.unique_name as invenio_name, s.villa_name as real_name, s.area, s.bedrooms,
              coalesce(s.confirmed_price_eur, s.price_for_portal_eur, s.current_price_eur)::text as price,
              s.sales_contact, s.action
         from villa_sale_status s left join villa_sale v on v.villa_uuid = s.villa_uuid
        where s.removed_at is null and v.villa_uuid is null
          and coalesce(s.action, '') not like 'Remove%' and coalesce(s.action, '') not like 'Duplicate%'
        order by s.area`,
    ),
  );

/** One villa from the owner sheet, found by its reference (V- + the first 6 characters of its uuid). */
export interface SheetVilla {
  uuid: string;
  ref: string;
  invenioName: string | null;
  realName: string | null;
  area: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  price: number | null;
  negotiable: boolean | null;
  exclusiveAgent: string | null;
  offMarket: boolean | null;
  rentableWhileOnSale: boolean | null;
  stillForSale: boolean | null;
  ham: string | null;
  salesContact: string | null;
  salesContactEmail: string | null;
  action: string | null;
  notes: string | null;
  photo: string | null;
  hasListing: boolean;
}
export const sheetVillaByRef = (ref: string) =>
  load(async () => {
    const m = /^v-([0-9a-f]{6})$/i.exec(decodeURIComponent(ref).trim());
    if (!m) return null;
    const v = await villaRecord("s.villa_uuid");
    const rows = await q<{
      uuid: string; invenio_name: string | null; real_name: string | null; area: string | null; bedrooms: number | null; bathrooms: number | null;
      price: string | null; negotiable: boolean | null; exclusive_agent: string | null; off_market: boolean | null; rentable_while_on_sale: boolean | null;
      still_for_sale: boolean | null; ham_name: string | null; sales_contact: string | null; sales_contact_email: string | null; action: string | null;
      notes: string | null; photos: unknown; has_listing: boolean;
    }>(
      `select s.villa_uuid::text as uuid, s.unique_name as invenio_name, s.villa_name as real_name, s.area, s.bedrooms, s.bathrooms,
              coalesce(s.confirmed_price_eur, s.price_for_portal_eur, s.current_price_eur)::text as price, s.negotiable, s.exclusive_agent,
              s.off_market, s.rentable_while_on_sale, s.still_for_sale, s.ham_name, s.sales_contact, s.sales_contact_email, s.action, s.notes,
              ${v.data}->'photos' as photos, exists (select 1 from villa_sale x where x.villa_uuid = s.villa_uuid) as has_listing
         from villa_sale_status s ${v.joins}
        where s.removed_at is null and replace(s.villa_uuid::text, '-', '') like $1
        limit 2`,
      [`${m[1].toLowerCase()}%`],
    );
    if (rows.length !== 1) return null; // none, or two villas share the 6 characters: never guess
    const r = rows[0];
    const photos = Array.isArray(r.photos) ? (r.photos as unknown[]).filter((p): p is string => typeof p === "string") : [];
    return {
      uuid: r.uuid.toLowerCase(), ref: refOf(r.uuid), invenioName: r.invenio_name, realName: r.real_name, area: r.area, bedrooms: r.bedrooms,
      bathrooms: r.bathrooms, price: num(r.price), negotiable: r.negotiable, exclusiveAgent: r.exclusive_agent, offMarket: r.off_market,
      rentableWhileOnSale: r.rentable_while_on_sale, stillForSale: r.still_for_sale, ham: r.ham_name, salesContact: r.sales_contact,
      salesContactEmail: r.sales_contact_email, action: r.action, notes: r.notes, photo: photos[0] ?? null, hasListing: r.has_listing,
    } satisfies SheetVilla;
  });

/** Due-diligence progress per villa: checked or not-applicable items, publish gate and the rest. */
export async function docProgress(uuids: string[]) {
  const out = new Map<string, { publish: number; offer: number; byKey: Map<string, string> }>();
  if (!uuids.length || !hasDb()) return out;
  try {
    const rows = await q<{ uuid: string; item_key: string; status: string }>(
      "select villa_uuid::text as uuid, item_key, status from sale_document where villa_uuid = any($1::uuid[])",
      [uuids],
    );
    for (const r of rows) {
      const k = r.uuid.toLowerCase();
      const cur = out.get(k) ?? { publish: 0, offer: 0, byKey: new Map<string, string>() };
      cur.byKey.set(r.item_key, r.status);
      if (r.status === "checked" || r.status === "na") {
        if (PUBLISH_KEYS.includes(r.item_key)) cur.publish++;
        else cur.offer++;
      }
      out.set(k, cur);
    }
  } catch {
    // table missing: no progress shown
  }
  return out;
}

// ---- CRM ------------------------------------------------------------------------------------------------------

export interface BuyerRequest {
  id: number;
  contactId: number;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  budgetMin: number | null;
  budgetMax: number | null;
  areas: string[];
  minBedrooms: number | null;
  mustHaves: string[];
  licenceNeeded: boolean;
  timing: string | null;
  source: string | null;
  collaborator: string | null;
  notes: string | null;
  ownerEmail: string | null;
  createdAt: string;
}

interface ReqRow {
  id: string;
  contact_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  budget_min: string | null;
  budget_max: string | null;
  areas: string[] | null;
  min_bedrooms: number | null;
  must_haves: string[] | null;
  licence_needed: boolean;
  timing: string | null;
  source: string | null;
  collaborator: string | null;
  notes: string | null;
  owner_email: string | null;
  created_at: string;
}

const REQ_SQL = `
  select r.id::text, r.contact_id::text, c.name, c.email, c.phone, r.status, r.budget_min_eur::text as budget_min,
         r.budget_max_eur::text as budget_max, r.areas, r.min_bedrooms, r.must_haves, r.licence_needed, r.timing, r.source,
         r.collaborator, r.notes, r.owner_email, r.created_at::text
    from sale_request r join sale_contact c on c.id = r.contact_id
   where r.deleted_at is null`;

const toReq = (r: ReqRow): BuyerRequest => ({
  id: Number(r.id),
  contactId: Number(r.contact_id),
  contactName: r.name,
  contactEmail: r.email,
  contactPhone: r.phone,
  status: r.status,
  budgetMin: num(r.budget_min),
  budgetMax: num(r.budget_max),
  areas: r.areas ?? [],
  minBedrooms: r.min_bedrooms,
  mustHaves: r.must_haves ?? [],
  licenceNeeded: r.licence_needed,
  timing: r.timing,
  source: r.source,
  collaborator: r.collaborator,
  notes: r.notes,
  ownerEmail: r.owner_email,
  createdAt: r.created_at,
});

export const listRequests = () => load(async () => (await q<ReqRow>(`${REQ_SQL} order by r.updated_at desc`)).map(toReq));
export const getRequest = (id: number) => load(async () => (await q<ReqRow>(`${REQ_SQL} and r.id = $1`, [id])).map(toReq)[0] ?? null);

export interface SentVilla {
  requestId: number;
  uuid: string;
  state: string;
  notedAt: string;
}
export const sentVillas = (where: { requestId?: number; uuid?: string }) =>
  load(async () =>
    (
      await q<{ request_id: string; uuid: string; state: string; noted_at: string }>(
        `select request_id::text, villa_uuid::text as uuid, state, noted_at::text from sale_request_villa
          where ($1::bigint is null or request_id = $1) and ($2::uuid is null or villa_uuid = $2::uuid)`,
        [where.requestId ?? null, where.uuid ?? null],
      )
    ).map((r) => ({ requestId: Number(r.request_id), uuid: r.uuid.toLowerCase(), state: r.state, notedAt: r.noted_at })),
  );

export interface Activity {
  id: number;
  requestId: number | null;
  uuid: string | null;
  kind: string;
  body: string;
  happenedOn: string;
  author: string;
}
export const activities = (where: { requestId?: number; uuid?: string }) =>
  load(async () =>
    (
      await q<{ id: string; request_id: string | null; uuid: string | null; kind: string; body: string; happened_on: string; author: string }>(
        `select id::text, request_id::text, villa_uuid::text as uuid, kind, body, happened_on::text, coalesce(author_name, author_email) as author
           from sale_activity
          where deleted_at is null and ($1::bigint is null or request_id = $1) and ($2::uuid is null or villa_uuid = $2::uuid)
          order by happened_on desc, created_at desc limit 100`,
        [where.requestId ?? null, where.uuid ?? null],
      )
    ).map((r) => ({ id: Number(r.id), requestId: r.request_id ? Number(r.request_id) : null, uuid: r.uuid?.toLowerCase() ?? null, kind: r.kind, body: r.body, happenedOn: r.happened_on, author: r.author })),
  );

/** Owner confirmation and viewing state per villa, from the activity log (newest first). */
export function clause7State(acts: Activity[], uuid: string) {
  const mine = acts.filter((a) => a.uuid === uuid);
  const owner = mine.find((a) => a.body.startsWith(OWNER_CONFIRMED)) ? "confirmed" : mine.find((a) => a.body.startsWith(OWNER_ASKED)) ? "asked" : "none";
  const proposed = mine.find((a) => a.body.startsWith(VIEWING_PROPOSED));
  const viewingConfirmed = mine.find((a) => a.body.startsWith(VIEWING_CONFIRMED));
  return {
    owner: owner as "confirmed" | "asked" | "none",
    ownerAct: mine.find((a) => a.body.startsWith(OWNER_CONFIRMED) || a.body.startsWith(OWNER_ASKED)) ?? null,
    viewing: proposed ? { text: proposed.body.slice(VIEWING_PROPOSED.length), confirmed: !!viewingConfirmed && viewingConfirmed.id > proposed.id } : null,
  };
}
