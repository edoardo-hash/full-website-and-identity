import { NextResponse, type NextRequest } from "next/server";
import { isLang } from "@/lib/i18n";
import { roleFromAuthorization } from "@/lib/auth";
import { exportDict } from "@/lib/i18n/translate";

/**
 * GET /portal/i18n-export?lang=es — the whole dictionary translated by DeepSeek, as src/lib/i18n/static/<lang>.json
 * expects it. Admin portal login only (password checked again here); used on dev to refresh the stored files.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (roleFromAuthorization(req.headers.get("authorization")) !== "admin") return NextResponse.json({ error: "admins only" }, { status: 403 });
  const lang = req.nextUrl.searchParams.get("lang");
  if (!isLang(lang) || lang === "en") return NextResponse.json({ error: "lang must be es, it or nl" }, { status: 400 });
  try {
    return NextResponse.json(await exportDict(lang));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
