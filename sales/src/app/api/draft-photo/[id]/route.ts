import { hasDb, q } from "@/lib/db";
import { PUBLIC_TYPES } from "@/lib/data";

/**
 * One photo of a property still being prepared in the portal (Edo, 23 Nov 2026: the Sarana apartments had no photo on
 * the site). Served only while the property is publicly listed for sale — the same rule as publicListings: for sale,
 * approved or under offer, not off market, a villa or an apartment. Anything else is a 404, so a draft's photos never
 * leak before the head of sales approves the listing.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id) || !hasDb()) return new Response("Not found", { status: 404 });
  const rows = await q<{ content_type: string; b64: string }>(
    `select ph.content_type, encode(ph.data, 'base64') as b64
       from property_draft_photo ph
       join property_draft pd on pd.id = ph.draft_id
       join villa_sale vs on vs.villa_uuid = pd.uuid
      where ph.id = $1 and ph.deleted_at is null and pd.status in ('DRAFT', 'SUBMITTED')
        and vs.for_sale and vs.status in ('approved', 'under_offer') and not vs.off_market
        and coalesce(to_jsonb(vs)->>'property_type', 'villa') = any($2::text[])`,
    [Number(id), PUBLIC_TYPES],
  ).catch(() => []);
  const r = rows[0];
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(r.b64, "base64"), {
    headers: {
      "content-type": /^image\/(jpeg|png|webp)$/.test(r.content_type) ? r.content_type : "image/jpeg",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
